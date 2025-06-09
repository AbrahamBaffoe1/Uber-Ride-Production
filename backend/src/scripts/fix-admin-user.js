#!/usr/bin/env node
/**
 * Fix Admin User Script
 * 
 * This script ensures that the admin user exists and is properly configured in the database.
 * It addresses potential issues with admin login functionality.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Get MongoDB URI from environment
const MONGODB_RIDER_URI = process.env.MONGODB_RIDER_URI;

// Connection options with reasonable timeouts
const connectionOptions = {
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 2000,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  bufferTimeoutMS: 30000,
  autoReconnect: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

async function main() {
  console.log('===========================================================');
  console.log('Admin User Fix Tool');
  console.log('===========================================================');
  
  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL;
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  const firstName = process.env.ADMIN_DEFAULT_FIRST_NAME || 'System';
  const lastName = process.env.ADMIN_DEFAULT_LAST_NAME || 'Admin';
  const phoneNumber = process.env.ADMIN_DEFAULT_PHONE || '+1987654321';
  
  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing admin credentials in environment variables.');
    console.error('Please check ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD in your .env file.');
    process.exit(1);
  }
  
  console.log('Connecting to MongoDB...');
  
  // Create a dedicated mongoose connection
  let connection;
  try {
    connection = await mongoose.createConnection(MONGODB_RIDER_URI, connectionOptions);
    console.log('✅ MongoDB connection established successfully.');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Please run the fix-mongodb-connection.js script first to resolve connection issues.');
    process.exit(1);
  }
  
  // Load the User schema
  const userSchema = new mongoose.Schema({
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long']
    },
    role: {
      type: String,
      enum: ['passenger', 'rider', 'admin'],
      default: 'passenger'
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active'
    }
  }, { timestamps: true });
  
  // Add pre-save middleware to hash password
  userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });
  
  // Method to compare password
  userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  };
  
  // Create User model
  const User = connection.model('User', userSchema);
  
  console.log('\nChecking for existing admin user...');
  
  let adminUser;
  try {
    adminUser = await User.findOne({ email: adminEmail, role: 'admin' });
  } catch (error) {
    console.error('❌ Error finding admin user:', error.message);
    await connection.close();
    process.exit(1);
  }
  
  if (adminUser) {
    console.log('✅ Admin user found:', adminUser.email);
    
    // Check if we need to update the admin user
    let needsUpdate = false;
    let updates = {};
    
    if (adminUser.firstName !== firstName) {
      updates.firstName = firstName;
      needsUpdate = true;
    }
    
    if (adminUser.lastName !== lastName) {
      updates.lastName = lastName;
      needsUpdate = true;
    }
    
    if (!adminUser.isEmailVerified) {
      updates.isEmailVerified = true;
      needsUpdate = true;
    }
    
    if (!adminUser.isPhoneVerified) {
      updates.isPhoneVerified = true;
      needsUpdate = true;
    }
    
    if (adminUser.status !== 'active') {
      updates.status = 'active';
      needsUpdate = true;
    }
    
    if (adminUser.accountStatus !== 'active') {
      updates.accountStatus = 'active';
      needsUpdate = true;
    }
    
    // Verify password match (requires verification)
    console.log('Verifying admin password...');
    const passwordMatches = await adminUser.comparePassword(adminPassword);
    
    if (!passwordMatches) {
      console.log('⚠️ Admin password doesn\'t match environment variable.');
      
      // Ask if we should update the password
      console.log('Updating admin password to match environment variable...');
      
      // Hash the new password
      const salt = await bcrypt.genSalt(12);
      updates.password = await bcrypt.hash(adminPassword, salt);
      needsUpdate = true;
    } else {
      console.log('✅ Admin password verified.');
    }
    
    // Update user if needed
    if (needsUpdate) {
      console.log('Updating admin user with latest settings...');
      try {
        await User.updateOne({ _id: adminUser._id }, updates);
        console.log('✅ Admin user updated successfully.');
      } catch (error) {
        console.error('❌ Failed to update admin user:', error.message);
      }
    } else {
      console.log('✅ Admin user is already up to date.');
    }
  } else {
    console.log('⚠️ Admin user not found. Creating a new one...');
    
    // Create new admin user
    try {
      const newAdmin = new User({
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        firstName,
        lastName,
        phoneNumber,
        role: 'admin',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        accountStatus: 'active'
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created successfully.');
      adminUser = newAdmin;
    } catch (error) {
      console.error('❌ Failed to create admin user:', error.message);
      await connection.close();
      process.exit(1);
    }
  }
  
  // Test admin login functionality
  console.log('\nTesting admin login functionality...');
  try {
    // Verify that hashed password can be compared successfully
    const passwordValid = await adminUser.comparePassword(adminPassword);
    
    if (passwordValid) {
      console.log('✅ Admin login test successful!');
    } else {
      console.error('❌ Admin login test failed: Password verification failed.');
    }
  } catch (error) {
    console.error('❌ Admin login test failed:', error.message);
  }
  
  // Suggestions for fixing admin controller
  console.log(`
=== Recommendations for fixing admin login timeouts ===

1. Modify src/mongodb/controllers/admin.controller.js to:
   - Add explicit timeouts for MongoDB operations
   - Improve error handling
   - Add timeout protection

2. Here's a code example to add in the loginAdmin function:

   const findPromise = User.findOne({ email, role: 'admin' });
   const timeoutPromise = new Promise((_, reject) => 
     setTimeout(() => reject(new Error('Admin login timed out after 10 seconds')), 10000)
   );
   
   try {
     const admin = await Promise.race([findPromise, timeoutPromise]);
     // continue with login logic
   } catch (error) {
     console.error('Admin login error:', error);
     return res.status(500).json({
       status: 'error',
       message: error.message.includes('timed out') 
         ? 'Request timed out. Please try again or contact support.'
         : 'Admin login failed',
       error: error.message
     });
   }
  `);
  
  // Close connection
  console.log('\nClosing MongoDB connection...');
  await connection.close();
  console.log('Done! Admin user is now properly configured.');
}

// Run the main function
main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
