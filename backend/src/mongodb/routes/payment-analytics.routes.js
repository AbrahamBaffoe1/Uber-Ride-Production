/**
 * Payment Analytics Routes
 * Defines API endpoints for payment analytics using the MongoDB payment analytics service
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { mongoPaymentAnalyticsService } = require('../services/payment-analytics.service');
const router = express.Router();

/**
 * @route GET /api/v1/analytics/payments
 * @desc Get payment analytics data with various filters
 * @access Private (Admin)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // In a production app, check admin role
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized: Admin access required'
    //   });
    // }
    
    // Parse query parameters with defaults
    const timeframe = req.query.timeframe || 'weekly';
    const gateway = req.query.gateway || 'all';
    
    // Parse date range if provided
    let startDate, endDate;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate);
    }
    
    // Fetch analytics data from the service
    const analyticsData = await mongoPaymentAnalyticsService.getPaymentAnalytics({
      timeframe,
      gateway,
      startDate,
      endDate
    });
    
    return res.status(analyticsData.success ? 200 : 400).json(analyticsData);
  } catch (error) {
    console.error('Payment analytics error:', error);
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
router.get('/report', authenticate, async (req, res) => {
  try {
    // In a production app, check admin role
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized: Admin access required'
    //   });
    // }
    
    // Parse query parameters with defaults
    const timeframe = req.query.timeframe || 'weekly';
    const gateway = req.query.gateway || 'all';
    
    // Parse date range (required for reports)
    let startDate = new Date();
    let endDate = new Date();
    
    if (timeframe === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (timeframe === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Override with provided dates if available
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate);
    }
    
    // Generate the report
    try {
      const reportPath = await mongoPaymentAnalyticsService.generateAnalyticsReport({
        timeframe,
        gateway,
        startDate,
        endDate
      });
      
      return res.status(200).json({
        success: true,
        data: {
          reportPath,
          timeframe,
          gateway,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        message: 'Report generated successfully'
      });
    } catch (reportError) {
      console.error('Error generating report:', reportError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate analytics report',
        error: reportError.message
      });
    }
  } catch (error) {
    console.error('Payment analytics report error:', error);
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
router.get('/summary', authenticate, async (req, res) => {
  try {
    // In a production app, check admin role
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized: Admin access required'
    //   });
    // }
    
    // Parse query parameters
    const period = req.query.period || 'daily';
    
    // Parse date range
    let startDate = new Date();
    let endDate = new Date();
    
    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Override with provided dates if available
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate);
    }
    
    // Use a MongoDB aggregation directly for better performance
    // This is used for simple dashboard KPIs
    try {
      const result = await mongoPaymentAnalyticsService.getSummaryMetrics({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      return res.status(200).json({
        success: true,
        data: result,
        period
      });
    } catch (dbError) {
      console.error('Error fetching summary metrics:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch summary metrics',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Payment analytics summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment analytics summary',
      error: error.message
    });
  }
});

module.exports = router;
