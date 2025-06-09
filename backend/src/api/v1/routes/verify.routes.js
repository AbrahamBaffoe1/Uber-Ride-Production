/**
 * Verify Routes
 * Defines API endpoints for Twilio Verify API integration
 */
const express = require('express');
const verifyController = require('../controllers/verify.controller');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');
const { ensureControllerMethod } = require('../../../utils/route-validator');

const router = express.Router();

/**
 * @route POST /api/v1/verify/send
 * @desc Send a verification code via Twilio Verify
 * @access Public
 */
router.post('/send', ensureControllerMethod(verifyController, 'sendVerification'));

/**
 * @route POST /api/v1/verify/check
 * @desc Check a verification code
 * @access Public
 */
router.post('/check', ensureControllerMethod(verifyController, 'checkVerification'));

/**
 * @route POST /api/v1/verify/register
 * @desc Register and verify a new user in one step
 * @access Public
 */
router.post('/register', ensureControllerMethod(verifyController, 'registerAndVerify'));

/**
 * @route POST /api/v1/verify/login
 * @desc Login with phone verification
 * @access Public
 */
router.post('/login', ensureControllerMethod(verifyController, 'loginWithVerification'));

module.exports = router;
