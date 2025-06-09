/**
 * MongoDB Socket Service
 * This is a wrapper around the main socket.service.js to provide MongoDB-specific socket functionality
 */
import * as socketService from './socket.service.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Import User model dynamically to avoid circular dependencies
let User;
const importModels = async () => {
  const UserModule = await import('../mongodb/models/User.js');
  User = UserModule.default;
};

// Initialize models
(async () => {
  try {
    await importModels();
    console.log('Socket auth models initialized successfully');
  } catch (error) {
    console.error('Failed to initialize socket auth models:', error);
  }
})();

/**
 * Socket.IO authentication middleware for MongoDB routes
 * @param {Object} socket - Socket.IO socket
 * @param {Function} next - Next function
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return next(new Error('Authentication error: Invalid token'));
    }

    // Attach user data to socket
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    return next(new Error('Authentication error'));
  }
};

// Re-export the main socket service functions
export { socketAuthMiddleware };
export * from './socket.service.js';
