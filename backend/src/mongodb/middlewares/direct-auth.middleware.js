/**
 * Direct Authentication Middleware
 * Uses the MongoDB driver directly instead of Mongoose models
 */
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { getRiderDb, getPassengerDb } from '../../utils/mongo-client.js';

// MongoDB session tracking for security - Persistent across server restarts
const activeSessions = new Map();

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - ID to check
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  try {
    return ObjectId.isValid(id);
  } catch (e) {
    return false;
  }
};

/**
 * Verify JWT token and attach user to request
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} - Verified user object
 */
const verifyToken = async (token) => {
  try {
    if (!token) {
      throw new Error('No authentication token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      throw new Error('Invalid token');
    }

    // All user IDs must be valid MongoDB ObjectIds
    if (!isValidObjectId(decoded.id)) {
      throw new Error('Invalid user ID format');
    }

    // Initialize user sessions if not exists
    if (!activeSessions.has(decoded.id)) {
      activeSessions.set(decoded.id, new Set());
    }
    
    // Validate token isn't blacklisted
    const userSessions = activeSessions.get(decoded.id);
    if (userSessions.has(`blacklisted_${token}`)) {
      throw new Error('Token has been invalidated');
    }
    
    // Add to active sessions if not present
    userSessions.add(token);

    // Try to find the user first in the rider database, then in the passenger database
    let user = null;
    try {
      const riderDb = await getRiderDb();
      user = await riderDb.collection('users').findOne({ _id: new ObjectId(decoded.id) });
      
      if (!user) {
        const passengerDb = await getPassengerDb();
        user = await passengerDb.collection('users').findOne({ _id: new ObjectId(decoded.id) });
      }
    } catch (dbError) {
      console.error('Database lookup error:', dbError);
      throw new Error('Database error during authentication');
    }

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is active (with fallback for compatibility)
    if (user.accountStatus && user.accountStatus !== 'active') {
      throw new Error(`Account is ${user.accountStatus}`);
    }

    // Update last login if needed
    if (!user.lastLogin || (new Date() - new Date(user.lastLogin)) > 24 * 60 * 60 * 1000) {
      const db = user.role === 'rider' ? await getRiderDb() : await getPassengerDb();
      await db.collection('users').updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { lastLogin: new Date() } }
      );
    }

    return {
      id: user._id.toString(),
      _id: user._id,
      role: user.role || 'passenger',
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      phoneNumber: user.phoneNumber
    };
  } catch (error) {
    console.error('Token verification error:', error.message);
    throw error;
  }
};

/**
 * Express middleware for authentication
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from authorization header, cookies, or query params
    const token = req.headers.authorization?.split(' ')[1] || 
                  req.cookies?.token || 
                  req.query?.token;

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication token is missing',
        code: 401
      });
    }

    try {
      // Verify token with MongoDB
      const user = await verifyToken(token);
      
      // Attach the user object to the request
      req.user = user;
      
      // Log successful authentication for monitoring
      console.log(`User authenticated: ${user.id} (${user.role})`);
      
      // Continue with request
      next();
    } catch (error) {
      // Token verification failed
      console.error(`Token verification failed: ${error.message}`);
      
      // Provide specific error message based on error type
      let errorMessage = error.message || 'Authentication failed';
      let statusCode = 401;
      
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Authentication token has expired. Please log in again.';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid authentication token. Please log in again.';
      } else if (error.message.includes('Database error')) {
        // Database connection issues
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      }
      
      return res.status(statusCode).json({
        status: 'error',
        message: errorMessage,
        code: statusCode
      });
    }
  } catch (error) {
    // Unexpected error in authentication process
    console.error('Authentication error:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred during authentication',
      code: 500
    });
  }
};

/**
 * Express middleware for role-based authorization
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not authenticated'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden - Requires ${roles.join(' or ')} role`
      });
    }

    next();
  };
};

/**
 * Socket.io middleware for authentication
 * @param {Object} socket - Socket.io socket
 * @param {Function} next - Socket.io next function
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.split(' ')[1] || 
                  socket.handshake.query.token;

    const user = await verifyToken(token);
    
    // Attach user object and token to socket
    socket.user = user;
    socket.token = token;
    
    // Add socket to user's active sockets
    trackSocketConnection(user.id, socket.id);
    
    // Handle socket disconnection
    socket.on('disconnect', () => {
      untrackSocketConnection(user.id, socket.id);
    });
    
    next();
  } catch (error) {
    next(new Error(`Authentication error: ${error.message}`));
  }
};

// Track active socket connections per user
const activeUserSockets = new Map();

/**
 * Track socket connection for user
 * @param {string} userId - User ID
 * @param {string} socketId - Socket ID
 */
const trackSocketConnection = (userId, socketId) => {
  if (!activeUserSockets.has(userId)) {
    activeUserSockets.set(userId, new Set());
  }
  activeUserSockets.get(userId).add(socketId);
};

/**
 * Untrack socket connection for user
 * @param {string} userId - User ID
 * @param {string} socketId - Socket ID
 */
const untrackSocketConnection = (userId, socketId) => {
  if (activeUserSockets.has(userId)) {
    activeUserSockets.get(userId).delete(socketId);
    if (activeUserSockets.get(userId).size === 0) {
      activeUserSockets.delete(userId);
    }
  }
};

/**
 * Get all socket IDs for a user
 * @param {string} userId - User ID
 * @returns {Array} - Array of socket IDs
 */
const getUserSocketIds = (userId) => {
  if (activeUserSockets.has(userId)) {
    return Array.from(activeUserSockets.get(userId));
  }
  return [];
};

/**
 * Invalidate token
 * @param {string} userId - User ID
 * @param {string} token - JWT token to invalidate
 */
const invalidateToken = (userId, token) => {
  if (activeSessions.has(userId)) {
    activeSessions.get(userId).delete(token);
    activeSessions.get(userId).add(`blacklisted_${token}`);
  }
};

/**
 * Clear all sessions for user
 * @param {string} userId - User ID
 */
const clearUserSessions = (userId) => {
  if (activeSessions.has(userId)) {
    activeSessions.delete(userId);
  }
};

/**
 * Generate a new JWT token
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
const generateToken = (user, expiresIn = '24h') => {
  return jwt.sign({ 
    id: user._id.toString(),
    role: user.role,
    version: Date.now() // Version can be used to invalidate all tokens
  }, process.env.JWT_SECRET, {
    expiresIn
  });
};

export {
  authenticate,
  authorize,
  socketAuthMiddleware,
  verifyToken,
  generateToken,
  invalidateToken,
  clearUserSessions,
  getUserSocketIds,
  activeUserSockets,
  isValidObjectId
};
