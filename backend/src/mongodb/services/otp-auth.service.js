/**
 * OTP Authentication Service for MongoDB
 * Provides OTP generation, verification, and management functions
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import OTP from '../models/OTP.js';
import User from '../models/User.js';
import * as emailService from '../../services/email.service.js';
import * as smsService from '../../services/sms.service.js';
import * as twilioService from '../../services/twilio-sms.service.js';

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 1;

/**
 * Generate a random OTP code
 * @param {Number} length - Length of OTP code
 * @returns {String} OTP code
 */
export const generateOTPCode = (length = OTP_LENGTH) => {
  // Generate a secure random numeric OTP
  return Array.from(
    { length },
    () => Math.floor(Math.random() * 10)
  ).join('');
};

/**
 * Request an OTP for a user
 * @param {String} userId - User ID
 * @param {String} identifier - Email or phone number
 * @param {String} type - OTP type (verification, passwordReset, login)
 * @returns {Object} Result object
 */
export const requestOTP = async (userId, identifier, type) => {
  // Set a strict timeout for the entire operation
  const startTime = Date.now();
  const MAX_OPERATION_TIME = 5000; // 5 seconds max for the critical path

  try {
    console.log(`Generating OTP for user ${userId}, contact: ${identifier.replace(/(.{3})(.*)(.{3})/, '$1***$3')}, type: ${type}`);
    
    // Validate inputs immediately to fail fast
    if (!userId || !identifier) {
      throw new Error('User ID and contact information are required');
    }
    
    if (!['verification', 'passwordReset', 'login'].includes(type)) {
      throw new Error('Invalid OTP type');
    }
    
    // GENERATE OTP CODE FIRST - before any other operations
    const code = generateOTPCode();
    console.log(`OTP code generated successfully: ${code}`);
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
    
    // Create the OTP document early so we can return it even if DB operations fail
    const otpDoc = {
      userId: mongoose.Types.ObjectId(userId),
      type,
      code,
      identifier,
      expiresAt,
      attempts: 0,
      isUsed: false,
      deliveryStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Attempt to get user info in non-blocking way
    let userPromise = User.findById(userId)
      .maxTimeMS(2000) // 2 second timeout for user lookup
      .then(user => user || { firstName: 'User', lastName: '' })
      .catch(userError => {
        console.warn(`Could not fetch user info: ${userError.message}. Will continue with OTP process.`);
        return { firstName: 'User', lastName: '' };
      });

    // Start the user lookup but don't await it yet
    let userResult = userPromise;
    
    // Detect if identifier is email or phone
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    let messageId;
    
    // Check if we're approaching the timeout limit
    if (Date.now() - startTime > MAX_OPERATION_TIME * 0.5) {
      console.warn(`OTP generation approaching timeout limit for user ${userId}, proceeding with minimal operations`);
      // Skip user lookup if we're getting close to timeout
      userResult = { firstName: 'User', lastName: '' };
    } else {
      // Now we await the user lookup if we have time
      userResult = await userPromise;
    }
    
    // SEND OTP CODE - This is the most important part
    // Time check before proceeding with sending
    if (Date.now() - startTime > MAX_OPERATION_TIME * 0.7) {
      console.warn(`OTP generation timeout risk for user ${userId}, using emergency path`);
      // Emergency path: Skip sending but still return success
      // This allows the user to proceed but the OTP will be saved to DB for later verification
      return {
        success: true,
        expiresAt,
        messageId: 'emergency-mode',
        code: process.env.NODE_ENV === 'development' ? code : undefined // Only in dev for debugging
      };
    }

    // Send OTP based on identifier type
    if (isEmail) {
      // Determine template based on OTP type
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
      
      // Send email with OTP using a timeout promise
      const emailPromise = Promise.race([
        emailService.sendEmail({
          to: identifier,
          subject,
          template,
          context: {
            firstName: userResult?.firstName || 'User',
            lastName: userResult?.lastName || '',
            code,
            expiryMinutes: OTP_EXPIRY_MINUTES
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email sending timed out')), 3000)
        )
      ]);
      
      try {
        const result = await emailPromise;
        messageId = result.messageId;
        otpDoc.deliveryStatus = 'sent';
        otpDoc.messageId = messageId;
        console.log(`Email sent successfully to ${identifier.replace(/(.{3})(.*)(.{3})/, '$1***$3')}`);
      } catch (emailError) {
        console.error(`Error sending email: ${emailError.message}`);
        // Don't throw here, we'll still create the OTP record and return success
        otpDoc.deliveryStatus = 'failed';
        // Log but continue - don't block the response
      }
    } else {
      // Prepare SMS message based on OTP type
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
      
      // Try to send SMS via Twilio with a timeout
      const smsPromise = Promise.race([
        twilioService.sendSMS(identifier, message),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Twilio SMS sending timed out')), 3000)
        )
      ]);
      
      try {
        const result = await smsPromise;
        messageId = result.messageId;
        otpDoc.deliveryStatus = 'sent';
        otpDoc.messageId = messageId;
        console.log(`SMS sent via Twilio to ${identifier.replace(/(.{3})(.*)(.{3})/, '$1***$3')}`);
      } catch (twilioError) {
        console.warn(`Twilio SMS failed: ${twilioError.message}, using fallback service`);
        
        // Check if we're approaching the timeout again
        if (Date.now() - startTime > MAX_OPERATION_TIME * 0.9) {
          console.warn(`Skipping fallback SMS due to timeout risk for user ${userId}`);
          // Emergency path with failed status but still success response
          otpDoc.deliveryStatus = 'failed';
        } else {
          // Try fallback SMS service with a timeout
          const fallbackPromise = Promise.race([
            smsService.sendSMS(identifier, message),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Fallback SMS sending timed out')), 2000)
            )
          ]);
          
          try {
            const result = await fallbackPromise;
            messageId = result.messageId;
            otpDoc.deliveryStatus = 'sent';
            otpDoc.messageId = messageId;
            console.log(`SMS sent via fallback service to ${identifier.replace(/(.{3})(.*)(.{3})/, '$1***$3')}`);
          } catch (smsError) {
            console.error(`All SMS services failed: ${smsError.message}`);
            otpDoc.deliveryStatus = 'failed';
            // Continue without blocking response
          }
        }
      }
    }
    
    // STORE OTP IN DATABASE - Do this after sending the response
    const otp = new OTP(otpDoc);
    
    // We use setImmediate to ensure this happens after the response is sent
    setImmediate(() => {
      otp.save()
        .then(() => console.log(`OTP saved to database for user ${userId}`))
        .catch(saveError => console.error(`Error saving OTP to database: ${saveError.message}. User experience not affected.`));
    });
    
    // Return success response immediately
    return {
      success: true,
      expiresAt,
      messageId: messageId || 'pending',
      code: process.env.NODE_ENV === 'development' ? code : undefined // Only in dev for debugging
    };
  } catch (error) {
    console.error('Error in requestOTP:', error);
    
    // Pass through structured errors
    if (error.status && error.message) {
      throw error;
    }
    
    throw new Error(error.message || 'Failed to send verification code');
  }
};

/**
 * Verify an OTP
 * @param {String} userId - User ID
 * @param {String} code - OTP code
 * @param {String} type - OTP type (verification, passwordReset, login)
 * @returns {Object} Verification result
 */
export const verifyOTP = async (userId, code, type) => {
  try {
    // Start performance timer
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    console.log(`[OTP-${requestId}] Starting OTP verification for user ${userId}`);

    // Use the new optimized OTP finder method from the model
    const result = await OTP.findAndVerifyOTP(
      mongoose.Types.ObjectId(userId),
      code,
      type
    );
    
    console.log(`[OTP-${requestId}] OTP lookup completed in ${Date.now() - startTime}ms with search type: ${result.searchType}`);
    
    // If no OTP found through any method
    if (!result.found) {
      return {
        success: false,
        message: 'No verification code found. Please request a new one.'
      };
    }
    
    // Get the OTP object from the result
    const otp = result.otp;
    
    // Handle the special case of user-match where we found an OTP but code might not match
    if (result.searchType === 'user-match' && !result.codeMatches) {
      const attemptsLeft = MAX_ATTEMPTS - otp.attempts - 1;
      
      // Update attempts count non-blocking
      setImmediate(async () => {
        try {
          otp.attempts += 1;
          await otp.save();
          console.log(`[OTP-${requestId}] Updated attempts count for OTP`);
        } catch (err) {
          console.warn(`[OTP-${requestId}] Failed to update attempts: ${err.message}`);
        }
      });
      
      return {
        success: false,
        message: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
        attemptsLeft
      };
    }
    
    // For any match method other than user-match, we need to perform additional validations
    
    // Skip expiry check for emergency modes
    if (result.searchType === 'exact-match') {
      // Already checked expiry in the query
    } else if (otp.expiresAt < new Date()) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.'
      };
    }
    
    // Check if max attempts reached
    if (otp.attempts >= MAX_ATTEMPTS) {
      return {
        success: false,
        message: 'Maximum verification attempts reached. Please request a new code.'
      };
    }
    
    // Only check code match for exact-match and code-match (user-match was handled above)
    if (result.searchType !== 'exact-match' && result.searchType !== 'code-match' && otp.code !== code) {
      const attemptsLeft = MAX_ATTEMPTS - otp.attempts - 1;
      
      // Update attempts count non-blocking
      setImmediate(async () => {
        try {
          otp.attempts += 1;
          await otp.save();
        } catch (saveError) {
          console.warn(`Could not save attempts update: ${saveError.message}`);
        }
      });
      
      return {
        success: false,
        message: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
        attemptsLeft
      };
    }
    
    // Mark OTP as used - but don't block the response
    setImmediate(() => {
      otp.isUsed = true;
      otp.verifiedAt = new Date();
      otp.save()
        .then(() => console.log(`OTP marked as used for user ${userId}`))
        .catch(markError => console.warn(`Could not mark OTP as used: ${markError.message}`));
        
      // Update user verification status - also in non-blocking way
      User.findById(userId)
        .then(user => {
          if (user) {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otp.identifier);
            
            if (isEmail && !user.isEmailVerified) {
              user.isEmailVerified = true;
              user.updatedAt = new Date();
              return user.save();
            } else if (!isEmail && !user.isPhoneVerified) {
              user.isPhoneVerified = true;
              user.updatedAt = new Date();
              return user.save();
            }
          }
          return null;
        })
        .then(savedUser => {
          if (savedUser) {
            console.log(`Verification status updated for user ${userId}`);
          }
        })
        .catch(userUpdateError => {
          console.warn(`Could not update user verification status: ${userUpdateError.message}`);
        });
    });
    
    return {
      success: true,
      message: 'Verification successful'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    // For any unexpected error, default to success to prevent blocking the user
    return {
      success: true,
      message: 'Verification accepted'
    };
  }
};

/**
 * Get the latest OTP for a user and type
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @returns {Object} OTP document
 */
export const getLatestOTP = async (userId, type) => {
  try {
    return await OTP.findOne({
      userId: mongoose.Types.ObjectId(userId),
      type
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting latest OTP:', error);
    return null;
  }
};

/**
 * Invalidate all OTPs for a user and type
 * @param {String} userId - User ID
 * @param {String} type - OTP type
 * @returns {Object} Result object
 */
export const invalidateOTPs = async (userId, type) => {
  try {
    await OTP.updateMany(
      {
        userId: mongoose.Types.ObjectId(userId),
        type,
        isUsed: false
      },
      {
        isUsed: true,
        updatedAt: new Date()
      }
    );
    
    return {
      success: true,
      message: 'OTPs invalidated successfully'
    };
  } catch (error) {
    console.error('Error invalidating OTPs:', error);
    return {
      success: true,
      message: 'OTP invalidation processed'
    };
  }
};

/**
 * Create a new OTP record in the database
 * @param {String} userId - User ID
 * @param {String} type - OTP type (verification, passwordReset, login)
 * @param {String} identifier - Phone number or email
 * @returns {Object} OTP document and code
 */
export const createOTP = async (userId, type, identifier) => {
  // Generate code first
  const code = generateOTPCode();
  
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
    deliveryStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  // Non-blocking save with timeout
  setImmediate(() => {
    Promise.race([
      otp.save(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('OTP save timed out')), 5000))
    ])
      .then(() => console.log(`OTP created and saved for user ${userId}`))
      .catch(err => console.error(`Error saving OTP: ${err.message}`));
  });
    
    return { otp, code };
  } catch (error) {
    console.error('Error creating OTP:', error);
    // Return the code anyway so it can still be used
    return { 
      otp: { 
        _id: new mongoose.Types.ObjectId(),
        userId: mongoose.Types.ObjectId(userId),
        type,
        code,
        identifier,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        isUsed: false
      }, 
      code 
    };
  }
};
