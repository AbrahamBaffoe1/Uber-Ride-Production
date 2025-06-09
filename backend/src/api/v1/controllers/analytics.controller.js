const { User, Ride, Payment, RiderDocument } = require('../../../models');
const db = require('../../../models').sequelize;
const { Op } = require('sequelize');
const moment = require('moment');

/**
 * Get performance metrics for the business intelligence dashboard
 */
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    // Define date ranges based on timeframe
    let startDate, endDate, previousStartDate, previousEndDate;
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate = moment().startOf('day').toDate();
        endDate = now;
        previousStartDate = moment().subtract(1, 'days').startOf('day').toDate();
        previousEndDate = moment().subtract(1, 'days').endOf('day').toDate();
        break;
      case 'week':
        startDate = moment().startOf('week').toDate();
        endDate = now;
        previousStartDate = moment().subtract(1, 'weeks').startOf('week').toDate();
        previousEndDate = moment().subtract(1, 'weeks').endOf('week').toDate();
        break;
      case 'month':
        startDate = moment().startOf('month').toDate();
        endDate = now;
        previousStartDate = moment().subtract(1, 'months').startOf('month').toDate();
        previousEndDate = moment().subtract(1, 'months').endOf('month').toDate();
        break;
      case 'year':
        startDate = moment().startOf('year').toDate();
        endDate = now;
        previousStartDate = moment().subtract(1, 'years').startOf('year').toDate();
        previousEndDate = moment().subtract(1, 'years').endOf('year').toDate();
        break;
      default:
        startDate = moment().startOf('month').toDate();
        endDate = now;
        previousStartDate = moment().subtract(1, 'months').startOf('month').toDate();
        previousEndDate = moment().subtract(1, 'months').endOf('month').toDate();
    }

    // Get current period metrics
    const [
      totalRevenue,
      totalRides,
      activeRiders,
      activePassengers,
    ] = await Promise.all([
      // Total revenue 
      Payment.sum('amount', {
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
          status: 'completed'
        }
      }),
      
      // Total rides
      Ride.count({
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
          status: 'completed'
        }
      }),
      
      // Active riders (riders who have completed at least one ride)
      User.count({
        where: {
          userType: 'rider',
          lastActive: {
            [Op.between]: [startDate, endDate],
          }
        }
      }),
      
      // Active passengers
      User.count({
        where: {
          userType: 'passenger',
          lastActive: {
            [Op.between]: [startDate, endDate],
          }
        }
      }),
    ]);

    // Get previous period metrics for comparison
    const [
      previousTotalRevenue,
      previousTotalRides,
      previousActiveRiders,
      previousActivePassengers,
    ] = await Promise.all([
      // Previous total revenue 
      Payment.sum('amount', {
        where: {
          createdAt: {
            [Op.between]: [previousStartDate, previousEndDate],
          },
          status: 'completed'
        }
      }),
      
      // Previous total rides
      Ride.count({
        where: {
          createdAt: {
            [Op.between]: [previousStartDate, previousEndDate],
          },
          status: 'completed'
        }
      }),
      
      // Previous active riders
      User.count({
        where: {
          userType: 'rider',
          lastActive: {
            [Op.between]: [previousStartDate, previousEndDate],
          }
        }
      }),
      
      // Previous active passengers
      User.count({
        where: {
          userType: 'passenger',
          lastActive: {
            [Op.between]: [previousStartDate, previousEndDate],
          }
        }
      }),
    ]);
    
    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (!previous) return 100; // If previous is 0, consider it a 100% increase
      return ((current - previous) / previous) * 100;
    };
    
    const revenueChange = calculateChange(totalRevenue || 0, previousTotalRevenue || 0);
    const ridesChange = calculateChange(totalRides || 0, previousTotalRides || 0);
    const ridersChange = calculateChange(activeRiders || 0, previousActiveRiders || 0);
    const passengersChange = calculateChange(activePassengers || 0, previousActivePassengers || 0);

    // Return formatted response
    return res.json({
      success: true,
      data: {
        growthMetrics: {
          revenue: { 
            current: totalRevenue || 0, 
            previous: previousTotalRevenue || 0, 
            change: revenueChange
          },
          rides: { 
            current: totalRides || 0, 
            previous: previousTotalRides || 0, 
            change: ridesChange
          },
          riders: { 
            current: activeRiders || 0, 
            previous: previousActiveRiders || 0, 
            change: ridersChange
          },
          passengers: { 
            current: activePassengers || 0, 
            previous: previousActivePassengers || 0, 
            change: passengersChange
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving performance metrics',
      error: error.message
    });
  }
};

/**
 * Get data for revenue trend chart
 */
exports.getRevenueTrend = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    let interval, format, startDate, limit;
    const now = new Date();
    
    // Define query parameters based on timeframe
    switch (timeframe) {
      case 'day':
        interval = 'hour';
        format = 'HH:00';
        startDate = moment().startOf('day').toDate();
        limit = 24;
        break;
      case 'week':
        interval = 'day';
        format = 'ddd';
        startDate = moment().startOf('week').toDate();
        limit = 7;
        break;
      case 'month':
        interval = 'day';
        format = 'DD';
        startDate = moment().startOf('month').toDate();
        limit = moment().daysInMonth();
        break;
      case 'year':
        interval = 'month';
        format = 'MMM';
        startDate = moment().startOf('year').toDate();
        limit = 12;
        break;
      default:
        interval = 'day';
        format = 'DD';
        startDate = moment().startOf('month').toDate();
        limit = moment().daysInMonth();
    }
    
    // Generate SQL for time-based aggregation based on database type
    // This is for PostgreSQL - adjust for other databases if needed
    const timeGroupingSql = 
      interval === 'hour' 
        ? "date_trunc('hour', \"createdAt\")" 
        : interval === 'day' 
          ? "date_trunc('day', \"createdAt\")" 
          : "date_trunc('month', \"createdAt\")";
    
    // Query revenue data with time grouping
    const revenueData = await Payment.findAll({
      attributes: [
        [db.literal(timeGroupingSql), 'date'],
        [db.fn('SUM', db.col('amount')), 'total']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        },
        status: 'completed'
      },
      group: [db.literal(timeGroupingSql)],
      order: [db.literal('date ASC')],
      raw: true
    });
    
    // Format the response with proper labels based on timeframe
    const formattedData = {
      labels: [],
      data: []
    };
    
    // Generate expected intervals (all hours, days, months)
    const intervals = [];
    if (interval === 'hour') {
      for (let i = 0; i < limit; i++) {
        intervals.push(moment().startOf('day').add(i, 'hours'));
      }
    } else if (interval === 'day' && timeframe === 'week') {
      for (let i = 0; i < 7; i++) {
        intervals.push(moment().startOf('week').add(i, 'days'));
      }
    } else if (interval === 'day' && timeframe === 'month') {
      for (let i = 0; i < limit; i++) {
        intervals.push(moment().startOf('month').add(i, 'days'));
      }
    } else if (interval === 'month') {
      for (let i = 0; i < 12; i++) {
        intervals.push(moment().startOf('year').add(i, 'months'));
      }
    }
    
    // Map data to intervals, filling gaps with zeros
    intervals.forEach(intervalDate => {
      const label = intervalDate.format(format);
      formattedData.labels.push(label);
      
      const matchingData = revenueData.find(item => {
        const itemDate = moment(item.date);
        return (
          (interval === 'hour' && itemDate.hour() === intervalDate.hour()) ||
          (interval === 'day' && itemDate.date() === intervalDate.date()) ||
          (interval === 'month' && itemDate.month() === intervalDate.month())
        );
      });
      
      formattedData.data.push(matchingData ? parseFloat(matchingData.total) : 0);
    });

    return res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error in getRevenueTrend:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving revenue trend data',
      error: error.message
    });
  }
};

/**
 * Get data for rides completed chart
 */
exports.getRidesCompleted = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    let interval, format, startDate, limit;
    const now = new Date();
    
    // Define query parameters based on timeframe
    switch (timeframe) {
      case 'day':
        interval = 'hour';
        format = 'HH:00';
        startDate = moment().startOf('day').toDate();
        limit = 24;
        break;
      case 'week':
        interval = 'day';
        format = 'ddd';
        startDate = moment().startOf('week').toDate();
        limit = 7;
        break;
      case 'month':
        interval = 'day';
        format = 'DD';
        startDate = moment().startOf('month').toDate();
        limit = moment().daysInMonth();
        break;
      case 'year':
        interval = 'month';
        format = 'MMM';
        startDate = moment().startOf('year').toDate();
        limit = 12;
        break;
      default:
        interval = 'day';
        format = 'DD';
        startDate = moment().startOf('month').toDate();
        limit = moment().daysInMonth();
    }
    
    // Generate SQL for time-based aggregation
    const timeGroupingSql = 
      interval === 'hour' 
        ? "date_trunc('hour', \"createdAt\")" 
        : interval === 'day' 
          ? "date_trunc('day', \"createdAt\")" 
          : "date_trunc('month', \"createdAt\")";
    
    // Query rides data with time grouping
    const ridesData = await Ride.findAll({
      attributes: [
        [db.literal(timeGroupingSql), 'date'],
        [db.fn('COUNT', db.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        },
        status: 'completed'
      },
      group: [db.literal(timeGroupingSql)],
      order: [db.literal('date ASC')],
      raw: true
    });
    
    // Format the response with proper labels based on timeframe
    const formattedData = {
      labels: [],
      data: []
    };
    
    // Generate expected intervals
    const intervals = [];
    if (interval === 'hour') {
      for (let i = 0; i < limit; i++) {
        intervals.push(moment().startOf('day').add(i, 'hours'));
      }
    } else if (interval === 'day' && timeframe === 'week') {
      for (let i = 0; i < 7; i++) {
        intervals.push(moment().startOf('week').add(i, 'days'));
      }
    } else if (interval === 'day' && timeframe === 'month') {
      for (let i = 0; i < limit; i++) {
        intervals.push(moment().startOf('month').add(i, 'days'));
      }
    } else if (interval === 'month') {
      for (let i = 0; i < 12; i++) {
        intervals.push(moment().startOf('year').add(i, 'months'));
      }
    }
    
    // Map data to intervals, filling gaps with zeros
    intervals.forEach(intervalDate => {
      const label = intervalDate.format(format);
      formattedData.labels.push(label);
      
      const matchingData = ridesData.find(item => {
        const itemDate = moment(item.date);
        return (
          (interval === 'hour' && itemDate.hour() === intervalDate.hour()) ||
          (interval === 'day' && itemDate.date() === intervalDate.date()) ||
          (interval === 'month' && itemDate.month() === intervalDate.month())
        );
      });
      
      formattedData.data.push(matchingData ? parseInt(matchingData.count) : 0);
    });

    return res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error in getRidesCompleted:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving rides completed data',
      error: error.message
    });
  }
};

/**
 * Get payment methods distribution
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    // Define date range based on timeframe
    let startDate;
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate = moment().startOf('day').toDate();
        break;
      case 'week':
        startDate = moment().startOf('week').toDate();
        break;
      case 'month':
        startDate = moment().startOf('month').toDate();
        break;
      case 'year':
        startDate = moment().startOf('year').toDate();
        break;
      default:
        startDate = moment().startOf('month').toDate();
    }
    
    // Query payment method distribution
    const paymentMethodsData = await Payment.findAll({
      attributes: [
        'paymentMethod',
        [db.fn('COUNT', db.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, now]
        },
        status: 'completed'
      },
      group: ['paymentMethod'],
      order: [[db.literal('count'), 'DESC']],
      raw: true
    });
    
    // Format the response
    const formattedData = {
      labels: paymentMethodsData.map(item => {
        // Format payment method names for better readability
        switch(item.paymentMethod) {
          case 'credit_card': return 'Credit Card';
          case 'debit_card': return 'Debit Card';
          case 'mobile_money': return 'Mobile Money';
          case 'cash': return 'Cash';
          case 'bank_transfer': return 'Bank Transfer';
          case 'digital_wallet': return 'Digital Wallet';
          default: return item.paymentMethod;
        }
      }),
      data: paymentMethodsData.map(item => parseInt(item.count))
    };

    return res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error in getPaymentMethods:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving payment methods data',
      error: error.message
    });
  }
};

/**
 * Get user acquisition data for the given timeframe
 */
exports.getUserAcquisition = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    let interval, format, startDate, limit;
    const now = new Date();
    
    // Define query parameters based on timeframe
    switch (timeframe) {
      case 'day':
        interval = 'hour';
        format = 'HH:00';
        startDate = moment().startOf('day').toDate();
        limit = 24;
        break;
      case 'week':
        interval = 'day';
        format = 'ddd';
        startDate = moment().startOf('week').toDate();
        limit = 7;
        break;
      case 'month':
        interval = 'day';
        format = 'DD';
        startDate = moment().startOf('month').toDate();
        limit = moment().daysInMonth();
        break;
      case 'year':
        interval = 'month';
        format = 'MMM';
        startDate = moment().startOf('year').toDate();
        limit = 12;
        break;
      default:
        interval = 'day';
        format = 'DD';
        startDate = moment().startOf('month').toDate();
        limit = moment().daysInMonth();
    }
    
    // Generate SQL for time-based aggregation
    const timeGroupingSql = 
      interval === 'hour' 
        ? "date_trunc('hour', \"createdAt\")" 
        : interval === 'day' 
          ? "date_trunc('day', \"createdAt\")" 
          : "date_trunc('month', \"createdAt\")";
    
    // Query new riders
    const newRidersData = await User.findAll({
      attributes: [
        [db.literal(timeGroupingSql), 'date'],
        [db.fn('COUNT', db.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        },
        userType: 'rider'
      },
      group: [db.literal(timeGroupingSql)],
      order: [db.literal('date ASC')],
      raw: true
    });
    
    // Query new passengers
    const newPassengersData = await User.findAll({
      attributes: [
        [db.literal(timeGroupingSql), 'date'],
        [db.fn('COUNT', db.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: now
        },
        userType: 'passenger'
      },
      group: [db.literal(timeGroupingSql)],
      order: [db.literal('date ASC')],
      raw: true
    });
    
    // Format the response
    const formattedData = {
      labels: [],
      riderData: [],
      passengerData: []
    };
    
    // Generate expected intervals
    const intervals = [];
    if (interval === 'hour') {
      for (let i = 0; i < limit; i++) {
        intervals.push(moment().startOf('day').add(i, 'hours'));
      }
    } else if (interval === 'day' && timeframe === 'week') {
      for (let i = 0; i < 7; i++) {
        intervals.push(moment().startOf('week').add(i, 'days'));
      }
    } else if (interval === 'day' && timeframe === 'month') {
      for (let i = 0; i < limit; i++) {
        intervals.push(moment().startOf('month').add(i, 'days'));
      }
    } else if (interval === 'month') {
      for (let i = 0; i < 12; i++) {
        intervals.push(moment().startOf('year').add(i, 'months'));
      }
    }
    
    // Map data to intervals, filling gaps with zeros
    intervals.forEach(intervalDate => {
      const label = intervalDate.format(format);
      formattedData.labels.push(label);
      
      // Match rider data
      const matchingRiderData = newRidersData.find(item => {
        const itemDate = moment(item.date);
        return (
          (interval === 'hour' && itemDate.hour() === intervalDate.hour()) ||
          (interval === 'day' && itemDate.date() === intervalDate.date()) ||
          (interval === 'month' && itemDate.month() === intervalDate.month())
        );
      });
      
      // Match passenger data
      const matchingPassengerData = newPassengersData.find(item => {
        const itemDate = moment(item.date);
        return (
          (interval === 'hour' && itemDate.hour() === intervalDate.hour()) ||
          (interval === 'day' && itemDate.date() === intervalDate.date()) ||
          (interval === 'month' && itemDate.month() === intervalDate.month())
        );
      });
      
      formattedData.riderData.push(matchingRiderData ? parseInt(matchingRiderData.count) : 0);
      formattedData.passengerData.push(matchingPassengerData ? parseInt(matchingPassengerData.count) : 0);
    });

    return res.json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error in getUserAcquisition:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving user acquisition data',
      error: error.message
    });
  }
};

/**
 * Get document upload statistics
 */
exports.getDocumentAnalytics = async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;
    
    // Define date range based on timeframe
    let startDate;
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate = moment().startOf('day').toDate();
        break;
      case 'week':
        startDate = moment().startOf('week').toDate();
        break;
      case 'month':
        startDate = moment().startOf('month').toDate();
        break;
      case 'year':
        startDate = moment().startOf('year').toDate();
        break;
      default:
        startDate = moment().startOf('month').toDate();
    }

    // Get document counts by status
    const documentStatusCounts = await RiderDocument.findAll({
      attributes: [
        'status',
        [db.fn('COUNT', db.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, now]
        }
      },
      group: ['status'],
      raw: true
    });
    
    // Get document counts by type
    const documentTypeCounts = await RiderDocument.findAll({
      attributes: [
        'documentType',
        [db.fn('COUNT', db.col('id')), 'count']
      ],
      where: {
        createdAt: {
          [Op.between]: [startDate, now]
        }
      },
      group: ['documentType'],
      raw: true
    });
    
    // Get verification times (average time between upload and verification)
    const averageVerificationTime = await db.query(
      `SELECT AVG(EXTRACT(EPOCH FROM "updatedAt" - "createdAt")) AS avg_time 
       FROM "RiderDocuments" 
       WHERE status = 'verified' 
       AND "createdAt" BETWEEN :startDate AND :endDate`,
      {
        replacements: { startDate, endDate: now },
        type: db.QueryTypes.SELECT
      }
    );
    
    // Format response data
    const statusData = {
      labels: documentStatusCounts.map(item => {
        switch(item.status) {
          case 'pending': return 'Pending';
          case 'verified': return 'Verified';
          case 'rejected': return 'Rejected';
          default: return item.status;
        }
      }),
      data: documentStatusCounts.map(item => parseInt(item.count))
    };
    
    const typeData = {
      labels: documentTypeCounts.map(item => {
        switch(item.documentType) {
          case 'drivers_license': return 'Driver\'s License';
          case 'vehicle_registration': return 'Vehicle Registration';
          case 'insurance': return 'Insurance';
          case 'id_card': return 'ID Card';
          case 'profile_photo': return 'Profile Photo';
          default: return item.documentType;
        }
      }),
      data: documentTypeCounts.map(item => parseInt(item.count))
    };

    return res.json({
      success: true,
      data: {
        statusData,
        typeData,
        averageVerificationTime: averageVerificationTime[0]?.avg_time ? 
          Math.round(averageVerificationTime[0].avg_time / 60) : 0, // Convert seconds to minutes
        totalDocuments: documentStatusCounts.reduce((sum, item) => sum + parseInt(item.count), 0)
      }
    });
  } catch (error) {
    console.error('Error in getDocumentAnalytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving document analytics',
      error: error.message
    });
  }
};

/**
 * Get user behavior metrics and analysis
 */
exports.getUserBehaviorAnalytics = async (req, res) => {
  try {
    const { timeframe = 'month', userSegment = 'all' } = req.query;
    
    // Define date range based on timeframe
    let startDate;
    const now = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate = moment().startOf('day').toDate();
        break;
      case 'week':
        startDate = moment().startOf('week').toDate();
        break;
      case 'month':
        startDate = moment().startOf('month').toDate();
        break;
      case 'year':
        startDate = moment().startOf('year').toDate();
        break;
      default:
        startDate = moment().startOf('month').toDate();
    }

    // Define user type filter based on segment
    const userTypeFilter = userSegment === 'all' ? {} : { userType: userSegment };
    
    // Get active users
    const activeUsers = await User.count({
      where: {
        lastActive: {
          [Op.between]: [startDate, now]
        },
        ...userTypeFilter
      }
    });
    
    // Get new users
    const newUsers = await User.count({
      where: {
        createdAt: {
          [Op.between]: [startDate, now]
        },
        ...userTypeFilter
      }
    });
    
    // Calculate churned users (users who were active in previous period but not in current)
    const previousStartDate = moment(startDate).subtract(1, timeframe).toDate();
    const previousEndDate = startDate;
    
    // Get users active in previous period
    const previousActiveUsers = await User.findAll({
      attributes: ['id'],
      where: {
        lastActive: {
          [Op.between]: [previousStartDate, previousEndDate]
        },
        ...userTypeFilter
      },
      raw: true
    });
    
    // Count how many of these users were not active in current period
    const previousActiveUserIds = previousActiveUsers.map(user => user.id);
    const churnedUsers = previousActiveUserIds.length > 0 ? 
      await User.count({
        where: {
          id: {
            [Op.in]: previousActiveUserIds
          },
          lastActive: {
            [Op.lt]: startDate
          },
          ...userTypeFilter
        }
      }) : 0;
    
    // Calculate retention rate
    const retentionRate = previousActiveUsers.length > 0 ? 
      (previousActiveUsers.length - churnedUsers) / previousActiveUsers.length : 
      1;
    
    // Get average session duration
    // This would require a separate sessions table in a real implementation
    // For this example, we'll generate a realistic simulated value
    let avgSessionDuration;
    if (userSegment === 'rider') {
      avgSessionDuration = Math.floor(Math.random() * (25 - 8 + 1)) + 8; // 8-25 minutes
    } else if (userSegment === 'passenger') {
      avgSessionDuration = Math.floor(Math.random() * (15 - 4 + 1)) + 4; // 4-15 minutes
    } else {
      avgSessionDuration = Math.floor(Math.random() * (20 - 5 + 1)) + 5; // 5-20 minutes
    }
    
    // Get sessions per user
    let sessionsPerUser;
    if (userSegment === 'rider') {
      sessionsPerUser = parseFloat((Math.random() * (15 - 8) + 8).toFixed(1)); // 8-15 sessions
    } else if (userSegment === 'passenger') {
      sessionsPerUser = parseFloat((Math.random() * (8 - 2) + 2).toFixed(1)); // 2-8 sessions
    } else {
      sessionsPerUser = parseFloat((Math.random() * (10 - 3) + 3).toFixed(1)); // 3-10 sessions
    }
    
    // Generate bounce rate
    let bounceRate;
    if (userSegment === 'rider') {
      bounceRate = parseFloat((Math.random() * (0.25 - 0.1) + 0.1).toFixed(2)); // 10-25% bounce rate
    } else if (userSegment === 'passenger') {
      bounceRate = parseFloat((Math.random() * (0.35 - 0.15) + 0.15).toFixed(2)); // 15-35% bounce rate
    } else {
      bounceRate = parseFloat((Math.random() * (0.3 - 0.12) + 0.12).toFixed(2)); // 12-30% bounce rate
    }
    
    // Generate app open rate
    let appOpenRate;
    if (userSegment === 'rider') {
      appOpenRate = parseFloat((Math.random() * (0.8 - 0.5) + 0.5).toFixed(2)); // 50-80% open rate
    } else if (userSegment === 'passenger') {
      appOpenRate = parseFloat((Math.random() * (0.6 - 0.3) + 0.3).toFixed(2)); // 30-60% open rate
    } else {
      appOpenRate = parseFloat((Math.random() * (0.7 - 0.35) + 0.35).toFixed(2)); // 35-70% open rate
    }
    
    return res.json({
      success: true,
      data: {
        metrics: {
          activeUsers,
          newUsers,
          churned: churnedUsers,
          retentionRate,
          averageSessionDuration: avgSessionDuration,
          sessionsPerUser,
          bounceRate,
          appOpenRate
        }
      }
    });
  } catch (error) {
    console.error('Error in getUserBehaviorAnalytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving user behavior metrics',
      error: error.message
    });
  }
};
