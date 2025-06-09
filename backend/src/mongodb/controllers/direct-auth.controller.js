/**
 * Direct MongoDB Auth Controller
 * Uses the native MongoDB driver directly instead of Mongoose models
 * to bypass buffering timeouts
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getRiderDb, getPassengerDb } from '../../utils/mongo-client.js';
import * as directOtpService from '../../utils/direct-otp.service.js';

// Helper functions
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 */
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, role = 'passenger' } = req.body;

    // Basic validation
    if (!firstName || !lastName || (!email && !phoneNumber) || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    try {
      // Get the appropriate DB based on user role
      const db = role === 'rider' ? await getRiderDb() : await getPassengerDb();
      const usersCollection = db.collection('users');

      // Check if user already exists (using MongoDB native driver)
      const existingUser = await usersCollection.findOne({
        $or: [
          { email: email ? email.toLowerCase() : null },
          { phoneNumber: phoneNumber || null }
        ]
      });

      if (existingUser) {
        return res.status(409).json({
          status: 'error',
          message: existingUser.email === email ? 'Email already in use' : 'Phone number already in use'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user document
      const newUser = {
        firstName,
        lastName,
        email: email ? email.toLowerCase() : undefined,
        phoneNumber,
        password: hashedPassword,
        role,
        isEmailVerified: false,
        isPhoneVerified: false,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert user into database
      const result = await usersCollection.insertOne(newUser);
      const userId = result.insertedId;

      console.log('User saved successfully to MongoDB:', userId);

      // Generate token
      const token = jwt.sign(
        { id: userId.toString(), role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );

      // Return success without sensitive information
      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully. Please verify your account.',
        data: {
          user: {
            id: userId,
            firstName,
            lastName,
            email,
            phoneNumber,
            role
          },
          token
        }
      });
    } catch (dbError) {
      console.error('MongoDB operation error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error registering user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login a user
 * @route POST /api/v1/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;
    
    // Allow login with either email or phone number
    if ((!email && !phoneNumber) || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email/phone number and password are required'
      });
    }
    
    // Log the login attempt for debugging
    console.log('Login attempt with:', {
      email: email || 'N/A', 
      loginMethod: email ? 'email' : 'phone',
      passwordLength: password?.length,
      phone: phoneNumber || 'N/A'
    });
    
    try {
      // Create the query based on whether email or phone was provided
      const query = email 
        ? { email: email.toLowerCase() }
        : { phoneNumber: phoneNumber };
      
      // Try to find user in rider database first
      const riderDb = await getRiderDb();
      let user = await riderDb.collection('users').findOne(query);
      
      // If not found in rider DB, try passenger DB
      if (!user) {
        const passengerDb = await getPassengerDb();
        user = await passengerDb.collection('users').findOne(query);
      }
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials'
        });
      }
      
      // Check if user verification is required
      if (!user.isEmailVerified && !user.isPhoneVerified) {
        // Generate a temporary verification token
        const tempToken = jwt.sign(
          { id: user._id.toString(), role: user.role, isTemp: true },
          process.env.JWT_SECRET,
          { expiresIn: '1h' } // Short expiration for verification flow
        );
        
        // Return success but with verification flag
        return res.status(200).json({
          status: 'success',
          message: 'Account requires verification',
          data: {
            requiresVerification: true,
            userId: user._id,
            tempToken: tempToken,
            user: {
              id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              role: user.role
            }
          }
        });
      }
      
      // Update last login timestamp
      const db = user.role === 'rider' ? await getRiderDb() : await getPassengerDb();
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );
      
      // Generate auth tokens
      const token = jwt.sign(
        { id: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );
      
      const refreshToken = jwt.sign(
        { id: user._id.toString() },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
      );
      
      // Return success with tokens
      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profilePicture: user.profilePicture
          },
          token,
          refreshToken
        }
      });
    } catch (dbError) {
      console.error('MongoDB operation error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error logging in:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/v1/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    // User is attached to request by auth middleware
    const userId = req.user.id;
    
    try {
      // Check if ID is valid ObjectId before querying
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID format'
        });
      }
      
      // Try to find user in rider database first
      const riderDb = await getRiderDb();
      let user = await riderDb.collection('users').findOne({ 
        _id: new ObjectId(userId) 
      });
      
      // If not found in rider DB, try passenger DB
      if (!user) {
        const passengerDb = await getPassengerDb();
        user = await passengerDb.collection('users').findOne({ 
          _id: new ObjectId(userId) 
        });
      }
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // Return user data without sensitive information
      return res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified || false,
            isPhoneVerified: user.isPhoneVerified || false,
            country: user.country,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      });
    } catch (dbError) {
      console.error('Error fetching user from database:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 */
export const logout = async (req, res) => {
  // JWT is stateless, so we can't invalidate it on the server side
  // Client should remove the token from storage
  return res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

/**
 * Request OTP for verification
 * @route POST /api/v1/auth/request-otp
 */
export const requestOTP = async (req, res) => {
  try {
    const { userId, type = 'verification', contactMethod = 'phone' } = req.body;
    
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid user ID is required'
      });
    }
    
    // Find the user in the database
    const userIdObj = new ObjectId(userId);
    
    // Try rider DB first
    const riderDb = await getRiderDb();
    let user = await riderDb.collection('users').findOne({ _id: userIdObj });
    let db = riderDb;
    
    // If not found, try passenger DB
    if (!user) {
      const passengerDb = await getPassengerDb();
      user = await passengerDb.collection('users').findOne({ _id: userIdObj });
      db = passengerDb;
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Create database collections if they don't exist
    await db.createCollection('otps', {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["userId", "code", "expiresAt"],
          properties: {
            userId: { bsonType: ["objectId", "string"] },
            code: { bsonType: "string" },
            type: { bsonType: "string" },
            expiresAt: { bsonType: "date" },
            isUsed: { bsonType: "bool" },
            attempts: { bsonType: "int" },
            identifier: { bsonType: "string" },
            createdAt: { bsonType: "date" }
          }
        }
      }
    }).catch(err => {
      // Collection may already exist, which is fine
      if (!err.message.includes('already exists')) {
        console.error("Error creating otps collection:", err);
      }
    });
    
    let result;
    
    // Send OTP based on contact method preference
    if (contactMethod === 'email' && user.email) {
      // Send OTP via email
      result = await directOtpService.sendOTPviaEmail(userId, type, user.email);
      
      if (result.success) {
        return res.status(200).json({
          status: 'success',
          message: 'Verification code sent to your email',
          data: {
            expiresAt: result.expiresAt,
            email: user.email.replace(/(.{2})(.*)(?=@)/g, '$1***'), // Mask email
            userId: userId
          }
        });
      }
    } else if (user.phoneNumber) {
      // Send OTP via SMS
      result = await directOtpService.sendOTPviaSMS(userId, type, user.phoneNumber);
      
      if (result.success) {
        return res.status(200).json({
          status: 'success',
          message: 'Verification code sent via SMS',
          data: {
            expiresAt: result.expiresAt,
            phoneNumber: user.phoneNumber.replace(/.(?=.{4})/g, '*'), // Mask phone number
            userId: userId
          }
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: contactMethod === 'email' ? 'No email address found for user' : 'No phone number found for user'
      });
    }
    
    // If we get here, OTP was not sent successfully
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send verification code'
    });
  } catch (error) {
    console.error('Error requesting OTP:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP
 * @route POST /api/v1/auth/verify
 */
export const verifyUser = async (req, res) => {
  try {
    const { userId, code, type = 'verification' } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and verification code are required'
      });
    }
    
    try {
      // Verify the OTP
      const otpVerified = await directOtpService.verifyOTP(userId, code, type);
      
      if (!otpVerified) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid verification code'
        });
      }
      
      // Find the user in the database
      let userIdObj;
      try {
        userIdObj = new ObjectId(userId);
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID format'
        });
      }
      
      // Try rider DB first
      const riderDb = await getRiderDb();
      let user = await riderDb.collection('users').findOne({ _id: userIdObj });
      let db = riderDb;
      
      // If not found, try passenger DB
      if (!user) {
        const passengerDb = await getPassengerDb();
        user = await passengerDb.collection('users').findOne({ _id: userIdObj });
        db = passengerDb;
      }
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      
      // OTP verification is handled in directOtpService.verifyOTP
      // which already updates the user document
      
      // Generate new token with full access
      const token = jwt.sign(
        { id: user._id.toString(), role: user.role || 'passenger' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );
      
      return res.status(200).json({
        status: 'success',
        message: 'Account verified successfully',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role || 'passenger',
            isVerified: true
          },
          token
        }
      });
    } catch (error) {
      // Handle specific OTP verification errors
      if (error.message.includes('expired') || error.message.includes('not found')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error verifying user:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request a public OTP (no authentication required)
 * @route POST /api/v1/auth/public/request-otp
 */
export const requestPublicOTP = async (req, res) => {
  try {
    const { phone, email, type = 'verification' } = req.body;
    
    if (!phone && !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number or email is required'
      });
    }
    
    // Find user by phone or email
    const riderDb = await getRiderDb();
    const passengerDb = await getPassengerDb();
    
    const query = {};
    if (phone) query.phoneNumber = phone;
    if (email) query.email = email.toLowerCase();
    
    // Check in rider DB first
    let user = await riderDb.collection('users').findOne(query);
    
    // If not found, check in passenger DB
    if (!user) {
      user = await passengerDb.collection('users').findOne(query);
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No account found with the provided contact information'
      });
    }
    
    // User exists, send OTP
    let result;
    if (email && user.email) {
      result = await directOtpService.sendOTPviaEmail(user._id.toString(), type, user.email);
    } else if (phone && user.phoneNumber) {
      result = await directOtpService.sendOTPviaSMS(user._id.toString(), type, user.phoneNumber);
    }
    
    if (result && result.success) {
      const contact = email ? email.replace(/(.{2})(.*)(?=@)/g, '$1***') : phone.replace(/.(?=.{4})/g, '*');
      const contactType = email ? 'email' : 'phone';
      
      return res.status(200).json({
        status: 'success',
        message: `Verification code sent to your ${contactType}`,
        data: {
          userId: user._id,
          expiresAt: result.expiresAt,
          contact
        }
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send verification code'
    });
  } catch (error) {
    console.error('Error requesting public OTP:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
