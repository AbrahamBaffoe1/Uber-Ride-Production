/**
 * Payment Analytics Service
 * 
 * Provides advanced analytics, reporting, and insights on payment data
 * to help monitor business performance and financial health metrics.
 */

const { Op, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { Payment, MobilePayment, User, Ride, sequelize } = require('../models');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class PaymentAnalyticsService {
  constructor() {
    // Initialize metrics storage
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
    
    // Schedule analytics jobs
    this.scheduleAnalyticsJobs();
  }
  
  /**
   * Schedule analytics jobs
   */
  scheduleAnalyticsJobs() {
    // Calculate daily metrics at 1 AM
    cron.schedule('0 1 * * *', async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const endDate = new Date(yesterday);
        endDate.setHours(23, 59, 59, 999);
        
        console.log(`Running daily payment analytics for ${yesterday.toISOString().split('T')[0]}`);
        
        await this.calculateDailyMetrics(yesterday);
      } catch (error) {
        console.error('Error in daily analytics job:', error);
      }
    });
    
    // Calculate weekly metrics at 2 AM on Monday
    cron.schedule('0 2 * * 1', async () => {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        
        console.log(`Running weekly payment analytics for ${oneWeekAgo.toISOString().split('T')[0]} to ${yesterday.toISOString().split('T')[0]}`);
        
        await this.calculateWeeklyMetrics(oneWeekAgo, yesterday);
      } catch (error) {
        console.error('Error in weekly analytics job:', error);
      }
    });
    
    // Calculate monthly metrics at 3 AM on the 1st of each month
    cron.schedule('0 3 1 * *', async () => {
      try {
        const firstDayLastMonth = new Date();
        firstDayLastMonth.setDate(1);
        firstDayLastMonth.setMonth(firstDayLastMonth.getMonth() - 1);
        firstDayLastMonth.setHours(0, 0, 0, 0);
        
        const lastDayLastMonth = new Date();
        lastDayLastMonth.setDate(0);
        lastDayLastMonth.setHours(23, 59, 59, 999);
        
        console.log(`Running monthly payment analytics for ${firstDayLastMonth.toISOString().split('T')[0]} to ${lastDayLastMonth.toISOString().split('T')[0]}`);
        
        await this.calculateMonthlyMetrics(firstDayLastMonth, lastDayLastMonth);
      } catch (error) {
        console.error('Error in monthly analytics job:', error);
      }
    });
  }

  /**
   * Calculate analytics metrics for a period
   * @param {Object} options - Analytics options
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {string} options.period - Period ('daily', 'weekly', 'monthly')
   * @param {boolean} options.generateReport - Generate report file
   * @returns {Promise<Object>} - Metrics data
   */
  async calculateMetrics(options) {
    const { startDate, endDate, period = 'daily', generateReport = false } = options;
    
    try {
      // Get all payments within the date range
      const [standardPayments, mobilePayments] = await Promise.all([
        this.getStandardPayments(startDate, endDate),
        this.getMobilePayments(startDate, endDate)
      ]);
      
      // Combine payments
      const allPayments = [...standardPayments, ...mobilePayments];
      
      // Skip processing if no payments
      if (allPayments.length === 0) {
        console.log(`No payments found for period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        return {
          period,
          startDate,
          endDate,
          totalTransactions: 0,
          metrics: {}
        };
      }
      
      // Calculate metrics
      const metrics = {
        // Transaction volume
        totalTransactions: allPayments.length,
        successfulTransactions: allPayments.filter(p => this.isSuccessfulPayment(p)).length,
        failedTransactions: allPayments.filter(p => this.isFailedPayment(p)).length,
        pendingTransactions: allPayments.filter(p => this.isPendingPayment(p)).length,
        
        // Revenue
        totalRevenue: this.calculateTotalRevenue(allPayments),
        revenueByMethod: this.calculateRevenueByMethod(allPayments),
        revenueByProvider: this.calculateRevenueByProvider(allPayments),
        revenueByDay: period !== 'daily' ? this.calculateRevenueByDay(allPayments) : null,
        
        // Success rates
        successRate: this.calculateSuccessRate(allPayments),
        successRateByMethod: this.calculateSuccessRateByMethod(allPayments),
        successRateByProvider: this.calculateSuccessRateByProvider(allPayments),
        
        // Transaction values
        avgTransactionValue: this.calculateAvgTransactionValue(allPayments),
        medianTransactionValue: this.calculateMedianTransactionValue(allPayments),
        minTransactionValue: this.calculateMinTransactionValue(allPayments),
        maxTransactionValue: this.calculateMaxTransactionValue(allPayments),
        
        // Distribution
        paymentMethodDistribution: this.calculatePaymentMethodDistribution(allPayments),
        providerDistribution: this.calculateProviderDistribution(allPayments),
        currencyDistribution: this.calculateCurrencyDistribution(allPayments),
        
        // Ride metrics
        ridePaymentPercentage: this.calculateRidePaymentPercentage(allPayments),
        avgRidePaymentValue: this.calculateAvgRidePaymentValue(allPayments),
        
        // Failure analysis
        failureReasons: this.analyzeFailureReasons(allPayments),
        
        // High-value transactions
        highValueTransactions: this.identifyHighValueTransactions(allPayments, 500), // Threshold of 500 in any currency
      };
      
      // Store metrics based on period
      this.storeMetricsByPeriod(metrics, period, startDate);
      
      // Generate report if requested
      if (generateReport) {
        await this.generateAnalyticsReport(metrics, { startDate, endDate, period });
      }
      
      return {
        period,
        startDate,
        endDate,
        totalTransactions: allPayments.length,
        metrics
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate daily metrics
   * @param {Date} date - Date to calculate metrics for
   * @returns {Promise<Object>} - Daily metrics
   */
  async calculateDailyMetrics(date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    return this.calculateMetrics({
      startDate,
      endDate,
      period: 'daily',
      generateReport: true
    });
  }

  /**
   * Calculate weekly metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Weekly metrics
   */
  async calculateWeeklyMetrics(startDate, endDate) {
    return this.calculateMetrics({
      startDate,
      endDate,
      period: 'weekly',
      generateReport: true
    });
  }

  /**
   * Calculate monthly metrics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Monthly metrics
   */
  async calculateMonthlyMetrics(startDate, endDate) {
    return this.calculateMetrics({
      startDate,
      endDate,
      period: 'monthly',
      generateReport: true
    });
  }

  /**
   * Get standard payments
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} - Standard payments
   */
  async getStandardPayments(startDate, endDate) {
    try {
      const payments = await Payment.findAll({
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'phoneNumber']
          },
          {
            model: Ride,
            attributes: ['id', 'status']
          }
        ]
      });
      
      return payments.map(payment => ({
        id: payment.id,
        reference: payment.reference,
        provider: payment.providerName,
        method: payment.paymentMethod?.type || 'unknown',
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        userId: payment.userId,
        rideId: payment.rideId,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        type: 'standard',
        errorMessage: payment.errorMessage,
        metadata: payment.metadata
      }));
    } catch (error) {
      console.error('Error getting standard payments:', error);
      throw error;
    }
  }

  /**
   * Get mobile payments
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} - Mobile payments
   */
  async getMobilePayments(startDate, endDate) {
    try {
      const payments = await MobilePayment.findAll({
        where: {
          createdAt: { [Op.between]: [startDate, endDate] }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'phoneNumber']
          }
        ]
      });
      
      return payments.map(payment => ({
        id: payment.id,
        reference: payment.reference || payment.transactionId,
        provider: payment.provider,
        method: 'mobile_money',
        amount: payment.amount,
        currency: 'GHS', // Mobile payments are Ghana-only for now
        status: payment.status,
        userId: payment.userId,
        rideId: payment.rideId,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        type: 'mobile',
        errorMessage: payment.failureReason,
        metadata: payment.metaData
      }));
    } catch (error) {
      console.error('Error getting mobile payments:', error);
      throw error;
    }
  }

  /**
   * Check if payment is successful
   * @param {Object} payment - Payment object
   * @returns {boolean} - Is successful
   */
  isSuccessfulPayment(payment) {
    if (!payment || !payment.status) return false;
    
    const status = payment.status.toLowerCase();
    return (
      status === 'completed' || 
      status === 'success' || 
      status === 'successful'
    );
  }

  /**
   * Check if payment is failed
   * @param {Object} payment - Payment object
   * @returns {boolean} - Is failed
   */
  isFailedPayment(payment) {
    if (!payment || !payment.status) return false;
    
    const status = payment.status.toLowerCase();
    return (
      status === 'failed' || 
      status === 'declined' || 
      status === 'rejected' ||
      status === 'error'
    );
  }

  /**
   * Check if payment is pending
   * @param {Object} payment - Payment object
   * @returns {boolean} - Is pending
   */
  isPendingPayment(payment) {
    if (!payment || !payment.status) return false;
    
    const status = payment.status.toLowerCase();
    return (
      status === 'pending' || 
      status === 'processing' || 
      status === 'initiated'
    );
  }

  /**
   * Calculate total revenue from payments
   * @param {Array} payments - Payments
   * @returns {Object} - Revenue by currency
   */
  calculateTotalRevenue(payments) {
    const revenue = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const currency = payment.currency || 'UNKNOWN';
      
      if (!revenue[currency]) {
        revenue[currency] = 0;
      }
      
      revenue[currency] += parseFloat(payment.amount || 0);
    }
    
    // Round to 2 decimal places
    for (const currency in revenue) {
      revenue[currency] = Math.round(revenue[currency] * 100) / 100;
    }
    
    return revenue;
  }

  /**
   * Calculate revenue by payment method
   * @param {Array} payments - Payments
   * @returns {Object} - Revenue by method
   */
  calculateRevenueByMethod(payments) {
    const revenue = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const method = payment.method || 'unknown';
      const currency = payment.currency || 'UNKNOWN';
      
      if (!revenue[method]) {
        revenue[method] = {};
      }
      
      if (!revenue[method][currency]) {
        revenue[method][currency] = 0;
      }
      
      revenue[method][currency] += parseFloat(payment.amount || 0);
    }
    
    // Round to 2 decimal places
    for (const method in revenue) {
      for (const currency in revenue[method]) {
        revenue[method][currency] = Math.round(revenue[method][currency] * 100) / 100;
      }
    }
    
    return revenue;
  }

  /**
   * Calculate revenue by payment provider
   * @param {Array} payments - Payments
   * @returns {Object} - Revenue by provider
   */
  calculateRevenueByProvider(payments) {
    const revenue = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const provider = payment.provider || 'unknown';
      const currency = payment.currency || 'UNKNOWN';
      
      if (!revenue[provider]) {
        revenue[provider] = {};
      }
      
      if (!revenue[provider][currency]) {
        revenue[provider][currency] = 0;
      }
      
      revenue[provider][currency] += parseFloat(payment.amount || 0);
    }
    
    // Round to 2 decimal places
    for (const provider in revenue) {
      for (const currency in revenue[provider]) {
        revenue[provider][currency] = Math.round(revenue[provider][currency] * 100) / 100;
      }
    }
    
    return revenue;
  }

  /**
   * Calculate revenue by day
   * @param {Array} payments - Payments
   * @returns {Object} - Revenue by day
   */
  calculateRevenueByDay(payments) {
    const revenue = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const date = new Date(payment.createdAt);
      const day = date.toISOString().split('T')[0];
      const currency = payment.currency || 'UNKNOWN';
      
      if (!revenue[day]) {
        revenue[day] = {};
      }
      
      if (!revenue[day][currency]) {
        revenue[day][currency] = 0;
      }
      
      revenue[day][currency] += parseFloat(payment.amount || 0);
    }
    
    // Round to 2 decimal places
    for (const day in revenue) {
      for (const currency in revenue[day]) {
        revenue[day][currency] = Math.round(revenue[day][currency] * 100) / 100;
      }
    }
    
    return revenue;
  }

  /**
   * Calculate overall success rate
   * @param {Array} payments - Payments
   * @returns {number} - Success rate (0-100)
   */
  calculateSuccessRate(payments) {
    if (!payments || payments.length === 0) return 0;
    
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p)).length;
    const totalPayments = payments.length;
    
    return Math.round((successfulPayments / totalPayments) * 10000) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate success rate by payment method
   * @param {Array} payments - Payments
   * @returns {Object} - Success rate by method
   */
  calculateSuccessRateByMethod(payments) {
    const methodCount = {};
    const methodSuccess = {};
    
    for (const payment of payments) {
      const method = payment.method || 'unknown';
      
      if (!methodCount[method]) {
        methodCount[method] = 0;
        methodSuccess[method] = 0;
      }
      
      methodCount[method]++;
      
      if (this.isSuccessfulPayment(payment)) {
        methodSuccess[method]++;
      }
    }
    
    const successRates = {};
    
    for (const method in methodCount) {
      successRates[method] = Math.round((methodSuccess[method] / methodCount[method]) * 10000) / 100;
    }
    
    return successRates;
  }

  /**
   * Calculate success rate by payment provider
   * @param {Array} payments - Payments
   * @returns {Object} - Success rate by provider
   */
  calculateSuccessRateByProvider(payments) {
    const providerCount = {};
    const providerSuccess = {};
    
    for (const payment of payments) {
      const provider = payment.provider || 'unknown';
      
      if (!providerCount[provider]) {
        providerCount[provider] = 0;
        providerSuccess[provider] = 0;
      }
      
      providerCount[provider]++;
      
      if (this.isSuccessfulPayment(payment)) {
        providerSuccess[provider]++;
      }
    }
    
    const successRates = {};
    
    for (const provider in providerCount) {
      successRates[provider] = Math.round((providerSuccess[provider] / providerCount[provider]) * 10000) / 100;
    }
    
    return successRates;
  }

  /**
   * Calculate average transaction value
   * @param {Array} payments - Payments
   * @returns {Object} - Avg transaction value by currency
   */
  calculateAvgTransactionValue(payments) {
    if (!payments || payments.length === 0) return {};
    
    const totalByCurrency = {};
    const countByCurrency = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const currency = payment.currency || 'UNKNOWN';
      
      if (!totalByCurrency[currency]) {
        totalByCurrency[currency] = 0;
        countByCurrency[currency] = 0;
      }
      
      totalByCurrency[currency] += parseFloat(payment.amount || 0);
      countByCurrency[currency]++;
    }
    
    const avgValues = {};
    
    for (const currency in totalByCurrency) {
      avgValues[currency] = Math.round((totalByCurrency[currency] / countByCurrency[currency]) * 100) / 100;
    }
    
    return avgValues;
  }

  /**
   * Calculate median transaction value
   * @param {Array} payments - Payments
   * @returns {Object} - Median transaction value by currency
   */
  calculateMedianTransactionValue(payments) {
    if (!payments || payments.length === 0) return {};
    
    const valuesByCurrency = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const currency = payment.currency || 'UNKNOWN';
      
      if (!valuesByCurrency[currency]) {
        valuesByCurrency[currency] = [];
      }
      
      valuesByCurrency[currency].push(parseFloat(payment.amount || 0));
    }
    
    const medianValues = {};
    
    for (const currency in valuesByCurrency) {
      const values = valuesByCurrency[currency].sort((a, b) => a - b);
      const middleIndex = Math.floor(values.length / 2);
      
      if (values.length % 2 === 0) {
        medianValues[currency] = Math.round(((values[middleIndex - 1] + values[middleIndex]) / 2) * 100) / 100;
      } else {
        medianValues[currency] = Math.round(values[middleIndex] * 100) / 100;
      }
    }
    
    return medianValues;
  }

  /**
   * Calculate minimum transaction value
   * @param {Array} payments - Payments
   * @returns {Object} - Min transaction value by currency
   */
  calculateMinTransactionValue(payments) {
    if (!payments || payments.length === 0) return {};
    
    const minByCurrency = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const currency = payment.currency || 'UNKNOWN';
      const amount = parseFloat(payment.amount || 0);
      
      if (!minByCurrency[currency] || amount < minByCurrency[currency]) {
        minByCurrency[currency] = amount;
      }
    }
    
    // Round to 2 decimal places
    for (const currency in minByCurrency) {
      minByCurrency[currency] = Math.round(minByCurrency[currency] * 100) / 100;
    }
    
    return minByCurrency;
  }

  /**
   * Calculate maximum transaction value
   * @param {Array} payments - Payments
   * @returns {Object} - Max transaction value by currency
   */
  calculateMaxTransactionValue(payments) {
    if (!payments || payments.length === 0) return {};
    
    const maxByCurrency = {};
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    for (const payment of successfulPayments) {
      const currency = payment.currency || 'UNKNOWN';
      const amount = parseFloat(payment.amount || 0);
      
      if (!maxByCurrency[currency] || amount > maxByCurrency[currency]) {
        maxByCurrency[currency] = amount;
      }
    }
    
    // Round to 2 decimal places
    for (const currency in maxByCurrency) {
      maxByCurrency[currency] = Math.round(maxByCurrency[currency] * 100) / 100;
    }
    
    return maxByCurrency;
  }

  /**
   * Calculate payment method distribution
   * @param {Array} payments - Payments
   * @returns {Object} - Payment method distribution
   */
  calculatePaymentMethodDistribution(payments) {
    if (!payments || payments.length === 0) return {};
    
    const methodCount = {};
    
    for (const payment of payments) {
      const method = payment.method || 'unknown';
      
      if (!methodCount[method]) {
        methodCount[method] = 0;
      }
      
      methodCount[method]++;
    }
    
    const distribution = {};
    
    for (const method in methodCount) {
      distribution[method] = Math.round((methodCount[method] / payments.length) * 10000) / 100;
    }
    
    return distribution;
  }

  /**
   * Calculate provider distribution
   * @param {Array} payments - Payments
   * @returns {Object} - Provider distribution
   */
  calculateProviderDistribution(payments) {
    if (!payments || payments.length === 0) return {};
    
    const providerCount = {};
    
    for (const payment of payments) {
      const provider = payment.provider || 'unknown';
      
      if (!providerCount[provider]) {
        providerCount[provider] = 0;
      }
      
      providerCount[provider]++;
    }
    
    const distribution = {};
    
    for (const provider in providerCount) {
      distribution[provider] = Math.round((providerCount[provider] / payments.length) * 10000) / 100;
    }
    
    return distribution;
  }

  /**
   * Calculate currency distribution
   * @param {Array} payments - Payments
   * @returns {Object} - Currency distribution
   */
  calculateCurrencyDistribution(payments) {
    if (!payments || payments.length === 0) return {};
    
    const currencyCount = {};
    
    for (const payment of payments) {
      const currency = payment.currency || 'UNKNOWN';
      
      if (!currencyCount[currency]) {
        currencyCount[currency] = 0;
      }
      
      currencyCount[currency]++;
    }
    
    const distribution = {};
    
    for (const currency in currencyCount) {
      distribution[currency] = Math.round((currencyCount[currency] / payments.length) * 10000) / 100;
    }
    
    return distribution;
  }

  /**
   * Calculate ride payment percentage
   * @param {Array} payments - Payments
   * @returns {number} - Ride payment percentage
   */
  calculateRidePaymentPercentage(payments) {
    if (!payments || payments.length === 0) return 0;
    
    const ridePayments = payments.filter(p => p.rideId).length;
    
    return Math.round((ridePayments / payments.length) * 10000) / 100;
  }

  /**
   * Calculate average ride payment value
   * @param {Array} payments - Payments
   * @returns {Object} - Avg ride payment value by currency
   */
  calculateAvgRidePaymentValue(payments) {
    if (!payments || payments.length === 0) return {};
    
    const ridePayments = payments.filter(p => p.rideId && this.isSuccessfulPayment(p));
    
    if (ridePayments.length === 0) return {};
    
    const totalByCurrency = {};
    const countByCurrency = {};
    
    for (const payment of ridePayments) {
      const currency = payment.currency || 'UNKNOWN';
      
      if (!totalByCurrency[currency]) {
        totalByCurrency[currency] = 0;
        countByCurrency[currency] = 0;
      }
      
      totalByCurrency[currency] += parseFloat(payment.amount || 0);
      countByCurrency[currency]++;
    }
    
    const avgValues = {};
    
    for (const currency in totalByCurrency) {
      avgValues[currency] = Math.round((totalByCurrency[currency] / countByCurrency[currency]) * 100) / 100;
    }
    
    return avgValues;
  }

  /**
   * Analyze payment failure reasons
   * @param {Array} payments - Payments
   * @returns {Object} - Failure reasons
   */
  analyzeFailureReasons(payments) {
    if (!payments || payments.length === 0) return {};
    
    const failedPayments = payments.filter(p => this.isFailedPayment(p));
    
    if (failedPayments.length === 0) return {};
    
    const reasons = {};
    
    for (const payment of failedPayments) {
      let reason = 'unknown';
      
      if (payment.errorMessage) {
        reason = this.categorizeFailureReason(payment.errorMessage);
      }
      
      if (!reasons[reason]) {
        reasons[reason] = 0;
      }
      
      reasons[reason]++;
    }
    
    // Calculate percentages
    const totalFailures = failedPayments.length;
    const reasonPercentages = {};
    
    for (const reason in reasons) {
      reasonPercentages[reason] = Math.round((reasons[reason] / totalFailures) * 10000) / 100;
    }
    
    return {
      totalFailures,
      reasonCounts: reasons,
      reasonPercentages
    };
  }

  /**
   * Categorize failure reason from error message
   * @param {string} errorMessage - Error message
   * @returns {string} - Categorized reason
   */
  categorizeFailureReason(errorMessage) {
    if (!errorMessage) return 'unknown';
    
    const message = errorMessage.toLowerCase();
    
    if (message.includes('insufficient') || message.includes('balance')) {
      return 'insufficient_funds';
    } else if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    } else if (message.includes('declined') || message.includes('rejected')) {
      return 'declined_by_bank';
    } else if (message.includes('invalid') && (message.includes('card') || message.includes('number'))) {
      return 'invalid_card';
    } else if (message.includes('expired')) {
      return 'expired_card';
    } else if (message.includes('invalid') && message.includes('pin')) {
      return 'invalid_pin';
    } else if (message.includes('limit') || message.includes('restricted')) {
      return 'limit_exceeded';
    } else if (message.includes('3d') && message.includes('secure')) {
      return '3d_secure_failed';
    } else if (message.includes('fraud') || message.includes('suspicious')) {
      return 'fraud_suspicion';
    } else if (message.includes('network') || message.includes('connectivity')) {
      return 'network_error';
    } else if (message.includes('server') || message.includes('system')) {
      return 'system_error';
    } else if (message.includes('verification') || message.includes('verify')) {
      return 'verification_failed';
    } else if (message.includes('cancel')) {
      return 'user_cancelled';
    }
    
    return 'other';
  }

  /**
   * Identify high-value transactions
   * @param {Array} payments - Payments
   * @param {number} threshold - Value threshold
   * @returns {Array} - High-value transactions
   */
  identifyHighValueTransactions(payments, threshold = 500) {
    if (!payments || payments.length === 0) return [];
    
    // Only consider successful payments
    const successfulPayments = payments.filter(p => this.isSuccessfulPayment(p));
    
    // Filter high-value transactions
    return successfulPayments.filter(payment => {
      const amount = parseFloat(payment.amount || 0);
      return amount >= threshold;
    }).map(payment => ({
      id: payment.id,
      reference: payment.reference,
      providerReference: payment.providerReference,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      userId: payment.userId,
      rideId: payment.rideId,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt
    }));
  }

  /**
   * Store metrics by period
   * @param {Object} metrics - Metrics data
   * @param {string} period - Period ('daily', 'weekly', 'monthly')
   * @param {Date} date - Date
   */
  storeMetricsByPeriod(metrics, period, date) {
    const formattedDate = date.toISOString().split('T')[0];
    
    switch (period) {
      case 'daily':
        this.metrics.dailyRevenue[formattedDate] = metrics.totalRevenue;
        break;
        
      case 'weekly':
        // Get week number and year
        const weekOfYear = moment(date).isoWeek();
        const year = date.getFullYear();
        const weekKey = `${year}-W${weekOfYear}`;
        
        this.metrics.weeklyRevenue[weekKey] = metrics.totalRevenue;
        break;
        
      case 'monthly':
        // Get month and year
        const monthOfYear = date.getMonth() + 1;
        const yearMonth = `${date.getFullYear()}-${monthOfYear.toString().padStart(2, '0')}`;
        
        this.metrics.monthlyRevenue[yearMonth] = metrics.totalRevenue;
        break;
    }
    
    // Store method distribution
    this.metrics.paymentMethodDistribution[formattedDate] = metrics.paymentMethodDistribution;
    
    // Store success rates
    this.metrics.successRates[formattedDate] = {
      overall: metrics.successRate,
      byMethod: metrics.successRateByMethod,
      byProvider: metrics.successRateByProvider
    };
    
    // Store provider performance
    this.metrics.providerPerformance[formattedDate] = {
      distribution: metrics.providerDistribution,
      successRates: metrics.successRateByProvider,
      revenue: metrics.revenueByProvider
    };
    
    // Store avg transaction value
    this.metrics.avgTransactionValue[formattedDate] = metrics.avgTransactionValue;
    
    // Store ride payment ratio
    this.metrics.ridePaymentRatio[formattedDate] = {
      percentage: metrics.ridePaymentPercentage,
      avgValue: metrics.avgRidePaymentValue
    };
    
    // Store payment failure reasons
    this.metrics.paymentFailureReasons[formattedDate] = metrics.failureReasons;
    
    // Store high-value transactions
    this.metrics.highValueTransactions.push(...metrics.highValueTransactions.map(transaction => ({
      ...transaction,
      period,
      periodDate: formattedDate
    })));
    
    // Keep high-value transactions sorted by amount (descending)
    this.metrics.highValueTransactions.sort((a, b) => {
      // First sort by amount
      const amountDiff = parseFloat(b.amount) - parseFloat(a.amount);
      
      // If amount is same, sort by date
      if (amountDiff === 0) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      
      return amountDiff;
    });
    
    // Limit high-value transactions to 1000 records
    if (this.metrics.highValueTransactions.length > 1000) {
      this.metrics.highValueTransactions = this.metrics.highValueTransactions.slice(0, 1000);
    }
  }

  /**
   * Generate analytics report
   * @param {Object} metrics - Metrics data
   * @param {Object} options - Report options
   * @returns {Promise<string>} - Report file path
   */
  async generateAnalyticsReport(metrics, options) {
    try {
      const { startDate, endDate, period } = options;
      
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(__dirname, '../../reports/analytics');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      // Generate report filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dateRange = `${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`;
      const filename = `${period}_analytics_${dateRange}_${timestamp}.json`;
      
      const reportPath = path.join(reportsDir, filename);
      
      // Write report to file
      fs.writeFileSync(reportPath, JSON.stringify({
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        metrics
      }, null, 2));
      
      console.log(`Analytics report generated: ${reportPath}`);
      
      return reportPath;
    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw error;
    }
  }

  /**
   * Get metrics for a period
   * @param {string} period - Period ('daily', 'weekly', 'monthly')
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Object} - Metrics data
   */
  getMetricsForPeriod(period, startDate, endDate) {
    // Convert dates to ISO string if they are Date objects
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
    
    // Get metrics based on period
    switch (period) {
      case 'daily':
        return this.getDailyMetrics(start, end);
        
      case 'weekly':
        return this.getWeeklyMetrics(start, end);
        
      case 'monthly':
        return this.getMonthlyMetrics(start, end);
        
      default:
        return this.getDailyMetrics(start, end);
    }
  }

  /**
   * Get daily metrics
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Object} - Daily metrics
   */
  getDailyMetrics(startDate, endDate) {
    // Create a date range
    const dateRange = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dateRange.push(date.toISOString().split('T')[0]);
    }
    
    // Get metrics for each date
    const metrics = {
      revenue: {},
      paymentMethodDistribution: {},
      successRates: {},
      providerPerformance: {},
      avgTransactionValue: {},
      ridePaymentRatio: {},
      paymentFailureReasons: {}
    };
    
    for (const date of dateRange) {
      metrics.revenue[date] = this.metrics.dailyRevenue[date] || {};
      metrics.paymentMethodDistribution[date] = this.metrics.paymentMethodDistribution[date] || {};
      metrics.successRates[date] = this.metrics.successRates[date] || { overall: 0, byMethod: {}, byProvider: {} };
      metrics.providerPerformance[date] = this.metrics.providerPerformance[date] || { distribution: {}, successRates: {}, revenue: {} };
      metrics.avgTransactionValue[date] = this.metrics.avgTransactionValue[date] || {};
      metrics.ridePaymentRatio[date] = this.metrics.ridePaymentRatio[date] || { percentage: 0, avgValue: {} };
      metrics.paymentFailureReasons[date] = this.metrics.paymentFailureReasons[date] || { totalFailures: 0, reasonCounts: {}, reasonPercentages: {} };
    }
    
    // Get high-value transactions for the period
    const highValueTransactions = this.metrics.highValueTransactions.filter(transaction => {
      return transaction.periodDate >= startDate && transaction.periodDate <= endDate;
    });
    
    return {
      ...metrics,
      highValueTransactions
    };
  }
  
  /**
   * Get weekly metrics
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Object} - Weekly metrics
   */
  getWeeklyMetrics(startDate, endDate) {
    // Create a week range
    const weekRange = [];
    const start = moment(startDate).startOf('isoWeek');
    const end = moment(endDate).endOf('isoWeek');
    
    for (let date = start.clone(); date.isBefore(end); date.add(1, 'week')) {
      const weekOfYear = date.isoWeek();
      const year = date.year();
      weekRange.push(`${year}-W${weekOfYear}`);
    }
    
    // Get metrics for each week
    const metrics = {
      revenue: {}
    };
    
    for (const week of weekRange) {
      metrics.revenue[week] = this.metrics.weeklyRevenue[week] || {};
    }
    
    return metrics;
  }
  
  /**
   * Get monthly metrics
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Object} - Monthly metrics
   */
  getMonthlyMetrics(startDate, endDate) {
    // Create a month range
    const monthRange = [];
    const start = moment(startDate).startOf('month');
    const end = moment(endDate).endOf('month');
    
    for (let date = start.clone(); date.isBefore(end); date.add(1, 'month')) {
      const monthOfYear = date.month() + 1;
      const year = date.year();
      monthRange.push(`${year}-${monthOfYear.toString().padStart(2, '0')}`);
    }
    
    // Get metrics for each month
    const metrics = {
      revenue: {}
    };
    
    for (const month of monthRange) {
      metrics.revenue[month] = this.metrics.monthlyRevenue[month] || {};
    }
    
    return metrics;
  }
}

// Create and export service instance
const paymentAnalyticsService = new PaymentAnalyticsService();

module.exports = {
  paymentAnalyticsService
};
