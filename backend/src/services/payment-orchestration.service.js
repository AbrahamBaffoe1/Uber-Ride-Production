/**
 * Payment Orchestration Service
 * 
 * This service acts as a facade for multiple payment providers, orchestrating
 * which provider to use based on configuration, availability, and user preferences.
 */
const { v4: uuidv4 } = require('uuid');
const { User, Payment, PaymentMethod, MobilePayment, sequelize } = require('../models');
const { mobilePaymentService } = require('./mobilePayment.service');
const { smsService } = require('./sms.service');

// Payment providers
let paystackService;
let flutterwaveService;
let mtnMomoService;

// Lazy load payment providers to avoid circular dependencies
const getPaymentProviders = () => {
  if (!paystackService) {
    paystackService = require('./payment-providers/paystack.service');
  }
  
  if (!flutterwaveService) {
    flutterwaveService = require('./payment-providers/flutterwave.service');
  }
  
  if (!mtnMomoService) {
    mtnMomoService = require('./payment-providers/mtn-momo.service');
  }
  
  return {
    paystack: paystackService,
    flutterwave: flutterwaveService,
    mtnMomo: mtnMomoService
  };
};

class PaymentOrchestrationService {
  constructor() {
    this.fallbackProviderOrder = ['paystack', 'flutterwave', 'mtnMomo'];
    this.mobileMoneyProviders = ['MTN', 'VODAFONE', 'AIRTEL'];
  }
  
  /**
   * Process a payment using the best available provider
   * @param {Object} paymentData Payment data
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentData) {
    const { paymentMethodId, amount, currency, userId, rideId, description } = paymentData;
    
    try {
      // Start transaction
      const transaction = await sequelize.transaction();
      
      try {
        // Get payment method
        const paymentMethod = await PaymentMethod.findOne({
          where: { id: paymentMethodId, userId },
          transaction
        });
        
        if (!paymentMethod) {
          throw new Error('Payment method not found');
        }
        
        // Create payment record in pending state
        const payment = await Payment.create({
          id: uuidv4(),
          userId,
          rideId,
          paymentMethodId,
          amount,
          currency,
          status: 'pending',
          description,
          reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          metadata: {}
        }, { transaction });
        
        // Process payment based on payment method type
        let paymentResult;
        let providerName;
        
        switch (paymentMethod.type) {
          case 'card':
            // Process with card payment provider
            paymentResult = await this.processCardPayment(payment, paymentMethod, transaction);
            providerName = paymentResult.provider;
            break;
            
          case 'mobile_money':
            // Process with mobile money provider
            paymentResult = await this.processMobileMoneyPayment(payment, paymentMethod, transaction);
            providerName = 'mobile_money';
            break;
            
          case 'bank':
            // Process with bank transfer provider
            paymentResult = await this.processBankPayment(payment, paymentMethod, transaction);
            providerName = paymentResult.provider;
            break;
            
          case 'wallet':
            // Process with internal wallet
            paymentResult = await this.processWalletPayment(payment, paymentMethod, transaction);
            providerName = 'wallet';
            break;
            
          default:
            throw new Error(`Unsupported payment method type: ${paymentMethod.type}`);
        }
        
        // Update payment record
        await payment.update({
          status: paymentResult.success ? 'completed' : 'failed',
          providerReference: paymentResult.transactionId || null,
          providerName,
          metadata: {
            ...payment.metadata,
            providerResponse: paymentResult.providerResponse || {}
          },
          errorMessage: paymentResult.success ? null : paymentResult.error,
          completedAt: paymentResult.success ? new Date() : null
        }, { transaction });
        
        // If payment was successful and it's for a ride, update ride payment status
        if (paymentResult.success && rideId) {
          const Ride = require('../models').Ride;
          await Ride.update(
            { paymentStatus: 'completed' },
            { where: { id: rideId }, transaction }
          );
        }
        
        // Commit transaction
        await transaction.commit();
        
        return {
          success: paymentResult.success,
          paymentId: payment.id,
          transactionId: paymentResult.transactionId,
          status: payment.status,
          provider: providerName,
          error: paymentResult.error
        };
      } catch (error) {
        // Rollback transaction on error
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process a card payment with redundancy across providers
   * @param {Object} payment Payment record
   * @param {Object} paymentMethod Payment method record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Payment result
   */
  async processCardPayment(payment, paymentMethod, transaction) {
    const providers = getPaymentProviders();
    
    // Try each provider in order until one succeeds
    for (const providerName of this.fallbackProviderOrder) {
      try {
        const provider = providers[providerName];
        if (!provider || !provider.processCardPayment) continue;
        
        const result = await provider.processCardPayment({
          amount: payment.amount,
          currency: payment.currency,
          cardToken: paymentMethod.providerToken,
          email: payment.user ? payment.user.email : undefined,
          reference: payment.reference,
          metadata: {
            paymentId: payment.id,
            rideId: payment.rideId,
            description: payment.description
          }
        });
        
        if (result.success) {
          return {
            ...result,
            provider: providerName
          };
        }
      } catch (error) {
        console.error(`Error processing card payment with ${providerName}:`, error);
        // Continue to next provider on error
      }
    }
    
    // All providers failed
    return {
      success: false,
      error: 'All payment providers failed to process card payment',
      provider: 'none'
    };
  }
  
  /**
   * Process a mobile money payment
   * @param {Object} payment Payment record
   * @param {Object} paymentMethod Payment method record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Payment result
   */
  async processMobileMoneyPayment(payment, paymentMethod, transaction) {
    try {
      // Get user
      const user = await User.findByPk(payment.userId, { transaction });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Prepare payment data
      const paymentData = {
        userId: payment.userId,
        provider: paymentMethod.provider,
        phoneNumber: paymentMethod.phoneNumber,
        amount: payment.amount,
        type: payment.rideId ? 'PAYMENT' : 'TOP_UP',
        rideId: payment.rideId,
        channel: 'APP',
        initiatedBy: 'SYSTEM',
        ipAddress: null,
        deviceInfo: null,
        notes: payment.description
      };
      
      // Initiate mobile money payment
      const result = await mobilePaymentService.initiatePayment(paymentData);
      
      return {
        success: result.success,
        transactionId: result.success ? result.payment.transactionId : null,
        provider: `mobile_money_${paymentMethod.provider.toLowerCase()}`,
        error: result.success ? null : result.error,
        providerResponse: result.success ? result.payment : null
      };
    } catch (error) {
      console.error('Error processing mobile money payment:', error);
      
      return {
        success: false,
        error: error.message,
        provider: 'mobile_money'
      };
    }
  }
  
  /**
   * Process a bank payment
   * @param {Object} payment Payment record
   * @param {Object} paymentMethod Payment method record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Payment result
   */
  async processBankPayment(payment, paymentMethod, transaction) {
    const providers = getPaymentProviders();
    
    // Try each provider in order until one succeeds
    for (const providerName of this.fallbackProviderOrder) {
      try {
        const provider = providers[providerName];
        if (!provider || !provider.processBankPayment) continue;
        
        const result = await provider.processBankPayment({
          amount: payment.amount,
          currency: payment.currency,
          accountNumber: paymentMethod.accountNumber,
          bankCode: paymentMethod.bankCode,
          accountName: paymentMethod.accountName,
          reference: payment.reference,
          metadata: {
            paymentId: payment.id,
            rideId: payment.rideId,
            description: payment.description
          }
        });
        
        if (result.success) {
          return {
            ...result,
            provider: providerName
          };
        }
      } catch (error) {
        console.error(`Error processing bank payment with ${providerName}:`, error);
        // Continue to next provider on error
      }
    }
    
    // All providers failed
    return {
      success: false,
      error: 'All payment providers failed to process bank payment',
      provider: 'none'
    };
  }
  
  /**
   * Process a wallet payment
   * @param {Object} payment Payment record
   * @param {Object} paymentMethod Payment method record
   * @param {Object} transaction Sequelize transaction
   * @returns {Promise<Object>} Payment result
   */
  async processWalletPayment(payment, paymentMethod, transaction) {
    try {
      // Get user
      const user = await User.findByPk(payment.userId, { transaction });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user has enough balance
      // This is a simplified implementation - in a real app, you would have a proper wallet system
      const userWallet = await user.getWallet({ transaction });
      
      if (!userWallet) {
        throw new Error('User wallet not found');
      }
      
      if (userWallet.balance < payment.amount) {
        throw new Error('Insufficient balance');
      }
      
      // Deduct from wallet
      await userWallet.update({
        balance: sequelize.literal(`balance - ${payment.amount}`),
        lastUpdated: new Date()
      }, { transaction });
      
      // Record wallet transaction
      // This is a simplified example - in a real app, you would have a proper transaction history
      await sequelize.models.WalletTransaction.create({
        id: uuidv4(),
        walletId: userWallet.id,
        amount: -payment.amount, // Negative for outflow
        type: 'PAYMENT',
        reference: payment.reference,
        description: payment.description,
        balance: userWallet.balance - payment.amount
      }, { transaction });
      
      return {
        success: true,
        transactionId: payment.reference,
        provider: 'wallet',
        providerResponse: {
          balance: userWallet.balance - payment.amount
        }
      };
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      
      return {
        success: false,
        error: error.message,
        provider: 'wallet'
      };
    }
  }
}

// Create and export service instance
const paymentOrchestrationService = new PaymentOrchestrationService();

module.exports = {
  paymentOrchestrationService
};
