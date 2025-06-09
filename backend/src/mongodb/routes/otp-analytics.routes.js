/**
 * OTP Analytics Routes
 * Defines API endpoints for OTP analytics using the MongoDB OTP analytics service
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { otpAnalyticsService } = require('../services/otp-analytics.service');
const router = express.Router();

/**
 * @route GET /api/v1/analytics/otp
 * @desc Get OTP analytics data with various filters
 * @access Public (for development only)
 */
router.get('/', async (req, res) => {
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
    const type = req.query.type || 'all';
    
    // Parse date range if provided
    let startDate, endDate;
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate);
    }
    
    // Fetch analytics data from the service
    const analyticsData = await otpAnalyticsService.getOtpAnalytics({
      timeframe,
      type,
      startDate,
      endDate
    });
    
    return res.status(analyticsData.success ? 200 : 400).json(analyticsData);
  } catch (error) {
    console.error('OTP analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get OTP analytics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/otp/report
 * @desc Generate an OTP analytics report
 * @access Public (for development only)
 */
router.get('/report', async (req, res) => {
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
    const type = req.query.type || 'all';
    
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
      const reportPath = await otpAnalyticsService.generateAnalyticsReport({
        timeframe,
        type,
        startDate,
        endDate
      });
      
      return res.status(200).json({
        success: true,
        data: {
          reportPath,
          timeframe,
          type,
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
    console.error('OTP analytics report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate OTP analytics report',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/otp/summary
 * @desc Get summary metrics for a period (for quick dashboard stats)
 * @access Public (for development only)
 */
router.get('/summary', async (req, res) => {
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
    
    // Get summary metrics using the analytics service
    try {
      const result = await otpAnalyticsService.getSummaryMetrics({
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
    console.error('OTP analytics summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get OTP analytics summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/otp/delivery-methods
 * @desc Get OTP distribution by delivery method
 * @access Public (for development only)
 */
router.get('/delivery-methods', async (req, res) => {
  try {
    // Parse date range
    let startDate = new Date();
    let endDate = new Date();
    
    const period = req.query.period || 'weekly';
    
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
    
    // Get delivery method statistics
    try {
      const deliveryData = await otpAnalyticsService.getOtpByDeliveryMethod({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      return res.status(200).json({
        success: true,
        data: deliveryData,
        period
      });
    } catch (dbError) {
      console.error('Error fetching delivery method data:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch delivery method data',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('OTP delivery method error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get OTP delivery method data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/otp/user-segments
 * @desc Get OTP distribution by user segment
 * @access Public (for development only)
 */
router.get('/user-segments', async (req, res) => {
  try {
    // Parse date range
    let startDate = new Date();
    let endDate = new Date();
    
    const period = req.query.period || 'weekly';
    
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
    
    // Get user segment data
    try {
      const segmentData = await otpAnalyticsService.getUserSegmentDistribution({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      return res.status(200).json({
        success: true,
        data: segmentData,
        period
      });
    } catch (dbError) {
      console.error('Error fetching user segment data:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user segment data',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('OTP user segment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get OTP user segment data',
      error: error.message
    });
  }
});

module.exports = router;
