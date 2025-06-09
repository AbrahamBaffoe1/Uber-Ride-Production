/**
 * OTP Authentication Service
 * Provides OTP generation, verification, and password reset functionality
 * Uses environment variables for all configurable settings
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import OTP from '../models/OTP.js';
import * as emailService from '../../services/email.service.js';

// Load environment variables
dotenv.config();

// OTP configuration from environment
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_EXPIRATION_MINUTES = parseInt(process.env.OTP_EXPIRATION_MINUTES || '10', 10);

// Create nodemailer transporter with environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Generate a random numeric OTP
 * @param {number} length - Length of the OTP
 * @returns {string} - Generated OTP
 */
function generateOTP(length = OTP_LENGTH) {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

/**
 * Request OTP generation and send via email
 * @param {string} userId - The ID of the user
 * @param {string} email - The target email address
 * @returns {Promise<object>} - An object containing the expiration date
 */
const requestOTP = async (userId, email) => {
  try {
    if (!userId || !email) {
      throw new Error('UserId and email are required');
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRATION_MINUTES);

    // Delete any existing OTPs for this user
    await OTP.deleteMany({ userId });

    // Save new OTP to database
    const newOTP = new OTP({
      userId,
      identifier: email,
      code: otp,
      type: 'verification',
      expiresAt: expiresAt,
      provider: 'realtime'
    });
    await newOTP.save();

    // Option 1: Use the email service if using existing infrastructure
    await emailService.sendVerificationEmail(email, otp);
    
    /* Option 2: Direct nodemailer usage if email service not working
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}. It will expire at ${expiresAt.toLocaleTimeString()}.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in ${OTP_EXPIRATION_MINUTES} minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    */

    return {
      success: true,
      message: 'OTP sent successfully to your email',
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error in OTP generation:', error);
    throw {
      success: false,
      message: 'Failed to generate and send OTP',
      error: error.message
    };
  }
};

/**
 * Verify a submitted OTP for a given user
 * @param {string} userId - The ID of the user
 * @param {string} submittedOTP - The OTP submitted by the user
 * @returns {Promise<object>} - An object with a token and user data upon success
 */
const verifyOTP = async (userId, submittedOTP) => {
  try {
    if (!userId || !submittedOTP) {
      throw new Error('UserId and OTP are required');
    }

    // Find the most recent OTP entry for this user
    const otpRecord = await OTP.findOne({ userId, type: 'verification' }).sort({ createdAt: -1 });

    // If no OTP record found
    if (!otpRecord) {
      throw { status: 400, message: 'No OTP has been requested for this user' };
    }
    
    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw { status: 400, message: 'OTP has expired' };
    }

    // Check if OTP matches
    if (submittedOTP === otpRecord.code) {
      // OTP matches - implement all required actions
      
      // 1. Update user verification status
      const user = await User.findByIdAndUpdate(
        userId, 
        { 
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw { status: 404, message: 'User not found' };
      }
      
      // 2. Generate JWT authentication token
      const token = jwt.sign(
        { id: userId, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '1h' }
      );
      
      // 3. Delete the used OTP
      await OTP.deleteOne({ _id: otpRecord._id });

      return {
        success: true,
        message: 'OTP verified successfully',
        token: token,
        user: {
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: true,
          role: user.role
        }
      };
    } else {
      // OTP doesn't match
      throw new Error('Invalid OTP');
    }
  } catch (error) {
    console.error('Error in OTP verification:', error);
    throw {
      success: false,
      message: error.message || 'Failed to verify OTP'
    };
  }
};

/**
 * Resend OTP (generates a new one if an active OTP isn't present)
 * @param {string} userId - The ID of the user
 * @param {string} email - The target email address
 * @returns {Promise<object>}
 */
const resendOTP = async (userId, email) => {
  try {
    if (!userId || !email) {
      throw new Error('UserId and email are required');
    }

    // Check if previous OTP exists and when it was sent
    const existingOTP = await OTP.findOne({ userId, type: 'verification' }).sort({ createdAt: -1 });
    
    if (existingOTP) {
      // Check if OTP is still valid
      if (new Date() < existingOTP.expiresAt) {
        // Calculate time since last OTP in seconds
        const timeElapsed = (Date.now() - existingOTP.createdAt.getTime()) / 1000;
        
        // If less than 30 seconds since last OTP, prevent resend to avoid abuse
        if (timeElapsed < 30) {
          throw new Error(`Please wait ${Math.ceil(30 - timeElapsed)} seconds before requesting another OTP`);
        }
      }
      
      // Delete the existing OTP
      await OTP.deleteOne({ _id: existingOTP._id });
    }

    // Generate and send new OTP (reusing the request-otp logic)
    return await requestOTP(userId, email);
  } catch (error) {
    console.error('Error in OTP resend:', error);
    throw {
      success: false,
      message: error.message || 'Failed to resend OTP'
    };
  }
};

/**
 * Send an OTP for password reset
 * @param {string} userId - The ID of the user
 * @param {string} email - The target email address
 * @returns {Promise<object>}
 */
const sendPasswordResetOTP = async (userId, email) => {
  try {
    if (!userId || !email) {
      throw new Error('UserId and email are required');
    }

    // Generate new OTP
    const otp = generateOTP();
    
    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRATION_MINUTES);

    // Delete any existing password reset OTPs for this user
    await OTP.deleteMany({ userId, type: 'passwordReset' });

    // Save new OTP to database
    const newOTP = new OTP({
      userId,
      identifier: email,
      code: otp,
      type: 'passwordReset',
      expiresAt: expiresAt,
      provider: 'realtime'
    });
    await newOTP.save();

    // Option 1: Use email service
    await emailService.sendPasswordResetEmail(email, otp);
    
    /* Option 2: Direct nodemailer usage
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is: ${otp}. It will expire at ${expiresAt.toLocaleTimeString()}.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Your password reset code is:</p>
          <div style="background-color: #f4f4f4; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in ${OTP_EXPIRATION_MINUTES} minutes.</p>
          <p>If you did not request this, please contact our support team immediately.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    */

    return {
      success: true,
      message: 'Password reset OTP sent successfully to your email',
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error in password reset OTP generation:', error);
    throw {
      success: false,
      message: 'Failed to generate and send password reset OTP',
      error: error.message
    };
  }
};

/**
 * Verify the password reset OTP
 * @param {string} userId - The ID of the user
 * @param {string} submittedOTP - The OTP submitted by the user
 * @returns {Promise<object>}
 */
const verifyPasswordResetOTP = async (userId, submittedOTP) => {
  try {
    if (!userId || !submittedOTP) {
      throw new Error('UserId and OTP are required');
    }

    // Find the most recent password reset OTP entry for this user
    const otpRecord = await OTP.findOne({ userId, type: 'passwordReset' }).sort({ createdAt: -1 });

    // If no OTP record found
    if (!otpRecord) {
      throw { status: 400, message: 'No password reset OTP request found' };
    }
    
    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      throw { status: 400, message: 'Password reset OTP has expired' };
    }

    // Check if OTP matches
    if (submittedOTP === otpRecord.code) {
      // OTP matches - don't delete it yet, it will be deleted after password reset
      return {
        success: true,
        message: 'Password reset OTP verified successfully',
        userId: userId
      };
    } else {
      // OTP doesn't match
      throw new Error('Invalid password reset OTP');
    }
  } catch (error) {
    console.error('Error in password reset OTP verification:', error);
    throw {
      success: false,
      message: error.message || 'Failed to verify password reset OTP'
    };
  }
};

/**
 * Reset the user's password
 * @param {string} userId - The ID of the user
 * @param {string} newPassword - The new password to be set
 * @returns {Promise<void>}
 */
const resetPassword = async (userId, newPassword) => {
  try {
    if (!userId || !newPassword) {
      throw { status: 400, message: 'UserId and new password are required' };
    }

    // Update user password
    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    // Set the new password (will be hashed by the User model pre-save hook)
    user.password = newPassword;
    await user.save();

    // Delete all password reset OTPs for this user
    await OTP.deleteMany({ userId, type: 'passwordReset' });

    return {
      success: true,
      message: 'Password reset successful'
    };
  } catch (error) {
    console.error('Error in password reset:', error);
    throw {
      success: false,
      message: error.message || 'Failed to reset password'
    };
  }
};

export {
  requestOTP,
  verifyOTP,
  resendOTP,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword
};
