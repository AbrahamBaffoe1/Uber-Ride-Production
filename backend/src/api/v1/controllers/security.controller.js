/**
 * Security Controller
 * Handles multi-factor authentication, security settings, and related operations
 */
const { v4: uuidv4 } = require('uuid');
const { User, SecurityEvent } = require('../../../models');
const cryptoService = require('../../../services/crypto.service');
const mfaService = require('../../../services/mfa.service');
const fraudDetectionService = require('../../../services/fraud-detection.service');

/**
 * Get user's security status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSecurityStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get MFA status
    const mfaStatus = await mfaService.getMFAStatus(userId);
    
    // Get risk score
    const riskScore = await fraudDetectionService.getRiskScore(userId);
    
    // Get user data
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'email', 'phoneNumber', 'emailVerified', 'phoneVerified',
        'totpEnabled', 'status', 'lastLoginAt', 'createdAt', 'updatedAt'
      ]
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        code: 404,
        message: 'User not found'
      });
    }
    
    // Get recent security events
    const recentEvents = await SecurityEvent.getEventsForUser(userId, {
      limit: 5
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        mfa: mfaStatus,
        riskLevel: riskScore.level,
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          totpEnabled: user.totpEnabled,
          accountStatus: user.status,
          lastLogin: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        recentEvents: recentEvents.rows.map(event => ({
          id: event.id,
          type: event.eventType,
          severity: event.severity,
          timestamp: event.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting security status:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to get security status'
    });
  }
};

/**
 * Setup TOTP (Time-based One-Time Password) MFA
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const setupTOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate TOTP secret and QR code URL
    const setupData = await mfaService.setupTOTP(userId);
    
    // Log security event
    await SecurityEvent.logEvent({
      userId,
      eventType: SecurityEvent.EVENT_TYPES.MFA_ENABLED,
      eventDetails: { method: 'totp', setup: 'initiated' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        secret: setupData.secret,
        qrCodeUrl: setupData.qrCodeUrl
      },
      message: 'TOTP setup initiated. Scan the QR code with your authenticator app and verify with a code to complete setup.'
    });
  } catch (error) {
    console.error('Error setting up TOTP:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to setup two-factor authentication'
    });
  }
};

/**
 * Verify and complete TOTP setup
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyTOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Verification code is required'
      });
    }
    
    // Verify the token
    const verified = await mfaService.confirmTOTPSetup(userId, token);
    
    if (!verified) {
      // Log failed verification
      await SecurityEvent.logEvent({
        userId,
        eventType: SecurityEvent.EVENT_TYPES.MFA_CHALLENGE_FAILURE,
        eventDetails: { method: 'totp', action: 'verify_setup' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid verification code'
      });
    }
    
    // Log successful setup
    await SecurityEvent.logEvent({
      userId,
      eventType: SecurityEvent.EVENT_TYPES.MFA_ENABLED,
      eventDetails: { method: 'totp', setup: 'completed' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication successfully enabled',
      data: {
        enabled: true,
        method: 'totp'
      }
    });
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to verify two-factor authentication setup'
    });
  }
};

/**
 * Disable MFA for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const disableMFA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { method } = req.body;
    
    if (!method) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Method is required'
      });
    }
    
    // Disable the specified MFA method
    const disabled = await mfaService.disableMFA(userId, method);
    
    if (!disabled) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: `Failed to disable ${method} authentication`
      });
    }
    
    // Log the event
    await SecurityEvent.logEvent({
      userId,
      eventType: SecurityEvent.EVENT_TYPES.MFA_DISABLED,
      eventDetails: { method },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'high'
    });
    
    return res.status(200).json({
      status: 'success',
      message: `${method} authentication successfully disabled`,
      data: {
        method,
        disabled: true
      }
    });
  } catch (error) {
    console.error('Error disabling MFA:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to disable two-factor authentication'
    });
  }
};

/**
 * Generate and send OTP via SMS
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateSMSOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's phone number
    const user = await User.findByPk(userId);
    
    if (!user || !user.phoneNumber) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'No phone number associated with this account'
      });
    }
    
    // Generate and send OTP
    const sent = await mfaService.generateAndSendOTP(userId, user.phoneNumber);
    
    if (!sent) {
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Failed to send verification code'
      });
    }
    
    // Log the event
    await SecurityEvent.logEvent({
      userId,
      eventType: 'otp_generated',
      eventDetails: { method: 'sms' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'low'
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your phone number',
      data: {
        phoneNumber: user.phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Error generating SMS OTP:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to send verification code'
    });
  }
};

/**
 * Generate and send verification code via email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateEmailVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's email
    const user = await User.findByPk(userId);
    
    if (!user || !user.email) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'No email associated with this account'
      });
    }
    
    // Generate and send verification code
    const sent = await mfaService.generateAndSendEmailVerification(userId, user.email);
    
    if (!sent) {
      return res.status(500).json({
        status: 'error',
        code: 500,
        message: 'Failed to send verification code'
      });
    }
    
    // Log the event
    await SecurityEvent.logEvent({
      userId,
      eventType: 'verification_code_generated',
      eventDetails: { method: 'email' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'low'
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Verification code sent to your email',
      data: {
        email: user.email.replace(/(?<=.).(?=.*@)/g, '*'),
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Error generating email verification:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to send verification code'
    });
  }
};

/**
 * Verify OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otp, method, sessionId } = req.body;
    
    if (!otp) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Verification code is required'
      });
    }
    
    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Session ID is required'
      });
    }
    
    let verified = false;
    
    // Verify based on method
    switch (method) {
      case 'sms':
        verified = await mfaService.verifyOTP(userId, otp);
        break;
        
      case 'email':
        verified = await mfaService.verifyEmailCode(userId, otp);
        break;
        
      case 'totp':
      case 'backup':
        verified = await mfaService.verifyMFA(userId, sessionId, method, otp);
        break;
        
      default:
        return res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Invalid verification method'
        });
    }
    
    if (!verified) {
      // Log failed verification
      await SecurityEvent.logEvent({
        userId,
        eventType: SecurityEvent.EVENT_TYPES.MFA_CHALLENGE_FAILURE,
        eventDetails: { method },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'medium'
      });
      
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Invalid verification code'
      });
    }
    
    // For SMS and email verification methods, mark as verified in user profile
    if (method === 'sms') {
      await User.update({ phoneVerified: true }, { where: { id: userId } });
    } else if (method === 'email') {
      await User.update({ emailVerified: true }, { where: { id: userId } });
    }
    
    // Log successful verification
    await SecurityEvent.logEvent({
      userId,
      eventType: SecurityEvent.EVENT_TYPES.MFA_CHALLENGE_SUCCESS,
      eventDetails: { method },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Verification successful',
      data: {
        verified: true,
        method
      }
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: error.message || 'Failed to verify code'
    });
  }
};

/**
 * Get security event history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSecurityEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, eventType, severity, startDate, endDate } = req.query;
    
    const offset = (page - 1) * limit;
    
    const events = await SecurityEvent.getEventsForUser(userId, {
      limit: parseInt(limit),
      offset,
      eventType,
      severity,
      startDate,
      endDate
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        events: events.rows.map(event => ({
          id: event.id,
          type: event.eventType,
          details: event.eventDetails,
          severity: event.severity,
          timestamp: event.createdAt,
          ipAddress: event.ipAddress ? event.ipAddress.replace(/\d+$/, 'xxx') : null
        })),
        meta: {
          total: events.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(events.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to get security events'
    });
  }
};

module.exports = {
  getSecurityStatus,
  setupTOTP,
  verifyTOTP,
  disableMFA,
  generateSMSOTP,
  generateEmailVerification,
  verifyOTP,
  getSecurityEvents
};
