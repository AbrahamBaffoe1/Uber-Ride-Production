/**
 * OTP Analytics Routes
 * Defines API endpoints for OTP analytics
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasAnyRole } from '../middlewares/role.middleware.js';
import * as otpAnalyticsService from '../../services/otp-analytics.service.js';
import { log } from '../../services/logging.service.js';

const router = express.Router();

/**
 * @route GET /api/v1/analytics/otp
 * @desc Get OTP analytics data with various filters
 * @access Private (Admin)
 */
router.get('/', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { timeframe = 'week', startDate, endDate } = req.query;
    
    // Fetch analytics data from the service
    const analyticsData = await otpAnalyticsService.getOtpAnalytics({
      timeframe,
      startDate,
      endDate
    });
    
    return res.status(analyticsData.success ? 200 : 400).json(analyticsData);
  } catch (error) {
    log('otp', 'error', 'OTP analytics error', { error: error.message });
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
 * @access Private (Admin)
 */
router.get('/report', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { timeframe = 'month', format = 'json', startDate, endDate } = req.query;
    
    // Generate a detailed report using the analytics service
    const reportData = await otpAnalyticsService.generateOtpReport({
      timeframe,
      format,
      startDate,
      endDate
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
    }
    
    // Default to JSON response
    return res.status(200).json(reportData);
  } catch (error) {
    log('otp', 'error', 'OTP analytics report error', { error: error.message });
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
 * @access Private (Admin)
 */
router.get('/summary', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Get summary metrics using the analytics service
    const summaryData = await otpAnalyticsService.getOtpSummaryMetrics(period);
    
    return res.status(summaryData.success ? 200 : 400).json(summaryData);
  } catch (error) {
    log('otp', 'error', 'OTP analytics summary error', { error: error.message });
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
 * @access Private (Admin)
 */
router.get('/delivery-methods', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    
    const deliveryMethodsData = await otpAnalyticsService.getOtpDeliveryMethods({
      period,
      startDate,
      endDate
    });
    
    return res.status(deliveryMethodsData.success ? 200 : 400).json(deliveryMethodsData);
  } catch (error) {
    log('otp', 'error', 'OTP delivery methods analytics error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get OTP delivery methods data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/analytics/otp/user-segments
 * @desc Get OTP distribution by user segment
 * @access Private (Admin)
 */
router.get('/user-segments', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;
    
    const userSegmentsData = await otpAnalyticsService.getOtpUserSegments({
      period,
      startDate,
      endDate
    });
    
    return res.status(userSegmentsData.success ? 200 : 400).json(userSegmentsData);
  } catch (error) {
    log('otp', 'error', 'OTP user segments analytics error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Failed to get OTP user segments data',
      error: error.message
    });
  }
});


export default router;
