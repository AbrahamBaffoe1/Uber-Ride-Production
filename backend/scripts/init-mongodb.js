/**
 * MongoDB Initialization Script
 * 
 * This script initializes necessary collections and indexes for the Okada Transportation app.
 * It should be run during the initial setup of the backend server.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

// MongoDB connection strings from environment variables
const MONGO_RIDER_URI = process.env.MONGO_RIDER_URI || process.env.MONGODB_URI;
const MONGO_PASSENGER_URI = process.env.MONGO_PASSENGER_URI || process.env.MONGODB_URI;

// Collections to ensure
const COLLECTIONS = [
  'users',
  'rides',
  'riderLocations',
  'payments',
  'documents',
  'otps',
  'notifications',
  'transactions'
];

/**
 * Initialize MongoDB database
 */
async function initMongoDB() {
  console.log('Starting MongoDB initialization...');
  
  try {
    // Connect to the rider database
    console.log(`Connecting to Rider MongoDB at: ${maskConnectionString(MONGO_RIDER_URI)}`);
    const riderConn = await mongoose.createConnection(MONGO_RIDER_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Connect to the passenger database
    console.log(`Connecting to Passenger MongoDB at: ${maskConnectionString(MONGO_PASSENGER_URI)}`);
    const passengerConn = await mongoose.createConnection(MONGO_PASSENGER_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Initialize collections in both databases
    await initializeCollections(riderConn, 'Rider');
    await initializeCollections(passengerConn, 'Passenger');
    
    // Create indexes
    await createIndexes(riderConn, passengerConn);
    
    console.log('MongoDB initialization completed successfully');
    
    // Close connections
    await riderConn.close();
    await passengerConn.close();
    
    return true;
  } catch (error) {
    console.error('MongoDB initialization failed:', error);
    return false;
  }
}

/**
 * Initialize collections in a database
 */
async function initializeCollections(connection, dbName) {
  console.log(`Initializing collections for ${dbName} database...`);
  
  const existingCollections = await connection.db.listCollections().toArray();
  const existingCollectionNames = existingCollections.map(collection => collection.name);
  
  for (const collectionName of COLLECTIONS) {
    if (!existingCollectionNames.includes(collectionName)) {
      console.log(`Creating collection: ${collectionName}`);
      await connection.db.createCollection(collectionName);
    } else {
      console.log(`Collection ${collectionName} already exists`);
    }
  }
}

/**
 * Create necessary indexes
 */
async function createIndexes(riderConn, passengerConn) {
  console.log('Creating indexes...');
  
  // Create indexes for User collection in both databases
  await createUserIndexes(riderConn, 'rider');
  await createUserIndexes(passengerConn, 'passenger');
  
  // Create indexes for RiderLocation collection in rider database
  await riderConn.collection('riderLocations').createIndex(
    { currentLocation: '2dsphere' },
    { background: true }
  );
  
  // Create indexes for Ride collection in both databases
  await createRideIndexes(riderConn);
  await createRideIndexes(passengerConn);
}

/**
 * Create indexes for User collection
 */
async function createUserIndexes(connection, role) {
  console.log(`Creating indexes for User collection (${role})...`);
  
  await connection.collection('users').createIndex(
    { email: 1 },
    { unique: true, background: true }
  );
  
  await connection.collection('users').createIndex(
    { phoneNumber: 1 },
    { unique: true, background: true }
  );
  
  // Add role-specific indexes
  if (role === 'rider') {
    await connection.collection('users').createIndex(
      { 'riderProfile.vehicleType': 1 },
      { background: true }
    );
  }
}

/**
 * Create indexes for Ride collection
 */
async function createRideIndexes(connection) {
  console.log('Creating indexes for Ride collection...');
  
  await connection.collection('rides').createIndex(
    { userId: 1 },
    { background: true }
  );
  
  await connection.collection('rides').createIndex(
    { riderId: 1 },
    { background: true }
  );
  
  await connection.collection('rides').createIndex(
    { status: 1 },
    { background: true }
  );
  
  await connection.collection('rides').createIndex(
    { 'pickupLocation.coordinates': '2dsphere' },
    { background: true }
  );
  
  await connection.collection('rides').createIndex(
    { 'destination.coordinates': '2dsphere' },
    { background: true }
  );
}

/**
 * Mask sensitive parts of connection string for logging
 */
function maskConnectionString(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

// Run the initialization
initMongoDB()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error during MongoDB initialization:', err);
    process.exit(1);
  });
