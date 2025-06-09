/**
 * MongoDB Auth Routes
 * Defines API endpoints for authentication using MongoDB
 */
import express from 'express';
// Import both controllers but prefer direct MongoDB implementation
import * as originalAuthController from '../controllers/auth.controller.js';
import * as directAuthController from '../controllers/direct-auth.controller.js';
// Use direct auth middleware to prevent timeouts
import { authenticate } from '../middlewares/direct-auth.middleware.js';

// Use direct MongoDB controller for key operations that are having timeout issues
const authController = {
  // Use direct implementation for operations with timeout issues
  register: directAuthController.register,
  login: directAuthController.login,
  getCurrentUser: directAuthController.getCurrentUser,
  logout: directAuthController.logout,
  
  // Use direct implementation for OTP operations to ensure verification works
  requestOTP: directAuthController.requestOTP,
  requestPublicOTP: directAuthController.requestPublicOTP,
  verifyUser: directAuthController.verifyUser,
  
  // Use original implementation for remaining operations
  resetPasswordRequest: originalAuthController.resetPasswordRequest,
  resetPassword: originalAuthController.resetPassword,
  refreshToken: originalAuthController.refreshToken
};

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phoneNumber
 *               - password
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               role:
 *                 type: string
 *                 enum: [rider, passenger, admin]
 *                 description: User's role
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: User already exists
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - password
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh token
 *                 user:
 *                   type: object
 *                   description: User information
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/request-otp:
 *   post:
 *     summary: Request an OTP for authentication, verification, or password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *               purpose:
 *                 type: string
 *                 enum: [verification, password-reset, login]
 *                 description: Purpose of OTP
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number
 */
router.post('/request-otp', authController.requestOTP);

/**
 * @swagger
 * /auth/reset-password-request:
 *   post:
 *     summary: Request a password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *     responses:
 *       200:
 *         description: Password reset request initiated
 *       404:
 *         description: User not found
 */
router.post('/reset-password-request', authController.resetPasswordRequest);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *               - newPassword
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *               otp:
 *                 type: string
 *                 description: One-time password received
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP
 *       404:
 *         description: User not found
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify user using OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *               otp:
 *                 type: string
 *                 description: One-time password received
 *     responses:
 *       200:
 *         description: User verified successfully
 *       400:
 *         description: Invalid OTP
 *       404:
 *         description: User not found
 */
router.post('/verify', authController.verifyUser);

/**
 * @swagger
 * /auth/public/request-otp:
 *   post:
 *     summary: Request an OTP for public (unauthenticated) users
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: User's phone number
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number
 */
router.post('/public/request-otp', authController.requestPublicOTP);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token received during login
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: New JWT token
 *                 refreshToken:
 *                   type: string
 *                   description: New refresh token
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: User ID
 *                 email:
 *                   type: string
 *                   description: User's email
 *                 firstName:
 *                   type: string
 *                   description: User's first name
 *                 lastName:
 *                   type: string
 *                   description: User's last name
 *                 phoneNumber:
 *                   type: string
 *                   description: User's phone number
 *                 role:
 *                   type: string
 *                   description: User's role
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

// Make sure the router is properly exported and can be used as middleware
export default router;
