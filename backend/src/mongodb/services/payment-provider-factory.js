/**
 * MongoDB Payment Provider Factory
 * Initializes and manages MongoDB-integrated payment providers
 */
const { getPaymentConfig } = require('../../config/paymentConfig');
const MongoPaystackProvider = require('./mongo-paystack-provider');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('payment', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('payment', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('payment', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('payment', 'debug', message, metadata)
};

// Store initialized providers
const providers = {};

/**
 * Get a MongoDB-integrated payment provider by name
 * @param {string} providerName - Name of the provider to get
 * @returns {Object} The provider instance
 */
const getProvider = (providerName) => {
  if (providers[providerName]) {
    return providers[providerName];
  }

  const config = getPaymentConfig();
  
  switch (providerName) {
    case 'paystack':
      if (!providers.paystack) {
        providers.paystack = new MongoPaystackProvider(config);
        providers.paystack.initialize()
          .then(initialized => {
            if (initialized) {
              logger.info('MongoDB Paystack provider initialized successfully');
            } else {
              logger.warn('MongoDB Paystack provider initialization failed');
            }
          })
          .catch(error => {
            logger.error('MongoDB Paystack provider initialization error:', error);
          });
      }
      return providers.paystack;
    
    // Add other payment providers when implemented
    // case 'flutterwave':
    //   ...
      
    default:
      throw new Error(`Unsupported payment provider: ${providerName}`);
  }
};

/**
 * Get the default payment provider
 * @returns {Object} The default provider instance
 */
const getDefaultProvider = () => {
  const config = getPaymentConfig();
  return getProvider(config.defaultProvider || 'paystack');
};

/**
 * Initialize all supported payment providers
 * @returns {Promise<Object>} Results of initialization
 */
const initializeAllProviders = async () => {
  const config = getPaymentConfig();
  const results = {};
  
  // Initialize Paystack
  if (config.providers.paystack && config.providers.paystack.enabled !== false) {
    try {
      const paystack = getProvider('paystack');
      results.paystack = await paystack.initialize();
    } catch (error) {
      logger.error('Failed to initialize MongoDB Paystack provider:', error);
      results.paystack = false;
    }
  }
  
  // Initialize other providers when implemented
  
  return results;
};

module.exports = {
  getProvider,
  getDefaultProvider,
  initializeAllProviders
};
