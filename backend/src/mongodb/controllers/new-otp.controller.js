/**
 * New OTP Controller
 * Handles OTP-related API endpoints with improved functionality
 */
import * as otpAuthService from '../services/otp-auth.service.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { getRiderDb } from '../../utils/mongo-client.js';

/**
 * Request OTP generation and send via email
 * @route POST /api/v1/mongo/otp/request
 */
export const requestOTP = async (req, res) => {
  try {
    console.log("OTP request received:", req.body);
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'UserId and email are required' 
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user exists - use direct MongoDB connection to avoid Mongoose timeout
    let user;
    try {
      const db = await getRiderDb();
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found in rider database'
        });
      }
    } catch (dbError) {
      console.error('Error accessing MongoDB directly:', dbError);
      // Continue anyway to test email sending
      console.log('Continuing with OTP generation despite DB error');
    }

    // Request OTP generation and sending
    const result = await otpAuthService.requestOTP(userId, email);
    console.log('OTP generation result:', result);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error in OTP request:', error);
    
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to generate and send OTP'
    });
  }
};

/**
 * Verify OTP submitted by user
 * @route POST /api/v1/mongo/otp/verify
 */
export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp: submittedOTP } = req.body;

    if (!userId || !submittedOTP) {
      return res.status(400).json({
        success: false,
        message: 'UserId and OTP are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Verify OTP
    const result = await otpAuthService.verifyOTP(userId, submittedOTP);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token: result.token,
        user: result.user
      }
    });
  } catch (error) {
    console.error('Error in OTP verification:', error);
    
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Failed to verify OTP'
    });
  }
};

/**
 * Resend OTP functionality
 * @route POST /api/v1/mongo/otp/resend
 */
export const resendOTP = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'UserId and email are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Resend OTP
    const result = await otpAuthService.resendOTP(userId, email);

    return res.status(200).json({
      success: true,
      message: 'New OTP sent successfully to your email',
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error in OTP resend:', error);
    
    // Special handling for rate limiting
    if (error.message && error.message.includes('Please wait')) {
      return res.status(429).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to resend OTP'
    });
  }
};

/**
 * Request password reset OTP
 * @route POST /api/v1/mongo/otp/password-reset-request
 */
export const passwordResetRequest = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send password reset OTP
    const result = await otpAuthService.sendPasswordResetOTP(user._id, email);

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP sent successfully to your email',
      data: {
        userId: user._id,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error in password reset request:', error);
    
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to send password reset OTP'
    });
  }
};

/**
 * Verify password reset OTP
 * @route POST /api/v1/mongo/otp/verify-password-reset
 */
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'UserId and OTP are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Verify password reset OTP
    const result = await otpAuthService.verifyPasswordResetOTP(userId, otp);

    return res.status(200).json({
      success: true,
      message: 'Password reset OTP verified successfully',
      data: {
        userId: result.userId
      }
    });
  } catch (error) {
    console.error('Error in password reset OTP verification:', error);
    
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Failed to verify password reset OTP'
    });
  }
};

/**
 * Reset password after OTP verification
 * @route POST /api/v1/mongo/otp/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!userId || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'UserId, OTP, and new password are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // First verify the OTP
    await otpAuthService.verifyPasswordResetOTP(userId, otp);

    // Then reset the password
    await otpAuthService.resetPassword(userId, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Error in password reset:', error);
    
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to reset password'
    });
  }
};

/**
 * Send OTP for login verification
 * @route POST /api/v1/mongo/otp/login-verification
 */
export const loginVerification = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'UserId and email are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Request OTP generation and sending
    const result = await otpAuthService.requestOTP(userId, email);

    return res.status(200).json({
      success: true,
      message: 'Login verification OTP sent successfully to your email',
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error in login verification OTP request:', error);
    
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to generate and send login verification OTP'
    });
  }
};

/**
 * Verify login OTP
 * @route POST /api/v1/mongo/otp/verify-login
 */
export const verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'UserId and OTP are required'
      });
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Verify OTP
    const result = await otpAuthService.verifyOTP(userId, otp);

    return res.status(200).json({
      success: true,
      message: 'Login verification successful',
      data: {
        token: result.token,
        user: result.user
      }
    });
  } catch (error) {
    console.error('Error in login OTP verification:', error);
    
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || 'Failed to verify login OTP'
    });
  }
};
