/**
 * Matching Routes
 * API endpoints for rider matching and route optimization
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const riderMatchingService = require('../../services/rider-matching.service');
const mapsService = require('../../services/maps.service');
const { isValidObjectId } = require('mongoose');

const router = express.Router();

/**
 * @route POST /api/v1/mongo/matching/find-riders
 * @desc Find the best riders for a ride request
 * @access Private
 */
router.post('/find-riders', authenticate, async (req, res) => {
  try {
    const {
      pickupLocation,
      destination,
      maxDistance,
      minRating,
      vehicleType,
      maxResults,
      weights
    } = req.body;
    
    // Validate required fields
    if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid pickup location coordinates are required'
      });
    }
    
    if (!destination || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid destination coordinates are required'
      });
    }
    
    // Prepare matching options
    const options = {
      maxDistance: maxDistance || 10000,
      minRating: minRating || 0,
      vehicleType,
      maxResults: maxResults || 5
    };
    
    // Add custom weight scores if provided
    if (weights) {
      options.weightProximity = weights.proximity || 0.5;
      options.weightRating = weights.rating || 0.3;
      options.weightActivity = weights.activity || 0.1;
      options.weightCompletion = weights.completion || 0.1;
    }
    
    // Find the best riders
    const result = await riderMatchingService.findBestRider(
      pickupLocation,
      destination,
      options
    );
    
    // Return the results
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error('Error finding best riders:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to find riders',
      error: error.stack
    });
  }
});

/**
 * @route POST /api/v1/mongo/matching/optimize-route
 * @desc Get optimized route between multiple points
 * @access Private
 */
router.post('/optimize-route', authenticate, async (req, res) => {
  try {
    const {
      points,
      mode,
      departureTime,
      avoidTolls,
      avoidHighways
    } = req.body;
    
    // Validate required fields
    if (!points || !Array.isArray(points) || points.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least two valid points are required'
      });
    }
    
    // Prepare routing options
    const options = {
      mode: mode || 'driving',
      departureTime,
      avoidTolls,
      avoidHighways
    };
    
    // Get optimized route
    const result = await riderMatchingService.getOptimalRoute(points, options);
    
    // Return the results
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error optimizing route:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to optimize route',
      error: error.stack
    });
  }
});

/**
 * @route GET /api/v1/mongo/matching/demand-heatmap
 * @desc Get demand heatmap data for analytics
 * @access Private (admin only)
 */
router.get('/demand-heatmap', authenticate, async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can access demand heatmap data'
      });
    }
    
    const {
      southwest_lat,
      southwest_lng,
      northeast_lat,
      northeast_lng,
      startTime,
      endTime
    } = req.query;
    
    // Validate bounds
    if (!southwest_lat || !southwest_lng || !northeast_lat || !northeast_lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid map bounds are required'
      });
    }
    
    // Prepare bounds object
    const bounds = {
      southwest: {
        lat: parseFloat(southwest_lat),
        lng: parseFloat(southwest_lng)
      },
      northeast: {
        lat: parseFloat(northeast_lat),
        lng: parseFloat(northeast_lng)
      }
    };
    
    // Parse dates if provided
    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;
    
    // Get demand heatmap data
    const result = await riderMatchingService.analyzeDemandPatterns(bounds, start, end);
    
    // Return the results
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error getting demand heatmap:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get demand heatmap data',
      error: error.stack
    });
  }
});

/**
 * @route POST /api/v1/mongo/matching/eta-matrix
 * @desc Calculate ETA matrix between multiple points
 * @access Private
 */
router.post('/eta-matrix', authenticate, async (req, res) => {
  try {
    const { origins, destinations, mode } = req.body;
    
    // Validate required fields
    if (!origins || !Array.isArray(origins) || origins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid origin points are required'
      });
    }
    
    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid destination points are required'
      });
    }
    
    // Calculate ETAs between each origin and destination
    const results = [];
    
    for (const origin of origins) {
      const originResults = [];
      
      for (const destination of destinations) {
        // Skip if origin and destination are the same
        if (origin.lat === destination.lat && origin.lng === destination.lng) {
          originResults.push({
            origin,
            destination,
            distance: { text: '0 km', value: 0 },
            duration: { text: '0 mins', value: 0 }
          });
          continue;
        }
        
        // Calculate distance and duration
        const result = await mapsService.calculateDistance(
          origin,
          destination,
          mode || 'driving'
        );
        
        if (result.success) {
          originResults.push({
            origin,
            destination,
            distance: result.data.distance,
            duration: result.data.duration
          });
        } else {
          originResults.push({
            origin,
            destination,
            error: result.message || 'Failed to calculate distance'
          });
        }
      }
      
      results.push(originResults);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        mode: mode || 'driving',
        matrix: results
      }
    });
  } catch (error) {
    console.error('Error calculating ETA matrix:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate ETA matrix',
      error: error.stack
    });
  }
});

/**
 * @route POST /api/v1/mongo/matching/fare-estimate
 * @desc Calculate fare estimate for a ride
 * @access Private
 */
router.post('/fare-estimate', authenticate, async (req, res) => {
  try {
    const {
      pickup,
      destination,
      vehicleType = 'motorcycle',
      timeOfDay,
      promoCode
    } = req.body;
    
    // Validate required fields
    if (!pickup || !pickup.lat || !pickup.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid pickup location is required'
      });
    }
    
    if (!destination || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        message: 'Valid destination is required'
      });
    }
    
    // Calculate distance and duration
    const routeResult = await mapsService.calculateDistance(
      pickup,
      destination,
      'driving'
    );
    
    if (!routeResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to calculate route',
        error: routeResult.message
      });
    }
    
    // Extract distance and duration
    const distanceMeters = routeResult.data.distance.value;
    const durationSeconds = routeResult.data.duration.value;
    
    // Calculate base fare
    let baseFare = 0;
    let perKmRate = 0;
    let perMinRate = 0;
    
    switch (vehicleType) {
      case 'motorcycle':
        baseFare = 150; // NGN
        perKmRate = 50; // NGN per km
        perMinRate = 5;  // NGN per minute
        break;
      case 'car':
        baseFare = 300; // NGN
        perKmRate = 100; // NGN per km
        perMinRate = 10;  // NGN per minute
        break;
      default:
        baseFare = 150; // NGN
        perKmRate = 50; // NGN per km
        perMinRate = 5;  // NGN per minute
    }
    
    // Calculate distance and time components
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;
    
    const distanceCost = distanceKm * perKmRate;
    const timeCost = durationMinutes * perMinRate;
    
    // Apply time of day surge factor if applicable
    let surgeFactor = 1.0;
    
    if (timeOfDay) {
      const hour = new Date(timeOfDay).getHours();
      
      // Apply surge during peak hours
      if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
        surgeFactor = 1.2; // 20% surge during peak hours
      } else if (hour >= 22 || hour <= 5) {
        surgeFactor = 1.3; // 30% surge during late night
      }
    }
    
    // Calculate subtotal
    let subtotal = (baseFare + distanceCost + timeCost) * surgeFactor;
    
    // Apply promo code discount if applicable
    let discount = 0;
    let promoApplied = false;
    
    if (promoCode) {
      // In a real app, you would validate the promo code against a database
      if (promoCode === 'NEWUSER') {
        discount = Math.min(subtotal * 0.15, 500); // 15% off, max 500 NGN
        promoApplied = true;
      } else if (promoCode === 'WEEKEND') {
        discount = Math.min(subtotal * 0.1, 300); // 10% off, max 300 NGN
        promoApplied = true;
      }
    }
    
    // Calculate final fare
    const platformFee = 50; // NGN
    const totalFare = Math.ceil(subtotal - discount + platformFee);
    
    return res.status(200).json({
      success: true,
      data: {
        pickup,
        destination,
        distance: routeResult.data.distance,
        duration: routeResult.data.duration,
        fare: {
          currency: 'NGN',
          baseFare,
          distanceCost: Math.round(distanceCost),
          timeCost: Math.round(timeCost),
          surgeFactor,
          subtotal: Math.round(subtotal),
          discount: Math.round(discount),
          promoApplied,
          platformFee,
          total: totalFare
        },
        vehicleType
      }
    });
  } catch (error) {
    console.error('Error calculating fare estimate:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate fare estimate',
      error: error.stack
    });
  }
});

module.exports = router;
