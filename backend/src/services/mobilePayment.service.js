/**
 * Mobile Payment Service
 * Handles mobile money payments, callbacks, and integration with payment providers.
 */
const { v4: uuidv4 } = require('uuid');
const { User, MobilePayment, sequelize } = require('../models');
const { smsService } = require('./sms.service');
const { emitNotification } = require('./socket.service');

/**
 * Mobile Payment Service
 */
class MobilePaymentService {
  constructor() {
    // Supported mobile money providers
    this.providers = {
      MTN: 'MTN Mobile Money',
      VODAFONE: 'Vodafone Cash',
      AIRTEL: 'Airtel Money',
    };
    
    // Payment transaction types
    this.transactionTypes = {
      PAYMENT: 'PAYMENT',    // Ride payment
      TOP_UP: 'TOP_UP',      // Wallet top-up
      REFUND: 'REFUND',      // Refund to user
    };
    
    // Payment transaction statuses
    this.transactionStatuses = {
      PENDING: 'PENDING',      // Transaction initiated but not confirmed
      COMPLETED: 'COMPLETED',  // Transaction successfully completed
      FAILED: 'FAILED',        // Transaction failed
      CANCELLED: 'CANCELLED',  // Transaction cancelled by user or system
      REFUNDED: 'REFUNDED',    // Transaction refunded
    };
    
    // Channels through which payments can be initiated
    this.paymentChannels = {
      SMS: 'SMS',      // Payment initiated via SMS
      USSD: 'USSD',    // Payment initiated via USSD
      APP: 'APP',      // Payment initiated via mobile app
      WEB: 'WEB',      // Payment initiated via web interface
    };
  }
  
  /**
   * Initiate a mobile money payment
   * @param {Object} paymentData Payment data
   * @param {string} paymentData.userId User ID
   * @param {string} paymentData.provider Mobile money provider (MTN, VODAFONE, AIRTEL)
   * @param {string} paymentData.phoneNumber Phone number to charge
   * @param {number} paymentData.amount Amount to charge
   * @param {string} paymentData.type Transaction type (PAYMENT, TOP_UP, REFUND)
   * @param {string} paymentData.rideId Ride ID (optional, for ride payments)
   * @param {string} paymentData.channel Channel through which payment is initiated (SMS, USSD, APP, WEB)
   * @param {string} paymentData.sessionId USSD session ID (optional, for USSD payments)
   * @returns {Promise<Object>} Payment transaction
   */
  async initiatePayment(paymentData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Validate payment data
      this.validatePaymentData(paymentData);
      
      // Check if user exists
      const user = await User.findByPk(paymentData.userId, { transaction });
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create payment record
      const payment = await MobilePayment.create({
        id: uuidv4(),
        userId: paymentData.userId,
        provider: paymentData.provider,
        phoneNumber: paymentData.phoneNumber,
        amount: paymentData.amount,
        type: paymentData.type,
        rideId: paymentData.rideId || null,
        sessionId: paymentData.sessionId || null,
        paymentMethod: 'MOBILE_MONEY',
        channel: paymentData.channel,
        status: this.transactionStatuses.PENDING,
        initiatedAt: new Date(),
        metaData: {
          initiatedBy: paymentData.initiatedBy || 'SYSTEM',
          ipAddress: paymentData.ipAddress || null,
          deviceInfo: paymentData.deviceInfo || null,
          notes: paymentData.notes || null,
        },
      }, { transaction });
      
      // Process payment based on provider
      let processingResult;
      
      switch (paymentData.provider) {
        case 'MTN':
          processingResult = await this.processMtnPayment(payment, transaction);
          break;
          
        case 'VODAFONE':
          processingResult = await this.processVodafonePayment(payment, transaction);
          break;
          
        case 'AIRTEL':
          processingResult = await this.processAirtelPayment(payment, transaction);
          break;
          
        default:
          throw new Error(`Unsupported mobile money provider: ${paymentData.provider}`);
      }
      
      // Update payment with provider transaction ID
      await payment.update({
        providerTransactionId: processingResult.transactionId,
        metaData: {
          ...payment.metaData,
          providerResponse: processingResult.providerResponse,
        },
      }, { transaction });
      
      // Commit transaction
      await transaction.commit();
      
      // Send payment confirmation SMS (for channels other than SMS)
      if (paymentData.channel !== this.paymentChannels.SMS) {
        this.sendPaymentConfirmationSms(payment).catch(error => {
          console.error('Error sending payment confirmation SMS:', error);
        });
      }
      
      // Return payment details
      return {
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          status: payment.status,
          transactionId: processingResult.transactionId,
          message: processingResult.message,
        },
      };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      
      // Log error
      console.error('Payment initiation error:', error);
      
      // Return error details
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Validate payment data
   * @param {Object} paymentData Payment data to validate
   * @throws {Error} If validation fails
   */
  validatePaymentData(paymentData) {
    // Required fields
    if (!paymentData.userId) throw new Error('User ID is required');
    if (!paymentData.provider) throw new Error('Provider is required');
    if (!paymentData.phoneNumber) throw new Error('Phone number is required');
    if (!paymentData.amount) throw new Error('Amount is required');
    if (!paymentData.type) throw new Error('Transaction type is required');
    if (!paymentData.channel) throw new Error('Channel is required');
    
    // Field validation
    if (!Object.keys(this.providers).includes(paymentData.provider)) {
      throw new Error(`Invalid provider: ${paymentData.provider}`);
    }
    
    if (!Object.values(this.transactionTypes).includes(paymentData.type)) {
      throw new Error(`Invalid transaction type: ${paymentData.type}`);
    }
    
    if (!Object.values(this.paymentChannels).includes(paymentData.channel)) {
      throw new Error(`Invalid channel: ${paymentData.channel}`);
    }
    
    if (isNaN(parseFloat(paymentData.amount)) || parseFloat(paymentData.amount) <= 0) {
      throw new Error('Amount must be a positive number');
    }
    
    // If ride payment, ride ID is required
    if (paymentData.type === this.transactionTypes.PAYMENT && !paymentData.rideId) {
      throw new Error('Ride ID is required for ride payments');
    }
    
    // If USSD channel, session ID is required
    if (paymentData.channel === this.paymentChannels.USSD && !paymentData.sessionId) {
      throw new Error('Session ID is required for USSD payments');
    }
  }
  
  /**
   * Process MTN Mobile Money payment
   * @param {Object} payment Payment record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Processing result
   */
  async processMtnPayment(payment, transaction) {
    try {
      // In a real implementation, this would integrate with MTN Mobile Money API
      // For demo purposes, we'll simulate a successful payment
      
      // Generate a transaction ID
      const transactionId = `MTN-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      
      // Return processing result
      return {
        success: true,
        transactionId,
        message: 'Payment request sent. Please check your phone to confirm the payment.',
        providerResponse: {
          status: 'PENDING',
          transactionId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error processing MTN payment:', error);
      throw error;
    }
  }
  
  /**
   * Process Vodafone Cash payment
   * @param {Object} payment Payment record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Processing result
   */
  async processVodafonePayment(payment, transaction) {
    try {
      // In a real implementation, this would integrate with Vodafone Cash API
      // For demo purposes, we'll simulate a successful payment
      
      // Generate a transaction ID
      const transactionId = `VF-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      
      // Return processing result
      return {
        success: true,
        transactionId,
        message: 'Payment request sent. Please dial *110# to confirm the payment.',
        providerResponse: {
          status: 'PENDING',
          transactionId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error processing Vodafone payment:', error);
      throw error;
    }
  }
  
  /**
   * Process Airtel Money payment
   * @param {Object} payment Payment record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Processing result
   */
  async processAirtelPayment(payment, transaction) {
    try {
      // In a real implementation, this would integrate with Airtel Money API
      // For demo purposes, we'll simulate a successful payment
      
      // Generate a transaction ID
      const transactionId = `AIRTEL-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      
      // Return processing result
      return {
        success: true,
        transactionId,
        message: 'Payment request sent. Please check your phone to confirm the payment.',
        providerResponse: {
          status: 'PENDING',
          transactionId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error processing Airtel payment:', error);
      throw error;
    }
  }
  
  /**
   * Send payment confirmation SMS
   * @param {Object} payment Payment record
   */
  async sendPaymentConfirmationSms(payment) {
    try {
      // Format amount with 2 decimal places
      const formattedAmount = parseFloat(payment.amount).toFixed(2);
      
      // Build message based on payment type
      let message;
      
      if (payment.type === this.transactionTypes.PAYMENT) {
        message = `Payment of ${payment.currency} ${formattedAmount} to Okada Transport initiated. Please confirm the payment on your phone.`;
      } else if (payment.type === this.transactionTypes.TOP_UP) {
        message = `Top-up request of ${payment.currency} ${formattedAmount} for your Okada Transport wallet initiated. Please confirm the payment on your phone.`;
      } else {
        message = `${payment.type} of ${payment.currency} ${formattedAmount} initiated. Please confirm the payment on your phone.`;
      }
      
      // Add transaction ID
      message += ` Transaction ID: ${payment.providerTransactionId}`;
      
      // Send SMS
      await smsService.sendSMS(payment.phoneNumber, message);
    } catch (error) {
      console.error('Error sending payment confirmation SMS:', error);
      throw error;
    }
  }
  
  /**
   * Process payment callback
   * @param {Object} callbackData Callback data from payment provider
   * @returns {Promise<Object>} Processing result
   */
  async processPaymentCallback(callbackData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Get payment by provider transaction ID
      const payment = await MobilePayment.findOne({
        where: {
          providerTransactionId: callbackData.transactionId
        },
        transaction
      });
      
      if (!payment) {
        throw new Error(`Payment not found for transaction ID: ${callbackData.transactionId}`);
      }
      
      // Get user
      const user = await User.findByPk(payment.userId, { transaction });
      
      if (!user) {
        throw new Error(`User not found for payment: ${payment.id}`);
      }
      
      // Update payment status and metadata
      await payment.update({
        status: this.mapProviderStatus(callbackData.status),
        completedAt: callbackData.status === 'SUCCESS' ? new Date() : null,
        failureReason: callbackData.status === 'FAILED' ? callbackData.reason : null,
        metaData: {
          ...payment.metaData,
          callbackData
        }
      }, { transaction });
      
      // Process payment based on status and type
      if (callbackData.status === 'SUCCESS') {
        if (payment.type === this.transactionTypes.TOP_UP) {
          // Top-up wallet
          // In a real implementation, this would update the user's wallet balance
          console.log(`Top-up of ${payment.amount} ${payment.currency} for user ${user.id} completed successfully`);
          
          // Send notification
          await this.sendPaymentNotification(payment, user, transaction);
        } else if (payment.type === this.transactionTypes.PAYMENT) {
          // Process ride payment
          // In a real implementation, this would update the ride payment status
          console.log(`Payment of ${payment.amount} ${payment.currency} for ride ${payment.rideId} completed successfully`);
          
          // Send notification
          await this.sendPaymentNotification(payment, user, transaction);
        }
      } else if (callbackData.status === 'FAILED') {
        // Payment failed - notify user
        console.log(`Payment of ${payment.amount} ${payment.currency} failed: ${callbackData.reason}`);
        
        // Send notification
        await this.sendPaymentFailureNotification(payment, user, callbackData.reason, transaction);
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Return processing result
      return {
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          type: payment.type,
          updatedAt: payment.updatedAt
        }
      };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      
      // Log error
      console.error('Error processing payment callback:', error);
      
      // Return error details
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Map provider status to our status enum
   * @param {string} providerStatus Status from provider callback
   * @returns {string} Our status enum value
   */
  mapProviderStatus(providerStatus) {
    const statusMap = {
      'SUCCESS': this.transactionStatuses.COMPLETED,
      'FAILED': this.transactionStatuses.FAILED,
      'CANCELLED': this.transactionStatuses.CANCELLED,
      'PENDING': this.transactionStatuses.PENDING,
      'REFUNDED': this.transactionStatuses.REFUNDED
    };
    
    return statusMap[providerStatus] || this.transactionStatuses.PENDING;
  }
  
  /**
   * Send payment notification
   * @param {Object} payment Payment record
   * @param {Object} user User record
   * @param {Object} transaction Sequelize transaction
   */
  async sendPaymentNotification(payment, user, transaction) {
    try {
      // Format amount with 2 decimal places
      const formattedAmount = parseFloat(payment.amount).toFixed(2);
      
      // Build notification data
      let notificationData = {
        type: payment.type === this.transactionTypes.TOP_UP ? 'top_up_completed' : 'payment_completed',
        title: payment.type === this.transactionTypes.TOP_UP ? 'Top-up Completed' : 'Payment Completed',
        message: payment.type === this.transactionTypes.TOP_UP
          ? `Your wallet has been topped up with ${payment.currency} ${formattedAmount}.`
          : `Your payment of ${payment.currency} ${formattedAmount} has been completed.`,
        data: {
          paymentId: payment.id,
          amount: formattedAmount,
          currency: payment.currency,
          type: payment.type,
          transactionId: payment.providerTransactionId
        },
        priority: 'medium'
      };
      
      // Send in-app notification
      await emitNotification(user.id, notificationData);
      
      // Send SMS notification
      if (payment.channel !== this.paymentChannels.SMS) {
        await smsService.sendSMS(
          payment.phoneNumber,
          `${notificationData.title}: ${notificationData.message} Transaction ID: ${payment.providerTransactionId}`
        );
      }
    } catch (error) {
      console.error('Error sending payment notification:', error);
      // Don't throw error, as this is a non-critical operation
    }
  }
  
  /**
   * Send payment failure notification
   * @param {Object} payment Payment record
   * @param {Object} user User record
   * @param {string} reason Failure reason
   * @param {Object} transaction Sequelize transaction
   */
  async sendPaymentFailureNotification(payment, user, reason, transaction) {
    try {
      // Format amount with 2 decimal places
      const formattedAmount = parseFloat(payment.amount).toFixed(2);
      
      // Build notification data
      const notificationData = {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Your ${payment.type.toLowerCase()} of ${payment.currency} ${formattedAmount} failed: ${reason}`,
        data: {
          paymentId: payment.id,
          amount: formattedAmount,
          currency: payment.currency,
          type: payment.type,
          reason: reason,
          transactionId: payment.providerTransactionId
        },
        priority: 'high'
      };
      
      // Send in-app notification
      await emitNotification(user.id, notificationData);
      
      // Send SMS notification
      if (payment.channel !== this.paymentChannels.SMS) {
        await smsService.sendSMS(
          payment.phoneNumber,
          `${notificationData.title}: ${notificationData.message} Please try again or contact support for assistance.`
        );
      }
    } catch (error) {
      console.error('Error sending payment failure notification:', error);
      // Don't throw error, as this is a non-critical operation
    }
  }
  
  /**
   * Get payment by ID
   * @param {string} paymentId Payment ID
   * @returns {Promise<Object>} Payment record
   */
  async getPaymentById(paymentId) {
    try {
      const payment = await MobilePayment.findByPk(paymentId);
      return payment;
    } catch (error) {
      console.error('Error getting payment by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get user payments
   * @param {string} userId User ID
   * @param {Object} options Query options
   * @param {string} options.type Filter by transaction type
   * @param {string} options.status Filter by status
   * @param {number} options.limit Number of records to return
   * @param {number} options.offset Offset for pagination
   * @returns {Promise<Object>} Payments data with pagination
   */
  async getUserPayments(userId, options = {}) {
    try {
      // Build query options
      const queryOptions = {
        where: { userId },
        order: [['initiatedAt', 'DESC']],
        limit: options.limit || 20,
        offset: options.offset || 0
      };
      
      // Add type filter if provided
      if (options.type) {
        queryOptions.where.type = options.type;
      }
      
      // Add status filter if provided
      if (options.status) {
        queryOptions.where.status = options.status;
      }
      
      // Query payments
      const { count, rows } = await MobilePayment.findAndCountAll(queryOptions);
      
      // Return results with pagination
      return {
        payments: rows,
        total: count,
        limit: queryOptions.limit,
        offset: queryOptions.offset,
        hasMore: count > queryOptions.offset + queryOptions.limit
      };
    } catch (error) {
      console.error('Error getting user payments:', error);
      throw error;
    }
  }
}

// Create and export service instance
const mobilePaymentService = new MobilePaymentService();

module.exports = {
  mobilePaymentService
};
