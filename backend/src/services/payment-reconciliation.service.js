/**
 * Payment Reconciliation Service
 * 
 * Handles payment reconciliation processes to match transactions with rides
 */
import { log } from './logging.service.js';
import Transaction from '../mongodb/models/Transaction.js';
import Ride from '../mongodb/models/Ride.js';

/**
 * Find transactions that haven't been matched to a ride
 * @param {string} startDate - ISO string start date (optional)
 * @param {string} endDate - ISO string end date (optional)
 * @param {string} provider - Payment provider/method (optional)
 * @returns {Promise<Array>} Array of unmatched transactions
 */
export const findUnmatchedTransactions = async (startDate, endDate, provider) => {
  try {
    // Build query filter
    const filter = {
      rideId: { $exists: false }, // No associated ride
      status: 'completed', // Only completed transactions
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Add payment provider/method filter if provided
    if (provider) {
      filter.paymentMethod = provider;
    }
    
    // Find unmatched transactions
    const unmatchedTransactions = await Transaction.find(filter)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(100); // Limit results to avoid overwhelming response
    
    return unmatchedTransactions;
  } catch (error) {
    log('payment', 'error', 'Error finding unmatched transactions:', { error });
    throw error;
  }
};

/**
 * Find rides that have been completed but not reconciled with a payment
 * @param {string} startDate - ISO string start date (optional)
 * @param {string} endDate - ISO string end date (optional)
 * @returns {Promise<Array>} Array of unreconciled rides
 */
export const findUnreconciledRides = async (startDate, endDate) => {
  try {
    // Build query filter
    const filter = {
      status: 'completed', // Only completed rides
      paymentStatus: { $ne: 'reconciled' }, // Not reconciled
      fare: { $exists: true, $gt: 0 } // Has a fare amount
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      filter.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Find unreconciled rides
    const unreconciledRides = await Ride.find(filter)
      .sort({ completedAt: -1 }) // Most recent first
      .limit(100); // Limit results to avoid overwhelming response
    
    return unreconciledRides;
  } catch (error) {
    logError('Error finding unreconciled rides:', error);
    throw error;
  }
};

/**
 * Get count of completed rides within a date range
 * @param {string} startDate - ISO string start date (optional)
 * @param {string} endDate - ISO string end date (optional)
 * @returns {Promise<number>} Count of completed rides
 */
export const getCompletedRidesCount = async (startDate, endDate) => {
  try {
    // Build query filter
    const filter = {
      status: 'completed',
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      filter.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Count completed rides
    const count = await Ride.countDocuments(filter);
    
    return count;
  } catch (error) {
    logError('Error counting completed rides:', error);
    throw error;
  }
};

/**
 * Get count of total transactions within a date range
 * @param {string} startDate - ISO string start date (optional)
 * @param {string} endDate - ISO string end date (optional)
 * @returns {Promise<number>} Count of total transactions
 */
export const getTotalTransactionsCount = async (startDate, endDate) => {
  try {
    // Build query filter
    const filter = {
      status: 'completed',
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Count total transactions
    const count = await Transaction.countDocuments(filter);
    
    return count;
  } catch (error) {
    logError('Error counting total transactions:', error);
    throw error;
  }
};

/**
 * Match a transaction to a ride manually
 * @param {string} transactionId - Transaction ID
 * @param {string} rideId - Ride ID
 * @returns {Promise<Object>} Result object
 */
export const matchTransactionToRide = async (transactionId, rideId) => {
  try {
    // Find the transaction and ride
    const [transaction, ride] = await Promise.all([
      Transaction.findById(transactionId),
      Ride.findById(rideId)
    ]);
    
    // Validate both exist
    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found'
      };
    }
    
    if (!ride) {
      return {
        success: false,
        message: 'Ride not found'
      };
    }
    
    // Validate ride is completed
    if (ride.status !== 'completed') {
      return {
        success: false,
        message: 'Cannot reconcile a ride that has not been completed'
      };
    }
    
    // Validate transaction is completed
    if (transaction.status !== 'completed') {
      return {
        success: false,
        message: 'Cannot reconcile a transaction that has not been completed'
      };
    }
    
    // Validate amounts match (with small tolerance for currency conversion)
    const tolerance = 0.01; // 1% tolerance
    const amountDifference = Math.abs(transaction.amount - ride.fare) / ride.fare;
    
    if (amountDifference > tolerance) {
      logInfo('Reconciliation amount mismatch', {
        transactionAmount: transaction.amount,
        rideFare: ride.fare,
        difference: amountDifference
      });
      
      // We still proceed, but log the discrepancy
    }
    
    // Update transaction with ride ID
    transaction.rideId = ride._id;
    transaction.reconciled = true;
    transaction.reconciledAt = new Date();
    
    // Update ride payment status
    ride.paymentStatus = 'reconciled';
    ride.reconciledAt = new Date();
    ride.transactionId = transaction._id;
    
    // Save both documents
    await Promise.all([
      transaction.save(),
      ride.save()
    ]);
    
    // Log the successful reconciliation
    logInfo('Transaction matched to ride successfully', {
      transactionId,
      rideId,
      amount: transaction.amount,
      fare: ride.fare
    });
    
    return {
      success: true,
      data: {
        transactionId,
        rideId,
        matchedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    logError('Error matching transaction to ride:', error);
    return {
      success: false,
      message: 'Error matching transaction to ride: ' + error.message
    };
  }
};

/**
 * Reconcile a single ride payment
 * @param {string} rideId - Ride ID
 * @returns {Promise<Object>} Result object
 */
export const reconcileRidePayment = async (rideId) => {
  try {
    // Find the ride
    const ride = await Ride.findById(rideId);
    
    // Validate ride exists
    if (!ride) {
      return {
        success: false,
        message: 'Ride not found'
      };
    }
    
    // Validate ride is completed
    if (ride.status !== 'completed') {
      return {
        success: false,
        message: 'Cannot reconcile a ride that has not been completed'
      };
    }
    
    // Try to find a matching transaction
    const possibleTransactions = await Transaction.find({
      amount: { $gte: ride.fare * 0.99, $lte: ride.fare * 1.01 }, // 1% tolerance
      status: 'completed',
      rideId: { $exists: false }, // Not already assigned to a ride
      userId: ride.userId // Same user
    }).sort({ createdAt: -1 }); // Most recent first
    
    if (possibleTransactions.length === 0) {
      // No matching transaction found, mark for manual reconciliation
      ride.paymentStatus = 'manual_reconciliation_required';
      ride.reconciledAt = new Date();
      
      await ride.save();
      
      return {
        success: true,
        requiresManualAction: true,
        message: 'No matching transaction found, marked for manual reconciliation',
        data: {
          rideId,
          reconciledAt: new Date().toISOString(),
          status: 'manual_reconciliation_required'
        }
      };
    }
    
    // Use the most recent matching transaction
    const transaction = possibleTransactions[0];
    
    // Update transaction with ride ID
    transaction.rideId = ride._id;
    transaction.reconciled = true;
    transaction.reconciledAt = new Date();
    
    // Update ride payment status
    ride.paymentStatus = 'reconciled';
    ride.reconciledAt = new Date();
    ride.transactionId = transaction._id;
    
    // Save both documents
    await Promise.all([
      transaction.save(),
      ride.save()
    ]);
    
    // Log the successful reconciliation
    logInfo('Ride payment reconciled automatically', {
      rideId,
      transactionId: transaction._id,
      amount: transaction.amount,
      fare: ride.fare
    });
    
    return {
      success: true,
      requiresManualAction: false,
      data: {
        rideId,
        transactionId: transaction._id,
        reconciledAt: new Date().toISOString(),
        status: 'reconciled'
      }
    };
  } catch (error) {
    logError('Error reconciling ride payment:', error);
    return {
      success: false,
      message: 'Error reconciling ride payment: ' + error.message
    };
  }
};

/**
 * Run a full reconciliation process for a date range
 * @param {string} startDate - ISO string start date (optional)
 * @param {string} endDate - ISO string end date (optional)
 * @param {string} provider - Payment provider/method (optional)
 * @returns {Promise<Object>} Result object
 */
export const runFullReconciliation = async (startDate, endDate, provider) => {
  try {
    // Start time for performance tracking
    const startTime = Date.now();
    
    // Find all unreconciled rides
    const rides = await findUnreconciledRides(startDate, endDate);
    
    // Track results
    const results = {
      totalRides: rides.length,
      automaticallyReconciled: 0,
      manualReconciliationRequired: 0,
      failed: 0,
      details: []
    };
    
    // Process each ride
    for (const ride of rides) {
      try {
        const result = await reconcileRidePayment(ride._id);
        
        if (result.success) {
          if (result.requiresManualAction) {
            results.manualReconciliationRequired++;
          } else {
            results.automaticallyReconciled++;
          }
        } else {
          results.failed++;
        }
        
        results.details.push({
          rideId: ride._id,
          result
        });
      } catch (error) {
        results.failed++;
        logError('Error reconciling ride in batch process:', error);
        
        results.details.push({
          rideId: ride._id,
          error: error.message
        });
      }
    }
    
    // Calculate performance metrics
    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;
    const processingTimeSec = processingTimeMs / 1000;
    
    // Log completion
    logInfo('Full reconciliation process completed', {
      ...results,
      processingTimeMs,
      processingTimeSec,
      startDate,
      endDate,
      provider
    });
    
    return {
      success: true,
      data: {
        ...results,
        processingTimeSec,
        startDate,
        endDate,
        provider,
        completedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    logError('Error running full reconciliation process:', error);
    return {
      success: false,
      message: 'Error running full reconciliation process: ' + error.message
    };
  }
};
