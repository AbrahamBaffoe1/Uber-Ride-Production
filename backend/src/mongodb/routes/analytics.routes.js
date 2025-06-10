/**
 * Analytics Routes
 * Centralizes all analytics endpoints under one router
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasAnyRole } from '../middlewares/role.middleware.js';
import { log } from '../../services/logging.service.js';

// Import analytics-related route files
import otpAnalyticsRoutes from './otp-analytics.routes.js';
import paymentAnalyticsRoutes from './payment-analytics.routes.js';
import reconciliationRoutes from './reconciliation.routes.js';

const router = express.Router();

// OTP analytics routes
router.use('/otp', otpAnalyticsRoutes);

// Payment analytics routes
router.use('/payments', paymentAnalyticsRoutes);

// Reconciliation routes 
router.use('/reconciliation', reconciliationRoutes);

// Generic analytics endpoints using actual services
router.get('/performance-metrics', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Import dynamically to avoid circular dependencies
    const { getPerformanceMetrics } = await import('../../services/analytics.service.js');
    
    const metricsData = await getPerformanceMetrics(period);
    
    return res.status(200).json({
      success: true,
      data: metricsData
    });
  } catch (error) {
    log('system', 'error', 'Performance metrics error:', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics',
      error: error.message
    });
  }
});

router.get('/revenue-trend', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    // Import dynamically to avoid circular dependencies
    const { getRevenueTrend } = await import('../../services/analytics.service.js');
    
    const trendData = await getRevenueTrend({
      period,
      startDate,
      endDate
    });
    
    return res.status(200).json({
      success: true,
      data: trendData
    });
  } catch (error) {
    log('system', 'error', 'Revenue trend error:', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get revenue trend data',
      error: error.message
    });
  }
});

router.get('/rides-completed', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    // Import dynamically to avoid circular dependencies
    const { getRidesCompletedTrend } = await import('../../services/analytics.service.js');
    
    const ridesData = await getRidesCompletedTrend({
      period,
      startDate,
      endDate
    });
    
    return res.status(200).json({
      success: true,
      data: ridesData
    });
  } catch (error) {
    log('system', 'error', 'Rides completed trend error:', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get rides completed trend data',
      error: error.message
    });
  }
});

router.get('/user-acquisition', authenticate, hasAnyRole(['admin']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Import dynamically to avoid circular dependencies
    const { getUserAcquisitionData } = await import('../../services/analytics.service.js');
    
    const acquisitionData = await getUserAcquisitionData(period);
    
    return res.status(200).json({
      success: true,
      data: acquisitionData
    });
  } catch (error) {
    log('system', 'error', 'User acquisition error:', { error });
    return res.status(500).json({
      success: false,
      message: 'Failed to get user acquisition data',
      error: error.message
    });
  }
});

export default router;
