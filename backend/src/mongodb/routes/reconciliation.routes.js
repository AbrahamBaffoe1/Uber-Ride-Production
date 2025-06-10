/**
 * Payment Reconciliation Routes
 * Handles API endpoints for payment reconciliation processes
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasAnyRole } from '../middlewares/role.middleware.js';
import * as reconciliationService from '../../services/payment-reconciliation.service.js';
import { logInfo, logError } from '../../services/logging.service.js';

const router = express.Router();

/**
 * @route GET /api/v1/reconciliation/status
 * @desc Get reconciliation status and metrics
 * @access Private (Admin)
 */
router.get('/status', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get unmatched transactions and unreconciled rides counts
    const [unmatchedResult, unreconciledResult] = await Promise.all([
      reconciliationService.findUnmatchedTransactions(startDate, endDate),
      reconciliationService.findUnreconciledRides(startDate, endDate)
    ]);
    
    // Get overall statistics
    const completedRidesCount = await reconciliationService.getCompletedRidesCount(startDate, endDate);
    const totalTransactionsCount = await reconciliationService.getTotalTransactionsCount(startDate, endDate);
    
    const reconciledRides = completedRidesCount - unreconciledResult.length;
    const matchedTransactions = totalTransactionsCount - unmatchedResult.length;
    
    const reconciledPercentage = completedRidesCount > 0 
      ? ((reconciledRides / completedRidesCount) * 100).toFixed(1) 
      : 0;
    
    const matchedPercentage = totalTransactionsCount > 0 
      ? ((matchedTransactions / totalTransactionsCount) * 100).toFixed(1) 
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        reconciliationStatus: {
          completedRides: completedRidesCount,
          reconciledRides,
          unreconciledRides: unreconciledResult.length,
          reconciledPercentage: parseFloat(reconciledPercentage)
        },
        transactionStatus: {
          totalTransactions: totalTransactionsCount,
          matchedTransactions,
          unmatchedTransactions: unmatchedResult.length,
          matchedPercentage: parseFloat(matchedPercentage)
        }
      }
    });
  } catch (error) {
    logError('Error getting reconciliation status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while getting reconciliation status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/reconciliation/unmatched-transactions
 * @desc Get unmatched transactions
 * @access Private (Admin)
 */
router.get('/unmatched-transactions', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, provider } = req.query;
    
    const result = await reconciliationService.findUnmatchedTransactions(startDate, endDate, provider);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Error fetching unmatched transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unmatched transactions',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/reconciliation/unreconciled-rides
 * @desc Get unreconciled rides
 * @access Private (Admin)
 */
router.get('/unreconciled-rides', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const result = await reconciliationService.findUnreconciledRides(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Error fetching unreconciled rides:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unreconciled rides',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/reconciliation/match-transaction
 * @desc Match a transaction to a ride manually
 * @access Private (Admin)
 */
router.post('/match-transaction', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { transactionId, rideId } = req.body;
    
    if (!transactionId || !rideId) {
      return res.status(400).json({
        success: false,
        message: 'Both transaction ID and ride ID are required'
      });
    }
    
    const result = await reconciliationService.matchTransactionToRide(transactionId, rideId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Transaction matched to ride successfully',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to match transaction to ride'
      });
    }
  } catch (error) {
    logError('Error matching transaction to ride:', error);
    res.status(500).json({
      success: false,
      message: 'Error matching transaction to ride',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/reconciliation/reconcile-ride/:rideId
 * @desc Reconcile a single ride payment
 * @access Private (Admin)
 */
router.post('/reconcile-ride/:rideId', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { rideId } = req.params;
    
    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: 'Ride ID is required'
      });
    }
    
    const result = await reconciliationService.reconcileRidePayment(rideId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.requiresManualAction ? 
          'Ride marked for manual reconciliation' : 
          'Ride reconciled successfully',
        requiresManualAction: result.requiresManualAction,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to reconcile ride payment'
      });
    }
  } catch (error) {
    logError('Error reconciling ride payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error reconciling ride payment',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/reconciliation/run-full
 * @desc Run a full reconciliation process
 * @access Private (Admin)
 */
router.post('/run-full', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, provider } = req.body;
    
    // Start the reconciliation process asynchronously and return immediately
    // This avoids timeouts for long-running processes
    logInfo('Starting full reconciliation process', { startDate, endDate, provider });
    
    // Run the reconciliation process in the background
    reconciliationService.runFullReconciliation(startDate, endDate, provider)
      .then(result => {
        logInfo('Reconciliation process completed', { result });
      })
      .catch(error => {
        logError('Reconciliation process failed', error);
      });
    
    // Return response immediately to avoid timeout
    res.status(200).json({
      success: true,
      message: 'Reconciliation process started successfully',
      data: {
        jobId: `recon-${Date.now()}`,
        startDate,
        endDate,
        provider,
        startedAt: new Date().toISOString(),
        estimatedCompletionTime: '2-5 minutes'
      }
    });
  } catch (error) {
    logError('Error starting reconciliation process:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starting reconciliation process',
      error: error.message
    });
  }
});

export default router;
