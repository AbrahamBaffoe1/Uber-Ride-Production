/**
 * Enhanced Real-Time Location Tracking Service
 * Adds advanced features to the basic tracking service using MongoDB capabilities
 */
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import * as TrackingEventModule from '../mongodb/models/TrackingEvent.js';
const TrackingEvent = TrackingEventModule.default || TrackingEventModule;
import RiderLocation from '../mongodb/models/RiderLocation.js';
import Ride from '../mongodb/models/Ride.js';
import mapsService from './maps.service.js';
import * as mongoSocketService from './mongo-socket.service.js';
import * as loggingService from './logging.service.js';
import { v4 as uuidv4 } from 'uuid';

// Store predictions and analysis data
const trackingCache = {
  predictions: new Map(),
  routeMatches: new Map(),
  etaCache: new Map(),
  activeGeofences: new Map(),
  riderHistory: new Map()
};

// Configuration options
const CONFIG = {
  // Intervals
  predictionIntervalMs: 2000,
  routeMatchIntervalMs: 5000,
  etaUpdateIntervalMs: 15000,
  historyExpirationMs: 24 * 60 * 60 * 1000, // 24 hours
  
  // Geofencing
  geofenceRadiusMeters: 100,
  
  // Predictions
  maxPredictionPoints: 5,
  maxSpeedThreshold: 120, // km/h
  
  // Caching
  maxCacheEntries: 1000,
  maxRoutePoints: 200
};

/**
 * Initialize enhanced tracking when server starts
 */
const initializeEnhancedTracking = () => {
  console.log('Initializing enhanced real-time location tracking service');
  
  // Get Socket.IO instance from MongoDB socket service
  const io = mongoSocketService.getSocketIo();
  
  if (!io) {
    console.error('Cannot initialize enhanced tracking: Socket.IO not initialized');
    return;
  }
  
  // Create a namespace for enhanced tracking
  const trackingNamespace = io.of('/tracking');
  
  // Authentication middleware for tracking namespace
  trackingNamespace.use(mongoSocketService.socketAuthMiddleware);
  
  // Register basic event handlers
  setupSocketHandlers(trackingNamespace);
  
  // Start background processors
  startBackgroundProcessors();
  
  return trackingNamespace;
};

/**
 * Setup socket handlers for enhanced tracking
 * @param {Object} namespace - Socket.IO namespace 
 */
const setupSocketHandlers = (namespace) => {
  namespace.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const userRole = socket.user.role;
    
    loggingService.debug('Enhanced tracking', `User connected: ${userId} (${userRole})`);
    
    // Register basic connection event
    TrackingEvent.createConnectionEvent({
      userId: new ObjectId(userId),
      userRole,
      eventType: 'connection',
      deviceData: {
        deviceId: socket.handshake.query.deviceId,
        appVersion: socket.handshake.query.appVersion,
        os: socket.handshake.query.os,
        osVersion: socket.handshake.query.osVersion
      },
      sessionId: uuidv4()
    }).catch(error => {
      loggingService.error('Enhanced tracking', `Error logging connection event: ${error.message}`);
    });
    
    // Add user to role-based room
    socket.join(`role:${userRole}`);
    socket.join(`user:${userId}`);
    
    // Enhanced location events for riders
    if (userRole === 'rider') {
      socket.join('riders');
      
      // Enhanced location update with predictions
      socket.on('location:enhanced', async (data) => {
        try {
          // First, process basic location update
          const location = await handleRiderLocationUpdate(socket, data);
          
          // Then add enhanced features
          const enhanced = await enhanceLocationData(socket.user._id, location, data);
          
          // Send enhanced response back
          socket.emit('location:enhanced:ack', {
            success: true,
            timestamp: new Date(),
            enhanced: enhanced
          });
        } catch (error) {
          loggingService.error('Enhanced tracking', `Error handling enhanced location: ${error.message}`);
          socket.emit('tracking:error', { 
            message: 'Failed to process enhanced location',
            error: error.message
          });
        }
      });
      
      // Route matching request
      socket.on('tracking:route:match', async (data) => {
        try {
          const result = await matchRiderToRoute(socket.user._id, data.routeId, data.coordinates);
          socket.emit('tracking:route:match:result', result);
        } catch (error) {
          loggingService.error('Enhanced tracking', `Error matching route: ${error.message}`);
          socket.emit('tracking:error', { 
            message: 'Failed to match route',
            error: error.message
          });
        }
      });

      // Recover offline data
      socket.on('tracking:recover', async (data) => {
        try {
          const offlineData = data.locations || [];
          if (offlineData.length > 0) {
            await processOfflineLocations(socket.user._id, offlineData);
            socket.emit('tracking:recover:ack', { 
              success: true,
              processed: offlineData.length
            });
          }
        } catch (error) {
          loggingService.error('Enhanced tracking', `Error recovering offline data: ${error.message}`);
          socket.emit('tracking:error', { 
            message: 'Failed to process offline data',
            error: error.message
          });
        }
      });
    } 
    // Enhanced features for passengers
    else if (userRole === 'passenger') {
      socket.join('passengers');
      
      // Enhanced tracking request with ETA and geofence
      socket.on('tracking:enhanced:request', async (data) => {
        try {
          const result = await startEnhancedTracking(socket, data);
          socket.emit('tracking:enhanced:started', result);
        } catch (error) {
          loggingService.error('Enhanced tracking', `Error starting enhanced tracking: ${error.message}`);
          socket.emit('tracking:error', { 
            message: 'Failed to start enhanced tracking',
            error: error.message
          });
        }
      });
      
      // Geofence creation
      socket.on('tracking:geofence:create', async (data) => {
        try {
          const result = await createGeofence(socket.user._id, data);
          socket.emit('tracking:geofence:created', result);
        } catch (error) {
          loggingService.error('Enhanced tracking', `Error creating geofence: ${error.message}`);
          socket.emit('tracking:error', { 
            message: 'Failed to create geofence',
            error: error.message
          });
        }
      });
      
      // ETA request for active ride
      socket.on('tracking:eta:request', async (data) => {
        try {
          const eta = await calculateRideETA(data.rideId, data.riderId);
          socket.emit('tracking:eta:update', eta);
        } catch (error) {
          loggingService.error('Enhanced tracking', `Error calculating ETA: ${error.message}`);
          socket.emit('tracking:error', { 
            message: 'Failed to calculate ETA',
            error: error.message
          });
        }
      });
    }
    
    // Handle disconnection
    socket.on('disconnect', () => {
      handleDisconnection(userId, socket.handshake.query);
    });
  });
};

/**
 * Handle rider location update with basic storage
 * @param {Object} socket - Socket instance
 * @param {Object} data - Location data
 * @returns {Promise<Object>} Location object
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
      mock: !!data.mock
    }
  };
  
  // Create or update session ID for tracking
  const sessionId = data.sessionId || uuidv4();
  
  // Update rider location in MongoDB
  const location = await RiderLocation.updateRiderLocation(
    new ObjectId(riderId),
    locationData
  );
  
  // Store in rider history cache for trajectory analysis
  storeLocationInHistory(riderId, locationData);
  
  // Log location event
  try {
    await TrackingEvent.createLocationEvent({
      userId: new ObjectId(riderId),
      userRole: 'rider',
      rideId: location.currentRideId,
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
  } catch (eventError) {
    loggingService.warn('Enhanced tracking', `Non-critical error logging location event: ${eventError.message}`);
  }
  
  // Check for geofence events
  checkGeofenceEvents(riderId, locationData);
  
  return location;
};

/**
 * Enhance location data with predictions and analytics
 * @param {ObjectId} riderId - Rider ID
 * @param {Object} location - Basic location data
 * @param {Object} rawData - Raw location data
 * @returns {Promise<Object>} Enhanced location object
 */
const enhanceLocationData = async (riderId, location, rawData) => {
  riderId = riderId.toString();
  
  // Get ride if available
  const ride = location.currentRideId ? 
    await Ride.findById(location.currentRideId) : null;
  
  // Generate trajectory prediction
  const predictions = generateTrajectoryPrediction(riderId, {
    lat: rawData.lat,
    lng: rawData.lng,
    heading: rawData.heading,
    speed: rawData.speed
  });
  
  // Match to route if on active ride
  let routeMatch = null;
  if (ride && ride.directions && ride.directions.routes && ride.directions.routes.length > 0) {
    routeMatch = await matchRiderToRoute(riderId, ride._id, {
      lat: rawData.lat,
      lng: rawData.lng
    });
    
    // Cache the route match
    if (routeMatch && routeMatch.success) {
      trackingCache.routeMatches.set(riderId, {
        rideId: ride._id.toString(),
        matchPoint: routeMatch.matchPoint,
        progress: routeMatch.progress,
        timestamp: new Date()
      });
    }
  }
  
  // Calculate or update ETA if on active ride
  let eta = null;
  if (ride) {
    eta = await calculateRideETA(ride._id, riderId);
  }
  
  return {
    predictions: predictions,
    routeMatch: routeMatch,
    eta: eta,
    batteryStatus: {
      level: rawData.batteryLevel,
      isLow: rawData.batteryLevel < 0.2
    },
    accuracy: {
      location: rawData.accuracy,
      isHighAccuracy: rawData.accuracy < 20
    },
    enhanced: true
  };
};

/**
 * Process a batch of offline locations
 * @param {ObjectId} riderId - Rider ID 
 * @param {Array} locations - Array of location points
 * @returns {Promise<Object>} Processing result
 */
const processOfflineLocations = async (riderId, locations) => {
  riderId = riderId.toString();
  
  if (!Array.isArray(locations) || locations.length === 0) {
    return { success: false, message: 'No locations to process' };
  }
  
  // Sort by timestamp
  locations.sort((a, b) => {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  
  // Get latest tracking event for this rider
  const lastEvent = await TrackingEvent.findOne({
    userId: new ObjectId(riderId),
    eventType: 'location_update'
  }).sort({ createdAt: -1 });
  
  // Filter out locations that are older than the latest event
  let filteredLocations = locations;
  if (lastEvent) {
    filteredLocations = locations.filter(loc => {
      return new Date(loc.timestamp) > lastEvent.createdAt;
    });
  }
  
  // Process each location
  const processedLocations = [];
  
  for (const location of filteredLocations) {
    try {
      // Convert offline location to compatible format
      const locationData = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        accuracy: location.accuracy ? parseFloat(location.accuracy) : undefined,
        heading: location.heading ? parseFloat(location.heading) : undefined,
        speed: location.speed ? parseFloat(location.speed) : undefined,
        timestamp: new Date(location.timestamp)
      };
      
      // Store in history
      storeLocationInHistory(riderId, locationData);
      
      // Create a tracking event with the offline timestamp
      await TrackingEvent.create({
        eventType: 'location_update',
        userId: new ObjectId(riderId),
        userRole: 'rider',
        location: {
          type: 'Point',
          coordinates: [locationData.lng, locationData.lat]
        },
        locationMetadata: {
          accuracy: locationData.accuracy,
          heading: locationData.heading,
          speed: locationData.speed
        },
        deviceData: {
          deviceId: location.deviceId,
          appVersion: location.appVersion,
          connectionType: 'offline',
        },
        eventData: {
          offlineRecovered: true,
          originalTimestamp: location.timestamp
        },
        createdAt: new Date(location.timestamp),
        updatedAt: new Date()
      });
      
      processedLocations.push(locationData);
    } catch (error) {
      loggingService.error('Enhanced tracking', `Error processing offline location: ${error.message}`);
    }
  }
  
  // Update rider's last known location with the most recent offline location
  if (processedLocations.length > 0) {
    const mostRecent = processedLocations[processedLocations.length - 1];
    
    await RiderLocation.updateRiderLocation(
      new ObjectId(riderId),
      {
        lat: mostRecent.lat,
        lng: mostRecent.lng,
        heading: mostRecent.heading,
        speed: mostRecent.speed,
        accuracy: mostRecent.accuracy,
        metadata: {
          recoveredFromOffline: true
        }
      }
    );
  }
  
  return {
    success: true,
    processed: processedLocations.length,
    total: locations.length,
    filtered: filteredLocations.length
  };
};

/**
 * Generate trajectory prediction based on current movement
 * @param {String} riderId - Rider ID
 * @param {Object} currentLocation - Current location data
 * @returns {Array} Predicted trajectory points
 */
const generateTrajectoryPrediction = (riderId, currentLocation) => {
  if (!currentLocation.heading || !currentLocation.speed || currentLocation.speed < 1) {
    return [];
  }
  
  // Convert speed to m/s if in km/h
  const speedMS = currentLocation.speed > 30 ? currentLocation.speed / 3.6 : currentLocation.speed;
  
  // Cap speed at maximum threshold to prevent unrealistic predictions
  const cappedSpeedMS = Math.min(speedMS, CONFIG.maxSpeedThreshold / 3.6);
  
  // Get movement history for this rider
  const history = getRiderLocationHistory(riderId);
  const predictions = [];
  
  // Current point
  const currentPoint = {
    lat: currentLocation.lat,
    lng: currentLocation.lng
  };
  
  // Calculate heading in radians
  const headingRad = (currentLocation.heading * Math.PI) / 180;
  
  // Generate predictions at intervals
  for (let i = 1; i <= CONFIG.maxPredictionPoints; i++) {
    // Time in seconds for this prediction (1s, 2s, 3s, etc.)
    const timeSeconds = i;
    
    // Distance in meters for this prediction
    const distance = cappedSpeedMS * timeSeconds;
    
    // Calculate destination point using formula:
    // lat2 = asin(sin lat1 * cos d/R + cos lat1 * sin d/R * cos θ)
    // lon2 = lon1 + atan2(sin θ * sin d/R * cos lat1, cos d/R - sin lat1 * sin lat2)
    // where R is earth's radius, d is distance, θ is bearing
    
    // Convert to radians
    const lat1 = currentPoint.lat * Math.PI / 180;
    const lon1 = currentPoint.lng * Math.PI / 180;
    
    // Earth's radius in meters
    const R = 6371000;
    
    // Angular distance
    const d = distance / R;
    
    // Calculate new position
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + 
                  Math.cos(lat1) * Math.sin(d) * Math.cos(headingRad));
    
    const lon2 = lon1 + Math.atan2(Math.sin(headingRad) * Math.sin(d) * Math.cos(lat1),
                               Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    
    // Convert back to degrees
    const predLat = lat2 * 180 / Math.PI;
    const predLng = lon2 * 180 / Math.PI;
    
    predictions.push({
      lat: predLat,
      lng: predLng,
      secondsAhead: timeSeconds
    });
  }
  
  // Cache the predictions
  trackingCache.predictions.set(riderId, {
    points: predictions,
    timestamp: new Date(),
    baseLocation: currentPoint,
    heading: currentLocation.heading,
    speed: currentLocation.speed
  });
  
  return predictions;
};

/**
 * Match rider's position to a route
 * @param {String} riderId - Rider ID
 * @param {String} routeId - Route/Ride ID
 * @param {Object} position - Current position
 * @returns {Promise<Object>} Match result
 */
const matchRiderToRoute = async (riderId, routeId, position) => {
  riderId = riderId.toString();
  routeId = routeId.toString();
  
  try {
    // Fetch ride with route data
    const ride = await Ride.findById(routeId);
    
    if (!ride || !ride.directions || !ride.directions.routes || ride.directions.routes.length === 0) {
      return {
        success: false,
        message: 'No route data available'
      };
    }
    
    // Get the primary route
    const route = ride.directions.routes[0];
    
    // Extract polyline points
    let routePoints = [];
    if (route.overview_polyline && route.overview_polyline.points) {
      // Decode Google Maps polyline
      routePoints = decodePolyline(route.overview_polyline.points);
    } else if (route.legs) {
      // Use route legs if polyline not available
      route.legs.forEach(leg => {
        if (leg.steps) {
          leg.steps.forEach(step => {
            if (step.polyline && step.polyline.points) {
              const stepPoints = decodePolyline(step.polyline.points);
              routePoints = [...routePoints, ...stepPoints];
            }
          });
        }
      });
    }
    
    if (routePoints.length === 0) {
      return {
        success: false,
        message: 'Could not extract route points'
      };
    }
    
    // Find closest point on route
    const closestPoint = findClosestPointOnRoute(position, routePoints);
    
    // Calculate progress percentage
    const progressPct = (closestPoint.segmentIndex / (routePoints.length - 1)) * 100;
    
    // Calculate remaining distance
    let remainingDistance = 0;
    if (closestPoint.segmentIndex < routePoints.length - 1) {
      for (let i = closestPoint.segmentIndex; i < routePoints.length - 1; i++) {
        remainingDistance += calculateDistance(
          routePoints[i].lat, routePoints[i].lng,
          routePoints[i+1].lat, routePoints[i+1].lng
        );
      }
    }
    
    // Calculate remaining time based on current speed
    let remainingTime = null;
    
    // Get rider's current speed from location history
    const history = getRiderLocationHistory(riderId);
    if (history.length > 0) {
      const latestLocation = history[history.length - 1];
      if (latestLocation.speed && latestLocation.speed > 0) {
        // Convert speed to m/s if in km/h
        const speedMS = latestLocation.speed > 30 ? latestLocation.speed / 3.6 : latestLocation.speed;
        
        // Calculate remaining time in seconds
        remainingTime = Math.round(remainingDistance / speedMS);
      }
    }
    
    // Return match data
    return {
      success: true,
      matchPoint: {
        lat: closestPoint.point.lat,
        lng: closestPoint.point.lng
      },
      distanceFromRoute: closestPoint.distance,
      progress: progressPct,
      remainingDistance: remainingDistance,
      remainingTimeSeconds: remainingTime,
      onRoute: closestPoint.distance < 50 // Within 50 meters is considered on route
    };
  } catch (error) {
    loggingService.error('Enhanced tracking', `Error matching rider to route: ${error.message}`);
    return {
      success: false,
      message: `Error matching to route: ${error.message}`
    };
  }
};

/**
 * Calculate ETA for a ride
 * @param {String} rideId - Ride ID
 * @param {String} riderId - Rider ID
 * @returns {Promise<Object>} ETA information
 */
const calculateRideETA = async (rideId, riderId) => {
  rideId = rideId.toString();
  riderId = riderId.toString();
  
  try {
    // Check cache first
    const cacheKey = `${rideId}:${riderId}`;
    const cachedETA = trackingCache.etaCache.get(cacheKey);
    const now = new Date();
    
    // Return cached ETA if recent enough
    if (cachedETA && (now - cachedETA.timestamp) < CONFIG.etaUpdateIntervalMs) {
      return cachedETA;
    }
    
    // Fetch ride details
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return { success: false, message: 'Ride not found' };
    }
    
    // Get rider's current location
    const riderLocation = await RiderLocation.findOne({ riderId: new ObjectId(riderId) });
    if (!riderLocation || !riderLocation.currentLocation) {
      return { success: false, message: 'Rider location not available' };
    }
    
    // Get the route match for this rider
    const routeMatch = trackingCache.routeMatches.get(riderId);
    
    // For accurate ETA calculation we need:
    // 1. Current route match (to know where on the route the rider is)
    // 2. Current speed (to estimate arrival time)
    
    let eta = {};
    
    if (routeMatch && routeMatch.rideId === rideId) {
      // Use our route match data for ETA
      const history = getRiderLocationHistory(riderId);
      
      if (history.length > 0) {
        const latestLocation = history[history.length - 1];
        
        // Calculate destination ETA
        if (ride.estimatedDuration && routeMatch.progress !== undefined) {
          // Calculate remaining duration based on progress
          const remainingDuration = ride.estimatedDuration * (1 - (routeMatch.progress / 100));
          
          // Calculate ETA time
          const etaTime = new Date(now.getTime() + (remainingDuration * 1000));
          
          eta = {
            success: true,
            destination: {
              eta: etaTime,
              remainingSeconds: Math.round(remainingDuration),
              remainingFormatted: formatDuration(remainingDuration)
            },
            progress: routeMatch.progress,
            source: 'route_match',
            accuracy: 'high'
          };
        }
      }
    }
    
    // If we couldn't calculate from route match, use Google Maps API
    if (!eta.success && ride.destination && ride.destination.coordinates) {
      // Get ETA from Maps API
      const origin = {
        lat: riderLocation.currentLocation.coordinates[1],
        lng: riderLocation.currentLocation.coordinates[0]
      };
      
      const destination = {
        lat: ride.destination.coordinates[1],
        lng: ride.destination.coordinates[0]
      };
      
      try {
        const directionsResult = await mapsService.getDirections(origin, destination);
        
        if (directionsResult.success && directionsResult.data.routes && 
            directionsResult.data.routes.length > 0) {
          const route = directionsResult.data.routes[0];
          
          if (route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            
            // Get duration in seconds
            const durationSeconds = leg.duration.value;
            
            // Calculate ETA time
            const etaTime = new Date(now.getTime() + (durationSeconds * 1000));
            
            eta = {
              success: true,
              destination: {
                eta: etaTime,
                remainingSeconds: durationSeconds,
                remainingFormatted: leg.duration.text
              },
              progress: 0, // Unknown from Google API
              source: 'google_maps',
              accuracy: 'medium'
            };
          }
        }
      } catch (mapsError) {
        loggingService.warn('Enhanced tracking', `Error getting directions for ETA: ${mapsError.message}`);
        // Continue with basic ETA calculation
      }
    }
    
    // If we still don't have an ETA, use a basic calculation
    if (!eta.success) {
      // Use ride's estimated duration and distance
      if (ride.estimatedDuration) {
        const rideStartTime = ride.scheduledPickupTime || ride.createdAt;
        const elapsedTime = (now - rideStartTime) / 1000; // in seconds
        
        // Estimate remaining time
        const remainingTime = Math.max(0, ride.estimatedDuration - elapsedTime);
        
        // Calculate ETA time
        const etaTime = new Date(now.getTime() + (remainingTime * 1000));
        
        eta = {
          success: true,
          destination: {
            eta: etaTime,
            remainingSeconds: Math.round(remainingTime),
            remainingFormatted: formatDuration(remainingTime)
          },
          progress: Math.min(100, Math.max(0, (elapsedTime / ride.estimatedDuration) * 100)),
          source: 'estimated',
          accuracy: 'low'
        };
      }
    }
    
    // Add pickup ETA if ride not started yet
    if (eta.success && ride.status === 'accepted' && ride.pickupLocation) {
      // Get ETA to pickup location
      const origin = {
        lat: riderLocation.currentLocation.coordinates[1],
        lng: riderLocation.currentLocation.coordinates[0]
      };
      
      const pickup = {
        lat: ride.pickupLocation.coordinates[1],
        lng: ride.pickupLocation.coordinates[0]
      };
      
      try {
        const directionsResult = await mapsService.getDirections(origin, pickup);
        
        if (directionsResult.success && directionsResult.data.routes && 
            directionsResult.data.routes.length > 0) {
          const route = directionsResult.data.routes[0];
          
          if (route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            
            // Get duration in seconds
            const durationSeconds = leg.duration.value;
            
            // Calculate pickup ETA time
            const pickupEtaTime = new Date(now.getTime() + (durationSeconds * 1000));
            
            eta.pickup = {
              eta: pickupEtaTime,
              remainingSeconds: durationSeconds,
              remainingFormatted: leg.duration.text,
              distance: leg.distance.text
            };
          }
        }
      } catch (mapsError) {
        loggingService.warn('Enhanced tracking', `Error getting pickup ETA: ${mapsError.message}`);
        // Continue without pickup ETA
      }
    }
    
    // Cache the ETA result
    if (eta.success) {
      eta.timestamp = now;
      trackingCache.etaCache.set(cacheKey, eta);
    }
    
    return eta;
  } catch (error) {
    loggingService.error('Enhanced tracking', `Error calculating ETA: ${error.message}`);
    return { success: false, message: `Error calculating ETA: ${error.message}` };
  }
};

/**
 * Start enhanced tracking for a rider
 * @param {Object} socket - Socket instance
 * @param {Object} data - Tracking request data
 * @returns {Promise<Object>} Tracking result
 */
const startEnhancedTracking = async (socket, data) => {
  const passengerId = socket.user._id.toString();
  const { riderId, rideId } = data;
  
  if (!riderId) {
    throw new Error('Rider ID is required');
  }
  
  // Set up tracking configuration
  const trackingConfig = {
    etaInterval: data.etaInterval || CONFIG.etaUpdateIntervalMs,
    enableGeofencing: data.enableGeofencing !== false,
    enablePredictions: data.enablePredictions !== false,
    sessionId: data.sessionId || uuidv4()
  };
  
  // Get rider's last known location
  const riderLocation = await RiderLocation.findOne({ 
    riderId: new ObjectId(riderId) 
  }).populate('riderId', 'firstName lastName phoneNumber profilePicture riderProfile.averageRating');
  
  if (!riderLocation) {
    throw new Error('Rider not found or location not available');
  }
  
  // Join ride room if ride ID is provided
  if (rideId) {
    socket.join(`ride:${rideId}`);
  }
  
  // Set up geofence if enabled
  if (trackingConfig.enableGeofencing) {
    // Create pickup and destination geofences if ride is active
    if (rideId) {
      const ride = await Ride.findById(rideId);
      if (ride) {
        // Create pickup geofence
        if (ride.pickupLocation && ride.pickupLocation.coordinates) {
          await createGeofence(passengerId, {
            name: 'pickup',
            latitude: ride.pickupLocation.coordinates[1],
            longitude: ride.pickupLocation.coordinates[0],
            radius: CONFIG.geofenceRadiusMeters,
            rideId,
            riderId,
            type: 'pickup'
          });
        }
        
        // Create destination geofence
        if (ride.destination && ride.destination.coordinates) {
          await createGeofence(passengerId, {
            name: 'destination',
            latitude: ride.destination.coordinates[1],
            longitude: ride.destination.coordinates[0],
            radius: CONFIG.geofenceRadiusMeters,
            rideId,
            riderId,
            type: 'destination'
          });
        }
      }
    }
  }
  
  // Log tracking start event
  try {
    await TrackingEvent.createTrackingEvent({
      userId: new ObjectId(passengerId),
      userRole: 'passenger',
      relatedUserId: new ObjectId(riderId),
      eventType: 'tracking_started',
      rideId: rideId ? new ObjectId(rideId) : undefined,
      deviceData: {
        deviceId: data.deviceId,
        appVersion: data.appVersion
      },
      eventData: {
        riderStatus: riderLocation.status,
        trackingConfig
      },
      sessionId: trackingConfig.sessionId
    });
  } catch (eventError) {
    loggingService.warn('Enhanced tracking', `Non-critical error logging tracking event: ${eventError.message}`);
  }
  
  // Calculate initial ETA if ride is provided
  let initialEta = null;
  if (rideId) {
    try {
      initialEta = await calculateRideETA(rideId, riderId);
    } catch (etaError) {
      loggingService.warn('Enhanced tracking', `Error calculating initial ETA: ${etaError.message}`);
    }
  }
  
  // Return enhanced tracking information
  return {
    success: true,
    riderId,
    rideId,
    rider: riderLocation.riderId ? {
      name: `${riderLocation.riderId.firstName} ${riderLocation.riderId.lastName}`,
      phone: riderLocation.riderId.phoneNumber,
      photo: riderLocation.riderId.profilePicture,
      rating: riderLocation.riderId.riderProfile?.averageRating || 0
    } : null,
    location: riderLocation.currentLocation ? {
      lat: riderLocation.currentLocation.coordinates[1],
      lng: riderLocation.currentLocation.coordinates[0],
      heading: riderLocation.heading,
      speed: riderLocation.speed,
      formattedAddress: riderLocation.formattedAddress
    } : null,
    status: riderLocation.status,
    trackingConfig,
    eta: initialEta,
    timestamp: new Date(),
    sessionId: trackingConfig.sessionId
  };
};

/**
 * Create a geofence
 * @param {String} userId - User ID
 * @param {Object} data - Geofence data
 * @returns {Promise<Object>} Geofence information
 */
const createGeofence = async (userId, data) => {
  userId = userId.toString();
  
  // Validate geofence data
  if (!data.latitude || !data.longitude || !data.radius) {
    throw new Error('Latitude, longitude, and radius are required for geofence');
  }
  
  // Generate geofence ID
  const geofenceId = data.id || `${userId}:${data.name || 'geofence'}:${uuidv4().substring(0, 8)}`;
  
  // Create geofence object
  const geofence = {
    id: geofenceId,
    userId,
    name: data.name || 'Unnamed Geofence',
    type: data.type || 'custom',
    center: {
      lat: parseFloat(data.latitude),
      lng: parseFloat(data.longitude)
    },
    radius: parseFloat(data.radius),
    rideId: data.rideId,
    riderId: data.riderId,
    metadata: data.metadata || {},
    createdAt: new Date()
  };
  
  // Store geofence in cache
  const userGeofences = trackingCache.activeGeofences.get(userId) || [];
  userGeofences.push(geofence);
  trackingCache.activeGeofences.set(userId, userGeofences);
  
  // If this is a rider geofence, also store it by rider ID
  if (data.riderId) {
    const riderGeofences = trackingCache.activeGeofences.get(data.riderId) || [];
    riderGeofences.push(geofence);
    trackingCache.activeGeofences.set(data.riderId, riderGeofences);
  }
  
  return {
    success: true,
    geofenceId,
    geofence
  };
};

/**
 * Check for geofence events
 * @param {String} riderId - Rider ID
 * @param {Object} location - Location data
 */
const checkGeofenceEvents = (riderId, location) => {
  riderId = riderId.toString();
  
  // Get geofences for this rider
  const geofences = trackingCache.activeGeofences.get(riderId) || [];
  
  if (geofences.length === 0) return;
  
  // Check each geofence
  geofences.forEach(geofence => {
    // Calculate distance to geofence center
    const distance = calculateDistance(
      location.lat, location.lng,
      geofence.center.lat, geofence.center.lng
    );
    
    // Check if rider is inside geofence
    const isInside = distance <= geofence.radius;
    
    // Get previous state
    const prevState = geofence.lastState || { isInside: false, timestamp: null };
    
    // If state changed, emit event
    if (isInside !== prevState.isInside) {
      // Update geofence state
      geofence.lastState = { isInside, timestamp: new Date() };
      
      // Get event type
      const eventType = isInside ? 'geofence:enter' : 'geofence:exit';
      
      // Emit event to all interested parties
      if (geofence.userId && geofence.userId !== riderId) {
        const io = mongoSocketService.getSocketIo();
        io.to(`user:${geofence.userId}`).emit(eventType, {
          geofenceId: geofence.id,
          riderId,
          location: {
            lat: location.lat,
            lng: location.lng
          },
          distance,
          geofence: {
            name: geofence.name,
            type: geofence.type,
            center: geofence.center,
            radius: geofence.radius
          },
          timestamp: new Date()
        });
      }
      
      // If this is a ride-related geofence, emit to ride room
      if (geofence.rideId) {
        const io = mongoSocketService.getSocketIo();
        io.to(`ride:${geofence.rideId}`).emit(eventType, {
          geofenceId: geofence.id,
          riderId,
          rideId: geofence.rideId,
          geofenceType: geofence.type,
          location: {
            lat: location.lat,
            lng: location.lng
          },
          timestamp: new Date()
        });
      }
    }
  });
};

/**
 * Store location in rider history
 * @param {String} riderId - Rider ID
 * @param {Object} location - Location data
 */
const storeLocationInHistory = (riderId, location) => {
  riderId = riderId.toString();
  
  // Get history array for this rider
  if (!trackingCache.riderHistory.has(riderId)) {
    trackingCache.riderHistory.set(riderId, []);
  }
  
  const history = trackingCache.riderHistory.get(riderId);
  
  // Add timestamp if not provided
  if (!location.timestamp) {
    location.timestamp = new Date();
  }
  
  // Add to history array
  history.push(location);
  
  // Trim history if it gets too long
  if (history.length > CONFIG.maxRoutePoints) {
    history.shift();
  }
  
  // Clean up old locations
  const cutoffTime = new Date(Date.now() - CONFIG.historyExpirationMs);
  
  while (history.length > 0 && history[0].timestamp < cutoffTime) {
    history.shift();
  }
};

/**
 * Get rider location history
 * @param {String} riderId - Rider ID
 * @returns {Array} Location history
 */
const getRiderLocationHistory = (riderId) => {
  riderId = riderId.toString();
  
  return trackingCache.riderHistory.get(riderId) || [];
};

/**
 * Handle user disconnection
 * @param {String} userId - User ID
 * @param {Object} data - Additional data
 */
const handleDisconnection = (userId, data = {}) => {
  userId = userId.toString();
  
  // Log disconnection event
  try {
    TrackingEvent.createConnectionEvent({
      userId: new ObjectId(userId),
      userRole: data.role || 'unknown',
      eventType: 'disconnection',
      deviceData: {
        deviceId: data.deviceId,
        appVersion: data.appVersion
      },
      sessionId: data.sessionId || uuidv4()
    }).catch(error => {
      loggingService.warn('Enhanced tracking', `Non-critical error logging disconnection event: ${error.message}`);
    });
  } catch (eventError) {
    loggingService.warn('Enhanced tracking', `Non-critical error creating disconnection event: ${eventError.message}`);
  }
  
  // Cleanup user-specific caches
  trackingCache.predictions.delete(userId);
  trackingCache.routeMatches.delete(userId);
  trackingCache.etaCache.delete(userId);
  
  // Keep rider history for a while
  setTimeout(() => {
    trackingCache.riderHistory.delete(userId);
  }, CONFIG.historyExpirationMs);
};

/**
 * Start background processors for enhanced tracking
 */
const startBackgroundProcessors = () => {
  // Clean cache periodically
  setInterval(() => {
    // Clean up predictions older than prediction interval
    const predictionCutoff = new Date(Date.now() - CONFIG.predictionIntervalMs);
    
    trackingCache.predictions.forEach((prediction, key) => {
      if (prediction.timestamp < predictionCutoff) {
        trackingCache.predictions.delete(key);
      }
    });
    
    // Clean up route matches older than route match interval
    const routeMatchCutoff = new Date(Date.now() - CONFIG.routeMatchIntervalMs);
    
    trackingCache.routeMatches.forEach((match, key) => {
      if (match.timestamp < routeMatchCutoff) {
        trackingCache.routeMatches.delete(key);
      }
    });
    
    // Clean up ETAs older than ETA update interval
    const etaCutoff = new Date(Date.now() - CONFIG.etaUpdateIntervalMs * 2);
    
    trackingCache.etaCache.forEach((eta, key) => {
      if (eta.timestamp < etaCutoff) {
        trackingCache.etaCache.delete(key);
      }
    });
  }, 60000); // Run every minute
};

// Utility Functions

/**
 * Find closest point on a route
 * @param {Object} position - Current position
 * @param {Array} routePoints - Route points
 * @returns {Object} Closest point info
 */
const findClosestPointOnRoute = (position, routePoints) => {
  let closestPoint = null;
  let closestDistance = Infinity;
  let segmentIndex = 0;
  
  // Find closest segment
  for (let i = 0; i < routePoints.length - 1; i++) {
    const pointA = routePoints[i];
    const pointB = routePoints[i + 1];
    
    const closest = closestPointOnSegment(
      position.lat, position.lng,
      pointA.lat, pointA.lng,
      pointB.lat, pointB.lng
    );
    
    const distance = calculateDistance(
      position.lat, position.lng,
      closest.lat, closest.lng
    );
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = closest;
      segmentIndex = i;
    }
  }
  
  return {
    point: closestPoint,
    distance: closestDistance,
    segmentIndex
  };
};

/**
 * Find closest point on a line segment
 * @param {Number} pX - Point X
 * @param {Number} pY - Point Y
 * @param {Number} aX - Line start X
 * @param {Number} aY - Line start Y
 * @param {Number} bX - Line end X
 * @param {Number} bY - Line end Y
 * @returns {Object} Closest point
 */
const closestPointOnSegment = (pX, pY, aX, aY, bX, bY) => {
  const aToP = [pX - aX, pY - aY];
  const aToB = [bX - aX, bY - aY];
  
  const aToBMagSq = aToB[0] * aToB[0] + aToB[1] * aToB[1];
  
  const aToPDotAToB = aToP[0] * aToB[0] + aToP[1] * aToB[1];
  
  const t = Math.max(0, Math.min(1, aToPDotAToB / aToBMagSq));
  
  return {
    lat: aX + t * aToB[0],
    lng: aY + t * aToB[1]
  };
};

/**
 * Calculate distance between two points in meters
 * @param {Number} lat1 - Latitude 1
 * @param {Number} lon1 - Longitude 1
 * @param {Number} lat2 - Latitude 2
 * @param {Number} lon2 - Longitude 2
 * @returns {Number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Decode Google Maps encoded polyline
 * @param {String} encoded - Encoded polyline
 * @returns {Array} Decoded points
 */
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    
    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    
    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }
  
  return points;
};

/**
 * Format duration in seconds to human-readable format
 * @param {Number} seconds - Duration in seconds
 * @returns {String} Formatted duration
 */
const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }
};

export {
  initializeEnhancedTracking,
  handleRiderLocationUpdate,
  enhanceLocationData,
  calculateRideETA,
  processOfflineLocations,
  createGeofence,
  startEnhancedTracking,
  
  // Utility functions
  generateTrajectoryPrediction,
  matchRiderToRoute,
  calculateDistance,
  decodePolyline
};
