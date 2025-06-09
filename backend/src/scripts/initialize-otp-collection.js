/**
 * Initialize OTP Collection Script
 * This script creates the OTP collection in MongoDB with the necessary indexes
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectToMongo } = require('../utils/mongo-client');

// Define OTP schema with TTL index
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  userId: { type: String, required: true },
  type: { type: String, required: true, enum: ['verification', 'passwordReset', 'login'] },
  createdAt: { type: Date, default: Date.now, expires: 600 } // TTL index: document expires after 10 minutes
});

// Add indexes for faster lookups
otpSchema.index({ userId: 1, type: 1 });
otpSchema.index({ email: 1 });
otpSchema.index({ createdAt: -1 });

async function initializeOtpCollection() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongo();
    console.log('Connected to MongoDB successfully');

    // Create OTP model for both rider and passenger databases
    const riderConnection = mongoose.createConnection(process.env.MONGODB_RIDER_URI);
    const passengerConnection = mongoose.createConnection(process.env.MONGODB_PASSENGER_URI);

    console.log('Creating OTP collection in rider database...');
    const RiderOTP = riderConnection.model('OTP', otpSchema);
    await RiderOTP.createCollection();
    console.log('OTP collection created in rider database');

    console.log('Creating OTP collection in passenger database...');
    const PassengerOTP = passengerConnection.model('OTP', otpSchema);
    await PassengerOTP.createCollection();
    console.log('OTP collection created in passenger database');

    // Create a test OTP to verify the collection works
    console.log('Creating test OTP records...');
    await RiderOTP.create({
      email: 'test-rider@example.com',
      otp: '123456',
      userId: 'test-rider-id',
      type: 'verification',
      createdAt: new Date()
    });

    await PassengerOTP.create({
      email: 'test-passenger@example.com',
      otp: '654321',
      userId: 'test-passenger-id',
      type: 'verification',
      createdAt: new Date()
    });
    console.log('Test OTP records created successfully');

    // Verify the collections exist and have the correct indexes
    console.log('Verifying rider OTP collection...');
    const riderIndexes = await RiderOTP.collection.indexes();
    console.log('Rider OTP collection indexes:', riderIndexes);

    console.log('Verifying passenger OTP collection...');
    const passengerIndexes = await PassengerOTP.collection.indexes();
    console.log('Passenger OTP collection indexes:', passengerIndexes);

    console.log('OTP collections initialized successfully');
    
    // Close connections
    await riderConnection.close();
    await passengerConnection.close();
    await mongoose.disconnect();
    
    console.log('MongoDB connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing OTP collection:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeOtpCollection();
