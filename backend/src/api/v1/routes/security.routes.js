const express = require('express');
const securityController = require('../controllers/security.controller');
const { enhancedAuthenticate, requireMFA, checkRiskScore } = require('../middlewares/enhanced-auth.middleware');

const router = express.Router();

/**
 * @route GET /api/v1/security/status
 * @desc Get user's security status
 * @access Private
 */
router.get('/status', enhancedAuthenticate, securityController.getSecurityStatus);

/**
 * @route GET /api/v1/security/events
 * @desc Get security event history
 * @access Private
 */
router.get('/events', enhancedAuthenticate, securityController.getSecurityEvents);

/**
 * @route POST /api/v1/security/mfa/totp/setup
 * @desc Setup TOTP MFA
 * @access Private
 */
router.post('/mfa/totp/setup', enhancedAuthenticate, securityController.setupTOTP);

/**
 * @route POST /api/v1/security/mfa/totp/verify
 * @desc Verify TOTP setup
 * @access Private
 */
router.post('/mfa/totp/verify', enhancedAuthenticate, securityController.verifyTOTP);

/**
 * @route POST /api/v1/security/mfa/sms/generate
 * @desc Generate SMS OTP
 * @access Private
 */
router.post('/mfa/sms/generate', enhancedAuthenticate, securityController.generateSMSOTP);

/**
 * @route POST /api/v1/security/mfa/email/generate
 * @desc Generate email verification code
 * @access Private
 */
router.post('/mfa/email/generate', enhancedAuthenticate, securityController.generateEmailVerification);

/**
 * @route POST /api/v1/security/mfa/verify
 * @desc Verify MFA code
 * @access Private
 */
router.post('/mfa/verify', enhancedAuthenticate, securityController.verifyOTP);

/**
 * @route DELETE /api/v1/security/mfa
 * @desc Disable MFA
 * @access Private + MFA Required
 * Note: Removing MFA requires an additional MFA verification for security
 */
router.delete('/mfa', enhancedAuthenticate, requireMFA, checkRiskScore(20), securityController.disableMFA);

module.exports = router;
