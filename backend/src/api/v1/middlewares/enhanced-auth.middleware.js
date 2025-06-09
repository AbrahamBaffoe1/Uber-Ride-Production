/**
 * Enhanced Authentication Middleware
 * Provides advanced security features including:
 * - Multi-factor authentication
 * - Token validation with enhanced security
 * - Fraud detection and risk assessment
 * - Rate limiting
 * - Session management
 */
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User, UserConnection, BlacklistedToken } = require('../../../models');
const cryptoService = require('../../../services/crypto.service');
const mfaService = require('../../../services/mfa.service');
const fraudDetectionService = require('../../../services/fraud-detection.service');
const Redis = require('ioredis');

// Initialize Redis client for rate limiting and session management
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Token verification options
const JWT_VERIFY_OPTIONS = {
  algorithms: ['HS256'], // Restrict to specific algorithms
  // Specify required claims
  complete: true, // Get full decoded token
  ignoreExpiration: false, // Enforce token expiration
};

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 100, // max requests per window
  WINDOW_SECONDS: 60, // window size in seconds
  BLOCK_DURATION: 300, // block duration in seconds after exceeding limit
};

/**
 * Verify JWT token with enhanced security
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token
 * @throws {Error} - If token is invalid
 */
const verifyToken = async (token) => {
  try {
    // First check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.findOne({ where: { token } });
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);
    
    // Additional security checks
    // 1. Check token type (if using different types)
    if (decoded.payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    // 2. Check token version (for forced logout)
    const user = await User.findByPk(decoded.payload.id);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.tokenVersion && decoded.payload.tokenVersion !== user.tokenVersion) {
      throw new Error('Token version mismatch');
    }
    
    return decoded.payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Apply rate limiting to requests
 * @param {string} key - Key for rate limiting (usually IP or user ID)
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {number} windowSeconds - Window size in seconds
 * @returns {Promise<{limited: boolean, remaining: number, resetIn: number}>} - Rate limit info
 */
const applyRateLimit = async (key, maxRequests = RATE_LIMIT.MAX_REQUESTS, windowSeconds = RATE_LIMIT.WINDOW_SECONDS) => {
  try {
    const now = Date.now();
    const rateKey = `ratelimit:${key}`;
    
    // Check if currently blocked
    const blockKey = `ratelimit:block:${key}`;
    const blocked = await redis.exists(blockKey);
    if (blocked) {
      const ttl = await redis.ttl(blockKey);
      return { limited: true, remaining: 0, resetIn: ttl };
    }
    
    // Get current window timestamp
    const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds;
    const windowKey = `${rateKey}:${windowStart}`;
    
    // Increment request count
    const count = await redis.incr(windowKey);
    
    // Set expiry if it's a new key
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds * 2); // Give some buffer
    }
    
    const remaining = Math.max(0, maxRequests - count);
    
    // If exceeded, block for a duration
    if (count > maxRequests) {
      await redis.setex(blockKey, RATE_LIMIT.BLOCK_DURATION, 1);
      return { limited: true, remaining: 0, resetIn: RATE_LIMIT.BLOCK_DURATION };
    }
    
    // Calculate reset time
    const resetIn = windowSeconds - Math.floor((now / 1000) % windowSeconds);
    
    return { limited: false, remaining, resetIn };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open for rate limiting errors
    return { limited: false, remaining: 1, resetIn: 0 };
  }
};

/**
 * Track request metadata for security analysis
 * @param {Object} req - Express request object
 * @param {string} userId - User ID
 */
const trackRequestMetadata = async (req, userId) => {
  try {
    // Extract metadata from request
    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'],
      deviceType: req.headers['x-device-type'],
      appVersion: req.headers['x-app-version'],
      // Location might be provided by mobile app
      location: req.headers['x-location'] ? JSON.parse(req.headers['x-location']) : null,
      // Request details
      method: req.method,
      path: req.path,
      timestamp: new Date(),
    };
    
    // Store metadata for analysis
    // This could be pushed to a queue for async processing
    // or stored directly in the database
    console.log(`[Request Metadata] User ${userId}:`, metadata);
    
    // Save connection info asynchronously (don't await)
    UserConnection.create({
      id: uuidv4(),
      userId,
      connectionId: metadata.deviceId || uuidv4(),
      device: metadata.deviceType || 'unknown',
      deviceType: metadata.deviceType || 'unknown',
      appVersion: metadata.appVersion || 'unknown',
      ipAddress: metadata.ipAddress || 'unknown',
      location: metadata.location ? JSON.stringify(metadata.location) : null,
      isActive: true,
      connectedAt: new Date(),
    }).catch(err => console.error('Failed to save connection info:', err));
  } catch (error) {
    console.error('Failed to track request metadata:', error);
    // Non-critical, so just log error
  }
};

/**
 * Enhanced authentication middleware
 * Validates JWT token and adds user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const enhancedAuthenticate = async (req, res, next) => {
  try {
    // Extract token from headers
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        code: 401, 
        message: 'Authentication required' 
      });
    }
    
    // Apply rate limiting based on IP address
    const ipAddress = req.ip || req.connection.remoteAddress;
    const rateLimit = await applyRateLimit(`auth:${ipAddress}`);
    
    if (rateLimit.limited) {
      return res.status(429).json({
        status: 'error',
        code: 429,
        message: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 60)} minutes.`,
        resetIn: rateLimit.resetIn
      });
    }
    
    // Add rate limit headers
    res.set('X-RateLimit-Limit', RATE_LIMIT.MAX_REQUESTS);
    res.set('X-RateLimit-Remaining', rateLimit.remaining);
    res.set('X-RateLimit-Reset', rateLimit.resetIn);
    
    // Verify token with enhanced security
    const decoded = await verifyToken(token);
    
    // Store user in request
    req.user = decoded;
    
    // Track request metadata for security analysis
    await trackRequestMetadata(req, decoded.id);
    
    // Check user's risk score
    const riskScore = await fraudDetectionService.getRiskScore(decoded.id);
    
    // Add risk score to user object for other middleware
    req.user.riskScore = riskScore;
    
    // If risk score exceeds review threshold, log for monitoring
    if (riskScore.score >= fraudDetectionService.scoreThresholds.REVIEW) {
      console.warn(`[HIGH RISK] User ${decoded.id} with risk score ${riskScore.score} (${riskScore.level}) accessing ${req.path}`);
    }
    
    // If risk score exceeds restrict threshold, add warning header
    if (riskScore.score >= fraudDetectionService.scoreThresholds.RESTRICT) {
      res.set('X-Account-Status', 'restricted');
    }
    
    // If risk score exceeds suspend threshold, potentially block access
    if (riskScore.score >= fraudDetectionService.scoreThresholds.SUSPEND) {
      // Get user details to check account status
      const user = await User.findByPk(decoded.id);
      
      if (user && user.status === 'suspended') {
        return res.status(403).json({
          status: 'error',
          code: 403,
          message: 'Account suspended due to suspicious activity. Please contact support.'
        });
      }
    }
    
    // Check if user needs MFA
    const mfaStatus = await mfaService.getMFAStatus(decoded.id);
    req.user.mfaStatus = mfaStatus;
    
    // If MFA is enabled, check if this request needs MFA verification
    // Typically done by another middleware specific to routes that need MFA
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(401).json({ 
      status: 'error', 
      code: 401, 
      message: error.message || 'Invalid or expired token' 
    });
  }
};

/**
 * MFA verification middleware
 * Ensures user has completed MFA for sensitive routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireMFA = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error', 
        code: 401, 
        message: 'Authentication required' 
      });
    }
    
    // Check if user has MFA enabled
    if (!req.user.mfaStatus?.enabled) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Two-factor authentication required for this operation. Please set up 2FA in your account settings.'
      });
    }
    
    // Check if user has completed MFA for this session
    const sessionId = req.headers['x-session-id'];
    if (!sessionId) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Session ID required',
        requiresMFA: true
      });
    }
    
    // Check if MFA is validated for this session
    const mfaVerifiedKey = `mfa:verified:${req.user.id}:${sessionId}`;
    const mfaVerified = await redis.exists(mfaVerifiedKey);
    
    if (!mfaVerified) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Two-factor authentication required for this operation',
        requiresMFA: true,
        methods: req.user.mfaStatus.methods
      });
    }
    
    next();
  } catch (error) {
    console.error('MFA verification error:', error);
    
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Failed to verify two-factor authentication'
    });
  }
};

/**
 * Verify MFA code for a session
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {string} method - MFA method ('totp', 'sms', 'email')
 * @param {string} code - Verification code
 * @returns {Promise<boolean>} - Whether verification was successful
 */
const verifyMFA = async (userId, sessionId, method, code) => {
  try {
    let verified = false;
    
    // Verify based on method
    switch (method) {
      case 'totp':
        // Verify TOTP code (would normally use a TOTP library)
        verified = await mfaService.confirmTOTPSetup(userId, code);
        break;
        
      case 'sms':
        // Verify SMS OTP
        verified = await mfaService.verifyOTP(userId, code);
        break;
        
      case 'email':
        // Verify email code
        verified = await mfaService.verifyEmailCode(userId, code);
        break;
        
      case 'backup':
        // Verify backup code
        verified = await mfaService.verifyBackupCode(userId, code);
        break;
        
      default:
        throw new Error('Invalid MFA method');
    }
    
    if (verified) {
      // Mark session as MFA verified
      const mfaVerifiedKey = `mfa:verified:${userId}:${sessionId}`;
      await redis.set(mfaVerifiedKey, '1');
      await redis.expire(mfaVerifiedKey, 4 * 60 * 60); // 4 hours
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
};

/**
 * Check if user has permission based on roles
 * @param {Array<string>} roles - Roles that are allowed
 * @returns {Function} - Middleware function
 */
const hasRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error', 
        code: 401, 
        message: 'Authentication required' 
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasPermission = roles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        status: 'error', 
        code: 403, 
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

/**
 * Check if user risk score allows the action
 * @param {number} maxRiskScore - Maximum allowed risk score
 * @returns {Function} - Middleware function
 */
const checkRiskScore = (maxRiskScore) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error', 
        code: 401, 
        message: 'Authentication required' 
      });
    }
    
    // If risk score is already in user object, use it
    let riskScore = req.user.riskScore;
    
    // Otherwise, get it from fraud detection service
    if (!riskScore) {
      riskScore = await fraudDetectionService.getRiskScore(req.user.id);
    }
    
    if (riskScore.score > maxRiskScore) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: 'Action restricted due to account security concerns. Please contact support.'
      });
    }
    
    next();
  };
};

module.exports = { 
  enhancedAuthenticate, 
  requireMFA, 
  verifyMFA, 
  hasRole, 
  checkRiskScore 
};
