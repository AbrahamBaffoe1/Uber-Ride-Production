/**
 * Verify Controller
 * Handles verification-related API endpoints using Twilio Verify
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const verifyService = require('../../../services/verify.service');

/**
 * Send verification code
 * @route POST /api/v1/verify/send
 */
exports.sendVerification = async (req, res) => {
  try {
    const { phoneNumber, channel = 'sms' } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }
    
    // Validate phone number format
    if (!/^\+\d{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number format. Must include country code (e.g., +1234567890)'
      });
    }
    
    // Send verification via Twilio Verify
    const verification = await verifyService.sendVerificationCode(phoneNumber, channel);
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: `Verification code sent via ${channel}`,
      data: {
        sid: verification.sid,
        status: verification.status,
        channel: verification.channel,
        dateCreated: verification.date_created,
        valid: verification.valid
      }
    });
  } catch (error) {
    console.error('Error sending verification:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send verification code'
    });
  }
};

/**
 * Check verification code
 * @route POST /api/v1/verify/check
 */
exports.checkVerification = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number and verification code are required'
      });
    }
    
    // Check verification code
    const verificationCheck = await verifyService.checkVerificationCode(phoneNumber, code);
    
    return res.status(200).json({
      status: 'success',
      message: verificationCheck.valid ? 'Verification successful' : 'Verification failed',
      data: {
        valid: verificationCheck.valid,
        status: verificationCheck.status,
        sid: verificationCheck.sid
      }
    });
  } catch (error) {
    console.error('Error checking verification:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to check verification code'
    });
  }
};

/**
 * Register and verify a new user in one step
 * @route POST /api/v1/verify/register
 */
exports.registerAndVerify = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, password, email, code } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || !phoneNumber || !password || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }
    
    // Check if phone number already exists
    const existingUser = await User.findOne({
      where: { phone: phoneNumber }
    });
    
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Phone number already in use'
      });
    }
    
    // Verify phone number
    const verificationCheck = await verifyService.checkVerificationCode(phoneNumber, code);
    
    if (!verificationCheck.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with verified phone
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phoneNumber,
      password: hashedPassword,
      role: 'user',
      emailVerified: !!email,
      phoneVerified: true  // Phone is verified via Twilio Verify
    });
    
    // Generate auth tokens
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '1d' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d' }
    );
    
    // Return success with tokens
    return res.status(201).json({
      status: 'success',
      message: 'User registered and verified successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          phoneVerified: user.phoneVerified,
          emailVerified: user.emailVerified,
          role: user.role
        },
        tokens: {
          access: token,
          refresh: refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Error registering with verification:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to register user'
    });
  }
};

/**
 * Login with phone verification
 * @route POST /api/v1/verify/login
 */
exports.loginWithVerification = async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number and verification code are required'
      });
    }
    
    // Find user by phone
    const user = await User.findOne({
      where: { phone: phoneNumber }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Verify phone
    const verificationCheck = await verifyService.checkVerificationCode(phoneNumber, code);
    
    if (!verificationCheck.valid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid verification code'
      });
    }
    
    // Update user's phone verification status if not already verified
    if (!user.phoneVerified) {
      user.phoneVerified = true;
      await user.save();
    }
    
    // Generate auth tokens
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION || '1d' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION || '7d' }
    );
    
    // Return success with tokens
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: user.role
        },
        tokens: {
          access: token,
          refresh: refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Error logging in with verification:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to log in'
    });
  }
};
