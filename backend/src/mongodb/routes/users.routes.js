/**
 * User Routes for MongoDB
 * Handles API endpoints for user management
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { isAdmin, isModeratorOrAdmin } = require('../middlewares/role.middleware');
const User = require('../models/User');
const mongoose = require('mongoose');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('users', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('users', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('users', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('users', 'debug', message, metadata)
};

const router = express.Router();

/**
 * @route GET /api/v1/mongo/users
 * @desc Get all users with filtering and pagination
 * @access Private (Admin)
 */
router.get('/', authenticate, isModeratorOrAdmin, async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      search = '',
      sort = '-createdAt',
      role,
      isActive,
    } = req.query;

    const queryOptions = {};
    
    // Handle search
    if (search) {
      queryOptions['$or'] = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
  // Handle role filter
  if (role && role !== 'all') {
    queryOptions.role = role;
  }
    
    // Handle active status filter
    if (isActive !== undefined) {
      queryOptions.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination and sorting
    const [users, total] = await Promise.all([
      User.find(queryOptions)
        .select('-password -resetToken -resetTokenExpiry')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(queryOptions)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/users/:id
 * @desc Get a single user by ID
 * @access Private (Admin or Moderator)
 */
router.get('/:id', authenticate, isModeratorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(id)
      .select('-password -resetToken -resetTokenExpiry')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/users
 * @desc Create a new user
 * @access Private (Admin)
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, roles, password } = req.body;
    
    // Check if email is provided
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phoneNumber,
      roles: roles || ['user'],
      password: password || Math.random().toString(36).slice(-8), // Generate random password if not provided
    });
    
    await newUser.save();
    
    // Return user without sensitive fields
    const user = await User.findById(newUser._id)
      .select('-password -resetToken -resetTokenExpiry')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/users/:id
 * @desc Update an existing user
 * @access Private (Admin)
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phoneNumber, isActive } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (isActive !== undefined) user.isActive = isActive;
    
    await user.save();
    
    // Return updated user without sensitive fields
    const updatedUser = await User.findById(id)
      .select('-password -resetToken -resetTokenExpiry')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/users/:id
 * @desc Delete a user
 * @access Private (Admin)
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Prevent deleting yourself
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    const result = await User.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/users/:id/roles
 * @desc Update user roles
 * @access Private (Admin)
 */
router.put('/:id/roles', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, roles } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Accept either single role or first item of roles array
    const newRole = role || (Array.isArray(roles) && roles.length > 0 ? roles[0] : null);
    
    if (!newRole) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent removing admin role from yourself
    if (id === req.user._id.toString() && 
        req.user.role === 'admin' && 
        newRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin role'
      });
    }
    
    // Update role
    user.role = newRole;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: { role: user.role }
    });
  } catch (error) {
    logger.error(`Error updating roles for user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user roles',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/users/:id/lock-status
 * @desc Lock or unlock a user account
 * @access Private (Admin)
 */
router.put('/:id/lock-status', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { locked } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    if (locked === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Locked status is required'
      });
    }
    
    // Prevent locking yourself
    if (id === req.user._id.toString() && locked) {
      return res.status(400).json({
        success: false,
        message: 'You cannot lock your own account'
      });
    }
    
    // Find and update user
    const user = await User.findByIdAndUpdate(
      id,
      { isLocked: locked },
      { new: true }
    ).select('-password -resetToken -resetTokenExpiry');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: `User ${locked ? 'locked' : 'unlocked'} successfully`,
      data: { user }
    });
  } catch (error) {
    logger.error(`Error updating lock status for user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user lock status',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/users/:id/reset-password
 * @desc Reset a user's password and send reset email
 * @access Private (Admin)
 */
router.post('/:id/reset-password', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    
    // Update user with reset token
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    // Here you would typically send an email with the reset link
    // This is just a placeholder - you'd use your email service here
    try {
      const emailService = require('../../services/email.service');
      await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (emailError) {
      logger.error(`Error sending password reset email to user ${id}:`, emailError);
      // Continue even if email fails - we'll just tell the admin it worked
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset initiated successfully'
    });
  } catch (error) {
    logger.error(`Error resetting password for user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset user password',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/users/stats
 * @desc Get user statistics
 * @access Private (Admin)
 */
router.get('/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const [total, active, riders, admins, recent] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'rider' }),
      User.countDocuments({ role: 'admin' }),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email createdAt')
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          total,
          active,
          riders,
          admins,
          inactive: total - active
        },
        recentUsers: recent
      }
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/users/:id/activity
 * @desc Get user activity
 * @access Private (Admin)
 */
router.get('/:id/activity', authenticate, isModeratorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // First verify the user exists
    const userExists = await User.exists({ _id: id });
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get the most recent 20 rides
    const rides = await mongoose.model('Ride').find(
      { userId: id },
      'status createdAt updatedAt fare origin destination'
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Get the most recent 20 notifications
    const notifications = await mongoose.model('Notification').find(
      { userId: id },
      'type title message isRead createdAt'
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Get the most recent 20 payments
    const payments = await mongoose.model('Transaction').find(
      { userId: id },
      'type amount status reference createdAt'
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    return res.status(200).json({
      success: true,
      data: {
        rides,
        notifications,
        payments
      }
    });
  } catch (error) {
    logger.error(`Error fetching activity for user ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/users/rider-stats
 * @desc Get rider statistics for dashboard
 * @access Private (authenticated rider)
 */
router.get('/rider-stats', authenticate, async (req, res) => {
  try {
    const userId = req.query.riderId || req.user._id;
    
    // Find user
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }
    
    // Get completed rides count for completion rate calculation
    const ridesCollection = mongoose.connection.collection('rides');
    const totalRidesAssigned = await ridesCollection.countDocuments({ 
      riderId: mongoose.Types.ObjectId(userId)
    });
    
    const completedRides = await ridesCollection.countDocuments({ 
      riderId: mongoose.Types.ObjectId(userId), 
      status: 'completed'
    });
    
    // Get accepted vs rejected requests for acceptance rate
    const acceptedRequests = await ridesCollection.countDocuments({
      riderId: mongoose.Types.ObjectId(userId),
      accepted: true
    });
    
    const totalRequests = await ridesCollection.countDocuments({
      riderId: mongoose.Types.ObjectId(userId),
      $or: [{ accepted: true }, { accepted: false }]
    });
    
    // Calculate real stats
    const completionRate = totalRidesAssigned > 0 
      ? Math.round((completedRides / totalRidesAssigned) * 100) 
      : 100;
      
    const acceptanceRate = totalRequests > 0
      ? Math.round((acceptedRequests / totalRequests) * 100)
      : 100;
    
    // Get rider rating from profile
    let averageRating = 0;
    if (user.riderProfile && typeof user.riderProfile.averageRating === 'number') {
      averageRating = user.riderProfile.averageRating;
    } else {
      // Calculate from ratings if not pre-computed
      const ratingsCollection = mongoose.connection.collection('ratings');
      const ratingResult = await ratingsCollection.aggregate([
        { $match: { riderId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } }
      ]).toArray();
      
      if (ratingResult.length > 0 && ratingResult[0].averageRating) {
        averageRating = parseFloat(ratingResult[0].averageRating.toFixed(1));
      } else {
        // For new riders without any ratings yet, calculate system average
        const systemAverageRating = await ratingsCollection.aggregate([
          { $group: { _id: null, averageRating: { $avg: "$rating" } } }
        ]).toArray();
        
        if (systemAverageRating.length > 0 && systemAverageRating[0].averageRating) {
          // Use system average if available
          averageRating = parseFloat(systemAverageRating[0].averageRating.toFixed(1));
        } else {
          // Only if there are no ratings in the entire system, use a fair starting value
          averageRating = 0; // Shows as "New" in the UI
        }
        
        // Log that we're using a calculated rating
        logger.info(`Using calculated rating for rider ${userId} with no reviews`);
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        stats: {
          averageRating,
          totalTrips: completedRides || 0,
          completionRate,
          acceptanceRate
        }
      }
    });
  } catch (error) {
    logger.error(`Error fetching rider stats:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch rider statistics',
      error: error.message
    });
  }
});

module.exports = router;
