/**
 * Fraud Detection Service
 * Monitors activity for suspicious patterns and potential fraud attempts
 */
const { Op } = require('sequelize');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { 
  User, 
  UserConnection, 
  Payment, 
  Ride, 
  RiderLocation, 
  RiderEarnings
} = require('../models');

// Initialize Redis client for rate limiting and pattern tracking
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class FraudDetectionService {
  constructor() {
    // Thresholds for various fraud detection mechanisms
    this.thresholds = {
      // Login thresholds
      LOGIN_MAX_ATTEMPTS: 5,
      LOGIN_WINDOW_SECONDS: 300, // 5 minutes
      LOGIN_LOCKOUT_SECONDS: 1800, // 30 minutes
      
      // Location and account access thresholds
      LOCATION_DISTANCE_THRESHOLD_KM: 500, // Suspicious if login from location 500km+ away
      DEVICE_CHANGE_WINDOW_DAYS: 7, // Track device changes over 7 days
      MAX_DEVICES_PER_WINDOW: 5, // Max 5 different devices in the window
      
      // Transaction thresholds
      PAYMENT_AMOUNT_THRESHOLD: 10000, // Large payment threshold (in local currency)
      PAYMENT_FREQUENCY_THRESHOLD: 10, // Max payments in a day
      PAYMENT_FREQUENCY_WINDOW_SECONDS: 86400, // 24 hours
      
      // Ride thresholds
      MAX_ACTIVE_RIDES_PER_RIDER: 1,
      MAX_ACTIVE_RIDES_PER_PASSENGER: 1,
      RIDE_COMPLETION_MIN_SECONDS: 60, // Minimum ride duration (unrealistic if shorter)
      RIDE_MAX_DISTANCE_KM: 100, // Maximum reasonable ride distance
      
      // Earnings thresholds
      EARNINGS_DAILY_THRESHOLD: 20000, // Suspicious daily earnings (in local currency)
      CASHOUT_FREQUENCY_THRESHOLD: 5, // Max cashouts per day
      CASHOUT_FREQUENCY_WINDOW_SECONDS: 86400, // 24 hours
    };
    
    // Penalty scores for different types of suspicious activities
    this.penaltyScores = {
      FAILED_LOGIN: 1,
      LOCATION_CHANGE: 5,
      EXCESSIVE_DEVICES: 10,
      LARGE_PAYMENT: 5,
      PAYMENT_FREQUENCY: 10,
      RIDE_ANOMALY: 10,
      EARNINGS_ANOMALY: 15,
      PROFILE_CHANGE: 3,
    };
    
    // Score thresholds for actions
    this.scoreThresholds = {
      WARNING: 10, // Send warning notification
      REVIEW: 20, // Flag for manual review
      RESTRICT: 30, // Restrict some actions
      SUSPEND: 50, // Temporarily suspend account
    };
    
    // Expiry times for risk scores (in seconds)
    this.scoreExpiry = {
      LOW_RISK: 86400, // 24 hours
      MEDIUM_RISK: 604800, // 7 days
      HIGH_RISK: 2592000, // 30 days
    };
  }

  /**
   * Track login attempts for a user
   * @param {string} userId - User ID
   * @param {boolean} success - Whether login was successful
   * @param {Object} metadata - Additional metadata about the login attempt
   * @returns {Promise<{blocked: boolean, score: number, reason?: string}>} - Result of the check
   */
  async trackLoginAttempt(userId, success, metadata = {}) {
    const { ipAddress, deviceId, location, deviceType, appVersion } = metadata;
    
    try {
      // Key for tracking login attempts
      const attemptsKey = `fraud:login:attempts:${userId}`;
      
      // If login was successful, reset failed attempts
      if (success) {
        await redis.del(attemptsKey);
        
        // Track successful login for location and device change detection
        await this.trackSuccessfulLogin(userId, metadata);
        return { blocked: false, score: 0 };
      }
      
      // Increment failed login counter
      const attempts = await redis.incr(attemptsKey);
      
      // Set expiry if it's a new key
      if (attempts === 1) {
        await redis.expire(attemptsKey, this.thresholds.LOGIN_WINDOW_SECONDS);
      }
      
      // Check if exceeded threshold
      if (attempts >= this.thresholds.LOGIN_MAX_ATTEMPTS) {
        // Block the account temporarily
        const blockKey = `fraud:login:blocked:${userId}`;
        await redis.set(blockKey, 1);
        await redis.expire(blockKey, this.thresholds.LOGIN_LOCKOUT_SECONDS);
        
        // Add to user's risk score
        const score = this.penaltyScores.FAILED_LOGIN * attempts;
        await this.updateRiskScore(userId, score, 'Excessive failed login attempts');
        
        return { 
          blocked: true, 
          score, 
          reason: `Too many failed login attempts. Account temporarily locked for ${this.thresholds.LOGIN_LOCKOUT_SECONDS / 60} minutes.`
        };
      }
      
      // Not blocked yet
      return { 
        blocked: false, 
        score: this.penaltyScores.FAILED_LOGIN * attempts
      };
    } catch (error) {
      console.error('Error tracking login attempt:', error);
      // Fail open to allow login rather than blocking legitimate users due to error
      return { blocked: false, score: 0 };
    }
  }

  /**
   * Track successful login for location and device change detection
   * @param {string} userId - User ID
   * @param {Object} metadata - Login metadata
   * @returns {Promise<{suspicious: boolean, score: number, reason?: string}>} - Result of the check
   */
  async trackSuccessfulLogin(userId, metadata = {}) {
    try {
      const { ipAddress, deviceId, location, deviceType, appVersion } = metadata;
      
      // Store connection in database for audit trail
      await UserConnection.create({
        id: uuidv4(),
        userId,
        connectionId: deviceId || uuidv4(),
        device: deviceType || 'unknown',
        deviceType: deviceType || 'unknown',
        appVersion: appVersion || 'unknown',
        ipAddress: ipAddress || 'unknown',
        location: location ? JSON.stringify(location) : null,
        isActive: true,
        connectedAt: new Date(),
      });
      
      // Track score for suspicious activities
      let totalScore = 0;
      let reasons = [];
      
      // Check for location change
      if (location) {
        const locationResult = await this.checkLocationChange(userId, location);
        if (locationResult.suspicious) {
          totalScore += locationResult.score;
          reasons.push(locationResult.reason);
        }
      }
      
      // Check for excessive device changes
      const deviceResult = await this.checkDeviceChanges(userId, deviceId, deviceType);
      if (deviceResult.suspicious) {
        totalScore += deviceResult.score;
        reasons.push(deviceResult.reason);
      }
      
      // Update user's risk score if suspicious activity detected
      if (totalScore > 0) {
        await this.updateRiskScore(userId, totalScore, reasons.join('; '));
        return { suspicious: true, score: totalScore, reason: reasons.join('; ') };
      }
      
      return { suspicious: false, score: 0 };
    } catch (error) {
      console.error('Error tracking successful login:', error);
      return { suspicious: false, score: 0 };
    }
  }

  /**
   * Check for suspicious location change based on previous logins
   * @param {string} userId - User ID
   * @param {Object} location - Current location coordinates
   * @returns {Promise<{suspicious: boolean, score: number, reason?: string}>} - Result of the check
   */
  async checkLocationChange(userId, location) {
    try {
      if (!location || !location.latitude || !location.longitude) {
        return { suspicious: false, score: 0 };
      }
      
      // Get user's last login location
      const lastConnection = await UserConnection.findOne({
        where: {
          userId,
          location: { [Op.not]: null }
        },
        order: [['connectedAt', 'DESC']],
        limit: 1
      });
      
      if (!lastConnection || !lastConnection.location) {
        return { suspicious: false, score: 0 };
      }
      
      let lastLocation;
      try {
        lastLocation = JSON.parse(lastConnection.location);
      } catch (e) {
        return { suspicious: false, score: 0 };
      }
      
      if (!lastLocation || !lastLocation.latitude || !lastLocation.longitude) {
        return { suspicious: false, score: 0 };
      }
      
      // Calculate distance between locations
      const distance = this.calculateDistance(
        lastLocation.latitude, 
        lastLocation.longitude,
        location.latitude,
        location.longitude
      );
      
      // Check if distance exceeds threshold
      if (distance > this.thresholds.LOCATION_DISTANCE_THRESHOLD_KM) {
        return { 
          suspicious: true, 
          score: this.penaltyScores.LOCATION_CHANGE,
          reason: `Login from unusual location ${Math.round(distance)}km away from previous login`
        };
      }
      
      return { suspicious: false, score: 0 };
    } catch (error) {
      console.error('Error checking location change:', error);
      return { suspicious: false, score: 0 };
    }
  }

  /**
   * Check for excessive device changes
   * @param {string} userId - User ID
   * @param {string} deviceId - Current device ID
   * @param {string} deviceType - Current device type
   * @returns {Promise<{suspicious: boolean, score: number, reason?: string}>} - Result of the check
   */
  async checkDeviceChanges(userId, deviceId, deviceType) {
    try {
      // Get window start date
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - this.thresholds.DEVICE_CHANGE_WINDOW_DAYS);
      
      // Count unique devices used in the window
      const connections = await UserConnection.findAll({
        attributes: ['device', 'deviceType', 'connectionId'],
        where: {
          userId,
          connectedAt: { [Op.gte]: windowStart }
        }
      });
      
      // Count unique devices
      const uniqueDevices = new Set();
      connections.forEach(conn => {
        const deviceIdentifier = conn.connectionId || `${conn.device}-${conn.deviceType}`;
        uniqueDevices.add(deviceIdentifier);
      });
      
      // Add current device if not already counted
      if (deviceId) {
        uniqueDevices.add(deviceId);
      } else if (deviceType) {
        uniqueDevices.add(`unknown-${deviceType}`);
      }
      
      // Check if exceeds threshold
      if (uniqueDevices.size > this.thresholds.MAX_DEVICES_PER_WINDOW) {
        return { 
          suspicious: true, 
          score: this.penaltyScores.EXCESSIVE_DEVICES,
          reason: `${uniqueDevices.size} different devices used in ${this.thresholds.DEVICE_CHANGE_WINDOW_DAYS} days`
        };
      }
      
      return { suspicious: false, score: 0 };
    } catch (error) {
      console.error('Error checking device changes:', error);
      return { suspicious: false, score: 0 };
    }
  }

  /**
   * Track and analyze payment for fraud detection
   * @param {string} userId - User ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<{suspicious: boolean, score: number, reason?: string}>} - Result of the check
   */
  async analyzePayment(userId, paymentData) {
    try {
      const { amount, paymentMethod, transactionId } = paymentData;
      
      let totalScore = 0;
      let reasons = [];
      
      // Check for large payment amount
      if (amount > this.thresholds.PAYMENT_AMOUNT_THRESHOLD) {
        totalScore += this.penaltyScores.LARGE_PAYMENT;
        reasons.push(`Large payment of ${amount}`);
      }
      
      // Check for payment frequency
      const frequencyKey = `fraud:payment:frequency:${userId}`;
      const count = await redis.incr(frequencyKey);
      
      // Set expiry if it's a new key
      if (count === 1) {
        await redis.expire(frequencyKey, this.thresholds.PAYMENT_FREQUENCY_WINDOW_SECONDS);
      }
      
      if (count > this.thresholds.PAYMENT_FREQUENCY_THRESHOLD) {
        totalScore += this.penaltyScores.PAYMENT_FREQUENCY;
        reasons.push(`Excessive payment frequency: ${count} in ${this.thresholds.PAYMENT_FREQUENCY_WINDOW_SECONDS / 3600} hours`);
      }
      
      // Update user's risk score if suspicious activity detected
      if (totalScore > 0) {
        await this.updateRiskScore(userId, totalScore, reasons.join('; '));
        return { suspicious: true, score: totalScore, reason: reasons.join('; ') };
      }
      
      return { suspicious: false, score: 0 };
    } catch (error) {
      console.error('Error analyzing payment:', error);
      return { suspicious: false, score: 0 };
    }
  }

  /**
   * Validate a ride request for fraud
   * @param {string} userId - User ID
   * @param {Object} rideData - Ride request data
   * @returns {Promise<{valid: boolean, score: number, reason?: string}>} - Validation result
   */
  async validateRideRequest(userId, rideData) {
    try {
      const { 
        pickupLocation, 
        dropoffLocation, 
        estimatedDistance, 
        estimatedFare 
      } = rideData;
      
      let totalScore = 0;
      let reasons = [];
      
      // Check if user already has active ride
      const activeRide = await Ride.findOne({
        where: {
          passengerId: userId,
          status: {
            [Op.in]: ['requested', 'accepted', 'arrived', 'started']
          }
        }
      });
      
      if (activeRide) {
        totalScore += this.penaltyScores.RIDE_ANOMALY;
        reasons.push('User already has an active ride');
      }
      
      // Check ride distance if provided
      if (estimatedDistance && parseFloat(estimatedDistance) > this.thresholds.RIDE_MAX_DISTANCE_KM) {
        totalScore += this.penaltyScores.RIDE_ANOMALY;
        reasons.push(`Ride distance ${estimatedDistance}km exceeds maximum threshold`);
      }
      
      // Calculate pickup to dropoff distance and validate it's reasonable
      if (pickupLocation && dropoffLocation && 
          pickupLocation.latitude && pickupLocation.longitude &&
          dropoffLocation.latitude && dropoffLocation.longitude) {
            
        const distance = this.calculateDistance(
          pickupLocation.latitude,
          pickupLocation.longitude,
          dropoffLocation.latitude,
          dropoffLocation.longitude
        );
        
        if (distance > this.thresholds.RIDE_MAX_DISTANCE_KM) {
          totalScore += this.penaltyScores.RIDE_ANOMALY;
          reasons.push(`Ride distance ${Math.round(distance)}km exceeds maximum threshold`);
        }
      }
      
      // Update user's risk score if suspicious activity detected
      if (totalScore > 0) {
        await this.updateRiskScore(userId, totalScore, reasons.join('; '));
        return { valid: false, score: totalScore, reason: reasons.join('; ') };
      }
      
      return { valid: true, score: 0 };
    } catch (error) {
      console.error('Error validating ride request:', error);
      // Fail open to allow ride rather than blocking legitimate requests due to error
      return { valid: true, score: 0 };
    }
  }

  /**
   * Validate a rider's earnings
   * @param {string} riderId - Rider ID
   * @param {Object} earningsData - Earnings data
   * @returns {Promise<{suspicious: boolean, score: number, reason?: string}>} - Validation result
   */
  async validateRiderEarnings(riderId, earningsData) {
    try {
      const { amount, rideId, type } = earningsData;
      
      let totalScore = 0;
      let reasons = [];
      
      // Check daily earnings threshold
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dailyEarnings = await RiderEarnings.findAll({
        where: {
          riderId,
          transactionDate: { [Op.gte]: today }
        },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('amount')), 'total']
        ],
        raw: true
      });
      
      const totalDailyEarnings = 
        parseFloat(dailyEarnings[0]?.total || 0) + parseFloat(amount);
      
      if (totalDailyEarnings > this.thresholds.EARNINGS_DAILY_THRESHOLD) {
        totalScore += this.penaltyScores.EARNINGS_ANOMALY;
        reasons.push(`Daily earnings of ${totalDailyEarnings} exceed threshold`);
      }
      
      // Check if the ride exists and matches the rider
      if (rideId) {
        const ride = await Ride.findByPk(rideId);
        if (!ride) {
          totalScore += this.penaltyScores.EARNINGS_ANOMALY;
          reasons.push('Earnings claimed for non-existent ride');
        } else if (ride.riderId !== riderId) {
          totalScore += this.penaltyScores.EARNINGS_ANOMALY;
          reasons.push('Earnings claimed for ride assigned to different rider');
        }
      }
      
      // Update user's risk score if suspicious activity detected
      if (totalScore > 0) {
        await this.updateRiskScore(riderId, totalScore, reasons.join('; '));
        return { suspicious: true, score: totalScore, reason: reasons.join('; ') };
      }
      
      return { suspicious: false, score: 0 };
    } catch (error) {
      console.error('Error validating rider earnings:', error);
      return { suspicious: false, score: 0 };
    }
  }
  
  /**
   * Validate a cash withdrawal/payout request
   * @param {string} userId - User ID
   * @param {Object} payoutData - Payout request data
   * @returns {Promise<{valid: boolean, score: number, reason?: string}>} - Validation result
   */
  async validateCashoutRequest(userId, payoutData) {
    try {
      const { amount, paymentMethod } = payoutData;
      
      let totalScore = 0;
      let reasons = [];
      
      // Check cashout frequency
      const frequencyKey = `fraud:cashout:frequency:${userId}`;
      const count = await redis.incr(frequencyKey);
      
      // Set expiry if it's a new key
      if (count === 1) {
        await redis.expire(frequencyKey, this.thresholds.CASHOUT_FREQUENCY_WINDOW_SECONDS);
      }
      
      if (count > this.thresholds.CASHOUT_FREQUENCY_THRESHOLD) {
        totalScore += this.penaltyScores.EARNINGS_ANOMALY;
        reasons.push(`Excessive cashout frequency: ${count} in 24 hours`);
      }
      
      // Check if the user has recent account changes
      const recentAccountChange = await this.hasRecentAccountChanges(userId);
      if (recentAccountChange.changed) {
        totalScore += this.penaltyScores.PROFILE_CHANGE;
        reasons.push(`Recent account changes: ${recentAccountChange.reason}`);
      }
      
      // If large amount, add additional score
      if (amount > this.thresholds.PAYMENT_AMOUNT_THRESHOLD) {
        totalScore += this.penaltyScores.LARGE_PAYMENT;
        reasons.push(`Large cashout amount: ${amount}`);
      }
      
      // Update user's risk score
      if (totalScore > 0) {
        await this.updateRiskScore(userId, totalScore, reasons.join('; '));
        
        // Only block if score is high enough
        if (totalScore >= this.scoreThresholds.RESTRICT) {
          return { valid: false, score: totalScore, reason: reasons.join('; ') };
        }
      }
      
      return { valid: true, score: totalScore };
    } catch (error) {
      console.error('Error validating cashout request:', error);
      // Fail open to allow cashout rather than blocking legitimate requests due to error
      return { valid: true, score: 0 };
    }
  }

  /**
   * Check if user has made recent account changes
   * @param {string} userId - User ID
   * @returns {Promise<{changed: boolean, reason?: string}>} - Result of the check
   */
  async hasRecentAccountChanges(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return { changed: false };
      }
      
      const now = new Date();
      const recentChanges = [];
      
      // Check for recent profile updates (within last 24 hours)
      if (user.updatedAt && now.getTime() - user.updatedAt.getTime() < 24 * 60 * 60 * 1000) {
        recentChanges.push('profile information');
      }
      
      // Check for recent payment method changes
      const recentPaymentMethod = await PaymentMethod.findOne({
        where: {
          userId,
          createdAt: { [Op.gte]: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
        }
      });
      
      if (recentPaymentMethod) {
        recentChanges.push('payment method');
      }
      
      if (recentChanges.length > 0) {
        return { 
          changed: true, 
          reason: `Recent changes to: ${recentChanges.join(', ')}`
        };
      }
      
      return { changed: false };
    } catch (error) {
      console.error('Error checking recent account changes:', error);
      return { changed: false };
    }
  }

  /**
   * Update user's risk score
   * @param {string} userId - User ID
   * @param {number} score - Score to add
   * @param {string} reason - Reason for the score
   */
  async updateRiskScore(userId, score, reason) {
    try {
      // Key for user's risk score
      const scoreKey = `fraud:risk:score:${userId}`;
      
      // Get current score
      const currentScore = parseInt(await redis.get(scoreKey) || '0', 10);
      const newScore = currentScore + score;
      
      // Store updated score
      await redis.set(scoreKey, newScore);
      
      // Set expiry based on risk level
      let expiry = this.scoreExpiry.LOW_RISK;
      if (newScore >= this.scoreThresholds.RESTRICT) {
        expiry = this.scoreExpiry.MEDIUM_RISK;
      } else if (newScore >= this.scoreThresholds.SUSPEND) {
        expiry = this.scoreExpiry.HIGH_RISK;
      }
      
      await redis.expire(scoreKey, expiry);
      
      // Log risk score update
      await this.logRiskEvent(userId, score, newScore, reason);
      
      // Take action based on score
      await this.takeActionOnRiskScore(userId, newScore, reason);
    } catch (error) {
      console.error('Error updating risk score:', error);
    }
  }

  /**
   * Log risk event for audit trail
   * @param {string} userId - User ID
   * @param {number} scoreAdded - Score added
   * @param {number} totalScore - New total score
   * @param {string} reason - Reason for the score
   */
  async logRiskEvent(userId, scoreAdded, totalScore, reason) {
    try {
      // In a real implementation, this would log to a database table
      console.log(`[FRAUD RISK] User ${userId}: +${scoreAdded} points (Total: ${totalScore}) - Reason: ${reason}`);
      
      // Example of storing in Redis for temporary history
      const key = `fraud:risk:history:${userId}`;
      const event = JSON.stringify({
        timestamp: new Date().toISOString(),
        scoreAdded,
        totalScore,
        reason
      });
      
      await redis.lpush(key, event);
      await redis.ltrim(key, 0, 99); // Keep last 100 events
      await redis.expire(key, 30 * 24 * 60 * 60); // 30 days expiry
    } catch (error) {
      console.error('Error logging risk event:', error);
    }
  }

  /**
   * Take action based on risk score
   * @param {string} userId - User ID
   * @param {number} score - Total risk score
   * @param {string} reason - Reason for the score
   */
  async takeActionOnRiskScore(userId, score, reason) {
    try {
      // In a real implementation, this would trigger various actions
      
      if (score >= this.scoreThresholds.SUSPEND) {
        // Suspend account temporarily
        console.log(`[FRAUD ACTION] Suspending user ${userId} - Risk score: ${score}`);
        // await User.update({ status: 'suspended' }, { where: { id: userId } });
        
        // Notify admins
        // await notificationService.notifyAdmins('High risk account suspended', { userId, score, reason });
      }
      else if (score >= this.scoreThresholds.RESTRICT) {
        // Restrict certain operations
        console.log(`[FRAUD ACTION] Restricting user ${userId} - Risk score: ${score}`);
        
        // Flag user for additional verification
        // await User.update({ requiresVerification: true }, { where: { id: userId } });
      }
      else if (score >= this.scoreThresholds.REVIEW) {
        // Flag for manual review
        console.log(`[FRAUD ACTION] Flagging user ${userId} for review - Risk score: ${score}`);
        
        // Flag for review
        // await User.update({ flaggedForReview: true }, { where: { id: userId } });
        
        // Notify security team
        // await notificationService.notifySecurityTeam('Account flagged for review', { userId, score, reason });
      }
      else if (score >= this.scoreThresholds.WARNING) {
        // Send warning notification
        console.log(`[FRAUD ACTION] Warning user ${userId} - Risk score: ${score}`);
        
        // Send notification to user
        // await notificationService.sendToUser(userId, 'Security Alert', 'Unusual activity detected on your account. Please contact support if this wasn't you.');
      }
    } catch (error) {
      console.error('Error taking action on risk score:', error);
    }
  }

  /**
   * Get user's current risk score
   * @param {string} userId - User ID
   * @returns {Promise<{score: number, level: string}>} - Risk score and level
   */
  async getRiskScore(userId) {
    try {
      const scoreKey = `fraud:risk:score:${userId}`;
      const score = parseInt(await redis.get(scoreKey) || '0', 10);
      
      let level = 'low';
      if (score >= this.scoreThresholds.SUSPEND) {
        level = 'critical';
      } else if (score >= this.scoreThresholds.RESTRICT) {
        level = 'high';
      } else if (score >= this.scoreThresholds.REVIEW) {
        level = 'medium';
      } else if (score >= this.scoreThresholds.WARNING) {
        level = 'elevated';
      }
      
      return { score, level };
    } catch (error) {
      console.error('Error getting risk score:', error);
      return { score: 0, level: 'low' };
    }
  }

  /**
   * Get user's risk history
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Risk event history
   */
  async getRiskHistory(userId) {
    try {
      const key = `fraud:risk:history:${userId}`;
      const events = await redis.lrange(key, 0, -1);
      
      return events.map(event => JSON.parse(event));
    } catch (error) {
      console.error('Error getting risk history:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers
   * @param {number} lat1 - Latitude of point 1
   * @param {number} lon1 - Longitude of point 1
   * @param {number} lat2 - Latitude of point 2
   * @param {number} lon2 - Longitude of point 2
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  /**
   * Convert degrees to radians
   * @param {number} deg - Degrees
   * @returns {number} - Radians
   */
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
}

// Export a singleton instance
const fraudDetectionService = new FraudDetectionService();
module.exports = fraudDetectionService;
