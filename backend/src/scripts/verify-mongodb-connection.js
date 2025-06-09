/**
 * MongoDB Connection Verification Script
 * This script tests connections to both rider and passenger databases
 * and can be used to diagnose authentication issues.
 */
require('dotenv').config();
const { getRiderDb, getPassengerDb, connectToMongo } = require('../utils/mongo-client');

// Set timeouts to abort if connections get stuck
const TIMEOUT_MS = 30000;  // 30 seconds timeout

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log with color
 * @param {string} message - Message to log
 * @param {string} color - Color to use
 */
const colorLog = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

/**
 * Run a function with a timeout
 * @param {Function} fn - Function to run
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} name - Name of the operation for error reporting
 * @returns {Promise<any>} - Result of the function
 */
const withTimeout = (fn, timeoutMs, name) => {
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout (${timeoutMs}ms) exceeded for ${name}`));
      }, timeoutMs);
    })
  ]);
};

/**
 * Test connection to a MongoDB database
 * @param {Function} getDbFn - Function to get the database
 * @param {string} dbName - Name of the database for reporting
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
const testDbConnection = async (getDbFn, dbName) => {
  colorLog(`Testing connection to ${dbName} database...`, colors.cyan);
  
  try {
    // Get the database with timeout
    const db = await withTimeout(
      () => getDbFn(),
      TIMEOUT_MS,
      `getting ${dbName} database`
    );
    
    // Run simple ping command to test connection
    const result = await withTimeout(
      () => db.command({ ping: 1 }),
      TIMEOUT_MS,
      `pinging ${dbName} database`
    );
    
    if (result && result.ok === 1) {
      colorLog(`✅ Connection to ${dbName} database successful!`, colors.green);
      
      // Check for user collection
      const collections = await db.listCollections().toArray();
      const hasUsers = collections.some(c => c.name === 'users');
      
      if (hasUsers) {
        colorLog(`✅ 'users' collection exists in ${dbName} database`, colors.green);
        
        // Count users to verify data access
        const userCount = await db.collection('users').countDocuments();
        colorLog(`✅ ${dbName} database has ${userCount} users`, colors.green);
        
        // Try to get a sample user to verify data structure
        if (userCount > 0) {
          const sampleUser = await db.collection('users').findOne({}, { projection: { password: 0 } });
          colorLog(`✅ Sample user from ${dbName}: ${JSON.stringify(sampleUser._id)}`, colors.green);
        }
      } else {
        colorLog(`⚠️ WARNING: 'users' collection not found in ${dbName} database!`, colors.yellow);
      }
      
      return true;
    } else {
      colorLog(`❌ Connection to ${dbName} database failed - unexpected response`, colors.red);
      return false;
    }
  } catch (error) {
    colorLog(`❌ Error connecting to ${dbName} database: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
};

/**
 * Main function to test all database connections
 */
const testAllConnections = async () => {
  colorLog('=== MongoDB Connection Test ===', colors.bright + colors.blue);
  colorLog(`Using MongoDB URI: ${process.env.MONGODB_URI || '(not set)'}`, colors.cyan);
  
  try {
    // Test initial MongoDB connection
    colorLog(`Establishing initial MongoDB connection...`, colors.cyan);
    await withTimeout(
      () => connectToMongo(),
      TIMEOUT_MS,
      'initial MongoDB connection'
    );
    colorLog(`✅ Initial MongoDB connection successful!`, colors.green);
    
    // Test rider database
    const riderSuccess = await testDbConnection(getRiderDb, 'rider');
    
    // Test passenger database
    const passengerSuccess = await testDbConnection(getPassengerDb, 'passenger');
    
    // Summary
    colorLog('\n=== Connection Test Summary ===', colors.bright + colors.blue);
    if (riderSuccess && passengerSuccess) {
      colorLog('✅ All database connections successful!', colors.bright + colors.green);
      return true;
    } else {
      const failedDbs = [];
      if (!riderSuccess) failedDbs.push('rider');
      if (!passengerSuccess) failedDbs.push('passenger');
      
      colorLog(`❌ Some database connections failed: ${failedDbs.join(', ')}`, colors.bright + colors.red);
      return false;
    }
  } catch (error) {
    colorLog(`❌ Fatal error during connection tests: ${error.message}`, colors.bright + colors.red);
    console.error(error);
    return false;
  }
};

// Run the tests
testAllConnections()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    colorLog(`Unhandled error: ${error.message}`, colors.bright + colors.red);
    console.error(error);
    process.exit(1);
  });
