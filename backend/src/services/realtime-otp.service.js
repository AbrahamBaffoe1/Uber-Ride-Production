/**
 * Realtime OTP Service
 * Handles OTP generation, sending, and verification using MongoDB and Nodemailer
 */
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import * as loggingService from './logging.service.js';
import dotenv from 'dotenv';

dotenv.config();

// Define OTP schema with TTL index
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  userId: { type: String, required: true },
  type: { type: String, required: true, enum: ['verification', 'passwordReset', 'login'] },
  attempts: { type: Number, default: 0 }, // Track verification attempts
  createdAt: { type: Date, default: Date.now, expires: 600 } // TTL index: document expires after 10 minutes
});

// Add indexes for faster lookups
otpSchema.index({ userId: 1, type: 1 });
otpSchema.index({ email: 1 });
otpSchema.index({ createdAt: -1 });

// Create or retrieve OTP model
let OTPModel;
const modelName = 'OTP';

// Check if the model exists already
if (mongoose.modelNames().includes(modelName)) {
  console.log(`Using existing ${modelName} model`);
  OTPModel = mongoose.model(modelName);
} else {
  console.log(`Creating new ${modelName} model with schema`);
  OTPModel = mongoose.model(modelName, otpSchema);
  
  // Ensure indexes are created
  OTPModel.createIndexes().then(() => {
    console.log('OTP model indexes created successfully');
  }).catch(err => {
    console.error('Error creating OTP model indexes:', err);
  });
}

class RealtimeOtpService {
  constructor() {
    this.OTP_LENGTH = 6; // 6-digit OTP
    this.OTP_EXPIRY_MINUTES = 10; // 10 minutes expiry
    this.MAX_ATTEMPTS = 5; // Max verification attempts
    this.RESEND_COOLDOWN_SECONDS = 60; // 1 minute cooldown for resending
    
    // Initialize email transporter
    this.initializeTransporter();
  }
  
  /**
   * Initialize the Nodemailer transporter
   */
  initializeTransporter() {
    try {
      // Validate required SMTP environment variables
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Missing required SMTP environment variables. Email functionality may not work properly.');
      }
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        // Adding these options to work around Gmail security restrictions
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log('Realtime OTP service: Nodemailer transporter created with configured credentials');
    } catch (error) {
      console.error('Realtime OTP service: Error creating nodemailer transporter:', error);
      this.transporter = null;
    }
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
   * Create and save OTP in MongoDB
   * @param {string} userId - User ID
   * @param {string} type - OTP type ('verification', 'passwordReset', 'login')
   * @param {string} identifier - Email address
   * @returns {Promise<Object>} - Created OTP object
   */
  async createOTP(userId, type, identifier) {
    try {
      // Check if email is valid
      if (!identifier || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
        throw new Error('Invalid email address format');
      }
      
      // Set a longer timeout for database operations to handle potential network latency
      const timeoutMs = 15000; // 15 seconds - increased from 10 seconds to handle network latency
      
      // Find existing OTPs for this user and type and delete them
      try {
        await Promise.race([
          OTPModel.deleteMany({ userId, type }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Delete operation timed out')), timeoutMs)
          )
        ]);
      } catch (deleteError) {
        console.warn(`Failed to delete existing OTPs: ${deleteError.message}`);
        // Continue even if delete fails
      }
      
      // Check for recent OTP creation to prevent abuse
      let recentOTP = null;
      try {
        recentOTP = await Promise.race([
          OTPModel.findOne({
            userId,
            type,
            createdAt: { $gt: new Date(Date.now() - this.RESEND_COOLDOWN_SECONDS * 1000) }
          }).sort({ createdAt: -1 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Find operation timed out')), timeoutMs)
          )
        ]);
      } catch (findError) {
        console.warn(`Failed to check for recent OTPs: ${findError.message}`);
        // Continue even if find fails
      }
      
      if (recentOTP) {
        const secondsSinceCreation = Math.floor((Date.now() - recentOTP.createdAt) / 1000);
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
      const otp = this.generateOTP();
      
      // Create OTP record in MongoDB
      const otpRecord = await OTPModel.create({
        userId,
        email: identifier,
        otp,
        type,
        createdAt: new Date()
      });
      
      // Log OTP creation
      loggingService.log('otp', 'info', 'OTP created', {
        userId,
        type,
        identifier: identifier?.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 chars
        otpId: otpRecord._id
      });
      
      return {
        id: otpRecord._id.toString(),
        expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000)
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
   * Send OTP via email
   * @param {string} userId - User ID
   * @param {string} type - OTP type
   * @param {string} email - Email address to send OTP to
   * @returns {Promise<Object>} - Send result with OTP details
   */
  async sendOTPviaEmail(userId, type, email) {
    try {
      // Track OTP request metric
      loggingService.trackOtpMetric('request', 'email', true, {
        userId,
        type,
        email: email.replace(/(.{2})(.*)(?=@)/g, '$1***') // Mask email
      });
      
      // Create OTP
      const otpData = await this.createOTP(userId, type, email);
      
      // Get the OTP from MongoDB
      const otpRecord = await OTPModel.findOne({ userId, type }).sort({ createdAt: -1 });
      if (!otpRecord) {
        throw new Error('Failed to retrieve OTP record');
      }
      
      // Prepare email
      const appName = 'Okada Ride Africa';
      let subject;
      let textContent;
      let htmlContent;
      
      switch (type) {
        case 'verification':
          subject = `${appName} - Email Verification`;
          textContent = `Your email verification code is: ${otpRecord.otp}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Verification</h2>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otpRecord.otp}
              </div>
              <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p>If you did not request this, please ignore this email.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
            </div>
          `;
          break;
        case 'passwordReset':
          subject = `${appName} - Password Reset`;
          textContent = `Your password reset code is: ${otpRecord.otp}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please contact our support team immediately.`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset</h2>
              <p>Your password reset code is:</p>
              <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otpRecord.otp}
              </div>
              <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p>If you did not request this, please contact our support team immediately.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
            </div>
          `;
          break;
        case 'login':
          subject = `${appName} - Login Verification`;
          textContent = `Your login verification code is: ${otpRecord.otp}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not attempt to log in, please secure your account immediately.`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Login Verification</h2>
              <p>Your login verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otpRecord.otp}
              </div>
              <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p>If you did not attempt to log in, please secure your account immediately.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
            </div>
          `;
          break;
        default:
          subject = `${appName} - Verification Code`;
          textContent = `Your verification code is: ${otpRecord.otp}\n\nThis code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, please ignore this email.`;
          htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verification Code</h2>
              <p>Your verification code is:</p>
              <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
                ${otpRecord.otp}
              </div>
              <p>This code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.</p>
              <p>If you did not request this, please ignore this email.</p>
              <hr>
              <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
            </div>
          `;
      }
      
      // Check if transporter is initialized
      if (!this.transporter) {
        this.initializeTransporter();
        if (!this.transporter) {
          throw new Error('Email transporter not initialized');
        }
      }
      
      // Email options
      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Okada Ride Africa'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      };
      
      // Send email using Nodemailer
      const info = await this.transporter.sendMail(mailOptions);
      
      // Track successful OTP delivery
      loggingService.trackOtpMetric('delivery', 'email', true, {
        userId,
        type,
        email: email.replace(/(.{2})(.*)(?=@)/g, '$1***'), // Mask email
        messageId: info.messageId
      });
      
      // Return result
      return {
        success: true,
        messageId: info.messageId,
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
      // Set a longer timeout for database operations to handle potential network latency
      const timeoutMs = 15000; // 15 seconds
      
      // Find the latest OTP for this user and type
      let otp;
      try {
        otp = await Promise.race([
          OTPModel.findOne({ userId, type }).sort({ createdAt: -1 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Find operation timed out')), timeoutMs)
          )
        ]);
      } catch (findError) {
        console.warn(`Failed to find OTP: ${findError.message}`);
        // Don't auto-approve on timeout - this is a security risk
        // Instead, throw an appropriate error that the client can handle
        throw new Error('Database operation timed out. Please try again.');
      }
      
      if (!otp) {
        // Log verification attempt against non-existent OTP
        loggingService.log('otp', 'warn', 'Verification attempt with non-existent OTP', {
          userId,
          type,
          attemptedCode: code?.substring(0, 2) + '****' // Only log first 2 digits for security
        });
        
        // Never auto-approve OTP verification, even in development mode
        // This is a security risk that could lead to unauthorized access
        throw new Error('Verification code expired or not found. Please request a new one.');
      }
      
      // Check if OTP is expired
      const expiryTime = new Date(otp.createdAt.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
      if (expiryTime < new Date()) {
        // Log verification attempt against expired OTP
        loggingService.log('otp', 'warn', 'Verification attempt with expired OTP', {
          userId,
          type,
          otpId: otp._id,
          expiryTime
        });
        
        // Delete expired OTP
        await OTPModel.deleteOne({ _id: otp._id });
        
        throw new Error('Verification code expired. Please request a new one.');
      }
      
      // Increment attempts counter
      otp.attempts += 1;
      await otp.save();
      
      // Check if max attempts reached
      if (otp.attempts > this.MAX_ATTEMPTS) {
        // Log max attempts exceeded
        loggingService.log('otp', 'warn', 'Max verification attempts exceeded', {
          userId,
          type,
          otpId: otp._id,
          attempts: otp.attempts,
          maxAttempts: this.MAX_ATTEMPTS
        });
        
        // Delete the OTP to prevent further attempts
        await OTPModel.deleteOne({ _id: otp._id });
        
        throw new Error(`Too many failed attempts. Please request a new verification code.`);
      }
      
      // Compare codes
      const isValid = otp.otp === code;
      
      if (isValid) {
        // Delete the OTP to prevent reuse
        await OTPModel.deleteOne({ _id: otp._id });
        
        // Track successful verification
        loggingService.trackOtpMetric('verification', 'email', true, {
          userId,
          type,
          otpId: otp._id,
          attempts: otp.attempts
        });
        
        return true;
      }
      
      // Track failed verification
      loggingService.trackOtpMetric('verification', 'email', false, {
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
      switch(type) {
        case 'verification':
          return { success: true, message: 'Account verified successfully' };
          
        case 'passwordReset':
          return { success: true, message: 'Password reset verification successful' };
          
        case 'login':
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
   * Clean up expired OTPs
   * @returns {Promise<number>} - Number of OTPs cleaned up
   */
  async cleanupExpiredOTPs() {
    try {
      const expiryTime = new Date(Date.now() - this.OTP_EXPIRY_MINUTES * 60 * 1000);
      const result = await OTPModel.deleteMany({ createdAt: { $lt: expiryTime } });
      
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
}

// Create and export realtime OTP service instance
const realtimeOtpService = new RealtimeOtpService();
export default realtimeOtpService;
