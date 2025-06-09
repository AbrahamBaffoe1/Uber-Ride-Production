/**
 * Fix Admin User Timeout Issues
 * This script updates MongoDB connection timeout settings and fixes admin user initialization issues
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import User from '../mongodb/models/User.js';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Dramatically increased timeout values
const TIMEOUT_VALUES = {
  BUFFER_TIMEOUT_MS: 300000,     // 5 minutes
  CONNECTION_TIMEOUT_MS: 180000, // 3 minutes
  SOCKET_TIMEOUT_MS: 240000,     // 4 minutes
  SERVER_SELECTION_TIMEOUT_MS: 180000, // 3 minutes
  MAX_TIME_MS: 180000            // 3 minutes
};

/**
 * Connect to MongoDB with fixed timeout settings
 */
async function connectWithFixedTimeouts() {
  try {
    // Get MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 
                      process.env.MONGODB_RIDER_URI || 
                      'mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/okada-rider?retryWrites=true&w=majority&appName=OkadaCluster';
    
    console.log('Connecting to MongoDB with extended timeouts...');
    
    // Apply global Mongoose settings
    mongoose.set('bufferCommands', true);
    mongoose.set('maxTimeMS', TIMEOUT_VALUES.MAX_TIME_MS);
    
    // Define more resilient connection options
    const options = {
      serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
      connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      family: 4, // Use IPv4
      // Override the Buffer command timeout at driver level
      driverOptions: {
        serverApi: { version: '1' },
        maxIdleTimeMS: 60000,
        monitorCommands: true
      }
    };
    
    // Connect with extended timeouts
    const connection = await mongoose.connect(mongoURI, options);
    console.log('Successfully connected to MongoDB with extended timeouts');
    return connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Directly create admin user with raw MongoDB operations to bypass Mongoose timeouts
 */
async function createAdminUserDirectly() {
  try {
    console.log('Creating admin user directly with raw MongoDB operations...');
    
    // Get admin credentials
    const email = process.env.ADMIN_DEFAULT_EMAIL || 'admin@okada-transportation.com';
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const firstName = process.env.ADMIN_DEFAULT_FIRST_NAME || 'System';
    const lastName = process.env.ADMIN_DEFAULT_LAST_NAME || 'Admin';
    const phoneNumber = process.env.ADMIN_DEFAULT_PHONE || '+1987654321';
    
    // Hash password directly
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Get database and collection directly
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    // Check if admin exists to avoid duplicate
    const existingAdmin = await usersCollection.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists, no action needed');
      return true;
    }
    
    // Create admin user document
    const adminUser = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      status: 'active',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert directly with extended timeout
    const result = await usersCollection.insertOne(adminUser, { maxTimeMS: TIMEOUT_VALUES.MAX_TIME_MS });
    
    if (result.acknowledged) {
      console.log('Successfully created admin user directly');
      return true;
    } else {
      console.error('Failed to create admin user');
      return false;
    }
    
  } catch (error) {
    console.error('Error creating admin user directly:', error);
    
    if (error.code === 11000) {
      console.log('Admin user already exists (duplicate key error)');
      return true;
    }
    
    return false;
  }
}

/**
 * Verify admin user creation
 */
async function verifyAdminUser() {
  try {
    console.log('Verifying admin user exists...');
    
    // Use raw MongoDB operations to check
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const admin = await usersCollection.findOne({ role: 'admin' });
    
    if (admin) {
      console.log('Admin user verification successful');
      console.log('Admin email:', admin.email);
      return true;
    } else {
      console.log('No admin user found');
      return false;
    }
  } catch (error) {
    console.error('Error verifying admin user:', error);
    return false;
  }
}

/**
 * Get database statistics for connection verification
 */
async function getDatabaseStats() {
  try {
    console.log('Getting database statistics...');
    
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    console.log('Database statistics:');
    console.log('- Database name:', stats.db);
    console.log('- Collections:', stats.collections);
    console.log('- Objects:', stats.objects);
    console.log('- Avg object size:', stats.avgObjSize);
    console.log('- Data size:', stats.dataSize);
    console.log('- Storage size:', stats.storageSize);
    
    return true;
  } catch (error) {
    console.error('Error getting database statistics:', error);
    return false;
  }
}

/**
 * Run the fix script
 */
async function runFix() {
  try {
    console.log('Starting admin user timeout fix...');
    
    // Connect with fixed timeouts
    await connectWithFixedTimeouts();
    
    // Get database stats
    await getDatabaseStats();
    
    // Verify if admin user exists
    const adminExists = await verifyAdminUser();
    
    if (!adminExists) {
      // Create admin user directly if not exists
      const created = await createAdminUserDirectly();
      
      if (created) {
        console.log('Admin user creation successful');
      } else {
        console.error('Failed to create admin user');
        process.exit(1);
      }
    }
    
    // Verify again
    await verifyAdminUser();
    
    console.log('Admin user timeout fix completed successfully');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('Error running admin user timeout fix:', error);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  runFix();
}

export { connectWithFixedTimeouts, createAdminUserDirectly, verifyAdminUser };
