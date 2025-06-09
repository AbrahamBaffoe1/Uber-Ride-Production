/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Authenticate user based on JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid token'
      });
    }
    
    // Attach user data to request
    req.user = {
      id: decoded.id,
      role: decoded.role || 'user'
    };
    
    // Log authentication
    console.log(`User authenticated: ${req.user.id} (${req.user.role})`);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Invalid token'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Authentication failed: ' + (error.message || 'Unknown error')
    });
  }
};

/**
 * Check if user has required role
 * @param {String|Array} roles - Required role(s)
 * @returns {Function} - Express middleware function
 */
export const hasRole = (roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Convert single role to array
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has required role
    if (requiredRoles.includes(req.user.role)) {
      return next();
    }
    
    // User doesn't have required role
    return res.status(403).json({
      success: false,
      message: 'Access denied: Insufficient permissions'
    });
  };
};

/**
 * Check if user has any of the required roles
 * @param {Array} roles - Array of roles
 * @returns {Function} - Express middleware function
 */
export const hasAnyRole = (roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has any of the required roles
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    // User doesn't have any of the required roles
    return res.status(403).json({
      success: false,
      message: 'Access denied: Insufficient permissions'
    });
  };
};

export default {
  authenticate,
  hasRole,
  hasAnyRole
};
