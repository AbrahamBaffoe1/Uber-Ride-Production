const express = require('express');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');

// Helper middleware to check for admin role
const isAdmin = hasRole(['admin']);
const { 
  handleSmsWebhook, 
  handleUssdWebhook, 
  sendSms, 
  handlePaymentCallback,
  getSmsProviderStatus,
  cleanupUssdSessions
} = require('../controllers/sms.controller');

const router = express.Router();

// Public webhook endpoints (no authentication required)
// These endpoints receive incoming SMS and USSD requests from SMS providers
router.post('/webhook/:provider', handleSmsWebhook);
router.post('/ussd/webhook/:provider', handleUssdWebhook);
router.post('/payment/callback/:provider', handlePaymentCallback);

// Protected endpoints (authentication required)
// These endpoints are used by authenticated clients
router.use(authenticate);

// Admin-only endpoints
router.post('/send', isAdmin, sendSms);
router.get('/status', isAdmin, getSmsProviderStatus);
router.post('/ussd/cleanup', isAdmin, cleanupUssdSessions);

module.exports = router;
