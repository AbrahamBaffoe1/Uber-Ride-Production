/**
 * Update Admin Password Script
 * This script updates the admin user's password
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Admin credentials
const email = 'admin@okada-transportation.com';
const newPassword = 'admin123456';

// Connect to MongoDB
const connectToMongoDB = async () => {
  try {
    // Use the rider database URI as that's where admin users are stored now
    const mongoURI = process.env.MONGODB_RIDER_URI || 
                    'mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/okada-rider?retryWrites=true&w=majority&appName=OkadaCluster';
    
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Update Admin Password
const updateAdminPassword = async () => {
  try {
    // Get the adminusers collection
    console.log("Accessing adminusers collection...");
    const adminUsersCollection = mongoose.connection.db.collection('adminusers');
    
    // Find the admin user
    const admin = await adminUsersCollection.findOne({ email });
    
    if (!admin) {
      console.log('Admin user not found!');
      return;
    }
    
    console.log('Admin user found. Updating password...');
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the admin user's password
    const result = await adminUsersCollection.updateOne(
      { email },
      { $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('Admin password updated successfully!');
      console.log('New admin credentials:');
      console.log('- Email:', email);
      console.log('- Password:', newPassword);
    } else {
      console.log('Admin password update failed!');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
};

// Main function
(async () => {
  try {
    // Connect to MongoDB
    const isConnected = await connectToMongoDB();
    if (!isConnected) {
      console.error('Failed to connect to MongoDB. Exiting.');
      process.exit(1);
    }
    
    // Update admin password
    await updateAdminPassword();
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Script execution failed:', error);
  } finally {
    process.exit(0);
  }
})();
