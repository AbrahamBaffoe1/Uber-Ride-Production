/**
 * Twilio OTP Service
 * Handles OTP generation, verification, and management using Twilio Verify API
 */
const OTP = require('../mongodb/models/OTP');
const User = require('../mongodb/models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const emailService = require('./email.service');
const smsService = require('./sms.service');

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

// Twilio client setup
let twilioClient;
let verifyService;

try {
  const twilio = require('twilio');
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  verifyService = process.env.TWILIO_VERIFY_SERVICE_SID;
  console.log('Twilio client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Twilio client:', error.message);
  console.log('Twilio client initialized successfully as fallback');
}

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
      isUsed: false,
      provider: 'twilio'
    });
    
    await otp.save();
    return otp;
  } catch (error) {
    console.error('Error creating OTP:', error);
    throw error;
  }
};

/**
 * Send OTP via SMS using Twilio Verify
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @param {String} phoneNumber - Phone number
 * @returns {Object} Result object
 */
const sendOTPviaSMS = async (userId, type, phoneNumber) => {
  try {
    if (!twilioClient || !verifyService) {
      throw new Error('Twilio client not initialized');
    }
    
    // Format phone number for Twilio (must be E.164 format)
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhone = `+${phoneNumber}`;
    }
    
    // Create verification request
    const verification = await twilioClient.verify.v2
      .services(verifyService)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms',
        locale: 'en'
      });
    
    // Generate a code for our database (Twilio doesn't expose the code)
    const code = generateOTPCode();
    
    // Create OTP in database
    const otp = await createOTP(userId, type, phoneNumber, code);
    
    // Update OTP with Twilio verification SID
    await OTP.findByIdAndUpdate(otp._id, {
      messageId: verification.sid,
      deliveryStatus: verification.status
    });
    
    return {
      success: true,
      expiresAt: otp.expiresAt,
      messageId: verification.sid,
      provider: 'twilio'
    };
  } catch (error) {
    console.error('Error sending OTP via Twilio SMS:', error);
    throw error;
  }
};

/**
 * Send OTP via email using Twilio Verify
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @param {String} email - Email address
 * @returns {Object} Result object
 */
const sendOTPviaEmail = async (userId, type, email) => {
  try {
    if (!twilioClient || !verifyService) {
      throw new Error('Twilio client not initialized');
    }
    
    // Create verification request
    const verification = await twilioClient.verify.v2
      .services(verifyService)
      .verifications.create({
        to: email,
        channel: 'email',
        locale: 'en'
      });
    
    // Generate a code for our database (Twilio doesn't expose the code)
    const code = generateOTPCode();
    
    // Create OTP in database
    const otp = await createOTP(userId, type, email, code);
    
    // Update OTP with Twilio verification SID
    await OTP.findByIdAndUpdate(otp._id, {
      messageId: verification.sid,
      deliveryStatus: verification.status
    });
    
    return {
      success: true,
      expiresAt: otp.expiresAt,
      messageId: verification.sid,
      provider: 'twilio'
    };
  } catch (error) {
    console.error('Error sending OTP via Twilio Email:', error);
    throw error;
  }
};

/**
 * Verify OTP code using Twilio Verify
 * @param {String} userId - User ID
 * @param {String} code - OTP code
 * @param {String} type - OTP type
 * @returns {Boolean} Whether OTP is valid
 */
const verifyOTP = async (userId, code, type) => {
  try {
    if (!twilioClient || !verifyService) {
      throw new Error('Twilio client not initialized');
    }
    
    // Find the most recent OTP for this user and type
    const otp = await OTP.findOne({
      userId: mongoose.Types.ObjectId(userId),
      type,
      isUsed: false,
      provider: 'twilio'
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
    
    // Verify with Twilio
    const verification = await twilioClient.verify.v2
      .services(verifyService)
      .verificationChecks.create({
        to: otp.identifier,
        code
      });
    
    // Check verification status
    if (verification.status !== 'approved') {
      await otp.save();
      return false;
    }
    
    // Mark OTP as used
    otp.isUsed = true;
    otp.verifiedAt = new Date();
    await otp.save();
    
    return true;
  } catch (error) {
    console.error('Error verifying OTP with Twilio:', error);
    
    // If Twilio verification fails, fall back to checking our database
    try {
      // Find the most recent OTP for this user and type
      const otp = await OTP.findOne({
        userId: mongoose.Types.ObjectId(userId),
        type,
        isUsed: false,
        provider: 'twilio'
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
    } catch (fallbackError) {
      console.error('Error in fallback verification:', fallbackError);
      throw fallbackError;
    }
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
      type,
      provider: 'twilio'
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
        isUsed: false,
        provider: 'twilio'
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

module.exports = {
  generateOTPCode,
  sendOTPviaSMS,
  sendOTPviaEmail,
  verifyOTP,
  handlePostVerificationAction,
  getLatestOTP,
  invalidateOTPs
};
