/**
 * MongoDB Connection Timeout Fix Script
 * 
 * This script addresses the "Operation `users.findOne()` buffering timed out after 120000ms"
 * error by implementing connection timeout handling and retry logic.
 */

import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import config from '../config/mongodb.js';

// Connection options with more robust timeout handling
const MONGO_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Reduce from 120000ms to 30000ms
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000
};

async function checkConnection() {
  try {
    console.log('Checking MongoDB connection...');
    
    // Try a direct connection using MongoDB driver
    const client = new MongoClient(config.url, MONGO_OPTIONS);
    await client.connect();
    
    // Check if we can run a simple command
    const adminDb = client.db().admin();
    const result = await adminDb.ping();
    
    console.log('MongoDB connection successful:', result);
    
    // Check existing mongoose connection
    if (mongoose.connection.readyState === 1) {
      console.log('Mongoose is already connected');
    } else {
      console.log('Mongoose connection state:', mongoose.connection.readyState);
    }
    
    await client.close();
    return true;
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return false;
  }
}

async function fixMongooseConnection() {
  try {
    // Close any existing connection
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing mongoose connection...');
      await mongoose.connection.close();
    }
    
    // Apply the new connection options to mongoose
    mongoose.set('serverSelectionTimeoutMS', 30000);
    mongoose.set('socketTimeoutMS', 45000);
    mongoose.set('connectTimeoutMS', 30000);
    
    // Add connection event listeners for better diagnostics
    mongoose.connection.on('connecting', () => {
      console.log('Mongoose connecting to MongoDB...');
    });
    
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    
    // Create new connection with optimized settings
    console.log('Establishing new mongoose connection with optimized settings...');
    await mongoose.connect(config.url, MONGO_OPTIONS);
    
    // Test the connection with a simple operation
    const result = await mongoose.connection.db.admin().ping();
    console.log('Mongoose connection test successful:', result);
    
    return true;
  } catch (error) {
    console.error('Failed to fix mongoose connection:', error);
    return false;
  }
}

// Add a retry mechanism for Mongoose operations
function addMongooseRetry() {
  const originalExecute = mongoose.Query.prototype.exec;
  
  mongoose.Query.prototype.exec = async function(...args) {
    let attempts = 0;
    const maxAttempts = 3;
    const baseDelay = 1000;
    
    while (attempts < maxAttempts) {
      try {
        return await originalExecute.apply(this, args);
      } catch (error) {
        attempts++;
        
        // Only retry on timeout or connection errors
        if (error.name === 'MongooseError' || 
            error.name === 'MongoTimeoutError' || 
            error.message.includes('buffering timed out') ||
            error.message.includes('connection timed out')) {
          
          if (attempts < maxAttempts) {
            const delay = baseDelay * Math.pow(2, attempts - 1); // Exponential backoff
            console.log(`MongoDB operation failed, retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // For other errors or if max attempts reached, throw the error
        throw error;
      }
    }
  };
  
  console.log('Added retry mechanism to Mongoose queries');
}

// Main function
async function main() {
  console.log('Starting MongoDB timeout fix script...');
  
  const connectionOk = await checkConnection();
  
  if (!connectionOk) {
    console.log('Connection issues detected, applying fixes...');
    
    const fixed = await fixMongooseConnection();
    if (fixed) {
      console.log('MongoDB connection fixed successfully');
    } else {
      console.error('Failed to fix MongoDB connection');
      process.exit(1);
    }
  }
  
  console.log('Adding retry mechanism for MongoDB operations...');
  addMongooseRetry();
  
  console.log('MongoDB timeout fix script completed successfully');
}

// Export for use in other modules
export { 
  checkConnection, 
  fixMongooseConnection, 
  addMongooseRetry,
  MONGO_OPTIONS 
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
