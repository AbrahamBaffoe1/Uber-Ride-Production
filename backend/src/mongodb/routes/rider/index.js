/**
 * Rider-specific routes
 * Routes exclusive to the rider app using the rider database connection
 */
import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { hasAnyRole } from '../../middlewares/role.middleware.js';

/**
 * Create rider routes with specific rider database connection
 * @param {Object} riderConnection - Mongoose connection to rider database  
 * @returns {Router} Express router with rider routes
 */
export default function(riderConnection) {
  const router = express.Router();

  // Import role middleware from parameter to ensure it's available
  const checkRole = hasAnyRole;

  // Register Rider-specific models with this connection using dynamic imports
  // This ensures models use the rider database
  import('../../models/User.js').then(UserModule => {
    riderConnection.model('User', UserModule.default.schema);
  });
  import('../../models/Ride.js').then(RideModule => {
    riderConnection.model('Ride', RideModule.default.schema);
    // For Earnings, replace with actual schema when created
    riderConnection.model('Earnings', RideModule.default.schema);
  });
  import('../../models/RiderLocation.js').then(RiderLocationModule => {
    riderConnection.model('RiderLocation', RiderLocationModule.default.schema);
  });
  // Add other rider-specific models as needed

  // Define rider-specific routes

  /**
   * @route GET /api/v1/rider/profile
   * @desc Get rider profile
   * @access Private - Riders only
   */
  router.get('/profile', authenticate, hasAnyRole(['rider']), async (req, res) => {
    try {
      const riderId = req.user.id;
      
      const rider = await User.findById(riderId).select('-password');
      
      if (!rider) {
        return res.status(404).json({
          success: false,
          message: 'Rider not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: rider
      });
    } catch (error) {
      console.error('Error fetching rider profile:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch rider profile'
      });
    }
  });

  /**
   * @route GET /api/v1/rider/availability
   * @desc Set rider availability status
   * @access Private - Riders only
   */
  router.post('/availability', authenticate, hasAnyRole(['rider']), async (req, res) => {
    try {
      const riderId = req.user.id;
      const { isAvailable, coordinates } = req.body;
      
      if (typeof isAvailable !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isAvailable must be a boolean'
        });
      }
      
      // Update rider profile
      const rider = await User.findByIdAndUpdate(
        riderId,
        { 'riderProfile.isActive': isAvailable },
        { new: true }
      );
      
      // If coordinates are provided, update rider location
      if (coordinates && isAvailable) {
        await RiderLocation.findOneAndUpdate(
          { riderId },
          {
            riderId,
            location: {
              type: 'Point',
              coordinates: [coordinates.longitude, coordinates.latitude]
            },
            isAvailable: true,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );
      } else if (!isAvailable) {
        // If rider is going offline, update location to unavailable
        await RiderLocation.findOneAndUpdate(
          { riderId },
          { isAvailable: false },
          { new: true }
        );
      }
      
      return res.status(200).json({
        success: true,
        message: `Rider is now ${isAvailable ? 'available' : 'unavailable'} for rides`,
        data: {
          rider,
          isAvailable
        }
      });
    } catch (error) {
      console.error('Error updating rider availability:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update rider availability'
      });
    }
  });

  /**
   * @route GET /api/v1/rider/earnings
   * @desc Get rider earnings
   * @access Private - Riders only
   */
  router.get('/earnings', authenticate, hasAnyRole(['rider']), async (req, res) => {
    try {
      const riderId = req.user.id;
      const { startDate, endDate } = req.query;
      
      // Build query
      const query = { riderId };
      
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      // Get completed rides
      const completedRides = await Ride.find({
        ...query,
        status: 'completed'
      });
      
      // Calculate earnings
      const totalEarnings = completedRides.reduce((sum, ride) => {
        return sum + (ride.fare || 0);
      }, 0);
      
      return res.status(200).json({
        success: true,
        data: {
          totalEarnings,
          rides: completedRides
        }
      });
    } catch (error) {
      console.error('Error fetching rider earnings:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch rider earnings'
      });
    }
  });

  // Add more rider-specific routes as needed

  return router;
};
