/**
 * Auth Routes
 * Defines API endpoints for authentication
 */
const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Debug logs to troubleshoot undefined controller methods
console.log('AuthController loaded:', authController);
console.log('Toggle Two Factor method:', authController.toggleTwoFactor);

const router = express.Router();

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/v1/auth/login
 * @desc Log in a user
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/v1/auth/request-otp
 * @desc Request an OTP for authentication, verification, or password reset
 * @access Public
 */
router.post('/request-otp', authController.requestOTP);

/**
 * @route POST /api/v1/auth/reset-password-request
 * @desc Request a password reset
 * @access Public
 */
router.post('/reset-password-request', authController.resetPasswordRequest);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password with OTP
 * @access Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route POST /api/v1/auth/refresh-token
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route POST /api/v1/auth/two-factor
 * @desc Enable/disable two-factor authentication
 * @access Private
 */
router.post('/two-factor', authenticate, authController.toggleTwoFactor);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me', authenticate, (req, res) => {
  return res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

module.exports = router;
