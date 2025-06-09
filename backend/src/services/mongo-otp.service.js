/**
 * MongoDB OTP Service
 * Handles OTP generation, verification, and management using MongoDB
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import emailService from './email.service.js';
import smsService from './sms.service.js';

// Import models dynamically to avoid circular dependencies
let OTP, User;

const importModels = async () => {
  const OTPModule = await import('../mongodb/models/OTP.js');
  const UserModule = await import('../mongodb/models/User.js');
  
  OTP = OTPModule.default;
  User = UserModule.default;
};

// Initialize models
await importModels();

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

/**
 * Generate a random OTP code
 * @param {Number} length - Length of OTP code
 * @returns {String} OTP code
 */
const generateOTPCode = (length = OTP_LENGTH) => {
  // Generate a random numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString().substring(0, length);
};

/**
 * Create a new OTP record in the database
 * @param {String} userId - User ID
 * @param {String} type - OTP type (verification, passwordReset, login)
 * @param {String} identifier - Phone number or email
 * @param {String} code - OTP code
 * @returns {Object} OTP document
 */
const createOTP = async (userId, type, identifier, code) => {
  try {
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    
    // Create OTP document
    const otp = new OTP({
      userId: mongoose.Types.ObjectId(userId),
      type,
      code,
      identifier,
      expiresAt,
      attempts: 0,
      isUsed: false
    });
    
    await otp.save();
    return otp;
  } catch (error) {
    console.error('Error creating OTP:', error);
    throw error;
  }
};

/**
 * Send OTP via SMS
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @param {String} phoneNumber - Phone number
 * @returns {Object} Result object
 */
const sendOTPviaSMS = async (userId, type, phoneNumber) => {
  try {
    // Generate OTP code
    const code = generateOTPCode();
    
    // Create OTP in database
    const otp = await createOTP(userId, type, phoneNumber, code);
    
    // Prepare message based on OTP type
    let message;
    switch (type) {
      case 'verification':
        message = `Your Okada verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
        break;
      case 'passwordReset':
        message = `Your Okada password reset code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
        break;
      case 'login':
        message = `Your Okada login code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
        break;
      default:
        message = `Your Okada verification code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
    }
    
    // Send SMS
    const result = await smsService.sendSMS(phoneNumber, message);
    
    // Update OTP with message ID
    await OTP.findByIdAndUpdate(otp._id, {
      messageId: result.messageId,
      deliveryStatus: 'sent'
    });
    
    return {
      success: true,
      expiresAt: otp.expiresAt,
      messageId: result.messageId,
      provider: 'legacy'
    };
  } catch (error) {
    console.error('Error sending OTP via SMS:', error);
    throw error;
  }
};

/**
 * Send OTP via email
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @param {String} email - Email address
 * @returns {Object} Result object
 */
const sendOTPviaEmail = async (userId, type, email) => {
  try {
    // Generate OTP code
    const code = generateOTPCode();
    
    // Create OTP in database
    const otp = await createOTP(userId, type, email, code);
    
    // Get user details
    const user = await User.findById(userId);
    
    // Prepare email subject and template based on OTP type
    let subject, template;
    switch (type) {
      case 'verification':
        subject = 'Verify Your Okada Account';
        template = 'verification';
        break;
      case 'passwordReset':
        subject = 'Reset Your Okada Password';
        template = 'password-reset';
        break;
      case 'login':
        subject = 'Your Okada Login Code';
        template = 'login';
        break;
      default:
        subject = 'Your Okada Verification Code';
        template = 'verification';
    }
    
    // Send email
    const result = await emailService.sendEmail({
      to: email,
      subject,
      template,
      context: {
        firstName: user ? user.firstName : 'User',
        lastName: user ? user.lastName : '',
        code,
        expiryMinutes: OTP_EXPIRY_MINUTES
      }
    });
    
    // Update OTP with message ID
    await OTP.findByIdAndUpdate(otp._id, {
      messageId: result.messageId,
      deliveryStatus: 'sent'
    });
    
    return {
      success: true,
      expiresAt: otp.expiresAt,
      messageId: result.messageId,
      provider: 'legacy'
    };
  } catch (error) {
    console.error('Error sending OTP via email:', error);
    throw error;
  }
};

/**
 * Verify OTP code
 * @param {String} userId - User ID
 * @param {String} code - OTP code
 * @param {String} type - OTP type
 * @returns {Boolean} Whether OTP is valid
 */
const verifyOTP = async (userId, code, type) => {
  try {
    // Find the most recent OTP for this user and type
    const otp = await OTP.findOne({
      userId: mongoose.Types.ObjectId(userId),
      type,
      isUsed: false
    }).sort({ createdAt: -1 });
    
    if (!otp) {
      throw new Error('OTP not found');
    }
    
    // Check if OTP is expired
    if (otp.expiresAt < new Date()) {
      throw new Error('OTP has expired');
    }
    
    // Check if max attempts reached
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new Error('Maximum verification attempts reached');
    }
    
    // Increment attempts
    otp.attempts += 1;
    
    // Check if code matches
    if (otp.code !== code) {
      await otp.save();
      return false;
    }
    
    // Mark OTP as used
    otp.isUsed = true;
    otp.verifiedAt = new Date();
    await otp.save();
    
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

/**
 * Handle post-verification action based on OTP type
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @returns {Object} Result object
 */
const handlePostVerificationAction = async (userId, type) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    switch (type) {
      case 'verification':
        // Mark user as verified
        user.isVerified = true;
        user.verifiedAt = new Date();
        await user.save();
        return {
          success: true,
          message: 'Account verified successfully'
        };
        
      case 'passwordReset':
        // No action needed here, password reset will be handled separately
        return {
          success: true,
          message: 'Password reset code verified'
        };
        
      case 'login':
        // Update last login time
        user.lastLoginAt = new Date();
        await user.save();
        return {
          success: true,
          message: 'Login successful'
        };
        
      default:
        return {
          success: true,
          message: 'Verification successful'
        };
    }
  } catch (error) {
    console.error('Error handling post-verification action:', error);
    throw error;
  }
};

/**
 * Get the latest OTP for a user and type
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @returns {Object} OTP document
 */
const getLatestOTP = async (userId, type) => {
  try {
    return await OTP.findOne({
      userId: mongoose.Types.ObjectId(userId),
      type
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting latest OTP:', error);
    throw error;
  }
};

/**
 * Invalidate all OTPs for a user and type
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @returns {Object} Result object
 */
const invalidateOTPs = async (userId, type) => {
  try {
    await OTP.updateMany(
      {
        userId: mongoose.Types.ObjectId(userId),
        type,
        isUsed: false
      },
      {
        isUsed: true
      }
    );
    
    return {
      success: true,
      message: 'OTPs invalidated successfully'
    };
  } catch (error) {
    console.error('Error invalidating OTPs:', error);
    throw error;
  }
};

export {
  generateOTPCode,
  sendOTPviaSMS,
  sendOTPviaEmail,
  verifyOTP,
  handlePostVerificationAction,
  getLatestOTP,
  invalidateOTPs
};
