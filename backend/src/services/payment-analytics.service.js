/**
 * Payment Analytics Service
 * 
 * Provides analytics data for payment transactions across the application
 */
import { log } from './logging.service.js';
// Use ES module imports
import Transaction from '../mongodb/models/Transaction.js';
import Ride from '../mongodb/models/Ride.js';

/**
 * Get payment analytics with various filters
 * @param {Object} options - Query options
 * @param {string} options.timeframe - 'day', 'week', 'month' or 'year'
 * @param {string} options.startDate - ISO string start date
 * @param {string} options.endDate - ISO string end date
 * @param {string} options.paymentMethod - Filter by payment method
 * @param {string} options.status - Filter by transaction status
 * @returns {Promise<Object>} Analytics data
 */
export const getPaymentAnalytics = async (options = {}) => {
  try {
    const { timeframe = 'week', startDate, endDate, paymentMethod, status } = options;
    
    // Build base filter
    const filter = {};
    
    // Add date filter
    if (startDate && endDate) {
      filter.createdAt = { 
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
      
      filter.createdAt = { $gte: startDateTime };
    }
    
    // Add payment method filter if provided
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Get payment time series data
    const paymentTimeSeries = await getPaymentTimeSeriesData(timeframe, filter);
    
    // Get payments by method breakdown
    const paymentsByMethod = await getPaymentsByMethod(filter);
    
    // Get processing time distribution
    const processingTimeDistribution = await getProcessingTimeDistribution(filter);
    
    return {
      success: true,
      data: {
        paymentTimeSeries,
        paymentsByMethod,
        processingTimeDistribution
      }
    };
  } catch (error) {
    log('payment', 'error', 'Error getting payment analytics:', { error });
    return {
      success: false,
      message: 'Failed to get payment analytics',
      error: error.message
    };
  }
};

/**
 * Generate a payment analytics report
 * @param {Object} options - Report options
 * @returns {Promise<Object>} Report data
 */
export const generatePaymentReport = async (options = {}) => {
  try {
    const { timeframe = 'month', format = 'json', startDate, endDate, paymentMethod } = options;
    
    // Build filter for the report
    const filter = {};
    
    // Add date filter
    if (startDate && endDate) {
      filter.createdAt = { 
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
      
      filter.createdAt = { $gte: startDateTime };
    }
    
    // Add payment method filter if provided
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }
    
    // Get transactions based on filter
    const transactions = await Transaction.find(filter);
    
    // Calculate summary metrics
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const successfulTransactions = transactions.filter(tx => tx.status === 'completed').length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    
    // Get payment method breakdown
    const methodsBreakdown = {};
    
    transactions.forEach(tx => {
      const method = tx.paymentMethod || 'unknown';
      
      if (!methodsBreakdown[method]) {
        methodsBreakdown[method] = {
          count: 0,
          amount: 0,
          successful: 0
        };
      }
      
      methodsBreakdown[method].count++;
      methodsBreakdown[method].amount += tx.amount;
      
      if (tx.status === 'completed') {
        methodsBreakdown[method].successful++;
      }
    });
    
    // Calculate success rates for each method
    Object.keys(methodsBreakdown).forEach(method => {
      const { count, successful } = methodsBreakdown[method];
      methodsBreakdown[method].successRate = count > 0 ? (successful / count) * 100 : 0;
    });
    
    // Build the report data
    const reportId = `payment-${Date.now()}`;
    const reportData = {
      reportId,
      generatedAt: new Date().toISOString(),
      timeframe,
      dateRange: {
        startDate: startDate || 'auto',
        endDate: endDate || 'auto'
      },
      summary: {
        totalTransactions,
        totalAmount,
        averageAmount,
        successRate
      },
      detailedStats: {
        byMethod: methodsBreakdown
      }
    };
    
    return {
      success: true,
      data: reportData
    };
  } catch (error) {
    log('payment', 'error', 'Error generating payment report:', { error });
    return {
      success: false,
      message: 'Failed to generate payment report',
      error: error.message
    };
  }
};

/**
 * Get payment summary metrics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Summary metrics
 */
export const getPaymentSummaryMetrics = async (options = {}) => {
  try {
    const { period = 'week', currency, paymentMethod } = options;
    
    // Build filter for current period
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
    
    const currentFilter = {
      createdAt: { $gte: startDateTime }
    };
    
    // Add currency filter if provided
    if (currency) {
      currentFilter.currency = currency;
    }
    
    // Add payment method filter if provided
    if (paymentMethod) {
      currentFilter.paymentMethod = paymentMethod;
    }
    
    // Get transactions for current period
    const currentTransactions = await Transaction.find(currentFilter);
    
    // Calculate current period metrics
    const totalTransactions = currentTransactions.length;
    const successfulTransactions = currentTransactions.filter(tx => tx.status === 'completed').length;
    const failedTransactions = totalTransactions - successfulTransactions;
    const totalAmount = currentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    
    // Build filter for previous period for comparison
    let previousStartDateTime, previousEndDateTime;
    
    switch(period) {
      case 'day':
        previousStartDateTime = new Date(now);
        previousStartDateTime.setDate(now.getDate() - 1);
        previousStartDateTime.setHours(0, 0, 0, 0);
        previousEndDateTime = new Date(now);
        previousEndDateTime.setDate(now.getDate() - 1);
        previousEndDateTime.setHours(23, 59, 59, 999);
        break;
      case 'week':
        previousStartDateTime = new Date(now);
        previousStartDateTime.setDate(now.getDate() - 14);
        previousEndDateTime = new Date(now);
        previousEndDateTime.setDate(now.getDate() - 7);
        previousEndDateTime.setHours(23, 59, 59, 999);
        break;
      case 'month':
        previousStartDateTime = new Date(now);
        previousStartDateTime.setMonth(now.getMonth() - 2);
        previousEndDateTime = new Date(now);
        previousEndDateTime.setMonth(now.getMonth() - 1);
        previousEndDateTime.setHours(23, 59, 59, 999);
        break;
      case 'year':
        previousStartDateTime = new Date(now);
        previousStartDateTime.setFullYear(now.getFullYear() - 2);
        previousEndDateTime = new Date(now);
        previousEndDateTime.setFullYear(now.getFullYear() - 1);
        previousEndDateTime.setHours(23, 59, 59, 999);
        break;
      default:
        previousStartDateTime = new Date(now);
        previousStartDateTime.setDate(now.getDate() - 14);
        previousEndDateTime = new Date(now);
        previousEndDateTime.setDate(now.getDate() - 7);
        previousEndDateTime.setHours(23, 59, 59, 999);
    }
    
    const previousFilter = {
      createdAt: { 
        $gte: previousStartDateTime,
        $lte: previousEndDateTime
      }
    };
    
    // Add currency filter if provided
    if (currency) {
      previousFilter.currency = currency;
    }
    
    // Add payment method filter if provided
    if (paymentMethod) {
      previousFilter.paymentMethod = paymentMethod;
    }
    
    // Get transactions for previous period
    const previousTransactions = await Transaction.find(previousFilter);
    
    // Calculate previous period metrics
    const prevTotalTransactions = previousTransactions.length;
    const prevSuccessfulTransactions = previousTransactions.filter(tx => tx.status === 'completed').length;
    const prevTotalAmount = previousTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const prevSuccessRate = prevTotalTransactions > 0 ? (prevSuccessfulTransactions / prevTotalTransactions) * 100 : 0;
    
    // Calculate changes from previous period
    const changeFromPrevious = {
      transactions: prevTotalTransactions > 0 ? ((totalTransactions - prevTotalTransactions) / prevTotalTransactions) * 100 : 0,
      amount: prevTotalAmount > 0 ? ((totalAmount - prevTotalAmount) / prevTotalAmount) * 100 : 0,
      successRate: successRate - prevSuccessRate
    };
    
    return {
      success: true,
      data: {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        totalAmount,
        averageAmount,
        successRate,
        changeFromPrevious
      }
    };
  } catch (error) {
    log('payment', 'error', 'Error getting payment summary metrics:', { error });
    return {
      success: false,
      message: 'Failed to get payment summary metrics',
      error: error.message
    };
  }
};

/**
 * Get payment methods distribution
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Payment methods distribution
 */
export const getPaymentMethodsDistribution = async (options = {}) => {
  try {
    const { period = 'week', startDate, endDate } = options;
    
    // Build filter
    const filter = {};
    
    // Add date filter
    if (startDate && endDate) {
      filter.createdAt = { 
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
      
      filter.createdAt = { $gte: startDateTime };
    }
    
    // Aggregate by payment method
    const result = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Calculate total count for percentages
    const totalCount = result.reduce((sum, method) => sum + method.count, 0);
    
    // Transform to desired format
    const methodsData = result.map(method => ({
      method: method._id || 'unknown',
      count: method.count,
      totalAmount: method.totalAmount,
      percentage: totalCount > 0 ? (method.count / totalCount) * 100 : 0
    }));
    
    return {
      success: true,
      data: methodsData
    };
  } catch (error) {
    log('payment', 'error', 'Error getting payment methods distribution:', { error });
    return {
      success: false,
      message: 'Failed to get payment methods distribution',
      error: error.message
    };
  }
};

/**
 * Get payment processing times analysis
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Processing times analysis
 */
export const getPaymentProcessingTimes = async (options = {}) => {
  try {
    const { period = 'week', startDate, endDate, paymentMethod } = options;
    
    // Build filter
    const filter = {
      status: 'completed', // Only look at completed transactions
      completedAt: { $exists: true } // Must have completedAt timestamp
    };
    
    // Add date filter
    if (startDate && endDate) {
      filter.createdAt = { 
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
      
      filter.createdAt = { $gte: startDateTime };
    }
    
    // Add payment method filter if provided
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }
    
    // Fetch transactions with processing time calculation
    const transactions = await Transaction.aggregate([
      { $match: filter },
      {
        $project: {
          paymentMethod: 1,
          processingTime: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 // Convert to seconds
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$processingTime',
          boundaries: [0, 2, 5, 10, 30, 60],
          default: '60+',
          output: {
            count: { $sum: 1 },
            methods: {
              $push: {
                method: '$paymentMethod',
                time: '$processingTime'
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Transform to desired format for time distribution
    const timeRanges = [
      { time: '0-2s', count: 0 },
      { time: '3-5s', count: 0 },
      { time: '6-10s', count: 0 },
      { time: '11-30s', count: 0 },
      { time: '30s+', count: 0 }
    ];
    
    transactions.forEach((bucket, index) => {
      if (index < timeRanges.length) {
        timeRanges[index].count = bucket.count;
      }
    });
    
    // Get average processing time by payment method
    const methodsResult = await Transaction.aggregate([
      { $match: filter },
      {
        $project: {
          paymentMethod: 1,
          processingTime: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 // Convert to seconds
            ]
          }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          avgTime: { $avg: '$processingTime' },
          minTime: { $min: '$processingTime' },
          maxTime: { $max: '$processingTime' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgTime: 1 } }
    ]);
    
    // Calculate overall average
    const overallAvg = methodsResult.reduce((sum, method) => sum + (method.avgTime * method.count), 0) / 
                       methodsResult.reduce((sum, method) => sum + method.count, 0);
    
    return {
      success: true,
      data: {
        distribution: timeRanges,
        byMethod: methodsResult.map(method => ({
          method: method._id || 'unknown',
          avgTime: method.avgTime,
          minTime: method.minTime,
          maxTime: method.maxTime,
          count: method.count
        })),
        overall: {
          avgTime: overallAvg,
          fastestMethod: methodsResult.length > 0 ? methodsResult[0]._id : null,
          slowestMethod: methodsResult.length > 0 ? methodsResult[methodsResult.length - 1]._id : null
        }
      }
    };
  } catch (error) {
    log('payment', 'error', 'Error getting payment processing times:', { error });
    return {
      success: false,
      message: 'Failed to get payment processing times',
      error: error.message
    };
  }
};

// Helper functions

/**
 * Get payment time series data
 * @param {string} timeframe - 'day', 'week', 'month' or 'year'
 * @param {Object} filter - Base filter
 * @returns {Promise<Array>} Time series data
 */
const getPaymentTimeSeriesData = async (timeframe, filter) => {
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
    const result = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            timeInterval: groupByFormat,
            status: '$status'
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          timestamp: { $first: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$_id.timeInterval',
          statusCounts: {
            $push: {
              status: '$_id.status',
              count: '$count',
              amount: '$amount'
            }
          },
          timestamp: { $first: '$timestamp' }
        }
      },
      { $sort: { timestamp: 1 } }
    ]);
    
    // Transform to time series format
    return result.map(item => {
      const transactions = item.statusCounts.reduce((sum, status) => sum + status.count, 0);
      const amount = item.statusCounts.reduce((sum, status) => sum + status.amount, 0);
      const successful = item.statusCounts.find(s => s.status === 'completed')?.count || 0;
      const failed = transactions - successful;
      
      return {
        timestamp: item.timestamp,
        name: item._id,
        transactions,
        amount,
        successful,
        failed
      };
    });
  } catch (error) {
    log('payment', 'error', 'Error getting payment time series data:', { error });
    return [];
  }
};

/**
 * Get payments by method breakdown
 * @param {Object} filter - Base filter
 * @returns {Promise<Object>} Payments by method
 */
const getPaymentsByMethod = async (filter) => {
  try {
    // Aggregate by payment method
    const result = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Transform to simple object for easier frontend consumption
    const paymentsByMethod = {};
    
    result.forEach(item => {
      const method = item._id || 'unknown';
      paymentsByMethod[method] = item.count;
    });
    
    return paymentsByMethod;
  } catch (error) {
    log('payment', 'error', 'Error getting payments by method:', { error });
    return {};
  }
};

/**
 * Get processing time distribution
 * @param {Object} filter - Base filter
 * @returns {Promise<Array>} Processing time distribution
 */
const getProcessingTimeDistribution = async (filter) => {
  try {
    // Only look at completed transactions with timestamps
    const completedFilter = {
      ...filter,
      status: 'completed',
      completedAt: { $exists: true }
    };
    
    // Aggregate by processing time buckets
    const result = await Transaction.aggregate([
      { $match: completedFilter },
      {
        $project: {
          processingTime: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 // Convert to seconds
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$processingTime',
          boundaries: [0, 2, 5, 10, 30, 60],
          default: '60+',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Transform to distribution format
    const timeRanges = [
      { time: '0-2s', count: 0 },
      { time: '3-5s', count: 0 },
      { time: '6-10s', count: 0 },
      { time: '11-30s', count: 0 },
      { time: '30s+', count: 0 }
    ];
    
    result.forEach((bucket, index) => {
      if (index < timeRanges.length) {
        timeRanges[index].count = bucket.count;
      }
    });
    
    return timeRanges;
  } catch (error) {
    log('payment', 'error', 'Error getting processing time distribution:', { error });
    return [];
  }
};
