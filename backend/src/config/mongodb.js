import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB Connection Configuration
// Always use Atlas URIs since local MongoDB isn't installed
const MONGODB_RIDER_URI = process.env.MONGODB_RIDER_URI || 'mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/okada-rider?retryWrites=true&w=majority&appName=OkadaCluster';
const MONGODB_PASSENGER_URI = process.env.MONGODB_PASSENGER_URI || 'mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/okada-passenger?retryWrites=true&w=majority&appName=OkadaCluster';

// Dramatically increased timeout values to fix connection and operation timeouts
const TIMEOUT_VALUES = {
  BUFFER_TIMEOUT_MS: 300000,     // 5 minutes
  CONNECTION_TIMEOUT_MS: 180000, // 3 minutes
  SOCKET_TIMEOUT_MS: 240000,     // 4 minutes
  SERVER_SELECTION_TIMEOUT_MS: 180000, // 3 minutes
  MAX_TIME_MS: 180000,           // 3 minutes
  OPERATION_TIMEOUT: 180000      // 3 minutes
};

// Define optimized connection options with extended timeout values
const baseOptions = {
  connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
  socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
  serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
  heartbeatFrequencyMS: 10000,   // More frequent heartbeats
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 20,               // Increased from 10 to 20
  minPoolSize: 5,                // Increased to maintain more connections
  maxIdleTimeMS: 60000,          // Increased idle timeout
  waitQueueTimeoutMS: TIMEOUT_VALUES.BUFFER_TIMEOUT_MS  // Prevent wait queue timeouts
};

// Cloud connection options need SSL/TLS
const cloudMongooseOptions = {
  connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
  socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
  serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: TIMEOUT_VALUES.BUFFER_TIMEOUT_MS,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  // Additional driver options
  driverOptions: {
    serverApi: { version: '1' },
    monitorCommands: true
  }
};

// Local connection options don't need SSL/TLS
const localMongooseOptions = {
  connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
  socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
  serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
  family: 4, // Force IPv4
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: TIMEOUT_VALUES.BUFFER_TIMEOUT_MS,
  // Additional driver options
  driverOptions: {
    serverApi: { version: '1' },
    monitorCommands: true
  }
};

// MongoDB client options
const mongoClientOptions = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  ...baseOptions
};

// Add a function to check if a MongoDB URI is valid
const isValidMongoURI = (uri) => {
  if (!uri) return false;
  
  // Basic URI validation - must have mongodb:// or mongodb+srv:// prefix
  const validPrefix = uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  
  // Must contain at least one slash after the prefix
  const hasPath = uri.indexOf('/', uri.indexOf('://') + 3) !== -1;
  
  return validPrefix && hasPath;
};

// Select the appropriate URI based on environment and app type
const getMongoDBUri = (appType = 'shared') => {
  let uri;
  
  // Select URI based on app type
  if (appType === 'rider') {
    uri = MONGODB_RIDER_URI;
  } else if (appType === 'passenger') {
    uri = MONGODB_PASSENGER_URI;
  } else {
    // Default to rider for shared connections (admin, etc.)
    uri = MONGODB_RIDER_URI;
  }
  
  // Validate the URI
  if (!isValidMongoURI(uri)) {
    console.error(`Invalid MongoDB URI for ${appType}:`, uri);
    
    // Fall back to local URI if the cloud URI is invalid
    console.warn(`Falling back to local MongoDB URI for ${appType}`);
    
    if (appType === 'rider') {
      uri = MONGODB_RIDER_LOCAL_URI;
    } else if (appType === 'passenger') {
      uri = MONGODB_PASSENGER_LOCAL_URI;
    } else {
      uri = MONGODB_RIDER_LOCAL_URI;
    }
    
    // Validate fallback URI
    if (!isValidMongoURI(uri)) {
      console.error(`Invalid fallback MongoDB URI for ${appType}:`, uri);
      throw new Error(`No valid MongoDB URI available for ${appType}`);
    }
  }
  
  return uri;
};

// Connect to MongoDB using Mongoose with improved error handling and connection management
const connectToMongoDB = async (appType = 'shared') => {
  // We're disabling offline mode completely as requested
  const isOfflineMode = false;
  
  try {
    // Get URI based on app type
    const uri = getMongoDBUri(appType);
    
    // Mask credentials in log output for security
    const maskedUri = uri.includes('@') 
      ? uri.substring(0, uri.indexOf('://') + 3) + '***:***@' + uri.substring(uri.indexOf('@') + 1) 
      : uri;
    
    console.log(`Attempting to connect to MongoDB (${appType}) with extended timeouts at: ${maskedUri}`);
    
    // Determine if this is a local or cloud connection
    const isLocalConnection = uri.includes('localhost') || uri.includes('127.0.0.1');
    
    // Use appropriate connection options based on the URI
    const options = isLocalConnection 
      ? { ...localMongooseOptions }  // Local connection
      : { ...cloudMongooseOptions }; // Cloud connection
    
    // Add app name to options
    options.appName = `okada-${appType}`;
    
    // Apply global Mongoose settings
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    mongoose.set('bufferCommands', true);
    mongoose.set('maxTimeMS', TIMEOUT_VALUES.MAX_TIME_MS);
    
    // Setup retry logic for connections
    const maxRetries = 5;
    let retryCount = 0;
    let connection = null;
    
    while (retryCount < maxRetries && !connection) {
      try {
        console.log(`MongoDB (${appType}) connection attempt ${retryCount + 1}/${maxRetries}...`);
        
        // Create a mongoose connection with extended timeouts
        connection = mongoose.createConnection(uri, options);
        
        // Add connection event handlers
        connection.on('connected', () => {
          console.log(`MongoDB (${appType}) connected successfully at ${isLocalConnection ? 'localhost' : 'Atlas'}`);
        });
        
        connection.on('disconnected', () => {
          console.warn(`MongoDB (${appType}) disconnected. Attempting to reconnect...`);
        });
        
        connection.on('error', (err) => {
          console.error(`MongoDB (${appType}) connection error:`, err);
        });
        
        connection.on('reconnected', () => {
          console.log(`MongoDB (${appType}) reconnected successfully`);
        });
        
        // Wait for connection to be established with timeout protection
        await new Promise((resolve, reject) => {
          // Set a timeout for connection validation
          const timeoutId = setTimeout(() => {
            reject(new Error(`MongoDB (${appType}) connection timeout after ${options.connectTimeoutMS}ms`));
          }, options.connectTimeoutMS);
          
          connection.on('connected', () => {
            clearTimeout(timeoutId);
            resolve();
          });
          
          connection.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
          });
        });
        
        // Verify connection is working by running a ping command
        await connection.db.command({ ping: 1 }, { maxTimeMS: TIMEOUT_VALUES.OPERATION_TIMEOUT });
        console.log(`MongoDB (${appType}) connection verified with ping`);
        
        // Connection successful, break out of retry loop
        break;
      } catch (connectionError) {
        console.error(`MongoDB (${appType}) connection attempt ${retryCount + 1} failed:`, connectionError);
        
        // Close any failed connection
        if (connection) {
          try {
            await connection.close();
          } catch (closeError) {
            console.warn(`Error closing failed connection:`, closeError);
          }
          connection = null;
        }
        
        retryCount++;
        
        if (retryCount < maxRetries) {
          // Exponential backoff with jitter: wait longer between each retry with some randomness
          const baseWaitTime = Math.pow(2, retryCount) * 1000;
          const jitter = Math.floor(Math.random() * 1000); // Add up to 1 second of jitter
          const waitTime = baseWaitTime + jitter;
          
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we have a connection after retries, return it
    if (connection) {
      return connection;
    }
    
    // If we reach here, all connection attempts failed
    throw new Error(`Failed to connect to MongoDB (${appType}) after ${maxRetries} attempts`);
  } catch (error) {
    console.error(`MongoDB (${appType}) connection error:`, error);
    
    // In production, MongoDB connection is critical - fail loudly
    if (process.env.NODE_ENV === 'production') {
      console.error(`CRITICAL ERROR: MongoDB (${appType}) connection failed in production environment.`);
      console.error('Application cannot continue without database connectivity in production mode.');
      process.exit(1);
    } else {
      // In development, we can proceed with limited functionality
      console.warn(`MongoDB (${appType}) connection failed in development mode.`);
      console.warn('Continuing with limited functionality. MongoDB-dependent features will not work.');
      
      // Return a mock connection for development with model support
      return { 
        db: { 
          collection: () => ({ 
            find: () => ({ toArray: () => [] }),
            findOne: () => Promise.resolve(null),
            insertOne: () => Promise.resolve({ acknowledged: true }),
            updateOne: () => Promise.resolve({ acknowledged: true }),
            deleteOne: () => Promise.resolve({ acknowledged: true }),
            countDocuments: () => Promise.resolve(0)
          }),
          command: () => Promise.resolve({ ok: 1 })
        },
        model: (modelName, schema) => {
          // Create a more robust mock model that returns empty arrays for most operations
          const mockModel = function() {};
          mockModel.find = () => ({ 
            exec: () => Promise.resolve([]),
            sort: () => ({ skip: () => ({ limit: () => ({ exec: () => Promise.resolve([]) }) }) }),
            lean: () => Promise.resolve([])
          });
          mockModel.findOne = () => ({ 
            exec: () => Promise.resolve(null),
            lean: () => Promise.resolve(null)
          });
          mockModel.findById = () => ({
            exec: () => Promise.resolve(null)
          });
          mockModel.findByIdAndUpdate = () => Promise.resolve(null);
          mockModel.findOneAndUpdate = () => Promise.resolve(null);
          mockModel.updateOne = () => Promise.resolve({ nModified: 0 });
          mockModel.create = () => Promise.resolve({});
          mockModel.countDocuments = () => Promise.resolve(0);
          mockModel.schema = schema;
          mockModel.collection = { 
            insertOne: () => Promise.resolve({ acknowledged: true }),
            findOne: () => Promise.resolve(null)
          };
          
          return mockModel;
        }
      };
    }
  }
};

// Create and maintain separate connections
let riderConnection = null;
let passengerConnection = null;

// Connect to rider database
const connectToRiderDB = async () => {
  riderConnection = await connectToMongoDB('rider');
  return riderConnection;
};

// Connect to passenger database
const connectToPassengerDB = async () => {
  passengerConnection = await connectToMongoDB('passenger');
  return passengerConnection;
};

// Get existing connections
const getRiderConnection = () => riderConnection;
const getPassengerConnection = () => passengerConnection;

export {
  connectToMongoDB,
  connectToRiderDB,
  connectToPassengerDB,
  getRiderConnection,
  getPassengerConnection,
  mongoose,
};
