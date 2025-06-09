import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { swaggerUi, specs } from './swagger.js';

// MongoDB-only configuration - PostgreSQL has been removed

// MongoDB routes and services
import { errorHandler } from './api/v1/middlewares/errorHandler.js';
import { initializeSocketServer } from './services/socket.service.js';
// MongoDB tracking services
import { initializeTracking } from './services/real-time-tracking.service.js';
import { initializeEnhancedTracking } from './services/enhanced-tracking.service.js';
import { connectToRiderDB, connectToPassengerDB } from './config/mongodb.js';

// Import routes with app-specific and shared routes
import setupAppRoutes from './mongodb/routes/index.js';
import { initializeAdminUser } from './scripts/initialize-admin-user.js';

const app = express();
const server = http.createServer(app);

// Load allowed origins from env var with fallback
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'https://admin.okada-transportation.com,https://okada-transportation.com,https://www.okada-transportation.com';
const allowedOrigins = allowedOriginsEnv.split(',');

// Configure Socket.IO based on environment
const io = new Server(server, {
  cors: process.env.NODE_ENV === 'production' 
    ? {
        // In production, specific allowed origins
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }
    : {
        // In development, more permissive settings
        origin: true, // Allow all origins in development
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
  // Additional Socket.IO options for better reliability
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  // Production-specific options
  ...(process.env.NODE_ENV === 'production' && {
    transports: ['websocket', 'polling'], // Prefer websocket but fallback to polling
    pingTimeout: 60000,  // 60s timeout
    pingInterval: 25000  // Send ping every 25s
  })
});
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO service first (this is an async function)
(async () => {
  try {
    await initializeSocketServer(io);
    console.log('Socket.IO initialized successfully');
    
    // Initialize tracking services only after socket initialization is complete
    try {
      initializeTracking();
      console.log('Real-time tracking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize tracking service:', error.message);
    }

    try {
      initializeEnhancedTracking();
      console.log('Enhanced tracking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize enhanced tracking service:', error.message);
    }
  } catch (error) {
    console.error('Failed to initialize Socket.IO:', error);
  }
})();

// Middleware
// Configure middleware based on environment
if (process.env.NODE_ENV === 'production') {
  // In production, use helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.okada-transportation.com"]
      }
    }
  }));
  
  // Use allowed origins for CORS
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
} else {
  // In development, more permissive settings
  // Disable helmet in development for CORS compatibility
  // app.use(helmet());
  
  // Allow all origins in development
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
}
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Okada Transportation API Documentation"
}));

// Error handler middleware
app.use(errorHandler);

// Import the direct mongo client
import { connectToMongo } from './utils/mongo-client.js';

// Set Mongoose global defaults before any connections
mongoose.set('bufferCommands', true);
mongoose.set('maxTimeMS', 45000); // Global default timeout for operations
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production'); // Don't auto-index in production

// Connect to MongoDB (both rider and passenger DBs) and start server
(async () => {
  let retryCount = 0;
  const maxRetries = 3;
  let riderConnection = null;
  let passengerConnection = null;
  
  try {
    // Attempt database connections with retries
    while (retryCount < maxRetries) {
      try {
        console.log(`Database connection attempt ${retryCount + 1}/${maxRetries}`);
        
        // Connect to rider and passenger databases using both approaches
        riderConnection = await connectToRiderDB();
        passengerConnection = await connectToPassengerDB();
        
        // Also initialize the direct MongoDB client connection
        await connectToMongo();
        console.log("Direct MongoDB client connection established");
        
        // Initialize admin user if needed - with retry logic
        let adminInitAttempts = 0;
        const maxAdminInitAttempts = 2;
        let adminInitialized = false;
        
        while (adminInitAttempts < maxAdminInitAttempts && !adminInitialized) {
          try {
            console.log(`Admin user initialization attempt ${adminInitAttempts + 1}/${maxAdminInitAttempts}`);
            adminInitialized = await initializeAdminUser();
            
            if (adminInitialized) {
              console.log('Admin user initialized successfully');
            } else {
              console.log('Admin user initialization returned false, may need retry');
              adminInitAttempts++;
            }
          } catch (error) {
            console.error(`Admin initialization attempt ${adminInitAttempts + 1} failed:`, error);
            adminInitAttempts++;
            
            if (adminInitAttempts < maxAdminInitAttempts) {
              console.log('Retrying admin user initialization after error...');
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }
        
        if (!adminInitialized) {
          console.warn('⚠️ Admin user initialization unsuccessful after multiple attempts');
          console.warn('⚠️ The application will continue, but admin features may be limited');
        }
        
        // Database connections successful, break out of retry loop
        break;
      } catch (error) {
        console.error(`Database connection attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          const delay = retryCount * 2000; // Increasing backoff delay
          console.log(`Retrying database connection in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('All database connection attempts failed');
          if (process.env.NODE_ENV === 'production') {
            console.error('Fatal error: Cannot start server without database in production mode');
            process.exit(1);
          } else {
            console.warn('⚠️ Starting server with limited functionality (no database connection)');
          }
        }
      }
    }
    
    // Get app router with connections configured
    const appRouter = await setupAppRoutes(riderConnection, passengerConnection);
    
    // API routes - using the configured router
    app.use('/api/v1', appRouter);
    
    // Add backward compatibility for clients still using the /api/v1/mongo path
    app.use('/api/v1/mongo', appRouter);
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server is running`);
      console.log(`Connected to Rider and Passenger databases`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Export for testing
export { app, server, io };
