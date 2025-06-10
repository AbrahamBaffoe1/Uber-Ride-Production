/**
 * Check Admin User and create one if not found
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import AdminUser from '../mongodb/models/AdminUser.js';
import bcrypt from 'bcryptjs';

// Get admin details
const email = 'admin@okada-transportation.com';
const password = 'admin123';
const firstName = 'System';
const lastName = 'Admin';

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

// Create Admin User
const createAdminUser = async () => {
  try {
    // Check if admin exists in the adminusers collection
    console.log("Checking for admin user in adminusers collection...");
    const adminUsersCollection = mongoose.connection.db.collection('adminusers');
    const existingAdmin = await adminUsersCollection.findOne({ email });
    
    if (existingAdmin) {
      console.log('Admin user found in collection!');
      console.log('Admin details:', existingAdmin);
      return;
    }
    
    console.log('No admin user found in collection. Creating new admin user...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new admin directly in the collection
    const result = await adminUsersCollection.insertOne({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber: '+1987654321',
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Admin user created successfully!', result);
  } catch (error) {
    console.error('Error checking/creating admin user:', error);
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
    
    // Create admin user
    await createAdminUser();
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Script execution failed:', error);
  } finally {
    process.exit(0);
  }
})();
