/**
 * Payment Reconciliation Service
 * Handles payment verification, matching, and reconciliation
 */
const loggingService = require('./logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('payment', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('payment', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('payment', 'warn', message, metadata)
};
const Transaction = require('../mongodb/models/Transaction');
const Ride = require('../mongodb/models/Ride');
const mongoose = require('mongoose');
const mongoPaymentService = require('../mongodb/services/mongo-payment.service');
const emailService = require('./email.service');

/**
 * Find unmatched transactions from payment gateway
 * @param {Date} startDate - Start date for search
 * @param {Date} endDate - End date for search
 * @param {String} provider - Payment provider name
 * @returns {Promise<Array>} - List of unmatched transactions
 */
const findUnmatchedTransactions = async (startDate, endDate, provider = 'paystack') => {
  try {
    // Find transactions with a gateway ID but no corresponding ride
    const unmatchedTransactions = await Transaction.find({
      gateway: provider,
      status: 'completed',
      type: 'ride_payment',
      rideId: { $exists: false },
      createdAt: { 
        $gte: startDate, 
        $lte: endDate || new Date() 
      }
    }).lean();

    logger.info(`Found ${unmatchedTransactions.length} unmatched transactions`);
    return {
      success: true,
      data: unmatchedTransactions
    };
  } catch (error) {
    logger.error('Error finding unmatched transactions:', error);
    return {
      success: false,
      message: 'Failed to find unmatched transactions',
      error: error.message
    };
  }
};

/**
 * Match a transaction to a ride
 * @param {String} transactionId - Transaction ID to match
 * @param {String} rideId - Ride ID to match with
 * @returns {Promise<Object>} - Result of matching operation
 */
const matchTransactionToRide = async (transactionId, rideId) => {
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Get transaction and ride
    const [transaction, ride] = await Promise.all([
      Transaction.findById(transactionId).session(session),
      Ride.findById(rideId).session(session)
    ]);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (!ride) {
      throw new Error(`Ride ${rideId} not found`);
    }

    // Match transaction to ride
    transaction.rideId = ride._id;
    transaction.metadata = {
      ...transaction.metadata,
      rideId: ride._id.toString(),
      manuallyMatched: true,
      matchedAt: new Date()
    };

    // Update ride payment status
    ride.isPaid = true;
    ride.paymentStatus = 'completed';
    ride.paymentCompletedAt = transaction.processedAt || transaction.updatedAt;
    ride.paymentTransactionId = transaction._id;
    
    if (!ride.metadata) {
      ride.metadata = {};
    }
    
    ride.metadata.paymentReference = transaction.gatewayTransactionId;
    ride.metadata.paymentReconciled = true;

    // Save both documents
    await Promise.all([
      transaction.save({ session }),
      ride.save({ session })
    ]);

    // Commit the transaction
    await session.commitTransaction();

    logger.info(`Matched transaction ${transactionId} to ride ${rideId}`);
    return {
      success: true,
      message: 'Transaction matched to ride successfully',
      data: {
        transaction: {
          id: transaction._id,
          reference: transaction.gatewayTransactionId,
          amount: transaction.amount,
          status: transaction.status
        },
        ride: {
          id: ride._id,
          status: ride.status,
          paymentStatus: ride.paymentStatus
        }
      }
    };
  } catch (error) {
    logger.error(`Error matching transaction ${transactionId} to ride ${rideId}:`, error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    return {
      success: false,
      message: 'Failed to match transaction to ride',
      error: error.message
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Find unreconciled rides that need payment verification
 * @param {Date} startDate - Start date for search
 * @param {Date} endDate - End date for search
 * @returns {Promise<Array>} - List of unreconciled rides
 */
const findUnreconciledRides = async (startDate, endDate) => {
  try {
    // Find rides that are completed but not marked as paid
    const unreconciledRides = await Ride.find({
      status: 'completed',
      $or: [
        { isPaid: { $ne: true } },
        { paymentStatus: { $ne: 'completed' } },
        { paymentStatus: { $exists: false } }
      ],
      completedAt: { 
        $gte: startDate, 
        $lte: endDate || new Date() 
      }
    }).lean();

    logger.info(`Found ${unreconciledRides.length} unreconciled rides`);
    return {
      success: true,
      data: unreconciledRides
    };
  } catch (error) {
    logger.error('Error finding unreconciled rides:', error);
    return {
      success: false,
      message: 'Failed to find unreconciled rides',
      error: error.message
    };
  }
};

/**
 * Verify and reconcile a ride payment
 * @param {String} rideId - Ride ID to reconcile
 * @returns {Promise<Object>} - Result of reconciliation
 */
const reconcileRidePayment = async (rideId) => {
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Get the ride
    const ride = await Ride.findById(rideId).session(session);
    if (!ride) {
      throw new Error(`Ride ${rideId} not found`);
    }

    // Check if ride is already reconciled
    if (ride.isPaid && ride.paymentStatus === 'completed' && ride.paymentTransactionId) {
      await session.commitTransaction();
      return {
        success: true,
        message: 'Ride already reconciled',
        data: {
          ride: {
            id: ride._id,
            status: ride.status,
            paymentStatus: ride.paymentStatus,
            transactionId: ride.paymentTransactionId
          }
        }
      };
    }

    // Try to find matching transaction by metadata or ride reference
    let transaction = await Transaction.findOne({
      $or: [
        { rideId: ride._id },
        { 'metadata.rideId': ride._id.toString() }
      ],
      status: 'completed',
      type: 'ride_payment'
    }).session(session);

    // If transaction found, mark ride as paid
    if (transaction) {
      ride.isPaid = true;
      ride.paymentStatus = 'completed';
      ride.paymentCompletedAt = transaction.processedAt || transaction.updatedAt;
      ride.paymentTransactionId = transaction._id;
      
      if (!ride.metadata) {
        ride.metadata = {};
      }
      
      ride.metadata.paymentReference = transaction.gatewayTransactionId;
      ride.metadata.paymentReconciled = true;

      await ride.save({ session });
      await session.commitTransaction();

      logger.info(`Reconciled ride ${rideId} with existing transaction ${transaction._id}`);
      return {
        success: true,
        message: 'Ride reconciled with existing transaction',
        data: {
          ride: {
            id: ride._id,
            status: ride.status,
            paymentStatus: ride.paymentStatus
          },
          transaction: {
            id: transaction._id,
            reference: transaction.gatewayTransactionId,
            amount: transaction.amount,
            status: transaction.status
          }
        }
      };
    }

    // If no transaction found, check if there's a payment reference in the ride metadata
    let paymentReference;
    if (ride.metadata && ride.metadata.paymentReference) {
      paymentReference = ride.metadata.paymentReference;
    }

    // If payment reference found, verify payment
    if (paymentReference) {
      const verificationResult = await mongoPaymentService.verifyPayment(paymentReference);
      
      if (verificationResult.success) {
        // Payment verified, get the transaction ID
        const transactionId = verificationResult.mongoTransactionId || verificationResult.data.transactionId;
        
        // Get the transaction
        transaction = await Transaction.findById(transactionId).session(session);
        if (transaction) {
          // Link transaction to ride if not already linked
          if (!transaction.rideId) {
            transaction.rideId = ride._id;
            transaction.metadata = {
              ...transaction.metadata,
              rideId: ride._id.toString(),
              reconciledAt: new Date()
            };
            await transaction.save({ session });
          }
          
          // Update ride payment status
          ride.isPaid = true;
          ride.paymentStatus = 'completed';
          ride.paymentCompletedAt = transaction.processedAt || transaction.updatedAt;
          ride.paymentTransactionId = transaction._id;
          
          if (!ride.metadata) {
            ride.metadata = {};
          }
          
          ride.metadata.paymentReference = transaction.gatewayTransactionId;
          ride.metadata.paymentReconciled = true;

          await ride.save({ session });
          await session.commitTransaction();

          logger.info(`Reconciled ride ${rideId} with verified transaction ${transaction._id}`);
          return {
            success: true,
            message: 'Ride reconciled with verified transaction',
            data: {
              ride: {
                id: ride._id,
                status: ride.status,
                paymentStatus: ride.paymentStatus
              },
              transaction: {
                id: transaction._id,
                reference: transaction.gatewayTransactionId,
                amount: transaction.amount,
                status: transaction.status
              }
            }
          };
        }
      }
    }

    // If still not reconciled, mark as needs manual reconciliation
    ride.paymentStatus = 'needs_verification';
    
    if (!ride.metadata) {
      ride.metadata = {};
    }
    
    ride.metadata.paymentNeedsManualReconciliation = true;
    ride.metadata.lastReconciliationAttempt = new Date();

    await ride.save({ session });
    await session.commitTransaction();

    logger.info(`Ride ${rideId} marked as needing manual reconciliation`);
    return {
      success: true,
      message: 'Ride marked for manual reconciliation',
      data: {
        ride: {
          id: ride._id,
          status: ride.status,
          paymentStatus: ride.paymentStatus
        }
      },
      requiresManualAction: true
    };
  } catch (error) {
    logger.error(`Error reconciling ride payment for ride ${rideId}:`, error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    return {
      success: false,
      message: 'Failed to reconcile ride payment',
      error: error.message
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Run a full reconciliation process for a date range
 * @param {Date} startDate - Start date for reconciliation
 * @param {Date} endDate - End date for reconciliation
 * @param {String} provider - Payment provider name
 * @returns {Promise<Object>} - Reconciliation summary
 */
const runFullReconciliation = async (startDate, endDate, provider = 'paystack') => {
  try {
    const summary = {
      startDate,
      endDate: endDate || new Date(),
      unmatchedTransactions: 0,
      unreconciledRides: 0,
      automaticallyReconciled: 0,
      requiresManualReconciliation: 0,
      errors: 0
    };

    // Step 1: Find unmatched transactions
    const unmatchedResult = await findUnmatchedTransactions(startDate, endDate, provider);
    if (unmatchedResult.success) {
      summary.unmatchedTransactions = unmatchedResult.data.length;
    } else {
      logger.error('Error in reconciliation step 1:', unmatchedResult.error);
      summary.errors++;
    }

    // Step 2: Find unreconciled rides
    const unreconciledResult = await findUnreconciledRides(startDate, endDate);
    if (unreconciledResult.success) {
      summary.unreconciledRides = unreconciledResult.data.length;
      
      // Step 3: Try to reconcile each ride
      for (const ride of unreconciledResult.data) {
        const reconcileResult = await reconcileRidePayment(ride._id);
        
        if (reconcileResult.success) {
          if (reconcileResult.requiresManualAction) {
            summary.requiresManualReconciliation++;
          } else {
            summary.automaticallyReconciled++;
          }
        } else {
          logger.error(`Failed to reconcile ride ${ride._id}:`, reconcileResult.error);
          summary.errors++;
        }
      }
    } else {
      logger.error('Error in reconciliation step 2:', unreconciledResult.error);
      summary.errors++;
    }

    // Step 4: Generate reconciliation report
    const report = {
      timestamp: new Date(),
      summary,
      unmatchedTransactions: unmatchedResult.success ? unmatchedResult.data : [],
      unreconciledRides: unreconciledResult.success ? unreconciledResult.data : []
    };

    // Step 5: Send email report if configured
    try {
      await emailService.sendReconciliationReport(report);
    } catch (emailError) {
      logger.error('Failed to send reconciliation report email:', emailError);
    }

    logger.info('Reconciliation completed', summary);
    return {
      success: true,
      message: 'Reconciliation completed',
      data: report
    };
  } catch (error) {
    logger.error('Error running full reconciliation:', error);
    return {
      success: false,
      message: 'Failed to run full reconciliation',
      error: error.message
    };
  }
};

module.exports = {
  findUnmatchedTransactions,
  findUnreconciledRides,
  matchTransactionToRide,
  reconcileRidePayment,
  runFullReconciliation
};
