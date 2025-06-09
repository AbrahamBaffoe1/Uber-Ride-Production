const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');
const { ensureControllerMethod } = require('../../../utils/route-validator');

// Helper middleware to check for admin role
const isAdmin = hasRole(['admin']);

/**
 * Analytics Routes - These endpoints are used by the admin dashboard to get business intelligence data
 * All routes are protected with authentication middleware requiring an admin role
 */

// Get performance metrics (total revenue, rides, active users etc)
router.get('/performance-metrics', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getPerformanceMetrics'));

// Get revenue trend data
router.get('/revenue-trend', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getRevenueTrend'));

// Get rides completed data
router.get('/rides-completed', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getRidesCompleted'));

// Get payment methods distribution
router.get('/payment-methods', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getPaymentMethods'));

// Get user acquisition data
router.get('/user-acquisition', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getUserAcquisition'));

// Get document analytics
router.get('/document-analytics', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getDocumentAnalytics'));

// Get user behavior metrics
router.get('/user-behavior', authenticate, isAdmin, ensureControllerMethod(analyticsController, 'getUserBehaviorAnalytics'));

module.exports = router;
