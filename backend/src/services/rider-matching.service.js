/**
 * Rider Matching Service
 * Provides intelligent rider matching and availability tracking
 */
import mongoose from 'mongoose';
import { calculateETA } from './pricing-engine.service.js';

// Try to load models dynamically to avoid circular dependencies
let RiderLocation, User, Ride;

// Function to import models
const importModels = async () => {
  try {
    const RiderLocationModule = await import('../mongodb/models/RiderLocation.js');
    const UserModule = await import('../mongodb/models/User.js');
    const RideModule = await import('../mongodb/models/Ride.js');
    
    RiderLocation = RiderLocationModule.default;
    User = UserModule.default;
    Ride = RideModule.default;
  } catch (error) {
    console.error('Error importing models in rider matching service:', error);
  }
};

// Rider matching configurations
const MATCHING_CONFIG = {
  // Maximum distance in meters to consider riders
  maxDistance: 5000,
  
  // Maximum number of riders to match for a request
  maxRiders: 10,
  
  // Weights for different matching factors (0-1)
  weights: {
    distance: 0.5,      // Weight for proximity
    rating: 0.2,        // Weight for rider rating
    acceptance: 0.15,   // Weight for rider acceptance rate
    completion: 0.15    // Weight for ride completion rate
  },
  
  // Timeout for rider to accept a ride (seconds)
  acceptanceTimeout: 30,
  
  // Minimum rider rating to be eligible
  minimumRating: 3.0,
  
  // How long to cache rider density data (seconds)
  densityCacheTTL: 60,
};

// Cache for rider density data
const riderDensityCache = new Map();

/**
 * Find nearby riders with intelligent ranking
 * @param {Object} params Search parameters
 * @param {Object} params.location Pickup location { lat, lng }
 * @param {number} params.maxDistance Maximum distance in meters (optional)
 * @param {string} params.vehicleType Vehicle type preference (optional)
 * @param {number} params.minRating Minimum rider rating (optional)
 * @returns {Promise<Object>} Matched riders and availability info
 */
const findNearbyRiders = async (params) => {
  try {
    await importModels();
    
    const {
      location,
      maxDistance = MATCHING_CONFIG.maxDistance,
      vehicleType = null,
      minRating = MATCHING_CONFIG.minimumRating
    } = params;
    
    // Validate inputs
    if (!location || !location.lat || !location.lng) {
      throw new Error('Valid location coordinates are required');
    }
    
    // Convert to MongoDB Point coordinates
    const coordinates = [location.lng, location.lat];
    
    // Build query for nearby riders
    const query = {
      status: 'online',
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates
          },
          $maxDistance: maxDistance
        }
      }
    };
    
    // Add vehicle type filter if specified
    if (vehicleType) {
      query['riderId.riderProfile.vehicleType'] = vehicleType;
    }
    
    // Find nearby riders
    let nearbyRiders = await RiderLocation.find(query)
      .populate('riderId', 'firstName lastName phoneNumber profilePicture riderProfile');
    
    // Filter out riders with low ratings
    nearbyRiders = nearbyRiders.filter(rider => {
      const ratingValue = rider.riderId?.riderProfile?.averageRating || 5;
      return ratingValue >= minRating;
    });
    
    // Filter out riders who are already on a ride
    const riderIds = nearbyRiders.map(rider => rider.riderId._id);
    const activeRides = await Ride.find({
      riderId: { $in: riderIds },
      status: { $in: ['accepted', 'arrived_pickup', 'in_progress'] }
    });
    
    const busyRiderIds = activeRides.map(ride => ride.riderId.toString());
    nearbyRiders = nearbyRiders.filter(rider => 
      !busyRiderIds.includes(rider.riderId._id.toString())
    );
    
    // Calculate scores and sort riders
    const scoredRiders = await scoreAndRankRiders(nearbyRiders, location);
    
    // Limit to max number of riders
    const limitedRiders = scoredRiders.slice(0, MATCHING_CONFIG.maxRiders);
    
    // Format response
    const formattedRiders = limitedRiders.map(rider => ({
      riderId: rider.riderId._id,
      name: `${rider.riderId.firstName} ${rider.riderId.lastName}`,
      phone: rider.riderId.phoneNumber,
      photo: rider.riderId.profilePicture,
      vehicle: {
        type: rider.riderId.riderProfile?.vehicleType || 'motorcycle',
        model: rider.riderId.riderProfile?.vehicleModel || 'Standard',
        plate: rider.riderId.riderProfile?.licensePlate || 'Unknown',
      },
      rating: rider.riderId.riderProfile?.averageRating || 5,
      location: {
        latitude: rider.currentLocation.coordinates[1],
        longitude: rider.currentLocation.coordinates[0],
      },
      distance: rider.distance,
      eta: rider.eta,
      score: rider.score
    }));
    
    // Calculate availability statistics
    const availabilityStats = {
      totalRiders: nearbyRiders.length,
      availableRiders: formattedRiders.length,
      averageETA: formattedRiders.length > 0 
        ? Math.ceil(formattedRiders.reduce((sum, r) => sum + r.eta, 0) / formattedRiders.length)
        : null,
      nearestRiderDistance: formattedRiders.length > 0
        ? formattedRiders[0].distance
        : null,
      nearestRiderETA: formattedRiders.length > 0
        ? formattedRiders[0].eta
        : null,
      hasRidersAvailable: formattedRiders.length > 0
    };
    
    // Cache density data
    cacheRiderDensity(location, availabilityStats);
    
    return {
      success: true,
      riders: formattedRiders,
      availability: availabilityStats
    };
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to find nearby riders',
      error: error.toString(),
      riders: [],
      availability: {
        totalRiders: 0,
        availableRiders: 0,
        hasRidersAvailable: false
      }
    };
  }
};

/**
 * Score and rank riders based on multiple factors
 * @param {Array} riders Array of rider documents
 * @param {Object} location Pickup location
 * @returns {Promise<Array>} Scored and ranked riders
 */
const scoreAndRankRiders = async (riders, location) => {
  try {
    const scoredRiders = [];
    
    for (const rider of riders) {
      try {
        // Calculate distance score (closer is better)
        const riderLocation = {
          lat: rider.currentLocation.coordinates[1],
          lng: rider.currentLocation.coordinates[0]
        };
        
        // Calculate straight-line distance in meters
        const distance = calculateHaversineDistance(
          location.lat,
          location.lng,
          riderLocation.lat,
          riderLocation.lng
        ) * 1000;
        
        // Normalize distance score (0-1, closer to 1 is better)
        const distanceScore = Math.max(0, 1 - (distance / MATCHING_CONFIG.maxDistance));
        
        // Get rider ratings and calculate rating score
        const rating = rider.riderId.riderProfile?.averageRating || 5;
        const ratingScore = (rating - MATCHING_CONFIG.minimumRating) / (5 - MATCHING_CONFIG.minimumRating);
        
        // Get rider acceptance rate
        const acceptanceRate = rider.riderId.riderProfile?.acceptanceRate || 0.9;
        const acceptanceScore = acceptanceRate;
        
        // Get rider completion rate
        const completionRate = rider.riderId.riderProfile?.completionRate || 0.95;
        const completionScore = completionRate;
        
        // Calculate combined score
        const score = (
          distanceScore * MATCHING_CONFIG.weights.distance +
          ratingScore * MATCHING_CONFIG.weights.rating +
          acceptanceScore * MATCHING_CONFIG.weights.acceptance +
          completionScore * MATCHING_CONFIG.weights.completion
        );
        
        // Calculate ETA
        const eta = await calculateRiderETA(riderLocation, location);
        
        scoredRiders.push({
          ...rider.toObject(),
          distance,
          eta,
          score,
          factors: {
            distanceScore,
            ratingScore,
            acceptanceScore,
            completionScore
          }
        });
      } catch (error) {
        console.error('Error scoring rider:', error);
        // Skip this rider
      }
    }
    
    // Sort by score (highest first)
    return scoredRiders.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error scoring riders:', error);
    return riders; // Return unsorted riders on error
  }
};

/**
 * Calculate Haversine distance between two points
 * @param {number} lat1 Starting latitude
 * @param {number} lng1 Starting longitude
 * @param {number} lat2 Ending latitude
 * @param {number} lng2 Ending longitude
 * @returns {number} Distance in kilometers
 */
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Helper function to convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate ETA for rider to reach passenger
 * @param {Object} riderLocation Rider's location
 * @param {Object} passengerLocation Passenger's location
 * @returns {Promise<number>} ETA in minutes
 */
const calculateRiderETA = async (riderLocation, passengerLocation) => {
  try {
    return await calculateETA(riderLocation, passengerLocation);
  } catch (error) {
    console.error('Error calculating rider ETA:', error);
    
    // Fallback to basic calculation
    const distance = calculateHaversineDistance(
      riderLocation.lat,
      riderLocation.lng,
      passengerLocation.lat,
      passengerLocation.lng
    );
    
    // Assume average speed of 20 km/h
    const etaMinutes = (distance / 20) * 60;
    return Math.ceil(etaMinutes);
  }
};

/**
 * Cache rider density data for a location
 * @param {Object} location Location coordinates
 * @param {Object} stats Availability statistics
 */
const cacheRiderDensity = (location, stats) => {
  try {
    // Create a grid cell key (rounded to 3 decimal places, ~100m precision)
    const lat = Math.round(location.lat * 1000) / 1000;
    const lng = Math.round(location.lng * 1000) / 1000;
    const key = `${lat},${lng}`;
    
    // Cache the data
    riderDensityCache.set(key, {
      stats,
      timestamp: Date.now(),
      location: { lat, lng }
    });
    
    // Cleanup old entries
    const cutoff = Date.now() - (MATCHING_CONFIG.densityCacheTTL * 1000);
    for (const [k, v] of riderDensityCache.entries()) {
      if (v.timestamp < cutoff) {
        riderDensityCache.delete(k);
      }
    }
  } catch (error) {
    console.error('Error caching rider density:', error);
  }
};

/**
 * Get rider density map for a region
 * @param {Object} params Region parameters
 * @param {Object} params.center Center coordinates { lat, lng }
 * @param {number} params.radius Radius in kilometers
 * @returns {Promise<Object>} Rider density map
 */
const getRiderDensityMap = async (params) => {
  try {
    await importModels();
    
    const { center, radius = 5 } = params;
    
    // Validate inputs
    if (!center || !center.lat || !center.lng) {
      throw new Error('Valid center coordinates are required');
    }
    
    // Get cached density data
    const cachedMap = [];
    for (const [key, value] of riderDensityCache.entries()) {
      // Calculate distance from center to cached point
      const distance = calculateHaversineDistance(
        center.lat,
        center.lng,
        value.location.lat,
        value.location.lng
      );
      
      // Include if within radius
      if (distance <= radius) {
        cachedMap.push({
          location: value.location,
          stats: value.stats,
          distance
        });
      }
    }
    
    // If we have enough cached data, return it
    if (cachedMap.length >= 5) {
      return {
        success: true,
        densityMap: cachedMap,
        fromCache: true
      };
    }
    
    // Otherwise fetch real-time data
    const maxDistanceMeters = radius * 1000;
    
    // Find riders in the area grouped by grid cells
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [center.lng, center.lat]
          },
          distanceField: 'distance',
          maxDistance: maxDistanceMeters,
          query: { status: 'online' },
          spherical: true
        }
      },
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ['$currentLocation.coordinates', 1] }, 3] },
            lng: { $round: [{ $arrayElemAt: ['$currentLocation.coordinates', 0] }, 3] }
          },
          count: { $sum: 1 },
          avgDistance: { $avg: '$distance' }
        }
      },
      {
        $project: {
          _id: 0,
          location: { lat: '$_id.lat', lng: '$_id.lng' },
          riderCount: '$count',
          distance: '$avgDistance'
        }
      },
      { $sort: { distance: 1 } }
    ];
    
    const densityResults = await RiderLocation.aggregate(pipeline);
    
    // Find active riders in the area to estimate availability
    const activeRides = await Ride.countDocuments({
      'pickupLocation.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [center.lng, center.lat]
          },
          $maxDistance: maxDistanceMeters
        }
      },
      status: { $in: ['requested', 'accepted', 'arrived_pickup', 'in_progress'] }
    });
    
    // Format the response
    const densityMap = densityResults.map(point => {
      const riderCount = point.riderCount;
      const estimatedAvailable = Math.max(0, riderCount - Math.floor(activeRides / densityResults.length));
      
      return {
        location: point.location,
        stats: {
          totalRiders: riderCount,
          availableRiders: estimatedAvailable,
          hasRidersAvailable: estimatedAvailable > 0
        },
        distance: point.distance / 1000 // Convert to km
      };
    });
    
    // Cache the results
    densityMap.forEach(point => {
      cacheRiderDensity(point.location, point.stats);
    });
    
    return {
      success: true,
      densityMap,
      fromCache: false
    };
  } catch (error) {
    console.error('Error getting rider density map:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to get rider density map',
      error: error.toString(),
      densityMap: []
    };
  }
};

/**
 * Check if riders are available in a location
 * @param {Object} location Location coordinates { lat, lng }
 * @returns {Promise<Object>} Availability result
 */
const checkRidersAvailable = async (location) => {
  try {
    await importModels();
    
    // Check cache first
    const lat = Math.round(location.lat * 1000) / 1000;
    const lng = Math.round(location.lng * 1000) / 1000;
    const key = `${lat},${lng}`;
    
    if (riderDensityCache.has(key)) {
      const cached = riderDensityCache.get(key);
      const timestamp = cached.timestamp;
      
      // If cache is fresh (less than 60 seconds old)
      if (Date.now() - timestamp < MATCHING_CONFIG.densityCacheTTL * 1000) {
        return {
          success: true,
          availability: cached.stats,
          fromCache: true
        };
      }
    }
    
    // If not in cache or cache expired, do a quick count query
    const count = await RiderLocation.countDocuments({
      status: 'online',
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          $maxDistance: MATCHING_CONFIG.maxDistance
        }
      }
    });
    
    const result = {
      totalRiders: count,
      availableRiders: count, // Simplified, assumes all are available
      hasRidersAvailable: count > 0,
      nearestRiderDistance: null, // Would need more queries to determine
      nearestRiderETA: null // Would need more queries to determine
    };
    
    // Cache the result
    cacheRiderDensity(location, result);
    
    return {
      success: true,
      availability: result,
      fromCache: false
    };
  } catch (error) {
    console.error('Error checking rider availability:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to check rider availability',
      error: error.toString(),
      availability: {
        totalRiders: 0,
        availableRiders: 0,
        hasRidersAvailable: false
      }
    };
  }
};

/**
 * Update rider's current ride status
 * @param {string} riderId Rider ID
 * @param {string} rideId Current ride ID (null if not on a ride)
 * @returns {Promise<Object>} Update result
 */
const updateRiderRideStatus = async (riderId, rideId) => {
  try {
    await importModels();
    
    const update = rideId 
      ? { currentRideId: mongoose.Types.ObjectId(rideId), status: 'busy' }
      : { currentRideId: null, status: 'online' };
    
    await RiderLocation.findOneAndUpdate(
      { riderId: mongoose.Types.ObjectId(riderId) },
      { $set: update }
    );
    
    return {
      success: true,
      riderId,
      rideId,
      status: update.status
    };
  } catch (error) {
    console.error('Error updating rider ride status:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to update rider status',
      error: error.toString()
    };
  }
};

/**
 * Update matching configuration
 * @param {Object} config New configuration
 * @returns {Object} Update result
 */
const updateMatchingConfig = (config) => {
  try {
    if (config.maxDistance !== undefined) {
      MATCHING_CONFIG.maxDistance = config.maxDistance;
    }
    
    if (config.maxRiders !== undefined) {
      MATCHING_CONFIG.maxRiders = config.maxRiders;
    }
    
    if (config.weights) {
      Object.assign(MATCHING_CONFIG.weights, config.weights);
    }
    
    if (config.acceptanceTimeout !== undefined) {
      MATCHING_CONFIG.acceptanceTimeout = config.acceptanceTimeout;
    }
    
    if (config.minimumRating !== undefined) {
      MATCHING_CONFIG.minimumRating = config.minimumRating;
    }
    
    if (config.densityCacheTTL !== undefined) {
      MATCHING_CONFIG.densityCacheTTL = config.densityCacheTTL;
    }
    
    return {
      success: true,
      message: 'Matching configuration updated successfully',
      config: MATCHING_CONFIG
    };
  } catch (error) {
    console.error('Error updating matching configuration:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to update matching configuration',
      error: error.toString()
    };
  }
};

/**
 * Get current matching configuration
 * @returns {Object} Current matching configuration
 */
const getMatchingConfig = () => {
  return {
    success: true,
    config: MATCHING_CONFIG
  };
};

export {
  findNearbyRiders,
  getRiderDensityMap,
  checkRidersAvailable,
  updateRiderRideStatus,
  updateMatchingConfig,
  getMatchingConfig
};
