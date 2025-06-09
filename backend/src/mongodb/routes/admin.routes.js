/**
 * Admin Routes
 * These routes are for admin-only functionality
 */
import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { hasAnyRole } from '../middlewares/role.middleware.js';

const router = express.Router();

/**
 * @route POST /api/v1/admin/login
 * @desc Login admin user
 * @access Public
 */
router.post('/login', adminController.loginAdmin);

/**
 * @route POST /api/v1/admin/logout
 * @desc Logout admin user
 * @access Private
 */
router.post('/logout', authenticate, adminController.logoutAdmin);

/**
 * @route GET /api/v1/admin/me
 * @desc Get current admin user
 * @access Private
 */
router.get('/me', authenticate, hasAnyRole(['admin']), adminController.getCurrentAdmin);

/**
 * @route PUT /api/v1/admin/toggle-verification/:userId
 * @desc Toggle user verification status
 * @access Admin
 */
router.put('/toggle-verification/:userId', authenticate, hasAnyRole(['admin']), adminController.toggleVerification);

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users with pagination, filtering and sorting
 * @access Admin
 */
router.get('/users', authenticate, hasAnyRole(['admin']), adminController.getAllUsers);

/**
 * @route POST /api/v1/admin/users
 * @desc Create a new user (admin only)
 * @access Admin
 */
router.post('/users', authenticate, hasAnyRole(['admin']), adminController.createAdminUser);

export default router;
