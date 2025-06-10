/**
 * Enhanced Location Tracking Service with Optimizations
 * Implements intelligent location update throttling and battery-saving algorithms
 */
import * as socketService from './mongo-socket.service.js';
import RiderLocation from '../mongodb/models/RiderLocation.js';
import * as TrackingEventModule from '../mongodb/models/TrackingEvent.js';
const TrackingEvent = TrackingEventModule.default || TrackingEventModule;
import mapsService from './maps.service.js';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import { v4 as uuidv4 } from 'uuid';

// Store active tracking sessions
const activeTrackingSessions = new Map();

// Store location history to implement intelligent update throttling
const locationHistory = new Map();

// Configuration constants for adaptive location updates
const DISTANCE_THRESHOLD = 15; // meters
const STATIONARY_TIME_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const HIGH_SPEED_THRESHOLD = 8; // m/s (approx. 30 km/h)
const UPDATE_INTERVALS = {
  MOVING_FAST: 5000,        // 5 seconds when moving fast
  MOVING_NORMAL: 10000,     // 10 seconds when moving normally
  MOVING_SLOW: 15000,       // 15 seconds when moving slowly
  STATIONARY: 30000,        // 30 seconds when stationary
  BACKGROUND: 60000,        // 1 minute when app is in background
  BACKGROUND_IDLE: 180000,  // 3 minutes when in background and idle
};

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {number} Distance in meters
 */
const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return Infinity;
  
  const R = 6371e3; // Earth radius in meters
  const φ1 = coord1.lat * Math.PI / 180;
  const φ2 = coord2.lat * Math.PI / 180;
  const Δφ = (coord2.lat - coord1.lat) * Math.PI / 180;
  const Δλ = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Determine if a location update should be processed based on adaptive rules
 * @param {string} userId - User ID
 * @param {Object} location - Location data {lat, lng, speed, accuracy}
 * @param {Object} metadata - Additional metadata {appState, batteryLevel}
 * @returns {boolean} Whether to process this update
 */
const shouldProcessLocationUpdate = (userId, location, metadata = {}) => {
  // Always process if no history exists for this user
  if (!locationHistory.has(userId)) {
    locationHistory.set(userId, {
      lastLocation: location,
      lastProcessedLocation: location,
      lastUpdateTime: Date.now(),
      lastProcessedTime: Date.now(),
      isStationary: false,
      stationaryTime: 0,
      recommendedInterval: UPDATE_INTERVALS.MOVING_NORMAL
    });
    return true;
  }
  
  const history = locationHistory.get(userId);
  const now = Date.now();
  const timeSinceLastUpdate = now - history.lastUpdateTime;
  const timeSinceLastProcessed = now - history.lastProcessedTime;
  
  // Update last location and time in history
  history.lastLocation = location;
  history.lastUpdateTime = now;
  
  // Calculate distance from last processed location
  const distance = calculateDistance(
    { lat: location.lat, lng: location.lng },
    { lat: history.lastProcessedLocation.lat, lng: history.lastProcessedLocation.lng }
  );
  
  // Check if device is stationary
  const isStationary = distance < DISTANCE_THRESHOLD;
  
  // Update stationary state and time
  if (isStationary) {
    if (!history.isStationary) {
      history.isStationary = true;
      history.stationaryTime = 0;
    } else {
      history.stationaryTime += timeSinceLastUpdate;
    }
  } else {
    history.isStationary = false;
    history.stationaryTime = 0;
  }
  
  // Determine recommended update interval based on movement patterns and app state
  let recommendedInterval = UPDATE_INTERVALS.MOVING_NORMAL;
  
  if (metadata.appState === 'background') {
    recommendedInterval = history.isStationary && history.stationaryTime > STATIONARY_TIME_THRESHOLD 
      ? UPDATE_INTERVALS.BACKGROUND_IDLE 
      : UPDATE_INTERVALS.BACKGROUND;
  } else {
    // Foreground app
    if (history.isStationary && history.stationaryTime > STATIONARY_TIME_THRESHOLD) {
      recommendedInterval = UPDATE_INTERVALS.STATIONARY;
    } else if (location.speed && location.speed > HIGH_SPEED_THRESHOLD) {
      recommendedInterval = UPDATE_INTERVALS.MOVING_FAST;
    } else if (location.speed && location.speed < 2) {
      recommendedInterval = UPDATE_INTERVALS.MOVING_SLOW;
    }
  }
  
  history.recommendedInterval = recommendedInterval;
  
  // Process if enough time has passed according to the recommended interval
  if (timeSinceLastProcessed >= recommendedInterval) {
    // Update processed location info
    history.lastProcessedLocation = location;
    history.lastProcessedTime = now;
    return true;
  }
  
  // Always process if significant distance change regardless of time
  if (distance > DISTANCE_THRESHOLD * 5) {
    // Update processed location info
    history.lastProcessedLocation = location;
    history.lastProcessedTime = now;
    return true;
  }
  
  // Don't process this update
  return false;
};

/**
 * Initialize enhanced tracking when server starts
 */
const initializeTracking = () => {
  console.log('Initializing enhanced location tracking service with optimizations');
  
  // Get Socket.IO instance
  const io = socketService.getSocketIo();
  
  if (!io) {
    console.error('Cannot initialize tracking: Socket.IO not initialized');
    return;
  }
  
  // Create a namespace for location tracking
  const trackingNamespace = io.of('/tracking');
  
  // Authentication middleware for tracking namespace
  trackingNamespace.use(socketService.socketAuthMiddleware);
  
  // Handle connections to the tracking namespace
  trackingNamespace.on('connection', (socket) => {
    console.log(`Client connected to tracking namespace: ${socket.id}`);
    
    // Store user information
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;
    
    // Add to active users
    if (!activeTrackingSessions.has(userId)) {
      activeTrackingSessions.set(userId, {
        socketId: socket.id,
        role: userRole,
        tracking: [],
        beingTrackedBy: [],
        lastLocation: null,
        lastUpdateTime: null
      });
    } else {
      const session = activeTrackingSessions.get(userId);
      session.socketId = socket.id;
    }
    
    // Join room based on user role
    socket.join(`role:${userRole}`);
    socket.join(`user:${userId}`);
    
    // Handle location updates from rider
    if (userRole === 'rider') {
      // Join riders room
      socket.join('riders');
      
      socket.on('location:update', async (data) => {
        try {
          // Apply intelligent throttling to location updates
          const shouldProcess = shouldProcessLocationUpdate(
            userId, 
            { 
              lat: parseFloat(data.lat), 
              lng: parseFloat(data.lng),
              speed: data.speed ? parseFloat(data.speed) : undefined,
              accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined
            },
            { 
              appState: data.appState || 'foreground',
              batteryLevel: data.batteryLevel ? parseFloat(data.batteryLevel) : undefined
            }
          );
          
          if (shouldProcess) {
            await handleRiderLocationUpdate(socket, data);
          } else {
            // Send acknowledgment without saving to database
            socket.emit('location:skipped', {
              success: true,
              timestamp: new Date(),
              message: 'Location update skipped due to adaptive throttling',
              nextUpdateIn: locationHistory.get(userId).recommendedInterval
            });
          }
        } catch (error) {
          console.error('Error handling rider location update:', error);
          socket.emit('tracking:error', { 
            message: 'Failed to process location update',
            error: error.message
          });
        }
      });
      
      socket.on('tracking:status', async (data) => {
        try {
          await updateRiderTrackingStatus(socket, data);
        } catch (error) {
          console.error('Error updating rider tracking status:', error);
          socket.emit('tracking:error', { 
            message: 'Failed to update tracking status',
            error: error.message
          });
        }
      });
      
      // New event to receive client device state for better optimizations
      socket.on('device:state', (data) => {
        try {
          updateDeviceState(userId, data);
        } catch (error) {
          console.error('Error updating device state:', error);
        }
      });
    } else if (userRole === 'passenger') {
      // Join passengers room
      socket.join('passengers');
      
      socket.on('tracking:request', async (data) => {
        try {
          await handleTrackingRequest(socket, data);
        } catch (error) {
          console.error('Error handling tracking request:', error);
          socket.emit('tracking:error', { 
            message: 'Failed to request tracking',
            error: error.message
          });
        }
      });
      
      socket.on('tracking:stop', async (data) => {
        try {
          await handleStopTrackingRequest(socket, data);
        } catch (error) {
          console.error('Error handling stop tracking request:', error);
          socket.emit('tracking:error', { 
            message: 'Failed to stop tracking',
            error: error.message
          });
        }
      });
    }
    
    // Common events for all users
    socket.on('tracking:ping', (data) => {
      socket.emit('tracking:pong', {
        timestamp: Date.now(),
        received: data
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected from tracking namespace: ${socket.id}`);
      handleDisconnection(userId, {
        deviceData: {
          deviceId: socket.handshake.query.deviceId,
          appVersion: socket.handshake.query.appVersion
        }
      });
    });
  });
};

/**
 * Update device state to adjust tracking parameters
 * @param {string} userId - User ID
 * @param {Object} data - Device state data
 */
const updateDeviceState = (userId, data) => {
  if (!locationHistory.has(userId)) {
    locationHistory.set(userId, {
      lastLocation: null,
      lastProcessedLocation: null,
      lastUpdateTime: Date.now(),
      lastProcessedTime: Date.now(),
      isStationary: false,
      stationaryTime: 0,
      recommendedInterval: UPDATE_INTERVALS.MOVING_NORMAL,
      deviceState: {}
    });
  }
  
  const history = locationHistory.get(userId);
  history.deviceState = {
    ...history.deviceState,
    ...data,
    lastUpdated: Date.now()
  };
  
  // Adjust tracking parameters based on device state
  if (data.batteryLevel && data.batteryLevel < 15) {
    // Increase intervals when battery is low
    history.recommendedInterval = Math.max(
      history.recommendedInterval,
      UPDATE_INTERVALS.BACKGROUND
    );
  }
};

/**
 * Handle rider location update
 * @param {Object} socket - Socket instance
 * @param {Object} data - Location data
 */
const handleRiderLocationUpdate = async (socket, data) => {
  const riderId = socket.user._id.toString();
  
  // Validate location data
  if (!data.lat || !data.lng) {
    throw new Error('Invalid location data: lat and lng are required');
  }
  
  // Parse data
  const locationData = {
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lng),
    accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined,
    heading: data.heading ? parseFloat(data.heading) : undefined,
    speed: data.speed ? parseFloat(data.speed) : undefined,
    altitude: data.altitude ? parseFloat(data.altitude) : undefined,
    status: data.status,
    batteryLevel: data.batteryLevel ? parseFloat(data.batteryLevel) : undefined,
    metadata: {
      deviceId: data.deviceId,
      appVersion: data.appVersion,
      provider: data.provider,
      appState: data.appState || 'foreground',
      mock: !!data.mock
    }
  };
  
  // Create or update session ID for tracking
  const sessionId = data.sessionId || uuidv4();
  
  // Update rider location in MongoDB
  const riderLocation = await RiderLocation.updateRiderLocation(
    new ObjectId(riderId),
    locationData
  );
  
  // Log location event (reduced frequency)
  try {
    // Only log a subset of location events to reduce database load
    if (Math.random() < 0.25) { // Log approximately 25% of events
      await TrackingEvent.createLocationEvent({
        userId: new ObjectId(riderId),
        userRole: 'rider',
        rideId: riderLocation.currentRideId,
        location: {
          lat: locationData.lat,
          lng: locationData.lng
        },
        accuracy: locationData.accuracy,
        heading: locationData.heading,
        speed: locationData.speed,
        altitude: locationData.altitude,
        deviceData: {
          deviceId: data.deviceId,
          appVersion: data.appVersion,
          provider: data.provider,
          batteryLevel: locationData.batteryLevel
        },
        sessionId
      });
    }
  } catch (eventError) {
    console.warn('Non-critical error logging location event:', eventError);
    // Continue without event logging - non-critical
  }
  
  // Update session data
  if (activeTrackingSessions.has(riderId)) {
    const session = activeTrackingSessions.get(riderId);
    session.lastLocation = {
      lat: locationData.lat,
      lng: locationData.lng,
      heading: locationData.heading,
      speed: locationData.speed
    };
    session.lastUpdateTime = new Date();
  }
  
  // Get reverse geocoded address (only when necessary)
  // Determine if we need to perform reverse geocoding
  const needsReverseGeocode = shouldPerformReverseGeocode(riderId, locationData);
  
  if (needsReverseGeocode) {
    try {
      // Run geocoding in a non-blocking way
      setTimeout(async () => {
        try {
          const geocodeResult = await mapsService.reverseGeocode({
            lat: locationData.lat,
            lng: locationData.lng
          });
          
          if (geocodeResult.success) {
            // Update the rider location model with address info
            await RiderLocation.findOneAndUpdate(
              { riderId: new ObjectId(riderId) },
              { 
                formattedAddress: geocodeResult.data.formatted_address,
                addressComponents: geocodeResult.data.addressComponents
              }
            );
          }
        } catch (error) {
          console.warn('Non-critical error in background geocoding:', error);
        }
      }, 0);
    } catch (geocodeError) {
      console.warn('Non-critical error scheduling geocoding:', geocodeError);
      // Continue without address - non-critical error
    }
  }
  
  // Emit to all users tracking this rider
  const trackers = getTrackersForUser(riderId);
  
  if (trackers.length > 0) {
    const io = socketService.getSocketIo();
    const rideId = riderLocation.currentRideId?.toString();
    
    trackers.forEach(trackerId => {
      // Get tracker socket ID
      const trackerSession = activeTrackingSessions.get(trackerId);
      if (trackerSession && trackerSession.socketId) {
        // Emit update to tracker
        io.of('/tracking').to(trackerSession.socketId).emit('location:update', {
          riderId,
          rideId,
          location: {
            lat: locationData.lat,
            lng: locationData.lng,
            heading: locationData.heading,
            speed: locationData.speed
          },
          formattedAddress: riderLocation.formattedAddress,
          timestamp: new Date()
        });
      }
    });
  }
  
  // If rider is on a ride, emit to ride room
  if (riderLocation.currentRideId) {
    const rideId = riderLocation.currentRideId.toString();
    const io = socketService.getSocketIo();
    
    io.to(`ride:${rideId}`).emit('rider:location_update', {
      riderId,
      rideId,
      location: {
        lat: locationData.lat,
        lng: locationData.lng,
        heading: locationData.heading,
        speed: locationData.speed
      },
      timestamp: new Date()
    });
  }
  
  // Acknowledge the update
  socket.emit('location:updated', {
    success: true,
    timestamp: new Date(),
    received: {
      lat: locationData.lat,
      lng: locationData.lng
    },
    recommendedInterval: locationHistory.has(riderId) 
      ? locationHistory.get(riderId).recommendedInterval 
      : UPDATE_INTERVALS.MOVING_NORMAL
  });
  
  return riderLocation;
};

/**
 * Determine if reverse geocoding should be performed for this location update
 * @param {string} riderId - Rider ID
 * @param {Object} locationData - Location data
 * @returns {boolean} Whether to perform reverse geocoding
 */
const shouldPerformReverseGeocode = (riderId, locationData) => {
  // Get rider's location history
  if (!locationHistory.has(riderId)) return true;
  
  const history = locationHistory.get(riderId);
  
  // If no previous processed location, geocode this one
  if (!history.lastProcessedLocation) return true;
  
  // Calculate distance from last geocoded location
  const distance = calculateDistance(
    { lat: locationData.lat, lng: locationData.lng },
    { lat: history.lastProcessedLocation.lat, lng: history.lastProcessedLocation.lng }
  );
  
  // Only geocode if significant distance change (> 100 meters)
  return distance > 100;
};

/**
 * Update rider tracking status
 * @param {Object} socket - Socket instance
 * @param {Object} data - Status data
 */
const updateRiderTrackingStatus = async (socket, data) => {
  const riderId = socket.user._id.toString();
  const { status } = data;
  
  // Get current status to track the change
  const riderLocation = await RiderLocation.findOne({ 
    riderId: new ObjectId(riderId) 
  });
  
  const oldStatus = riderLocation ? riderLocation.status : null;
  
  // Update rider status in MongoDB
  await RiderLocation.findOneAndUpdate(
    { riderId: new ObjectId(riderId) },
    { status }
  );
  
  // Log status change event
  try {
    await TrackingEvent.createStatusEvent({
      userId: new ObjectId(riderId),
      userRole: 'rider',
      status,
      oldStatus,
      rideId: riderLocation ? riderLocation.currentRideId : null,
      location: riderLocation && riderLocation.currentLocation ? {
        lat: riderLocation.currentLocation.coordinates[1],
        lng: riderLocation.currentLocation.coordinates[0]
      } : null,
      deviceData: {
        deviceId: data.deviceId,
        appVersion: data.appVersion
      },
      sessionId: data.sessionId || uuidv4()
    });
  } catch (eventError) {
    console.warn('Non-critical error logging status event:', eventError);
    // Continue without event logging - non-critical
  }
  
  // Update session data
  if (activeTrackingSessions.has(riderId)) {
    const session = activeTrackingSessions.get(riderId);
    
    // Emit status change to all trackers
    const io = socketService.getSocketIo();
    
    session.beingTrackedBy.forEach(trackerId => {
      const trackerSession = activeTrackingSessions.get(trackerId);
      if (trackerSession && trackerSession.socketId) {
        io.of('/tracking').to(trackerSession.socketId).emit('rider:status_update', {
          riderId,
          status,
          timestamp: new Date()
        });
      }
    });
  }
  
  // Acknowledge the update
  socket.emit('tracking:status_updated', {
    success: true,
    status,
    timestamp: new Date()
  });
};

/**
 * Handle tracking request from a user
 * @param {Object} socket - Socket instance
 * @param {Object} data - Request data
 */
const handleTrackingRequest = async (socket, data) => {
  const trackerId = socket.user._id.toString();
  const { riderId, rideId } = data;
  
  if (!riderId) {
    throw new Error('Rider ID is required');
  }
  
  // Validate if tracker is allowed to track this rider
  // This would typically check if there's an active ride between them
  // For now, we'll just allow it if the rider exists
  
  const riderLocation = await RiderLocation.findOne({ 
    riderId: new ObjectId(riderId) 
  }).populate('riderId', 'firstName lastName phoneNumber profilePicture riderProfile.averageRating');
  
  if (!riderLocation) {
    throw new Error('Rider not found or not available for tracking');
  }
  
  // Update tracking relationships
  if (activeTrackingSessions.has(trackerId)) {
    const trackerSession = activeTrackingSessions.get(trackerId);
    
    // Add rider to tracker's tracking list if not already there
    if (!trackerSession.tracking.includes(riderId)) {
      trackerSession.tracking.push(riderId);
    }
  }
  
  if (activeTrackingSessions.has(riderId)) {
    const riderSession = activeTrackingSessions.get(riderId);
    
    // Add tracker to rider's tracked-by list if not already there
    if (!riderSession.beingTrackedBy.includes(trackerId)) {
      riderSession.beingTrackedBy.push(trackerId);
    }
    
    // If rider is online, send their current location to the tracker
    if (riderSession.lastLocation) {
      socket.emit('location:update', {
        riderId,
        rideId,
        location: riderSession.lastLocation,
        formattedAddress: riderLocation.formattedAddress,
        timestamp: riderSession.lastUpdateTime || new Date()
      });
    }
  } else {
    // Rider is not connected to socket, but we can still send their last known location
    const riderSession = {
      socketId: null,
      role: 'rider',
      tracking: [],
      beingTrackedBy: [trackerId],
      lastLocation: null,
      lastUpdateTime: null
    };
    
    // Get last location from database
    if (riderLocation.currentLocation) {
      riderSession.lastLocation = {
        lat: riderLocation.currentLocation.coordinates[1],
        lng: riderLocation.currentLocation.coordinates[0],
        heading: riderLocation.heading,
        speed: riderLocation.speed
      };
      riderSession.lastUpdateTime = riderLocation.lastUpdated;
      
      // Send last known location to tracker
      socket.emit('location:update', {
        riderId,
        rideId,
        location: riderSession.lastLocation,
        formattedAddress: riderLocation.formattedAddress,
        timestamp: riderLocation.lastUpdated || new Date()
      });
    }
    
    activeTrackingSessions.set(riderId, riderSession);
  }
  
  // Join ride room if ride ID is provided
  if (rideId) {
    socket.join(`ride:${rideId}`);
  }
  
  // Generate session ID for tracking relationship
  const sessionId = data.sessionId || uuidv4();
  
  // Log tracking start event
  try {
    await TrackingEvent.createTrackingEvent({
      userId: new ObjectId(trackerId),
      userRole: 'passenger',
      relatedUserId: new ObjectId(riderId),
      eventType: 'tracking_started',
      rideId: rideId ? new ObjectId(rideId) : undefined,
      deviceData: {
        deviceId: data.deviceId,
        appVersion: data.appVersion
      },
      eventData: {
        riderStatus: riderLocation.status
      },
      sessionId
    });
  } catch (eventError) {
    console.warn('Non-critical error logging tracking event:', eventError);
    // Continue without event logging - non-critical
  }
  
  // Acknowledge the tracking request
  socket.emit('tracking:started', {
    success: true,
    riderId,
    rideId,
    rider: riderLocation.riderId ? {
      name: `${riderLocation.riderId.firstName} ${riderLocation.riderId.lastName}`,
      phone: riderLocation.riderId.phoneNumber,
      photo: riderLocation.riderId.profilePicture,
      rating: riderLocation.riderId.riderProfile?.averageRating || 0
    } : null,
    status: riderLocation.status,
    timestamp: new Date(),
    sessionId
  });
};

/**
 * Handle stop tracking request
 * @param {Object} socket - Socket instance
 * @param {Object} data - Request data
 */
const handleStopTrackingRequest = async (socket, data) => {
  const trackerId = socket.user._id.toString();
  const { riderId, rideId } = data;
  
  if (!riderId) {
    throw new Error('Rider ID is required');
  }
  
  // Update tracking relationships
  if (activeTrackingSessions.has(trackerId)) {
    const trackerSession = activeTrackingSessions.get(trackerId);
    
    // Remove rider from tracker's tracking list
    trackerSession.tracking = trackerSession.tracking.filter(id => id !== riderId);
  }
  
  if (activeTrackingSessions.has(riderId)) {
    const riderSession = activeTrackingSessions.get(riderId);
    
    // Remove tracker from rider's tracked-by list
    riderSession.beingTrackedBy = riderSession.beingTrackedBy.filter(id => id !== trackerId);
  }
  
  // Generate session ID for tracking relationship if not provided
  const sessionId = data.sessionId || uuidv4();
  
  // Leave ride room if ride ID is provided
  if (rideId) {
    socket.leave(`ride:${rideId}`);
  }
  
  // Log tracking stop event
  try {
    await TrackingEvent.createTrackingEvent({
      userId: new ObjectId(trackerId),
      userRole: 'passenger',
      relatedUserId: new ObjectId(riderId),
      eventType: 'tracking_stopped',
      rideId: rideId ? new ObjectId(rideId) : undefined,
      deviceData: {
        deviceId: data.deviceId,
        appVersion: data.appVersion
      },
      sessionId
    });
  } catch (eventError) {
    console.warn('Non-critical error logging tracking event:', eventError);
    // Continue without event logging - non-critical
  }
  
  // Acknowledge the stop tracking request
  socket.emit('tracking:stopped', {
    success: true,
    riderId,
    rideId,
    timestamp: new Date(),
    sessionId
  });
};

/**
 * Handle user disconnection
 * @param {String} userId - User ID
 */
const handleDisconnection = (userId, data = {}) => {
  if (activeTrackingSessions.has(userId)) {
    const session = activeTrackingSessions.get(userId);
    
    if (session.role === 'rider') {
      // Update rider status to offline in database
      RiderLocation.findOneAndUpdate(
        { riderId: new ObjectId(userId) },
        { status: 'offline' }
      ).catch(error => {
        console.error('Error updating rider status on disconnection:', error);
      });
      
      // Log disconnection event
      try {
        TrackingEvent.createConnectionEvent({
          userId: new ObjectId(userId),
          userRole: 'rider',
          eventType: 'disconnection',
          deviceData: data.deviceData || {},
          sessionId: data.sessionId || session.sessionId || uuidv4()
        }).catch(error => {
          console.warn('Non-critical error logging disconnection event:', error);
        });
      } catch (eventError) {
        console.warn('Non-critical error creating disconnection event:', eventError);
      }
      
      // Notify all trackers that rider is offline
      const io = socketService.getSocketIo();
      
      session.beingTrackedBy.forEach(trackerId => {
        const trackerSession = activeTrackingSessions.get(trackerId);
        if (trackerSession && trackerSession.socketId) {
          io.of('/tracking').to(trackerSession.socketId).emit('rider:status_update', {
            riderId: userId,
            status: 'offline',
            timestamp: new Date()
          });
        }
      });
    } else if (session.role === 'passenger') {
      // Clean up tracking relationships
      session.tracking.forEach(riderId => {
        if (activeTrackingSessions.has(riderId)) {
          const riderSession = activeTrackingSessions.get(riderId);
          riderSession.beingTrackedBy = riderSession.beingTrackedBy.filter(id => id !== userId);
        }
      });
    }
    
    // Mark session as disconnected but keep it for a while
    // This helps with quick reconnections
    session.socketId = null;
    
    // Schedule cleanup after some time
    setTimeout(() => {
      // If still disconnected after timeout, remove session
      if (activeTrackingSessions.has(userId) && 
          activeTrackingSessions.get(userId).socketId === null) {
        activeTrackingSessions.delete(userId);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }
};

/**
 * Get all users tracking a specific user
 * @param {String} userId - User ID
 * @returns {Array} Array of tracker user IDs
 */
const getTrackersForUser = (userId) => {
  if (activeTrackingSessions.has(userId)) {
    return activeTrackingSessions.get(userId).beingTrackedBy;
  }
  return [];
};

/**
 * Get all users being tracked by a specific user
 * @param {String} userId - User ID
 * @returns {Array} Array of tracked user IDs
 */
const getTrackedByUser = (userId) => {
  if (activeTrackingSessions.has(userId)) {
    return activeTrackingSessions.get(userId).tracking;
  }
  return [];
};

/**
 * Start tracking a rider for a specific ride
 * @param {String} riderId - Rider user ID
 * @param {String} passengerId - Passenger user ID
 * @param {String} rideId - Ride ID
 * @returns {Boolean} Success status
 */
const startRideTracking = async (riderId, passengerId, rideId) => {
  try {
    // Generate session ID for this ride tracking session
    const sessionId = uuidv4();
    
    // Update ride reference in rider location
    await RiderLocation.findOneAndUpdate(
      { riderId: new ObjectId(riderId) },
      { currentRideId: new ObjectId(rideId) }
    );
    
    // Log ride started event
    try {
      await TrackingEvent.createRideEvent({
        userId: new ObjectId(riderId),
        userRole: 'rider',
        relatedUserId: new ObjectId(passengerId),
        eventType: 'ride_started',
        rideId: new ObjectId(rideId),
        sessionId
      });
    } catch (eventError) {
      console.warn('Non-critical error logging ride started event:', eventError);
      // Continue without event logging - non-critical
    }
    
    // Create ride-specific room in socket.io
    const io = socketService.getSocketIo();
    
    // Add both rider and passenger to the ride room
    if (activeTrackingSessions.has(riderId)) {
      const riderSession = activeTrackingSessions.get(riderId);
      if (riderSession.socketId) {
        io.of('/tracking').sockets.get(riderSession.socketId)?.join(`ride:${rideId}`);
      }
    }
    
    if (activeTrackingSessions.has(passengerId)) {
      const passengerSession = activeTrackingSessions.get(passengerId);
      if (passengerSession.socketId) {
        io.of('/tracking').sockets.get(passengerSession.socketId)?.join(`ride:${rideId}`);
      }
      
      // Add tracking relationship
      if (!passengerSession.tracking.includes(riderId)) {
        passengerSession.tracking.push(riderId);
      }
    }
    
    if (activeTrackingSessions.has(riderId)) {
      const riderSession = activeTrackingSessions.get(riderId);
      
      // Add tracking relationship
      if (!riderSession.beingTrackedBy.includes(passengerId)) {
        riderSession.beingTrackedBy.push(passengerId);
      }
    } else {
      // Create rider session if doesn't exist
      activeTrackingSessions.set(riderId, {
        socketId: null,
        role: 'rider',
        tracking: [],
        beingTrackedBy: [passengerId],
        lastLocation: null,
        lastUpdateTime: null
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error starting ride tracking:', error);
    return false;
  }
};

/**
 * Stop tracking a rider for a specific ride
 * @param {String} riderId - Rider user ID
 * @param {String} passengerId - Passenger user ID
 * @param {String} rideId - Ride ID
 * @returns {Boolean} Success status
 */
const stopRideTracking = async (riderId, passengerId, rideId) => {
  try {
    // Generate session ID if not provided
    const sessionId = uuidv4();
    
    // Clear ride reference in rider location
    await RiderLocation.findOneAndUpdate(
      { riderId: new ObjectId(riderId) },
      { $unset: { currentRideId: "" } }
    );
    
    // Log ride completed event
    try {
      await TrackingEvent.createRideEvent({
        userId: new ObjectId(riderId),
        userRole: 'rider',
        relatedUserId: new ObjectId(passengerId),
        eventType: 'ride_completed',
        rideId: new ObjectId(rideId),
        sessionId
      });
    } catch (eventError) {
      console.warn('Non-critical error logging ride completed event:', eventError);
      // Continue without event logging - non-critical
    }
    
    // Remove tracking relationships
    if (activeTrackingSessions.has(passengerId)) {
      const passengerSession = activeTrackingSessions.get(passengerId);
      passengerSession.tracking = passengerSession.tracking.filter(id => id !== riderId);
    }
    
    if (activeTrackingSessions.has(riderId)) {
      const riderSession = activeTrackingSessions.get(riderId);
      riderSession.beingTrackedBy = riderSession.beingTrackedBy.filter(id => id !== passengerId);
    }
    
    return true;
  } catch (error) {
    console.error('Error stopping ride tracking:', error);
    return false;
  }
};

/**
 * Broadcast location event to a specific ride
 * @param {String} rideId - Ride ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
const broadcastToRide = (rideId, event, data) => {
  const io = socketService.getSocketIo();
  io.to(`ride:${rideId}`).emit(event, data);
};

/**
 * Get active tracking statistics
 * @returns {Object} Tracking statistics
 */
const getTrackingStats = () => {
  const stats = {
    activeUsers: activeTrackingSessions.size,
    activeRiders: 0,
    activePassengers: 0,
    activeTrackingRelationships: 0
  };
  
  activeTrackingSessions.forEach(session => {
    if (session.role === 'rider') {
      stats.activeRiders++;
      stats.activeTrackingRelationships += session.beingTrackedBy.length;
    } else if (session.role === 'passenger') {
      stats.activePassengers++;
    }
  });
  
  return stats;
};

export {
  initializeTracking,
  handleRiderLocationUpdate,
  startRideTracking,
  stopRideTracking,
  broadcastToRide,
  getTrackingStats
};
