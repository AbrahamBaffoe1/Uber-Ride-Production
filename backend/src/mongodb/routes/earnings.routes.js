/**
 * Earnings Routes for MongoDB
 * Handles API endpoints for rider earnings
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const User = require('../models/User');
const loggingService = require('../../services/logging.service');

// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('earnings', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('earnings', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('earnings', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('earnings', 'debug', message, metadata)
};

const router = express.Router();

/**
 * Helper function to check if user is a rider or has admin access
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} riderId - Rider ID to check against
 * @returns {boolean} True if authorized, false if not
 */
const isRiderOrAdmin = async (req, res, riderId) => {
  // Admin can access any rider's data
  if (req.user.role === 'admin') {
    return true;
  }
  
  // Rider can only access their own data
  return req.user._id.toString() === riderId.toString();
};

/**
 * @route GET /api/v1/mongo/earnings/summary
 * @desc Get rider's earnings summary
 * @access Private (rider or admin)
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    // Determine which rider ID to use
    let riderId = req.query.riderId || req.user._id;
    
    // Check if user has permission to view this rider's earnings
    if (!(await isRiderOrAdmin(req, res, riderId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own earnings data'
      });
    }
    
    // Get the rides collection
    const ridesCollection = mongoose.connection.collection('rides');
    
    // Get completed rides for the rider
    const completedRides = await ridesCollection.find({
      riderId: ObjectId(riderId),
      status: 'completed'
    }).toArray();
    
    // Get total earnings and rides
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let availableEarnings = 0;
    
    // Calculate earnings from completed rides
    completedRides.forEach(ride => {
      const amount = ride.fare?.riderAmount || ride.fare?.amount || 0;
      totalEarnings += amount;
      
      // Check if payment is processed and released to rider
      if (ride.paymentStatus === 'processed') {
        availableEarnings += amount;
      } else {
        pendingEarnings += amount;
      }
    });
    
    // Calculate earnings for different time periods
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate today's earnings
    const todayEarnings = completedRides
      .filter(ride => new Date(ride.completedAt) >= todayStart)
      .reduce((sum, ride) => sum + (ride.fare?.riderAmount || ride.fare?.amount || 0), 0);
    
    // Calculate this week's earnings
    const thisWeekEarnings = completedRides
      .filter(ride => new Date(ride.completedAt) >= weekStart)
      .reduce((sum, ride) => sum + (ride.fare?.riderAmount || ride.fare?.amount || 0), 0);
    
    // Calculate this month's earnings
    const thisMonthEarnings = completedRides
      .filter(ride => new Date(ride.completedAt) >= monthStart)
      .reduce((sum, ride) => sum + (ride.fare?.riderAmount || ride.fare?.amount || 0), 0);
    
    // Calculate total hours worked (approximate)
    const totalHours = completedRides.reduce((sum, ride) => {
      const startTime = new Date(ride.acceptedAt || ride.createdAt);
      const endTime = new Date(ride.completedAt);
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      return sum + (isNaN(durationHours) ? 0 : durationHours);
    }, 0);
    
    // Get last cashout if any
    const payoutsCollection = mongoose.connection.collection('payouts');
    const lastCashout = await payoutsCollection.findOne(
      { riderId: ObjectId(riderId) },
      { sort: { createdAt: -1 } }
    );
    
    // Format last cashout
    let formattedLastCashout = null;
    if (lastCashout) {
      formattedLastCashout = {
        amount: lastCashout.amount,
        date: lastCashout.createdAt,
        status: lastCashout.status
      };
    }
    
    // Return earnings summary
    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          total: totalEarnings,
          available: availableEarnings,
          pending: pendingEarnings,
          todayEarnings,
          thisWeekEarnings,
          thisMonthEarnings,
          totalRides: completedRides.length,
          totalHours: parseFloat(totalHours.toFixed(2)),
          currency: 'NGN', // Default to NGN for Nigerian service
          lastCashout: formattedLastCashout
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching earnings summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings summary',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/earnings/history
 * @desc Get rider's earnings history with pagination
 * @access Private (rider or admin)
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    // Determine which rider ID to use
    let riderId = req.query.riderId || req.user._id;
    
    // Check if user has permission to view this rider's earnings history
    if (!(await isRiderOrAdmin(req, res, riderId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own earnings history'
      });
    }
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get the transactions collection for history
    const transactionsCollection = mongoose.connection.collection('transactions');
    
    // Find all transactions for the rider
    const transactions = await transactionsCollection.find({
      riderId: ObjectId(riderId)
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Count total transactions for pagination
    const totalTransactions = await transactionsCollection.countDocuments({
      riderId: ObjectId(riderId)
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalTransactions / limit);
    
    // Format transactions for response
    const formattedTransactions = transactions.map(txn => ({
      _id: txn._id,
      date: txn.createdAt,
      amount: txn.amount,
      currency: txn.currency || 'NGN',
      rideId: txn.rideId,
      type: txn.type || 'ride',
      description: txn.description || 'Ride payment',
      status: txn.status || 'completed'
    }));
    
    // Return earnings history with pagination
    return res.status(200).json({
      status: 'success',
      data: {
        transactions: formattedTransactions,
        pagination: {
          totalPages,
          currentPage: page,
          totalItems: totalTransactions
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching earnings history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings history',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/earnings/cashout
 * @desc Request cashout of available earnings
 * @access Private (rider only)
 */
router.post('/cashout', authenticate, async (req, res) => {
  try {
    // Determine which rider ID to use
    let riderId = req.body.riderId || req.user._id;
    
    // Check if user has permission for this cashout
    if (!(await isRiderOrAdmin(req, res, riderId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only request cashout for your own account'
      });
    }
    
    const { amount, paymentMethod, accountDetails } = req.body;
    
    // Validate request
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }
    
    // Verify rider has enough available earnings
    const ridesCollection = mongoose.connection.collection('rides');
    const completedRides = await ridesCollection.find({
      riderId: ObjectId(riderId),
      status: 'completed',
      paymentStatus: 'processed' // Only count processed payments
    }).toArray();
    
    // Calculate available earnings
    const availableEarnings = completedRides.reduce((sum, ride) => {
      return sum + (ride.fare?.riderAmount || ride.fare?.amount || 0);
    }, 0);
    
    // Get total previously cashed out
    const payoutsCollection = mongoose.connection.collection('payouts');
    const previousPayouts = await payoutsCollection.find({
      riderId: ObjectId(riderId),
      status: { $in: ['completed', 'processing', 'pending'] }
    }).toArray();
    
    const totalPreviousCashouts = previousPayouts.reduce((sum, payout) => {
      return sum + payout.amount;
    }, 0);
    
    // Calculate remaining available balance
    const remainingBalance = availableEarnings - totalPreviousCashouts;
    
    // Check if rider has enough balance
    if (amount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ${remainingBalance}`
      });
    }
    
    // Create a new payout request
    const payoutData = {
      _id: new ObjectId(),
      riderId: ObjectId(riderId),
      amount,
      fee: amount * 0.01, // Example 1% fee
      netAmount: amount * 0.99,
      currency: 'NGN',
      status: 'pending',
      paymentMethod,
      accountDetails: accountDetails || {},
      estimatedArrivalTime: '24-48 hours',
      createdAt: new Date(),
      reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    
    // Insert the payout request
    await payoutsCollection.insertOne(payoutData);
    
    // Return success with payout details
    return res.status(200).json({
      status: 'success',
      message: 'Cashout request submitted successfully',
      data: {
        cashout: {
          _id: payoutData._id,
          amount: payoutData.amount,
          fee: payoutData.fee,
          netAmount: payoutData.netAmount,
          currency: payoutData.currency,
          status: payoutData.status,
          estimatedArrivalTime: payoutData.estimatedArrivalTime,
          createdAt: payoutData.createdAt,
          reference: payoutData.reference
        }
      }
    });
  } catch (error) {
    logger.error('Error processing cashout request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process cashout request',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/earnings/daily
 * @desc Get rider's earnings for a specific day (defaults to today)
 * @access Private (rider or admin)
 */
router.get('/daily', authenticate, async (req, res) => {
  try {
    // Determine which rider ID to use
    let riderId = req.query.riderId || req.user._id;
    
    // Check if user has permission to view this rider's earnings
    if (!(await isRiderOrAdmin(req, res, riderId))) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own earnings data'
      });
    }
    
    // Parse date parameter (defaults to today)
    const dateParam = req.query.date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(dateParam);
    
    // Ensure valid date
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.'
      });
    }
    
    // Set date range for the requested day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get the rides collection
    const ridesCollection = mongoose.connection.collection('rides');
    
    // Find completed rides for the specified day
    const completedRides = await ridesCollection.find({
      riderId: ObjectId(riderId),
      status: 'completed',
      completedAt: { 
        $gte: startOfDay, 
        $lte: endOfDay 
      }
    }).toArray();
    
    // Calculate total earnings for the day
    const totalEarnings = completedRides.reduce((sum, ride) => {
      return sum + (ride.fare?.riderAmount || ride.fare?.amount || 0);
    }, 0);
    
    // Return daily earnings
    return res.status(200).json({
      status: 'success',
      data: {
        earnings: {
          amount: totalEarnings,
          totalTrips: completedRides.length,
          currency: 'NGN', // Default to NGN for Nigerian service
          date: dateParam
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching daily earnings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch daily earnings',
      error: error.message
    });
  }
});

module.exports = router;
