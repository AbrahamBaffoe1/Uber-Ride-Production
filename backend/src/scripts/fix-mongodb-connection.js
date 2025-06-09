#!/usr/bin/env node
/**
 * MongoDB Connection Verification and Fix Script
 * 
 * This script diagnoses and fixes MongoDB connection issues, addressing the
 * operation buffering timeout errors that occur during admin login.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

// Connection variables from environment
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_RIDER_URI = process.env.MONGODB_RIDER_URI;
const MONGODB_PASSENGER_URI = process.env.MONGODB_PASSENGER_URI;

// Enhanced connection options to prevent buffering timeouts
const enhancedOptions = {
  connectTimeoutMS: 30000,       // Reduced from 60000 to 30000 
  socketTimeoutMS: 45000,        // Reduced from 90000 to 45000
  serverSelectionTimeoutMS: 30000, // Reduced from 60000 to 30000
  heartbeatFrequencyMS: 2000,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 0,                 // Changed from 1 to 0 to reduce idle connections
  maxIdleTimeMS: 30000,           // Reduced from 60000 to 30000
  bufferTimeoutMS: 30000,         // Reduced from 60000 to 30000
  
  // Add these options to fix potential connectivity issues
  autoReconnect: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  keepAlive: true,
  keepAliveInitialDelay: 30000
};

// Test direct MongoDB client connection
async function testDirectConnection() {
  console.log('\n=== Testing Direct MongoDB Client Connection ===');
  const client = new MongoClient(MONGODB_URI, {
    ...enhancedOptions,
    serverApi: {
      version: '1',
      strict: true,
      deprecationErrors: true,
    }
  });

  try {
    console.log('Attempting to connect using direct MongoDB client...');
    await client.connect();
    console.log('✅ Direct MongoDB client connection successful!');
    
    // Test a simple operation
    const adminDb = client.db('okada-rider');
    const collections = await adminDb.listCollections().toArray();
    console.log(`Collections in 'okada-rider' database: ${collections.length}`);
    
    // Close connection
    await client.close();
    return true;
  } catch (error) {
    console.error('❌ Direct MongoDB client connection failed:', error.message);
    return false;
  }
}

// Test mongoose connection
async function testMongooseConnection(uri, dbName) {
  console.log(`\n=== Testing Mongoose Connection to ${dbName} ===`);
  
  // Create a dedicated connection for this test
  const connection = mongoose.createConnection(uri, enhancedOptions);
  
  return new Promise((resolve) => {
    // Add event listeners
    connection.on('connected', async () => {
      console.log(`✅ Mongoose connection to ${dbName} successful!`);
      
      // Test a model operation
      try {
        // Create a simple schema and model for testing
        const testSchema = new mongoose.Schema({ name: String, testDate: { type: Date, default: Date.now } });
        const TestModel = connection.model('ConnectionTest', testSchema);
        
        // Try to find a document (this should work even if none exists)
        const result = await TestModel.findOne({});
        console.log(`Test query on ${dbName} executed successfully.`);
        
        // Close connection and resolve
        await connection.close();
        resolve(true);
      } catch (error) {
        console.error(`❌ Error during test operation on ${dbName}:`, error.message);
        connection.close();
        resolve(false);
      }
    });
    
    connection.on('error', (err) => {
      console.error(`❌ Mongoose connection to ${dbName} failed:`, err.message);
      resolve(false);
    });
    
    // Add a timeout to prevent hanging
    setTimeout(() => {
      if (connection.readyState !== 1) { // 1 = connected
        console.error(`❌ Mongoose connection to ${dbName} timed out after 15 seconds`);
        connection.close();
        resolve(false);
      }
    }, 15000);
  });
}

// Test the User model specifically (crucial for admin login)
async function testUserModel() {
  console.log('\n=== Testing User Model Operations ===');
  
  // Create a dedicated connection for User model test
  const connection = mongoose.createConnection(MONGODB_RIDER_URI, enhancedOptions);
  
  return new Promise((resolve) => {
    connection.on('connected', async () => {
      try {
        // Import the User model schema
        const userSchema = require('../mongodb/models/User');
        
        // Create model with this connection
        const User = connection.model('User', userSchema);
        
        console.log('Attempting to find admin user...');
        
        // Try to find admin user with timeout protection
        const findPromise = User.findOne({ role: 'admin' }).exec();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timed out after 10 seconds')), 10000)
        );
        
        const admin = await Promise.race([findPromise, timeoutPromise]);
        
        if (admin) {
          console.log('✅ Successfully found admin user:', admin.email);
        } else {
          console.warn('⚠️ No admin user found. This might be expected in a fresh setup.');
        }
        
        // Close connection and resolve
        await connection.close();
        resolve(true);
      } catch (error) {
        console.error('❌ Error during User model test:', error.message);
        connection.close();
        resolve(false);
      }
    });
    
    connection.on('error', (err) => {
      console.error('❌ User model connection failed:', err.message);
      resolve(false);
    });
    
    // Add a timeout to prevent hanging
    setTimeout(() => {
      if (connection.readyState !== 1) {
        console.error('❌ User model connection timed out after 15 seconds');
        connection.close();
        resolve(false);
      }
    }, 15000);
  });
}

// Apply fixes to the connection configuration
async function applyFixes() {
  console.log('\n=== Applying Configuration Fixes ===');
  
  // 1. Check if we need to update the .env file
  console.log('Checking MongoDB URIs in .env file...');
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../../.env');
  
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    let updated = false;

    // Prepare MongoDB URI validation regex
    const mongoUriRegex = /^mongodb(\+srv)?:\/\/[^\s]+$/;
    
    // Check and possibly update all URIs
    console.log('Validating MongoDB URIs...');
    
    if (!mongoUriRegex.test(MONGODB_URI)) {
      console.warn('⚠️ MONGODB_URI appears to be invalid');
    }
    
    if (!mongoUriRegex.test(MONGODB_RIDER_URI)) {
      console.warn('⚠️ MONGODB_RIDER_URI appears to be invalid');
    }
    
    if (!mongoUriRegex.test(MONGODB_PASSENGER_URI)) {
      console.warn('⚠️ MONGODB_PASSENGER_URI appears to be invalid');
    }
    
    // Add buffering configuration fix to .env
    if (!envContent.includes('MONGODB_BUFFER_TIMEOUT_MS')) {
      envContent += '\n# MongoDB Performance Tuning (added by fix script)\n';
      envContent += 'MONGODB_BUFFER_TIMEOUT_MS=30000\n';
      envContent += 'MONGODB_CONNECTION_TIMEOUT_MS=30000\n';
      envContent += 'MONGODB_SOCKET_TIMEOUT_MS=45000\n';
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated .env file with optimized MongoDB settings');
    } else {
      console.log('✅ .env file already has the necessary settings');
    }
  } else {
    console.error('❌ .env file not found at', envPath);
  }
  
  // 2. Suggest fixes for mongodb.js and mongo-client.js
  console.log('\nSuggested fixes for configuration files:');
  console.log(`
1. Update src/config/mongodb.js:
   - Reduce bufferTimeoutMS from 60000 to 30000
   - Reduce connectTimeoutMS and serverSelectionTimeoutMS
   - Set minPoolSize to 0 instead of 1
   - Add autoReconnect: true option

2. Update src/utils/mongo-client.js:
   - Add error handling middleware
   - Implement connection retry logic
   - Add a health check function
   - Use the environment variables for timeout settings
   
3. Modify the admin controller:
   - Add explicit timeout handling for MongoDB operations
   - Add more detailed error logging
   - Consider implementing a circuit breaker pattern
`);
}

// Check MongoDB Atlas server status
async function checkAtlasStatus() {
  console.log('\n=== Checking MongoDB Atlas Status ===');
  
  // Extract atlas hostname from connection string
  let atlasHostname = '';
  try {
    const match = MONGODB_URI.match(/mongodb\+srv:\/\/[^@]+@([^\/]+)/);
    if (match && match[1]) {
      atlasHostname = match[1];
      console.log(`Atlas hostname: ${atlasHostname}`);
    } else {
      console.log('Could not extract Atlas hostname from connection string');
      return;
    }
  } catch (error) {
    console.error('Error parsing MongoDB URI:', error.message);
    return;
  }
  
  // Check if we can resolve the hostname
  const dns = require('dns');
  
  try {
    console.log(`Resolving DNS for ${atlasHostname}...`);
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve(atlasHostname, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });
    
    console.log(`✅ DNS resolution successful. Found ${addresses.length} IP addresses.`);
    console.log('DNS resolution suggests Atlas servers are reachable.');
  } catch (error) {
    console.error('❌ DNS resolution failed:', error.message);
    console.error('This suggests network connectivity issues to Atlas servers.');
  }
}

// Main function
async function main() {
  console.log('======================================================');
  console.log('MongoDB Connection Diagnostics and Fix Tool');
  console.log('======================================================');
  
  // Step 1: Check Atlas status
  await checkAtlasStatus();
  
  // Step 2: Test direct MongoDB client connection
  const directConnected = await testDirectConnection();
  
  // Step 3: Test mongoose connections
  const riderConnected = await testMongooseConnection(
    MONGODB_RIDER_URI, 
    'Rider DB'
  );
  
  const passengerConnected = await testMongooseConnection(
    MONGODB_PASSENGER_URI,
    'Passenger DB'
  );
  
  // Step 4: Test User model specifically (for admin login)
  const userModelWorks = await testUserModel();
  
  // Step 5: Apply fixes based on test results
  await applyFixes();
  
  // Summary and recommendations
  console.log('\n======================================================');
  console.log('Diagnosis Summary');
  console.log('======================================================');
  console.log(`Direct MongoDB Client: ${directConnected ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Mongoose Rider DB Connection: ${riderConnected ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Mongoose Passenger DB Connection: ${passengerConnected ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`User Model Operations: ${userModelWorks ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (!directConnected || !riderConnected || !passengerConnected || !userModelWorks) {
    console.log('\n‼️ ISSUES DETECTED ‼️');
    console.log(`
Recommendations:
1. Check your network connectivity to MongoDB Atlas
2. Verify the MongoDB Atlas username and password in your .env file
3. Check if your IP address is whitelisted in MongoDB Atlas
4. Adjust connection timeouts as suggested in the fixes section
5. Restart your application server after making these changes
6. Consider using a local MongoDB instance for development if Atlas connectivity issues persist
`);
  } else {
    console.log('\n✅ All tests passed! Your MongoDB connection appears to be working correctly.');
    console.log('Consider implementing the suggested configuration fixes to prevent future issues.');
  }
  
  console.log('\nFor admin login specifically, try running:');
  console.log('node src/scripts/fix-admin-user.js');
  
  console.log('\n======================================================');
}

// Run the main function
main().catch(error => {
  console.error('An unexpected error occurred during diagnostics:', error);
  process.exit(1);
});
