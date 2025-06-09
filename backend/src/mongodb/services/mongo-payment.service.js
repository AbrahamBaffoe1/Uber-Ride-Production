/**
 * MongoDB Payment Service
 * Handles payment processing with MongoDB integration
 */
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Notification = require('../models/Notification');
const basePaymentService = require('../../services/payment.service');
const mongoose = require('mongoose');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('payment', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('payment', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('payment', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('payment', 'debug', message, metadata)
};
const pushNotificationService = require('./push-notification.service');

/**
 * Process a payment with MongoDB integration
 * @param {Object} paymentData - Payment details
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Payment result with transaction record
 */
const processPayment = async (paymentData, options = {}) => {
  let transaction;
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // Get user from MongoDB using the userId
    let user;
    if (paymentData.userId) {
      user = await User.findById(paymentData.userId).session(session);
      if (!user) {
        throw new Error(`User not found: ${paymentData.userId}`);
      }
      
      // Add user details to payment data if not provided
      if (!paymentData.email) paymentData.email = user.email;
      if (!paymentData.name && (user.firstName || user.lastName)) {
        paymentData.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
    }

    // Prepare transaction record
    const transactionData = {
      userId: paymentData.userId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'NGN',
      type: paymentData.type || 'ride_payment',
      status: 'pending',
      gateway: options.provider || null,
      description: paymentData.description || 'Payment for service',
      metadata: paymentData.meta || {},
      rideId: paymentData.rideId || null,
      paymentMethod: paymentData.paymentMethod || null,
      ipAddress: paymentData.ipAddress || null,
      userAgent: paymentData.userAgent || null
    };

    // Create transaction record in MongoDB
    transaction = await Transaction.createTransaction(transactionData);
    logger.info(`Created pending transaction: ${transaction._id}`);

    // Add transaction ID to payment data metadata
    if (!paymentData.meta) paymentData.meta = {};
    paymentData.meta.transactionId = transaction._id.toString();
    
    // Process the payment using the base payment service
    const paymentResult = await basePaymentService.processPayment(paymentData, options);

    if (paymentResult.success) {
      // Update transaction record with gateway information
      transaction.gateway = paymentResult.data.provider;
      transaction.gatewayTransactionId = paymentResult.data.reference;
      transaction.gatewayResponse = paymentResult.data;

      if (paymentResult.data.status === 'completed') {
        transaction.status = 'completed';
        transaction.processedAt = new Date();
      }

      await transaction.save({ session });

      // If this is a ride payment and it's completed, update the ride
      if (transaction.rideId && transaction.status === 'completed' && 
          transaction.type === 'ride_payment') {
        await Ride.findByIdAndUpdate(
          transaction.rideId,
          { 
            $set: { 
              isPaid: true,
              paymentStatus: 'completed',
              paymentCompletedAt: new Date()
            }
          },
          { session }
        );
      }

      // Send notification to user
      if (user) {
        try {
          await pushNotificationService.createAndSendNotification({
            userId: user._id,
            type: transaction.status === 'completed' ? 'payment_success' : 'payment_pending',
            customData: {
              amount: transaction.amount,
              currency: transaction.currency,
              transactionId: transaction._id.toString()
            }
          });
        } catch (notificationError) {
          logger.error('Failed to send payment notification:', notificationError);
          // Continue processing - notification failure shouldn't stop payment process
        }
      }

      // Commit the transaction
      await session.commitTransaction();
      
      // Add the MongoDB transaction ID to the result
      return {
        ...paymentResult,
        transactionId: transaction._id.toString()
      };
    } else {
      // Payment failed at the gateway level
      transaction.status = 'failed';
      transaction.failureReason = paymentResult.message || paymentResult.error || 'Unknown error';
      transaction.gatewayResponse = paymentResult;
      
      await transaction.save({ session });
      await session.commitTransaction();

      // Send failed payment notification
      if (user) {
        try {
          await pushNotificationService.createAndSendNotification({
            userId: user._id,
            type: 'payment_failed',
            customData: {
              amount: transaction.amount,
              currency: transaction.currency,
              transactionId: transaction._id.toString(),
              reason: transaction.failureReason
            }
          });
        } catch (notificationError) {
          logger.error('Failed to send payment failure notification:', notificationError);
        }
      }

      return {
        ...paymentResult,
        transactionId: transaction._id.toString()
      };
    }
  } catch (error) {
    logger.error('MongoDB payment processing error:', error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    // If we created a transaction record, update it to failed
    if (transaction) {
      try {
        transaction.status = 'failed';
        transaction.failureReason = error.message;
        await transaction.save();
      } catch (updateError) {
        logger.error('Failed to update transaction status after error:', updateError);
      }
    }
    
    return {
      success: false,
      message: 'Payment processing failed',
      error: error.message,
      transactionId: transaction ? transaction._id.toString() : null
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Verify a payment with MongoDB integration
 * @param {string} reference - Payment reference or transaction ID
 * @param {string} provider - Provider name (optional)
 * @returns {Promise<Object>} - Verification result with transaction record
 */
const verifyPayment = async (reference, provider = null) => {
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();
    
    // Check if reference is a MongoDB ID
    let transaction;
    let isMongoId = false;
    
    try {
      if (mongoose.Types.ObjectId.isValid(reference)) {
        transaction = await Transaction.findById(reference).session(session);
        isMongoId = !!transaction;
      }
    } catch (error) {
      logger.debug('Reference is not a valid MongoDB transaction ID');
    }
    
    // If not found by ID, try to find by gateway transaction ID
    if (!transaction) {
      transaction = await Transaction.findOne({ 
        gatewayTransactionId: reference 
      }).session(session);
    }
    
    // If transaction found in MongoDB
    if (transaction) {
      // If already verified and completed, return the stored result
      if (transaction.status === 'completed' && transaction.processedAt) {
        logger.info(`Transaction ${transaction._id} already verified and completed`);
        
        await session.commitTransaction();
        return {
          success: true,
          message: 'Payment verified successfully (from database)',
          data: {
            reference: transaction.gatewayTransactionId,
            transactionId: transaction._id.toString(),
            mongoTransactionId: transaction._id.toString(),
            amount: transaction.amount,
            currency: transaction.currency,
            provider: transaction.gateway,
            status: 'completed',
            paymentMethod: transaction.paymentMethod,
            customer: transaction.metadata?.customer || {},
            paidAt: transaction.processedAt || transaction.updatedAt,
            fromCache: true
          },
          fromDatabase: true
        };
      } else if (transaction.status === 'failed') {
        // If already marked as failed, return the failure
        logger.info(`Transaction ${transaction._id} already verified and failed`);
        
        await session.commitTransaction();
        return {
          success: false,
          message: 'Payment verification failed (from database)',
          error: transaction.failureReason || 'Unknown error',
          data: {
            reference: transaction.gatewayTransactionId,
            transactionId: transaction._id.toString(),
            mongoTransactionId: transaction._id.toString(),
            status: 'failed',
            fromCache: true
          },
          fromDatabase: true
        };
      }
      
      // For pending transactions, verify with the payment provider
      if (!isMongoId) {
        reference = transaction.gatewayTransactionId;
      }
      provider = provider || transaction.gateway;
    }

    // Verify with the payment gateway
    const verificationResult = await basePaymentService.verifyPayment(reference, provider);
    
    // If transaction exists in MongoDB, update it
    if (transaction) {
      if (verificationResult.success) {
        transaction.status = 'completed';
        transaction.processedAt = new Date();
        transaction.gatewayResponse = verificationResult.data;
        transaction.paymentMethod = verificationResult.data.paymentMethod || transaction.paymentMethod;
        
        // Update payment details if available
        if (verificationResult.data.paymentDetails) {
          transaction.paymentDetails = {
            ...transaction.paymentDetails,
            ...verificationResult.data.paymentDetails
          };
        }
        
        await transaction.save({ session });
        
        // If this is a ride payment, update the ride
        if (transaction.rideId && transaction.type === 'ride_payment') {
          await Ride.findByIdAndUpdate(
            transaction.rideId,
            { 
              $set: { 
                isPaid: true,
                paymentStatus: 'completed',
                paymentCompletedAt: new Date()
              }
            },
            { session }
          );
        }
        
        // Send notification to user
        try {
          await pushNotificationService.createAndSendNotification({
            userId: transaction.userId,
            type: 'payment_success',
            customData: {
              amount: transaction.amount,
              currency: transaction.currency,
              transactionId: transaction._id.toString()
            }
          });
        } catch (notificationError) {
          logger.error('Failed to send payment notification:', notificationError);
        }
      } else {
        // Payment verification failed
        transaction.status = 'failed';
        transaction.failureReason = verificationResult.message || verificationResult.error || 'Verification failed';
        transaction.gatewayResponse = verificationResult;
        
        await transaction.save({ session });
        
        // Send failed payment notification
        try {
          await pushNotificationService.createAndSendNotification({
            userId: transaction.userId,
            type: 'payment_failed',
            customData: {
              amount: transaction.amount,
              currency: transaction.currency,
              transactionId: transaction._id.toString(),
              reason: transaction.failureReason
            }
          });
        } catch (notificationError) {
          logger.error('Failed to send payment failure notification:', notificationError);
        }
      }
      
      await session.commitTransaction();
      
      // Add MongoDB transaction ID to the result
      return {
        ...verificationResult,
        mongoTransactionId: transaction._id.toString()
      };
    } else if (verificationResult.success) {
      // Transaction not in MongoDB yet but verification succeeded
      // Create a new transaction record
      try {
        const transactionData = {
          userId: null, // Will need to be updated later
          amount: verificationResult.data.amount,
          currency: verificationResult.data.currency,
          type: 'ride_payment', // Default, may need update
          status: 'completed',
          gateway: verificationResult.data.provider,
          gatewayTransactionId: verificationResult.data.reference,
          gatewayResponse: verificationResult.data,
          description: 'Payment verified via gateway',
          paymentMethod: verificationResult.data.paymentMethod,
          processedAt: new Date()
        };
        
        const newTransaction = await Transaction.createTransaction(transactionData);
        logger.info(`Created new transaction from verification: ${newTransaction._id}`);
        
        await session.commitTransaction();
        
        // Add MongoDB transaction ID to the result
        return {
          ...verificationResult,
          mongoTransactionId: newTransaction._id.toString()
        };
      } catch (createError) {
        logger.error('Failed to create transaction from verification:', createError);
        await session.abortTransaction();
        
        // Return original result even if we couldn't create the transaction
        return verificationResult;
      }
    } else {
      // Verification failed and no transaction found
      await session.commitTransaction();
      return verificationResult;
    }
  } catch (error) {
    logger.error('MongoDB payment verification error:', error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    return {
      success: false,
      message: 'Payment verification failed',
      error: error.message
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Process a payment webhook with MongoDB integration
 * @param {Object} payload - Webhook payload
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} - Webhook processing result
 */
const processWebhook = async (payload, headers) => {
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();
    
    // Process the webhook using the base payment service
    const webhookResult = await basePaymentService.processWebhook(payload, headers);
    
    if (webhookResult.success) {
      // Find the transaction in MongoDB by gateway reference
      let transaction;
      
      if (webhookResult.data && webhookResult.data.reference) {
        transaction = await Transaction.findOne({
          gatewayTransactionId: webhookResult.data.reference
        }).session(session);
      }
      
      // If transaction found, update it
      if (transaction) {
        if (webhookResult.action === 'PAYMENT_COMPLETED') {
          transaction.status = 'completed';
          transaction.processedAt = new Date();
          transaction.gatewayResponse = webhookResult.data;
          
          if (webhookResult.data.paymentMethod) {
            transaction.paymentMethod = webhookResult.data.paymentMethod;
          }
          
          await transaction.save({ session });
          
          // If this is a ride payment, update the ride
          if (transaction.rideId && transaction.type === 'ride_payment') {
            await Ride.findByIdAndUpdate(
              transaction.rideId,
              { 
                $set: { 
                  isPaid: true,
                  paymentStatus: 'completed',
                  paymentCompletedAt: new Date()
                }
              },
              { session }
            );
          }
          
          // Send notification to user
          try {
            await pushNotificationService.createAndSendNotification({
              userId: transaction.userId,
              type: 'payment_success',
              customData: {
                amount: transaction.amount,
                currency: transaction.currency,
                transactionId: transaction._id.toString()
              }
            });
          } catch (notificationError) {
            logger.error('Failed to send payment notification:', notificationError);
          }
        } else if (webhookResult.action === 'PAYMENT_FAILED') {
          transaction.status = 'failed';
          transaction.failureReason = webhookResult.data.error || 'Payment failed';
          transaction.gatewayResponse = webhookResult.data;
          
          await transaction.save({ session });
          
          // Send failed payment notification
          try {
            await pushNotificationService.createAndSendNotification({
              userId: transaction.userId,
              type: 'payment_failed',
              customData: {
                amount: transaction.amount,
                currency: transaction.currency,
                transactionId: transaction._id.toString(),
                reason: transaction.failureReason
              }
            });
          } catch (notificationError) {
            logger.error('Failed to send payment failure notification:', notificationError);
          }
        }
      } else if (webhookResult.action === 'PAYMENT_COMPLETED' && webhookResult.data) {
        // Transaction not in MongoDB yet but payment succeeded
        // Create a new transaction record
        try {
          const transactionData = {
            userId: null, // Will need to be updated later
            amount: webhookResult.data.amount,
            currency: webhookResult.data.currency || 'NGN',
            type: 'ride_payment', // Default, may need update
            status: 'completed',
            gateway: webhookResult.data.provider,
            gatewayTransactionId: webhookResult.data.reference,
            gatewayResponse: webhookResult.data,
            description: 'Payment completed via webhook',
            paymentMethod: webhookResult.data.paymentMethod,
            processedAt: new Date()
          };
          
          const newTransaction = await Transaction.createTransaction(transactionData);
          logger.info(`Created new transaction from webhook: ${newTransaction._id}`);
          
          // Update the result
          webhookResult.mongoTransactionId = newTransaction._id.toString();
        } catch (createError) {
          logger.error('Failed to create transaction from webhook:', createError);
          // Continue processing - we still want to acknowledge the webhook
        }
      }
      
      await session.commitTransaction();
      
      // If transaction was found, add MongoDB transaction ID to the result
      if (transaction) {
        webhookResult.mongoTransactionId = transaction._id.toString();
      }
    }
    
    return webhookResult;
  } catch (error) {
    logger.error('MongoDB payment webhook processing error:', error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    return {
      success: false,
      message: 'Payment webhook processing failed',
      error: error.message
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Refund a payment with MongoDB integration
 * @param {string} transactionId - Transaction ID (MongoDB ID or gateway ID)
 * @param {Object} options - Refund options
 * @returns {Promise<Object>} - Refund result
 */
const refundPayment = async (transactionId, options = {}) => {
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();
    
    // Find the transaction in MongoDB
    let transaction;
    let gatewayTransactionId;
    
    // Check if it's a MongoDB ID
    if (mongoose.Types.ObjectId.isValid(transactionId)) {
      transaction = await Transaction.findById(transactionId).session(session);
      
      if (transaction) {
        gatewayTransactionId = transaction.gatewayTransactionId;
      }
    }
    
    // If not found by MongoDB ID, try to find by gateway transaction ID
    if (!transaction) {
      transaction = await Transaction.findOne({ 
        gatewayTransactionId: transactionId 
      }).session(session);
      
      if (transaction) {
        gatewayTransactionId = transaction.gatewayTransactionId;
      } else {
        gatewayTransactionId = transactionId;
      }
    }
    
    // If transaction found but not completed, can't refund
    if (transaction && transaction.status !== 'completed') {
      await session.abortTransaction();
      
      return {
        success: false,
        message: `Cannot refund transaction with status: ${transaction.status}`,
        error: 'Transaction is not in a refundable state'
      };
    }
    
    // Set provider from transaction if found
    if (transaction && !options.provider) {
      options.provider = transaction.gateway;
    }
    
    // Set amount from transaction if not provided
    if (transaction && !options.amount && transaction.amount) {
      options.amount = transaction.amount;
    }
    
    // Issue refund through the base payment service
    const refundResult = await basePaymentService.refundPayment(
      gatewayTransactionId, 
      options
    );
    
    if (refundResult.success && transaction) {
      // If refund successful and we have the original transaction
      // Create a refund transaction linked to the original
      const refundTransactionData = {
        userId: transaction.userId,
        amount: options.amount || transaction.amount,
        currency: transaction.currency,
        type: 'refund',
        status: 'completed',
        gateway: transaction.gateway,
        gatewayTransactionId: refundResult.data.refundId,
        gatewayResponse: refundResult.data,
        description: `Refund for transaction ${transaction._id}`,
        metadata: {
          originalTransactionId: transaction._id,
          reason: options.reason || 'Manual refund'
        },
        paymentMethod: transaction.paymentMethod,
        processedAt: new Date(),
        refundDetails: {
          refundAmount: options.amount || transaction.amount,
          refundReason: options.reason || 'Manual refund',
          refundedAt: new Date(),
          refundTransactionId: transaction._id
        }
      };
      
      // Create the refund transaction
      const refundTransaction = await Transaction.createTransaction(refundTransactionData);
      
      // Update the original transaction to reference the refund
      transaction.status = options.amount && options.amount < transaction.amount 
        ? 'partially_refunded' 
        : 'refunded';
      
      if (!transaction.refundDetails) {
        transaction.refundDetails = {};
      }
      
      transaction.refundDetails.refundAmount = options.amount || transaction.amount;
      transaction.refundDetails.refundReason = options.reason || 'Manual refund';
      transaction.refundDetails.refundedAt = new Date();
      transaction.refundDetails.refundTransactionId = refundTransaction._id;
      
      await transaction.save({ session });
      
      // Send notification to user
      if (transaction.userId) {
        try {
          await pushNotificationService.createAndSendNotification({
            userId: transaction.userId,
            type: 'payment_refund',
            title: 'Payment Refunded',
            message: `Your payment of ${transaction.amount} ${transaction.currency} has been refunded`,
            customData: {
              amount: refundTransaction.amount,
              currency: refundTransaction.currency,
              originalTransactionId: transaction._id.toString(),
              refundTransactionId: refundTransaction._id.toString()
            }
          });
        } catch (notificationError) {
          logger.error('Failed to send refund notification:', notificationError);
        }
      }
      
      await session.commitTransaction();
      
      // Add transaction IDs to the result
      return {
        ...refundResult,
        originalTransactionId: transaction._id.toString(),
        refundTransactionId: refundTransaction._id.toString()
      };
    } else if (refundResult.success) {
      // Refund successful but original transaction not found
      // Create a standalone refund transaction
      try {
        const refundTransactionData = {
          userId: null, // Unknown user
          amount: options.amount,
          currency: options.currency || 'NGN',
          type: 'refund',
          status: 'completed',
          gateway: options.provider,
          gatewayTransactionId: refundResult.data.refundId,
          gatewayResponse: refundResult.data,
          description: `Refund for external transaction ${transactionId}`,
          metadata: {
            externalTransactionId: transactionId,
            reason: options.reason || 'Manual refund'
          },
          processedAt: new Date()
        };
        
        const refundTransaction = await Transaction.createTransaction(refundTransactionData);
        await session.commitTransaction();
        
        // Add transaction ID to the result
        return {
          ...refundResult,
          refundTransactionId: refundTransaction._id.toString()
        };
      } catch (createError) {
        logger.error('Failed to create refund transaction:', createError);
        await session.abortTransaction();
        
        // Return original result
        return refundResult;
      }
    } else {
      // Refund failed
      await session.abortTransaction();
      return refundResult;
    }
  } catch (error) {
    logger.error('MongoDB payment refund error:', error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    return {
      success: false,
      message: 'Payment refund failed',
      error: error.message
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Get transaction details with MongoDB integration
 * @param {string} transactionId - Transaction ID (MongoDB ID or gateway ID)
 * @returns {Promise<Object>} - Transaction details
 */
const getTransaction = async (transactionId) => {
  try {
    // Check if it's a MongoDB ID
    let transaction;
    let isMongoId = false;
    
    if (mongoose.Types.ObjectId.isValid(transactionId)) {
      transaction = await Transaction.findById(transactionId)
        .populate('userId', 'firstName lastName email')
        .populate('rideId', 'pickupLocation destination status')
        .lean();
      
      if (transaction) {
        isMongoId = true;
      }
    }
    
    // If not found by MongoDB ID, try to find by gateway transaction ID
    if (!transaction) {
      transaction = await Transaction.findOne({ gatewayTransactionId: transactionId })
        .populate('userId', 'firstName lastName email')
        .populate('rideId', 'pickupLocation destination status')
        .lean();
    }
    
    if (transaction) {
      // Format user information
      let user = null;
      if (transaction.userId) {
        user = {
          id: transaction.userId._id,
          name: `${transaction.userId.firstName || ''} ${transaction.userId.lastName || ''}`.trim(),
          email: transaction.userId.email
        };
      }
      
      return {
        success: true,
        data: {
          id: transaction._id,
          externalId: transaction.gatewayTransactionId,
          amount: transaction.amount,
          currency: transaction.currency,
          type: transaction.type,
          status: transaction.status,
          gateway: transaction.gateway,
          paymentMethod: transaction.paymentMethod,
          description: transaction.description,
          metadata: transaction.metadata,
          user,
          ride: transaction.rideId,
          createdAt: transaction.createdAt,
          processedAt: transaction.processedAt,
          updatedAt: transaction.updatedAt,
          refundDetails: transaction.refundDetails,
          fees: transaction.fees
        }
      };
    } else if (!isMongoId) {
      // If not found in MongoDB and not a MongoDB ID, try to get from gateway
      const gatewayResult = await basePaymentService.getTransaction(transactionId);
      
      if (gatewayResult.success) {
        return gatewayResult;
      }
      
      return {
        success: false,
        message: 'Transaction not found',
        error: 'Transaction not found in database or payment gateway'
      };
    } else {
      return {
        success: false,
        message: 'Transaction not found',
        error: 'Transaction not found in database'
      };
    }
  } catch (error) {
    logger.error('MongoDB get transaction error:', error);
    
    return {
      success: false,
      message: 'Failed to get transaction details',
      error: error.message
    };
  }
};

/**
 * Get user transactions with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, page, type, status)
 * @returns {Promise<Object>} - Transactions with pagination
 */
const getUserTransactions = async (userId, options = {}) => {
  try {
    const { 
      limit = 10, 
      page = 1, 
      type, 
      status,
      sortBy = 'createdAt',
      sortDirection = 'desc' 
    } = options;
    
    // Build query
    const query = { userId: mongoose.Types.ObjectId(userId) };
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
    
    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('rideId', 'pickupLocation destination status')
        .lean(),
      Transaction.countDocuments(query)
    ]);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    };
  } catch (error) {
    logger.error('Error getting user transactions:', error);
    
    return {
      success: false,
      message: 'Failed to get user transactions',
      error: error.message
    };
  }
};

/**
 * Initialize a cashout transaction for a rider
 * @param {Object} cashoutData - Cashout details
 * @returns {Promise<Object>} - Cashout transaction
 */
const initiateCashout = async (cashoutData) => {
  let session;

  try {
    // Start a MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();
    
    const { 
      userId, 
      amount, 
      currency = 'NGN',
      bankDetails,
      description = 'Rider earnings cashout'
    } = cashoutData;
    
    // Verify user exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Check if user has sufficient balance
    const balance = await Transaction.getUserBalance(userId);
    if (balance.availableBalance < amount) {
      throw new Error(`Insufficient balance. Available: ${balance.availableBalance} ${currency}, Requested: ${amount} ${currency}`);
    }
    
    // Create a cashout transaction
    const transactionData = {
      userId,
      amount,
      currency,
      type: 'cashout',
      status: 'pending',
      description,
      metadata: {},
      bankDetails: bankDetails || {}
    };
    
    const transaction = await Transaction.createTransaction(transactionData);
    logger.info(`Created cashout transaction: ${transaction._id}`);
    
    // Process the cashout - this would typically involve a call to a payment provider
    // to initiate a bank transfer, but we'll just mark it as completed for now
    transaction.status = 'processing';
    await transaction.save({ session });
    
    // Send notification to user
    try {
      await pushNotificationService.createAndSendNotification({
        userId,
        type: 'cashout_initiated',
        title: 'Cashout Initiated',
        message: `Your cashout of ${amount} ${currency} has been initiated`,
        customData: {
          amount,
          currency,
          transactionId: transaction._id.toString()
        }
      });
    } catch (notificationError) {
      logger.error('Failed to send cashout notification:', notificationError);
    }
    
    await session.commitTransaction();
    
    return {
      success: true,
      message: 'Cashout initiated successfully',
      data: {
        transaction: {
          id: transaction._id,
          amount,
          currency,
          status: transaction.status,
          createdAt: transaction.createdAt
        }
      }
    };
  } catch (error) {
    logger.error('MongoDB cashout error:', error);
    
    // Abort the transaction if it was started
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    
    return {
      success: false,
      message: 'Cashout failed',
      error: error.message
    };
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// Export all methods
module.exports = {
  processPayment,
  verifyPayment,
  processWebhook,
  refundPayment,
  getTransaction,
  getUserTransactions,
  initiateCashout
};
