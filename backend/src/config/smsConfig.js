/**
 * SMS Configuration
 * Provides configuration for SMS services
 */
require('dotenv').config();

/**
 * Get SMS configuration based on environment variables
 * @returns {Object} SMS configuration
 */
const getConfig = () => {
  const config = {
    defaultProvider: 'twilio',
    senderId: process.env.SMS_SENDER_ID || 'OkadaApp',
    productName: 'Okada Ride Africa',
    providers: {}
  };

  // Configure Twilio if credentials are available
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    config.providers.twilio = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    };
  } else {
    console.warn('No SMS providers are configured. SMS functionality will be limited.');
  }

  return config;
};

module.exports = {
  getConfig
};
