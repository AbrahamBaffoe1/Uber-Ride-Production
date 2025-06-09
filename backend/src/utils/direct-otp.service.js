/**
 * Direct MongoDB OTP Service
 * Handles OTP operations using the MongoDB driver directly to bypass Mongoose timeouts
 */
import crypto from 'crypto';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { getRiderDb, getPassengerDb } from './mongo-client.js';
import { sendSMS, isValidPhoneNumber } from '../services/sms.service.js';
import * as emailService from '../services/email.service.js';
import * as loggingService from '../services/logging.service.js';

class DirectOtpService {
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
   * Create and save OTP in database
   * @param {string} userId - User ID
   * @param {string} type - OTP type ('verification', 'passwordReset', 'login')
   * @param {string} identifier - Phone number or email (optional)
   * @returns {Promise<Object>} - Created OTP object
   */
  async createOTP(userId, type, identifier = null) {
    try {
      // Get the appropriate db
      const db = await getRiderDb(); // We'll use rider db for OTPs
      const otpCollection = db.collection('otps');
      
      // Ensure the userId is a valid MongoDB ObjectId
      let userIdObj;
      try {
        if (ObjectId.isValid(userId)) {
          userIdObj = new ObjectId(userId);
        } else {
          // For temporary IDs or non-ObjectId user IDs
          userIdObj = userId;
        }
      } catch (error) {
        console.error('Invalid user ID format:', error);
        throw new Error('Invalid user ID format for OTP creation');
      }
      
      // Invalidate existing unused OTPs of the same type
      await otpCollection.updateMany(
        { 
          userId: userIdObj,
          type,
          isUsed: false
        },
        { $set: { isUsed: true } }
      );

      // Check for recent OTP creation to prevent abuse
      const recentOtpCursor = await otpCollection.find({
        userId: userIdObj,
        type,
        createdAt: { $gt: new Date(moment().subtract(this.RESEND_COOLDOWN_SECONDS, 'seconds').toDate()) }
      }).sort({ createdAt: -1 }).limit(1);
      
      const recentOTP = await recentOtpCursor.next();

      if (recentOTP) {
        const secondsSinceCreation = moment().diff(moment(recentOTP.createdAt), 'seconds');
        const timeRemaining = this.RESEND_COOLDOWN_SECONDS - secondsSinceCreation;
        
        // Log OTP cooldown violation attempt
        loggingService.log('otp', 'warn', 'Cooldown period violation attempt', {
          userId: userId.toString(),
          type,
          identifier,
          secondsSinceLastRequest: secondsSinceCreation,
          cooldownSeconds: this.RESEND_COOLDOWN_SECONDS
        });
        
        throw new Error(`Please wait ${timeRemaining} seconds before requesting a new code`);
      }

      // Generate new OTP
      const code = this.generateOTP();
      
      // Create OTP document
      const otpDoc = {
        userId: userIdObj,
        code,
        type,
        identifier,
        expiresAt: new Date(moment().add(this.OTP_EXPIRY_MINUTES, 'minutes').toDate()),
        isUsed: false,
        attempts: 0,
        createdAt: new Date()
      };
      
      // Insert the document
      const result = await otpCollection.insertOne(otpDoc);
      
      // Add the ID to the document
      otpDoc._id = result.insertedId;

      // Log OTP creation
      loggingService.log('otp', 'info', 'OTP created', {
        userId: userId.toString(),
        type,
        identifier: identifier?.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 chars
        otpId: otpDoc._id.toString()
      });

      return {
        id: otpDoc._id,
        code, // Need this for sending, will be masked in logs
        expiresAt: otpDoc.expiresAt
      };
    } catch (error) {
      // Log error
      loggingService.log('otp', 'error', 'Failed to create OTP', {
        userId: userId.toString(),
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
      // SMS service already has built-in fallback to Twilio when needed
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
      
      // Send email using Nodemailer
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
      // Get the appropriate db
      const db = await getRiderDb(); // We'll use rider db for OTPs
      const otpCollection = db.collection('otps');
      
      // Convert to MongoDB ObjectId if valid
      let userIdObj;
      try {
        if (ObjectId.isValid(userId)) {
          userIdObj = new ObjectId(userId);
        } else {
          // For temporary IDs or non-ObjectId user IDs
          userIdObj = userId;
        }
      } catch (error) {
        console.error('Invalid user ID format:', error);
        throw new Error('Invalid user ID format');
      }
      
      // Find the latest unused OTP of the specified type for this user
      const otpCursor = await otpCollection.find({
        userId: userIdObj,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() } // Not expired
      }).sort({ createdAt: -1 }).limit(1);
      
      const otp = await otpCursor.next();
      
      if (!otp) {
        // Log verification attempt against expired or non-existent OTP
        loggingService.log('otp', 'warn', 'Verification attempt with expired or non-existent OTP', {
          userId: userId.toString(),
          type,
          attemptedCode: code?.substring(0, 2) + '****' // Only log first 2 digits for security
        });
        
        throw new Error('Verification code expired or not found. Please request a new one.');
      }
      
      // Increment attempts
      const attempts = (otp.attempts || 0) + 1;
      await otpCollection.updateOne(
        { _id: otp._id },
        { $set: { attempts: attempts } }
      );
      
      // Check if max attempts reached
      if (attempts > this.MAX_ATTEMPTS) {
        // Mark as used/invalid
        await otpCollection.updateOne(
          { _id: otp._id },
          { $set: { isUsed: true } }
        );
        
        // Log max attempts exceeded
        loggingService.log('otp', 'warn', 'Max verification attempts exceeded', {
          userId: userId.toString(),
          type,
          otpId: otp._id.toString(),
          attempts: attempts,
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
        await otpCollection.updateOne(
          { _id: otp._id },
          { $set: { isUsed: true } }
        );
        
        // Track successful verification
        loggingService.trackOtpMetric('verification', otp.identifier?.includes('@') ? 'email' : 'sms', true, {
          userId: userId.toString(),
          type,
          otpId: otp._id.toString(),
          attempts: attempts
        });
        
        // Handle specific actions based on OTP type
        if (type === 'verification') {
          try {
            // Update user's verification status based on identifier type
            // Try to find user in both rider and passenger DBs
            let user = null;
            let userDb = null;
            
            // First try rider DB
            const riderDb = await getRiderDb();
            user = await riderDb.collection('users').findOne(
              { _id: userIdObj }
            );
            
            if (user) {
              userDb = riderDb;
            } else {
              // If not found, try passenger DB
              const passengerDb = await getPassengerDb();
              user = await passengerDb.collection('users').findOne(
                { _id: userIdObj }
              );
              
              if (user) {
                userDb = passengerDb;
              }
            }
            
            // If user is found, update verification status
            if (user && userDb) {
              const updateFields = {};
              
              if (otp.identifier && otp.identifier.includes('@')) {
                // Email verification
                updateFields.isEmailVerified = true;
              } else if (otp.identifier) {
                // Phone verification
                updateFields.isPhoneVerified = true;
              }
              
              updateFields.isVerified = true; // Set overall verification true as well
              updateFields.updatedAt = new Date();
              
              // Update the user
              await userDb.collection('users').updateOne(
                { _id: userIdObj },
                { $set: updateFields }
              );
            }
          } catch (dbError) {
            console.error('Error updating user verification status:', dbError);
            // Continue and return success even if this part fails
          }
        }
        
        return true;
      }
      
      // Track failed verification
      loggingService.trackOtpMetric('verification', otp.identifier?.includes('@') ? 'email' : 'sms', false, {
        userId: userId.toString(),
        type,
        otpId: otp._id.toString(),
        attempts: attempts
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
}

// Create and export Direct OTP service instance
const directOtpService = new DirectOtpService();
export default directOtpService;
