/**
 * Ride Pricing and Availability API Routes
 * Provides REST endpoints for fare calculation and rider availability
 */
import express from 'express';
import mongoose from 'mongoose';
import * as pricingEngine from '../../services/pricing-engine.service.js';
import * as riderMatching from '../../services/rider-matching.service.js';
import * as realTimeAvailability from '../../services/real-time-availability.service.js';
import { authenticate as authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/ride-pricing/estimate:
 *   post:
 *     summary: Estimate fare for a ride
 *     description: Calculate estimated fare between origin and destination
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               vehicleType:
 *                 type: string
 *                 enum: [motorcycle, car, tricycle]
 *                 default: motorcycle
 *               distanceType:
 *                 type: string
 *                 enum: [straightLine, roadDistance, trafficAware]
 *                 default: roadDistance
 *     responses:
 *       200:
 *         description: Fare estimation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 fare:
 *                   type: object
 *                 distance:
 *                   type: object
 *                 duration:
 *                   type: object
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/estimate', authenticateToken, async (req, res) => {
  try {
    const { origin, destination, vehicleType = 'motorcycle', distanceType = 'roadDistance' } = req.body;
    
    // Validate inputs
    if (!origin || !origin.latitude || !origin.longitude) {
      return res.status(400).json({ success: false, message: 'Valid origin coordinates are required' });
    }
    
    if (!destination || !destination.latitude || !destination.longitude) {
      return res.status(400).json({ success: false, message: 'Valid destination coordinates are required' });
    }
    
    // Format origin and destination
    const originCoords = {
      lat: origin.latitude,
      lng: origin.longitude
    };
    
    const destinationCoords = {
      lat: destination.latitude,
      lng: destination.longitude
    };
    
    // Get fare estimate
    const fareEstimate = await pricingEngine.calculateFare({
      origin: originCoords,
      destination: destinationCoords,
      vehicleType,
      distanceType
    });
    
    // Check for availability
    const availability = await riderMatching.checkRidersAvailable(originCoords);
    
    // Combine response
    const response = {
      ...fareEstimate,
      riderAvailability: availability.success ? availability.availability : null
    };
    
    // Track passenger location for real-time availability updates
    if (req.user && req.user._id) {
      await realTimeAvailability.trackPassengerLocation(req.user._id.toString(), originCoords);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error estimating fare:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to estimate fare',
      error: error.toString()
    });
  }
});

/**
 * @swagger
 * /api/v1/ride-pricing/availability:
 *   get:
 *     summary: Check riders availability
 *     description: Check if riders are available at a specific location
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: vehicleType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [motorcycle, car, tricycle]
 *         description: Vehicle type
 *     responses:
 *       200:
 *         description: Availability check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 availability:
 *                   type: object
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, vehicleType } = req.query;
    
    // Validate inputs
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Valid coordinates are required' });
    }
    
    const location = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude)
    };
    
    // Check for availability
    const availability = await riderMatching.checkRidersAvailable(location);
    
    // Track passenger location for real-time availability updates
    if (req.user && req.user._id) {
      await realTimeAvailability.trackPassengerLocation(req.user._id.toString(), location);
    }
    
    return res.status(200).json(availability);
  } catch (error) {
    console.error('Error checking availability:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to check availability',
      error: error.toString()
    });
  }
});

/**
 * @swagger
 * /api/v1/ride-pricing/density-map:
 *   get:
 *     summary: Get rider density map
 *     description: Get a map of rider density in a region
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Center latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Center longitude coordinate
 *       - in: query
 *         name: radius
 *         required: false
 *         schema:
 *           type: number
 *         description: Radius in kilometers (default 5)
 *     responses:
 *       200:
 *         description: Density map retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 densityMap:
 *                   type: array
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/density-map', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;
    
    // Validate inputs
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Valid coordinates are required' });
    }
    
    const center = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude)
    };
    
    // Get density map
    const result = await riderMatching.getRiderDensityMap({
      center,
      radius: parseFloat(radius)
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting density map:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get density map',
      error: error.toString()
    });
  }
});

/**
 * @swagger
 * /api/v1/ride-pricing/nearby-riders:
 *   get:
 *     summary: Find nearby riders
 *     description: Find available riders near a specific location
 *     tags: [Availability]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude coordinate
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude coordinate
 *       - in: query
 *         name: maxDistance
 *         required: false
 *         schema:
 *           type: number
 *         description: Maximum distance in meters (default 5000)
 *       - in: query
 *         name: vehicleType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [motorcycle, car, tricycle]
 *         description: Vehicle type filter
 *     responses:
 *       200:
 *         description: Nearby riders found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 riders:
 *                   type: array
 *                 availability:
 *                   type: object
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/nearby-riders', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, maxDistance, vehicleType } = req.query;
    
    // Validate inputs
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Valid coordinates are required' });
    }
    
    // Find nearby riders
    const result = await riderMatching.findNearbyRiders({
      location: {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude)
      },
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      vehicleType: vehicleType || undefined
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to find nearby riders',
      error: error.toString()
    });
  }
});

/**
 * @swagger
 * /api/v1/ride-pricing/calculate-eta:
 *   post:
 *     summary: Calculate ETA
 *     description: Calculate estimated time of arrival
 *     tags: [Pricing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *             properties:
 *               origin:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               destination:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       200:
 *         description: ETA calculation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 eta:
 *                   type: number
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/calculate-eta', authenticateToken, async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    // Validate inputs
    if (!origin || !origin.latitude || !origin.longitude) {
      return res.status(400).json({ success: false, message: 'Valid origin coordinates are required' });
    }
    
    if (!destination || !destination.latitude || !destination.longitude) {
      return res.status(400).json({ success: false, message: 'Valid destination coordinates are required' });
    }
    
    // Calculate ETA
    const eta = await pricingEngine.calculateETA(
      {
        lat: origin.latitude,
        lng: origin.longitude
      },
      {
        lat: destination.latitude,
        lng: destination.longitude
      }
    );
    
    return res.status(200).json({
      success: true,
      eta,
      unit: 'minutes'
    });
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate ETA',
      error: error.toString()
    });
  }
});

export default router;
