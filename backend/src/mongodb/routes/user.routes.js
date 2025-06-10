/**
 * User Routes
 * Handles user profile and related endpoints
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;

const router = express.Router();

/**
 * @route GET /api/v1/mongo/users/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Find user and exclude sensitive fields
    const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          status: user.status,
          accountStatus: user.accountStatus,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // Include role-specific profile data
          ...(user.role === 'rider' && {
            riderProfile: user.riderProfile
          }),
          ...(user.role === 'passenger' && {
            passengerProfile: user.passengerProfile
          })
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile'
    });
  }
});

/**
 * @route PUT /api/v1/mongo/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const updates = req.body;
    
    // Fields that cannot be updated through this endpoint
    const restrictedFields = ['password', 'email', 'phoneNumber', 'role', 'status', 'accountStatus', 'isEmailVerified', 'isPhoneVerified'];
    
    // Remove restricted fields from updates
    restrictedFields.forEach(field => delete updates[field]);
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...updates,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          status: user.status,
          accountStatus: user.accountStatus,
          twoFactorEnabled: user.twoFactorEnabled,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ...(user.role === 'rider' && {
            riderProfile: user.riderProfile
          }),
          ...(user.role === 'passenger' && {
            passengerProfile: user.passengerProfile
          })
        }
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user profile'
    });
  }
});

/**
 * @route POST /api/v1/mongo/users/profile/photo
 * @desc Update user profile picture
 * @access Private
 */
router.post('/profile/photo', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile picture URL is required'
      });
    }
    
    // Update user profile picture
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        profilePicture,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update profile picture'
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/users/account
 * @desc Delete user account (soft delete)
 * @access Private
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to delete account'
      });
    }
    
    // Find user and verify password
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid password'
      });
    }
    
    // Soft delete - update account status
    user.accountStatus = 'suspended';
    user.status = 'inactive';
    user.updatedAt = new Date();
    await user.save();
    
    return res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete account'
    });
  }
});

/**
 * @route PUT /api/v1/mongo/users/settings/2fa
 * @desc Enable/disable two-factor authentication
 * @access Private
 */
router.put('/settings/2fa', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { enabled, method } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'Enabled status is required'
      });
    }
    
    const updateData = {
      twoFactorEnabled: enabled,
      updatedAt: new Date()
    };
    
    if (enabled && method) {
      if (!['sms', 'email', 'authenticator'].includes(method)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid 2FA method'
        });
      }
      updateData.twoFactorMethod = method;
    } else if (!enabled) {
      updateData.twoFactorMethod = null;
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('twoFactorEnabled twoFactorMethod');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod
      }
    });
  } catch (error) {
    console.error('Error updating 2FA settings:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update 2FA settings'
    });
  }
});

/**
 * @route PUT /api/v1/mongo/users/preferences/currency
 * @desc Update user's preferred currency
 * @access Private
 */
router.put('/preferences/currency', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { currencyCode } = req.body;
    
    if (!currencyCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Currency code is required'
      });
    }
    
    // Update user's preferred currency
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        preferredCurrency: currencyCode.toUpperCase(),
        updatedAt: new Date()
      },
      { new: true }
    ).select('preferredCurrency');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Currency preference updated successfully',
      data: {
        preferredCurrency: user.preferredCurrency
      }
    });
  } catch (error) {
    console.error('Error updating currency preference:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update currency preference'
    });
  }
});

/**
 * @route GET /api/v1/mongo/users/rider-stats
 * @desc Get rider's statistics and performance metrics
 * @access Private (rider only)
 */
router.get('/rider-stats', authenticate, async (req, res) => {
  try {
    // Determine which rider ID to use
    let riderId = req.query.riderId || req.user._id;
    
    // Check if user is a rider or admin
    if (req.user.role !== 'rider' && req.user.role !== 'admin' && req.user._id.toString() !== riderId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only view your own rider stats.'
      });
    }
    
    // Get the rides collection
    const ridesCollection = mongoose.connection.collection('rides');
    
    // Get all rides for this rider
    const allRides = await ridesCollection.find({
      riderId: ObjectId(riderId)
    }).toArray();
    
    // Get completed rides
    const completedRides = allRides.filter(ride => ride.status === 'completed');
    
    // Get cancelled rides
    const cancelledRides = allRides.filter(ride => ride.status === 'cancelled');
    
    // Calculate completion rate
    const totalRides = allRides.length;
    const completionRate = totalRides > 0 
      ? (completedRides.length / totalRides) * 100 
      : 0;
    
    // Calculate acceptance rate
    const acceptedRides = allRides.filter(ride => ride.status !== 'rejected');
    const acceptanceRate = totalRides > 0 
      ? (acceptedRides.length / totalRides) * 100 
      : 0;
    
    // Calculate ratings
    let totalRating = 0;
    let totalRatings = 0;
    
    completedRides.forEach(ride => {
      if (ride.rating && ride.rating > 0) {
        totalRating += ride.rating;
        totalRatings += 1;
      }
    });
    
    const averageRating = totalRatings > 0 
      ? totalRating / totalRatings 
      : 0;
    
    // Calculate earnings
    const totalEarnings = completedRides.reduce((sum, ride) => {
      return sum + (ride.fare?.riderAmount || ride.fare?.amount || 0);
    }, 0);
    
    // Calculate weekly and monthly earnings
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    
    const weeklyEarnings = completedRides
      .filter(ride => new Date(ride.completedAt) >= weekStart)
      .reduce((sum, ride) => sum + (ride.fare?.riderAmount || ride.fare?.amount || 0), 0);
    
    const monthlyEarnings = completedRides
      .filter(ride => new Date(ride.completedAt) >= monthStart)
      .reduce((sum, ride) => sum + (ride.fare?.riderAmount || ride.fare?.amount || 0), 0);
    
    // Calculate peak hours (simplified version)
    const hourCounts = {};
    
    completedRides.forEach(ride => {
      if (ride.createdAt) {
        const hour = new Date(ride.createdAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    // Find the hour with most rides
    let peakHour = 0;
    let maxRides = 0;
    
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxRides) {
        maxRides = count;
        peakHour = parseInt(hour);
      }
    }
    
    // Compile and return rider stats
    return res.status(200).json({
      status: 'success',
      data: {
        riderId: riderId.toString(),
        totalEarnings,
        weeklyEarnings,
        monthlyEarnings,
        completedRides: completedRides.length,
        cancelledRides: cancelledRides.length,
        acceptanceRate: parseFloat(acceptanceRate.toFixed(1)),
        completionRate: parseFloat(completionRate.toFixed(1)),
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalRatings,
        peakHours: peakHour,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching rider stats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch rider statistics',
      error: error.message
    });
  }
});

export default router;
