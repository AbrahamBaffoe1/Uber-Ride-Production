/**
 * OTP Service
 * Handles OTP generation, verification, and tracking using PostgreSQL for persistent storage
 */
const crypto = require('crypto');
const moment = require('moment');
const { Op } = require('sequelize');
const { User, OTP } = require('../models');

// In-memory storage for OTPs when using memory mode
const memoryStore = new Map();
const STORAGE_MODE = process.env.OTP_STORAGE_MODE || 'mongodb'; // mongodb|memory
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Auto-cleanup expired OTPs for memory store
setInterval(() => {
  const now = Date.now();
  for (const [key, otp] of memoryStore.entries()) {
    if (otp.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);
const { smsService } = require('./sms.service');
const emailService = require('./email.service');
const loggingService = require('./logging.service');

class OtpService {
  constructor() {
    this.OTP_LENGTH = 6; // 6-digit OTP
    this.OTP_EXPIRY_MINUTES = 10; // 10 minutes expiry
    this.MAX_ATTEMPTS = 5; // Max verification attempts
    this.RESEND_COOLDOWN_SECONDS = 60; // 1 minute cooldown for resending
  }

  /**
   * Generate a random OTP
   * @returns {string} - Generated OTP
   */
  generateOTP() {
    // Generate a numeric code with OTP_LENGTH digits
    // Calculate the range based on OTP_LENGTH (e.g., 6 digits = 100000 to 999999)
    const min = Math.pow(10, this.OTP_LENGTH - 1);
    const max = Math.pow(10, this.OTP_LENGTH) - 1;
    const otp = Math.floor(min + Math.random() * (max - min + 1)).toString();
    
    // Log the generated OTP in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      console.log(`Generated OTP: ${otp}`);
    }
    
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
      // Find existing unused OTPs for this user and type and invalidate them
      await OTP.update(
        { isUsed: true },
        {
          where: {
            userId,
            type,
            isUsed: false
          }
        }
      );

      // Check for recent OTP creation to prevent abuse
      const recentOTP = await OTP.findOne({
        where: {
          userId,
          type,
          createdAt: {
            [Op.gt]: moment().subtract(this.RESEND_COOLDOWN_SECONDS, 'seconds').toDate()
          }
        },
        order: [['createdAt', 'DESC']]
      });

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
      
      // Create OTP record
      const otp = await OTP.create({
        userId,
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
        otpId: otp.id
      });

      return {
        id: otp.id,
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
      // No fallbacks - we want errors to propagate in production
      const result = await smsService.sendSMS(phoneNumber, message);
      
      // Track successful OTP delivery
      loggingService.trackOtpMetric('delivery', 'sms', result.status === 'delivered', {
        userId,
        type,
        phoneNumber: phoneNumber.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 digits
        messageId: result.messageId,
        provider: smsService.getActiveProvider()
      });
      
      // Return result
      return {
        success: result.status === 'delivered',
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
      // Find the latest unused OTP of the specified type for this user
      const otp = await OTP.findOne({
        where: {
          userId,
          type,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date() // Not expired
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
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
      otp.attempts += 1;
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
          otpId: otp.id,
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
          otpId: otp.id,
          attempts: otp.attempts
        });
        
        // Handle specific actions based on OTP type
        if (type === 'verification') {
          // Update user's verification status based on identifier type
          const user = await User.findByPk(userId);
          if (!user) {
            throw new Error('User not found');
          }
          
          if (otp.identifier && otp.identifier.includes('@')) {
            // Email verification
            user.emailVerified = true;
            await user.save();
          } else if (otp.identifier) {
            // Phone verification
            user.phoneVerified = true;
            await user.save();
          }
        }
        
        return true;
      }
      
      // Track failed verification
      loggingService.trackOtpMetric('verification', otp.identifier?.includes('@') ? 'email' : 'sms', false, {
        userId,
        type,
        otpId: otp.id,
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
      const user = await User.findByPk(userId);
      
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
   * Record successful MFA
   * @param {string} userId - User ID
   * @param {string} method - MFA method used
   * @returns {Promise<void>}
   */
  async recordSuccessfulMFA(userId, method) {
    try {
      // If you have a security events table, record the event
      if (global.models && global.models.SecurityEvent) {
        await global.models.SecurityEvent.create({
          userId,
          eventType: 'mfa_success',
          details: { method },
          ipAddress: '0.0.0.0', // In a real implementation, you would get this from the request
          userAgent: 'unknown' // In a real implementation, you would get this from the request
        });
      }
      
      // Log successful MFA
      loggingService.log('auth', 'info', 'Successful MFA verification', {
        userId,
        method
      });
    } catch (error) {
      console.error('Failed to record successful MFA:', error);
      // Don't throw, this is a non-critical operation
    }
  }

  /**
   * Get the latest OTP for a user of a specific type
   * @param {string} userId - User ID
   * @param {string} type - OTP type
   * @returns {Promise<Object>} - OTP object
   */
  async getLatestOTP(userId, type) {
    try {
      const otp = await OTP.findOne({
        where: {
          userId,
          type
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Return otp without the code for security in production
      if (otp) {
        const { code, ...otpData } = otp.toJSON();
        return otpData;
      }
      return null;
    } catch (error) {
      console.error('Failed to get latest OTP:', error);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs
   * @returns {Promise<number>} - Number of OTPs cleaned up
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.destroy({
        where: {
          [Op.or]: [
            { expiresAt: { [Op.lt]: new Date() } }, // Expired
            { 
              isUsed: true, 
              updatedAt: { 
                [Op.lt]: moment().subtract(30, 'days').toDate() 
              } 
            } // Used and older than 30 days
          ]
        }
      });
      
      // Log cleanup operation
      loggingService.log('otp', 'info', 'Cleaned up expired OTPs', {
        count: result
      });
      
      return result;
    } catch (error) {
      console.error('Failed to clean up expired OTPs:', error);
      return 0;
    }
  }
}

// Create and export OTP service instance
const otpService = new OtpService();
module.exports = otpService;
