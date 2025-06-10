/**
 * Payment Analytics Routes
 * Defines API endpoints for payment analytics
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasAnyRole } from '../middlewares/role.middleware.js';
import * as paymentAnalyticsService from '../../services/payment-analytics.service.js';
import { log } from '../../services/logging.service.js';

const router = express.Router();

/**
 * @route GET /api/v1/analytics/payments
 * @desc Get payment analytics data with various filters
 * @access Private (Admin)
 */
router.get('/', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { timeframe = 'week', startDate, endDate, paymentMethod, status } = req.query;
    
    // Fetch analytics data from the service
    const analyticsData = await paymentAnalyticsService.getPaymentAnalytics({
      timeframe,
      startDate,
      endDate,
      paymentMethod,
      status
    });
    
    return res.status(analyticsData.success ? 200 : 400).json(analyticsData);
  } catch (error) {
    log('payment', 'error', 'Payment analytics error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment analytics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/payments/report
 * @desc Generate a payment analytics report
 * @access Private (Admin)
 */
router.get('/report', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { timeframe = 'month', format = 'json', startDate, endDate, paymentMethod } = req.query;
    
    // Generate a detailed report using the analytics service
    const reportData = await paymentAnalyticsService.generatePaymentReport({
      timeframe,
      format,
      startDate,
      endDate,
      paymentMethod
    });
    
    if (!reportData.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate analytics report',
        error: reportData.message
      });
    }
    
    // Handle different formats if the service supports them
    if (format === 'pdf' && reportData.fileUrl) {
      return res.redirect(reportData.fileUrl);
    } else if (format === 'csv' && reportData.fileUrl) {
      return res.redirect(reportData.fileUrl);
    } else if (format === 'excel' && reportData.fileUrl) {
      return res.redirect(reportData.fileUrl);
    }
    
    // Default to JSON response
    return res.status(200).json(reportData);
  } catch (error) {
    log('payment', 'error', 'Payment analytics report error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to generate payment analytics report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/payments/summary
 * @desc Get summary metrics for a period (for quick dashboard stats)
 * @access Private (Admin)
 */
router.get('/summary', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'week', currency, paymentMethod } = req.query;
    
    // Get summary metrics using the analytics service
    const summaryData = await paymentAnalyticsService.getPaymentSummaryMetrics({
      period,
      currency,
      paymentMethod
    });
    
    return res.status(summaryData.success ? 200 : 400).json(summaryData);
  } catch (error) {
    log('payment', 'error', 'Payment analytics summary error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment analytics summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/payments/methods
 * @desc Get payment methods distribution
 * @access Private (Admin)
 */
router.get('/methods', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    
    const methodsData = await paymentAnalyticsService.getPaymentMethodsDistribution({
      period,
      startDate,
      endDate
    });
    
    return res.status(methodsData.success ? 200 : 400).json(methodsData);
  } catch (error) {
    log('payment', 'error', 'Payment methods analytics error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment methods distribution data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/payments/processing-times
 * @desc Get payment processing times analysis
 * @access Private (Admin)
 */
router.get('/processing-times', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'week', startDate, endDate, paymentMethod } = req.query;
    
    const processingTimeData = await paymentAnalyticsService.getPaymentProcessingTimes({
      period,
      startDate,
      endDate,
      paymentMethod
    });
    
    return res.status(processingTimeData.success ? 200 : 400).json(processingTimeData);
  } catch (error) {
    log('payment', 'error', 'Payment processing times analytics error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment processing times data',
      error: error.message
    });
  }
});

export default router;
