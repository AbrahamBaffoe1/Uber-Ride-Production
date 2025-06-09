/**
 * Authentication Middleware for MongoDB Routes
 * Handles authentication and authorization for MongoDB API endpoints
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../../services/crypto.service.js';
import { isTokenBlacklisted } from '../services/admin-auth.service.js';

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
        status: 'error',
        message: 'Authentication required. Please provide a valid token.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token is missing'
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError.message);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication error: User not found'
      });
    }
    
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      console.log(`Rejected blacklisted token for user: ${user._id}`);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token has been revoked'
      });
    }
    
    // Add user to request object
    req.user = user;
    req.userId = user._id;
    
    // Log successful authentication
    console.log(`User authenticated: ${user._id} (${user.role || 'user'})`);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user has required role
 * @param {String|Array} roles - Required role(s)
 * @returns {Function} Middleware function
 */
export const authorize = (roles) => {
  return (req, res, next) => {
    try {
      // Convert roles to array if it's a string
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: User has no role assigned'
        });
      }
      
      // Check if user's role is in the required roles
      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied: Required role(s): ${requiredRoles.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'Authorization failed'
      });
    }
  };
};

/**
 * Check if user is the owner of the resource or has admin role
 * @param {Function} getResourceUserId - Function to get the user ID from the resource
 * @returns {Function} Middleware function
 */
export const isOwnerOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // Check if user exists
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }
      
      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Get resource user ID
      const resourceUserId = await getResourceUserId(req);
      
      // Check if user is the owner
      if (resourceUserId && resourceUserId.toString() === req.user._id.toString()) {
        return next();
      }
      
      // User is not the owner or admin
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not have permission to access this resource'
      });
    } catch (error) {
      console.error('Owner/Admin check error:', error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'Authorization failed'
      });
    }
  };
};
