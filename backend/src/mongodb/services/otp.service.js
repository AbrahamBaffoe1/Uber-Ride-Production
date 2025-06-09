/**
 * OTP Service for MongoDB
 * Handles OTP generation, verification, and tracking using MongoDB for persistent storage
 */
const crypto = require('crypto');
const moment = require('moment');
const { User } = require('../models');
const OTP = require('../models/OTP');
const { smsService } = require('../../services/sms.service');
const emailService = require('../../services/email.service');
const socketService = require('../../services/socket.service');

class MongoOtpService {
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
    // Generate a 6-digit numeric code (padded with leading zeros if needed)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  }

  /**
   * Create and save OTP in MongoDB
   * @param {string} userId - User ID
   * @param {string} type - OTP type ('verification', 'passwordReset', 'login', 'twoFactor')
   * @param {string} identifier - Phone number or email (optional)
   * @returns {Promise<Object>} - Created OTP object
   */
  async createOTP(userId, type, identifier = null) {
    try {
      // Find existing unused OTPs for this user and type and invalidate them
      await OTP.updateMany(
        { userId, type, isUsed: false },
        { isUsed: true }
      );

      // Check for recent OTP creation to prevent abuse
      const recentOTP = await OTP.findOne({
        userId,
        type,
        createdAt: { $gt: moment().subtract(this.RESEND_COOLDOWN_SECONDS, 'seconds').toDate() }
      }).sort({ createdAt: -1 });

      if (recentOTP) {
        const secondsSinceCreation = moment().diff(moment(recentOTP.createdAt), 'seconds');
        const timeRemaining = this.RESEND_COOLDOWN_SECONDS - secondsSinceCreation;
        
        throw new Error(`Please wait ${timeRemaining} seconds before requesting a new code`);
      }

      // Generate new OTP
      const code = this.generateOTP();
      
      // Create OTP record
      const otp = await OTP.create({
        userId,
        code,
        type,
        expiresAt: moment().add(this.OTP_EXPIRY_MINUTES, 'minutes').toDate(),
        isUsed: false
      });

      return {
        id: otp._id,
        expiresAt: otp.expiresAt
      };
    } catch (error) {
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

      // Generate OTP code first
      const code = this.generateOTP();
      
      // Create OTP in database
      const otp = await OTP.create({
        userId,
        code,
        type,
        expiresAt: moment().add(this.OTP_EXPIRY_MINUTES, 'minutes').toDate(),
        isUsed: false
      });
      
      // Prepare message
      const appName = 'Okada Ride Africa';
      let message;
      
      switch (type) {
        case 'verification':
          message = `[${appName}] Your verification code is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        case 'passwordReset':
          message = `[${appName}] Your password reset code is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        case 'login':
          message = `[${appName}] Your login verification code is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
          break;
        default:
          message = `[${appName}] Your verification code is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`;
      }
      
      // In production, we use the SMS service with Nodemailer as primary and Twilio as fallback
      // No fallback to console logging or test mode - we want real SMS delivery
      const result = await smsService.sendSMS(phoneNumber, message);
      
      // Return result
      return {
        id: otp._id.toString(),
        expiresAt: otp.expiresAt
      };
    } catch (error) {
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

      // Generate OTP code first
      const code = this.generateOTP();
      
      // Create OTP in database
      const otp = await OTP.create({
        userId,
        code,
        type,
        expiresAt: moment().add(this.OTP_EXPIRY_MINUTES, 'minutes').toDate(),
        isUsed: false
      });
      
      // Send the OTP via email using the enhanced Nodemailer service
      // that supports HTML and has better error handling
      switch (type) {
        case 'verification':
          await emailService.sendVerificationEmail(email, code);
          break;
        case 'passwordReset':
          await emailService.sendPasswordResetEmail(email, code);
          break;
        case 'login':
          // For login, use sendEmail with custom login email template
          const subject = `Okada Ride Africa - Login Verification`;
          const text = `Your login verification code is: ${code}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not attempt to log in, please secure your account immediately.`;
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification</h2>
              <p>Your login verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p>If you did not attempt to log in, please secure your account immediately.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
            </div>
          `;
          await emailService.sendEmail(email, subject, text, html);
          break;
        default:
          const defaultSubject = `Okada Ride Africa - Verification Code`;
          const defaultText = `Your verification code is: ${code}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`;
          await emailService.sendEmail(email, defaultSubject, defaultText);
      }
      
      // Return result (with successful delivery assumed since errors would throw)
      return {
        success: true,
        expiresAt: otp.expiresAt
      };
    } catch (error) {
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
        userId,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() } // Not expired
      }).sort({ createdAt: -1 });
      
      if (!otp) {
        // Notify users in the OTP room that the code was not found or expired
        const io = socketService.getSocketIo();
        if (io) {
          io.to(`otp:${userId}:${type}`).emit('otp:expired', {
            userId,
            type,
            message: 'Verification code expired or not found. Please request a new one.'
          });
        }
        
        throw new Error('Verification code expired or not found. Please request a new one.');
      }
      
      // Compare codes (plain comparison for MongoDB implementation)
      const isValid = code === otp.code;
      
      // Get Socket.IO instance
      const io = socketService.getSocketIo();
      
      if (isValid) {
        // Mark as used
        otp.isUsed = true;
        await otp.save();
        
        // Handle specific actions based on OTP type
        if (type === 'verification') {
          // Update user's verification status
          const user = await User.findById(userId);
          if (!user) {
            throw new Error('User not found');
          }
          
          if (user.email) {
            // Email verification
            user.isEmailVerified = true;
            await user.save();
          } else if (user.phoneNumber) {
            // Phone verification
            user.isPhoneVerified = true;
            await user.save();
          }
        }
        
        // Emit real-time verification event through WebSocket
        if (io) {
          // Emit to user's specific OTP room
          io.to(`otp:${userId}:${type}`).emit('otp:verified', {
            userId,
            type,
            success: true,
            message: 'Verification successful'
          });
          
          // Also emit to general user room
          io.to(`otp:${userId}`).emit('otp:verified', {
            userId,
            type,
            success: true,
            message: 'Verification successful'
          });
        }
        
        return true;
      } else {
        // Emit verification failure event
        if (io) {
          io.to(`otp:${userId}:${type}`).emit('otp:verification_failed', {
            userId,
            type,
            success: false,
            message: 'Invalid verification code'
          });
        }
        
        return false;
      }
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
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
      const otp = await OTP.findOne({ userId, type }).sort({ createdAt: -1 });
      return otp;
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
      // Note: With TTL index set on expiresAt, MongoDB will automatically delete
      // expired documents. This method will only clean up used OTPs older than 30 days.
      const result = await OTP.deleteMany({
        isUsed: true,
        createdAt: { $lt: moment().subtract(30, 'days').toDate() }
      });
      
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to clean up expired OTPs:', error);
      return 0;
    }
  }
}

// Create and export MongoDB OTP service instance
const mongoOtpService = new MongoOtpService();
module.exports = mongoOtpService;
