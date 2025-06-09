/**
 * OTP Authentication Service
 * Handles OTP generation, storage, and verification using MongoDB
 */
import OTPModel from '../models/OTP.js';
import User from '../models/User.js';
import * as emailService from '../../services/email.service.js';
import * as smsService from '../../services/twilio-sms.service.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate a random OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Request OTP generation and send via email or SMS
 */
export const requestOTP = async (userId, contactInfo, type = 'verification') => {
  try {
    console.log(`Generating OTP for user ${userId}, contact: ${contactInfo}, type: ${type}`);
    
    // Check for existing OTP and cooldown
    const existingOTP = await OTPModel.findOne({ 
      userId, 
      type,
      createdAt: { $gte: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) }
    });

    if (existingOTP) {
      const waitTime = Math.ceil((RESEND_COOLDOWN_SECONDS - (Date.now() - existingOTP.createdAt) / 1000));
      throw {
        status: 429,
        message: `Please wait ${waitTime} seconds before requesting a new OTP`
      };
    }
    
    // Determine if it's an email or phone number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
    const channel = isEmail ? 'email' : 'sms';

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    await OTPModel.create({
      userId,
      otp,
      type,
      expiresAt,
      attempts: 0
    });

    // Send OTP based on channel type
    if (channel === 'email') {
      const emailSubject = type === 'passwordReset' 
        ? 'Password Reset OTP - Okada Transportation'
        : 'Verification OTP - Okada Transportation';
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your One-Time Password (OTP)</h2>
          <p>Hello,</p>
          <p>Your OTP code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from Okada Transportation. Please do not reply to this email.
          </p>
        </div>
      `;

      // Create a plain text version of the message
      const emailText = `Your OTP code is: ${otp}
This code will expire in ${OTP_EXPIRY_MINUTES} minutes.
If you didn't request this code, please ignore this email.`;

      // Send email using the email service
      await emailService.sendEmail(contactInfo, emailSubject, emailText, emailHtml);
      console.log(`OTP sent successfully to email: ${contactInfo}`);
    } else {
      // Send via SMS
      const smsMessage = `Your ${type === 'passwordReset' ? 'password reset' : 'verification'} code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share with anyone.`;
      await smsService.sendSMS(contactInfo, smsMessage);
      console.log(`OTP sent successfully to phone: ${contactInfo}`);
    }

    return {
      success: true,
      expiresAt
    };
  } catch (error) {
    console.error('Error in requestOTP:', error);
    throw error;
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (userId, submittedOTP, type = 'verification') => {
  try {
    // Find the OTP record
    const otpRecord = await OTPModel.findOne({
      userId,
      type,
      verified: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw {
        status: 400,
        message: 'Invalid or expired OTP'
      };
    }

    // Check if OTP matches
    if (otpRecord.otp !== submittedOTP) {
      // Increment attempts
      otpRecord.attempts += 1;
      
      // Lock after 3 attempts
      if (otpRecord.attempts >= 3) {
        otpRecord.verified = true; // Mark as used to prevent further attempts
        await otpRecord.save();
        
        throw {
          status: 400,
          message: 'Too many incorrect attempts. Please request a new OTP.'
        };
      }
      
      await otpRecord.save();
      
      throw {
        status: 400,
        message: `Incorrect OTP. ${3 - otpRecord.attempts} attempts remaining.`
      };
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // If this is for verification, update user verification status
    if (type === 'verification') {
      const user = await User.findById(userId);
      if (user) {
        user.isVerified = true;
        user.verifiedAt = new Date();
        await user.save();

        // Generate auth token
        const token = jwt.sign(
          { 
            id: user._id, 
            email: user.email,
            role: user.role || 'passenger'
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        return {
          success: true,
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            role: user.role
          }
        };
      }
    }

    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    throw error;
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (userId, email, type = 'verification') => {
  // This uses the same logic as requestOTP
  return requestOTP(userId, email, type);
};

/**
 * Send password reset OTP
 */
export const sendPasswordResetOTP = async (userId, email) => {
  return requestOTP(userId, email, 'password_reset');
};

/**
 * Verify password reset OTP
 */
export const verifyPasswordResetOTP = async (userId, otp) => {
  return verifyOTP(userId, otp, 'password_reset');
};

/**
 * Reset password after OTP verification
 */
export const resetPassword = async (userId, newPassword) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw {
        status: 404,
        message: 'User not found'
      };
    }

    // The User model should handle password hashing in pre-save middleware
    user.password = newPassword;
    await user.save();

    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    console.error('Error in resetPassword:', error);
    throw error;
  }
};
