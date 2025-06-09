/**
 * Socket.IO Service for Real-time Communications
 * This service handles all WebSocket connections and event handlers
 */
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import * as pricingEngine from './pricing-engine.service.js';
import * as riderMatching from './rider-matching.service.js';
import * as realTimeAvailability from './real-time-availability.service.js';

// MongoDB models - import dynamically to avoid circular dependencies
let User, Ride, TrackingEvent, Notification, OTP, RiderLocation;

// Function to import models
const importModels = async () => {
  const UserModule = await import('../mongodb/models/User.js');
  const RideModule = await import('../mongodb/models/Ride.js');
  const TrackingEventModule = await import('../mongodb/models/TrackingEvent.js');
  const NotificationModule = await import('../mongodb/models/Notification.js');
  const OTPModule = await import('../mongodb/models/OTP.js');
  const RiderLocationModule = await import('../mongodb/models/RiderLocation.js');
  
  User = UserModule.default;
  Ride = RideModule.default;
  TrackingEvent = TrackingEventModule.default;
  Notification = NotificationModule.default;
  OTP = OTPModule.default;
  RiderLocation = RiderLocationModule.default;
};

// Connection tracking
let io;
const connectedUsers = new Map();
const connectedRiders = new Map();

/**
 * Initialize the Socket.IO server
 * @param {Object} socketIo - Socket.IO server instance
 */
const initializeSocketServer = async (socketIo) => {
  // Import models before using them
  await importModels();
  io = socketIo;
  
  // Initialize real-time availability service
  await realTimeAvailability.initialize();

  // Configure Socket.IO server
  io.engine.on("connection", (socket) => {
    socket.server.opts = {
      cors: {
        origin: [
          process.env.CORS_ORIGIN || 'http://localhost:3000',
          'http://localhost:19006', // Expo web
          'http://localhost:8081', // React Native debugger
          /\.okada\.app$/, // Production domains
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8,
      cookie: false
    };
  });


  // Add namespace configuration
  io.of(/.*/).use(async (socket, next) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      // Attempt to fetch a real user, even in development mode
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            // Attach user data to socket
            const user = await User.findById(decoded.id);
            if (user) {
              socket.user = user;
              console.log(`Socket authenticated for user: ${user._id} (${user.role})`);
              return next();
            }
          }
        } catch (tokenError) {
          console.error('Token verification error:', tokenError);
          // Continue to fallback for development mode
        }
      }
      
      // Handle connections without valid tokens
      if (process.env.NODE_ENV === 'development') {
        console.warn('Socket connection without valid token allowed in development mode');
        
      // Try to fetch a demo user in development mode instead of using anonymous
      try {
        // Find any user in the database that we can use for testing
        const demoUser = await User.findOne({ role: { $in: ['passenger', 'rider'] } });
        
        if (demoUser) {
          socket.user = demoUser;
          console.log(`Using demo user for socket: ${demoUser._id} (${demoUser.role})`);
        } else {
          // Fallback to anonymous with a valid role
          // Generate a fake but valid ObjectId for anonymous users
          const anonymousId = new mongoose.Types.ObjectId();
          socket.user = { 
            _id: anonymousId,
            role: 'passenger', // Use passenger as default role (must be in enum)
            isAnonymous: true, // Flag to identify anonymous users
            firstName: 'Anonymous',
            lastName: 'User'
          };
          console.log(`Using anonymous user for socket with generated ID: ${anonymousId}`);
        }
      } catch (dbError) {
        console.error('Error fetching demo user:', dbError);
        // Fallback to anonymous with a valid role
        const anonymousId = new mongoose.Types.ObjectId();
        socket.user = { 
          _id: anonymousId,
          role: 'passenger', // Use passenger as default role (must be in enum)
          isAnonymous: true, // Flag to identify anonymous users
          firstName: 'Anonymous',
          lastName: 'User'
        };
        console.log(`Using anonymous user for socket with generated ID: ${anonymousId}`);
      }
        
        return next();
      } else {
        return next(new Error('Authentication error: Valid token required'));
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
      
      // Allow connections with errors in development mode
      if (process.env.NODE_ENV === 'development') {
        console.warn('Socket connection with error allowed in development mode');
        // Create valid anonymous user with valid role and ObjectId
        const anonymousId = new mongoose.Types.ObjectId();
        socket.user = { 
          _id: anonymousId,
          role: 'passenger', // Use a valid enum value (rider, passenger, admin)
          isAnonymous: true, 
          firstName: 'Anonymous',
          lastName: 'User'
        };
        console.log(`Created recovery anonymous user with ID: ${anonymousId}`);
        return next();
      } else {
        return next(new Error('Authentication error'));
      }
    }
  });

  io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);
    
    // Check if socket.user exists (it should always exist now, even in development mode)
    if (!socket.user) {
      console.error('Socket connected without user data. This should not happen. Attempting recovery...');
      
      // Try to fetch a demo user for recovery
      try {
        const demoUser = await User.findOne({});
        if (demoUser) {
          socket.user = demoUser;
          console.log(`Recovered socket connection with user: ${demoUser._id}`);
        } else {
          // Fallback to anonymous if recovery fails
          if (process.env.NODE_ENV === 'development') {
            // Generate a fake but valid ObjectId for anonymous users
            const anonymousId = new mongoose.Types.ObjectId();
            socket.user = { 
              _id: anonymousId,
              role: 'passenger', // Use a valid role
              isAnonymous: true, // Flag to identify anonymous users
              firstName: 'Anonymous',
              lastName: 'User'
            };
            console.log(`Fallback to anonymous user with ID ${anonymousId} in development mode`);
            // Set up basic disconnect handler for anonymous user
            socket.on('disconnect', () => {
              console.log('Anonymous client disconnected:', socket.id);
            });
            return; // Skip the rest of the connection setup
          } else {
            // In production, disconnect sockets without user data
            console.error('Socket without user data in production mode. Disconnecting.');
            socket.disconnect();
            return;
          }
        }
      } catch (error) {
        console.error('Socket recovery failed:', error);
        if (process.env.NODE_ENV !== 'development') {
          socket.disconnect();
          return;
        } else {
          // Generate a fake but valid ObjectId for anonymous users
          const anonymousId = new mongoose.Types.ObjectId();
          socket.user = { 
            _id: anonymousId,
            role: 'passenger', // Use a valid role
            isAnonymous: true
          };
        }
      }
    }
    
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;
    
    try {
      // Only track non-anonymous users to avoid validation errors
      if (!socket.user.isAnonymous) {
        try {
          await TrackingEvent.createConnectionEvent({
            userId,
            userRole,
            eventType: 'connection',
            deviceData: {
              deviceId: socket.handshake.query.device || 'unknown',
              appVersion: socket.handshake.query.appVersion,
              os: socket.handshake.query.os,
              browser: socket.handshake.query.browser
            },
            sessionId: socket.id
          });
        } catch (trackingError) {
          console.error('Error creating connection event:', trackingError);
          // Continue despite tracking error - don't let it break the connection
        }
      } else {
        console.log('Skipping tracking for anonymous development user');
      }

      // Add user to connected users map
      connectedUsers.set(userId, socket.id);
      
      // If user is a rider, add to connected riders map
      if (userRole === 'rider') {
        connectedRiders.set(userId, socket.id);
        
        // Join rider-specific room
        socket.join('riders');
        
        // Listen for rider location updates
        socket.on('location:update', async (data) => {
          try {
            if (!data.location || !data.location.latitude || !data.location.longitude) {
              return socket.emit('error', { message: 'Invalid location data' });
            }
            
            await handleRiderLocationUpdate(socket, data);
          } catch (error) {
            console.error('Error handling rider location update:', error);
            socket.emit('error', { message: 'Failed to update location' });
          }
        });
        
        // Listen for rider availability updates
        socket.on('availability:update', async (data) => {
          try {
            await handleRiderAvailabilityUpdate(socket, data);
          } catch (error) {
            console.error('Error handling rider availability update:', error);
            socket.emit('error', { message: 'Failed to update availability' });
          }
        });
        
        // Listen for ride acceptance
        socket.on('ride:accept', async (data) => {
          try {
            if (!data.rideId) {
              return socket.emit('error', { message: 'Ride ID is required' });
            }
            
            await handleRideAcceptance(socket, data);
          } catch (error) {
            console.error('Error handling ride acceptance:', error);
            socket.emit('error', { message: 'Failed to accept ride' });
          }
        });
        
        // Listen for ride updates (arrived, started, completed)
        socket.on('ride:update_status', async (data) => {
          try {
            if (!data.rideId || !data.status) {
              return socket.emit('error', { message: 'Ride ID and status are required' });
            }
            
            await handleRideStatusUpdate(socket, data);
          } catch (error) {
            console.error('Error handling ride status update:', error);
            socket.emit('error', { message: 'Failed to update ride status' });
          }
        });
        
        // Listen for document upload events
        socket.on('document:upload', async (data) => {
          try {
            if (!data.type || !data.documentUrl) {
              return socket.emit('error', { message: 'Document type and URL are required' });
            }
            
            // Handle document upload via API, not directly through socket
            socket.emit('document:upload_initiated', {
              success: true,
              message: 'Please use the API to upload documents'
            });
          } catch (error) {
            console.error('Error handling document upload:', error);
            socket.emit('error', { message: 'Failed to upload document' });
          }
        });
      } else if (userRole === 'passenger') {
        // Join passenger-specific room
        socket.join('passengers');
        
        // Join OTP-specific room if needed for real-time OTP verification
        socket.join(`otp:${userId}`);
        
        // Listen for OTP room join requests
        socket.on('otp:join', (data) => {
          if (data.userId && data.type) {
            const roomName = `otp:${data.userId}:${data.type}`;
            socket.join(roomName);
            console.log(`User ${userId} joined OTP room: ${roomName}`);
          }
        });
        
        // Listen for OTP room leave requests
        socket.on('otp:leave', (data) => {
          if (data.userId && data.type) {
            const roomName = `otp:${data.userId}:${data.type}`;
            socket.leave(roomName);
            console.log(`User ${userId} left OTP room: ${roomName}`);
          }
        });
        
        // Listen for passenger location updates for rider availability
        socket.on('location:update', async (data) => {
          try {
            if (!data.location || !data.location.latitude || !data.location.longitude) {
              return socket.emit('error', { message: 'Invalid location data' });
            }
            
            // Track passenger location for real-time availability updates
            await realTimeAvailability.trackPassengerLocation(userId, {
              lat: data.location.latitude,
              lng: data.location.longitude
            });
            
            socket.emit('location:updated', { success: true });
          } catch (error) {
            console.error('Error handling passenger location update:', error);
            socket.emit('error', { message: 'Failed to update location' });
          }
        });
        
        // Listen for density map requests
        socket.on('riders:request_density_map', async () => {
          try {
            await realTimeAvailability.generateDensityMap(userId);
          } catch (error) {
            console.error('Error generating density map:', error);
            socket.emit('error', { message: 'Failed to generate density map' });
          }
        });
        
        // Listen for fare estimation requests
        socket.on('fare:estimate', async (data) => {
          try {
            if (!data.origin || !data.destination) {
              return socket.emit('error', { message: 'Origin and destination are required' });
            }
            
            const origin = {
              lat: data.origin.latitude,
              lng: data.origin.longitude
            };
            
            const destination = {
              lat: data.destination.latitude,
              lng: data.destination.longitude
            };
            
            // Get fare estimate from pricing engine
            const fareEstimate = await pricingEngine.calculateFare({
              origin,
              destination,
              vehicleType: data.vehicleType || 'motorcycle',
              distanceType: data.distanceType || 'roadDistance'
            });
            
            // Check for rider availability
            const availability = await riderMatching.checkRidersAvailable(origin);
            
            socket.emit('fare:estimated', {
              ...fareEstimate,
              riderAvailability: availability.success ? availability.availability : null,
              timestamp: new Date()
            });
          } catch (error) {
            console.error('Error estimating fare:', error);
            socket.emit('error', { message: 'Failed to estimate fare' });
          }
        });
        
        // Listen for ride requests
        socket.on('ride:request', async (data) => {
          try {
            await handleRideRequest(socket, data);
          } catch (error) {
            console.error('Error handling ride request:', error);
            socket.emit('error', { message: 'Failed to request ride' });
          }
        });
        
        // Listen for ride cancellation
        socket.on('ride:cancel', async (data) => {
          try {
            if (!data.rideId) {
              return socket.emit('error', { message: 'Ride ID is required' });
            }
            
            await handleRideCancellation(socket, data);
          } catch (error) {
            console.error('Error handling ride cancellation:', error);
            socket.emit('error', { message: 'Failed to cancel ride' });
          }
        });
      }
      
      // Common event listeners for all users
      
      // Listen for notification acknowledgment
      socket.on('notification:read', async (data) => {
        try {
          if (!data.notificationId) {
            return socket.emit('error', { message: 'Notification ID is required' });
          }
          
          await handleNotificationRead(socket, data);
        } catch (error) {
          console.error('Error handling notification read:', error);
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          console.log('Client disconnected:', socket.id);
          
          // Only track non-anonymous users
          if (!socket.user.isAnonymous) {
            try {
              await TrackingEvent.createConnectionEvent({
                userId,
                userRole,
                eventType: 'disconnection',
                deviceData: {
                  deviceId: socket.handshake.query.device || 'unknown',
                  appVersion: socket.handshake.query.appVersion
                },
                sessionId: socket.id
              });
            } catch (trackingError) {
              console.error('Error creating disconnection event:', trackingError);
              // Continue despite tracking error
            }
          }
          
          // Remove user from connected users map
          connectedUsers.delete(userId);
          
          // If user is a rider, remove from connected riders map and update availability
          if (userRole === 'rider' && !socket.user.isAnonymous) {
            connectedRiders.delete(userId);
            
            // Update rider profile to show offline
            try {
              await User.findByIdAndUpdate(userId, {
                'riderProfile.isActive': false
              });
            } catch (dbError) {
              console.error('Error updating rider status on disconnect:', dbError);
            }
          }
        } catch (error) {
          console.error('Error handling client disconnection:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up socket connection:', error);
      socket.disconnect();
    }
  });
};

/**
 * Handle rider location update
 * @param {Object} socket - Socket instance
 * @param {Object} data - Location data
 */
const handleRiderLocationUpdate = async (socket, data) => {
  const riderId = socket.user._id.toString();
  const { latitude, longitude, heading, speed, accuracy } = data.location;
  const location = { lat: latitude, lng: longitude };
  
  try {
    // Create location tracking event
    await TrackingEvent.createLocationEvent({
      userId: riderId,
      userRole: 'rider',
      location,
      locationMetadata: {
        heading,
        speed,
        accuracy
      },
      deviceData: {
        deviceId: socket.handshake.query.device || 'unknown',
        appVersion: socket.handshake.query.appVersion
      },
      sessionId: socket.id
    });
    
    // Update rider location in RiderLocation collection
    if (RiderLocation) {
      await RiderLocation.updateRiderLocation(riderId, {
        lat: latitude,
        lng: longitude,
        accuracy,
        heading,
        speed,
        status: data.status || 'online'
      });
    }
    
    // Notify real-time availability service about rider location update
    await realTimeAvailability.handleRiderLocationUpdate(riderId, location, data.status || 'online');
    
    // Update rider's location in user document
    await User.findByIdAndUpdate(riderId, {
      'riderProfile.lastLocation': {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      'riderProfile.lastLocationUpdatedAt': new Date(),
      'riderProfile.isActive': true
    });
    
    // If rider has an active ride, emit location update to passenger
    const activeRide = await Ride.findOne({
      riderId: mongoose.Types.ObjectId(riderId),
      status: { $in: ['accepted', 'arrived_pickup', 'in_progress'] }
    });
    
    if (activeRide) {
      const passengerId = activeRide.userId.toString();
      const passengerSocketId = connectedUsers.get(passengerId);
      
      if (passengerSocketId) {
        io.to(passengerSocketId).emit('rider:location_update', {
          rideId: activeRide._id.toString(),
          location: {
            latitude,
            longitude,
            heading,
            speed,
          },
          rideStatus: activeRide.status,
          timestamp: new Date(),
        });
      }
    }
    
    socket.emit('location:updated', { success: true });
  } catch (error) {
    console.error('Error in handleRiderLocationUpdate:', error);
    socket.emit('error', { message: 'Failed to update location' });
  }
};

/**
 * Handle rider availability update
 * @param {Object} socket - Socket instance
 * @param {Object} data - Availability data
 */
const handleRiderAvailabilityUpdate = async (socket, data) => {
  const riderId = socket.user._id.toString();
  const { status } = data;
  const isAvailable = status === 'online';
  
  try {
    // Create status tracking event
    await TrackingEvent.createStatusEvent({
      userId: riderId,
      userRole: 'rider',
      status,
      deviceData: {
        deviceId: socket.handshake.query.device || 'unknown',
        appVersion: socket.handshake.query.appVersion
      },
      sessionId: socket.id
    });
    
    // Get rider's last known location
    const rider = await User.findById(riderId);
    const location = rider?.riderProfile?.lastLocation?.coordinates 
      ? { 
          lat: rider.riderProfile.lastLocation.coordinates[1],
          lng: rider.riderProfile.lastLocation.coordinates[0]
        }
      : null;
    
    // Update RiderLocation status
    if (RiderLocation && location) {
      await RiderLocation.updateRiderLocation(riderId, {
        lat: location.lat,
        lng: location.lng,
        status
      });
      
      // Notify real-time availability service about status update
      await realTimeAvailability.handleRiderLocationUpdate(riderId, location, status);
    }
    
    // Update rider's availability in user document
    await User.findByIdAndUpdate(riderId, {
      'riderProfile.isActive': isAvailable
    });
    
    socket.emit('availability:updated', { success: true, status });
  } catch (error) {
    console.error('Error in handleRiderAvailabilityUpdate:', error);
    socket.emit('error', { message: 'Failed to update availability' });
  }
};

/**
 * Handle ride request from passenger
 * @param {Object} socket - Socket instance
 * @param {Object} data - Ride request data
 */
const handleRideRequest = async (socket, data) => {
  const passengerId = socket.user._id.toString();
  const { pickupLocation, dropoffLocation, paymentMethod, vehicleType = 'motorcycle' } = data;
  
  // Validate required fields
  if (!pickupLocation || !dropoffLocation) {
    return socket.emit('error', { message: 'Pickup and dropoff locations are required' });
  }
  
  try {
    // Calculate fare using the pricing engine
    const fareResult = await pricingEngine.calculateFare({
      origin: {
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude
      },
      destination: {
        lat: dropoffLocation.latitude,
        lng: dropoffLocation.longitude
      },
      vehicleType,
      distanceType: 'roadDistance'
    });
    
    if (!fareResult.success) {
      return socket.emit('error', { message: 'Failed to calculate fare' });
    }
    
    // Create new ride in database
    const ride = new Ride({
      userId: mongoose.Types.ObjectId(passengerId),
      status: 'requested',
      pickupLocation: {
        address: pickupLocation.address,
        coordinates: {
          type: 'Point',
          coordinates: [pickupLocation.longitude, pickupLocation.latitude]
        }
      },
      destination: {
        address: dropoffLocation.address,
        coordinates: {
          type: 'Point',
          coordinates: [dropoffLocation.longitude, dropoffLocation.latitude]
        }
      },
      fare: {
        baseFare: fareResult.fare.baseFare,
        distanceFare: fareResult.fare.distanceFare,
        timeFare: fareResult.fare.timeFare,
        serviceFee: fareResult.fare.serviceFee,
        bookingFee: fareResult.fare.bookingFee,
        totalFare: fareResult.fare.totalFare,
        currency: fareResult.fare.currency || 'NGN',
        multipliers: fareResult.fare.multipliers || { combined: 1.0 }
      },
      estimatedDistance: fareResult.distance.value / 1000, // Convert to km
      estimatedDuration: fareResult.duration.value / 60, // Convert to minutes
      vehicleType,
      paymentMethod: paymentMethod || 'cash'
    });
    
    await ride.save();
    
    // Find nearby available riders using the rider matching service
    const matchResult = await riderMatching.findNearbyRiders({
      location: {
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude
      },
      vehicleType,
      maxDistance: 5000 // 5km radius
    });
    
    const nearbyRiders = matchResult.success ? matchResult.riders.map(r => ({ _id: r.riderId })) : [];
    
    if (nearbyRiders.length === 0) {
      // No nearby riders available
      socket.emit('ride:no_riders_available', {
        rideId: ride._id.toString(),
        message: 'No riders available in your area. Please try again later.',
      });
      
      // Update ride status to expired
      ride.status = 'expired';
      await ride.save();
    } else {
      // Notify nearby riders of new ride request
      for (const rider of nearbyRiders) {
        const riderSocketId = connectedUsers.get(rider._id.toString());
        
        if (riderSocketId) {
          io.to(riderSocketId).emit('ride:new_request', {
            rideId: ride._id.toString(),
            pickupLocation: {
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
              address: pickupLocation.address,
            },
            dropoffLocation: {
              latitude: dropoffLocation.latitude,
              longitude: dropoffLocation.longitude,
              address: dropoffLocation.address,
            },
            fare: ride.fare.totalFare,
            distance: ride.estimatedDistance,
            duration: ride.estimatedDuration,
            passengerName: `${socket.user.firstName} ${socket.user.lastName}`,
            passengerRating: 4.5, // TODO: Implement passenger rating
            timestamp: new Date(),
          });
          
          // Create notification for rider
          await Notification.create({
            userId: rider._id,
            type: 'ride_request',
            title: 'New Ride Request',
            message: `New ride request from ${pickupLocation.address} to ${dropoffLocation.address}`,
            data: {
              rideId: ride._id.toString(),
              fare: ride.fare.totalFare,
              distance: ride.estimatedDistance,
            },
            priority: 'high',
          });
        }
      }
      
      // Emit ride request confirmation to passenger
      socket.emit('ride:requested', {
        rideId: ride._id.toString(),
        status: 'requested',
        estimatedFare: ride.fare.totalFare,
        estimatedDistance: ride.estimatedDistance,
        estimatedDuration: ride.estimatedDuration,
        message: 'Ride requested. Looking for nearby riders...',
      });
    }
  } catch (error) {
    console.error('Error in handleRideRequest:', error);
    socket.emit('error', { message: 'Failed to request ride' });
  }
};

/**
 * Handle ride acceptance by rider
 * @param {Object} socket - Socket instance
 * @param {Object} data - Ride acceptance data
 */
const handleRideAcceptance = async (socket, data) => {
  const riderId = socket.user._id.toString();
  const { rideId } = data;
  
  try {
    // Get ride from database
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return socket.emit('error', { message: 'Ride not found' });
    }
    
    // Check if ride is still in requested status
    if (ride.status !== 'requested') {
      return socket.emit('error', { message: `Ride cannot be accepted because it is already ${ride.status}` });
    }
    
    // Update ride with rider info
    ride.riderId = mongoose.Types.ObjectId(riderId);
    ride.status = 'accepted';
    ride.acceptedAt = new Date();
    await ride.save();
    
    // Get passenger socket
    const passengerId = ride.userId.toString();
    const passengerSocketId = connectedUsers.get(passengerId);
    
    if (passengerSocketId) {
      // Get rider details
      const rider = await User.findById(riderId);
      
      // Emit ride accepted event to passenger
      io.to(passengerSocketId).emit('ride:accepted', {
        rideId,
        rider: {
          id: riderId,
          name: `${rider.firstName} ${rider.lastName}`,
          phone: rider.phoneNumber,
          photo: rider.profilePicture,
          vehicle: {
            type: rider.riderProfile?.vehicleType || 'motorcycle',
            model: rider.riderProfile?.vehicleModel || 'Standard',
            plate: rider.riderProfile?.licensePlate || 'Unknown',
          },
        },
        estimatedArrival: new Date(Date.now() + 5 * 60000), // 5 minutes from now
      });
      
      // Create notification for passenger
      await Notification.create({
        userId: mongoose.Types.ObjectId(passengerId),
        type: 'ride_accepted',
        title: 'Ride Accepted',
        message: `Your ride has been accepted by ${rider.firstName} ${rider.lastName}`,
        data: {
          rideId,
          riderId,
        },
        priority: 'high',
      });
    }
    
    // Notify other riders that ride is no longer available
    io.to('riders').emit('ride:taken', { rideId });
    
    // Emit acceptance confirmation to rider
    socket.emit('ride:acceptance_confirmed', {
      rideId,
      status: 'accepted',
      passenger: {
        id: passengerId,
        name: `${socket.user.firstName} ${socket.user.lastName}`,
      },
      pickupLocation: {
        latitude: ride.pickupLocation.coordinates.coordinates[1],
        longitude: ride.pickupLocation.coordinates.coordinates[0],
        address: ride.pickupLocation.address,
      },
      dropoffLocation: {
        latitude: ride.destination.coordinates.coordinates[1],
        longitude: ride.destination.coordinates.coordinates[0],
        address: ride.destination.address,
      },
    });
  } catch (error) {
    console.error('Error in handleRideAcceptance:', error);
    socket.emit('error', { message: 'Failed to accept ride' });
  }
};

/**
 * Handle ride status update by rider
 * @param {Object} socket - Socket instance
 * @param {Object} data - Status update data
 */
const handleRideStatusUpdate = async (socket, data) => {
  const riderId = socket.user._id.toString();
  const { rideId, status } = data;
  
  // Map client status to MongoDB model status
  const statusMap = {
    'arrived': 'arrived_pickup',
    'started': 'in_progress',
    'completed': 'completed'
  };
  
  const dbStatus = statusMap[status];
  
  // Validate status
  if (!dbStatus) {
    return socket.emit('error', { message: 'Invalid ride status' });
  }
  
  try {
    // Get ride from database
    const ride = await Ride.findOne({
      _id: mongoose.Types.ObjectId(rideId),
      riderId: mongoose.Types.ObjectId(riderId)
    });
    
    if (!ride) {
      return socket.emit('error', { message: 'Ride not found or you are not the assigned rider' });
    }
    
    // Validate status transition
    const statusTransitions = {
      'accepted': ['arrived_pickup'],
      'arrived_pickup': ['in_progress'],
      'in_progress': ['completed'],
    };
    
    if (!statusTransitions[ride.status] || !statusTransitions[ride.status].includes(dbStatus)) {
      return socket.emit('error', { message: `Cannot update status from ${ride.status} to ${dbStatus}` });
    }
    
    // Update status based on the new status
    const updateData = { status: dbStatus };
    
    if (dbStatus === 'arrived_pickup') {
      updateData.actualPickupTime = new Date();
    } else if (dbStatus === 'in_progress') {
      if (!ride.actualPickupTime) {
        updateData.actualPickupTime = new Date();
      }
    } else if (dbStatus === 'completed') {
      updateData.actualDropoffTime = new Date();
      
      // Calculate actual distance and duration if provided
      if (data.actualDistance) updateData.actualDistance = data.actualDistance;
      if (data.actualDuration) updateData.actualDuration = data.actualDuration;
      
      // Calculate actual fare if not provided
      if (!data.actualFare) {
        // For demo, use estimated fare as actual fare
        updateData.fare = ride.fare;
      } else {
        updateData.fare = {
          ...ride.fare,
          totalFare: data.actualFare
        };
      }
    }
    
    // Update ride status
    Object.assign(ride, updateData);
    await ride.save();
    
    // Get passenger socket
    const passengerId = ride.userId.toString();
    const passengerSocketId = connectedUsers.get(passengerId);
    
    if (passengerSocketId) {
      // Emit status update to passenger
      io.to(passengerSocketId).emit('ride:status_updated', {
        rideId,
        status: dbStatus,
        timestamp: new Date(),
        ...(dbStatus === 'completed' && {
          fare: ride.fare.totalFare,
          distance: updateData.actualDistance || ride.estimatedDistance,
          duration: updateData.actualDuration || ride.estimatedDuration,
        }),
      });
      
      // Create notification for passenger
      let notificationType, notificationTitle, notificationMessage;
      
      if (dbStatus === 'arrived_pickup') {
        notificationType = 'ride_arrived_pickup';
        notificationTitle = 'Rider Has Arrived';
        notificationMessage = 'Your rider has arrived at the pickup location';
      } else if (dbStatus === 'in_progress') {
        notificationType = 'ride_started';
        notificationTitle = 'Ride Started';
        notificationMessage = 'Your ride has started';
      } else if (dbStatus === 'completed') {
        notificationType = 'ride_completed';
        notificationTitle = 'Ride Completed';
        notificationMessage = 'Your ride has been completed';
      }
      
      await Notification.create({
        userId: mongoose.Types.ObjectId(passengerId),
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: { rideId },
        priority: dbStatus === 'arrived_pickup' ? 'high' : 'medium',
      });
    }
    
    // Emit status update confirmation to rider
    socket.emit('ride:status_update_confirmed', {
      rideId,
      status: dbStatus,
      timestamp: new Date(),
      ...(dbStatus === 'completed' && {
        earnings: (parseFloat(ride.fare.totalFare) * 0.8).toFixed(2),
      }),
    });
  } catch (error) {
    console.error('Error in handleRideStatusUpdate:', error);
    socket.emit('error', { message: 'Failed to update ride status' });
  }
};

/**
 * Handle ride cancellation by passenger
 * @param {Object} socket - Socket instance
 * @param {Object} data - Cancellation data
 */
const handleRideCancellation = async (socket, data) => {
  const passengerId = socket.user._id.toString();
  const { rideId, reason } = data;
  
  try {
    // Get ride from database
    const ride = await Ride.findOne({
      _id: mongoose.Types.ObjectId(rideId),
      userId: mongoose.Types.ObjectId(passengerId)
    });
    
    if (!ride) {
      return socket.emit('error', { message: 'Ride not found or you are not the requester' });
    }
    
    // Check if ride can be cancelled
    if (['completed', 'cancelled', 'expired'].includes(ride.status)) {
      return socket.emit('error', { message: `Ride cannot be cancelled because it is already ${ride.status}` });
    }
    
    // Check if ride has started
    if (ride.status === 'in_progress') {
      return socket.emit('error', { message: 'Ride cannot be cancelled because it has already started' });
    }
    
    // Update ride status
    ride.status = 'cancelled';
    ride.cancelledBy = 'passenger';
    ride.cancellationReason = reason || 'Cancelled by passenger';
    await ride.save();
    
    // If ride was assigned to a rider, notify them
    if (ride.riderId) {
      const riderSocketId = connectedUsers.get(ride.riderId.toString());
      
      if (riderSocketId) {
        // Emit cancellation event to rider
        io.to(riderSocketId).emit('ride:cancelled', {
          rideId,
          reason: reason || 'Cancelled by passenger',
          timestamp: new Date(),
        });
        
        // Create notification for rider
        await Notification.create({
          userId: ride.riderId,
          type: 'ride_cancelled',
          title: 'Ride Cancelled',
          message: `The ride from ${ride.pickupLocation.address} to ${ride.destination.address} has been cancelled by the passenger`,
          data: { rideId },
          priority: 'high',
        });
      }
    }
    
    // Emit cancellation confirmation to passenger
    socket.emit('ride:cancellation_confirmed', {
      rideId,
      status: 'cancelled',
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error in handleRideCancellation:', error);
    socket.emit('error', { message: 'Failed to cancel ride' });
  }
};

/**
 * Handle notification read acknowledgment
 * @param {Object} socket - Socket instance
 * @param {Object} data - Notification data
 */
const handleNotificationRead = async (socket, data) => {
  const userId = socket.user._id.toString();
  const { notificationId } = data;
  
  try {
    // Update notification as read
    const result = await Notification.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(notificationId),
        userId: mongoose.Types.ObjectId(userId)
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    if (!result) {
      return socket.emit('error', { message: 'Notification not found or you are not the recipient' });
    }
    
    socket.emit('notification:read_confirmed', { notificationId });
  } catch (error) {
    console.error('Error in handleNotificationRead:', error);
    socket.emit('error', { message: 'Failed to mark notification as read' });
  }
};

/**
 * Find nearby available riders (Legacy method - using enhanced rider matching service now)
 * @param {Object} location - Pickup location
 * @param {Number} radiusKm - Search radius in kilometers
 * @returns {Promise<Array>} Array of nearby riders
 */
const findNearbyRiders = async (location, radiusKm = 5) => {
  try {
    // Try to use the enhanced rider matching service first
    try {
      const matchResult = await riderMatching.findNearbyRiders({
        location: {
          lat: location.latitude,
          lng: location.longitude
        },
        maxDistance: radiusKm * 1000
      });
      
      if (matchResult.success && matchResult.riders.length > 0) {
        // Convert to compatible format
        return matchResult.riders.map(rider => ({
          _id: rider.riderId,
          firstName: rider.name.split(' ')[0],
          lastName: rider.name.split(' ').slice(1).join(' '),
          phoneNumber: rider.phone,
          profilePicture: rider.photo,
          riderProfile: {
            vehicleType: rider.vehicle.type,
            vehicleModel: rider.vehicle.model,
            licensePlate: rider.vehicle.plate,
            averageRating: rider.rating
          }
        }));
      }
    } catch (matchError) {
      console.error('Error using enhanced rider matching service:', matchError);
      // Fall back to legacy method
    }
    
    // Legacy method as fallback
    const radiusMeters = radiusKm * 1000;
    
    const nearbyRiders = await User.find({
      role: 'rider',
      'riderProfile.isActive': true,
      'riderProfile.lastLocation': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          },
          $maxDistance: radiusMeters
        }
      }
    }).limit(10);
    
    return nearbyRiders;
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    return [];
  }
};

/**
 * Emit notification to a specific user
 * @param {String} userId - User ID
 * @param {Object} notification - Notification data
 */
const emitNotification = async (userId, notification) => {
  try {
    // Create notification in database
    const newNotification = await Notification.create({
      userId: mongoose.Types.ObjectId(userId),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      priority: notification.priority || 'medium',
    });
    
    // Send notification to user if connected
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('notification:new', {
        id: newNotification._id.toString(),
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        data: newNotification.data,
        priority: newNotification.priority,
        timestamp: newNotification.createdAt,
      });
    }
    
    return newNotification;
  } catch (error) {
    console.error('Error emitting notification:', error);
    return null;
  }
};

/**
 * Emit an event to a specific user
 * @param {String} userId - User ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
const emitToUser = (userId, event, data) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
};

/**
 * Broadcast message to all connected users or a specific group
 * @param {String} event - Event name
 * @param {Object} data - Event data
 * @param {String} room - Room to broadcast to (optional)
 */
const broadcastMessage = (event, data, room = null) => {
  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }
};

/**
 * Get the Socket.IO instance
 * @returns {Object} Socket.IO instance
 */
const getSocketIo = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Check if a user is connected
 * @param {String} userId - User ID
 * @returns {Boolean} Whether the user is connected
 */
const isUserConnected = (userId) => {
  return connectedUsers.has(userId);
};

export {
  initializeSocketServer,
  getSocketIo,
  emitNotification,
  emitToUser,
  broadcastMessage,
  isUserConnected
};
