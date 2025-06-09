/**
 * OTP Routes
 * Defines API endpoints for OTP generation, verification, and management
 */
import express from 'express';
import * as otpController from '../controllers/otp.controller.js';
import { authenticate, hasRole } from '../../../src/mongodb/middlewares/auth.middleware.js';
import { ensureControllerMethod } from '../../../utils/route-validator.js';

const router = express.Router();

/**
 * @route POST /api/v1/otp/send
 * @desc Generate and send an OTP via SMS or email
 * @access Private
 */
router.post('/send', authenticate, ensureControllerMethod(otpController, 'sendOTP'));

/**
 * @route POST /api/v1/otp/sms
 * @desc Generate and send an OTP via SMS
 * @access Private
 */
router.post('/sms', authenticate, ensureControllerMethod(otpController, 'generateSMSOTP'));

/**
 * @route POST /api/v1/otp/email
 * @desc Generate and send an OTP via email
 * @access Private
 */
router.post('/email', authenticate, ensureControllerMethod(otpController, 'generateEmailOTP'));

/**
 * @route POST /api/v1/otp/verify
 * @desc Verify an OTP
 * @access Public (needs to be public for pre-login verification)
 */
router.post('/verify', ensureControllerMethod(otpController, 'verifyOTP'));

/**
 * @route POST /api/v1/otp/public/request
 * @desc Request an OTP for public users (signup, password reset)
 * @access Public
 */
router.post('/public/request', ensureControllerMethod(otpController, 'requestPublicOTP'));

/**
 * @route POST /api/v1/otp/public/verify
 * @desc Verify an OTP for public users
 * @access Public
 */
router.post('/public/verify', ensureControllerMethod(otpController, 'verifyPublicOTP'));

/**
 * @route POST /api/v1/otp/resend
 * @desc Resend an OTP
 * @access Private
 */
router.post('/resend', authenticate, ensureControllerMethod(otpController, 'resendOTP'));

/**
 * @route GET /api/v1/otp/status/:userId/:type
 * @desc Get OTP status
 * @access Private
 */
router.get('/status/:userId/:type', authenticate, ensureControllerMethod(otpController, 'getOTPStatus'));

export default router;
