/**
 * Payment Service
 * This service handles payment processing logic
 * Acts as a facade for the underlying payment gateway
 */
const paymentGatewayService = require('./payment-gateway.service');
const { getPaymentConfig } = require('../config/paymentConfig');

/**
 * Initialize the payment service
 * @returns {Promise<boolean>} Whether initialization was successful
 */
const initialize = async () => {
  try {
    // Initialize the payment gateway service
    const initialized = await paymentGatewayService.initialize();
    
    if (initialized) {
      console.log('Payment service initialized successfully');
    } else {
      console.warn('Payment service initialization failed');
    }
    
    return initialized;
  } catch (error) {
    console.error('Payment service initialization error:', error);
    return false;
  }
};

/**
 * Process a payment with the appropriate payment provider
 * @param {Object} paymentData - Payment details
 * @param {number} paymentData.amount - Amount to charge
 * @param {string} paymentData.currency - Currency code (e.g., NGN)
 * @param {string} paymentData.paymentMethod - Payment method (card, bank_transfer, etc.)
 * @param {string} paymentData.email - Customer email
 * @param {string} paymentData.name - Customer name
 * @param {string} paymentData.phone - Customer phone number
 * @param {Object} paymentData.meta - Additional metadata
 * @param {Object} options - Additional options
 * @param {string} options.provider - Specific provider to use (optional)
 * @returns {Promise<Object>} payment result with transaction reference and status
 */
const processPayment = async (paymentData, options = {}) => {
  try {
    // Ensure the payment service is initialized
    if (!paymentGatewayService.initialized) {
      await initialize();
    }
    
    // Set default currency if not provided
    if (!paymentData.currency) {
      const config = getPaymentConfig();
      paymentData.currency = config.defaultCurrency;
    }
    
    // Map to the payment method type expected by providers if needed
    if (paymentData.paymentMethodType && !paymentData.paymentMethod) {
      paymentData.paymentMethod = paymentData.paymentMethodType;
    }
    
    // Process the payment using the gateway service
    const result = await paymentGatewayService.initiatePayment(paymentData, options);
    
    // Add additional info for client handling
    if (result.success) {
      result.paymentInfo = {
        amount: paymentData.amount,
        currency: paymentData.currency,
        reference: result.data.reference,
        redirectUrl: result.data.redirectUrl || null,
        provider: result.data.provider
      };
    }
    
    return result;
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      message: 'Payment processing failed',
      error: error.message
    };
  }
};

/**
 * Verify a payment
 * @param {string} reference - Payment reference
 * @param {string} provider - Provider name (optional)
 * @returns {Promise<Object>} - Verification result
 */
const verifyPayment = async (reference, provider = null) => {
  try {
    // Ensure the payment service is initialized
    if (!paymentGatewayService.initialized) {
      await initialize();
    }
    
    return await paymentGatewayService.verifyPayment(reference, provider);
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      message: 'Payment verification failed',
      error: error.message
    };
  }
};

/**
 * Process a payment webhook
 * @param {Object} payload - Webhook payload
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} - Webhook processing result
 */
const processWebhook = async (payload, headers) => {
  try {
    // Ensure the payment service is initialized
    if (!paymentGatewayService.initialized) {
      await initialize();
    }
    
    return await paymentGatewayService.processWebhook(payload, headers);
  } catch (error) {
    console.error('Payment webhook processing error:', error);
    return {
      success: false,
      message: 'Payment webhook processing failed',
      error: error.message
    };
  }
};

/**
 * Refund a payment
 * @param {string} transactionId - Transaction ID
 * @param {Object} options - Refund options
 * @param {number} options.amount - Amount to refund (optional)
 * @param {string} options.provider - Provider name (required)
 * @returns {Promise<Object>} - Refund result
 */
const refundPayment = async (transactionId, options = {}) => {
  try {
    // Ensure the payment service is initialized
    if (!paymentGatewayService.initialized) {
      await initialize();
    }
    
    return await paymentGatewayService.refundPayment(transactionId, options);
  } catch (error) {
    console.error('Payment refund error:', error);
    return {
      success: false,
      message: 'Payment refund failed',
      error: error.message
    };
  }
};

/**
 * Get available payment methods for a country and currency
 * @param {Object} options - Filter options
 * @param {string} options.country - Country code
 * @param {string} options.currency - Currency code
 * @returns {Promise<Array>} - Available payment methods
 */
const getAvailablePaymentMethods = async (options = {}) => {
  try {
    // Ensure the payment service is initialized
    if (!paymentGatewayService.initialized) {
      await initialize();
    }
    
    const methods = paymentGatewayService.getAvailablePaymentMethods(options);
    
    return {
      success: true,
      data: {
        methods
      }
    };
  } catch (error) {
    console.error('Error getting available payment methods:', error);
    return {
      success: false,
      message: 'Failed to get available payment methods',
      error: error.message
    };
  }
};

/**
 * Get transaction details
 * @param {string} transactionId - Transaction ID
 * @param {string} provider - Provider name (optional)
 * @returns {Promise<Object>} - Transaction details
 */
const getTransaction = async (transactionId, provider = null) => {
  try {
    // Ensure the payment service is initialized
    if (!paymentGatewayService.initialized) {
      await initialize();
    }
    
    return await paymentGatewayService.getTransaction(transactionId, provider);
  } catch (error) {
    console.error('Error getting transaction details:', error);
    return {
      success: false,
      message: 'Failed to get transaction details',
      error: error.message
    };
  }
};

// Initialize service when module is imported
initialize().catch(error => {
  console.error('Failed to initialize payment service:', error);
});

module.exports = {
  initialize,
  processPayment,
  verifyPayment,
  processWebhook,
  refundPayment,
  getAvailablePaymentMethods,
  getTransaction
};
