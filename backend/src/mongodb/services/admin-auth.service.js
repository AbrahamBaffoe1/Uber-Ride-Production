/**
 * Admin Authentication Service
 * Handles authentication operations for admin users
 */
import mongoose from 'mongoose';
import User from '../models/User.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

/**
 * Login admin user and generate authentication tokens
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} Auth data including user and tokens
 * @throws {Error} If authentication fails
 */
export const loginAdmin = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  
  console.log('Admin login attempt:', { email });
  
  // Find admin user with timeout protection
  let admin;
  try {
    // Set up the MongoDB query with a timeout
    const findPromise = User.findOne({ email, role: 'admin' });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Admin user query timed out after 10 seconds')), 10000)
    );
    
    // Race the promises to prevent hanging
    admin = await Promise.race([findPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error in admin user lookup:', error);
    throw new Error(error.message.includes('timed out') 
      ? 'Request timed out. Please try again or contact support.' 
      : 'Admin login failed');
  }
  
  if (!admin) {
    throw new Error('Invalid credentials');
  }
  
  // Check password using the model method
  const isPasswordValid = await admin.comparePassword(password);
  
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }
  
  // Update last login timestamp
  admin.lastLogin = new Date();
  await admin.save();
  
  // Generate tokens
  const token = generateAuthToken(admin);
  const refreshToken = generateRefreshToken(admin);
  
  return {
    user: {
      id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role
    },
    token,
    refreshToken
  };
};

/**
 * Logout admin user by invalidating the token
 * @param {string} token - JWT token to invalidate
 * @returns {Promise<boolean>} Success status
 */
export const logoutAdmin = async (token) => {
  if (!token) {
    throw new Error('Token is required');
  }
  
  try {
    // Decode the token to get user ID and expiration
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'dev-secret-key',
      { ignoreExpiration: true } // We want to blacklist even if it's expired
    );
    
    // Calculate expiration date from JWT payload
    const expiresAt = new Date(decoded.exp * 1000); // Convert seconds to milliseconds
    
    // Add token to blacklist database
    await TokenBlacklist.create({
      token,
      user: decoded.id,
      reason: 'logout',
      expiresAt
    });
    
    console.log('Token invalidated and added to blacklist database');
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    
    // If token can't be verified, still blacklist it with a default expiry
    if (error instanceof jwt.JsonWebTokenError) {
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 7); // Default 7 days
      
      await TokenBlacklist.create({
        token,
        user: new mongoose.Types.ObjectId(), // Placeholder ID
        reason: 'logout',
        expiresAt: defaultExpiry
      });
      
      console.log('Invalid token blacklisted with default expiry');
      return true;
    }
    
    throw error;
  }
};

/**
 * Check if a token is blacklisted (invalidated)
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} Whether token is blacklisted
 */
export const isTokenBlacklisted = async (token) => {
  return await TokenBlacklist.isBlacklisted(token);
};

/**
 * Get current admin user details
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Admin user data
 * @throws {Error} If user not found or not an admin
 */
export const getCurrentAdmin = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  // Find admin user
  const admin = await User.findById(userId).select('-password');
  
  if (!admin || admin.role !== 'admin') {
    throw new Error('Unauthorized: User not found or not an admin');
  }
  
  return {
    id: admin._id,
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    role: admin.role,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  };
};

/**
 * Generate JWT auth token
 * @param {Object} user - User document
 * @returns {string} JWT token
 */
const generateAuthToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} user - User document
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};
