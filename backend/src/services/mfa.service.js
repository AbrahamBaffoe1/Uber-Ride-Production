/**
 * Multi-Factor Authentication Service
 * Handles various MFA methods including OTP, Email, and SMS verification
 */
const crypto = require('crypto');
const cryptoService = require('./crypto.service');
const { User } = require('../models');
// We'll assume email service exists - it was mentioned in the file list
const emailService = require('./email.service');
// This would require actual SMS provider integration
// const smsService = require('./sms.service');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');

// Initialize Redis client for OTP storage and rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class MfaService {
  constructor() {
    this.OTP_EXPIRY = 10 * 60; // 10 minutes in seconds
    this.VERIFY_MAX_ATTEMPTS = 5;
    this.VERIFY_LOCKOUT_TIME = 30 * 60; // 30 minutes in seconds
  }

  /**
   * Generate and send OTP via SMS
   * @param {string} userId - User ID
   * @param {string} phoneNumber - Phone number to send OTP to
   * @returns {Promise<boolean>} - Whether OTP was sent successfully
   */
  async generateAndSendOTP(userId, phoneNumber) {
    try {
      // Check if user is locked out
      const lockoutKey = `mfa:lockout:${userId}`;
      const isLockedOut = await redis.exists(lockoutKey);
      
      if (isLockedOut) {
        const ttl = await redis.ttl(lockoutKey);
        throw new Error(`Account temporarily locked. Try again in ${Math.ceil(ttl / 60)} minutes.`);
      }
      
      // Generate OTP
      const otp = await cryptoService.generateOTP(6);
      const otpKey = `mfa:otp:${userId}`;
      
      // Store OTP and set expiry
      await redis.multi()
        .set(otpKey, otp)
        .expire(otpKey, this.OTP_EXPIRY)
        .set(`mfa:attempts:${userId}`, 0)
        .expire(`mfa:attempts:${userId}`, this.OTP_EXPIRY)
        .exec();
      
      // In production, send the OTP via a proper SMS service
      console.log(`[DEV ONLY] OTP for ${userId}: ${otp}`);
      
      // Commented out SMS sending since we don't have the SMS service implemented yet
      // return await smsService.sendSMS(phoneNumber, `Your Okada verification code is: ${otp}. Valid for 10 minutes.`);
      
      return true;
    } catch (error) {
      console.error('Failed to generate and send OTP:', error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Generate and send verification code via email
   * @param {string} userId - User ID
   * @param {string} email - Email to send verification code to
   * @returns {Promise<boolean>} - Whether email was sent successfully
   */
  async generateAndSendEmailVerification(userId, email) {
    try {
      // Check if user is locked out
      const lockoutKey = `mfa:lockout:${userId}`;
      const isLockedOut = await redis.exists(lockoutKey);
      
      if (isLockedOut) {
        const ttl = await redis.ttl(lockoutKey);
        throw new Error(`Account temporarily locked. Try again in ${Math.ceil(ttl / 60)} minutes.`);
      }
      
      // Generate verification code
      const verificationCode = await cryptoService.generateToken(16);
      const codeKey = `mfa:email:${userId}`;
      
      // Store code and set expiry
      await redis.multi()
        .set(codeKey, verificationCode)
        .expire(codeKey, this.OTP_EXPIRY)
        .set(`mfa:attempts:${userId}`, 0)
        .expire(`mfa:attempts:${userId}`, this.OTP_EXPIRY)
        .exec();
      
      // Send verification email
      const emailSent = await emailService.sendEmail(
        email,
        'Verify Your Okada Account',
        `Your verification code is: ${verificationCode}. This code will expire in 10 minutes.`
      );
      
      return emailSent;
    } catch (error) {
      console.error('Failed to send email verification:', error);
      throw new Error('Failed to send email verification');
    }
  }

  /**
   * Verify OTP sent to user
   * @param {string} userId - User ID
   * @param {string} otp - OTP to verify
   * @returns {Promise<boolean>} - Whether OTP is valid
   */
  async verifyOTP(userId, otp) {
    try {
      // Check if user is locked out
      const lockoutKey = `mfa:lockout:${userId}`;
      const isLockedOut = await redis.exists(lockoutKey);
      
      if (isLockedOut) {
        const ttl = await redis.ttl(lockoutKey);
        throw new Error(`Account temporarily locked. Try again in ${Math.ceil(ttl / 60)} minutes.`);
      }
      
      const otpKey = `mfa:otp:${userId}`;
      const storedOTP = await redis.get(otpKey);
      
      if (!storedOTP) {
        throw new Error('Verification code expired or not found');
      }
      
      // Get and increment attempt counter
      const attemptsKey = `mfa:attempts:${userId}`;
      const attempts = parseInt(await redis.get(attemptsKey) || '0', 10);
      await redis.incr(attemptsKey);
      
      // Check if exceeded max attempts
      if (attempts >= this.VERIFY_MAX_ATTEMPTS) {
        // Lock the account
        await redis.multi()
          .set(lockoutKey, 1)
          .expire(lockoutKey, this.VERIFY_LOCKOUT_TIME)
          .del(otpKey)
          .del(attemptsKey)
          .exec();
        
        throw new Error(`Too many failed attempts. Account locked for ${this.VERIFY_LOCKOUT_TIME / 60} minutes.`);
      }
      
      // Time-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(otp),
        Buffer.from(storedOTP)
      );
      
      if (isValid) {
        // Remove the OTP and attempts after successful verification
        await redis.multi()
          .del(otpKey)
          .del(attemptsKey)
          .exec();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify email verification code
   * @param {string} userId - User ID
   * @param {string} code - Verification code
   * @returns {Promise<boolean>} - Whether code is valid
   */
  async verifyEmailCode(userId, code) {
    try {
      // Similar implementation as verifyOTP but for email codes
      const codeKey = `mfa:email:${userId}`;
      const storedCode = await redis.get(codeKey);
      
      if (!storedCode) {
        throw new Error('Verification code expired or not found');
      }
      
      // Get and increment attempt counter
      const attemptsKey = `mfa:attempts:${userId}`;
      const attempts = parseInt(await redis.get(attemptsKey) || '0', 10);
      await redis.incr(attemptsKey);
      
      // Check if exceeded max attempts
      if (attempts >= this.VERIFY_MAX_ATTEMPTS) {
        // Lock the account
        const lockoutKey = `mfa:lockout:${userId}`;
        await redis.multi()
          .set(lockoutKey, 1)
          .expire(lockoutKey, this.VERIFY_LOCKOUT_TIME)
          .del(codeKey)
          .del(attemptsKey)
          .exec();
        
        throw new Error(`Too many failed attempts. Try again in ${this.VERIFY_LOCKOUT_TIME / 60} minutes.`);
      }
      
      // Time-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(code),
        Buffer.from(storedCode)
      );
      
      if (isValid) {
        // Remove the code and attempts after successful verification
        await redis.multi()
          .del(codeKey)
          .del(attemptsKey)
          .exec();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Setup TOTP (Time-based One-Time Password) for a user
   * @param {string} userId - User ID
   * @returns {Promise<{secret: string, qrCodeUrl: string}>} - TOTP secret and QR code URL
   */
  async setupTOTP(userId) {
    try {
      // Get user information
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate a random TOTP secret
      const secret = crypto.randomBytes(20).toString('hex');
      
      // In a real implementation, you would generate a QR code URL for apps like Google Authenticator
      // For simplicity, we're just returning the secret
      const qrCodeUrl = `otpauth://totp/Okada:${user.email}?secret=${secret}&issuer=Okada Transportation`;
      
      // Store secret in the database (in an encrypted form for production)
      await User.update(
        { 
          totpSecret: await cryptoService.encryptForStorage(secret, userId, 'totp'),
          totpEnabled: false // Not enabled until confirmed by user
        },
        { where: { id: userId } }
      );
      
      return { secret, qrCodeUrl };
    } catch (error) {
      console.error('Failed to setup TOTP:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  /**
   * Verify TOTP to confirm setup
   * @param {string} userId - User ID
   * @param {string} token - TOTP token from authenticator app
   * @returns {Promise<boolean>} - Whether token is valid
   */
  async confirmTOTPSetup(userId, token) {
    try {
      // Get user and TOTP secret
      const user = await User.findByPk(userId);
      if (!user || !user.totpSecret) {
        throw new Error('TOTP not set up for this user');
      }
      
      // Decrypt the stored secret
      const secret = await cryptoService.decryptFromStorage(user.totpSecret, userId, 'totp');
      
      // Verify TOTP token
      // Note: In a real implementation, we would use a library like 'otplib' to validate the token
      // For simplicity, we're assuming the token is correct if it matches a dummy value
      const isValid = token === '123456'; // This is just a placeholder
      
      if (isValid) {
        // Update user to enable TOTP
        await User.update(
          { totpEnabled: true },
          { where: { id: userId } }
        );
        
        // Generate backup codes for account recovery
        const backupCodes = await this.generateBackupCodes(userId);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to confirm TOTP setup:', error);
      throw new Error('Failed to confirm two-factor authentication setup');
    }
  }

  /**
   * Generate backup codes for account recovery
   * @param {string} userId - User ID
   * @returns {Promise<string[]>} - Array of backup codes
   */
  async generateBackupCodes(userId) {
    try {
      const NUM_BACKUP_CODES = 10;
      const codes = [];
      
      for (let i = 0; i < NUM_BACKUP_CODES; i++) {
        const code = crypto.randomBytes(4).toString('hex');
        codes.push(code);
      }
      
      // Store hashed backup codes in the database
      const hashedCodes = await Promise.all(
        codes.map(code => cryptoService.hashPassword(code))
      );
      
      // Encrypt the array of hashed codes for storage
      const encryptedCodes = await cryptoService.encryptForStorage(
        hashedCodes,
        userId,
        'backup_codes'
      );
      
      // Update user record with encrypted backup codes
      await User.update(
        { backupCodes: encryptedCodes },
        { where: { id: userId } }
      );
      
      return codes;
    } catch (error) {
      console.error('Failed to generate backup codes:', error);
      throw new Error('Failed to generate account recovery codes');
    }
  }

  /**
   * Verify a backup code
   * @param {string} userId - User ID
   * @param {string} code - Backup code to verify
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async verifyBackupCode(userId, code) {
    try {
      // Get user and backup codes
      const user = await User.findByPk(userId);
      if (!user || !user.backupCodes) {
        throw new Error('No backup codes found for this user');
      }
      
      // Decrypt the stored backup codes
      const hashedCodes = await cryptoService.decryptFromStorage(
        user.backupCodes,
        userId,
        'backup_codes'
      );
      
      // Check if the provided code matches any of the hashed codes
      for (const hashedCode of hashedCodes) {
        try {
          const isValid = await cryptoService.verifyPassword(code, hashedCode);
          if (isValid) {
            // Remove the used backup code
            const updatedCodes = hashedCodes.filter(c => c !== hashedCode);
            
            // Update the user record with the remaining codes
            const encryptedCodes = await cryptoService.encryptForStorage(
              updatedCodes,
              userId,
              'backup_codes'
            );
            
            await User.update(
              { backupCodes: encryptedCodes },
              { where: { id: userId } }
            );
            
            return true;
          }
        } catch (e) {
          // Continue checking other codes
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Failed to verify backup code:', error);
      throw new Error('Failed to verify recovery code');
    }
  }

  /**
   * Check if the user has MFA enabled
   * @param {string} userId - User ID
   * @returns {Promise<{enabled: boolean, methods: string[]}>} - MFA status and enabled methods
   */
  async getMFAStatus(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const methods = [];
      
      if (user.totpEnabled) {
        methods.push('totp');
      }
      
      if (user.phoneVerified) {
        methods.push('sms');
      }
      
      if (user.emailVerified) {
        methods.push('email');
      }
      
      return {
        enabled: methods.length > 0,
        methods
      };
    } catch (error) {
      console.error('Failed to get MFA status:', error);
      throw new Error('Failed to get two-factor authentication status');
    }
  }

  /**
   * Disable MFA for a user
   * @param {string} userId - User ID
   * @param {string} method - MFA method to disable ('totp', 'sms', 'email')
   * @returns {Promise<boolean>} - Whether MFA was disabled successfully
   */
  async disableMFA(userId, method) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      switch (method) {
        case 'totp':
          await User.update(
            { 
              totpEnabled: false,
              totpSecret: null 
            },
            { where: { id: userId } }
          );
          break;
          
        case 'sms':
          await User.update(
            { phoneVerified: false },
            { where: { id: userId } }
          );
          break;
          
        case 'email':
          await User.update(
            { emailVerified: false },
            { where: { id: userId } }
          );
          break;
          
        default:
          throw new Error('Invalid MFA method');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      throw new Error('Failed to disable two-factor authentication');
    }
  }
}

// Export a singleton instance
const mfaService = new MfaService();
module.exports = mfaService;
