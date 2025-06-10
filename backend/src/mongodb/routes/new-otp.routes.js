/**
 * OTP Routes
 * Routes for OTP generation, verification, and management
 */
import { Router } from 'express';
import { 
  sendOTP, 
  resendOTP, 
  verifyOTPCode, 
  getOTPStatus,
  requestPublicOTP,
  verifyPublicOTP
} from '../controllers/new-otp.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';

const router = Router();

/**
 * @route POST /api/v1/mongo/otp/send
 * @desc Send an OTP to a user
 * @access Private - Authenticated users only
 */
router.post('/send', authenticate, rateLimiter({ windowMs: 60000, max: 5 }), sendOTP);

/**
 * @route POST /api/v1/mongo/otp/resend
 * @desc Resend an OTP to a user
 * @access Private - Authenticated users only
 */
router.post('/resend', authenticate, rateLimiter({ windowMs: 60000, max: 3 }), resendOTP);

/**
 * @route POST /api/v1/mongo/otp/verify
 * @desc Verify an OTP
 * @access Private - Authenticated users only
 */
router.post('/verify', authenticate, verifyOTPCode);

/**
 * @route GET /api/v1/mongo/otp/status/:userId/:type
 * @desc Get OTP status for a user and type
 * @access Private - Authenticated users only
 */
router.get('/status/:userId/:type', authenticate, getOTPStatus);

/**
 * @route POST /api/v1/mongo/otp/public/request
 * @desc Request an OTP for a public user (without authentication)
 * @access Public
 */
router.post('/public/request', rateLimiter({ windowMs: 60000, max: 3 }), requestPublicOTP);

/**
 * @route POST /api/v1/mongo/otp/public/verify
 * @desc Verify an OTP for a public user
 * @access Public
 */
router.post('/public/verify', verifyPublicOTP);

export default router;
