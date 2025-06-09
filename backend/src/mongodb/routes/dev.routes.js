/**
 * MongoDB Development Routes
 * Defines endpoints for development and testing purposes
 * These routes should be disabled in production
 */
const express = require('express');
const User = require('../models/User');
const { generateToken } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route POST /api/v1/mongo/dev/create-test-user
 * @desc Create a test user for development
 * @access Only available in development mode
 */
router.post('/create-test-user', async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      status: 'error',
      message: 'This endpoint is only available in development mode',
      code: 403
    });
  }

  try {
    const { email, password, role = 'passenger' } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
        code: 400
      });
    }
    
    // Check if a user with this email already exists
    let user = await User.findOne({ email: email.toLowerCase() });
    let message = 'User created successfully';
    
    if (user) {
      message = 'User already exists, returning existing user';
    } else {
      // Create a new test user
      user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: email.toLowerCase(),
        password,
        role,
        isEmailVerified: true,
        isPhoneVerified: true,
        accountStatus: 'active'
      });
      
      await user.save();
    }
    
    // Generate token for the user
    const token = generateToken(user);
    
    // Return user info and token
    return res.status(201).json({
      status: 'success',
      message,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create test user',
      code: 500
    });
  }
});

/**
 * @route GET /api/v1/mongo/dev/users
 * @desc Get all users for testing
 * @access Only available in development mode
 */
router.get('/users', async (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      status: 'error',
      message: 'This endpoint is only available in development mode',
      code: 403
    });
  }
  
  try {
    const users = await User.find().select('-password');
    
    return res.status(200).json({
      status: 'success',
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get users',
      code: 500
    });
  }
});

/**
 * @route GET /api/v1/mongo/dev/health-check
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health-check', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Development API is running',
    timestamp: new Date()
  });
});

module.exports = router;
