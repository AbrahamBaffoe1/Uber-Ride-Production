/**
 * Migration Script: Single DB to Separate Rider/Passenger DBs
 * 
 * This script migrates data from the original unified MongoDB database
 * to the new separate rider and passenger databases.
 * 
 * Usage: node src/scripts/migrate-to-separate-dbs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { 
  connectToRiderDB, 
  connectToPassengerDB 
} = require('../config/mongodb');

// Define models and schemas - import actual models
const userSchema = require('../mongodb/models/User').schema;
const rideSchema = require('../mongodb/models/Ride').schema;
// Add other schemas as needed

// Flag to run in test mode (doesn't save data)
const TEST_MODE = process.env.TEST_MODE === 'true';

// Track migration statistics
const stats = {
  users: { total: 0, riders: 0, passengers: 0, admins: 0, errors: 0 },
  rides: { total: 0, migrated: 0, errors: 0 },
  // Add other collections as needed
};

// Connect to all databases (source and destinations)
async function connectToDatabases() {
  try {
    // Connect to source database (original unified DB)
    const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/okada-transportation';
    const sourceDb = await mongoose.createConnection(sourceUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to source database:', sourceUri);

    // Connect to destination databases
    const riderDb = await connectToRiderDB();
    console.log('Connected to rider database');

    const passengerDb = await connectToPassengerDB();
    console.log('Connected to passenger database');

    return { sourceDb, riderDb, passengerDb };
  } catch (error) {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  }
}

// Migrate users based on role
async function migrateUsers(sourceDb, riderDb, passengerDb) {
  console.log('\n--- Migrating Users ---');
  
  // Create models
  const SourceUser = sourceDb.model('User', userSchema);
  const RiderUser = riderDb.model('User', userSchema);
  const PassengerUser = passengerDb.model('User', userSchema);
  
  try {
    // Get all users from source database
    const users = await SourceUser.find({});
    stats.users.total = users.length;
    console.log(`Found ${users.length} users to migrate`);
    
    // Migrate users by role
    for (const user of users) {
      try {
        const userData = user.toObject();
        delete userData._id; // Let MongoDB generate new IDs
        
        if (user.role === 'rider') {
          // Save to rider database
          if (!TEST_MODE) {
            await new RiderUser({
              ...userData,
              // Preserve original ID for reference
              sourceId: user._id
            }).save();
          }
          stats.users.riders++;
          
        } else if (user.role === 'passenger') {
          // Save to passenger database
          if (!TEST_MODE) {
            await new PassengerUser({
              ...userData,
              sourceId: user._id
            }).save();
          }
          stats.users.passengers++;
          
        } else if (user.role === 'admin') {
          // Save admin users to both databases for convenience
          if (!TEST_MODE) {
            await new RiderUser({
              ...userData,
              sourceId: user._id
            }).save();
            
            await new PassengerUser({
              ...userData,
              sourceId: user._id
            }).save();
          }
          stats.users.admins++;
        }
      } catch (error) {
        console.error(`Error migrating user ${user._id}:`, error.message);
        stats.users.errors++;
      }
    }
    
    console.log(`Migrated ${stats.users.riders} riders, ${stats.users.passengers} passengers, and ${stats.users.admins} admins`);
    if (stats.users.errors > 0) {
      console.warn(`Encountered ${stats.users.errors} errors during user migration`);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }
}

// Migrate rides
async function migrateRides(sourceDb, riderDb, passengerDb) {
  console.log('\n--- Migrating Rides ---');
  
  // Create models
  const SourceRide = sourceDb.model('Ride', rideSchema);
  const RiderRide = riderDb.model('Ride', rideSchema);
  const PassengerRide = passengerDb.model('Ride', rideSchema);
  
  try {
    // Get all rides from source database
    const rides = await SourceRide.find({});
    stats.rides.total = rides.length;
    console.log(`Found ${rides.length} rides to migrate`);
    
    // Migrate each ride
    for (const ride of rides) {
      try {
        const rideData = ride.toObject();
        
        // Always save ride to passenger database (source of truth)
        if (!TEST_MODE) {
          await new PassengerRide({
            ...rideData,
            sourceId: ride._id
          }).save();
        }
        
        // If ride has a riderId, also save to rider database
        if (ride.riderId) {
          if (!TEST_MODE) {
            await new RiderRide({
              ...rideData,
              sourceId: ride._id
            }).save();
          }
        }
        
        stats.rides.migrated++;
      } catch (error) {
        console.error(`Error migrating ride ${ride._id}:`, error.message);
        stats.rides.errors++;
      }
    }
    
    console.log(`Migrated ${stats.rides.migrated} rides`);
    if (stats.rides.errors > 0) {
      console.warn(`Encountered ${stats.rides.errors} errors during ride migration`);
    }
  } catch (error) {
    console.error('Error fetching rides:', error);
  }
}

// Main function to orchestrate migration
async function migrateData() {
  console.log('Starting migration to separate rider and passenger databases...');
  console.log(`Running in ${TEST_MODE ? 'TEST MODE' : 'PRODUCTION MODE'}`);
  
  const startTime = new Date();
  
  try {
    // Connect to all databases
    const { sourceDb, riderDb, passengerDb } = await connectToDatabases();
    
    // Migrate data
    await migrateUsers(sourceDb, riderDb, passengerDb);
    await migrateRides(sourceDb, riderDb, passengerDb);
    // Add other collection migrations as needed
    
    // Close connections
    await sourceDb.close();
    await mongoose.disconnect();
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    // Print summary
    console.log('\n--- Migration Summary ---');
    console.log(`Total time: ${duration} seconds`);
    console.log('Users:');
    console.log(`  - Total: ${stats.users.total}`);
    console.log(`  - Riders: ${stats.users.riders}`);
    console.log(`  - Passengers: ${stats.users.passengers}`);
    console.log(`  - Admins: ${stats.users.admins}`);
    console.log(`  - Errors: ${stats.users.errors}`);
    console.log('Rides:');
    console.log(`  - Total: ${stats.rides.total}`);
    console.log(`  - Migrated: ${stats.rides.migrated}`);
    console.log(`  - Errors: ${stats.rides.errors}`);
    
    console.log('\nMigration completed successfully!');
    
    if (TEST_MODE) {
      console.log('\nThis was a TEST RUN. No data was actually migrated.');
      console.log('To perform the actual migration, set TEST_MODE=false in the environment.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateData();
