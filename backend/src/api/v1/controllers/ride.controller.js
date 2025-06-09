const { v4: uuidv4 } = require('uuid');
const { Ride, User } = require('../../../models');
const { calculateFare } = require('../../../services/ride.service');

/**
 * Request a new ride
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestRide = async (req, res, next) => {
  try {
    const { pickupLocation, dropoffLocation, scheduledFor, paymentMethodId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({
        status: 'error',
        message: 'Pickup and dropoff locations are required',
      });
    }

    // Calculate estimated fare, distance and duration
    const { fare, distance, duration } = await calculateFare(pickupLocation, dropoffLocation);

    // Create new ride request
    const newRide = await Ride.create({
      id: uuidv4(),
      userId,
      status: 'pending',
      pickupLocation,
      dropoffLocation,
      fare,
      distance,
      duration,
      paymentMethodId: paymentMethodId || null,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdAt: new Date(),
    });

    // Format response data
    const rideResponse = {
      id: newRide.id,
      status: newRide.status,
      pickupLocation: newRide.pickupLocation,
      dropoffLocation: newRide.dropoffLocation,
      distance: newRide.distance,
      duration: newRide.duration,
      fare: newRide.fare,
      paymentMethod: newRide.paymentMethodId ? 'card' : 'cash',
      createdAt: newRide.createdAt.toISOString(),
      scheduledFor: newRide.scheduledFor ? newRide.scheduledFor.toISOString() : null,
    };

    // In a real implementation, we would notify available riders
    // For demo, we'll simulate accepting after a delay in a real world scenario

    return res.status(201).json({
      status: 'success',
      data: rideResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific ride by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRideById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get ride from database
    const ride = await Ride.findOne({ 
      where: { 
        id,
        userId
      }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found',
      });
    }

    // Format rider data if ride has been accepted
    let riderData = null;
    if (ride.riderId) {
      const rider = await User.findByPk(ride.riderId);
      if (rider) {
        riderData = {
          id: rider.id,
          name: `${rider.firstName} ${rider.lastName}`,
          phoneNumber: rider.phoneNumber,
          photo: rider.profilePicture || null,
          rating: rider.rating || 4.5,
          vehicleInfo: ride.vehicleInfo || 'Honda CBR 150',
        };
      }
    }

    // Format response data
    const rideResponse = {
      id: ride.id,
      status: ride.status,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      distance: ride.distance,
      duration: ride.duration,
      fare: ride.fare,
      paymentMethod: ride.paymentMethodId ? 'card' : 'cash',
      createdAt: ride.createdAt.toISOString(),
      scheduledFor: ride.scheduledFor ? ride.scheduledFor.toISOString() : null,
      estimatedArrival: ride.estimatedArrival ? ride.estimatedArrival.toISOString() : null,
      rider: riderData,
    };

    return res.status(200).json({
      status: 'success',
      data: rideResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a ride
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const cancelRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get ride from database
    const ride = await Ride.findOne({ 
      where: { 
        id,
        userId
      }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found',
      });
    }

    // Check if ride can be cancelled
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Ride cannot be cancelled because it is already ${ride.status}`,
      });
    }

    // Check if ride has started
    if (ride.status === 'started') {
      return res.status(400).json({
        status: 'error',
        message: 'Ride cannot be cancelled because it has already started',
      });
    }

    // Update ride status
    await ride.update({ status: 'cancelled' });

    // In a real implementation, we would notify the rider if one was assigned

    return res.status(200).json({
      status: 'success',
      message: 'Ride cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rate a completed ride
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const rateRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5',
      });
    }

    // Get ride from database
    const ride = await Ride.findOne({ 
      where: { 
        id,
        userId
      }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found',
      });
    }

    // Check if ride is completed
    if (ride.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Only completed rides can be rated',
      });
    }

    // Check if ride has already been rated
    if (ride.rating) {
      return res.status(400).json({
        status: 'error',
        message: 'This ride has already been rated',
      });
    }

    // Update ride with rating and review
    await ride.update({ 
      rating,
      review: review || null,
    });

    // In a real implementation, we would update the rider's average rating

    return res.status(200).json({
      status: 'success',
      message: 'Ride rated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride history for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRideHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get rides from database
    const { count, rows: rides } = await Ride.findAndCountAll({
      where: { 
        userId,
        status: ['completed', 'cancelled']
      },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Format response data
    const rideHistory = await Promise.all(rides.map(async (ride) => {
      // Format rider data if ride had been accepted
      let riderData = null;
      if (ride.riderId) {
        const rider = await User.findByPk(ride.riderId);
        if (rider) {
          riderData = {
            id: rider.id,
            name: `${rider.firstName} ${rider.lastName}`,
            phoneNumber: rider.phoneNumber,
            photo: rider.profilePicture || null,
            rating: rider.rating || 4.5,
            vehicleInfo: ride.vehicleInfo || 'Honda CBR 150',
          };
        }
      }

      return {
        id: ride.id,
        status: ride.status,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        distance: ride.distance,
        duration: ride.duration,
        fare: ride.fare,
        paymentMethod: ride.paymentMethodId ? 'card' : 'cash',
        createdAt: ride.createdAt.toISOString(),
        scheduledFor: ride.scheduledFor ? ride.scheduledFor.toISOString() : null,
        estimatedArrival: ride.estimatedArrival ? ride.estimatedArrival.toISOString() : null,
        rider: riderData,
      };
    }));

    return res.status(200).json({
      status: 'success',
      data: rideHistory,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active ride for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getActiveRide = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get active ride from database
    const ride = await Ride.findOne({
      where: { 
        userId,
        status: ['pending', 'accepted', 'arrived', 'started']
      },
      order: [['createdAt', 'DESC']],
    });

    if (!ride) {
      return res.status(200).json({
        status: 'success',
        data: null,
      });
    }

    // Format rider data if ride has been accepted
    let riderData = null;
    if (ride.riderId) {
      const rider = await User.findByPk(ride.riderId);
      if (rider) {
        riderData = {
          id: rider.id,
          name: `${rider.firstName} ${rider.lastName}`,
          phoneNumber: rider.phoneNumber,
          photo: rider.profilePicture || null,
          rating: rider.rating || 4.5,
          vehicleInfo: ride.vehicleInfo || 'Honda CBR 150',
        };
      }
    }

    // Format response data
    const rideResponse = {
      id: ride.id,
      status: ride.status,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      distance: ride.distance,
      duration: ride.duration,
      fare: ride.fare,
      paymentMethod: ride.paymentMethodId ? 'card' : 'cash',
      createdAt: ride.createdAt.toISOString(),
      scheduledFor: ride.scheduledFor ? ride.scheduledFor.toISOString() : null,
      estimatedArrival: ride.estimatedArrival ? ride.estimatedArrival.toISOString() : null,
      rider: riderData,
    };

    return res.status(200).json({
      status: 'success',
      data: rideResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track a ride in real-time
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const trackRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get ride from database
    const ride = await Ride.findOne({ 
      where: { 
        id,
        userId
      }
    });

    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found',
      });
    }

    // Check if ride is active
    if (!['accepted', 'arrived', 'started'].includes(ride.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Ride is not active and cannot be tracked',
      });
    }

    // For a real implementation, we would get real-time location from the rider
    // For demo, we'll simulate with a location near the pickup or dropoff

    // Generate a location based on ride status
    let currentLocation;
    if (ride.status === 'accepted') {
      // Simulate rider approaching pickup location
      currentLocation = {
        latitude: ride.pickupLocation.latitude + (Math.random() * 0.01 - 0.005),
        longitude: ride.pickupLocation.longitude + (Math.random() * 0.01 - 0.005),
      };
    } else if (ride.status === 'arrived') {
      // Rider is at pickup location
      currentLocation = ride.pickupLocation;
    } else if (ride.status === 'started') {
      // Simulate rider moving toward dropoff location
      const pickupLat = ride.pickupLocation.latitude;
      const pickupLng = ride.pickupLocation.longitude;
      const dropoffLat = ride.dropoffLocation.latitude;
      const dropoffLng = ride.dropoffLocation.longitude;
      
      // Calculate a point between pickup and dropoff
      const factor = Math.random() * 0.8 + 0.1; // Between 0.1 and 0.9
      currentLocation = {
        latitude: pickupLat + (dropoffLat - pickupLat) * factor,
        longitude: pickupLng + (dropoffLng - pickupLng) * factor,
      };
    }

    // Generate estimated arrival time
    let estimatedArrival;
    if (ride.status === 'started') {
      // Estimate arrival at dropoff
      estimatedArrival = new Date(Date.now() + 5 * 60000); // 5 minutes from now
    } else {
      // Estimate arrival at pickup
      estimatedArrival = new Date(Date.now() + 3 * 60000); // 3 minutes from now
    }

    // Format response data
    const trackingData = {
      rideId: ride.id,
      currentLocation,
      estimatedArrival: estimatedArrival.toISOString(),
      status: ride.status,
    };

    return res.status(200).json({
      status: 'success',
      data: trackingData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestRide,
  getRideById,
  cancelRide,
  rateRide,
  getRideHistory,
  getActiveRide,
  trackRide,
};
