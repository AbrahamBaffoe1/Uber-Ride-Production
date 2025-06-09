/**
 * Rider Matching Service
 * Advanced rider matching algorithm to find the best rider for a ride request
 */
const RiderLocation = require('../mongodb/models/RiderLocation');
const User = require('../mongodb/models/User');
const mapsService = require('./maps.service');

/**
 * Calculate proximity score based on distance
 * @param {number} distance Distance in meters
 * @returns {number} Proximity score (0-1)
 */
const calculateProximityScore = (distance) => {
  // For distances less than 500m, score is almost perfect
  if (distance < 500) {
    return 0.9 + (500 - distance) / 5000; // 0.9 - 1.0
  }
  
  // For distances between 500m and 5km, score decreases linearly
  if (distance < 5000) {
    return 0.5 + (5000 - distance) / 9000; // 0.5 - 0.9
  }
  
  // For distances between 5km and 10km, score decreases faster
  if (distance < 10000) {
    return 0.1 + (10000 - distance) / 20000; // 0.1 - 0.5
  }
  
  // For distances beyond 10km, score is very low
  return 0.1 * (20000 - Math.min(distance, 20000)) / 10000; // 0 - 0.1
};

/**
 * Calculate rating score
 * @param {number} rating Rider rating (0-5)
 * @returns {number} Rating score (0-1)
 */
const calculateRatingScore = (rating) => {
  // No rating (new rider) gets a medium score
  if (!rating) return 0.5;
  
  // Convert 0-5 rating to 0-1 score
  return Math.min(1, Math.max(0, rating / 5));
};

/**
 * Calculate activity score
 * @param {Date} lastActive Last activity timestamp
 * @returns {number} Activity score (0-1)
 */
const calculateActivityScore = (lastActive) => {
  if (!lastActive) return 0;
  
  const now = new Date();
  const minutesAgo = (now - new Date(lastActive)) / (1000 * 60);
  
  // If active in the last 2 minutes, perfect score
  if (minutesAgo < 2) return 1;
  
  // If active in the last 10 minutes, high score
  if (minutesAgo < 10) return 0.8;
  
  // If active in the last 30 minutes, medium score
  if (minutesAgo < 30) return 0.5;
  
  // If active in the last hour, low score
  if (minutesAgo < 60) return 0.3;
  
  // Otherwise, very low score
  return 0.1;
};

/**
 * Calculate completion rate score
 * @param {number} completedRides Number of completed rides
 * @param {number} totalRides Total number of rides
 * @returns {number} Completion rate score (0-1)
 */
const calculateCompletionScore = (completedRides, totalRides) => {
  if (!totalRides || totalRides < 10) return 0.5; // Not enough data
  
  const completionRate = completedRides / totalRides;
  
  // Scale to prioritize high completion rates
  return Math.min(1, Math.max(0, (completionRate - 0.7) * 3.333));
};

/**
 * Find the best rider for a ride request
 * @param {Object} pickupLocation Pickup location coordinates
 * @param {Object} destination Destination coordinates
 * @param {Object} options Additional matching options
 * @returns {Promise<Object>} Best matched rider with score details
 */
const findBestRider = async (pickupLocation, destination, options = {}) => {
  try {
    const {
      maxDistance = 10000, // Default 10km
      minRating = 0,       // Default no minimum rating
      vehicleType = null,  // Default any vehicle type
      maxResults = 5,      // Default 5 best matches
      weightProximity = 0.5, // Default weight for proximity score
      weightRating = 0.3,    // Default weight for rating score
      weightActivity = 0.1,  // Default weight for activity score
      weightCompletion = 0.1 // Default weight for completion rate score
    } = options;
    
    // Find riders within the maximum distance
    const nearbyRiders = await RiderLocation.findNearbyRiders(
      pickupLocation,
      maxDistance,
      'online'
    );
    
    if (!nearbyRiders || nearbyRiders.length === 0) {
      return {
        success: false,
        message: 'No riders available in your area',
        data: {
          riders: []
        }
      };
    }
    
    // Calculate ETA and total distance for each rider
    const ridersWithEta = await Promise.all(
      nearbyRiders.map(async (rider) => {
        try {
          // Get distance and duration from rider to pickup
          const riderLocation = {
            lat: rider.currentLocation.coordinates[1],
            lng: rider.currentLocation.coordinates[0]
          };
          
          const distanceToPickup = await mapsService.calculateDistance(
            riderLocation,
            pickupLocation,
            'driving'
          );
          
          // Get distance and duration from pickup to destination
          const rideDistance = await mapsService.calculateDistance(
            pickupLocation,
            destination,
            'driving'
          );
          
          // If vehicle type is specified, filter out riders with different vehicle types
          if (vehicleType && 
              rider.riderId.riderProfile && 
              rider.riderId.riderProfile.vehicleType !== vehicleType) {
            return null;
          }
          
          // If minimum rating is specified, filter out riders with lower ratings
          const riderRating = rider.riderId.riderProfile?.averageRating || 0;
          if (minRating > 0 && riderRating < minRating) {
            return null;
          }
          
          // Get completion rate from rider profile
          const completedRides = rider.riderId.riderProfile?.totalRides || 0;
          const totalRides = completedRides; // In a real app, track total ride requests as well
          
          // Calculate scores
          const distanceMeters = distanceToPickup.success ? 
            distanceToPickup.data.distance.value : 
            calculateDistance(riderLocation, pickupLocation);
            
          const proximityScore = calculateProximityScore(distanceMeters);
          const ratingScore = calculateRatingScore(riderRating);
          const activityScore = calculateActivityScore(rider.lastUpdated);
          const completionScore = calculateCompletionScore(completedRides, totalRides);
          
          // Calculate weighted score
          const totalScore = 
            (proximityScore * weightProximity) +
            (ratingScore * weightRating) +
            (activityScore * weightActivity) +
            (completionScore * weightCompletion);
          
          return {
            rider: rider.riderId,
            location: riderLocation,
            distance: distanceMeters,
            eta: distanceToPickup.success ? distanceToPickup.data.duration.text : 'Unknown',
            etaSeconds: distanceToPickup.success ? distanceToPickup.data.duration.value : null,
            rating: riderRating,
            lastActive: rider.lastUpdated,
            status: rider.status,
            scores: {
              proximity: proximityScore,
              rating: ratingScore,
              activity: activityScore,
              completion: completionScore,
              total: totalScore
            },
            rideDetails: {
              distance: rideDistance.success ? rideDistance.data.distance.text : 'Unknown',
              duration: rideDistance.success ? rideDistance.data.duration.text : 'Unknown',
              distanceMeters: rideDistance.success ? rideDistance.data.distance.value : null,
              durationSeconds: rideDistance.success ? rideDistance.data.duration.value : null
            }
          };
        } catch (error) {
          console.error(`Error calculating scores for rider ${rider.riderId._id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null entries and sort by total score
    const validRiders = ridersWithEta
      .filter(r => r !== null)
      .sort((a, b) => b.scores.total - a.scores.total);
    
    // Take the top N results
    const topRiders = validRiders.slice(0, maxResults);
    
    return {
      success: true,
      data: {
        count: topRiders.length,
        riders: topRiders,
        pickupLocation,
        destination
      }
    };
  } catch (error) {
    console.error('Error finding best rider:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to match rider',
      error
    };
  }
};

/**
 * Fallback method to calculate distance without using Maps API
 * @param {Object} point1 First point coordinates
 * @param {Object} point2 Second point coordinates
 * @returns {number} Approximate distance in meters
 */
const calculateDistance = (point1, point2) => {
  const R = 6371e3; // Earth radius in meters
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
  const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distance in meters
};

/**
 * Get optimal route between multiple points considering traffic
 * @param {Array} points Array of location points to visit
 * @param {Object} options Routing options
 * @returns {Promise<Object>} Optimized route
 */
const getOptimalRoute = async (points, options = {}) => {
  try {
    if (!points || points.length < 2) {
      return {
        success: false,
        message: 'At least two points are required for routing'
      };
    }
    
    const {
      mode = 'driving',     // Travel mode
      departureTime = null, // Departure time for traffic consideration
      avoidTolls = false,   // Avoid toll roads
      avoidHighways = false // Avoid highways
    } = options;
    
    // For 2 points, just get directions
    if (points.length === 2) {
      const directions = await mapsService.getDirections(
        points[0],
        points[1],
        mode,
        null
      );
      
      return directions;
    }
    
    // For more than 2 points, use waypoints optimization
    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, points.length - 1);
    
    // Build waypoints string
    let waypointsStr = 'optimize:true|';
    waypointsStr += waypoints.map(point => {
      if (typeof point === 'string') {
        return point;
      }
      return `${point.lat},${point.lng}`;
    }).join('|');
    
    // Get directions with optimized waypoints
    const directions = await mapsService.getDirections(
      origin,
      destination,
      mode,
      waypointsStr
    );
    
    return directions;
  } catch (error) {
    console.error('Error optimizing route:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to optimize route',
      error
    };
  }
};

/**
 * Analyze demand patterns for heatmap generation
 * @param {Object} bounds Geographic bounds for the analysis
 * @param {Date} startTime Start time for analysis
 * @param {Date} endTime End time for analysis
 * @returns {Promise<Object>} Demand heatmap data
 */
const analyzeDemandPatterns = async (bounds, startTime = null, endTime = null) => {
  try {
    // Default to last 24 hours if not specified
    const start = startTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endTime || new Date();
    
    // This would typically query a rides collection to get all rides within the time range
    // For now, we'll return some sample data for demonstration
    
    // In a real implementation, you would:
    // 1. Query ride pickup locations within the bounds and time range
    // 2. Group them by geographical cells (e.g., 0.01 degree grid cells)
    // 3. Count rides per cell to determine demand intensity
    
    // TODO: Replace with actual database query when ride history collection is implemented
    
    // Sample heatmap data - in a real app, this would come from the database
    const heatmapPoints = [
      { lat: 6.5244, lng: 3.3792, weight: 10 }, // Lagos Center
      { lat: 6.5355, lng: 3.3087, weight: 8 },  // Ikeja
      { lat: 6.4698, lng: 3.5852, weight: 7 },  // Victoria Island
      { lat: 6.6194, lng: 3.3613, weight: 6 },  // Agege
      { lat: 6.4281, lng: 3.4219, weight: 9 }   // Lekki
    ];
    
    return {
      success: true,
      data: {
        points: heatmapPoints,
        timeRange: {
          start,
          end
        },
        bounds
      }
    };
  } catch (error) {
    console.error('Error analyzing demand patterns:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to analyze demand patterns',
      error
    };
  }
};

module.exports = {
  findBestRider,
  getOptimalRoute,
  analyzeDemandPatterns
};
