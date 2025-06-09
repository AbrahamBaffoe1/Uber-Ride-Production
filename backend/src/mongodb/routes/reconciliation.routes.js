/**
 * Reconciliation Routes for MongoDB
 * Handles API endpoints for payment reconciliation processes
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');
const reconciliationService = require('../../services/payment-reconciliation.service');
const mongoose = require('mongoose');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('reconciliation', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('reconciliation', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('reconciliation', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('reconciliation', 'debug', message, metadata)
};

const router = express.Router();

/**
 * @route GET /api/v1/mongo/reconciliation/unmatched-transactions
 * @desc Get unmatched transactions
 * @access Public (for development only)
 */
router.get('/unmatched-transactions', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate,
      provider = 'paystack'
    } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    const result = await reconciliationService.findUnmatchedTransactions(start, end, provider);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to find unmatched transactions',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error finding unmatched transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while finding unmatched transactions',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/reconciliation/unreconciled-rides
 * @desc Get unreconciled rides
 * @access Public (for development only)
 */
router.get('/unreconciled-rides', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate 
    } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    const result = await reconciliationService.findUnreconciledRides(start, end);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to find unreconciled rides',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error finding unreconciled rides:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while finding unreconciled rides',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/reconciliation/match-transaction
 * @desc Match a transaction to a ride manually
 * @access Public (for development only)
 */
router.post('/match-transaction', async (req, res) => {
  try {
    const { transactionId, rideId } = req.body;
    
    if (!transactionId || !rideId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and Ride ID are required'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(transactionId) || !mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Transaction ID or Ride ID'
      });
    }
    
    const result = await reconciliationService.matchTransactionToRide(transactionId, rideId);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message || 'Transaction matched to ride successfully',
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to match transaction to ride',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error matching transaction to ride:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while matching transaction to ride',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/reconciliation/reconcile-ride/:rideId
 * @desc Reconcile a single ride payment
 * @access Public (for development only)
 */
router.post('/reconcile-ride/:rideId', async (req, res) => {
  try {
    const { rideId } = req.params;
    
    if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Ride ID is required'
      });
    }
    
    const result = await reconciliationService.reconcileRidePayment(rideId);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message || 'Ride payment reconciled successfully',
        data: result.data,
        requiresManualAction: !!result.requiresManualAction
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || 'Failed to reconcile ride payment',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error reconciling ride payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while reconciling ride payment',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/reconciliation/run-full
 * @desc Run a full reconciliation process
 * @access Public (for development only)
 */
router.post('/run-full', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate,
      provider = 'paystack'
    } = req.body;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)); // Default to last 7 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // Start the reconciliation process asynchronously and return immediately
    // This avoids timeouts for long-running processes
    res.status(202).json({
      success: true,
      message: 'Reconciliation process started',
      data: {
        startDate: start,
        endDate: end,
        provider
      }
    });
    
    // Run the reconciliation process in the background
    reconciliationService.runFullReconciliation(start, end, provider)
      .then(result => {
        if (!result.success) {
          logger.error('Reconciliation process completed with errors:', result.error);
        } else {
          logger.info('Reconciliation process completed successfully:', result.data.summary);
        }
      })
      .catch(error => {
        logger.error('Reconciliation process failed:', error);
      });
  } catch (error) {
    logger.error('Error starting reconciliation process:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while starting reconciliation process',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/reconciliation/status
 * @desc Get reconciliation status and metrics
 * @access Public (for development only)
 */
router.get('/status', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate 
    } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)); // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get counts from both services
    const [unmatchedResult, unreconciledResult] = await Promise.all([
      reconciliationService.findUnmatchedTransactions(start, end),
      reconciliationService.findUnreconciledRides(start, end)
    ]);
    
    // Calculate percentage of reconciled rides
    const Transaction = mongoose.model('Transaction');
    const Ride = mongoose.model('Ride');
    
    const [completedRidesCount, reconciledRidesCount, totalTransactionsCount, matchedTransactionsCount] = await Promise.all([
      Ride.countDocuments({ 
        status: 'completed',
        completedAt: { $gte: start, $lte: end }
      }),
      Ride.countDocuments({ 
        status: 'completed',
        isPaid: true,
        paymentStatus: 'completed',
        completedAt: { $gte: start, $lte: end }
      }),
      Transaction.countDocuments({
        type: 'ride_payment',
        createdAt: { $gte: start, $lte: end }
      }),
      Transaction.countDocuments({
        type: 'ride_payment',
        rideId: { $exists: true, $ne: null },
        createdAt: { $gte: start, $lte: end }
      })
    ]);
    
    const reconciledPercentage = completedRidesCount > 0 
      ? Math.round((reconciledRidesCount / completedRidesCount) * 100) 
      : 100;
    
    const matchedPercentage = totalTransactionsCount > 0 
      ? Math.round((matchedTransactionsCount / totalTransactionsCount) * 100) 
      : 100;
    
    return res.status(200).json({
      success: true,
      data: {
        dateRange: {
          startDate: start,
          endDate: end
        },
        reconciliationStatus: {
          completedRides: completedRidesCount,
          reconciledRides: reconciledRidesCount,
          unreconciledRides: unmatchedResult.success ? unmatchedResult.data.length : 0,
          reconciledPercentage
        },
        transactionStatus: {
          totalTransactions: totalTransactionsCount,
          matchedTransactions: matchedTransactionsCount,
          unmatchedTransactions: unreconciledResult.success ? unreconciledResult.data.length : 0,
          matchedPercentage
        }
      }
    });
  } catch (error) {
    logger.error('Error getting reconciliation status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while getting reconciliation status',
      error: error.message
    });
  }
});

module.exports = router;
