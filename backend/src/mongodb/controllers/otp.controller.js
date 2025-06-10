/**
 * MongoDB OTP Controller
 * Handles API endpoints for OTP generation, verification, and management using MongoDB
 * Uses the robust Twilio OTP service for secure OTP handling
 */
import * as otpService from '../../services/mongo-otp.service.js'; // Legacy service
import * as twilioOtpService from '../../services/twilio-otp.service.js'; // New robust service
import * as realtimeOtpService from '../../services/realtime-otp.service.js'; // Realtime service
import User from '../models/User.js';
import cryptoService from '../../services/crypto.service.js';

// Use the Twilio OTP service as the primary service
const primaryOtpService = twilioOtpService;

/**
 * Generate and send an OTP via SMS or email
 * @route POST /api/v1/mongo/otp/send
 */
export const sendOTP = async (req, res) => {
  try {
    // Support both 'method' and 'channel' parameters for compatibility
    const { userId, method, channel, identifier, phoneNumber, email, type = 'verification' } = req.body;
    
    // Determine the delivery method (SMS or email)
    const deliveryMethod = method || channel || (phoneNumber ? 'sms' : (email ? 'email' : null));
    
    if (!userId || !deliveryMethod) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and delivery method (channel/method) are required'
      });
    }

    // Validate delivery method
    if (deliveryMethod !== 'sms' && deliveryMethod !== 'email') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery method. Use "sms" or "email"'
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP based on delivery method
    let result;
    if (deliveryMethod === 'sms') {
      // Use provided phone number or identifier or user's phone
      const phone = phoneNumber || identifier || user.phoneNumber;
      if (!phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Phone number is required for SMS OTP'
        });
      }
      
      console.log(`Sending SMS OTP to ${phone.replace(/.(?=.{4})/g, '*')}`);
      
      // Try the new Twilio OTP service first
      try {
        result = await primaryOtpService.sendOTPviaSMS(userId, type, phone);
        console.log(`SMS OTP sent successfully via Twilio to ${phone.replace(/.(?=.{4})/g, '*')}`);
      } catch (twilioError) {
        console.error('Twilio OTP service failed, falling back to legacy service:', twilioError.message);
        // Fall back to the legacy OTP service
        result = await otpService.sendOTPviaSMS(userId, type, phone);
        console.log(`SMS OTP sent successfully via legacy service to ${phone.replace(/.(?=.{4})/g, '*')}`);
      }
    } else {
      // Use provided email or identifier or user's email
      const emailAddress = email || identifier || user.email;
      if (!emailAddress) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is required for email OTP'
        });
      }
      
      // Try the new Twilio OTP service first for email
      try {
        console.log(`Using Twilio OTP service for email: ${emailAddress.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        result = await primaryOtpService.sendOTPviaEmail(userId, type, emailAddress);
        console.log(`Email OTP sent successfully via Twilio service to ${emailAddress.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
      } catch (twilioError) {
        console.error('Twilio OTP service failed for email, trying realtime service:', twilioError.message);
        
        // Try the realtime OTP service as fallback
        try {
          console.log(`Using realtime OTP service for email: ${emailAddress.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
          result = await realtimeOtpService.sendOTPviaEmail(userId, type, emailAddress);
          console.log(`Email OTP sent successfully via realtime service to ${emailAddress.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        } catch (realtimeError) {
          console.error('Realtime OTP service also failed, falling back to legacy service:', realtimeError.message);
          // Fall back to the legacy OTP service as last resort
          result = await otpService.sendOTPviaEmail(userId, type, emailAddress);
          console.log(`Email OTP sent successfully via legacy service to ${emailAddress.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        }
      }
    }

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: `OTP sent successfully via ${deliveryMethod}`,
      data: {
        expiresAt: result.expiresAt,
        messageId: result.messageId,
        provider: result.provider
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
 * @route POST /api/v1/mongo/otp/sms
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP using the Twilio OTP service first
    let result;
    try {
      console.log(`Using Twilio OTP service for SMS: ${phoneNumber.replace(/.(?=.{4})/g, '*')}`);
      result = await primaryOtpService.sendOTPviaSMS(userId, type, phoneNumber);
      console.log(`SMS OTP sent successfully via Twilio to ${phoneNumber.replace(/.(?=.{4})/g, '*')}`);
    } catch (twilioError) {
      console.error('Twilio OTP service failed, falling back to legacy service:', twilioError.message);
      // Fall back to the legacy OTP service
      result = await otpService.sendOTPviaSMS(userId, type, phoneNumber);
      console.log(`SMS OTP sent successfully via legacy service to ${phoneNumber.replace(/.(?=.{4})/g, '*')}`);
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
    console.error('Error generating SMS OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * Generate and send an OTP via email
 * @route POST /api/v1/mongo/otp/email
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP using the Twilio OTP service first
    let result;
    try {
      console.log(`Using Twilio OTP service for email: ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
      result = await primaryOtpService.sendOTPviaEmail(userId, type, email);
      console.log(`Email OTP sent successfully via Twilio service to ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
    } catch (twilioError) {
      console.error('Twilio OTP service failed for email, trying realtime service:', twilioError.message);
      
      // Try the realtime OTP service as fallback
      try {
        console.log(`Using realtime OTP service for email: ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        result = await realtimeOtpService.sendOTPviaEmail(userId, type, email);
        console.log(`Email OTP sent successfully via realtime service to ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
      } catch (realtimeError) {
        console.error('Realtime OTP service also failed, falling back to legacy service:', realtimeError.message);
        // Fall back to the legacy OTP service as last resort
        result = await otpService.sendOTPviaEmail(userId, type, email);
        console.log(`Email OTP sent successfully via legacy service to ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
      }
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
 * @route POST /api/v1/mongo/otp/verify
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify OTP using the Twilio OTP service first, then try others as fallbacks
    let isValid;
    try {
      console.log('Using Twilio OTP service for verification');
      isValid = await primaryOtpService.verifyOTP(userId, code, type);
      console.log('Twilio OTP verification result:', isValid);
    } catch (twilioError) {
      console.error('Twilio OTP verification failed, trying realtime service:', twilioError.message);
      
      // Try the realtime OTP service as fallback
      try {
        console.log('Using realtime OTP service for verification');
        isValid = await realtimeOtpService.verifyOTP(userId, code, type);
        console.log('Realtime OTP verification result:', isValid);
      } catch (realtimeError) {
        console.error('Realtime OTP verification also failed, falling back to legacy service:', realtimeError.message);
        // Fall back to the legacy OTP service as last resort
        isValid = await otpService.verifyOTP(userId, code, type);
        console.log('Legacy OTP verification result:', isValid);
      }
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
      tokens = await cryptoService.createTokenPair(user.id);
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
 * @route POST /api/v1/mongo/otp/resend
 */
export const resendOTP = async (req, res) => {
  try {
    // Support both 'method' and 'channel' parameters for compatibility
    const { userId, method, channel, identifier, phoneNumber, email, type = 'verification' } = req.body;
    
    // Determine the delivery method (SMS or email)
    const deliveryMethod = method || channel || (phoneNumber ? 'sms' : (email ? 'email' : null));
    
    // Determine the identifier (phone number or email)
    const contactIdentifier = identifier || phoneNumber || email;
    
    if (!userId || !deliveryMethod || !contactIdentifier) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID, delivery method (channel/method), and contact information (identifier/phoneNumber/email) are required'
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

    // Validate delivery method
    const validMethods = ['sms', 'email'];
    if (!validMethods.includes(deliveryMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid delivery method. Use "sms" or "email"'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Log the OTP delivery attempt
    console.log(`Attempting to send OTP via ${deliveryMethod} to ${contactIdentifier.replace(/.(?=.{4})/g, '*')}`);

    // Resend OTP based on delivery method
    let result;
    if (deliveryMethod === 'sms') {
      // Try the new Twilio OTP service first
      try {
        result = await primaryOtpService.sendOTPviaSMS(userId, type, contactIdentifier);
        console.log(`SMS OTP sent successfully via Twilio to ${contactIdentifier.replace(/.(?=.{4})/g, '*')}`);
      } catch (twilioError) {
        console.error('Twilio OTP service failed, falling back to legacy service:', twilioError.message);
        // Fall back to the legacy OTP service
        result = await otpService.sendOTPviaSMS(userId, type, contactIdentifier);
        console.log(`SMS OTP sent successfully via legacy service to ${contactIdentifier.replace(/.(?=.{4})/g, '*')}`);
      }
    } else {
      // Try the new Twilio OTP service first for email
      try {
        console.log(`Using Twilio OTP service for email resend: ${contactIdentifier.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        result = await primaryOtpService.sendOTPviaEmail(userId, type, contactIdentifier);
        console.log(`Email OTP sent successfully via Twilio service to ${contactIdentifier.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
      } catch (twilioError) {
        console.error('Twilio OTP service failed for email resend, trying realtime service:', twilioError.message);
        
        // Try the realtime OTP service as fallback
        try {
          console.log(`Using realtime OTP service for email resend: ${contactIdentifier.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
          result = await realtimeOtpService.sendOTPviaEmail(userId, type, contactIdentifier);
          console.log(`Email OTP sent successfully via realtime service to ${contactIdentifier.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        } catch (realtimeError) {
          console.error('Realtime OTP service also failed for resend, falling back to legacy service:', realtimeError.message);
          // Fall back to the legacy OTP service as last resort
          result = await otpService.sendOTPviaEmail(userId, type, contactIdentifier);
          console.log(`Email OTP sent successfully via legacy service to ${contactIdentifier.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        }
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
 * @route GET /api/v1/mongo/otp/status/:userId/:type
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
        otp: {
          _id: otp._id,
          userId: otp.userId,
          type: otp.type,
          isUsed: otp.isUsed,
          expiresAt: otp.expiresAt,
          attempts: otp.attempts,
          identifier: otp.identifier,
          messageId: otp.messageId,
          deliveryStatus: otp.deliveryStatus,
          createdAt: otp.createdAt,
          updatedAt: otp.updatedAt
        }
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
 * @route POST /api/v1/mongo/otp/public/request
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
    const user = await User.findOne(
      channel === 'email' ? { email: identifier } : { phone: identifier }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate and send OTP based on channel
    let result;
    if (channel === 'sms') {
      // Try the new Twilio OTP service first
      try {
        console.log(`Using Twilio OTP service for public SMS request to ${phoneNumber.replace(/.(?=.{4})/g, '*')}`);
        result = await primaryOtpService.sendOTPviaSMS(user.id, type, phoneNumber);
        console.log(`SMS OTP sent successfully via Twilio to ${phoneNumber.replace(/.(?=.{4})/g, '*')}`);
      } catch (twilioError) {
        console.error('Twilio OTP service failed for public SMS request, falling back to legacy service:', twilioError.message);
        // Fall back to the legacy OTP service
        result = await otpService.sendOTPviaSMS(user.id, type, phoneNumber);
        console.log(`SMS OTP sent successfully via legacy service to ${phoneNumber.replace(/.(?=.{4})/g, '*')}`);
      }
    } else {
      // Try the new Twilio OTP service first for email
      try {
        console.log(`Using Twilio OTP service for public email request: ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        result = await primaryOtpService.sendOTPviaEmail(user.id, type, email);
        console.log(`Email OTP sent successfully via Twilio service to ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
      } catch (twilioError) {
        console.error('Twilio OTP service failed for public email request, trying realtime service:', twilioError.message);
        
        // Try the realtime OTP service as fallback
        try {
          console.log(`Using realtime OTP service for public email request: ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
          result = await realtimeOtpService.sendOTPviaEmail(user.id, type, email);
          console.log(`Email OTP sent successfully via realtime service to ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        } catch (realtimeError) {
          console.error('Realtime OTP service also failed for public email request, falling back to legacy service:', realtimeError.message);
          // Fall back to the legacy OTP service as last resort
          result = await otpService.sendOTPviaEmail(user.id, type, email);
          console.log(`Email OTP sent successfully via legacy service to ${email.replace(/(.{2})(.*)(?=@)/g, '$1***')}`);
        }
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
 * @route POST /api/v1/mongo/otp/public/verify
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
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify OTP using the Twilio OTP service first, then try others as fallbacks
    let isValid;
    try {
      console.log('Using Twilio OTP service for public verification');
      isValid = await primaryOtpService.verifyOTP(userId, code, type);
      console.log('Twilio OTP public verification result:', isValid);
    } catch (twilioError) {
      console.error('Twilio OTP public verification failed, trying realtime service:', twilioError.message);
      
      // Try the realtime OTP service as fallback
      try {
        console.log('Using realtime OTP service for public verification');
        isValid = await realtimeOtpService.verifyOTP(userId, code, type);
        console.log('Realtime OTP public verification result:', isValid);
      } catch (realtimeError) {
        console.error('Realtime OTP public verification also failed, falling back to legacy service:', realtimeError.message);
        // Fall back to the legacy OTP service as last resort
        isValid = await otpService.verifyOTP(userId, code, type);
        console.log('Legacy OTP public verification result:', isValid);
      }
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
      resetToken = await cryptoService.createResetToken(userId);
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
