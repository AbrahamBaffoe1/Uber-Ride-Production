import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { hasAnyRole } from '../../middlewares/role.middleware.js';

export default function(connection) {
  const router = express.Router();
  
  const Rating = connection.model('Rating');
  const Ride = connection.model('Ride');
  const User = connection.model('User');

  /**
   * @route POST /api/v1/passenger/ratings/rider
   * @desc Rate a rider after ride completion
   * @access Private - Passengers only
   */
  router.post('/rider', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const { rideId, riderId, rating, comment, categories } = req.body;
      
      // Validate ride exists and belongs to passenger
      const ride = await Ride.findById(rideId);
      if (!ride || ride.userId.toString() !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found or unauthorized'
        });
      }
      
      // Check if already rated
      const existingRating = await Rating.findOne({
        rideId,
        fromUserId: req.user.id,
        toUserId: riderId
      });
      
      if (existingRating) {
        return res.status(400).json({
          success: false,
          message: 'You have already rated this ride'
        });
      }
      
      // Create rating
      const newRating = new Rating({
        rideId,
        fromUserId: req.user.id,
        toUserId: riderId,
        rating,
        comment,
        categories, // ['safe_driving', 'friendly', 'punctual', 'clean_vehicle']
        userType: 'passenger'
      });
      
      await newRating.save();
      
      // Update rider's average rating
      const riderRatings = await Rating.find({ toUserId: riderId });
      const avgRating = riderRatings.reduce((sum, r) => sum + r.rating, 0) / riderRatings.length;
      
      await User.findByIdAndUpdate(riderId, {
        'riderProfile.averageRating': avgRating,
        'riderProfile.totalRatings': riderRatings.length
      });
      
      res.status(201).json({
        success: true,
        data: newRating
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route GET /api/v1/passenger/ratings/pending
   * @desc Get pending ratings for completed rides
   * @access Private - Passengers only
   */
  router.get('/pending', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      // Find completed rides without ratings
      const completedRides = await Ride.find({
        userId: req.user.id,
        status: 'completed'
      }).populate('riderId', 'name profilePicture');
      
      // Filter out already rated rides
      const ratedRideIds = await Rating.find({
        fromUserId: req.user.id
      }).distinct('rideId');
      
      const pendingRatings = completedRides.filter(ride => 
        !ratedRideIds.includes(ride._id.toString())
      );
      
      res.json({
        success: true,
        data: pendingRatings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  return router;
}
