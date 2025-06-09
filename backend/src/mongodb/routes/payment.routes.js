/**
 * Payment Routes for MongoDB
 * Handles API endpoints for payment processing
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Ride = require('../models/Ride');
const mongoPaymentService = require('../services/mongo-payment.service');
const providerFactory = require('../services/payment-provider-factory');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('payment', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('payment', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('payment', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('payment', 'debug', message, metadata)
};
const mongoose = require('mongoose');

const router = express.Router();

/**
 * @route POST /api/v1/mongo/payments/initiate
 * @desc Initiate a payment
 * @access Private
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { 
      amount, 
      currency, 
      paymentMethod, 
      description, 
      metadata, 
      provider: requestedProvider,
      rideId
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Get the user details
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify ride if provided
    let ride;
    if (rideId) {
      if (!mongoose.Types.ObjectId.isValid(rideId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ride ID'
        });
      }

      ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }

      // Verify user is associated with this ride
      if (ride.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to pay for this ride'
        });
      }
    }

    // Build payment data
    const paymentData = {
      amount,
      currency: currency || 'NGN',
      userId: req.user._id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      phoneNumber: user.phoneNumber,
      description: description || (rideId ? 'Payment for ride' : 'Platform payment'),
      paymentMethod,
      type: rideId ? 'ride_payment' : 'payment',
      rideId,
      meta: {
        ...metadata,
        userId: req.user._id.toString(),
        rideId: rideId || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    };

    // Process the payment
    const options = {};
    if (requestedProvider) {
      options.provider = requestedProvider;
    }

    const result = await mongoPaymentService.processPayment(paymentData, options);

    if (result.success) {
      // Include minimal information in the response to reduce sensitive data exposure
      return res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          transactionId: result.transactionId,
          reference: result.data.reference,
          amount,
          currency: currency || 'NGN',
          redirectUrl: result.data.redirectUrl,
          provider: result.data.provider,
          status: result.data.status
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to initiate payment',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error initiating payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while initiating payment',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/payments/verify/:reference
 * @desc Verify a payment by reference
 * @access Private
 */
router.get('/verify/:reference', authenticate, async (req, res) => {
  try {
    const { reference } = req.params;
    const { provider } = req.query;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    const result = await mongoPaymentService.verifyPayment(reference, provider);

    if (result.success) {
      // If this is a MongoDB transaction ID, verify user owns this transaction
      if (mongoose.Types.ObjectId.isValid(reference)) {
        const transaction = await Transaction.findById(reference);
        
        if (transaction && 
            transaction.userId && 
            transaction.userId.toString() !== req.user._id.toString() &&
            !req.user.roles.includes('admin')) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to view this transaction'
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: result.fromDatabase ? 'Payment verified (from database)' : 'Payment verified successfully',
        data: {
          transactionId: result.mongoTransactionId || result.data.transactionId,
          reference: result.data.reference,
          amount: result.data.amount,
          currency: result.data.currency,
          provider: result.data.provider,
          status: result.data.status,
          paymentMethod: result.data.paymentMethod,
          fromCache: !!result.fromDatabase
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Payment verification failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while verifying payment',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/payments/webhook/:provider
 * @desc Handle payment webhook from provider
 * @access Public
 */
router.post('/webhook/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Provider is required'
      });
    }

    const result = await mongoPaymentService.processWebhook(req.body, req.headers);

    if (result.success) {
      // Always return 200 to the payment provider
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } else {
      // Log the error but still return 200 to the payment provider
      logger.error('Error processing webhook:', result.error);
      return res.status(200).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  } catch (error) {
    logger.error('Error handling webhook:', error);
    // Still return 200 to the payment provider to prevent retries
    return res.status(200).json({
      success: false,
      message: 'Internal server error while processing webhook'
    });
  }
});

/**
 * @route POST /api/v1/mongo/payments/refund/:transactionId
 * @desc Refund a payment
 * @access Private (Admin)
 */
router.post('/refund/:transactionId', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { 
      amount, 
      reason,
      provider
    } = req.body;

    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can issue refunds'
      });
    }

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const options = {
      amount,
      reason,
      provider,
      initiatedBy: req.user._id
    };

    const result = await mongoPaymentService.refundPayment(transactionId, options);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          originalTransactionId: result.originalTransactionId,
          refundTransactionId: result.refundTransactionId,
          amount: result.data.amount,
          status: 'completed'
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Refund failed',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error refunding payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing refund',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/payments/transaction/:id
 * @desc Get transaction details
 * @access Private
 */
router.get('/transaction/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const result = await mongoPaymentService.getTransaction(id);

    if (result.success) {
      // Check if user has permission to view this transaction
      if (result.data.user && 
          result.data.user.id && 
          result.data.user.id.toString() !== req.user._id.toString() && 
          !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this transaction'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(404).json({
        success: false,
        message: result.message || 'Transaction not found',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error getting transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching transaction',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/payments/user-transactions
 * @desc Get user transactions with pagination
 * @access Private
 */
router.get('/user-transactions', authenticate, async (req, res) => {
  try {
    const { 
      limit = 10, 
      page = 1, 
      type, 
      status, 
      sortBy = 'createdAt',
      sortDirection = 'desc'
    } = req.query;

    const result = await mongoPaymentService.getUserTransactions(req.user._id, {
      limit,
      page,
      type,
      status,
      sortBy,
      sortDirection
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to get user transactions',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error getting user transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching transactions',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/payments/cashout
 * @desc Process a rider earnings cashout
 * @access Private (Rider)
 */
router.post('/cashout', authenticate, async (req, res) => {
  try {
    const { 
      amount, 
      bankDetails,
      description
    } = req.body;

    // Check if user is a rider
    if (!req.user.roles.includes('rider')) {
      return res.status(403).json({
        success: false,
        message: 'Only riders can cash out earnings'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    if (!bankDetails || !bankDetails.accountNumber || !bankDetails.bankName) {
      return res.status(400).json({
        success: false,
        message: 'Bank details are required'
      });
    }

    const result = await mongoPaymentService.initiateCashout({
      userId: req.user._id,
      amount,
      currency: 'NGN', // Default to NGN - could be made configurable
      bankDetails,
      description: description || 'Rider earnings cashout'
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Cashout initiated successfully',
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to initiate cashout',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error initiating cashout:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while initiating cashout',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/payments/balance
 * @desc Get user balance
 * @access Private
 */
router.get('/balance', authenticate, async (req, res) => {
  try {
    const balance = await Transaction.getUserBalance(req.user._id);

    return res.status(200).json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Error getting user balance:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching balance',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/payments/available-methods
 * @desc Get available payment methods for the user's region
 * @access Private
 */
router.get('/available-methods', authenticate, async (req, res) => {
  try {
    const { country, currency } = req.query;
    
    // Get the user to determine country if not specified
    let userCountry = country;
    if (!userCountry) {
      const user = await User.findById(req.user._id);
      userCountry = user.country || 'NG'; // Default to Nigeria
    }
    
    const provider = providerFactory.getDefaultProvider();
    const methods = provider.getAvailablePaymentMethods({
      country: userCountry,
      currency: currency || 'NGN'
    });

    return res.status(200).json({
      success: true,
      data: {
        methods,
        preferredMethod: methods.length > 0 ? methods[0] : null
      }
    });
  } catch (error) {
    logger.error('Error getting available payment methods:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching payment methods',
      error: error.message
    });
  }
});

module.exports = router;
