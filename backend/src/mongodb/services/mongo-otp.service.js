/**
 * MongoDB OTP Service
 * Handles OTP generation, verification, and tracking using MongoDB for persistent storage
 */
import crypto from 'crypto';
import moment from 'moment';
import mongoose from 'mongoose';
import * as smsService from '../../services/sms.service.js';
import * as emailService from '../../services/email.service.js';
import * as loggingService from '../../services/logging.service.js';

// Import models dynamically to avoid circular dependencies
let OTP, User;

const importModels = async () => {
  const OTPModule = await import('../models/OTP.js');
  const UserModule = await import('../models/User.js');
  
  OTP = OTPModule.default;
  User = UserModule.default;
};

// Initialize models - wrap in an IIFE to avoid top-level await
(async () => {
  try {
    await importModels();
    console.log('OTP models initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OTP models:', error);
  }
})();


class MongoOtpService {
  constructor() {
    this.OTP_LENGTH = 6; // 6-digit OTPR
    this.OTP_EXPIRY_MINUTES = 10; // 10 minutes expiry
    this.MAX_ATTEMPTS = 5; // Max verification attempts
    this.RESEND_COOLDOWN_SECONDS = 60; // 1 minute cooldown for resending
  }

  /**
   * Generate a random OTP
   * @returns {string} - Generated OTP
   */
  generateOTP() {
    // Generate a 6-digit numeric code (padded with leading zeros if needed)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }

  /**
   * Create and save OTP in database
   * @param {string} userId - User ID
   * @param {string} type - OTP type ('verification', 'passwordReset', 'login')
   * @param {string} identifier - Phone number or email (optional)
   * @returns {Promise<Object>} - Created OTP object
   */
  async createOTP(userId, type, identifier = null) {
    try {
      // Ensure the userId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format for OTP creation');
      }
      
      // Create a MongoDB ObjectId from the string
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      // Invalidate existing unused OTPs of the same type
      await OTP.updateMany(
        { 
          userId: userIdObj,
          type,
          isUsed: false
        },
        { isUsed: true }
      );

      // Check for recent OTP creation to prevent abuse
      const recentOTP = await OTP.findOne({
        userId: userIdObj,
        type,
        createdAt: { $gt: moment().subtract(this.RESEND_COOLDOWN_SECONDS, 'seconds').toDate() }
      }).sort({ createdAt: -1 });

      if (recentOTP) {
        const secondsSinceCreation = moment().diff(moment(recentOTP.createdAt), 'seconds');
        const timeRemaining = this.RESEND_COOLDOWN_SECONDS - secondsSinceCreation;
        
        // Log OTP cooldown violation attempt
        loggingService.log('otp', 'warn', 'Cooldown period violation attempt', {
          userId,
          type,
          identifier,
          secondsSinceLastRequest: secondsSinceCreation,
          cooldownSeconds: this.RESEND_COOLDOWN_SECONDS
        });
        
        throw new Error(`Please wait ${timeRemaining} seconds before requesting a new code`);
      }

      // Generate new OTP
      const code = this.generateOTP();
      
      // Create OTP record with validated MongoDB ObjectId
      const otp = await OTP.create({
        userId: userIdObj,
        code,
        type,
        identifier,
        expiresAt: moment().add(this.OTP_EXPIRY_MINUTES, 'minutes').toDate(),
        isUsed: false,
        attempts: 0
      });

      // Log OTP creation
      loggingService.log('otp', 'info', 'OTP created', {
        userId,
        type,
        identifier: identifier?.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 chars
        otpId: otp._id
      });

      return {
        id: otp._id,
        code, // Need this for sending, will be masked in logs
        expiresAt: otp.expiresAt
      };
    } catch (error) {
      // Log error
      loggingService.log('otp', 'error', 'Failed to create OTP', {
        userId,
        type,
        identifier: identifier?.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 chars
        error: error.message
      });
      
      console.error('Failed to create OTP:', error);
      throw error;
    }
  }

  /**
   * Send OTP via SMS
   * @param {string} userId - User ID
   * @param {string} type - OTP type
   * @param {string} phoneNumber - Phone number to send OTP to
   * @returns {Promise<Object>} - Send result with OTP details
   */
  async sendOTPviaSMS(userId, type, phoneNumber) {
    try {
      // Check if phone number is valid
      if (!phoneNumber || !/^\+\d{10,15}$/.test(phoneNumber)) {
        throw new Error('Invalid phone number format. Must include country code (e.g., +1234567890)');
      }
      
      // Validate User ID is a MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format. Must be a valid MongoDB ObjectId');
      }

      // Track OTP request metric
      loggingService.trackOtpMetric('request', 'sms', true, {
        userId,
        type,
        phoneNumber: phoneNumber.replace(/.(?=.{4})/g, '*') // Mask all but last 4 digits
      });

      // Create OTP
      const otpData = await this.createOTP(userId, type, phoneNumber);
      
      // Prepare message
      const appName = 'Okada Ride Africa';
      let message;
      
      switch (type) {
        case 'verification':
          message = `[${appName}] Your verification code is: ${otpData.code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        case 'passwordReset':
          message = `[${appName}] Your password reset code is: ${otpData.code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        case 'login':
          message = `[${appName}] Your login verification code is: ${otpData.code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        default:
          message = `[${appName}] Your verification code is: ${otpData.code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
      }
      
      // Send SMS using the SMS service
      // SMS service already has built-in fallback to Twilio when needed
      const result = await smsService.sendSMS(phoneNumber, message);
      
      // Track successful OTP delivery
      loggingService.trackOtpMetric('delivery', 'sms', result.success === true, {
        userId,
        type,
        phoneNumber: phoneNumber.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 digits
        messageId: result.messageId,
        provider: result.provider || 'unknown'
      });
      
      // Return result
      return {
        success: result.success === true,
        messageId: result.messageId,
        expiresAt: otpData.expiresAt
      };
    } catch (error) {
      // Track failed OTP delivery
      loggingService.trackOtpMetric('delivery', 'sms', false, {
        userId,
        type,
        phoneNumber: phoneNumber?.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 digits
        error: error.message
      });
      
      // Log error with detailed info
      loggingService.log('otp', 'error', 'Failed to send OTP via SMS', {
        userId,
        type,
        phoneNumber: phoneNumber?.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 digits
        error: error.message,
        stack: error.stack
      });
      
      console.error('Failed to send OTP via SMS:', error);
      throw error;
    }
  }

  /**
   * Send OTP via email
   * @param {string} userId - User ID
   * @param {string} type - OTP type
   * @param {string} email - Email address to send OTP to
   * @returns {Promise<Object>} - Send result with OTP details
   */
  async sendOTPviaEmail(userId, type, email) {
    try {
      // Check if email is valid
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email address format');
      }
      
      // Validate User ID is a MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format. Must be a valid MongoDB ObjectId');
      }

      // Track OTP request metric
      loggingService.trackOtpMetric('request', 'email', true, {
        userId,
        type,
        email: email.replace(/(.{2})(.*)(?=@)/g, '$1***') // Mask email
      });

      // Create OTP
      const otpData = await this.createOTP(userId, type, email);
      
      // Prepare email
      const appName = 'Okada Ride Africa';
      let subject;
      let textContent;
      
      switch (type) {
        case 'verification':
          subject = `${appName} - Email Verification`;
          textContent = `Your email verification code is: ${otpData.code}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`;
          break;
        case 'passwordReset':
          subject = `${appName} - Password Reset`;
          textContent = `Your password reset code is: ${otpData.code}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please contact our support team immediately.`;
          break;
        case 'login':
          subject = `${appName} - Login Verification`;
          textContent = `Your login verification code is: ${otpData.code}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not attempt to log in, please secure your account immediately.`;
          break;
        default:
          subject = `${appName} - Verification Code`;
          textContent = `Your verification code is: ${otpData.code}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`;
      }
      
      // Send email using Nodemailer - no fallbacks for production
      // Use the more robust email service method that supports HTML
      let emailResult;
      switch (type) {
        case 'verification':
          emailResult = await emailService.sendVerificationEmail(email, otpData.code);
          break;
        case 'passwordReset':
          emailResult = await emailService.sendPasswordResetEmail(email, otpData.code);
          break;
        default:
          // For other types, use the basic sendEmail
          emailResult = await emailService.sendEmail(email, subject, textContent);
      }
      
      // Track successful OTP delivery
      loggingService.trackOtpMetric('delivery', 'email', true, {
        userId,
        type,
        email: email.replace(/(.{2})(.*)(?=@)/g, '$1***') // Mask email
      });
      
      // Return result
      return {
        success: true,
        expiresAt: otpData.expiresAt
      };
    } catch (error) {
      // Track failed OTP delivery
      loggingService.trackOtpMetric('delivery', 'email', false, {
        userId,
        type,
        email: email?.replace(/(.{2})(.*)(?=@)/g, '$1***'), // Mask email
        error: error.message
      });
      
      // Log error with detailed info
      loggingService.log('otp', 'error', 'Failed to send OTP via email', {
        userId,
        type,
        email: email?.replace(/(.{2})(.*)(?=@)/g, '$1***'), // Mask email
        error: error.message,
        stack: error.stack
      });
      
      console.error('Failed to send OTP via email:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   * @param {string} userId - User ID
   * @param {string} code - OTP to verify
   * @param {string} type - OTP type
   * @returns {Promise<boolean>} - Whether OTP is valid
   */
  async verifyOTP(userId, code, type) {
    try {
      // Validate User ID is a MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format. Must be a valid MongoDB ObjectId');
      }
      
      // Convert to MongoDB ObjectId
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      // Find the latest unused OTP of the specified type for this user
      const otp = await OTP.findOne({
        userId: userIdObj,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() } // Not expired
      }).sort({ createdAt: -1 });
      
      if (!otp) {
        // Log verification attempt against expired or non-existent OTP
        loggingService.log('otp', 'warn', 'Verification attempt with expired or non-existent OTP', {
          userId,
          type,
          attemptedCode: code?.substring(0, 2) + '****' // Only log first 2 digits for security
        });
        
        throw new Error('Verification code expired or not found. Please request a new one.');
      }
      
      // Increment attempts
      otp.attempts = (otp.attempts || 0) + 1;
      await otp.save();
      
      // Check if max attempts reached
      if (otp.attempts > this.MAX_ATTEMPTS) {
        // Mark as used/invalid
        otp.isUsed = true;
        await otp.save();
        
        // Log max attempts exceeded
        loggingService.log('otp', 'warn', 'Max verification attempts exceeded', {
          userId,
          type,
          otpId: otp._id,
          attempts: otp.attempts,
          maxAttempts: this.MAX_ATTEMPTS
        });
        
        throw new Error(`Too many failed attempts. Please request a new verification code.`);
      }
      
      // Compare codes (timing-safe comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(code.padEnd(this.OTP_LENGTH, ' ')),
        Buffer.from(otp.code.padEnd(this.OTP_LENGTH, ' '))
      );
      
      if (isValid) {
        // Mark as used
        otp.isUsed = true;
        await otp.save();
        
        // Track successful verification
        loggingService.trackOtpMetric('verification', otp.identifier?.includes('@') ? 'email' : 'sms', true, {
          userId,
          type,
          otpId: otp._id,
          attempts: otp.attempts
        });
        
        // Handle specific actions based on OTP type
        if (type === 'verification') {
          // Update user's verification status based on identifier type
          const user = await User.findById(userId);
          if (!user) {
            throw new Error('User not found');
          }
          
          if (otp.identifier && otp.identifier.includes('@')) {
            // Email verification
            user.isEmailVerified = true;
          } else if (otp.identifier) {
            // Phone verification
            user.isPhoneVerified = true;
          }
          
          // Update timestamps
          user.updatedAt = new Date();
          await user.save();
        }
        
        return true;
      }
      
      // Track failed verification
      loggingService.trackOtpMetric('verification', otp.identifier?.includes('@') ? 'email' : 'sms', false, {
        userId,
        type,
        otpId: otp._id,
        attempts: otp.attempts
      });
      
      return false;
    } catch (error) {
      // Log error
      loggingService.log('otp', 'error', 'OTP verification failed', {
        userId,
        type,
        error: error.message
      });
      
      console.error('OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Handle user action after successful OTP verification
   * @param {string} userId - User ID
   * @param {string} type - OTP type
   * @returns {Promise<Object>} - Result of the action
   */
  async handlePostVerificationAction(userId, type) {
    try {
      // Validate User ID is a MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format. Must be a valid MongoDB ObjectId');
      }
      
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      switch(type) {
        case 'verification':
          // Already handled in verifyOTP
          return { success: true, message: 'Account verified successfully' };
          
        case 'passwordReset':
          // Generate password reset token (handled by auth controller)
          return { success: true, message: 'Password reset verification successful' };
          
        case 'login':
          // Track successful MFA login
          await this.recordSuccessfulMFA(userId, 'otp');
          return { success: true, message: 'Login verification successful' };
          
        default:
          return { success: true, message: 'Verification successful' };
      }
    } catch (error) {
      console.error('Failed to handle post-verification action:', error);
      throw error;
    }
  }

  /**
   * Get the latest OTP for a user and type
   * @param {string} userId - User ID
   * @param {string} type - OTP type
   * @returns {Promise<Object>} - OTP data
   */
  async getLatestOTP(userId, type) {
    try {
      // Validate User ID is a MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format. Must be a valid MongoDB ObjectId');
      }
      
      // Create proper MongoDB ObjectId query
      const query = {
        userId: new mongoose.Types.ObjectId(userId),
        type
      };
      
      // Query the database
      const latestOTP = await OTP.findOne(query).sort({ createdAt: -1 });
      
      if (latestOTP) {
        const otpData = latestOTP.toObject();
        delete otpData.code; // Remove code for security
        return otpData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get latest OTP from database:', error);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs
   * @returns {Promise<number>} - Number of OTPs cleaned up
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } }, // Expired
          { 
            isUsed: true, 
            updatedAt: { 
              $lt: moment().subtract(30, 'days').toDate() 
            } 
          } // Used and older than 30 days
        ]
      });
      
      // Log cleanup operation
      loggingService.log('otp', 'info', 'Cleaned up expired OTPs', {
        count: result.deletedCount
      });
      
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to clean up expired OTPs:', error);
      return 0;
    }
  }
  
  /**
   * Record a successful MFA authentication
   * @param {string} userId - User ID
   * @param {string} method - MFA method used
   * @returns {Promise<void>}
   */
  async recordSuccessfulMFA(userId, method) {
    try {
      // Validate User ID is a MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format. Must be a valid MongoDB ObjectId');
      }
      
      // Find the user
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update the user's lastMfaAt field
      user.lastMfaAt = new Date();
      user.lastMfaMethod = method;
      
      await user.save();
      
      // Log MFA success
      loggingService.log('auth', 'info', 'Successful MFA authentication', {
        userId,
        method
      });
    } catch (error) {
      console.error('Failed to record MFA success:', error);
      // Non-critical, so we just log and continue
    }
  }
}

// Create and export MongoDB OTP service instance
const mongoOtpService = new MongoOtpService();
export default mongoOtpService;
