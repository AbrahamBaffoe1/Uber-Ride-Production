/**
 * Token Blacklist Cleanup Script
 * 
 * This script removes expired tokens from the token blacklist to prevent database bloat.
 * While MongoDB TTL indexes should automatically remove expired documents, this script
 * provides a manual way to clean up and verify the process.
 * 
 * Run this script periodically as a cron job or maintenance task.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TokenBlacklist from '../mongodb/models/TokenBlacklist.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/okada-transportation';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Cleanup expired tokens
const cleanupExpiredTokens = async () => {
  try {
    const now = new Date();
    
    // Find and delete expired tokens
    const result = await TokenBlacklist.deleteMany({ 
      expiresAt: { $lt: now } 
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired blacklisted tokens`);
    
    // Log remaining tokens
    const remainingCount = await TokenBlacklist.countDocuments();
    console.log(`${remainingCount} valid blacklisted tokens remain in the database`);
    
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up token blacklist:', error);
    throw error;
  }
};


// Run the cleanup if script is executed directly
if (require.main === module) {
  (async () => {
    try {
      // Connect to MongoDB
      const connected = await connectDB();
      if (!connected) {
        console.error('Failed to connect to MongoDB. Exiting.');
        process.exit(1);
      }
      
      // Run cleanup
      const deletedCount = await cleanupExpiredTokens();
      
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
      
      // Log summary
      console.log(`Token blacklist cleanup complete. Removed ${deletedCount} expired tokens.`);
      process.exit(0);
    } catch (error) {
      console.error('Script execution failed:', error);
      process.exit(1);
    }
  })();
}

export { cleanupExpiredTokens };
