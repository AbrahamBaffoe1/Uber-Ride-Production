/**
 * Enhanced Tracking Routes
 * Provides endpoints for enhanced real-time tracking using MongoDB
 */
import express from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middlewares/auth.middleware.js';
import TrackingEvent from '../models/TrackingEvent.js';
import RiderLocation from '../models/RiderLocation.js';
import Ride from '../models/Ride.js';
import { 
  calculateRideETA, 
  generateTrajectoryPrediction, 
  processOfflineLocations
} from '../../services/enhanced-tracking.service.js';

const { ObjectId } = Types;
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route GET /api/v1/mongo/tracking/events
 * @desc Get tracking events for a ride or user
 * @access Private
 */
router.get('/events', async (req, res) => {
  try {
    const { rideId, userId, type, startDate, endDate, limit = 100 } = req.query;
    
    // Build query
    const query = {};
    
    if (rideId) {
      query.rideId = new ObjectId(rideId);
    }
    
    if (userId) {
      query.userId = new ObjectId(userId);
    } else if (!rideId) {
      // If neither rideId nor userId specified, default to current user
      query.userId = req.user._id;
    }
    
    if (type) {
      query.eventType = type;
    }
    
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (!query.createdAt) query.createdAt = {};
      query.createdAt.$lte = new Date(endDate);
    }
    
    // Fetch events
    const events = await TrackingEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error fetching tracking events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tracking events',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/tracking/locations
 * @desc Get location history for a rider or current user
 * @access Private
 */
router.get('/locations', async (req, res) => {
  try {
    const { riderId, startDate, endDate, limit = 100 } = req.query;
    
    // Build query
    const query = {
      eventType: 'location_update'
    };
    
    if (riderId) {
      query.userId = new ObjectId(riderId);
      
      // Check if requester has permission to access this rider's data
      // For example, only allow if they have an active ride together
      if (req.user.role !== 'admin' && req.user._id.toString() !== riderId) {
        const activeRide = await Ride.findOne({
          $or: [
            { userId: req.user._id, riderId: new ObjectId(riderId), status: { $in: ['accepted', 'started', 'arrived'] } },
            { userId: new ObjectId(riderId), riderId: req.user._id, status: { $in: ['accepted', 'started', 'arrived'] } }
          ]
        });
        
        if (!activeRide) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to access this rider\'s location history'
          });
        }
      }
    } else {
      // Default to current user
      query.userId = req.user._id;
    }
    
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (!query.createdAt) query.createdAt = {};
      query.createdAt.$lte = new Date(endDate);
    }
    
    // Fetch location events
    const locations = await TrackingEvent.find(query)
      .select('location locationMetadata createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Transform to GeoJSON format
    const geoJsonLocations = locations.map(loc => ({
      type: 'Feature',
      geometry: loc.location,
      properties: {
        timestamp: loc.createdAt,
        accuracy: loc.locationMetadata?.accuracy,
        heading: loc.locationMetadata?.heading,
        speed: loc.locationMetadata?.speed,
        altitude: loc.locationMetadata?.altitude
      }
    }));
    
    res.json({
      success: true,
      count: locations.length,
      data: {
        type: 'FeatureCollection',
        features: geoJsonLocations
      }
    });
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching location history',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/tracking/eta
 * @desc Calculate ETA for a ride
 * @access Private
 */
router.get('/eta', async (req, res) => {
  try {
    const { rideId, riderId } = req.query;
    
    if (!rideId || !riderId) {
      return res.status(400).json({
        success: false,
        message: 'rideId and riderId are required'
      });
    }
    
    // Check if requester has permission to access this ETA
    if (req.user.role !== 'admin') {
      const ride = await Ride.findById(rideId);
      
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }
      
      // Check if user is rider or passenger of this ride
      const isRider = ride.riderId && ride.riderId.toString() === req.user._id.toString();
      const isPassenger = ride.userId && ride.userId.toString() === req.user._id.toString();
      
      if (!isRider && !isPassenger) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this ride\'s ETA'
        });
      }
    }
    
    const eta = await calculateRideETA(rideId, riderId);
    
    res.json({
      success: true,
      data: eta
    });
  } catch (error) {
    console.error('Error calculating ETA:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating ETA',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/tracking/predictions
 * @desc Generate trajectory predictions for a rider
 * @access Private
 */
router.get('/predictions', async (req, res) => {
  try {
    const { riderId } = req.query;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'riderId is required'
      });
    }
    
    // Get rider's current location
    const riderLocation = await RiderLocation.findOne({ riderId: new ObjectId(riderId) });
    
    if (!riderLocation || !riderLocation.currentLocation) {
      return res.status(404).json({
        success: false,
        message: 'Rider location not found'
      });
    }
    
    // Generate predictions
    const predictions = generateTrajectoryPrediction(riderId, {
      lat: riderLocation.currentLocation.coordinates[1],
      lng: riderLocation.currentLocation.coordinates[0],
      heading: riderLocation.heading,
      speed: riderLocation.speed
    });
    
    res.json({
      success: true,
      count: predictions.length,
      data: predictions
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating predictions',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/tracking/offline
 * @desc Process offline location data
 * @access Private
 */
router.post('/offline', async (req, res) => {
  try {
    const { locations } = req.body;
    
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid locations array is required'
      });
    }
    
    // Process offline locations for current user
    const result = await processOfflineLocations(req.user._id, locations);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing offline data:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing offline data',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/tracking/analytics
 * @desc Get tracking analytics and statistics
 * @access Private (Admin only)
 */
router.get('/analytics', async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can access tracking analytics'
      });
    }
    
    const { startDate, endDate } = req.query;
    
    // Set default date range to last 24 hours if not specified
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Get total events by type
    const eventCounts = await TrackingEvent.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get active riders count
    const activeRidersCount = await RiderLocation.countDocuments({
      status: 'online',
      lastUpdated: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Active in last 15 min
    });
    
    // Get total tracking events in period
    const totalEvents = await TrackingEvent.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });
    
    // Get events per hour
    const eventsPerHour = await TrackingEvent.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { 
        $group: { 
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);
    
    // Format events per hour for charting
    const formattedEventsPerHour = eventsPerHour.map(item => ({
      timestamp: new Date(
        item._id.year, 
        item._id.month - 1, 
        item._id.day, 
        item._id.hour
      ).toISOString(),
      count: item.count
    }));
    
    res.json({
      success: true,
      data: {
        totalEvents,
        activeRidersCount,
        eventsByType: eventCounts,
        eventsOverTime: formattedEventsPerHour,
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tracking analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tracking analytics',
      error: error.message
    });
  }
});

export default router;
