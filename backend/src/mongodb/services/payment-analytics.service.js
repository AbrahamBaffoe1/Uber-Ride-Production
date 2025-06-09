/**
 * MongoDB Payment Analytics Service
 * 
 * Provides advanced analytics, reporting, and insights on payment data
 * using MongoDB's aggregation framework for efficient data processing.
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Ride = require('../models/Ride');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

class MongoPaymentAnalyticsService {
  constructor() {
    // Initialize metrics storage for caching
    this.metrics = {
      dailyRevenue: {},
      weeklyRevenue: {},
      monthlyRevenue: {},
      paymentMethodDistribution: {},
      successRates: {},
      providerPerformance: {},
      avgTransactionValue: {},
      ridePaymentRatio: {},
      paymentFailureReasons: {},
      highValueTransactions: []
    };
  }

  /**
   * Get payment analytics data for dashboard
   * @param {Object} options - Query options
   * @param {string} options.timeframe - 'daily', 'weekly', or 'monthly'
   * @param {string} options.gateway - Payment gateway filter or 'all'
   * @param {Date} options.startDate - Start date for the query
   * @param {Date} options.endDate - End date for the query
   * @returns {Promise<Object>} - Payment analytics data
   */
  async getPaymentAnalytics(options = {}) {
    const { 
      timeframe = 'weekly', 
      gateway = 'all', 
      startDate = moment().subtract(timeframe === 'daily' ? 1 : 7, 'days').toDate(),
      endDate = new Date() 
    } = options;

    try {
      // Prepare date range query
      const dateQuery = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      // Add gateway filter if specified
      if (gateway !== 'all') {
        dateQuery.gateway = gateway;
      }

      // Get summary metrics using aggregation
      const summaryMetrics = await this.getSummaryMetrics(dateQuery);
      
      // Get transactions by status
      const transactionsByStatus = await this.getTransactionsByStatus(dateQuery);
      
      // Get transactions by type
      const transactionsByType = await this.getTransactionsByType(dateQuery);
      
      // Get transactions by payment method
      const transactionsByPaymentMethod = await this.getTransactionsByPaymentMethod(dateQuery);
      
      // Get gateway performance
      const gatewayPerformance = await this.getGatewayPerformance(dateQuery);
      
      // Get time series payments data
      const paymentsTimeSeries = await this.getPaymentsTimeSeries(dateQuery, timeframe);
      
      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions(dateQuery);

      // Return combined analytics data
      return {
        success: true,
        data: {
          summary: summaryMetrics,
          transactionsByStatus,
          transactionsByType,
          transactionsByPaymentMethod,
          gatewayPerformance,
          payments: paymentsTimeSeries,
          recentTransactions
        }
      };
    } catch (error) {
      console.error('Error getting MongoDB payment analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get summary metrics using MongoDB aggregation
   * @param {Object} dateQuery - Date range query
   * @returns {Promise<Object>} - Summary metrics
   */
  async getSummaryMetrics(dateQuery) {
    try {
      const aggregation = await Transaction.aggregate([
        { $match: dateQuery },
        {
          $facet: {
            // Total metrics
            totalMetrics: [
              {
                $group: {
                  _id: null,
                  totalTransactions: { $sum: 1 },
                  completedTransactions: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                    }
                  },
                  totalAmount: { $sum: "$amount" },
                  // Count transactions for average calculation
                  countForAvg: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                    }
                  },
                  // Sum amount for average calculation
                  sumForAvg: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0]
                    }
                  }
                }
              }
            ],
            // Revenue metrics
            revenueMetrics: [
              {
                $match: {
                  $or: [
                    { type: "fee" },
                    { type: "commission" }
                  ]
                }
              },
              {
                $group: {
                  _id: "$type",
                  total: { $sum: "$amount" }
                }
              }
            ]
          }
        }
      ]);

      // Extract and format the results
      const totalMetrics = aggregation[0]?.totalMetrics[0] || {
        totalTransactions: 0,
        completedTransactions: 0,
        totalAmount: 0,
        countForAvg: 0,
        sumForAvg: 0
      };

      const revenueMetrics = aggregation[0]?.revenueMetrics || [];
      
      // Calculate revenue totals
      const commissions = revenueMetrics.find(r => r._id === 'commission')?.total || 0;
      const fees = revenueMetrics.find(r => r._id === 'fee')?.total || 0;
      
      // Calculate success rate
      const successRate = totalMetrics.totalTransactions > 0
        ? (totalMetrics.completedTransactions / totalMetrics.totalTransactions) * 100
        : 0;
      
      // Calculate average transaction value
      const avgTransactionValue = totalMetrics.countForAvg > 0
        ? totalMetrics.sumForAvg / totalMetrics.countForAvg
        : 0;

      return {
        totalTransactions: totalMetrics.totalTransactions,
        totalAmount: totalMetrics.totalAmount,
        successRate: parseFloat(successRate.toFixed(1)),
        avgTransactionValue: parseFloat(avgTransactionValue.toFixed(2)),
        revenue: {
          commissions,
          fees,
          total: commissions + fees
        }
      };
    } catch (error) {
      console.error('Error getting MongoDB summary metrics:', error);
      throw error;
    }
  }

  /**
   * Get transactions by status
   * @param {Object} dateQuery - Date range query
   * @returns {Promise<Object>} - Transactions by status
   */
  async getTransactionsByStatus(dateQuery) {
    try {
      const statusAggregation = await Transaction.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert to object format
      const result = {};
      statusAggregation.forEach(status => {
        result[status._id] = status.count;
      });

      return result;
    } catch (error) {
      console.error('Error getting transactions by status:', error);
      throw error;
    }
  }

  /**
   * Get transactions by type
   * @param {Object} dateQuery - Date range query
   * @returns {Promise<Object>} - Transactions by type
   */
  async getTransactionsByType(dateQuery) {
    try {
      const typeAggregation = await Transaction.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert to object format
      const result = {};
      typeAggregation.forEach(type => {
        result[type._id] = type.count;
      });

      return result;
    } catch (error) {
      console.error('Error getting transactions by type:', error);
      throw error;
    }
  }

  /**
   * Get transactions by payment method
   * @param {Object} dateQuery - Date range query
   * @returns {Promise<Object>} - Transactions by payment method
   */
  async getTransactionsByPaymentMethod(dateQuery) {
    try {
      const methodAggregation = await Transaction.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert to object format
      const result = {};
      methodAggregation.forEach(method => {
        result[method._id || 'unknown'] = method.count;
      });

      return result;
    } catch (error) {
      console.error('Error getting transactions by payment method:', error);
      throw error;
    }
  }

  /**
   * Get gateway performance metrics
   * @param {Object} dateQuery - Date range query
   * @returns {Promise<Array>} - Gateway performance metrics
   */
  async getGatewayPerformance(dateQuery) {
    try {
      const gatewayAggregation = await Transaction.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: "$gateway",
            transactions: { $sum: 1 },
            successful: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
              }
            },
            processingTimeSum: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ["$status", "completed"] },
                      { $ne: ["$processedAt", null] },
                      { $ne: ["$createdAt", null] }
                    ] 
                  },
                  { 
                    $divide: [
                      { $subtract: ["$processedAt", "$createdAt"] },
                      1000 // Convert to seconds
                    ]
                  },
                  0
                ]
              }
            },
            processed: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ["$status", "completed"] },
                      { $ne: ["$processedAt", null] }
                    ] 
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$_id", "unknown"] },
            transactions: 1,
            successRate: {
              $cond: [
                { $gt: ["$transactions", 0] },
                { $multiply: [{ $divide: ["$successful", "$transactions"] }, 100] },
                0
              ]
            },
            avgProcessingTime: {
              $cond: [
                { $gt: ["$processed", 0] },
                { $divide: ["$processingTimeSum", "$processed"] },
                0
              ]
            }
          }
        }
      ]);

      return gatewayAggregation.map(gateway => ({
        ...gateway,
        successRate: parseFloat(gateway.successRate.toFixed(1)),
        avgProcessingTime: parseFloat(gateway.avgProcessingTime.toFixed(1))
      }));
    } catch (error) {
      console.error('Error getting gateway performance:', error);
      throw error;
    }
  }

  /**
   * Get payments time series data
   * @param {Object} dateQuery - Date range query
   * @param {string} timeframe - 'daily', 'weekly', or 'monthly'
   * @returns {Promise<Array>} - Payments time series data
   */
  async getPaymentsTimeSeries(dateQuery, timeframe) {
    try {
      let groupByDate;
      let dateFormat;
      
      // Set grouping format based on timeframe
      if (timeframe === 'daily') {
        // Group by hour
        groupByDate = {
          $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" }
        };
        dateFormat = "%Y-%m-%d %H:00";
      } else if (timeframe === 'weekly') {
        // Group by day
        groupByDate = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        };
        dateFormat = "%Y-%m-%d";
      } else {
        // Group by day for monthly as well
        groupByDate = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
        };
        dateFormat = "%Y-%m-%d";
      }

      const timeSeriesAggregation = await Transaction.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: {
              date: groupByDate
            },
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            successfulTransactions: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
              }
            },
            successfulAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0]
              }
            },
            failedTransactions: {
              $sum: {
                $cond: [{ $eq: ["$status", "failed"] }, 1, 0]
              }
            },
            failedAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "failed"] }, "$amount", 0]
              }
            },
            pendingTransactions: {
              $sum: {
                $cond: [
                  { 
                    $or: [
                      { $eq: ["$status", "pending"] },
                      { $eq: ["$status", "processing"] }
                    ] 
                  }, 
                  1, 
                  0
                ]
              }
            },
            commissions: {
              $sum: {
                $cond: [{ $eq: ["$type", "commission"] }, "$amount", 0]
              }
            },
            fees: {
              $sum: {
                $cond: [{ $eq: ["$type", "fee"] }, "$amount", 0]
              }
            }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]);

      // Format the results
      return timeSeriesAggregation.map(entry => {
        // Parse date string for formatting
        const timestamp = moment(entry._id.date, 
          timeframe === 'daily' ? 'YYYY-MM-DD HH:00' : 'YYYY-MM-DD').toISOString();
        
        // Format date based on timeframe
        const date = timeframe === 'daily'
          ? moment(entry._id.date, 'YYYY-MM-DD HH:00').format('HH:00')
          : moment(entry._id.date, 'YYYY-MM-DD').format('YYYY-MM-DD');

        return {
          timestamp,
          date,
          totalAmount: entry.totalAmount,
          successfulAmount: entry.successfulAmount,
          failedAmount: entry.failedAmount,
          transactions: {
            total: entry.totalTransactions,
            successful: entry.successfulTransactions,
            failed: entry.failedTransactions,
            pending: entry.pendingTransactions
          },
          commissionsEarned: entry.commissions,
          platformFees: entry.fees
        };
      });
    } catch (error) {
      console.error('Error getting payments time series:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions
   * @param {Object} dateQuery - Date range query
   * @param {number} limit - Maximum number of transactions to return
   * @returns {Promise<Array>} - Recent transactions
   */
  async getRecentTransactions(dateQuery, limit = 10) {
    try {
      const recentTransactions = await Transaction.find(dateQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return recentTransactions.map(transaction => ({
        id: transaction._id.toString(),
        userId: transaction.userId ? transaction.userId.toString() : null,
        amount: transaction.amount,
        type: transaction.type,
        status: transaction.status,
        gateway: transaction.gateway,
        createdAt: transaction.createdAt,
        processedAt: transaction.processedAt
      }));
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  }

  /**
   * Generate a payment analytics report and save to file
   * @param {Object} options - Report options
   * @returns {Promise<string>} - Path to generated report file
   */
  async generateAnalyticsReport(options) {
    try {
      const { timeframe = 'weekly', gateway = 'all', startDate, endDate } = options;
      
      // Get analytics data
      const analyticsData = await this.getPaymentAnalytics({
        timeframe,
        gateway,
        startDate,
        endDate
      });
      
      if (!analyticsData.success) {
        throw new Error(`Failed to generate analytics data: ${analyticsData.error}`);
      }
      
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(__dirname, '../../../reports/analytics');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Generate report filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dateRange = `${moment(startDate).format('YYYY-MM-DD')}_to_${moment(endDate).format('YYYY-MM-DD')}`;
      const filename = `mongodb_payment_analytics_${timeframe}_${dateRange}_${timestamp}.json`;
      
      const reportPath = path.join(reportsDir, filename);
      
      // Write report to file
      fs.writeFileSync(reportPath, JSON.stringify({
        reportGenerated: new Date().toISOString(),
        reportPeriod: {
          timeframe,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          gateway
        },
        analytics: analyticsData.data
      }, null, 2));
      
      console.log(`MongoDB payment analytics report generated: ${reportPath}`);
      
      return reportPath;
    } catch (error) {
      console.error('Error generating MongoDB payment analytics report:', error);
      throw error;
    }
  }
}

// Create and export service instance
const mongoPaymentAnalyticsService = new MongoPaymentAnalyticsService();

module.exports = {
  mongoPaymentAnalyticsService
};
