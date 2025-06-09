const express = require('express');
const { 
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  processRidePayment,
  getPaymentHistory,
  initiateMobileMoneyPayment,
  processPaymentCallback,
  getWalletBalance,
  topUpWallet,
  getMobilePaymentHistory,
  // New controller methods for enhanced payment functionality
  getPaymentProviders,
  initiatePaymentWithProvider,
  verifyPaymentWithProvider,
  getPaymentAnalytics,
  generatePaymentReport,
  runPaymentReconciliation,
  getReconciliationStatus,
  getReconciliationReport,
  processRefund
} = require('../controllers/payment.controller');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');
const { checkRiskScore } = require('../middlewares/enhanced-auth.middleware');

const router = express.Router();

// Public routes (webhooks, callbacks)
// Payment provider callback endpoint
router.post('/callback/:provider', processPaymentCallback);

// All other payment routes require authentication
router.use(authenticate);

// ------ Basic Payment Methods & Processing ------

// Get all payment methods
router.get('/methods', getPaymentMethods);

// Add a new payment method
router.post('/methods', addPaymentMethod);

// Set default payment method
router.put('/methods/default', setDefaultPaymentMethod);

// Process payment for a ride
router.post('/process', processRidePayment);

// Get payment history
router.get('/history', getPaymentHistory);

// Mobile money endpoints
router.post('/mobile-money', initiateMobileMoneyPayment);
router.get('/mobile/history', getMobilePaymentHistory);

// Wallet endpoints
router.get('/wallet/balance', getWalletBalance);
router.post('/wallet/topup', topUpWallet);

// ------ Enhanced Payment Functionality ------

// Get available payment providers
router.get('/providers', getPaymentProviders);

// Provider-specific endpoints
router.post('/providers/:provider/initiate', initiatePaymentWithProvider);
router.get('/providers/:provider/verify/:reference', verifyPaymentWithProvider);

// Refund endpoint - requires higher risk-score check
router.post('/refund', checkRiskScore(20), processRefund);

// ------ Analytics & Reporting (Admin Only) ------

// Get payment analytics
router.get('/analytics', hasRole(['admin']), getPaymentAnalytics);

// Generate payment report
router.post('/reports/generate', hasRole(['admin']), generatePaymentReport);

// ------ Reconciliation (Super Admin Only) ------

// Run reconciliation job
router.post('/reconciliation/run', hasRole(['superadmin']), runPaymentReconciliation);

// Get reconciliation status
router.get('/reconciliation/status', hasRole(['superadmin']), getReconciliationStatus);

// Get reconciliation report
router.get('/reconciliation/reports/:id', hasRole(['superadmin']), getReconciliationReport);

module.exports = router;
