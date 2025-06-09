/**
 * OTP Controller
 * Handles API endpoints for OTP generation, verification, and management
 */
import * as otpService from '../../../services/otp.service.js';
import * as realtimeOtpService from '../../../services/realtime-otp.service.js';
import { User } from '../../../models/index.js';
import { createTokenPair, createResetToken } from '../../../services/crypto.service.js';

/**
 * Generate and send an OTP via SMS or email
 * @route POST /api/v1/otp/send
 */
export const sendOTP = async (req, res) => {
  try {
    const { userId, channel, type = 'verification', email, phoneNumber } = req.body;
    
    if (!userId || !channel) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and channel are required'
      });
    }

    // Validate channel
    if (channel !== 'sms' && channel !== 'email') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid channel. Use "sms" or "email"'
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

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP based on channel
    let result;
    if (channel === 'sms') {
      // Use provided phone number or user's phone
      const phone = phoneNumber || user.phone;
      if (!phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number is required for SMS OTP'
        });
      }
      result = await otpService.sendOTPviaSMS(userId, type, phone);
    } else {
      // Use provided email or user's email
      const emailAddress = email || user.email;
      if (!emailAddress) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required for email OTP'
        });
      }
      
      // Use the realtime OTP service for email
      try {
        console.log('Using realtime OTP service for email:', emailAddress);
        result = await realtimeOtpService.sendOTPviaEmail(userId, type, emailAddress);
      } catch (emailError) {
        console.error('Realtime OTP service failed, falling back to legacy service:', emailError);
        // Fall back to the legacy OTP service if realtime service fails
        result = await otpService.sendOTPviaEmail(userId, type, emailAddress);
      }
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: `OTP sent successfully via ${channel}`,
      data: {
        expiresAt: result.expiresAt,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * Generate and send an OTP via SMS
 * @route POST /api/v1/otp/sms
 */
export const generateSMSOTP = async (req, res) => {
  try {
    const { userId, phoneNumber, type = 'verification' } = req.body;
    
    if (!userId || !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and phone number are required'
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

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP
    const result = await otpService.sendOTPviaSMS(userId, type, phoneNumber);

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error generating SMS OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * Generate and send an OTP via email
 * @route POST /api/v1/otp/email
 */
export const generateEmailOTP = async (req, res) => {
  try {
    const { userId, email, type = 'verification' } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and email are required'
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

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP using the realtime OTP service
    let result;
    try {
      console.log('Using realtime OTP service for email:', email);
      result = await realtimeOtpService.sendOTPviaEmail(userId, type, email);
    } catch (emailError) {
      console.error('Realtime OTP service failed, falling back to legacy service:', emailError);
      // Fall back to the legacy OTP service if realtime service fails
      result = await otpService.sendOTPviaEmail(userId, type, email);
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error generating email OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * Verify an OTP
 * @route POST /api/v1/otp/verify
 */
export const verifyOTP = async (req, res) => {
  try {
    const { userId, code, type = 'verification' } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and OTP code are required'
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

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify OTP using the realtime OTP service first, then fall back to legacy service
    let isValid;
    try {
      console.log('Using realtime OTP service for verification');
      isValid = await realtimeOtpService.verifyOTP(userId, code, type);
    } catch (verifyError) {
      console.error('Realtime OTP verification failed, falling back to legacy service:', verifyError);
      // Fall back to the legacy OTP service if realtime service fails
      isValid = await otpService.verifyOTP(userId, code, type);
    }
    
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }

    // Handle post-verification action
    const result = await otpService.handlePostVerificationAction(userId, type);

    // For login type, generate auth tokens
    let tokens = null;
    if (type === 'login') {
      tokens = await createTokenPair(user.id);
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        verified: true,
        ...(tokens && { tokens }) // Include tokens if they were generated
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to verify OTP'
    });
  }
};

/**
 * Resend an OTP
 * @route POST /api/v1/otp/resend
 */
export const resendOTP = async (req, res) => {
  try {
    const { userId, method, identifier, type = 'verification' } = req.body;
    
    if (!userId || !method || !identifier) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID, method, and identifier are required'
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

    // Validate method
    const validMethods = ['sms', 'email'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid method. Use "sms" or "email"'
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Resend OTP based on method
    let result;
    if (method === 'sms') {
      result = await otpService.sendOTPviaSMS(userId, type, identifier);
    } else {
      // Use the realtime OTP service for email
      try {
        console.log('Using realtime OTP service for email resend:', identifier);
        result = await realtimeOtpService.sendOTPviaEmail(userId, type, identifier);
      } catch (emailError) {
        console.error('Realtime OTP service failed for resend, falling back to legacy service:', emailError);
        // Fall back to the legacy OTP service if realtime service fails
        result = await otpService.sendOTPviaEmail(userId, type, identifier);
      }
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully',
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to resend OTP'
    });
  }
};

/**
 * Get OTP status
 * @route GET /api/v1/otp/status/:userId/:type
 */
export const getOTPStatus = async (req, res) => {
  try {
    const { userId, type } = req.params;
    
    if (!userId || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and OTP type are required'
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

    // Find the most recent OTP for this user and type
    const otp = await otpService.getLatestOTP(userId, type);
    
    if (!otp) {
      return res.status(404).json({
        status: 'error',
        message: 'No OTP found for this user and type'
      });
    }

    // Return OTP status
    return res.status(200).json({
      status: 'success',
      data: {
        expiresAt: otp.expiresAt,
        isUsed: otp.isUsed,
        attempts: otp.attempts,
        isExpired: new Date() > new Date(otp.expiresAt)
      }
    });
  } catch (error) {
    console.error('Error getting OTP status:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to get OTP status'
    });
  }
};

/**
 * Request an OTP for public users (signup, password reset)
 * @route POST /api/v1/otp/public/request
 */
export const requestPublicOTP = async (req, res) => {
  try {
    const { channel, type = 'verification', email, phoneNumber } = req.body;
    
    if (!channel || (!email && !phoneNumber)) {
      return res.status(400).json({
        status: 'error',
        message: 'Channel and either email or phone number are required'
      });
    }

    // Validate channel
    if (channel !== 'sms' && channel !== 'email') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid channel. Use "sms" or "email"'
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

    // Find user by email or phone
    const identifier = channel === 'email' ? email : phoneNumber;
    const user = await User.findOne({
      where: channel === 'email' ? { email: identifier } : { phone: identifier }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP based on channel
    let result;
    if (channel === 'sms') {
      result = await otpService.sendOTPviaSMS(user.id, type, phoneNumber);
    } else {
      // Use the realtime OTP service for email
      try {
        console.log('Using realtime OTP service for public email request:', email);
        result = await realtimeOtpService.sendOTPviaEmail(user.id, type, email);
      } catch (emailError) {
        console.error('Realtime OTP service failed for public request, falling back to legacy service:', emailError);
        // Fall back to the legacy OTP service if realtime service fails
        result = await otpService.sendOTPviaEmail(user.id, type, email);
      }
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: `OTP sent successfully via ${channel}`,
      data: {
        userId: user.id,
        expiresAt: result.expiresAt,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Error requesting public OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * Verify an OTP for public users
 * @route POST /api/v1/otp/public/verify
 */
export const verifyPublicOTP = async (req, res) => {
  try {
    const { userId, code, type = 'verification' } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and OTP code are required'
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

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify OTP using the realtime OTP service first, then fall back to legacy service
    let isValid;
    try {
      console.log('Using realtime OTP service for public verification');
      isValid = await realtimeOtpService.verifyOTP(userId, code, type);
    } catch (verifyError) {
      console.error('Realtime OTP verification failed for public verify, falling back to legacy service:', verifyError);
      // Fall back to the legacy OTP service if realtime service fails
      isValid = await otpService.verifyOTP(userId, code, type);
    }
    
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }

    // Handle post-verification action
    const result = await otpService.handlePostVerificationAction(userId, type);

    // For password reset, generate a reset token
    let resetToken = null;
    if (type === 'passwordReset') {
      // Generate a reset token (this would be a function in your crypto service)
      resetToken = await createResetToken(userId);
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        verified: true,
        ...(resetToken && { resetToken })
      }
    });
  } catch (error) {
    console.error('Error verifying public OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to verify OTP'
    });
  }
};
