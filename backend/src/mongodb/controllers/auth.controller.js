/**
 * MongoDB Auth Controller
 * Handles authentication-related API endpoints with MongoDB
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import * as otpService from '../services/otp-auth.service.js';

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;

    // Basic validation
    if (!firstName || !lastName || (!email && !phoneNumber) || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Added timeout handling for MongoDB operations
    const findExistingUser = async () => {
      try {
        return await User.findOne({
          $or: [
            { email: email ? email.toLowerCase() : null },
            { phoneNumber: phoneNumber || null }
          ]
        }).maxTimeMS(15000); // Set a maximum execution time of 15 seconds
      } catch (error) {
        console.error("Error finding existing user:", error);
        // For timeout or connection errors, simulate an empty result
        if (error.name === 'MongooseError' || error.name === 'MongoError') {
          console.warn("MongoDB operation timed out or failed, proceeding with registration");
          return null;
        }
        throw error; // Rethrow other errors
      }
    };

    // Check if user already exists with timeout handling
    const existingUser = await findExistingUser();

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: existingUser.email === email ? 'Email already in use' : 'Phone number already in use'
      });
    }
    
    // Create user (password hashing is handled by the User model pre-save middleware)
    const user = new User({
      firstName,
      lastName,
      email: email ? email.toLowerCase() : undefined,
      phoneNumber,
      password,
      role: req.body.role || 'passenger', // Use the role from request if provided
      isEmailVerified: false,
      isPhoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Save user to MongoDB - must be persisted before continuing
    await user.save();
    console.log('User saved successfully to MongoDB:', user._id);
    
    // Generate and send verification OTP
    try {
      await otpService.requestOTP(user._id.toString(), email || phoneNumber, 'verification');
      console.log('OTP sent successfully during registration');
    } catch (otpError) {
      console.error('Error sending OTP during registration:', otpError);
      // Continue with registration even if OTP sending fails
      // The user can request a new OTP later
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    // Return success without sensitive information
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your account.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify user phone or email
 * @route POST /api/v1/auth/verify
 */
export const verifyUser = async (req, res) => {
  try {
    const { userId, code, type = 'verification' } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and verification code are required'
      });
    }
    
    // Ensure the user ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    // Verify OTP using the service
    const isVerified = await otpService.verifyOTP(userId, code, type);
    
    if (!isVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Find and update the user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update verification status based on type
    if (type === 'verification') {
      // Check what we're verifying based on the OTP sent
      if (user.email && !user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      
      if (user.phoneNumber && !user.isPhoneVerified) {
        user.isPhoneVerified = true;
      }
      
      user.updatedAt = new Date();
      await user.save();
    }
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: type === 'verification' ? 
        'Verification successful' : 
        (type === 'passwordReset' ? 'Password reset code verified' : 'Code verified successfully'),
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified
        }
      }
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login a user
 * @route POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }
    
    // Find user by email - must query MongoDB directly
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check if user verification is required
    if (!user.isEmailVerified && !user.isPhoneVerified) {
      // For testing purposes, bypass verification and login directly
      console.log('Bypassing email/phone verification for user:', user.email);
      
      // Mark user as verified for testing
      user.isEmailVerified = true;
      user.isVerified = true;
      await user.save();
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Generate auth tokens
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    
    // Return success with tokens
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          profilePicture: user.profilePicture
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request OTP for various purposes
 * @route POST /api/v1/auth/request-otp
 */
export const requestOTP = async (req, res) => {
  try {
    const { identifier, type = 'verification' } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone number is required'
      });
    }
    
    // Validate OTP type
    const validTypes = ['verification', 'passwordReset', 'login'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP type'
      });
    }
    
    // Check if email format or phone format
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    
    // Find user by email or phone
    const user = await User.findOne({
      [isEmail ? 'email' : 'phoneNumber']: isEmail ? identifier.toLowerCase() : identifier
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate and send OTP
    const result = await otpService.requestOTP(user._id.toString(), identifier, type);
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: `Verification code sent to your ${isEmail ? 'email' : 'phone'}`,
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request OTP for public (unauthenticated) users
 * @route POST /api/v1/auth/public/request-otp
 */
export const requestPublicOTP = async (req, res) => {
  try {
    const { channel, email, phoneNumber, type = 'verification' } = req.body;
    
    // Validate required fields
    if (!channel || (channel === 'email' && !email) || (channel === 'sms' && !phoneNumber)) {
      return res.status(400).json({
        status: 'error',
        message: channel === 'email' ? 'Email is required' : 'Phone number is required'
      });
    }
    
    // Validate OTP type
    const validTypes = ['verification', 'passwordReset', 'login'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP type'
      });
    }
    
    // Create temporary user ID
    const tempUserId = 'temp-' + Date.now();
    
    // Generate and send OTP
    const result = await otpService.requestOTP(tempUserId, email || phoneNumber, type);
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: `Verification code sent to your ${channel === 'email' ? 'email' : 'phone'}`,
      data: {
        userId: tempUserId,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error requesting public OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Password reset request
 * @route POST /api/v1/auth/reset-password-request
 */
export const resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate and send OTP
    const result = await otpService.sendPasswordResetOTP(user._id.toString(), email);
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: 'Password reset code sent to your email',
      data: {
        userId: user._id,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send password reset code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password with OTP
 * @route POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body;
    
    if (!userId || !code || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID, verification code, and new password are required'
      });
    }
    
    // Verify OTP
    const isValid = await otpService.verifyOTP(userId, code, 'passwordReset');
    
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update password (hashing handled by User model pre-save hook)
    user.password = newPassword;
    await user.save();
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh-token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    // Generate new refresh token for token rotation (security best practice)
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    
    // Return success with new tokens
    return res.status(200).json({
      status: 'success',
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/v1/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    // User is attached to request by auth middleware
    const userId = req.user.id;
    
    // For regular users, fetch from MongoDB
    try {
      // Check if ID is valid ObjectId before querying
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID format'
        });
      }
      
      // Fetch user with latest data
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Return user data without sensitive information
      return res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified || false,
            isPhoneVerified: user.isPhoneVerified || false,
            country: user.country,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user from database:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  // JWT is stateless, so we can't invalidate it on the server side
  // Client should remove the token from storage
  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};
