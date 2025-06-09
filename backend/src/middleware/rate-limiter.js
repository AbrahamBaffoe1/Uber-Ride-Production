/**
 * Rate Limiter Middleware
 * Provides protection against brute force and DoS attacks by limiting request rates
 */
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
require('dotenv').config();

// Check if Redis URL is available for production environments
const useRedisStore = process.env.REDIS_URL && process.env.NODE_ENV === 'production';

// Create Redis client if Redis URL is available
let redisClient = null;
if (useRedisStore) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      // Fall back to memory store if Redis fails
      redisClient = null;
    });
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // Fall back to memory store
  }
}

/**
 * Create a rate limiter middleware with specified options
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Error message
 * @param {string} options.keyPrefix - Redis key prefix
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes (default)
    max: 100, // 100 requests per window (default)
    standardHeaders: true, // Return rate limit info in the RateLimit-* headers
    legacyHeaders: false, // Don't use the X-RateLimit-* headers
    message: 'Too many requests, please try again later.',
    keyPrefix: 'rl:',
  };

  const config = { ...defaultOptions, ...options };
  
  // If Redis client is available, use Redis store
  if (redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: config.keyPrefix
    });
    console.log(`Using Redis store for rate limiting with prefix: ${config.keyPrefix}`);
  } else {
    console.log('Using memory store for rate limiting');
  }
  
  return rateLimit(config);
};

/**
 * Global rate limiter for all API routes
 */
const globalLimiter = createRateLimiter({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // from .env or 15 minutes default
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // from .env or 100 requests default
  keyPrefix: 'rl:global:',
});

/**
 * Authentication rate limiter (login/register endpoints)
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes.',
  keyPrefix: 'rl:auth:',
});

/**
 * OTP request rate limiter
 */
const otpRequestLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 OTP requests per hour
  message: 'Too many OTP requests, please try again after some time.',
  keyPrefix: 'rl:otp:request:',
});

/**
 * OTP verification rate limiter
 */
const otpVerificationLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // 10 verification attempts per 10 minutes
  message: 'Too many verification attempts, please try again after 10 minutes.',
  keyPrefix: 'rl:otp:verify:',
});

/**
 * API rate limiter
 */
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes
  keyPrefix: 'rl:api:',
});

module.exports = {
  globalLimiter,
  authLimiter,
  otpRequestLimiter,
  otpVerificationLimiter,
  apiLimiter,
  createRateLimiter,
};
