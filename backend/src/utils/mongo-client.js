import { MongoClient, ServerApiVersion } from 'mongodb';

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 
                    process.env.MONGODB_RIDER_URI || 
                    "mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/?retryWrites=true&w=majority&appName=OkadaCluster";

// Dramatically increased timeout values to fix timeout issues
const TIMEOUT_VALUES = {
  BUFFER_TIMEOUT_MS: 300000,     // 5 minutes
  CONNECTION_TIMEOUT_MS: 180000, // 3 minutes
  SOCKET_TIMEOUT_MS: 240000,     // 4 minutes
  SERVER_SELECTION_TIMEOUT_MS: 180000, // 3 minutes
  MAX_TIME_MS: 180000,           // 3 minutes
  OPERATION_TIMEOUT: 180000      // 3 minutes
};

// Create a MongoClient with extended timeout options
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Extended timeout settings to prevent operation timeouts
  connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
  socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
  maxPoolSize: 20,
  minPoolSize: 5,                                    // Maintain a small pool of ready connections
  maxIdleTimeMS: 60000,                              // Increased idle timeout
  retryWrites: true,                                 // Enable retry writes for better reliability
  serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
  // Additional driver options for improved stability
  monitorCommands: true,                             // Monitor commands for better debugging
  maxConnecting: 10,                                 // Limit concurrent connection attempts
  heartbeatFrequencyMS: 10000,                       // More frequent heartbeats
  waitQueueTimeoutMS: TIMEOUT_VALUES.BUFFER_TIMEOUT_MS  // Prevent wait queue timeouts
});

// Add a connection health check function
let isConnectionHealthy = false;

// Function to check connection health
const checkConnectionHealth = async () => {
  try {
    await client.db("admin").command({ ping: 1 });
    isConnectionHealthy = true;
    return true;
  } catch (error) {
    isConnectionHealthy = false;
    console.error("MongoDB health check failed:", error.message);
    return false;
  }
};

// Reference to the database connections
let riderDb = null;
let passengerDb = null;

/**
 * Initialize MongoDB connection with improved retry logic
 */
async function connectToMongo() {
  if (riderDb && passengerDb) {
    // If already connected, perform a health check
    if (await checkConnectionHealth()) {
      return { riderDb, passengerDb };
    } else {
      console.log("Existing connection unhealthy, reconnecting...");
    }
  }

  // Setup enhanced retry logic
  const maxRetries = 5; // Increased from 3 to 5
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      console.log(`MongoDB connection attempt ${retryCount + 1}/${maxRetries}...`);
      
      // Connect the client to the server with extended timeout protection
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Connection timed out after ${TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS}ms`)), 
        TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log("Connected successfully to MongoDB Atlas!");
      
      // Initialize database connections with timeouts
      riderDb = client.db("okada-rider").setMaxTimeMS(TIMEOUT_VALUES.OPERATION_TIMEOUT);
      passengerDb = client.db("okada-passenger").setMaxTimeMS(TIMEOUT_VALUES.OPERATION_TIMEOUT);
      
      // Perform health check
      if (await checkConnectionHealth()) {
        console.log("MongoDB connection health verified");
        return { riderDb, passengerDb };
      } else {
        throw new Error("Health check failed after connection");
      }
    } catch (error) {
      lastError = error;
      retryCount++;
      console.error(`MongoDB connection attempt ${retryCount} failed:`, error.message);
      
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
  
  console.error(`All ${maxRetries} connection attempts failed. Last error:`, lastError);
  
  if (process.env.NODE_ENV === 'production') {
    throw lastError || new Error('Failed to connect to MongoDB after multiple attempts');
  } else {
    // In development, provide mock objects to prevent complete failure
    console.warn('WARNING: Using mock database in development mode');
    riderDb = createMockDb('okada-rider');
    passengerDb = createMockDb('okada-passenger');
    return { riderDb, passengerDb };
  }
}

/**
 * Create a mock database for development fallback
 */
function createMockDb(name) {
  console.warn(`Creating mock database for ${name}`);
  return {
    collection: (collName) => ({
      findOne: () => Promise.resolve(null),
      find: () => ({ toArray: () => Promise.resolve([]) }),
      insertOne: () => Promise.resolve({ acknowledged: true, insertedId: 'mock-id' }),
      updateOne: () => Promise.resolve({ acknowledged: true, modifiedCount: 1 }),
      deleteOne: () => Promise.resolve({ acknowledged: true, deletedCount: 1 }),
      countDocuments: () => Promise.resolve(0)
    }),
    command: () => Promise.resolve({ ok: 1 }),
    stats: () => Promise.resolve({ db: name, collections: 0, objects: 0 }),
    name
  };
}

/**
 * Get Rider database connection
 */
async function getRiderDb() {
  if (!riderDb) {
    await connectToMongo();
  }
  return riderDb;
}

/**
 * Get Passenger database connection
 */
async function getPassengerDb() {
  if (!passengerDb) {
    await connectToMongo();
  }
  return passengerDb;
}

/**
 * Close MongoDB connection
 */
async function closeMongo() {
  if (client) {
    await client.close();
    riderDb = null;
    passengerDb = null;
    console.log("MongoDB connection closed");
  }
}

// Export functions
export {
  connectToMongo,
  getRiderDb,
  getPassengerDb,
  closeMongo
};
