/**
 * Centralized Logging Service
 * 
 * Provides structured logging for the entire application with integration
 * for monitoring systems like ELK, Datadog, etc.
 */
import winston from 'winston';
import 'winston-daily-rotate-file';
import dotenv from 'dotenv';

const { createLogger, format, transports } = winston;
const { combine, timestamp, label, printf, json, colorize } = format;

// Initialize dotenv
dotenv.config();

// Custom format for console logs
const consoleFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  return `${timestamp} [${service}] ${level}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
});

// Set up transports based on environment
const setupTransports = () => {
  const logTransports = [
    // Always log to console
    new transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      ),
      level: process.env.LOG_LEVEL || 'info'
    })
  ];

  // In production, use file rotation
  if (process.env.NODE_ENV === 'production') {
    // Application logs
    logTransports.push(
      new transports.DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: process.env.LOG_LEVEL || 'info'
      })
    );

    // Error logs
    logTransports.push(
      new transports.DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error'
      })
    );

    // OTP specific logs for analytics
    logTransports.push(
      new transports.DailyRotateFile({
        filename: 'logs/otp-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'info',
        format: combine(
          format(info => {
            // Only log OTP-related events
            if (info.category === 'otp') {
              return info;
            }
            return false;
          })(),
          json()
        )
      })
    );
  }

  // In development, just use console for simplicity
  return logTransports;
};

/**
 * Create a logger instance for a specific service
 * @param {string} serviceName - The name of the service (e.g., 'otp-service', 'auth-service')
 * @returns {object} - Winston logger instance
 */
const createServiceLogger = (serviceName) => {
  return createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      label({ label: serviceName }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      json()
    ),
    defaultMeta: { service: serviceName },
    transports: setupTransports(),
    exitOnError: false
  });
};

// Create loggers for different services
const loggers = {
  otp: createServiceLogger('otp-service'),
  auth: createServiceLogger('auth-service'),
  email: createServiceLogger('email-service'),
  sms: createServiceLogger('sms-service'),
  payment: createServiceLogger('payment-service'),
  ride: createServiceLogger('ride-service'),
  system: createServiceLogger('system')
};

/**
 * Centralized logging function with built-in monitoring alerts
 * @param {string} service - Service name ('otp', 'auth', etc.)
 * @param {string} level - Log level ('info', 'warn', 'error', etc.)
 * @param {string} message - Log message
 * @param {Object} metadata - Additional metadata
 */
const log = (service, level, message, metadata = {}) => {
  if (!loggers[service]) {
    console.error(`Unknown service: ${service}. Falling back to system logger.`);
    service = 'system';
  }

  // Add ip address and user agent if available
  if (metadata.req) {
    metadata.ip = metadata.req.ip || metadata.req.headers['x-forwarded-for'] || 'unknown';
    metadata.userAgent = metadata.req.headers['user-agent'] || 'unknown';
    // Don't include the full request object in logs
    delete metadata.req;
  }

  // Log the event
  loggers[service][level](message, metadata);

  // Special handling for OTP failures - may trigger alerts
  if (service === 'otp' && level === 'error') {
    // Track consecutive failures for same user or IP
    trackFailureMetric(metadata);
  }
};

// In-memory store for recent failures (in production, use Redis)
const recentFailures = {
  byUser: {},
  byIP: {}
};

/**
 * Track failure metrics and trigger alerts if necessary
 * In production, this would be connected to an alerting system
 * @param {Object} metadata - Event metadata
 */
const trackFailureMetric = (metadata) => {
  const userId = metadata.userId || 'unknown';
  const ip = metadata.ip || 'unknown';
  const now = Date.now();
  
  // Clean up old entries (older than 15 minutes)
  cleanupFailureMetrics();
  
  // Initialize failure tracking for this user
  if (!recentFailures.byUser[userId]) {
    recentFailures.byUser[userId] = [];
  }
  
  // Initialize failure tracking for this IP
  if (!recentFailures.byIP[ip]) {
    recentFailures.byIP[ip] = [];
  }
  
  // Record this failure
  recentFailures.byUser[userId].push({ timestamp: now, metadata });
  recentFailures.byIP[ip].push({ timestamp: now, metadata });
  
  // Check for alert thresholds
  checkAlertThresholds(userId, ip);
};

/**
 * Clean up old failure tracking entries
 */
const cleanupFailureMetrics = () => {
  const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
  
  // Clean up user failures
  Object.keys(recentFailures.byUser).forEach(userId => {
    recentFailures.byUser[userId] = recentFailures.byUser[userId].filter(
      failure => failure.timestamp > fifteenMinutesAgo
    );
    
    // Remove empty arrays
    if (recentFailures.byUser[userId].length === 0) {
      delete recentFailures.byUser[userId];
    }
  });
  
  // Clean up IP failures
  Object.keys(recentFailures.byIP).forEach(ip => {
    recentFailures.byIP[ip] = recentFailures.byIP[ip].filter(
      failure => failure.timestamp > fifteenMinutesAgo
    );
    
    // Remove empty arrays
    if (recentFailures.byIP[ip].length === 0) {
      delete recentFailures.byIP[ip];
    }
  });
};

/**
 * Check alert thresholds and trigger alerts if necessary
 * @param {string} userId - User ID
 * @param {string} ip - IP address
 */
const checkAlertThresholds = (userId, ip) => {
  // Alert on 5+ failures for the same user in 15 minutes
  if (recentFailures.byUser[userId]?.length >= 5) {
    triggerAlert('user_consecutive_failures', {
      userId,
      count: recentFailures.byUser[userId].length,
      failures: recentFailures.byUser[userId]
    });
  }
  
  // Alert on 10+ failures from the same IP in 15 minutes
  if (recentFailures.byIP[ip]?.length >= 10) {
    triggerAlert('ip_consecutive_failures', {
      ip,
      count: recentFailures.byIP[ip].length,
      failures: recentFailures.byIP[ip]
    });
  }
};

/**
 * Trigger an alert (in production, this would send to an alerting system)
 * @param {string} alertType - Type of alert
 * @param {Object} data - Alert data
 */
const triggerAlert = (alertType, data) => {
  // Log the alert
  log('system', 'warn', `ALERT: ${alertType}`, { 
    alertType, 
    data,
    alertSeverity: alertType.includes('user') ? 'medium' : 'high' 
  });
  
  // In production, this would send to an alerting service like PagerDuty, OpsGenie, etc.
  if (process.env.NODE_ENV === 'production') {
    // Placeholder for alerting system integration
    console.error(`ALERT: ${alertType}`, data);
    
    // Example: if we had a Slack webhook
    // postToSlack(alertType, data);
    
    // Example: if we had an email alert system
    // sendAlertEmail(alertType, data);
  }
};

// OTP Analytics tracking
const otpMetrics = {
  requestsByType: {
    sms: { total: 0, success: 0, failure: 0 },
    email: { total: 0, success: 0, failure: 0 }
  },
  verificationSuccess: 0,
  verificationFailure: 0,
  // Breakdown by hour for the last 24 hours
  hourlyMetrics: Array(24).fill().map(() => ({
    requests: { sms: 0, email: 0 },
    success: { sms: 0, email: 0 },
    failures: { sms: 0, email: 0 },
    verifications: { success: 0, failure: 0 }
  })),
  // Daily metrics for the last 30 days - simplified for this example
  dailyMetrics: []
};

/**
 * Track OTP metrics for analytics
 * @param {string} eventType - Type of event ('request', 'delivery', 'verification')
 * @param {string} channel - Channel ('sms', 'email')
 * @param {boolean} success - Whether the event was successful
 * @param {Object} metadata - Additional metadata
 */
const trackOtpMetric = (eventType, channel, success, metadata = {}) => {
  // Current hour index (0-23)
  const hourIndex = new Date().getHours();
  
  switch (eventType) {
    case 'request':
      // Increment total requests
      otpMetrics.requestsByType[channel].total++;
      otpMetrics.hourlyMetrics[hourIndex].requests[channel]++;
      break;
      
    case 'delivery':
      // Track successful or failed delivery
      if (success) {
        otpMetrics.requestsByType[channel].success++;
        otpMetrics.hourlyMetrics[hourIndex].success[channel]++;
      } else {
        otpMetrics.requestsByType[channel].failure++;
        otpMetrics.hourlyMetrics[hourIndex].failures[channel]++;
      }
      break;
      
    case 'verification':
      // Track verification success/failure
      if (success) {
        otpMetrics.verificationSuccess++;
        otpMetrics.hourlyMetrics[hourIndex].verifications.success++;
      } else {
        otpMetrics.verificationFailure++;
        otpMetrics.hourlyMetrics[hourIndex].verifications.failure++;
      }
      break;
  }
  
  // Log the event for analytics
  log('otp', 'info', `OTP_METRIC: ${eventType}`, { 
    category: 'otp',
    eventType,
    channel,
    success,
    ...metadata
  });
};

/**
 * Get OTP metrics for the analytics dashboard
 * @returns {Object} - OTP metrics
 */
const getOtpMetrics = () => {
  return {
    summary: {
      totalRequests: otpMetrics.requestsByType.sms.total + otpMetrics.requestsByType.email.total,
      successRate: calculateSuccessRate(),
      verificationSuccessRate: calculateVerificationSuccessRate()
    },
    breakdown: {
      sms: otpMetrics.requestsByType.sms,
      email: otpMetrics.requestsByType.email
    },
    hourly: otpMetrics.hourlyMetrics,
    daily: otpMetrics.dailyMetrics // In production, this would be populated from database
  };
};

/**
 * Calculate overall OTP delivery success rate
 * @returns {number} - Success rate as a percentage
 */
const calculateSuccessRate = () => {
  const smsTotal = otpMetrics.requestsByType.sms.total;
  const emailTotal = otpMetrics.requestsByType.email.total;
  
  if (smsTotal + emailTotal === 0) return 100; // No requests
  
  const smsSuccess = otpMetrics.requestsByType.sms.success;
  const emailSuccess = otpMetrics.requestsByType.email.success;
  
  return Math.round(((smsSuccess + emailSuccess) / (smsTotal + emailTotal)) * 100);
};

/**
 * Calculate OTP verification success rate
 * @returns {number} - Success rate as a percentage
 */
const calculateVerificationSuccessRate = () => {
  const total = otpMetrics.verificationSuccess + otpMetrics.verificationFailure;
  
  if (total === 0) return 100; // No verifications
  
  return Math.round((otpMetrics.verificationSuccess / total) * 100);
};

export {
  log,
  trackOtpMetric,
  getOtpMetrics
};
