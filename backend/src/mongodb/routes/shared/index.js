
/**
 * Shared routes for both rider and passenger apps
 * These routes work with both databases as needed
 */
import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { hasAnyRole } from '../../middlewares/role.middleware.js';
import authRoutes from '../auth.routes.js';
import otpRoutes from '../otp.routes.js';
import newOtpRoutes from '../new-otp.routes.js';

/**
 * Create shared routes with connections to both databases
 * @param {Object} riderConnection - Mongoose connection to rider database
 * @param {Object} passengerConnection - Mongoose connection to passenger database
 * @returns {Promise<Router>} Express router with shared routes
 */
const createSharedRoutes = async (riderConnection, passengerConnection) => {
  const router = express.Router();
  
  // Directly mount auth and OTP routes
  router.use('/auth', authRoutes);
  router.use('/otp', otpRoutes);
  router.use('/new-otp', newOtpRoutes);

  // Register models with appropriate connections
  // Import models dynamically
  const UserModel = await import('../../models/User.js');
  const RideModel = await import('../../models/Ride.js');
  
  const RiderUser = riderConnection.model('User', UserModel.default.schema);
  const PassengerUser = passengerConnection.model('User', UserModel.default.schema);
  const RiderRide = riderConnection.model('Ride', RideModel.default.schema);
  const PassengerRide = passengerConnection.model('Ride', RideModel.default.schema);

  // Authentication routes - these need to work with both databases

  // Authentication routes are now handled by the imported router
  // The duplicate routes '/auth/register' and '/auth/login' have been removed to avoid conflicts

  /**
   * @route POST /api/v1/shared/rides/match
   * @desc Match a passenger with a rider
   * @access Private - Admins or system only
   */
  router.post('/rides/match', authenticate, async (req, res) => {
    try {
      const { rideId, riderId } = req.body;
      
      if (!rideId || !riderId) {
        return res.status(400).json({
          success: false,
          message: 'Ride ID and rider ID are required'
        });
      }
      
      // Get ride from passenger database
      const passengerRide = await PassengerRide.findById(rideId);
      
      if (!passengerRide) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }
      
      // Check ride status
      if (passengerRide.status !== 'requested') {
        return res.status(400).json({
          success: false,
          message: `Cannot match ride with status: ${passengerRide.status}`
        });
      }
      
      // Get rider from rider database
      const rider = await RiderUser.findById(riderId);
      
      if (!rider) {
        return res.status(404).json({
          success: false,
          message: 'Rider not found'
        });
      }
      
      // Update ride with rider info in passenger database
      passengerRide.riderId = riderId;
      passengerRide.status = 'matched';
      passengerRide.matchedAt = new Date();
      await passengerRide.save();
      
      // Create ride in rider database as well
      const riderRide = new RiderRide({
        _id: passengerRide._id, // Use same ID for consistency
        userId: passengerRide.userId,
        riderId,
        pickupLocation: passengerRide.pickupLocation,
        destination: passengerRide.destination,
        fare: passengerRide.fare,
        paymentMethod: passengerRide.paymentMethod,
        status: 'matched',
        requestTime: passengerRide.requestTime,
        matchedAt: passengerRide.matchedAt
      });
      
      await riderRide.save();
      
      return res.status(200).json({
        success: true,
        message: 'Ride matched successfully',
        data: {
          ride: passengerRide,
          rider: {
            id: rider._id,
            name: `${rider.firstName} ${rider.lastName}`,
            phoneNumber: rider.phoneNumber,
            // Include other relevant rider info
            averageRating: rider.riderProfile.averageRating
          }
        }
      });
    } catch (error) {
      console.error('Error matching ride:', error);
      
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to match ride'
      });
    }
  });

  /**
   * @route PATCH /api/v1/shared/rides/:id/status
   * @desc Update ride status - syncs between rider and passenger DBs
   * @access Private - Authenticated users
   */
  router.patch('/rides/:id/status', authenticate, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }
      
      // Determine which database to check based on user role
      let ride;
      let otherRide;
      
      if (userRole === 'rider') {
        // Rider initiating status update
        ride = await RiderRide.findById(id);
        if (ride) {
          otherRide = await PassengerRide.findById(id);
        }
      } else {
        // Passenger or admin initiating status update
        ride = await PassengerRide.findById(id);
        if (ride) {
          otherRide = await RiderRide.findById(id);
        }
      }
      
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }
      
      // Validate that the user is associated with this ride
      if (userRole === 'rider' && ride.riderId.toString() !== userId &&
          userRole === 'passenger' && ride.userId.toString() !== userId &&
          userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to update this ride'
        });
      }
      
      // Update status in primary database
      ride.status = status;
      ride.updatedAt = new Date();
      
      // Add status-specific fields
      if (status === 'in_progress') {
        ride.startTime = new Date();
      } else if (status === 'completed') {
        ride.endTime = new Date();
      }
      
      await ride.save();
      
      // Update in other database if ride exists there
      if (otherRide) {
        otherRide.status = status;
        otherRide.updatedAt = new Date();
        
        if (status === 'in_progress') {
          otherRide.startTime = ride.startTime;
        } else if (status === 'completed') {
          otherRide.endTime = ride.endTime;
        }
        
        await otherRide.save();
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

  // Additional shared routes as needed

  return router;
};

export default createSharedRoutes;
