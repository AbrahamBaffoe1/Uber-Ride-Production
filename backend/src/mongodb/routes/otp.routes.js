/**
 * MongoDB OTP Routes
 * Defines API endpoints for OTP generation, verification, and management
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as otpController from '../controllers/otp.controller.js';

const router = express.Router();

// Private OTP Endpoints
router.post('/send', authenticate, otpController.sendOTP);
router.post('/sms', authenticate, otpController.generateSMSOTP);
router.post('/email', authenticate, otpController.generateEmailOTP);
router.post('/resend', authenticate, otpController.resendOTP);
router.get('/status/:userId/:type', authenticate, otpController.getOTPStatus);

// Public OTP Endpoints 
router.post('/verify', otpController.verifyOTP);
router.post('/public/request', otpController.requestPublicOTP);
router.post('/public/verify', otpController.verifyPublicOTP);

export default router;
