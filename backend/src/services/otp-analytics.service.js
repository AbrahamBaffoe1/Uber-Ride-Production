/**
 * OTP Analytics Service
 * 
 * Provides analytics data for OTP usage across the application
 */
import { log } from './logging.service.js';
import OTP from '../mongodb/models/OTP.js';

/**
 * Get OTP analytics with various filters
 * @param {Object} options - Query options
 * @param {string} options.timeframe - 'day', 'week', 'month' or 'year'
 * @param {string} options.startDate - ISO string start date
 * @param {string} options.endDate - ISO string end date
 * @returns {Promise<Object>} Analytics data
 */
export const getOtpAnalytics = async (options = {}) => {
  try {
    const { timeframe = 'week', startDate, endDate } = options;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    } else {
      // Default date range based on timeframe
      const now = new Date();
      let startDateTime;
      
      switch(timeframe) {
        case 'day':
          startDateTime = new Date(now);
          startDateTime.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDateTime = new Date(now);
          startDateTime.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDateTime = new Date(now);
          startDateTime.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDateTime = new Date(now);
          startDateTime.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDateTime = new Date(now);
          startDateTime.setDate(now.getDate() - 7);
      }
      
      dateFilter.createdAt = { $gte: startDateTime };
    }
    
    // Get counts by status
    const [
      totalOtps,
      verified,
      expired,
      unused
    ] = await Promise.all([
      OTP.countDocuments(dateFilter),
      OTP.countDocuments({ ...dateFilter, status: 'verified' }),
      OTP.countDocuments({ ...dateFilter, status: 'expired' }),
      OTP.countDocuments({ ...dateFilter, status: 'unused' })
    ]);
    
    // Get time series data (simplified)
    const otpTimeSeries = await getOtpTimeSeriesData(timeframe, dateFilter);
    
    // Get hourly distribution
    const hourlyDistribution = await getHourlyDistribution(dateFilter);
    
    // Get verification time distribution
    const verificationTimeDistribution = await getVerificationTimeDistribution(dateFilter);
    
    return {
      success: true,
      data: {
        otpTimeSeries,
        otpByStatus: {
          verified,
          expired,
          unused
        },
        verificationTimeDistribution,
        hourlyDistribution
      }
    };
  } catch (error) {
    log('otp', 'error', 'Error getting OTP analytics:', { error });
    return {
      success: false,
      message: 'Failed to get OTP analytics',
      error: error.message
    };
  }
};

/**
 * Generate an OTP analytics report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Report data
 */
export const generateOtpReport = async (options = {}) => {
  try {
    const { timeframe = 'month', format = 'json', startDate, endDate } = options;
    
    // Get analytics data
    const analyticsData = await getOtpAnalytics({ timeframe, startDate, endDate });
    
    if (!analyticsData.success) {
      return analyticsData;
    }
    
    // Build report
    const reportId = `otp-${Date.now()}`;
    const reportData = {
      reportId,
      generatedAt: new Date().toISOString(),
      timeframe,
      dateRange: {
        startDate: startDate || 'auto',
        endDate: endDate || 'auto'
      },
      summary: {
        totalOTPs: analyticsData.data.otpByStatus.verified + 
                   analyticsData.data.otpByStatus.expired + 
                   analyticsData.data.otpByStatus.unused,
        successRate: calculateSuccessRate(analyticsData.data.otpByStatus),
        avgVerificationTime: calculateAvgVerificationTime(analyticsData.data.verificationTimeDistribution)
      },
      detailedStats: {
        byStatus: analyticsData.data.otpByStatus,
        byDeliveryMethod: await getDeliveryMethodBreakdown(timeframe, startDate, endDate)
      }
    };
    
    return {
      success: true,
      data: reportData
    };
  } catch (error) {
    log('otp', 'error', 'Error generating OTP report:', { error });
    return {
      success: false,
      message: 'Failed to generate OTP report',
      error: error.message
    };
  }
};

/**
 * Get OTP summary metrics
 * @param {string} period - 'day', 'week', 'month' or 'year'
 * @returns {Promise<Object>} Summary metrics
 */
export const getOtpSummaryMetrics = async (period = 'week') => {
  try {
    // Get current period data
    const currentPeriodData = await getOtpAnalytics({ timeframe: period });
    
    if (!currentPeriodData.success) {
      return currentPeriodData;
    }
    
    // Get previous period data for comparison
    const now = new Date();
    let previousStartDate, previousEndDate;
    
    switch(period) {
      case 'day':
        previousStartDate = new Date(now);
        previousStartDate.setDate(now.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate = new Date(now);
        previousEndDate.setDate(now.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        previousStartDate = new Date(now);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate = new Date(now);
        previousEndDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        previousStartDate = new Date(now);
        previousStartDate.setMonth(now.getMonth() - 2);
        previousEndDate = new Date(now);
        previousEndDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        previousStartDate = new Date(now);
        previousStartDate.setFullYear(now.getFullYear() - 2);
        previousEndDate = new Date(now);
        previousEndDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        previousStartDate = new Date(now);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate = new Date(now);
        previousEndDate.setDate(now.getDate() - 7);
    }
    
    const previousPeriodData = await getOtpAnalytics({ 
      startDate: previousStartDate.toISOString(), 
      endDate: previousEndDate.toISOString() 
    });
    
    // Calculate metrics
    const currentStats = currentPeriodData.data.otpByStatus;
    const previousStats = previousPeriodData.success ? previousPeriodData.data.otpByStatus : null;
    
    const totalGenerated = currentStats.verified + currentStats.expired + currentStats.unused;
    const successfulVerifications = currentStats.verified;
    const failedVerifications = currentStats.expired + currentStats.unused;
    const successRate = calculateSuccessRate(currentStats);
    const avgVerificationTime = calculateAvgVerificationTime(currentPeriodData.data.verificationTimeDistribution);
    
    // Calculate change from previous period
    let changeFromPrevious = {
      generated: 0,
      successRate: 0,
      verificationTime: 0
    };
    
    if (previousStats) {
      const prevTotalGenerated = previousStats.verified + previousStats.expired + previousStats.unused;
      const prevSuccessRate = calculateSuccessRate(previousStats);
      const prevAvgTime = previousPeriodData.success ? 
        calculateAvgVerificationTime(previousPeriodData.data.verificationTimeDistribution) : 0;
      
      if (prevTotalGenerated > 0) {
        changeFromPrevious.generated = ((totalGenerated - prevTotalGenerated) / prevTotalGenerated) * 100;
      }
      
      changeFromPrevious.successRate = successRate - prevSuccessRate;
      
      if (prevAvgTime > 0) {
        changeFromPrevious.verificationTime = ((avgVerificationTime - prevAvgTime) / prevAvgTime) * 100;
      }
    }
    
    return {
      success: true,
      data: {
        totalGenerated,
        successfulVerifications,
        failedVerifications,
        successRate,
        avgVerificationTime,
        changeFromPrevious
      }
    };
  } catch (error) {
    log('otp', 'error', 'Error getting OTP summary metrics:', { error });
    return {
      success: false,
      message: 'Failed to get OTP summary metrics',
      error: error.message
    };
  }
};

/**
 * Get OTP delivery methods data
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Delivery methods data
 */
export const getOtpDeliveryMethods = async (options = {}) => {
  try {
    const { period = 'week', startDate, endDate } = options;
    
    // Get delivery method breakdown
    const deliveryData = await getDeliveryMethodBreakdown(period, startDate, endDate);
    
    return {
      success: true,
      data: deliveryData
    };
  } catch (error) {
    log('otp', 'error', 'Error getting OTP delivery methods:', { error });
    return {
      success: false,
      message: 'Failed to get OTP delivery methods',
      error: error.message
    };
  }
};

/**
 * Get OTP user segments data
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User segments data
 */
export const getOtpUserSegments = async (options = {}) => {
  try {
    const { period = 'week', startDate, endDate } = options;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    } else {
      // Default date range based on period
      const now = new Date();
      let startDateTime;
      
      switch(period) {
        case 'day':
          startDateTime = new Date(now);
          startDateTime.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDateTime = new Date(now);
          startDateTime.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDateTime = new Date(now);
          startDateTime.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDateTime = new Date(now);
          startDateTime.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDateTime = new Date(now);
          startDateTime.setDate(now.getDate() - 7);
      }
      
      dateFilter.createdAt = { $gte: startDateTime };
    }
    
    // Find user OTPs
    const otpData = await OTP.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: 1,
          status: 1,
          createdAt: 1,
          userCreatedAt: '$user.createdAt',
          lastLoginAt: '$user.lastLoginAt'
        }
      }
    ]);
    
    // Process into user segments
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);
    
    let newUsers = 0;
    let returningUsers = 0;
    let dormantUsers = 0;
    
    const segmentStats = {
      newUsers: { verified: 0, total: 0 },
      returningUsers: { verified: 0, total: 0 },
      dormantUsers: { verified: 0, total: 0 }
    };
    
    otpData.forEach(otp => {
      const userCreatedAt = new Date(otp.userCreatedAt);
      const lastLoginAt = otp.lastLoginAt ? new Date(otp.lastLoginAt) : null;
      
      if (userCreatedAt >= thirtyDaysAgo) {
        // New user (created in last 30 days)
        newUsers++;
        segmentStats.newUsers.total++;
        if (otp.status === 'verified') {
          segmentStats.newUsers.verified++;
        }
      } else if (!lastLoginAt || lastLoginAt <= sixtyDaysAgo) {
        // Dormant user (no login in 60+ days)
        dormantUsers++;
        segmentStats.dormantUsers.total++;
        if (otp.status === 'verified') {
          segmentStats.dormantUsers.verified++;
        }
      } else {
        // Returning user
        returningUsers++;
        segmentStats.returningUsers.total++;
        if (otp.status === 'verified') {
          segmentStats.returningUsers.verified++;
        }
      }
    });
    
    // Calculate success rates
    const successRateBySegment = {
      newUsers: segmentStats.newUsers.total > 0 
        ? (segmentStats.newUsers.verified / segmentStats.newUsers.total) * 100 
        : 0,
      returningUsers: segmentStats.returningUsers.total > 0 
        ? (segmentStats.returningUsers.verified / segmentStats.returningUsers.total) * 100 
        : 0,
      dormantUsers: segmentStats.dormantUsers.total > 0 
        ? (segmentStats.dormantUsers.verified / segmentStats.dormantUsers.total) * 100 
        : 0
    };
    
    return {
      success: true,
      data: {
        newUsers,
        returningUsers,
        dormantUsers,
        successRateBySegment
      }
    };
  } catch (error) {
    log('otp', 'error', 'Error getting OTP user segments:', { error });
    return {
      success: false,
      message: 'Failed to get OTP user segments',
      error: error.message
    };
  }
};

// Helper functions

/**
 * Get OTP time series data
 * @param {string} timeframe - 'day', 'week', 'month' or 'year'
 * @param {Object} dateFilter - Date filter
 * @returns {Promise<Array>} Time series data
 */
const getOtpTimeSeriesData = async (timeframe, dateFilter) => {
  try {
    // Group by time interval based on timeframe
    let groupByFormat;
    
    switch(timeframe) {
      case 'day':
        groupByFormat = { 
          $dateToString: { format: '%H:00', date: '$createdAt' } 
        };
        break;
      case 'week':
        groupByFormat = { 
          $dateToString: { format: '%a', date: '$createdAt' } 
        };
        break;
      case 'month':
        groupByFormat = { 
          $dateToString: { format: '%m/%d', date: '$createdAt' } 
        };
        break;
      case 'year':
        groupByFormat = { 
          $dateToString: { format: '%b', date: '$createdAt' } 
        };
        break;
      default:
        groupByFormat = { 
          $dateToString: { format: '%a', date: '$createdAt' } 
        };
    }
    
    // Aggregate by time interval and status
    const result = await OTP.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            timeInterval: groupByFormat,
            status: '$status'
          },
          count: { $sum: 1 },
          timestamp: { $first: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$_id.timeInterval',
          statusCounts: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          timestamp: { $first: '$timestamp' }
        }
      },
      { $sort: { timestamp: 1 } }
    ]);
    
    // Transform to time series format
    return result.map(item => {
      const generated = item.statusCounts.reduce((sum, status) => sum + status.count, 0);
      const verified = item.statusCounts.find(s => s.status === 'verified')?.count || 0;
      const failed = generated - verified;
      
      return {
        timestamp: item.timestamp,
        name: item._id,
        generated,
        verified,
        failed
      };
    });
  } catch (error) {
    log('otp', 'error', 'Error getting OTP time series data:', { error });
    return [];
  }
};

/**
 * Get hourly OTP distribution
 * @param {Object} dateFilter - Date filter
 * @returns {Promise<Array>} Hourly distribution
 */
const getHourlyDistribution = async (dateFilter) => {
  try {
    const result = await OTP.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Fill in missing hours
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      count: 0
    }));
    
    result.forEach(item => {
      const hour = item._id;
      hourlyData[hour].count = item.count;
    });
    
    return hourlyData;
  } catch (error) {
    log('otp', 'error', 'Error getting hourly OTP distribution:', { error });
    return [];
  }
};

/**
 * Get verification time distribution
 * @param {Object} dateFilter - Date filter
 * @returns {Promise<Array>} Verification time distribution
 */
const getVerificationTimeDistribution = async (dateFilter) => {
  try {
    const result = await OTP.aggregate([
      { 
        $match: { 
          ...dateFilter,
          status: 'verified',
          verifiedAt: { $exists: true }
        } 
      },
      {
        $project: {
          verificationTime: {
            $divide: [
              { $subtract: ['$verifiedAt', '$createdAt'] },
              1000 // Convert to seconds
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$verificationTime',
          boundaries: [0, 15, 30, 60, 120, 300],
          default: '300+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Transform to distribution format
    const timeRanges = [
      { time: '0-15s', count: 0 },
      { time: '16-30s', count: 0 },
      { time: '31-60s', count: 0 },
      { time: '61-120s', count: 0 },
      { time: '120s+', count: 0 }
    ];
    
    result.forEach((bucket, index) => {
      if (index < timeRanges.length) {
        timeRanges[index].count = bucket.count;
      }
    });
    
    return timeRanges;
  } catch (error) {
    log('otp', 'error', 'Error getting verification time distribution:', { error });
    return [];
  }
};

/**
 * Get delivery method breakdown
 * @param {string} period - 'day', 'week', 'month' or 'year'
 * @param {string} startDate - ISO string start date
 * @param {string} endDate - ISO string end date
 * @returns {Promise<Object>} Delivery method data
 */
const getDeliveryMethodBreakdown = async (period, startDate, endDate) => {
  try {
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    } else {
      // Default date range based on period
      const now = new Date();
      let startDateTime;
      
      switch(period) {
        case 'day':
          startDateTime = new Date(now);
          startDateTime.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDateTime = new Date(now);
          startDateTime.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDateTime = new Date(now);
          startDateTime.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDateTime = new Date(now);
          startDateTime.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDateTime = new Date(now);
          startDateTime.setDate(now.getDate() - 7);
      }
      
      dateFilter.createdAt = { $gte: startDateTime };
    }
    
    // Aggregate by delivery method
    const result = await OTP.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$method',
          total: { $sum: 1 },
          verified: { 
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } 
          },
          verificationTimes: {
            $push: {
              $cond: [
                { $eq: ['$status', 'verified'] },
                {
                  $divide: [
                    { $subtract: ['$verifiedAt', '$createdAt'] },
                    1000 // Convert to seconds
                  ]
                },
                null
              ]
            }
          }
        }
      }
    ]);
    
    // Transform to delivery method format
    const deliveryData = {};
    
    result.forEach(item => {
      const method = item._id;
      const verified = item.verified;
      const successRate = (verified / item.total) * 100;
      
      // Calculate average verification time
      const validTimes = item.verificationTimes.filter(time => time !== null);
      const avgVerificationTime = validTimes.length > 0
        ? validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length
        : 0;
      
      deliveryData[method] = {
        total: item.total,
        verified,
        failed: item.total - verified,
        successRate,
        avgVerificationTime
      };
    });
    
    return deliveryData;
  } catch (error) {
    log('otp', 'error', 'Error getting delivery method breakdown:', { error });
    return {};
  }
};

/**
 * Calculate OTP success rate
 * @param {Object} otpByStatus - OTP counts by status
 * @returns {number} Success rate as percentage
 */
const calculateSuccessRate = (otpByStatus) => {
  const total = otpByStatus.verified + otpByStatus.expired + otpByStatus.unused;
  
  if (total === 0) {
    return 0;
  }
  
  return (otpByStatus.verified / total) * 100;
};

/**
 * Calculate average verification time
 * @param {Array} verificationTimeDistribution - Verification time distribution
 * @returns {number} Average verification time in seconds
 */
const calculateAvgVerificationTime = (verificationTimeDistribution) => {
  const timeRanges = [
    { min: 0, max: 15 },
    { min: 16, max: 30 },
    { min: 31, max: 60 },
    { min: 61, max: 120 },
    { min: 121, max: 210 } // Assuming average of 121-300s is 210s
  ];
  
  let totalCount = 0;
  let weightedSum = 0;
  
  verificationTimeDistribution.forEach((item, index) => {
    const range = timeRanges[index];
    const avgTime = (range.min + range.max) / 2;
    
    totalCount += item.count;
    weightedSum += item.count * avgTime;
  });
  
  if (totalCount === 0) {
    return 0;
  }
  
  return weightedSum / totalCount;
};
