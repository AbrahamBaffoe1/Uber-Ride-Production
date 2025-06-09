/**
 * Auth Controller
 * Handles authentication-related API endpoints
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../../../models');
const otpService = require('../../../services/otp.service');

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, countryCode } = req.body;
    
    // Basic validation
    if (!firstName || !lastName || (!email && !phone) || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }
    
    // Check if email or phone already exists
    const existingUser = await User.findOne({
      where: email ? { email } : { phone }
    });
    
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: email ? 'Email already in use' : 'Phone number already in use'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      countryCode,
      role: 'user',
      emailVerified: false,
      phoneVerified: false
    });
    
    // Generate and send verification OTP
    if (email) {
      await otpService.sendOTPviaEmail(user.id, 'verification', email);
    } else {
      await otpService.sendOTPviaSMS(user.id, 'verification', phone);
    }
    
    // Return success without sensitive data
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully. Please verify your account.',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

/**
 * Login a user
 * @route POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email/phone and password are required'
      });
    }
    
    // Find user by email or phone
    const user = await User.findOne({
      where: {
        [identifier.includes('@') ? 'email' : 'phone']: identifier
      }
    });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check if user verification is required
    if (!user.emailVerified && !user.phoneVerified) {
      // Generate a temporary token for verification flow
      const tempToken = jwt.sign(
        { id: user.id, role: user.role, isTemp: true },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // Short expiration for verification flow
      );
      
      // Try to send OTP automatically
      try {
        if (user.email) {
          await otpService.sendOTPviaEmail(user.id, 'verification', user.email);
        } else if (user.phone) {
          await otpService.sendOTPviaSMS(user.id, 'verification', user.phone);
        }
      } catch (otpError) {
        console.error('Error sending OTP during login verification:', otpError);
        // Continue even if OTP sending fails
      }
      
      // Return success with verification required flag
      return res.status(200).json({
        status: 'success',
        message: 'Login successful but verification required',
        data: {
          requiresVerification: true,
          userId: user.id,
          tempToken: tempToken,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role
          }
        }
      });
    }
    
    // Generate login OTP if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Send OTP based on user's preferred method
      if (user.twoFactorMethod === 'email' && user.email) {
        await otpService.sendOTPviaEmail(user.id, 'login', user.email);
      } else if (user.phone) {
        await otpService.sendOTPviaSMS(user.id, 'login', user.phone);
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Login verification code sent',
        data: {
          requiresOTP: true,
          userId: user.id
        }
      });
    }
    
    // Generate auth tokens
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
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
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        tokens: {
          access: token,
          refresh: refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

/**
 * Request OTP for various purposes
 * @route POST /api/v1/auth/request-otp
 */
exports.requestOTP = async (req, res) => {
  try {
    const { identifier, type = 'verification' } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone number is required'
      });
    }
    
    // Validate OTP type
    const validTypes = ['verification', 'passwordReset', 'login'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP type'
      });
    }
    
    // Check if email format or phone format
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+\d{10,15}$/.test(identifier);
    
    if (!isEmail && !isPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or phone format'
      });
    }
    
    // Find user by email or phone
    const user = await User.findOne({
      where: {
        [isEmail ? 'email' : 'phone']: identifier
      }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate and send OTP
    let result;
    if (isEmail) {
      result = await otpService.sendOTPviaEmail(user.id, type, identifier);
    } else {
      result = await otpService.sendOTPviaSMS(user.id, type, identifier);
    }
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: `Verification code sent to your ${isEmail ? 'email' : 'phone'}`,
      data: {
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send verification code'
    });
  }
};

/**
 * Password reset request
 * @route POST /api/v1/auth/reset-password-request
 */
exports.resetPasswordRequest = async (req, res) => {
  try {
    const { identifier } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone is required'
      });
    }
    
    // Check if email format or phone format
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+\d{10,15}$/.test(identifier);
    
    if (!isEmail && !isPhone) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or phone format'
      });
    }
    
    // Find user by email or phone
    const user = await User.findOne({
      where: {
        [isEmail ? 'email' : 'phone']: identifier
      }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate and send OTP
    let result;
    if (isEmail) {
      result = await otpService.sendOTPviaEmail(user.id, 'passwordReset', identifier);
    } else {
      result = await otpService.sendOTPviaSMS(user.id, 'passwordReset', identifier);
    }
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: `Password reset code sent to your ${isEmail ? 'email' : 'phone'}`,
      data: {
        userId: user.id,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to send password reset code'
    });
  }
};

/**
 * Reset password with OTP
 * @route POST /api/v1/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body;
    
    if (!userId || !code || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID, verification code, and new password are required'
      });
    }
    
    // Verify OTP
    const isValid = await otpService.verifyOTP(userId, code, 'passwordReset');
    
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification code'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    await User.update(
      { password: hashedPassword },
      { where: { id: userId } }
    );
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to reset password'
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Return success with new access token
    return res.status(200).json({
      status: 'success',
      data: {
        token: newAccessToken
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired refresh token'
    });
  }
};

/**
 * Enable/Disable Two-Factor Authentication
 * @route POST /api/v1/auth/two-factor
 */
exports.toggleTwoFactor = async (req, res) => {
  try {
    const { userId, enable, method = 'sms' } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Validate method
    if (method !== 'sms' && method !== 'email') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid method. Use "sms" or "email"'
      });
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user
    await User.update(
      {
        twoFactorEnabled: enable,
        twoFactorMethod: method
      },
      { where: { id: userId } }
    );
    
    // Return success
    return res.status(200).json({
      status: 'success',
      message: enable ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
      data: {
        twoFactorEnabled: enable,
        twoFactorMethod: method
      }
    });
  } catch (error) {
    console.error('Error toggling two-factor authentication:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};
