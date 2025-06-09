/**
 * Admin Controller
 * Handles administrative operations for the application
 * Uses specialized admin services for business logic
 */
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import * as adminAuthService from '../services/admin-auth.service.js';
import * as adminUserService from '../services/admin-user.service.js';

/**
 * Login admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }
    
    // Authenticate using the admin auth service
    const authData = await adminAuthService.loginAdmin(email, password);
    
    // Return success response with auth data
    return res.status(200).json({
      success: true,
      data: authData,
      message: 'Admin login successful'
    });
  } catch (error) {
    console.error('Error in loginAdmin:', error);
    
    // Return appropriate error response based on the error
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        status: 'error',
        message: error.message
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Admin login failed',
      error: error.message
    });
  }
};

/**
 * Logout admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const logoutAdmin = async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required for logout'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Invalidate token using the admin auth service
    await adminAuthService.logoutAdmin(token);
    
    return res.status(200).json({
      success: true,
      message: 'Admin logout successful'
    });
  } catch (error) {
    console.error('Error in logoutAdmin:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Admin logout failed',
      error: error.message
    });
  }
};

/**
 * Get current admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getCurrentAdmin = async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    // Get admin user data from the service
    const adminData = await adminAuthService.getCurrentAdmin(userId);
    
    return res.status(200).json({
      success: true,
      data: adminData,
      message: 'Admin user retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getCurrentAdmin:', error);
    
    if (error.message.includes('Unauthorized')) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get admin user',
      error: error.message
    });
  }
};

/**
 * Toggle user verification status (email and/or phone)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const toggleVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { verifyEmail, verifyPhone } = req.body;

    // Use service to toggle verification
    const userData = await adminUserService.toggleUserVerification(userId, {
      verifyEmail,
      verifyPhone
    });

    return res.status(200).json({
      status: 'success',
      message: 'User verification status updated successfully',
      data: { user: userData }
    });
  } catch (error) {
    console.error('Error in toggleVerification:', error);
    
    if (error.message === 'Invalid user ID format') {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user verification status',
      error: error.message
    });
  }
};

/**
 * Get all users with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAllUsers = async (req, res) => {
  try {
    // Pass query parameters to service
    const result = await adminUserService.getAllUsers({
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      search: req.query.search,
      role: req.query.role,
      isActive: req.query.isActive
    });
    
    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Create a new admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const createAdminUser = async (req, res) => {
  try {
    // Create admin user via service
    const adminData = await adminUserService.createAdminUser(req.body);
    
    // Generate auth tokens for the new admin
    const token = jwt.sign(
      { id: adminData.id, role: adminData.role },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    const refreshToken = jwt.sign(
      { id: adminData.id, role: adminData.role },
      process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
    
    return res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        user: adminData,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Error in createAdminUser:', error);
    
    if (error.message.includes('required') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
};


export {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  toggleVerification,
  getAllUsers,
  createAdminUser
};
