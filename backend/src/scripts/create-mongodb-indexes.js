#!/usr/bin/env node
/**
 * MongoDB Index Creation Script
 * 
 * This script creates all required indexes for the Okada application
 * It ensures consistent index configuration across all collections
 */
require('dotenv').config();
const { connectToRiderDB, connectToPassengerDB } = require('../config/mongodb');

async function createIndexes() {
  try {
    console.log('Starting MongoDB index creation process...');
    
    // Connect to rider and passenger databases
    const riderConnection = await connectToRiderDB();
    const passengerConnection = await connectToPassengerDB();
    
    console.log('MongoDB connections established successfully');
    
    // Create all required indexes with proper error handling
    await createAllIndexes(riderConnection, 'rider');
    await createAllIndexes(passengerConnection, 'passenger');
    
    console.log('Index creation completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

/**
 * Creates all required indexes for a specific database connection
 * @param {Object} connection - Mongoose connection object
 * @param {String} dbType - Database type (rider or passenger)
 */
async function createAllIndexes(connection, dbType) {
  console.log(`Creating indexes for ${dbType} database...`);
  
  // Helper function to create indexes safely
  const createIndex = async (collection, indexSpec, options) => {
    try {
      await connection.collection(collection).createIndex(indexSpec, options);
      console.log(`✅ Created index on ${collection}: ${JSON.stringify(indexSpec)}`);
    } catch (error) {
      console.error(`❌ Error creating index on ${collection}: ${JSON.stringify(indexSpec)}`, error.message);
    }
  };

  // Users collection indexes
  await createIndex('users', { email: 1 }, { unique: true, background: true });
  await createIndex('users', { phoneNumber: 1 }, { unique: true, background: true });
  
  // Rides collection indexes
  await createIndex('rides', { riderId: 1 }, { background: true });
  await createIndex('rides', { 'pickupLocation.coordinates': '2dsphere' }, { background: true });
  await createIndex('rides', { 'destination.coordinates': '2dsphere' }, { background: true });
  await createIndex('rides', { status: 1 }, { background: true });
  await createIndex('rides', { riderId: 1, status: 1 }, { background: true });
  await createIndex('rides', { userId: 1, status: 1 }, { background: true });
  await createIndex('rides', { createdAt: -1 }, { background: true });
  
  // Rider locations collection indexes
  await createIndex('riderlocations', { riderId: 1 }, { background: true });
  await createIndex('riderlocations', { currentLocation: '2dsphere' }, { background: true });
  await createIndex('riderlocations', { riderId: 1, lastUpdated: -1 }, { background: true });
  await createIndex('riderlocations', { status: 1 }, { background: true });
  
  // Earnings collection indexes
  await createIndex('earnings', { userId: 1 }, { background: true });
  await createIndex('earnings', { riderId: 1 }, { background: true });
  await createIndex('earnings', { 'pickupLocation.coordinates': '2dsphere' }, { background: true });
  await createIndex('earnings', { 'destination.coordinates': '2dsphere' }, { background: true });
  await createIndex('earnings', { status: 1 }, { background: true });
  await createIndex('earnings', { riderId: 1, status: 1 }, { background: true });
  await createIndex('earnings', { userId: 1, status: 1 }, { background: true });
  await createIndex('earnings', { createdAt: -1 }, { background: true });
  
  // Saved locations collection indexes
  await createIndex('savedlocations', { userId: 1 }, { background: true });
  await createIndex('savedlocations', { riderId: 1 }, { background: true });
  await createIndex('savedlocations', { 'pickupLocation.coordinates': '2dsphere' }, { background: true });
  await createIndex('savedlocations', { 'destination.coordinates': '2dsphere' }, { background: true });
  await createIndex('savedlocations', { status: 1 }, { background: true });
  await createIndex('savedlocations', { riderId: 1, status: 1 }, { background: true });
  await createIndex('savedlocations', { userId: 1, status: 1 }, { background: true });
  await createIndex('savedlocations', { createdAt: -1 }, { background: true });
  
  console.log(`Indexes created for ${dbType} database`);
}

// Execute the function
createIndexes();
