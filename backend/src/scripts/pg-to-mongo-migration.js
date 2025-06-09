#!/usr/bin/env node
/**
 * PostgreSQL to MongoDB Data Migration Script
 * This script migrates data from PostgreSQL to MongoDB
 * 
 * Usage: 
 *   node pg-to-mongo-migration.js [options]
 * 
 * Options:
 *   --all         Migrate all data
 *   --users       Migrate only users
 *   --rides       Migrate only rides
 *   --payments    Migrate only payments
 *   --locations   Migrate only rider locations
 *   --notifications  Migrate only notifications
 *   --earnings    Migrate only rider earnings
 *   --documents   Migrate only rider documents
 *   --batch=N     Batch size for processing (default: 100)
 *   --dry-run     Run without writing to MongoDB
 *   --verbose     Show verbose output
 */

import dotenv from 'dotenv';
dotenv.config();
import { Sequelize, Op } from 'sequelize';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Import PostgreSQL models
import {
  User as PgUser,
  Ride as PgRide,
  Payment as PgPayment,
  RiderLocation as PgRiderLocation,
  RiderEarnings as PgRiderEarnings,
  PaymentMethod as PgPaymentMethod,
  Notification as PgNotification,
  RiderDocument as PgRiderDocument,
  sequelize
} from '../models/index.js';

// Import MongoDB models
import MongoUser from '../mongodb/models/User.js';
import MongoRide from '../mongodb/models/Ride.js';
import MongoTransaction from '../mongodb/models/Transaction.js';
import MongoRiderLocation from '../mongodb/models/RiderLocation.js';
import MongoNotification from '../mongodb/models/Notification.js';
import TrackingEvent from '../mongodb/models/TrackingEvent.js';

// MongoDB connection
import { connectToMongoDB } from '../config/mongodb.js';

// Rename to match the imported name
const MongoTrackingEvent = TrackingEvent;

// Migration statistics
let stats = {
  users: { total: 0, migrated: 0, failed: 0, skipped: 0 },
  rides: { total: 0, migrated: 0, failed: 0, skipped: 0 },
  payments: { total: 0, migrated: 0, failed: 0, skipped: 0 },
  locations: { total: 0, migrated: 0, failed: 0, skipped: 0 },
  notifications: { total: 0, migrated: 0, failed: 0, skipped: 0 },
  documents: { total: 0, migrated: 0, failed: 0, skipped: 0 },
  earnings: { total: 0, migrated: 0, failed: 0, skipped: 0 },
};

// CLI args parsing
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  users: args.includes('--users'),
  rides: args.includes('--rides'),
  payments: args.includes('--payments'),
  locations: args.includes('--locations'),
  notifications: args.includes('--notifications'),
  documents: args.includes('--documents'),
  earnings: args.includes('--earnings'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  batchSize: 100
};

// Set default if no specific migration is selected
if (!options.all && 
    !options.users && 
    !options.rides && 
    !options.payments && 
    !options.locations && 
    !options.notifications && 
    !options.documents && 
    !options.earnings) {
  options.all = true;
}

// Get batch size if specified
const batchArg = args.find(arg => arg.startsWith('--batch='));
if (batchArg) {
  const batchSize = parseInt(batchArg.split('=')[1], 10);
  if (!isNaN(batchSize) && batchSize > 0) {
    options.batchSize = batchSize;
  }
}

// Logger with verbosity control
const log = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
  debug: (message) => options.verbose && console.log(`[DEBUG] ${message}`),
  warn: (message) => console.warn(`[WARNING] ${message}`)
};

// Helper: Generate MongoDB ObjectId from PostgreSQL id
const generateObjectId = (pgId) => {
  // Create a deterministic ObjectId from the PostgreSQL id
  // This ensures the same PG ID always maps to the same Mongo ID
  const hash = crypto.createHash('md5').update(`${pgId}`).digest('hex');
  return mongoose.Types.ObjectId(hash.substring(0, 24));
};

// Helper: Process in batches
async function processBatches(fetchFn, processFn, type, options) {
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    log.info(`Processing ${type} batch of ${options.batchSize} from offset ${offset}...`);
    
    const startTime = performance.now();
    const items = await fetchFn(options.batchSize, offset);
    const fetchTime = performance.now() - startTime;
    
    log.debug(`Fetched ${items.length} ${type} in ${fetchTime.toFixed(2)}ms`);
    
    if (items.length === 0) {
      hasMore = false;
      break;
    }
    
    // Process this batch
    const processStartTime = performance.now();
    await processFn(items);
    const processTime = performance.now() - processStartTime;
    
    log.debug(`Processed batch in ${processTime.toFixed(2)}ms`);
    
    // Update offset for next batch
    offset += options.batchSize;
    
    // If we got fewer items than the batch size, we're done
    if (items.length < options.batchSize) {
      hasMore = false;
    }
  }
}

// Migrate Users
async function migrateUsers() {
  log.info('Starting user migration...');
  
  // Count total users
  stats.users.total = await PgUser.count();
  log.info(`Total users to migrate: ${stats.users.total}`);
  
  // Fetch function for batching
  const fetchUsers = async (limit, offset) => {
    return PgUser.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processUsers = async (pgUsers) => {
    for (const pgUser of pgUsers) {
      try {
        // Convert PostgreSQL user to MongoDB format
        const mongoUserId = generateObjectId(pgUser.id);
        
        // Check if user already exists in MongoDB
        const existingUser = await MongoUser.findById(mongoUserId);
        if (existingUser) {
          log.debug(`User ${pgUser.id} already exists in MongoDB, skipping`);
          stats.users.skipped++;
          continue;
        }
        
        // Transform user data
        const mongoUser = new MongoUser({
          _id: mongoUserId,
          firstName: pgUser.firstName,
          lastName: pgUser.lastName,
          email: pgUser.email,
          phoneNumber: pgUser.phoneNumber,
          password: pgUser.password, // Already hashed
          role: pgUser.role,
          profilePicture: pgUser.profilePicture,
          isEmailVerified: pgUser.isEmailVerified,
          isPhoneVerified: pgUser.isPhoneVerified,
          twoFactorEnabled: pgUser.twoFactorEnabled || false,
          twoFactorMethod: pgUser.twoFactorMethod || null,
          lastLogin: pgUser.lastLogin,
          accountStatus: pgUser.status || 'active',
          createdAt: pgUser.createdAt,
          updatedAt: pgUser.updatedAt
        });
        
        // Add rider profile data if applicable
        if (pgUser.role === 'rider') {
          mongoUser.riderProfile = {
            isActive: true,
            averageRating: pgUser.averageRating || 0,
            totalRides: pgUser.totalRides || 0,
            vehicleType: pgUser.vehicleType || 'motorcycle',
            documentVerified: pgUser.documentVerified || false
          };
        }
        
        // Add passenger profile data if applicable
        if (pgUser.role === 'passenger') {
          mongoUser.passengerProfile = {
            totalRides: pgUser.totalRides || 0,
            savedAddresses: []
          };
          
          // TODO: Migrate saved addresses if available
        }
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoUser.save();
        }
        
        stats.users.migrated++;
        if (options.verbose) {
          log.debug(`Migrated user ${pgUser.id} -> ${mongoUserId}`);
        }
      } catch (error) {
        stats.users.failed++;
        log.error(`Failed to migrate user ${pgUser.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process users in batches
  await processBatches(fetchUsers, processUsers, 'users', options);
  
  log.success(`User migration completed. Migrated: ${stats.users.migrated}, Failed: ${stats.users.failed}, Skipped: ${stats.users.skipped}`);
}

// Migrate Rides
async function migrateRides() {
  log.info('Starting ride migration...');
  
  // Count total rides
  stats.rides.total = await PgRide.count();
  log.info(`Total rides to migrate: ${stats.rides.total}`);
  
  // Fetch function for batching
  const fetchRides = async (limit, offset) => {
    return PgRide.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processRides = async (pgRides) => {
    for (const pgRide of pgRides) {
      try {
        // Generate MongoDB IDs from PostgreSQL IDs
        const mongoRideId = generateObjectId(pgRide.id);
        const mongoUserId = generateObjectId(pgRide.passengerId);
        const mongoRiderId = pgRide.riderId ? generateObjectId(pgRide.riderId) : null;
        
        // Check if ride already exists in MongoDB
        const existingRide = await MongoRide.findById(mongoRideId);
        if (existingRide) {
          log.debug(`Ride ${pgRide.id} already exists in MongoDB, skipping`);
          stats.rides.skipped++;
          continue;
        }
        
        // Transform pickup and dropoff locations
        const pickupLocation = {
          address: pgRide.pickupAddress,
          coordinates: {
            type: 'Point',
            coordinates: pgRide.pickupLocation 
              ? [pgRide.pickupLocation.coordinates[0], pgRide.pickupLocation.coordinates[1]] 
              : [0, 0]
          }
        };
        
        const destination = {
          address: pgRide.dropoffAddress,
          coordinates: {
            type: 'Point',
            coordinates: pgRide.dropoffLocation 
              ? [pgRide.dropoffLocation.coordinates[0], pgRide.dropoffLocation.coordinates[1]] 
              : [0, 0]
          }
        };
        
        // Create MongoDB ride document
        const mongoRide = new MongoRide({
          _id: mongoRideId,
          userId: mongoUserId,
          riderId: mongoRiderId,
          pickupLocation: pickupLocation,
          destination: destination,
          status: pgRide.status,
          scheduledPickupTime: pgRide.scheduledPickupTime,
          actualPickupTime: pgRide.startedAt,
          actualDropoffTime: pgRide.completedAt,
          estimatedDuration: pgRide.estimatedDuration,
          actualDuration: pgRide.actualDuration,
          estimatedDistance: pgRide.estimatedDistance,
          actualDistance: pgRide.actualDistance,
          fare: {
            baseFare: pgRide.baseFare || 0,
            distanceFare: pgRide.distanceFare || 0,
            timeFare: pgRide.timeFare || 0,
            surgeMultiplier: pgRide.surgeMultiplier || 1.0,
            totalFare: pgRide.estimatedFare || 0,
            currency: pgRide.currency || 'NGN'
          },
          paymentMethod: pgRide.paymentMethod || 'cash',
          paymentStatus: pgRide.paymentStatus || 'pending',
          cancelledBy: pgRide.cancelledBy,
          cancellationReason: pgRide.cancellationReason,
          createdAt: pgRide.createdAt,
          updatedAt: pgRide.updatedAt
        });
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoRide.save();
        }
        
        stats.rides.migrated++;
        if (options.verbose) {
          log.debug(`Migrated ride ${pgRide.id} -> ${mongoRideId}`);
        }
      } catch (error) {
        stats.rides.failed++;
        log.error(`Failed to migrate ride ${pgRide.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process rides in batches
  await processBatches(fetchRides, processRides, 'rides', options);
  
  log.success(`Ride migration completed. Migrated: ${stats.rides.migrated}, Failed: ${stats.rides.failed}, Skipped: ${stats.rides.skipped}`);
}

// Migrate Payments to Transactions
async function migratePayments() {
  log.info('Starting payment migration...');
  
  // Count total payments
  stats.payments.total = await PgPayment.count();
  log.info(`Total payments to migrate: ${stats.payments.total}`);
  
  // Fetch function for batching
  const fetchPayments = async (limit, offset) => {
    return PgPayment.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processPayments = async (pgPayments) => {
    for (const pgPayment of pgPayments) {
      try {
        // Generate MongoDB IDs from PostgreSQL IDs
        const mongoTransactionId = generateObjectId(pgPayment.id);
        const mongoUserId = generateObjectId(pgPayment.userId);
        const mongoRideId = pgPayment.rideId ? generateObjectId(pgPayment.rideId) : null;
        
        // Check if transaction already exists in MongoDB
        const existingTransaction = await MongoTransaction.findById(mongoTransactionId);
        if (existingTransaction) {
          log.debug(`Payment ${pgPayment.id} already exists in MongoDB, skipping`);
          stats.payments.skipped++;
          continue;
        }
        
        // Determine transaction type
        let transactionType = 'ride_payment';
        if (pgPayment.type === 'refund') {
          transactionType = 'refund';
        } else if (pgPayment.type === 'payout') {
          transactionType = 'cashout';
        }
        
        // Determine transaction status
        let transactionStatus = 'pending';
        switch (pgPayment.status) {
          case 'completed':
          case 'successful':
            transactionStatus = 'completed';
            break;
          case 'failed':
            transactionStatus = 'failed';
            break;
          case 'cancelled':
            transactionStatus = 'cancelled';
            break;
          case 'refunded':
            transactionStatus = 'refunded';
            break;
          default:
            transactionStatus = pgPayment.status;
        }
        
        // Create MongoDB transaction document
        const mongoTransaction = new MongoTransaction({
          _id: mongoTransactionId,
          userId: mongoUserId,
          amount: pgPayment.amount,
          currency: pgPayment.currency || 'NGN',
          type: transactionType,
          status: transactionStatus,
          gateway: pgPayment.gateway,
          gatewayTransactionId: pgPayment.gatewayTransactionId,
          gatewayResponse: pgPayment.gatewayResponse,
          description: pgPayment.description,
          rideId: mongoRideId,
          paymentMethod: pgPayment.paymentMethod,
          createdAt: pgPayment.createdAt,
          updatedAt: pgPayment.updatedAt,
          processedAt: pgPayment.processedAt || pgPayment.updatedAt
        });
        
        // Add payment details if available
        if (pgPayment.cardDetails) {
          mongoTransaction.paymentDetails = {
            cardBrand: pgPayment.cardDetails.brand,
            last4Digits: pgPayment.cardDetails.last4,
            expiryMonth: pgPayment.cardDetails.exp_month,
            expiryYear: pgPayment.cardDetails.exp_year
          };
        }
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoTransaction.save();
        }
        
        stats.payments.migrated++;
        if (options.verbose) {
          log.debug(`Migrated payment ${pgPayment.id} -> ${mongoTransactionId}`);
        }
      } catch (error) {
        stats.payments.failed++;
        log.error(`Failed to migrate payment ${pgPayment.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process payments in batches
  await processBatches(fetchPayments, processPayments, 'payments', options);
  
  log.success(`Payment migration completed. Migrated: ${stats.payments.migrated}, Failed: ${stats.payments.failed}, Skipped: ${stats.payments.skipped}`);
}

// Migrate RiderLocations
async function migrateLocations() {
  log.info('Starting rider location migration...');
  
  // Count total locations
  stats.locations.total = await PgRiderLocation.count();
  log.info(`Total rider locations to migrate: ${stats.locations.total}`);
  
  // Fetch function for batching
  const fetchLocations = async (limit, offset) => {
    return PgRiderLocation.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processLocations = async (pgLocations) => {
    for (const pgLocation of pgLocations) {
      try {
        // Generate MongoDB IDs from PostgreSQL IDs
        const mongoLocationId = generateObjectId(pgLocation.id);
        const mongoRiderId = generateObjectId(pgLocation.riderId);
        const mongoRideId = pgLocation.currentRideId ? generateObjectId(pgLocation.currentRideId) : null;
        
        // Check if location already exists in MongoDB
        const existingLocation = await MongoRiderLocation.findOne({ riderId: mongoRiderId });
        if (existingLocation) {
          log.debug(`Location for rider ${pgLocation.riderId} already exists in MongoDB, updating...`);
          
          // Update existing location instead of creating a new one
          if (!options.dryRun) {
            await MongoRiderLocation.updateOne(
              { riderId: mongoRiderId },
              {
                $set: {
                  currentLocation: {
                    type: 'Point',
                    coordinates: pgLocation.location 
                      ? [pgLocation.location.coordinates[0], pgLocation.location.coordinates[1]] 
                      : [0, 0]
                  },
                  heading: pgLocation.heading,
                  speed: pgLocation.speed,
                  accuracy: pgLocation.accuracy,
                  status: pgLocation.isAvailable ? 'online' : 'offline',
                  currentRideId: mongoRideId,
                  lastUpdated: pgLocation.updatedAt,
                  updatedAt: new Date()
                }
              }
            );
          }
          
          stats.locations.migrated++;
          continue;
        }
        
        // Create new MongoDB location document
        const mongoLocation = new MongoRiderLocation({
          _id: mongoLocationId,
          riderId: mongoRiderId,
          currentLocation: {
            type: 'Point',
            coordinates: pgLocation.location 
              ? [pgLocation.location.coordinates[0], pgLocation.location.coordinates[1]] 
              : [0, 0]
          },
          heading: pgLocation.heading,
          speed: pgLocation.speed,
          accuracy: pgLocation.accuracy,
          status: pgLocation.isAvailable ? 'online' : 'offline',
          currentRideId: mongoRideId,
          lastUpdated: pgLocation.updatedAt,
          createdAt: pgLocation.createdAt,
          updatedAt: pgLocation.updatedAt
        });
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoLocation.save();
        }
        
        stats.locations.migrated++;
        if (options.verbose) {
          log.debug(`Migrated rider location ${pgLocation.id} -> ${mongoLocationId}`);
        }
      } catch (error) {
        stats.locations.failed++;
        log.error(`Failed to migrate rider location ${pgLocation.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process locations in batches
  await processBatches(fetchLocations, processLocations, 'locations', options);
  
  log.success(`Rider location migration completed. Migrated: ${stats.locations.migrated}, Failed: ${stats.locations.failed}, Skipped: ${stats.locations.skipped}`);
}

// Migrate Notifications
async function migrateNotifications() {
  if (!PgNotification) {
    log.warn('PgNotification model not found, skipping notifications migration');
    return;
  }

  log.info('Starting notifications migration...');
  
  // Count total notifications
  stats.notifications.total = await PgNotification.count();
  log.info(`Total notifications to migrate: ${stats.notifications.total}`);
  
  // Fetch function for batching
  const fetchNotifications = async (limit, offset) => {
    return PgNotification.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processNotifications = async (pgNotifications) => {
    for (const pgNotification of pgNotifications) {
      try {
        // Generate MongoDB IDs from PostgreSQL IDs
        const mongoNotificationId = generateObjectId(pgNotification.id);
        const mongoUserId = generateObjectId(pgNotification.userId);
        
        // Check if notification already exists in MongoDB
        const existingNotification = await MongoNotification.findById(mongoNotificationId);
        if (existingNotification) {
          log.debug(`Notification ${pgNotification.id} already exists in MongoDB, skipping`);
          stats.notifications.skipped++;
          continue;
        }
        
        // Create MongoDB notification document
        const mongoNotification = new MongoNotification({
          _id: mongoNotificationId,
          userId: mongoUserId,
          type: pgNotification.type,
          title: pgNotification.title,
          message: pgNotification.message,
          data: pgNotification.data || {},
          priority: pgNotification.priority || 'medium',
          isRead: pgNotification.isRead,
          readAt: pgNotification.readAt,
          createdAt: pgNotification.createdAt,
          updatedAt: pgNotification.updatedAt
        });
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoNotification.save();
        }
        
        stats.notifications.migrated++;
        if (options.verbose) {
          log.debug(`Migrated notification ${pgNotification.id} -> ${mongoNotificationId}`);
        }
      } catch (error) {
        stats.notifications.failed++;
        log.error(`Failed to migrate notification ${pgNotification.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process notifications in batches
  await processBatches(fetchNotifications, processNotifications, 'notifications', options);
  
  log.success(`Notification migration completed. Migrated: ${stats.notifications.migrated}, Failed: ${stats.notifications.failed}, Skipped: ${stats.notifications.skipped}`);
}

// Migrate Earnings
async function migrateEarnings() {
  if (!PgRiderEarnings) {
    log.warn('PgRiderEarnings model not found, skipping earnings migration');
    return;
  }

  log.info('Starting rider earnings migration...');
  
  // Count total earnings
  stats.earnings.total = await PgRiderEarnings.count();
  log.info(`Total rider earnings to migrate: ${stats.earnings.total}`);
  
  // Fetch function for batching
  const fetchEarnings = async (limit, offset) => {
    return PgRiderEarnings.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processEarnings = async (pgEarnings) => {
    for (const pgEarning of pgEarnings) {
      try {
        // Generate MongoDB IDs from PostgreSQL IDs
        const mongoTransactionId = generateObjectId(pgEarning.id);
        const mongoRiderId = generateObjectId(pgEarning.riderId);
        const mongoRideId = pgEarning.rideId ? generateObjectId(pgEarning.rideId) : null;
        
        // Check if transaction already exists in MongoDB
        const existingTransaction = await MongoTransaction.findById(mongoTransactionId);
        if (existingTransaction) {
          log.debug(`Earning ${pgEarning.id} already exists in MongoDB, skipping`);
          stats.earnings.skipped++;
          continue;
        }
        
        // Create MongoDB transaction document for earnings
        const mongoTransaction = new MongoTransaction({
          _id: mongoTransactionId,
          userId: mongoRiderId,
          amount: pgEarning.amount,
          currency: pgEarning.currency || 'NGN',
          type: 'ride_earning',
          status: pgEarning.status === 'available' ? 'completed' : pgEarning.status,
          gateway: 'internal',
          description: pgEarning.description || `Earnings for ride`,
          rideId: mongoRideId,
          createdAt: pgEarning.createdAt || pgEarning.transactionDate,
          updatedAt: pgEarning.updatedAt,
          processedAt: pgEarning.transactionDate
        });
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoTransaction.save();
        }
        
        stats.earnings.migrated++;
        if (options.verbose) {
          log.debug(`Migrated rider earning ${pgEarning.id} -> ${mongoTransactionId}`);
        }
      } catch (error) {
        stats.earnings.failed++;
        log.error(`Failed to migrate rider earning ${pgEarning.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process earnings in batches
  await processBatches(fetchEarnings, processEarnings, 'earnings', options);
  
  log.success(`Rider earnings migration completed. Migrated: ${stats.earnings.migrated}, Failed: ${stats.earnings.failed}, Skipped: ${stats.earnings.skipped}`);
}

// Migrate RiderDocuments
async function migrateDocuments() {
  if (!PgRiderDocument) {
    log.warn('PgRiderDocument model not found, skipping documents migration');
    return;
  }

  log.info('Starting rider documents migration...');
  
  // Create the MongoDB model for rider documents if not present already
  let MongoDocument;
  try {
    MongoDocument = mongoose.model('RiderDocument');
  } catch (error) {
    // Model doesn't exist, create it
    const documentSchema = new mongoose.Schema({
      riderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },
      type: {
        type: String,
        required: true,
        enum: ['license', 'registration', 'insurance', 'identity', 'photo', 'other']
      },
      documentUrl: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      verificationNotes: String,
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      expiryDate: Date,
      metadata: mongoose.Schema.Types.Mixed
    }, { timestamps: true });
    
    MongoDocument = mongoose.model('RiderDocument', documentSchema);
  }

  // Count total documents
  stats.documents.total = await PgRiderDocument.count();
  log.info(`Total rider documents to migrate: ${stats.documents.total}`);
  
  // Fetch function for batching
  const fetchDocuments = async (limit, offset) => {
    return PgRiderDocument.findAll({
      limit,
      offset,
      order: [['id', 'ASC']]
    });
  };
  
  // Process function for batching
  const processDocuments = async (pgDocuments) => {
    for (const pgDocument of pgDocuments) {
      try {
        // Generate MongoDB IDs from PostgreSQL IDs
        const mongoDocumentId = generateObjectId(pgDocument.id);
        const mongoRiderId = generateObjectId(pgDocument.riderId);
        const mongoVerifierId = pgDocument.verifiedBy ? generateObjectId(pgDocument.verifiedBy) : null;
        
        // Check if document already exists in MongoDB
        const existingDocument = await MongoDocument.findById(mongoDocumentId);
        if (existingDocument) {
          log.debug(`Document ${pgDocument.id} already exists in MongoDB, skipping`);
          stats.documents.skipped++;
          continue;
        }
        
        // Create MongoDB document document
        const mongoDocument = new MongoDocument({
          _id: mongoDocumentId,
          riderId: mongoRiderId,
          type: pgDocument.documentType,
          documentUrl: pgDocument.documentUrl,
          status: pgDocument.status || 'pending',
          verificationNotes: pgDocument.verificationNotes,
          verifiedAt: pgDocument.verifiedAt,
          verifiedBy: mongoVerifierId,
          expiryDate: pgDocument.expiryDate,
          metadata: pgDocument.metadata || {},
          createdAt: pgDocument.createdAt,
          updatedAt: pgDocument.updatedAt
        });
        
        // Save to MongoDB if not a dry run
        if (!options.dryRun) {
          await mongoDocument.save();
        }
        
        stats.documents.migrated++;
        if (options.verbose) {
          log.debug(`Migrated rider document ${pgDocument.id} -> ${mongoDocumentId}`);
        }
      } catch (error) {
        stats.documents.failed++;
        log.error(`Failed to migrate rider document ${pgDocument.id}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
  };
  
  // Process documents in batches
  await processBatches(fetchDocuments, processDocuments, 'documents', options);
  
  log.success(`Rider documents migration completed. Migrated: ${stats.documents.migrated}, Failed: ${stats.documents.failed}, Skipped: ${stats.documents.skipped}`);
}

// Main migration function
async function runMigration() {
  try {
    // Start timer
    const startTime = Date.now();
    
    log.info('Starting PostgreSQL to MongoDB migration...');
    if (options.dryRun) {
      log.info('DRY RUN MODE: No data will be written to MongoDB');
    }
    
    // Connect to MongoDB
    log.info('Connecting to MongoDB...');
    await connectToMongoDB();
    
    // Connect to PostgreSQL (should already be set up in models/index.js)
    log.info('Checking PostgreSQL connection...');
    await sequelize.authenticate();
    
    // Run migrations based on options
    if (options.all || options.users) {
      await migrateUsers();
    }
    
    if (options.all || options.rides) {
      await migrateRides();
    }
    
    if (options.all || options.payments) {
      await migratePayments();
    }
    
    if (options.all || options.locations) {
      await migrateLocations();
    }
    
    if (options.all || options.notifications) {
      await migrateNotifications();
    }
    
    if (options.all || options.documents) {
      await migrateDocuments();
    }
    
    if (options.all || options.earnings) {
      await migrateEarnings();
    }
    
    // Calculate total time
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Print summary
    log.info('Migration completed!');
    log.info(`Total time: ${totalTime} seconds`);
    log.info('Summary:');
    log.info(`- Users: ${stats.users.migrated}/${stats.users.total} migrated, ${stats.users.failed} failed, ${stats.users.skipped} skipped`);
    log.info(`- Rides: ${stats.rides.migrated}/${stats.rides.total} migrated, ${stats.rides.failed} failed, ${stats.rides.skipped} skipped`);
    log.info(`- Payments: ${stats.payments.migrated}/${stats.payments.total} migrated, ${stats.payments.failed} failed, ${stats.payments.skipped} skipped`);
    log.info(`- Locations: ${stats.locations.migrated}/${stats.locations.total} migrated, ${stats.locations.failed} failed, ${stats.locations.skipped} skipped`);
    log.info(`- Notifications: ${stats.notifications.migrated}/${stats.notifications.total} migrated, ${stats.notifications.failed} failed, ${stats.notifications.skipped} skipped`);
    log.info(`- Documents: ${stats.documents.migrated}/${stats.documents.total} migrated, ${stats.documents.failed} failed, ${stats.documents.skipped} skipped`);
    log.info(`- Earnings: ${stats.earnings.migrated}/${stats.earnings.total} migrated, ${stats.earnings.failed} failed, ${stats.earnings.skipped} skipped`);
    
    // Close connections
    await mongoose.connection.close();
    await sequelize.close();
    
    return true;
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
    
    // Try to close connections
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      await sequelize.close();
    } catch (closeError) {
      log.error(`Error closing connections: ${closeError.message}`);
    }
    
    return false;
  }
}

// Run migration if this script is executed directly
// In ES modules, there's no require.main === module equivalent
// We can use import.meta.url to check if this is the main module
const isMainModule = import.meta.url.endsWith(process.argv[1]);
if (isMainModule) {
  runMigration()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export for testing or programmatic usage
export { 
  runMigration,
  migrateUsers,
  migrateRides,
  migratePayments,
  migrateLocations,
  migrateNotifications,
  migrateDocuments,
  migrateEarnings,
  generateObjectId
};
