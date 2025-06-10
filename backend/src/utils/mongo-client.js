import { MongoClient, ServerApiVersion } from 'mongodb';

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 
                    process.env.MONGODB_RIDER_URI || 
                    "mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/?retryWrites=true&w=majority&appName=OkadaCluster";

// More reasonable timeout values that won't block API requests
const TIMEOUT_VALUES = {
  BUFFER_TIMEOUT_MS: 30000,      // 30 seconds
  CONNECTION_TIMEOUT_MS: 10000,  // 10 seconds
  SOCKET_TIMEOUT_MS: 20000,      // 20 seconds
  SERVER_SELECTION_TIMEOUT_MS: 10000, // 10 seconds
  MAX_TIME_MS: 5000,             // 5 seconds for regular operations
  OPERATION_TIMEOUT: 5000,       // 5 seconds default operation timeout
  // Additional timeouts
  SHORT_OPERATION_MS: 3000,      // 3 seconds for fast operations like OTP
  BACKGROUND_OPERATION_MS: 60000 // 60 seconds for background tasks
};

// Create a MongoClient with optimized timeout options
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // Optimized timeout settings
  connectTimeoutMS: TIMEOUT_VALUES.CONNECTION_TIMEOUT_MS,
  socketTimeoutMS: TIMEOUT_VALUES.SOCKET_TIMEOUT_MS,
  maxPoolSize: 50,               // Increased pool size for higher concurrency
  minPoolSize: 10,               // Maintain larger pool of ready connections
  maxIdleTimeMS: 30000,          // Reduced idle timeout (30 seconds)
  retryWrites: true,             // Enable retry writes for better reliability
  serverSelectionTimeoutMS: TIMEOUT_VALUES.SERVER_SELECTION_TIMEOUT_MS,
  // Additional driver options for improved stability
  monitorCommands: true,         // Monitor commands for better debugging
  maxConnecting: 20,             // Increased concurrent connection attempts
  heartbeatFrequencyMS: 5000,    // More frequent heartbeats (5 seconds)
  waitQueueTimeoutMS: TIMEOUT_VALUES.BUFFER_TIMEOUT_MS, // Prevent wait queue timeouts
  // Connection pool improvements
  minHeartbeatFrequencyMS: 1000, // Minimum heartbeat frequency
  compressors: 'zlib',           // Enable network compression
  zlibCompressionLevel: 6        // Balanced compression level
});

// Connection pool monitoring
const connectionStartTime = Date.now();
let totalOperations = 0;
let failedOperations = 0;
let slowOperations = 0;

// Add a connection health check function with enhanced monitoring
let isConnectionHealthy = false;
let lastHealthCheckTime = 0;
let consecutiveFailures = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds between health checks

// Function to check connection health
const checkConnectionHealth = async (force = false) => {
  const currentTime = Date.now();
  
  // Skip health check if not forced and we checked recently
  if (!force && (currentTime - lastHealthCheckTime < HEALTH_CHECK_INTERVAL)) {
    return isConnectionHealthy;
  }
  
  lastHealthCheckTime = currentTime;
  
  try {
    // Use a timeout to prevent health check from hanging
    const pingPromise = client.db("admin").command({ ping: 1 });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Health check timed out")), 3000)
    );
    
    await Promise.race([pingPromise, timeoutPromise]);
    
    // Reset failure counter on success
    if (!isConnectionHealthy) {
      console.log("MongoDB connection restored after", consecutiveFailures, "consecutive failures");
    }
    isConnectionHealthy = true;
    consecutiveFailures = 0;
    
    // Log statistics every 5 minutes
    if (currentTime - connectionStartTime > 300000 && (currentTime - connectionStartTime) % 300000 < HEALTH_CHECK_INTERVAL) {
      console.log(`MongoDB connection stats: ${totalOperations} total ops, ${failedOperations} failed (${(failedOperations/totalOperations*100).toFixed(2)}%), ${slowOperations} slow (${(slowOperations/totalOperations*100).toFixed(2)}%)`);
    }
    
    return true;
  } catch (error) {
    isConnectionHealthy = false;
    consecutiveFailures++;
    console.error("MongoDB health check failed:", error.message, "Consecutive failures:", consecutiveFailures);
    
    // Try to force-reset connection after multiple failures
    if (consecutiveFailures >= 3 && consecutiveFailures % 3 === 0) {
      console.warn("Multiple consecutive MongoDB health check failures, scheduling reconnection attempt");
      setImmediate(() => {
        try {
          // Non-blocking reconnection attempt
          closeMongo().then(() => connectToMongo())
            .then(() => console.log("MongoDB reconnection successful"))
            .catch(err => console.error("MongoDB reconnection failed:", err.message));
        } catch (err) {
          console.error("Error during reconnection attempt:", err);
        }
      });
    }
    
    return false;
  }
};

// Set up regular health checks
setInterval(() => {
  checkConnectionHealth(true).catch(err => 
    console.error("Error during scheduled health check:", err.message)
  );
}, HEALTH_CHECK_INTERVAL);

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
      
      // Initialize database connections
      riderDb = client.db("okada-rider");
      passengerDb = client.db("okada-passenger");
      
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
 * Get Rider database connection with performance monitoring
 */
async function getRiderDb() {
  if (!riderDb) {
    await connectToMongo();
  } else if (!isConnectionHealthy && (Date.now() - lastHealthCheckTime > HEALTH_CHECK_INTERVAL)) {
    // If connection appears unhealthy and we haven't checked recently, verify health
    const healthy = await checkConnectionHealth(true);
    if (!healthy) {
      console.log("Unhealthy connection detected in getRiderDb, reconnecting...");
      await connectToMongo();
    }
  }
  return riderDb;
}

/**
 * Get Passenger database connection with performance monitoring
 */
async function getPassengerDb() {
  if (!passengerDb) {
    await connectToMongo();
  } else if (!isConnectionHealthy && (Date.now() - lastHealthCheckTime > HEALTH_CHECK_INTERVAL)) {
    // If connection appears unhealthy and we haven't checked recently, verify health
    const healthy = await checkConnectionHealth(true);
    if (!healthy) {
      console.log("Unhealthy connection detected in getPassengerDb, reconnecting...");
      await connectToMongo();
    }
  }
  return passengerDb;
}

/**
 * Performance-optimized database operation wrapper for time-sensitive operations
 * @param {Function} operation - Database operation to perform
 * @param {String} operationName - Name of the operation for logging
 * @param {Number} timeoutMs - Operation timeout in milliseconds
 */
async function executeTimeSensitiveOperation(operation, operationName, timeoutMs = TIMEOUT_VALUES.SHORT_OPERATION_MS) {
  totalOperations++;
  const startTime = Date.now();
  
  try {
    // Set up operation with timeout
    const operationPromise = operation();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`)), 
      timeoutMs)
    );
    
    const result = await Promise.race([operationPromise, timeoutPromise]);
    
    const duration = Date.now() - startTime;
    if (duration > timeoutMs * 0.8) { // Consider ops taking >80% of timeout as "slow"
      slowOperations++;
      console.warn(`Slow MongoDB operation: ${operationName} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    failedOperations++;
    const duration = Date.now() - startTime;
    console.error(`MongoDB operation failed: ${operationName} after ${duration}ms:`, error.message);
    throw error;
  }
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
  closeMongo,
  executeTimeSensitiveOperation,
  checkConnectionHealth,
  TIMEOUT_VALUES
};
