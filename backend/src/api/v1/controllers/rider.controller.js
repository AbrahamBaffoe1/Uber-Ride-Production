const { v4: uuidv4 } = require('uuid');
const { 
  Ride, 
  User, 
  RiderLocation, 
  RiderEarnings, 
  RiderBalance,
  RiderPayout, 
  sequelize,
  Sequelize 
} = require('../../../models');
const { Op } = Sequelize;
const { findNearbyRiders } = require('../../../services/ride.service');
const { emitNotification } = require('../../../services/socket.service');

/**
 * Get available rides near the rider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAvailableRides = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Get rider's current location
    const riderLocation = await RiderLocation.findOne({
      where: { riderId },
      attributes: ['location']
    });
    
    if (!riderLocation || !riderLocation.location) {
      return res.status(400).json({
        status: 'error',
        message: 'Rider location not available. Please update your location first.',
      });
    }
    
    // Extract coordinates
    const coordinates = riderLocation.location.coordinates;
    const longitude = coordinates[0];
    const latitude = coordinates[1];
    
    // Get radius parameter from query or use default
    const radius = parseFloat(req.query.radius) || 5; // Default 5km
    
    // Query for nearby rides that are in requested status
    const availableRides = await sequelize.query(`
      SELECT 
        r.id, 
        r."passengerId", 
        r.status, 
        ST_AsGeoJSON(r."pickupLocation") as "pickupLocation",
        r."pickupAddress",
        ST_AsGeoJSON(r."dropoffLocation") as "dropoffLocation",
        r."dropoffAddress",
        r."estimatedFare",
        r."estimatedDistance",
        r."estimatedDuration",
        r."requestedAt",
        r."paymentMethod",
        ST_Distance(
          r."pickupLocation"::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as "distanceToPickup",
        u."firstName", 
        u."lastName", 
        u."phoneNumber",
        u."profilePicture",
        COALESCE(AVG(r2."riderRating"), 4.5) as "passengerRating"
      FROM "Rides" r
      JOIN "Users" u ON r."passengerId" = u.id
      LEFT JOIN "Rides" r2 ON r."passengerId" = r2."passengerId" AND r2."riderRating" IS NOT NULL
      WHERE r.status = 'requested'
      AND ST_DWithin(
        r."pickupLocation"::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
      GROUP BY r.id, u.id
      ORDER BY "distanceToPickup" ASC
    `, {
      replacements: [longitude, latitude, radius * 1000], // convert km to meters
      type: sequelize.QueryTypes.SELECT
    });
    
    // Format response
    const formattedRides = availableRides.map(ride => ({
      id: ride.id,
      status: ride.status,
      passenger: {
        id: ride.passengerId,
        name: `${ride.firstName} ${ride.lastName}`,
        phone: ride.phoneNumber,
        photo: ride.profilePicture,
        rating: parseFloat(ride.passengerRating).toFixed(1),
      },
      pickupLocation: {
        ...JSON.parse(ride.pickupLocation),
        address: ride.pickupAddress,
      },
      dropoffLocation: {
        ...JSON.parse(ride.dropoffLocation),
        address: ride.dropoffAddress,
      },
      fare: parseFloat(ride.estimatedFare),
      distance: ride.estimatedDistance,
      duration: ride.estimatedDuration,
      requestedAt: ride.requestedAt,
      paymentMethod: ride.paymentMethod,
      distanceToPickup: parseFloat(ride.distanceToPickup).toFixed(1),
      estimatedArrival: `${Math.ceil(parseFloat(ride.distanceToPickup) * 3)} mins`, // Rough estimate: 3 min per km
    }));
    
    return res.status(200).json({
      status: 'success',
      data: formattedRides,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a ride request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const acceptRide = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const { id: rideId } = req.params;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Begin transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Check if rider already has an active ride
      const activeRide = await Ride.findOne({
        where: {
          riderId,
          status: {
            [Op.in]: ['accepted', 'arrived', 'started']
          }
        },
        transaction
      });
      
      if (activeRide) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'You already have an active ride. Complete or cancel it before accepting a new one.',
        });
      }
      
      // Get ride from database
      const ride = await Ride.findOne({
        where: { id: rideId },
        transaction
      });
      
      if (!ride) {
        await transaction.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Ride not found',
        });
      }
      
      // Check ride status
      if (ride.status !== 'requested') {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Ride cannot be accepted because it is already ${ride.status}`,
        });
      }
      
      // Update ride with rider info
      await ride.update({
        riderId,
        status: 'accepted',
        acceptedAt: new Date(),
      }, { transaction });
      
      // Get passenger info
      const passenger = await User.findByPk(ride.passengerId, {
        attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePicture'],
        transaction,
      });
      
      // Notify passenger through socket service
      emitNotification(ride.passengerId, {
        type: 'ride_accepted',
        title: 'Ride Accepted',
        message: `${req.user.firstName} ${req.user.lastName} has accepted your ride request.`,
        data: {
          rideId,
          riderId,
        },
        priority: 'high',
      });
      
      // Commit transaction
      await transaction.commit();
      
      // Format response data
      const responseData = {
        id: ride.id,
        status: 'accepted',
        passenger: {
          id: passenger.id,
          name: `${passenger.firstName} ${passenger.lastName}`,
          phone: passenger.phoneNumber,
          photo: passenger.profilePicture,
        },
        pickupLocation: {
          latitude: ride.pickupLocation.coordinates[1],
          longitude: ride.pickupLocation.coordinates[0],
          address: ride.pickupAddress,
        },
        dropoffLocation: {
          latitude: ride.dropoffLocation.coordinates[1],
          longitude: ride.dropoffLocation.coordinates[0],
          address: ride.dropoffAddress,
        },
        fare: parseFloat(ride.estimatedFare),
        distance: ride.estimatedDistance,
        duration: ride.estimatedDuration,
        paymentMethod: ride.paymentMethod,
        acceptedAt: ride.acceptedAt.toISOString(),
      };
      
      return res.status(200).json({
        status: 'success',
        data: responseData,
      });
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a ride request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const rejectRide = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const { id: rideId } = req.params;
    const { reason } = req.body;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Get ride from database
    const ride = await Ride.findOne({
      where: { id: rideId },
    });
    
    if (!ride) {
      return res.status(404).json({
        status: 'error',
        message: 'Ride not found',
      });
    }
    
    // Check ride status
    if (ride.status !== 'requested') {
      return res.status(400).json({
        status: 'error',
        message: `Ride cannot be rejected because it is already ${ride.status}`,
      });
    }
    
    // Record rejection in a separate table or log
    // This could be used for analytics or to prevent showing the same request to this rider
    
    return res.status(200).json({
      status: 'success',
      message: 'Ride rejected successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ride status (arrived, started, completed)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateRideStatus = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const { id: rideId } = req.params;
    const { status, actualDistance, actualDuration, actualFare } = req.body;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Validate status
    const validStatuses = ['arrived', 'started', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ride status. Must be one of: arrived, started, completed',
      });
    }
    
    // Begin transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Get ride from database
      const ride = await Ride.findOne({
        where: {
          id: rideId,
          riderId,
        },
        transaction,
      });
      
      if (!ride) {
        await transaction.rollback();
        return res.status(404).json({
          status: 'error',
          message: 'Ride not found or you are not the assigned rider',
        });
      }
      
      // Validate status transition
      const statusTransitions = {
        accepted: ['arrived'],
        arrived: ['started'],
        started: ['completed'],
      };
      
      if (!statusTransitions[ride.status] || !statusTransitions[ride.status].includes(status)) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Cannot update status from ${ride.status} to ${status}`,
        });
      }
      
      // Update status based on the new status
      const updateData = { status };
      
      if (status === 'arrived') {
        updateData.arrivedAt = new Date();
      } else if (status === 'started') {
        updateData.startedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
        
        // Calculate actual distance and duration if provided
        if (actualDistance) updateData.actualDistance = actualDistance;
        if (actualDuration) updateData.actualDuration = actualDuration;
        
        // Calculate actual fare if not provided
        if (!actualFare) {
          // For demo, use estimated fare as actual fare
          // In real app, this would be calculated based on actual distance/duration
          updateData.actualFare = ride.estimatedFare;
        } else {
          updateData.actualFare = actualFare;
        }
        
        // Create earning record for rider
        const riderCommission = 0.8; // Rider gets 80% of fare
        const earningAmount = parseFloat(updateData.actualFare) * riderCommission;
        
        await RiderEarnings.create({
          id: uuidv4(),
          riderId,
          rideId,
          amount: earningAmount,
          type: 'ride_fare',
          status: 'available', // Immediately available for cashout
          description: `Earnings for ride ${rideId}`,
          transactionDate: new Date(),
        }, { transaction });
        
        // Update rider balance
        const [riderBalance] = await RiderBalance.findOrCreate({
          where: { riderId },
          defaults: {
            id: uuidv4(),
            riderId,
            availableBalance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalPaidOut: 0,
          },
          transaction,
        });
        
        await riderBalance.update({
          availableBalance: sequelize.literal(`"availableBalance" + ${earningAmount}`),
          totalEarned: sequelize.literal(`"totalEarned" + ${earningAmount}`),
        }, { transaction });
      }
      
      // Update ride status
      await ride.update(updateData, { transaction });
      
      // Notify passenger
      let notificationType, notificationTitle, notificationMessage;
      
      if (status === 'arrived') {
        notificationType = 'ride_arrived_pickup';
        notificationTitle = 'Rider Has Arrived';
        notificationMessage = 'Your rider has arrived at the pickup location';
      } else if (status === 'started') {
        notificationType = 'ride_started';
        notificationTitle = 'Ride Started';
        notificationMessage = 'Your ride has started';
      } else if (status === 'completed') {
        notificationType = 'ride_completed';
        notificationTitle = 'Ride Completed';
        notificationMessage = 'Your ride has been completed';
      }
      
      // Emit notification to passenger
      emitNotification(ride.passengerId, {
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: { rideId },
        priority: status === 'arrived' ? 'high' : 'medium',
      });
      
      // Commit transaction
      await transaction.commit();
      
      // Format response
      const responseData = {
        id: ride.id,
        status,
        passenger: {
          id: ride.passengerId,
        },
        updatedAt: new Date().toISOString(),
        ...(status === 'completed' && {
          earnings: (parseFloat(updateData.actualFare) * riderCommission).toFixed(2),
          fare: parseFloat(updateData.actualFare),
          distance: updateData.actualDistance || ride.estimatedDistance,
          duration: updateData.actualDuration || ride.estimatedDuration,
        }),
      };
      
      return res.status(200).json({
        status: 'success',
        data: responseData,
      });
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get active ride for the rider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getActiveRide = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Get active ride from database
    const ride = await Ride.findOne({
      where: {
        riderId,
        status: {
          [Op.in]: ['accepted', 'arrived', 'started']
        }
      },
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'profilePicture']
        }
      ]
    });
    
    if (!ride) {
      return res.status(200).json({
        status: 'success',
        data: null,
      });
    }
    
    // Format response data
    const responseData = {
      id: ride.id,
      status: ride.status,
      passenger: {
        id: ride.passenger.id,
        name: `${ride.passenger.firstName} ${ride.passenger.lastName}`,
        phone: ride.passenger.phoneNumber,
        photo: ride.passenger.profilePicture,
      },
      pickupLocation: {
        latitude: ride.pickupLocation.coordinates[1],
        longitude: ride.pickupLocation.coordinates[0],
        address: ride.pickupAddress,
      },
      dropoffLocation: {
        latitude: ride.dropoffLocation.coordinates[1],
        longitude: ride.dropoffLocation.coordinates[0],
        address: ride.dropoffAddress,
      },
      fare: parseFloat(ride.estimatedFare),
      distance: ride.estimatedDistance,
      duration: ride.estimatedDuration,
      requestedAt: ride.requestedAt.toISOString(),
      acceptedAt: ride.acceptedAt ? ride.acceptedAt.toISOString() : null,
      arrivedAt: ride.arrivedAt ? ride.arrivedAt.toISOString() : null,
      startedAt: ride.startedAt ? ride.startedAt.toISOString() : null,
      paymentMethod: ride.paymentMethod,
    };
    
    return res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ride history for the rider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRiderRideHistory = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Get rides from database
    const { count, rows: rides } = await Ride.findAndCountAll({
      where: {
        riderId,
        status: {
          [Op.in]: ['completed', 'cancelled']
        }
      },
      include: [
        {
          model: User,
          as: 'passenger',
          attributes: ['id', 'firstName', 'lastName', 'profilePicture']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    
    // Format response data
    const formattedRides = rides.map(ride => ({
      id: ride.id,
      status: ride.status,
      passenger: {
        id: ride.passenger.id,
        name: `${ride.passenger.firstName} ${ride.passenger.lastName}`,
        photo: ride.passenger.profilePicture,
      },
      pickupLocation: {
        address: ride.pickupAddress,
      },
      dropoffLocation: {
        address: ride.dropoffAddress,
      },
      fare: parseFloat(ride.actualFare || ride.estimatedFare),
      distance: ride.actualDistance || ride.estimatedDistance,
      duration: ride.actualDuration || ride.estimatedDuration,
      completedAt: ride.completedAt ? ride.completedAt.toISOString() : null,
      cancelledAt: ride.cancelledAt ? ride.cancelledAt.toISOString() : null,
      rating: ride.passengerRating,
      paymentMethod: ride.paymentMethod,
      earnings: parseFloat(ride.actualFare || ride.estimatedFare) * 0.8,
    }));
    
    return res.status(200).json({
      status: 'success',
      data: formattedRides,
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
 * Update rider location
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateRiderLocation = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const { latitude, longitude, heading, speed, accuracy } = req.body;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Validate location data
    if (!latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude and longitude are required',
      });
    }
    
    // Create location point
    const location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
    
    // Update or create rider location
    const [riderLocation, created] = await RiderLocation.upsert({
      riderId,
      location,
      heading,
      speed,
      accuracy,
      updatedAt: new Date(),
    });
    
    // Check if rider has an active ride
    const activeRide = await Ride.findOne({
      where: {
        riderId,
        status: {
          [Op.in]: ['accepted', 'arrived', 'started']
        }
      },
    });
    
    if (activeRide) {
      // Update ride with real-time location
      // This could potentially be handled by the socket service instead
      // to avoid duplicating this logic
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        location: {
          latitude,
          longitude,
        },
        heading,
        speed,
        accuracy,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update rider availability
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateRiderAvailability = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const { isAvailable } = req.body;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Validate availability
    if (isAvailable === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'isAvailable field is required',
      });
    }
    
    // Check if rider has an active ride
    if (isAvailable === false) {
      const activeRide = await Ride.findOne({
        where: {
          riderId,
          status: {
            [Op.in]: ['accepted', 'arrived', 'started']
          }
        },
      });
      
      if (activeRide) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot go offline while you have an active ride',
        });
      }
    }
    
    // Update rider availability
    const [affected, locations] = await RiderLocation.update(
      {
        isAvailable,
      },
      {
        where: { riderId },
        returning: true,
      }
    );
    
    if (affected === 0) {
      // If no rider location exists, create one with default values
      await RiderLocation.create({
        riderId,
        location: {
          type: 'Point',
          coordinates: [0, 0], // Default coordinates
        },
        isAvailable,
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        isAvailable,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rider earnings summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRiderEarningsSummary = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Get rider balance
    const riderBalance = await RiderBalance.findOne({
      where: { riderId },
    });
    
    if (!riderBalance) {
      return res.status(200).json({
        status: 'success',
        data: {
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalPaidOut: 0,
          todayEarnings: 0,
          weeklyEarnings: 0,
          monthlyEarnings: 0,
          ridesCompleted: 0,
          currency: 'NGN',
        },
      });
    }
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Get start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate today's earnings
    const todayEarnings = await RiderEarnings.sum('amount', {
      where: {
        riderId,
        type: 'ride_fare',
        createdAt: {
          [Op.gte]: today,
        },
      },
    }) || 0;
    
    // Calculate weekly earnings
    const weeklyEarnings = await RiderEarnings.sum('amount', {
      where: {
        riderId,
        type: 'ride_fare',
        createdAt: {
          [Op.gte]: startOfWeek,
        },
      },
    }) || 0;
    
    // Calculate monthly earnings
    const monthlyEarnings = await RiderEarnings.sum('amount', {
      where: {
        riderId,
        type: 'ride_fare',
        createdAt: {
          [Op.gte]: startOfMonth,
        },
      },
    }) || 0;
    
    // Count completed rides
    const ridesCompleted = await Ride.count({
      where: {
        riderId,
        status: 'completed',
      },
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        availableBalance: parseFloat(riderBalance.availableBalance),
        pendingBalance: parseFloat(riderBalance.pendingBalance),
        totalEarned: parseFloat(riderBalance.totalEarned),
        totalPaidOut: parseFloat(riderBalance.totalPaidOut),
        todayEarnings: parseFloat(todayEarnings),
        weeklyEarnings: parseFloat(weeklyEarnings),
        monthlyEarnings: parseFloat(monthlyEarnings),
        ridesCompleted,
        currency: riderBalance.currency || 'NGN',
        lastPayoutDate: riderBalance.lastPayoutDate ? riderBalance.lastPayoutDate.toISOString() : null,
        lastPayoutAmount: riderBalance.lastPayoutAmount ? parseFloat(riderBalance.lastPayoutAmount) : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get rider earnings history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRiderEarningsHistory = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Get earnings history from database
    const { count, rows: earnings } = await RiderEarnings.findAndCountAll({
      where: { riderId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Ride,
          as: 'ride',
          attributes: ['id', 'pickupAddress', 'dropoffAddress'],
          required: false,
        },
      ],
    });
    
    // Format response data
    const formattedEarnings = earnings.map(earning => ({
      id: earning.id,
      type: earning.type,
      amount: parseFloat(earning.amount),
      status: earning.status,
      date: earning.createdAt.toISOString(),
      description: earning.description,
      rideId: earning.rideId,
      rideDetails: earning.ride ? {
        pickupAddress: earning.ride.pickupAddress,
        dropoffAddress: earning.ride.dropoffAddress,
      } : null,
      currency: earning.currency,
    }));
    
    return res.status(200).json({
      status: 'success',
      data: formattedEarnings,
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
 * Request a cashout for available earnings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestCashout = async (req, res, next) => {
  try {
    const riderId = req.user.id;
    const { amount, payoutMethod, accountDetails } = req.body;
    
    // Validate user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only riders can access this endpoint',
      });
    }
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than 0',
      });
    }
    
    // Validate payout method
    if (!payoutMethod) {
      return res.status(400).json({
        status: 'error',
        message: 'Payout method is required',
      });
    }
    
    // Verify valid payout method
    const validPayoutMethods = ['bank_transfer', 'mobile_money', 'cash'];
    if (!validPayoutMethods.includes(payoutMethod)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payout method. Must be one of: bank_transfer, mobile_money, cash',
      });
    }
    
    // Begin transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Get rider balance
      const riderBalance = await RiderBalance.findOne({
        where: { riderId },
        transaction,
      });
      
      if (!riderBalance) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: 'Rider balance not found',
        });
      }
      
      // Check if rider has enough available balance
      if (parseFloat(riderBalance.availableBalance) < amount) {
        await transaction.rollback();
        return res.status(400).json({
          status: 'error',
          message: `Insufficient available balance. You have ${riderBalance.availableBalance} ${riderBalance.currency} available.`,
        });
      }
      
      // Create payout request
      const payout = await RiderPayout.create({
        id: uuidv4(),
        riderId,
        amount,
        currency: riderBalance.currency || 'NGN',
        status: 'requested',
        payoutMethod,
        accountDetails,
        requestedAt: new Date(),
      }, { transaction });
      
      // Update rider balance
      await riderBalance.update({
        availableBalance: sequelize.literal(`"availableBalance" - ${amount}`),
        pendingBalance: sequelize.literal(`"pendingBalance" + ${amount}`),
      }, { transaction });
      
      // Create earnings record for the payout
      await RiderEarnings.create({
        id: uuidv4(),
        riderId,
        amount: -amount, // Negative amount for payouts
        type: 'payout',
        status: 'processing',
        description: `Payout requested via ${payoutMethod}`,
        transactionDate: new Date(),
        currency: riderBalance.currency || 'NGN',
      }, { transaction });
      
      // Commit transaction
      await transaction.commit();
      
      // Send notification to rider
      emitNotification(riderId, {
        type: 'payout_processed',
        title: 'Cashout Requested',
        message: `Your cashout request for ${amount} ${payout.currency} has been submitted and is being processed.`,
        data: { 
          payoutId: payout.id,
          amount,
          currency: payout.currency,
          status: 'requested',
        },
        priority: 'medium',
      });
      
      return res.status(200).json({
        status: 'success',
        data: {
          id: payout.id,
          amount: parseFloat(payout.amount),
          currency: payout.currency,
          status: payout.status,
          payoutMethod: payout.payoutMethod,
          requestedAt: payout.requestedAt.toISOString(),
          estimatedProcessingTime: '1-3 business days',
        },
      });
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableRides,
  acceptRide,
  rejectRide,
  updateRideStatus,
  getActiveRide,
  getRiderRideHistory,
  updateRiderLocation,
  updateRiderAvailability,
  getRiderEarningsSummary,
  getRiderEarningsHistory,
  requestCashout,
};
