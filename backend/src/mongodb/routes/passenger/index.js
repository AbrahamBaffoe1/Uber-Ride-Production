/**
 * Passenger-specific routes
 * Routes exclusive to the passenger app using the passenger database connection
 */
import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { hasAnyRole } from '../../middlewares/role.middleware.js';
import helpSupportRoutes from './help-support.routes.js';
import ratingRoutes from './rating.routes.js';
import profileRoutes from './profile.routes.js';

/**
 * Create passenger routes with specific passenger database connection
 * @param {Object} passengerConnection - Mongoose connection to passenger database  
 * @returns {Router} Express router with passenger routes
 */
export default function(passengerConnection) {
  const router = express.Router();

  // Models are already registered in registerModels.js, no need to register them again
  const User = passengerConnection.model('User');
  const Ride = passengerConnection.model('Ride');
  const SavedLocation = passengerConnection.model('SavedLocation');

  // Import sub-routes
  const helpSupport = helpSupportRoutes(passengerConnection);
  const ratings = ratingRoutes(passengerConnection);
  const profile = profileRoutes(passengerConnection);
  
  // Register sub-routes
  router.use('/support', helpSupport);
  router.use('/ratings', ratings);
  router.use('/profile', profile);
  
  // Define passenger-specific routes

  /**
   * @route GET /api/v1/passenger/profile
   * @desc Get passenger profile
   * @access Private - Passengers only
   */
  router.get('/profile', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const passengerId = req.user.id;
      
      const passenger = await User.findById(passengerId).select('-password');
      
      if (!passenger) {
        return res.status(404).json({
          success: false,
          message: 'Passenger not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: passenger
      });
    } catch (error) {
      console.error('Error fetching passenger profile:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch passenger profile'
      });
    }
  });

  /**
   * @route POST /api/v1/passenger/request-ride
   * @desc Request a new ride
   * @access Private - Passengers only
   */
  router.post('/request-ride', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        pickupLocation,
        destination,
        paymentMethod = 'cash',
        fare,
        estimatedDuration
      } = req.body;
      
      // Validate required fields
      if (!pickupLocation || !destination) {
        return res.status(400).json({
          success: false,
          message: 'Pickup location and destination are required'
        });
      }
      
      // Create new ride request
      const ride = new Ride({
        userId,
        pickupLocation,
        destination,
        paymentMethod,
        fare,
        estimatedDuration,
        status: 'requested',
        requestTime: new Date()
      });
      
      // Save ride to database
      await ride.save();
      
      return res.status(201).json({
        success: true,
        message: 'Ride requested successfully',
        data: ride
      });
    } catch (error) {
      console.error('Error requesting ride:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to request ride'
      });
    }
  });

  /**
   * @route GET /api/v1/passenger/saved-locations
   * @desc Get passenger's saved locations
   * @access Private - Passengers only
   */
  router.get('/saved-locations', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const passengerId = req.user.id;
      
      // Get user with saved locations
      const user = await User.findById(passengerId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Passenger not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: user.passengerProfile.savedAddresses || []
      });
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch saved locations'
      });
    }
  });

  /**
   * @route POST /api/v1/passenger/saved-locations
   * @desc Add a new saved location
   * @access Private - Passengers only
   */
  router.post('/saved-locations', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const passengerId = req.user.id;
      const { name, address, coordinates } = req.body;
      
      // Validate required fields
      if (!name || !address || !coordinates) {
        return res.status(400).json({
          success: false,
          message: 'Name, address, and coordinates are required'
        });
      }
      
      // Find user and update
      const user = await User.findByIdAndUpdate(
        passengerId,
        {
          $push: {
            'passengerProfile.savedAddresses': {
              name,
              address,
              coordinates: {
                type: 'Point',
                coordinates: [coordinates.longitude, coordinates.latitude]
              }
            }
          }
        },
        { new: true }
      );
      
      return res.status(201).json({
        success: true,
        message: 'Location saved successfully',
        data: user.passengerProfile.savedAddresses
      });
    } catch (error) {
      console.error('Error saving location:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to save location'
      });
    }
  });

  /**
   * @route GET /api/v1/passenger/ride-history
   * @desc Get passenger's ride history
   * @access Private - Passengers only
   */
  router.get('/ride-history', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const passengerId = req.user.id;
      const { limit = 10, page = 1, status } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build query
      const query = { userId: passengerId };
      if (status) query.status = status;
      
      // Get rides with pagination
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
      console.error('Error fetching ride history:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch ride history'
      });
    }
  });

  // Add more passenger-specific routes as needed

  return router;
};
