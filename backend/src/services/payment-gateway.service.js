/**
 * Payment Gateway Service
 * Main service for handling payment processing
 * This service integrates with multiple payment providers and provides a unified interface
 */
const { getPaymentConfig } = require('../config/paymentConfig');
const FlutterwaveProvider = require('./payment-providers/flutterwave-provider');
const PaystackProvider = require('./payment-providers/paystack-provider');

class PaymentGatewayService {
  constructor() {
    this.config = getPaymentConfig();
    this.providers = {};
    this.initialized = false;
  }

  /**
   * Initialize payment gateway providers
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      // Initialize Flutterwave
      if (this.config.providers.flutterwave && this.config.providers.flutterwave.isConfigured) {
        this.providers.flutterwave = new FlutterwaveProvider(this.config);
        const flwInitialized = await this.providers.flutterwave.initialize();
        
        if (flwInitialized) {
          console.log('Flutterwave payment provider initialized successfully');
        } else {
          console.warn('Failed to initialize Flutterwave payment provider');
        }
      }

      // Initialize Paystack
      if (this.config.providers.paystack && this.config.providers.paystack.isConfigured) {
        this.providers.paystack = new PaystackProvider(this.config);
        const paystackInitialized = await this.providers.paystack.initialize();
        
        if (paystackInitialized) {
          console.log('Paystack payment provider initialized successfully');
        } else {
          console.warn('Failed to initialize Paystack payment provider');
        }
      }

      // Check if at least one provider is initialized
      const hasInitializedProviders = Object.values(this.providers).some(provider => 
        provider.getMetadata().isConfigured
      );

      this.initialized = hasInitializedProviders;
      return this.initialized;
    } catch (error) {
      console.error('Error initializing payment gateway:', error);
      return false;
    }
  }

  /**
   * Get payment provider by name
   * @param {string} providerName Name of the provider
   * @returns {Object|null} Payment provider instance or null if not found
   */
  getProvider(providerName) {
    return this.providers[providerName] || null;
  }

  /**
   * Select the best payment provider based on criteria
   * @param {Object} criteria Selection criteria
   * @param {string} criteria.paymentMethod Payment method (card, bank_transfer, etc.)
   * @param {string} criteria.currency Currency code (NGN, GHS, etc.)
   * @param {string} criteria.country Country code (NG, GH, etc.)
   * @returns {Object|null} Selected payment provider or null if none found
   */
  selectProvider(criteria = {}) {
    const { paymentMethod, currency, country } = criteria;
    const defaultProvider = this.config.defaultProvider;
    
    // If specific provider is requested and available, use it
    if (criteria.provider && this.providers[criteria.provider]) {
      return this.providers[criteria.provider];
    }
    
    // Filter providers by payment method, currency, and country
    const eligibleProviders = Object.values(this.providers).filter(provider => {
      const metadata = provider.getMetadata();
      
      const supportsMethod = !paymentMethod || metadata.supportedPaymentMethods.includes(paymentMethod);
      const supportsCurrency = !currency || metadata.supportedCurrencies.includes(currency);
      const supportsCountry = !country || metadata.supportedCountries.includes(country);
      
      return metadata.isConfigured && supportsMethod && supportsCurrency && supportsCountry;
    });
    
    if (eligibleProviders.length === 0) {
      // Fallback to default provider if it exists
      return this.providers[defaultProvider] || null;
    }
    
    // For now, just return the first eligible provider
    // In a more advanced implementation, you could prioritize providers based on
    // fees, reliability, or other criteria
    return eligibleProviders[0];
  }

  /**
   * Initiate a payment
   * @param {Object} paymentData Payment details
   * @param {Object} options Additional options
   * @returns {Promise<Object>} Payment initialization result
   */
  async initiatePayment(paymentData, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Payment gateway not initialized');
      }

      // Determine the provider to use
      const provider = options.provider ? 
        this.getProvider(options.provider) : 
        this.selectProvider({
          paymentMethod: paymentData.paymentMethod,
          currency: paymentData.currency,
          country: paymentData.country || (paymentData.customer ? paymentData.customer.country : null)
        });
      
      if (!provider) {
        throw new Error('No suitable payment provider found');
      }
      
      // Initialize payment with the selected provider
      const result = await provider.initiatePayment(paymentData);
      
      // Add provider information to the result
      if (result.success) {
        result.data.provider = provider.name;
      }
      
      return result;
    } catch (error) {
      console.error('Payment initiation error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initiate payment',
        error: error.stack
      };
    }
  }

  /**
   * Verify a payment
   * @param {string} reference Payment reference
   * @param {string} provider Provider name (optional)
   * @returns {Promise<Object>} Payment verification result
   */
  async verifyPayment(reference, provider = null) {
    try {
      if (!this.initialized) {
        throw new Error('Payment gateway not initialized');
      }
      
      // If provider is specified, use that provider
      if (provider && this.providers[provider]) {
        return await this.providers[provider].verifyPayment(reference);
      }
      
      // Otherwise, try each provider until one succeeds
      for (const providerInstance of Object.values(this.providers)) {
        try {
          const result = await providerInstance.verifyPayment(reference);
          if (result.success) {
            return result;
          }
        } catch (e) {
          // Continue to next provider
          console.warn(`Provider ${providerInstance.name} failed to verify payment:`, e.message);
        }
      }
      
      return {
        success: false,
        message: 'Payment verification failed with all providers',
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify payment',
        error: error.stack
      };
    }
  }

  /**
   * Process a webhook event
   * @param {Object} payload Webhook payload
   * @param {Object} headers Request headers
   * @returns {Promise<Object>} Webhook processing result
   */
  async processWebhook(payload, headers) {
    try {
      if (!this.initialized) {
        throw new Error('Payment gateway not initialized');
      }
      
      // Determine which provider this webhook is for based on headers or payload
      const providerName = this.determineWebhookProvider(headers, payload);
      
      if (!providerName || !this.providers[providerName]) {
        throw new Error('Could not determine webhook provider');
      }
      
      // Process the webhook with the appropriate provider
      return await this.providers[providerName].processWebhook(payload, headers);
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        message: error.message || 'Failed to process webhook',
        error: error.stack
      };
    }
  }

  /**
   * Determine which provider a webhook is from based on headers and payload
   * @param {Object} headers Request headers
   * @param {Object} payload Webhook payload
   * @returns {string|null} Provider name or null if not determined
   */
  determineWebhookProvider(headers, payload) {
    // Check Flutterwave
    if (headers['verif-hash'] && this.providers.flutterwave) {
      return 'flutterwave';
    }
    
    // Check Paystack
    if (headers['x-paystack-signature'] && this.providers.paystack) {
      return 'paystack';
    }
    
    // If can't determine from headers, try from payload structure
    if (payload.event && payload.data) {
      if (payload.event.startsWith('charge.') && this.providers.flutterwave) {
        return 'flutterwave';
      }
      
      if ((payload.event === 'charge.success' || payload.event === 'transfer.success') && this.providers.paystack) {
        return 'paystack';
      }
    }
    
    return null;
  }

  /**
   * Refund a payment
   * @param {string} transactionId Transaction ID to refund
   * @param {Object} options Refund options
   * @param {number} options.amount Amount to refund (optional, full refund if not specified)
   * @param {string} options.provider Provider name (required)
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Payment gateway not initialized');
      }
      
      // Provider is required for refunds
      if (!options.provider || !this.providers[options.provider]) {
        throw new Error('Provider is required for refunds');
      }
      
      return await this.providers[options.provider].refundPayment(transactionId, options.amount);
    } catch (error) {
      console.error('Payment refund error:', error);
      return {
        success: false,
        message: error.message || 'Failed to refund payment',
        error: error.stack
      };
    }
  }

  /**
   * Get transaction details
   * @param {string} transactionId Transaction ID
   * @param {string} provider Provider name (optional)
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(transactionId, provider = null) {
    try {
      if (!this.initialized) {
        throw new Error('Payment gateway not initialized');
      }
      
      // If provider is specified, use that provider
      if (provider && this.providers[provider]) {
        return await this.providers[provider].getTransaction(transactionId);
      }
      
      // Otherwise, try each provider until one succeeds
      for (const providerInstance of Object.values(this.providers)) {
        try {
          const result = await providerInstance.getTransaction(transactionId);
          if (result.success) {
            return result;
          }
        } catch (e) {
          // Continue to next provider
          console.warn(`Provider ${providerInstance.name} failed to get transaction:`, e.message);
        }
      }
      
      return {
        success: false,
        message: 'Transaction not found with any provider',
      };
    } catch (error) {
      console.error('Get transaction error:', error);
      return {
        success: false,
        message: error.message || 'Failed to get transaction details',
        error: error.stack
      };
    }
  }

  /**
   * Get available payment methods
   * @param {Object} options Filter options
   * @param {string} options.country Country code
   * @param {string} options.currency Currency code
   * @returns {Array} Available payment methods
   */
  getAvailablePaymentMethods(options = {}) {
    if (!this.initialized) {
      return [];
    }
    
    const { country, currency } = options;
    
    // Get all payment methods from all providers
    const allMethods = new Set();
    
    Object.values(this.providers).forEach(provider => {
      const metadata = provider.getMetadata();
      
      // Check if provider supports the country and currency
      const supportsCountry = !country || metadata.supportedCountries.includes(country);
      const supportsCurrency = !currency || metadata.supportedCurrencies.includes(currency);
      
      if (metadata.isConfigured && supportsCountry && supportsCurrency) {
        metadata.supportedPaymentMethods.forEach(method => allMethods.add(method));
      }
    });
    
    return Array.from(allMethods);
  }
}

// Create singleton instance
const paymentGatewayService = new PaymentGatewayService();

module.exports = paymentGatewayService;
