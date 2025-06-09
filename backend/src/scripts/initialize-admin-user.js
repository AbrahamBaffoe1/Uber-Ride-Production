/**
 * Initialize Admin User Script
 * This script creates a default admin user if none exists
 * Can be used during app startup or as a standalone script
 * 
 * UPDATED: Fixed timeout issues and improved reliability
 */
import mongoose from 'mongoose';
import User from '../mongodb/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Increased timeout values to fix operation timeouts
const TIMEOUT_VALUES = {
  BUFFER_TIMEOUT_MS: 300000,     // 5 minutes
  CONNECTION_TIMEOUT_MS: 180000, // 3 minutes
  SOCKET_TIMEOUT_MS: 240000,     // 4 minutes
  SERVER_SELECTION_TIMEOUT_MS: 180000, // 3 minutes
  MAX_TIME_MS: 180000,           // 3 minutes
  OPERATION_TIMEOUT: 180000      // 3 minutes
};

/**
 * Initialize admin user for system (will be called on startup)
 * @returns {Promise<boolean>} Whether initialization was successful
 */
export const initializeAdminUser = async () => {
  try {
    console.log('Starting admin user initialization with improved timeout settings...');
    
    // Get admin details from environment variables first to validate
    // before attempting any database operations
    const email = process.env.ADMIN_DEFAULT_EMAIL || 'admin@okada-transportation.com';
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const firstName = process.env.ADMIN_DEFAULT_FIRST_NAME || 'System';
    const lastName = process.env.ADMIN_DEFAULT_LAST_NAME || 'Admin';
    const phoneNumber = process.env.ADMIN_DEFAULT_PHONE || '+1987654321';
    
    if (!email || !password) {
      console.error('Missing admin credentials in environment variables');
      return false;
    }
    
    console.log('Checking for existing admin user...');
    
    // Apply extended timeouts to mongoose operations
    mongoose.set('maxTimeMS', TIMEOUT_VALUES.MAX_TIME_MS);
    
    // First, try using direct MongoDB operations which are more reliable for this use case
    try {
      // Get database and collection directly
      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      
      // Check if admin exists to avoid duplicate
      const existingAdmin = await usersCollection.findOne(
        { role: 'admin' }, 
        { maxTimeMS: TIMEOUT_VALUES.OPERATION_TIMEOUT }
      );
      
      if (existingAdmin) {
        console.log('Admin user already exists, no action needed');
        return true;
      }
      
      // No admin found, create one
      console.log('No admin user found, creating...');
      
      // Hash password directly
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create admin user document
      const adminUser = {
        email,
        password: hashedPassword,
        firstName: firstName || 'System',
        lastName: lastName || 'Admin',
        phoneNumber: phoneNumber || '+1987654321',
        role: 'admin',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert directly with extended timeout
      const result = await usersCollection.insertOne(
        adminUser, 
        { maxTimeMS: TIMEOUT_VALUES.OPERATION_TIMEOUT }
      );
      
      if (result.acknowledged) {
        console.log('Successfully created admin user');
        return true;
      } else {
        throw new Error('Admin user insertion not acknowledged');
      }
    } catch (directDbError) {
      console.error('Direct DB operation failed:', directDbError);
      
      if (directDbError.code === 11000) {
        console.log('Admin user already exists (duplicate key error)');
        return true;
      }
      
      // Fall back to using Mongoose as a last resort
      console.log('Falling back to Mongoose operations...');
      
      try {
        // Check if admin exists with extended timeout
        const existingAdmin = await User.findOne({ role: 'admin' })
          .maxTimeMS(TIMEOUT_VALUES.OPERATION_TIMEOUT)
          .exec();
        
        if (existingAdmin) {
          console.log('Admin user found using Mongoose fallback');
          return true;
        }
        
        // Create new admin user with Mongoose
        const newAdmin = new User({
          email,
          password, // Will be hashed by the pre-save hook
          firstName: firstName || 'System',
          lastName: lastName || 'Admin',
          phoneNumber: phoneNumber || '+1987654321',
          role: 'admin',
          isEmailVerified: true,
          isPhoneVerified: true,
          status: 'active',
          accountStatus: 'active'
        });
        
        // Set a custom timeout for the save operation
        const saveResult = await newAdmin.save({ maxTimeMS: TIMEOUT_VALUES.OPERATION_TIMEOUT });
        
        if (saveResult) {
          console.log('Admin user created successfully using Mongoose');
          return true;
        }
        
        return false;
      } catch (mongooseError) {
        console.error('Mongoose fallback error:', mongooseError);
        
        if (mongooseError.code === 11000) {
          console.log('Admin user already exists (Mongoose duplicate key)');
          return true;
        }
        
        return false;
      }
    }
  } catch (error) {
    console.error('Fatal error in admin user initialization:', error);
    return false;
  }
};

// Function to connect to MongoDB with proper timeouts and options
const connectToMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 
                    process.env.MONGODB_RIDER_URI || 
                    'mongodb://localhost:27017/okada-transportation';
    
    console.log('Connecting to MongoDB with extended timeouts...');
    
    // Set more resilient connection options with increased timeouts
    const options = {
      serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
      // The following options help with connection stability:
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 socket connection
      connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
      retryWrites: true, // Retry writes in case of failures
      retryReads: true, // Retry reads in case of failures
      family: 4, // Use IPv4 (helps avoid certain IPv6-related issues)
      // Additional driver options for better performance
      driverOptions: {
        serverApi: { version: '1' },
        maxIdleTimeMS: 60000,
        monitorCommands: true
      }
    };
    
    await mongoose.connect(mongoURI, options);
    console.log('Connected to MongoDB with extended timeouts');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// If this script is run directly (not imported)
// Using ES modules pattern instead of CommonJS require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      // Connect to MongoDB
      const isConnected = await connectToMongoDB();
      if (!isConnected) {
        console.error('Failed to connect to MongoDB. Exiting.');
        process.exit(1);
      }
      
      // Initialize admin user
      const result = await initializeAdminUser();
      
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
      
      // Exit with appropriate code
      process.exit(result ? 0 : 1);
    } catch (error) {
      console.error('Script execution failed:', error);
      process.exit(1);
    }
  })();
}
