/**
 * Script to directly create an admin user in MongoDB
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_RIDER_URI || process.env.MONGODB_URI;

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000
};

// Main function to create admin user
async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB connected successfully');
    
    try {
      // Define a simplified User schema
      const UserSchema = new mongoose.Schema({
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        firstName: String,
        lastName: String,
        phoneNumber: String,
        role: { type: String, default: 'user' },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        status: { type: String, default: 'pending' },
        accountStatus: { type: String, default: 'active' }
      });
      
      // Create User model
      const User = mongoose.model('User', UserSchema);
      
      // Check if admin user already exists
      const existingAdmin = await User.findOne({ email: 'admin@okada-transportation.com' });
      
      if (existingAdmin) {
        console.log('Admin user already exists. Updating password...');
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);
        
        // Update password
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
        
        console.log('Admin password updated successfully');
      } else {
        console.log('Creating new admin user...');
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);
        
        // Create a unique phone number
        const uniquePhoneNumber = `+1${Math.floor(100000000 + Math.random() * 900000000)}`;
        
        // Create admin user
        const adminUser = new User({
          email: 'admin@okada-transportation.com',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Admin',
          phoneNumber: uniquePhoneNumber,
          role: 'admin',
          isEmailVerified: true,
          isPhoneVerified: true,
          status: 'active',
          accountStatus: 'active'
        });
        
        await adminUser.save();
        console.log('Admin user created successfully');
      }
      
      console.log('Admin credentials:');
      console.log('Email: admin@okada-transportation.com');
      console.log('Password: Admin123!');
    } catch (error) {
      console.error('Error creating/updating admin user:', error);
    } finally {
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

// Run the function
createAdminUser();
