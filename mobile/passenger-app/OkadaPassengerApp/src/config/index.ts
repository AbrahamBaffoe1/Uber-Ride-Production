/**
 * Application Configuration
 * 
 * This file contains environment-specific configuration values
 * used throughout the Okada Passenger App.
 */

// Define environment types
type Environment = 'development' | 'staging' | 'production';

// Select configuration based on environment
const ENV: Environment = (process.env.NODE_ENV as Environment) || 'development';

// Base configuration
const BaseConfig = {
  // API Base URLs
  API_URL: 'http://localhost:3001/api',
  
  // Stripe configuration
  STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_key',
  
  // Maps Configuration
  MAPS_API_KEY: 'your_maps_api_key',
  
  // App Feature Toggles
  FEATURES: {
    RIDE_SHARING: true,
    FOOD_DELIVERY: true,
    MULTI_DESTINATION: true,
    CHAT: true,
    SCHEDULED_RIDES: true,
  },
  
  // App Version
  VERSION: '1.0.0',
  
  // Default Language
  DEFAULT_LANGUAGE: 'en',
  
  // Timeout Settings (in milliseconds)
  TIMEOUTS: {
    API_REQUEST: 30000,
    LOCATION_REFRESH: 10000,
    RIDE_POLLING: 5000,
  },
  
  // Analytics Configuration
  ANALYTICS: {
    ENABLED: true,
    TRACKING_ID: 'UA-XXXXXXXX-X',
  },
};

// Environment specific overrides
const EnvConfig = {
  development: {
    API_URL: 'http://localhost:3001/api',
    GRAPHQL_URL: 'http://localhost:3001/graphql',
    WEBSOCKET_URL: 'ws://localhost:3001/graphql',
    DEBUG: true,
  },
  staging: {
    API_URL: 'https://staging-api.okadatransportation.com/api',
    GRAPHQL_URL: 'https://staging-api.okadatransportation.com/graphql',
    WEBSOCKET_URL: 'wss://staging-api.okadatransportation.com/graphql',
    DEBUG: true,
  },
  production: {
    API_URL: 'https://api.okadatransportation.com/api',
    GRAPHQL_URL: 'https://api.okadatransportation.com/graphql',
    WEBSOCKET_URL: 'wss://api.okadatransportation.com/graphql',
    DEBUG: false,
  },
};

// Merge base config with environment-specific config
const Config = {
  ...BaseConfig,
  ...EnvConfig[ENV] || EnvConfig.development,
  ENV,
};

export default Config;
