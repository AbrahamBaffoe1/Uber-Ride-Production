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

  // Models are already registered in registerModels.js, no need to register them again
  const User = riderConnection.model('User');
  const Ride = riderConnection.model('Ride');
  const RiderLocation = riderConnection.model('RiderLocation');

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

  /**
   * @route GET /api/v1/rider/rides/active
   * @desc Get rider's active rides
   * @access Private - Riders only
   */
  router.get('/rides/active', authenticate, hasAnyRole(['rider']), async (req, res) => {
    try {
      const riderId = req.user.id || req.user._id;
      
      // Find active rides for the rider
      const activeRides = await Ride.find({
        riderId,
        status: { $in: ['accepted', 'in_progress', 'arrived', 'picked_up'] }
      }).sort({ createdAt: -1 });
      
      return res.status(200).json({
        status: 'success',
        data: {
          rides: activeRides.map(ride => ({
            id: ride._id,
            passengerId: ride.passengerId,
            status: ride.status,
            pickupLocation: ride.pickupLocation,
            destination: ride.destination,
            fare: ride.fare,
            estimatedDuration: ride.estimatedDuration,
            createdAt: ride.createdAt,
            acceptedAt: ride.acceptedAt,
            arrivedAt: ride.arrivedAt,
            pickedUpAt: ride.pickedUpAt
          }))
        }
      });
    } catch (error) {
      console.error('Error fetching active rides:', error);
      
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to fetch active rides'
      });
    }
  });

  /**
   * @route PUT /api/v1/rider/rides/:rideId/status
   * @desc Update ride status
   * @access Private - Riders only
   */
  router.put('/rides/:rideId/status', authenticate, hasAnyRole(['rider']), async (req, res) => {
    try {
      const riderId = req.user.id || req.user._id;
      const { rideId } = req.params;
      const { status, location } = req.body;
      
      // Validate status
      const allowedStatuses = ['accepted', 'arrived', 'picked_up', 'completed', 'cancelled'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status'
        });
      }
      
      // Find and update the ride
      const ride = await Ride.findOneAndUpdate(
        { _id: rideId, riderId },
        { 
          status,
          ...(status === 'accepted' && { acceptedAt: new Date() }),
          ...(status === 'arrived' && { arrivedAt: new Date() }),
          ...(status === 'picked_up' && { pickedUpAt: new Date() }),
          ...(status === 'completed' && { completedAt: new Date() }),
          ...(location && { riderLocation: location }),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!ride) {
        return res.status(404).json({
          status: 'error',
          message: 'Ride not found or not authorized'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: `Ride status updated to ${status}`,
        data: { ride }
      });
    } catch (error) {
      console.error('Error updating ride status:', error);
      
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to update ride status'
      });
    }
  });

  // Add more rider-specific routes as needed

  return router;
};
