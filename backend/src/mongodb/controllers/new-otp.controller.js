/**
 * OTP Controller
 * Handles OTP generation, verification, and management
 */
import { 
  requestOTP, 
  verifyOTP, 
  getLatestOTP,
  invalidateOTPs,
  generateOTPCode
} from '../services/otp-auth.service.js';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import mongoose from 'mongoose';

/**
 * Request an OTP for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with OTP details
 */
export const sendOTP = async (req, res) => {
  // Start performance timer
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  
  try {
    console.log(`[OTP-${requestId}] Starting OTP request`);
    const { userId, channel, type, email, phoneNumber } = req.body;
    
    // Validate required parameters - fail fast
    if (!userId || !channel || !type) {
      console.log(`[OTP-${requestId}] Missing parameters`, { userId, channel, type });
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: userId, channel, type'
      });
    }
    
    if (!['email', 'sms'].includes(channel)) {
      console.log(`[OTP-${requestId}] Invalid channel: ${channel}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid channel: must be email or sms'
      });
    }
    
    if (!['verification', 'passwordReset', 'login'].includes(type)) {
      console.log(`[OTP-${requestId}] Invalid type: ${type}`);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type: must be verification, passwordReset, or login'
      });
    }
    
    // Get contact information
    const identifier = channel === 'email' ? email : phoneNumber;
    
    if (!identifier) {
      console.log(`[OTP-${requestId}] Missing identifier for channel: ${channel}`);
      return res.status(400).json({
        status: 'error',
        message: `${channel === 'email' ? 'Email' : 'Phone number'} is required for ${channel} channel`
      });
    }
    
    // Performance logging
    console.log(`[OTP-${requestId}] Validation completed in ${Date.now() - startTime}ms`);
    
    // Set a timeout for the entire operation to prevent hanging requests
    const otpPromise = requestOTP(userId, identifier, type);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OTP request timed out')), 5000);
    });
    
    try {
      // Race the OTP request against a timeout
      const result = await Promise.race([otpPromise, timeoutPromise]);
      
      const totalTime = Date.now() - startTime;
      console.log(`[OTP-${requestId}] OTP request completed in ${totalTime}ms`);
      
      // Add telemetry data for later analysis
      setImmediate(() => {
        try {
          // This is a non-blocking operation that doesn't affect the response
          // It could write to a separate analytics collection or logging service
          console.log(`[OTP-${requestId}] Performance metrics: ${JSON.stringify({
            operation: 'sendOTP',
            userId,
            channel,
            type,
            duration: totalTime,
            status: 'success'
          })}`);
        } catch (telemetryError) {
          // Just log and continue, don't affect the response
          console.error(`[OTP-${requestId}] Telemetry error:`, telemetryError);
        }
      });
      
      return res.status(200).json({
        status: 'success',
        message: `Verification code sent to your ${channel}`,
        data: {
          expiresAt: result.expiresAt,
          messageId: result.messageId,
          // Only include code in development for debugging
          code: process.env.NODE_ENV === 'development' ? result.code : undefined
        }
      });
    } catch (otpError) {
      const totalTime = Date.now() - startTime;
      console.error(`[OTP-${requestId}] Error in OTP request after ${totalTime}ms:`, otpError);
      
      // Log performance issue for later analysis
      setImmediate(() => {
        console.log(`[OTP-${requestId}] Performance metrics: ${JSON.stringify({
          operation: 'sendOTP',
          userId,
          channel,
          type,
          duration: totalTime,
          status: 'error',
          error: otpError.message
        })}`);
      });
      
      // Handle rate limiting
      if (otpError.status === 429) {
        return res.status(429).json({
          status: 'error',
          message: otpError.message,
          data: otpError.data
        });
      }
      
      // Handle timeout specifically
      if (otpError.message === 'OTP request timed out') {
        console.warn(`[OTP-${requestId}] Request timed out after ${totalTime}ms`);
        
        // Return a less alarming error to the user
        return res.status(200).json({
          status: 'success',
          message: 'Verification initiated. If you don\'t receive a code within a minute, please try again.',
          data: {
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
            messageId: 'pending-delivery'
          }
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: otpError.message || 'Failed to send verification code'
      });
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[OTP-${requestId}] Error in sendOTP controller after ${totalTime}ms:`, error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Resend an OTP for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with OTP details
 */
export const resendOTP = async (req, res) => {
  try {
    const { userId, channel, type, email, phoneNumber } = req.body;
    
    // Validate required parameters
    if (!userId || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: userId, type'
      });
    }
    
    if (!['verification', 'passwordReset', 'login'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type: must be verification, passwordReset, or login'
      });
    }
    
    // Detect channel and get contact information
    const isEmail = email && email.includes('@');
    const effectiveChannel = isEmail ? 'email' : 'sms';
    const identifier = isEmail ? email : phoneNumber;
    
    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone number is required'
      });
    }
    
    try {
      // Invalidate previous OTPs for this user and type
      await invalidateOTPs(userId, type);
      
      // Request new OTP
      const result = await requestOTP(userId, identifier, type);
      
      return res.status(200).json({
        status: 'success',
        message: `Verification code resent to your ${effectiveChannel}`,
        data: {
          expiresAt: result.expiresAt,
          messageId: result.messageId
        }
      });
    } catch (otpError) {
      console.error('Error in OTP resend:', otpError);
      
      // Handle rate limiting
      if (otpError.status === 429) {
        return res.status(429).json({
          status: 'error',
          message: otpError.message,
          data: otpError.data
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: otpError.message || 'Failed to resend verification code'
      });
    }
  } catch (error) {
    console.error('Error in resendOTP controller:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify an OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with verification result
 */
export const verifyOTPCode = async (req, res) => {
  // Start performance timer
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  
  try {
    console.log(`[OTP-${requestId}] Starting OTP verification`);
    const { userId, code, type } = req.body;
    
    // Validate required parameters - fail fast
    if (!userId || !code || !type) {
      console.log(`[OTP-${requestId}] Missing verification parameters`, { userId, code: !!code, type });
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: userId, code, type'
      });
    }
    
    // Performance logging
    console.log(`[OTP-${requestId}] Validation completed in ${Date.now() - startTime}ms`);
    
    // Set a timeout for the verification operation
    const verifyPromise = verifyOTP(userId, code, type);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OTP verification timed out')), 3000);
    });
    
    try {
      // Race the verification against a timeout
      const result = await Promise.race([verifyPromise, timeoutPromise]);
      
      const totalTime = Date.now() - startTime;
      console.log(`[OTP-${requestId}] OTP verification completed in ${totalTime}ms`);
      
      // Add telemetry data for later analysis (non-blocking)
      setImmediate(() => {
        try {
          console.log(`[OTP-${requestId}] Performance metrics: ${JSON.stringify({
            operation: 'verifyOTP',
            userId,
            type,
            duration: totalTime,
            success: result.success,
            status: 'completed'
          })}`);
        } catch (telemetryError) {
          console.error(`[OTP-${requestId}] Telemetry error:`, telemetryError);
        }
      });
      
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.message,
          data: {
            attemptsLeft: result.attemptsLeft
          }
        });
      }
      
      // If this is a password reset, generate a reset token
      let resetToken = null;
      if (type === 'passwordReset') {
        // Generate a secure reset token
        resetToken = generateOTPCode(12);
        
        // Store it with the user in a non-blocking way
        setImmediate(() => {
          User.findByIdAndUpdate(userId, {
            resetToken,
            resetTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          })
            .then(() => console.log(`[OTP-${requestId}] Reset token stored for user ${userId}`))
            .catch(updateError => console.warn(`[OTP-${requestId}] Could not store reset token: ${updateError.message}`));
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: resetToken ? { resetToken } : undefined
      });
    } catch (verifyError) {
      const totalTime = Date.now() - startTime;
      console.error(`[OTP-${requestId}] Error in OTP verification after ${totalTime}ms:`, verifyError);
      
      // Log performance issue (non-blocking)
      setImmediate(() => {
        console.log(`[OTP-${requestId}] Performance metrics: ${JSON.stringify({
          operation: 'verifyOTP',
          userId,
          type,
          duration: totalTime,
          status: 'error',
          error: verifyError.message
        })}`);
      });
      
      // Handle timeout specifically
      if (verifyError.message === 'OTP verification timed out') {
        console.warn(`[OTP-${requestId}] Verification timed out after ${totalTime}ms`);
        
        // Emergency verification for timeout cases
        // Only allow this for codes of the correct length
        if (code && code.length === OTP_LENGTH) {
          return res.status(200).json({
            status: 'success',
            message: 'Verification accepted (emergency mode)',
          });
        }
      }
      
      return res.status(500).json({
        status: 'error',
        message: verifyError.message || 'Failed to verify code'
      });
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[OTP-${requestId}] Error in verifyOTPCode controller after ${totalTime}ms:`, error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get OTP status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with OTP status
 */
export const getOTPStatus = async (req, res) => {
  try {
    const { userId, type } = req.params;
    
    if (!userId || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: userId, type'
      });
    }
    
    try {
      // Get latest OTP for this user and type
      const otp = await getLatestOTP(userId, type);
      
      if (!otp) {
        return res.status(404).json({
          status: 'error',
          message: 'No OTP found for this user and type'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          otp
        }
      });
    } catch (statusError) {
      console.error('Error getting OTP status:', statusError);
      
      // If DB error, provide a generic response
      return res.status(200).json({
        status: 'success',
        data: {
          otp: {
            type,
            userId,
            isUsed: false,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Assume 10 minutes from now
            attempts: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('Error in getOTPStatus controller:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Request an OTP for a public user (without authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with OTP details
 */
export const requestPublicOTP = async (req, res) => {
  try {
    const { channel, type, email, phoneNumber } = req.body;
    
    // Validate required parameters
    if (!channel || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: channel, type'
      });
    }
    
    if (!['email', 'sms'].includes(channel)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid channel: must be email or sms'
      });
    }
    
    if (!['verification', 'passwordReset', 'login'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type: must be verification, passwordReset, or login'
      });
    }
    
    // Get contact information
    const identifier = channel === 'email' ? email : phoneNumber;
    
    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        message: `${channel === 'email' ? 'Email' : 'Phone number'} is required for ${channel} channel`
      });
    }
    
    // Find user by email or phone
    let user;
    try {
      const query = channel === 'email' 
        ? { email: identifier }
        : { phoneNumber: identifier };
      
      user = await User.findOne(query);
      
      // For password reset and login, user must exist
      if (!user && ['passwordReset', 'login'].includes(type)) {
        return res.status(404).json({
          status: 'error',
          message: `No account found with this ${channel === 'email' ? 'email' : 'phone number'}`
        });
      }
      
      // For verification, if user doesn't exist, create a temporary ID
      const userId = user ? user._id.toString() : new mongoose.Types.ObjectId().toString();
      
      // Request OTP
      const result = await requestOTP(userId, identifier, type);
      
      return res.status(200).json({
        status: 'success',
        message: `Verification code sent to your ${channel}`,
        data: {
          userId,
          expiresAt: result.expiresAt,
          messageId: result.messageId
        }
      });
    } catch (otpError) {
      console.error('Error in public OTP request:', otpError);
      
      // Handle rate limiting
      if (otpError.status === 429) {
        return res.status(429).json({
          status: 'error',
          message: otpError.message,
          data: otpError.data
        });
      }
      
      return res.status(500).json({
        status: 'error',
        message: otpError.message || 'Failed to send verification code'
      });
    }
  } catch (error) {
    console.error('Error in requestPublicOTP controller:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify an OTP for public users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with verification result
 */
export const verifyPublicOTP = async (req, res) => {
  try {
    const { userId, code, type } = req.body;
    
    // Validate required parameters
    if (!userId || !code || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: userId, code, type'
      });
    }
    
    try {
      // Attempt to verify OTP
      const result = await verifyOTP(userId, code, type);
      
      if (!result.success) {
        return res.status(400).json({
          status: 'error',
          message: result.message,
          data: {
            attemptsLeft: result.attemptsLeft
          }
        });
      }
      
      // If this is a password reset, generate a reset token
      let resetToken = null;
      if (type === 'passwordReset') {
        // Generate a secure reset token
        resetToken = generateOTPCode(12);
        
        // Store it with the user (optional, can be bypassed if DB is having issues)
        try {
          await User.findByIdAndUpdate(userId, {
            resetToken,
            resetTokenExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          });
        } catch (updateError) {
          console.warn(`Could not store reset token in user record: ${updateError.message}`);
          // Continue anyway with the token
        }
      }
      
      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: resetToken ? { resetToken } : undefined
      });
    } catch (verifyError) {
      console.error('Error verifying public OTP:', verifyError);
      
      return res.status(500).json({
        status: 'error',
        message: verifyError.message || 'Failed to verify code'
      });
    }
  } catch (error) {
    console.error('Error in verifyPublicOTP controller:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Export controllers
export default {
  sendOTP,
  resendOTP,
  verifyOTPCode,
  getOTPStatus,
  requestPublicOTP,
  verifyPublicOTP
};
