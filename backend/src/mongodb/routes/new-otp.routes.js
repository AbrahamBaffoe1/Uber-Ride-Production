/**
 * New OTP Routes
 * Defines API endpoints for OTP generation, verification, and management using MongoDB
 */
import express from 'express';
import * as otpController from '../controllers/new-otp.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/mongo/otp/request
 * @desc Generate and send an OTP via email
 * @access Public (for verification during login)
 */
router.post('/request', otpController.requestOTP);

/**
 * @route POST /api/v1/mongo/otp/send
 * @desc Generate and send an OTP via email (backward compatibility)
 * @access Public (for verification during login)
 */
router.post('/send', otpController.requestOTP);

/**
 * @route POST /api/v1/mongo/otp/verify
 * @desc Verify an OTP
 * @access Public (needs to be public for pre-login verification)
 */
router.post('/verify', otpController.verifyOTP);

/**
 * @route POST /api/v1/mongo/otp/resend
 * @desc Resend an OTP
 * @access Public (for verification during login)
 */
router.post('/resend', otpController.resendOTP);

/**
 * @route POST /api/v1/mongo/otp/password-reset-request
 * @desc Request an OTP for password reset
 * @access Public
 */
router.post('/password-reset-request', otpController.passwordResetRequest);

/**
 * @route POST /api/v1/mongo/otp/verify-password-reset
 * @desc Verify an OTP for password reset
 * @access Public
 */
router.post('/verify-password-reset', otpController.verifyPasswordResetOTP);

/**
 * @route POST /api/v1/mongo/otp/reset-password
 * @desc Reset password after OTP verification
 * @access Public
 */
router.post('/reset-password', otpController.resetPassword);

/**
 * @route POST /api/v1/mongo/otp/login-verification
 * @desc Send OTP for login verification
 * @access Public
 */
router.post('/login-verification', otpController.loginVerification);

/**
 * @route POST /api/v1/mongo/otp/verify-login
 * @desc Verify OTP for login
 * @access Public
 */
router.post('/verify-login', otpController.verifyLoginOTP);

export default router;
