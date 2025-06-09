/**
 * MongoDB Rides Routes
 * Defines API endpoints for ride management and operations
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import mongoose from 'mongoose';
import Ride from '../models/Ride.js';

const router = express.Router();

// IMPORTANT: Order of routes matters in Express
// More specific routes should come before generic ones with params

/**
 * @route GET /api/v1/mongo/rides/history
 * @desc Get ride history for the authenticated user
 * @access Private
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find rides for the current user
    const rides = await Ride.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalRides = await Ride.countDocuments({ userId });
    
    return res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        total: totalRides,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRides / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching ride history:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch ride history'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides/nearby
 * @desc Find nearby ride requests
 * @access Private (Riders only)
 */
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { longitude, latitude, maxDistance = 5000 } = req.query; // maxDistance in meters
    
    if (!longitude || !latitude) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required'
      });
    }
    
    // Find rides with status "requested" near the specified coordinates
    const nearbyRides = await Ride.find({
      status: 'requested',
      'pickupLocation.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).limit(10);
    
    return res.status(200).json({
      success: true,
      data: nearbyRides
    });
  } catch (error) {
    console.error('Error finding nearby rides:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to find nearby rides'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides/user/:userId
 * @desc Get rides for a specific user
 * @access Private
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { userId };
    if (status) query.status = status;
    
    // Find rides
    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalRides = await Ride.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        total: totalRides,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRides / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user rides:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user rides'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides/rider-stats
 * @desc Get statistics for a rider
 * @access Private
 */
router.get('/rider-stats', authenticate, async (req, res) => {
  try {
    const { riderId } = req.query;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required'
      });
    }
    
    // Get completed rides count
    const completedRides = await Ride.countDocuments({ 
      riderId,
      status: 'completed'
    });
    
    // Get cancelled rides count
    const cancelledRides = await Ride.countDocuments({ 
      riderId,
      status: 'cancelled'
    });
    
    // Get total rides count
    const totalRides = await Ride.countDocuments({ riderId });
    
    // Get average rating
    const ridesWithRatings = await Ride.find({
      riderId,
      'riderRating': { $exists: true, $ne: null }
    });
    
    let averageRating = 0;
    if (ridesWithRatings.length > 0) {
      const totalRating = ridesWithRatings.reduce((sum, ride) => sum + (ride.riderRating || 0), 0);
      averageRating = totalRating / ridesWithRatings.length;
    }
    
    return res.status(200).json({
      success: true,
      data: {
        totalRides,
        completedRides,
        cancelledRides,
        completionRate: totalRides > 0 ? (completedRides / totalRides) * 100 : 0,
        averageRating
      }
    });
  } catch (error) {
    console.error('Error fetching rider stats:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch rider stats'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides/rider/:riderId
 * @desc Get rides for a specific rider
 * @access Private
 */
router.get('/rider/:riderId', authenticate, async (req, res) => {
  try {
    const { riderId } = req.params;
    const { status, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { riderId };
    if (status) query.status = status;
    
    // Find rides
    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalRides = await Ride.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        total: totalRides,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRides / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching rider rides:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch rider rides'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides/:id
 * @desc Get a single ride by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // First check if this is a stats or special route to avoid MongoDB errors
    if (id === 'rider-stats' || id === 'nearby' || id === 'history') {
      // Let the next middleware handle it
      return next();
    }
    
    // Find ride by ID
    const ride = await Ride.findById(id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: ride
    });
  } catch (error) {
    console.error('Error fetching ride:', error);
    
    // If this is a CastError (invalid ObjectId format), pass to the next handler
    if (error.name === 'CastError') {
      return next();
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch ride'
    });
  }
});

/**
 * @route GET /api/v1/mongo/rides
 * @desc Get all rides (with optional filters)
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, userId, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query with provided filters
    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;
    
    // Find rides with pagination
    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalRides = await Ride.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        total: totalRides,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalRides / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching rides:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch rides'
    });
  }
});


/**
 * @route POST /api/v1/mongo/rides
 * @desc Create a new ride
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      userId,
      riderId,
      pickupLocation,
      destination,
      fare,
      paymentMethod,
      status = 'requested'
    } = req.body;
    
    // Validate required fields
    if (!userId || !pickupLocation || !destination) {
      return res.status(400).json({
        success: false,
        message: 'User ID, pickup location, and destination are required'
      });
    }
    
    // Create new ride
    const ride = new Ride({
      userId,
      riderId,
      pickupLocation,
      destination,
      fare,
      paymentMethod,
      status
    });
    
    // Save ride to database
    await ride.save();
    
    return res.status(201).json({
      success: true,
      message: 'Ride created successfully',
      data: ride
    });
  } catch (error) {
    console.error('Error creating ride:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create ride'
    });
  }
});

/**
 * @route PUT /api/v1/mongo/rides/:id
 * @desc Update a ride
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Find ride and update
    const ride = await Ride.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Ride updated successfully',
      data: ride
    });
  } catch (error) {
    console.error('Error updating ride:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update ride'
    });
  }
});

/**
 * @route PATCH /api/v1/mongo/rides/:id/status
 * @desc Update ride status
 * @access Private
 */
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    // Update ride status
    const ride = await Ride.findByIdAndUpdate(
      id,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    );
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Ride status updated successfully',
      data: ride
    });
  } catch (error) {
    console.error('Error updating ride status:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update ride status'
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/rides/:id
 * @desc Delete a ride
 * @access Private (Admin only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only allow deletion of rides in certain statuses
    const ride = await Ride.findById(id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }
    
    // Prevent deletion of active or completed rides
    const nonDeletableStatuses = ['in_progress', 'completed', 'paid'];
    if (nonDeletableStatuses.includes(ride.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a ride with status: ${ride.status}`
      });
    }
    
    // Delete the ride
    await Ride.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: 'Ride deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ride:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete ride'
    });
  }
});

export default router;
