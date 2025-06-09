/**
 * Push Notification Service for MongoDB
 * 
 * Handles creating, sending, and managing push notifications using MongoDB for storage
 * and external providers for delivery.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const socketService = require('../../services/mongo-socket.service');
const loggingService = require('../../services/logging.service');
// Create a simple logger that uses the logging service
const logger = {
  info: (message, metadata = {}) => loggingService.log('system', 'info', message, metadata),
  error: (message, metadata = {}) => loggingService.log('system', 'error', message, metadata),
  warn: (message, metadata = {}) => loggingService.log('system', 'warn', message, metadata),
  debug: (message, metadata = {}) => loggingService.log('system', 'debug', message, metadata)
};

// Template definitions for common notification types
const NOTIFICATION_TEMPLATES = {
  ride_request: {
    title: 'New Ride Request',
    message: 'You have a new ride request nearby',
    priority: 'high'
  },
  ride_accepted: {
    title: 'Ride Accepted',
    message: 'Your ride has been accepted by a driver',
    priority: 'high'
  },
  ride_arrived_pickup: {
    title: 'Driver Arrived',
    message: 'Your driver has arrived at the pickup location',
    priority: 'high'
  },
  ride_started: {
    title: 'Ride Started',
    message: 'Your ride has started',
    priority: 'medium'
  },
  ride_completed: {
    title: 'Ride Completed',
    message: 'Your ride has been completed',
    priority: 'medium'
  },
  ride_cancelled: {
    title: 'Ride Cancelled',
    message: 'Your ride has been cancelled',
    priority: 'high'
  },
  payment_success: {
    title: 'Payment Successful',
    message: 'Your payment has been processed successfully',
    priority: 'medium'
  },
  payment_failed: {
    title: 'Payment Failed',
    message: 'Your payment could not be processed',
    priority: 'high'
  },
  earnings_available: {
    title: 'Earnings Available',
    message: 'Your earnings are available for withdrawal',
    priority: 'medium'
  },
  earnings_sent: {
    title: 'Earnings Sent',
    message: 'Your earnings have been sent to your bank account',
    priority: 'medium'
  },
  document_approved: {
    title: 'Document Approved',
    message: 'Your document has been approved',
    priority: 'medium'
  },
  document_rejected: {
    title: 'Document Rejected',
    message: 'Your document has been rejected',
    priority: 'high'
  },
  account_update: {
    title: 'Account Updated',
    message: 'Your account has been updated',
    priority: 'low'
  },
  security_alert: {
    title: 'Security Alert',
    message: 'We detected unusual activity on your account',
    priority: 'high'
  },
  promotion: {
    title: 'Special Offer',
    message: 'We have a special offer for you',
    priority: 'low'
  }
};

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.providers = {
      firebase: null,
      expo: null,
      socketio: socketService
    };
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    try {
      // Initialize providers based on environment
      if (process.env.FIREBASE_ENABLED === 'true') {
        // Firebase/FCM integration code would go here
        logger.info('Firebase FCM provider initialized');
      }

      if (process.env.EXPO_NOTIFICATIONS_ENABLED === 'true') {
        // Expo notifications integration code would go here
        logger.info('Expo notification provider initialized');
      }

      // Skip socket initialization - will use existing socket service
      // Instead of calling initialize(), we'll assume it's already initialized elsewhere
      logger.info('Using existing Socket.IO for real-time notifications');

      this.initialized = true;
      logger.info('Push notification service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize push notification service:', error);
      return false;
    }
  }

  /**
   * Create and send a notification to a user
   * @param {Object} data - Notification data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Created notification
   */
  async createAndSendNotification(data, options = {}) {
    try {
      const { userId, type, title, message, customData = {}, sendPush = true } = data;

      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!type || !NOTIFICATION_TEMPLATES[type]) {
        throw new Error(`Invalid notification type: ${type}`);
      }

      // Get user to check preferences and push tokens
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Check if user has opted out of this notification type
      if (user.notificationPreferences && 
          user.notificationPreferences[type] === false) {
        logger.info(`User ${userId} has opted out of ${type} notifications`);
        return null;
      }

      // Create notification in database
      const template = NOTIFICATION_TEMPLATES[type];
      const notificationData = {
        userId,
        type,
        title: title || template.title,
        message: message || template.message,
        data: {
          ...customData,
          type
        },
        priority: options.priority || template.priority || 'medium'
      };

      // Save to MongoDB
      const notification = await Notification.createNotification(notificationData);
      logger.info(`Notification created for user ${userId}`, { notificationId: notification._id });

      // Send real-time notification via Socket.IO
      this.providers.socketio.emitToUser(userId, 'notification', {
        notification: {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt
        }
      });

      // If push notification is requested and user has push tokens
      if (sendPush && user.pushTokens && user.pushTokens.length > 0) {
        const pushPayload = {
          title: notification.title,
          body: notification.message,
          data: {
            notificationId: notification._id.toString(),
            type: notification.type,
            ...notification.data
          }
        };

        // Send to all registered push tokens for the user
        await this.sendPushToTokens(user.pushTokens, pushPayload);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating and sending notification:', error);
      throw error;
    }
  }

  /**
   * Send a push notification to multiple tokens
   * @param {Array} tokens - Array of push tokens
   * @param {Object} payload - Push notification payload
   * @returns {Promise<Array>} Results of push sending
   */
  async sendPushToTokens(tokens, payload) {
    const results = [];

    // Try to send via expo if enabled
    if (this.providers.expo) {
      // Identify Expo tokens
      const expoTokens = tokens.filter(token => 
        token.type === 'expo' && token.token && !token.disabled
      );

      if (expoTokens.length > 0) {
        try {
          // Send to Expo tokens
          const expoTokenStrings = expoTokens.map(t => t.token);
          const expoResult = await this.providers.expo.sendPushNotificationsAsync(
            expoTokenStrings.map(token => ({
              to: token,
              title: payload.title,
              body: payload.body,
              data: payload.data,
              sound: 'default',
              priority: 'high'
            }))
          );
          results.push(...expoResult);
        } catch (error) {
          logger.error('Error sending Expo push notifications:', error);
        }
      }
    }

    // Try to send via Firebase if enabled
    if (this.providers.firebase) {
      // Identify FCM tokens
      const fcmTokens = tokens.filter(token => 
        token.type === 'fcm' && token.token && !token.disabled
      );

      if (fcmTokens.length > 0) {
        try {
          // Send to FCM tokens
          const fcmTokenStrings = fcmTokens.map(t => t.token);
          const fcmResult = await this.providers.firebase.messaging().sendMulticast({
            tokens: fcmTokenStrings,
            notification: {
              title: payload.title,
              body: payload.body
            },
            data: payload.data,
            android: {
              priority: 'high',
              notification: {
                sound: 'default'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default'
                }
              }
            }
          });
          results.push({
            type: 'fcm',
            success: fcmResult.successCount,
            failure: fcmResult.failureCount
          });
        } catch (error) {
          logger.error('Error sending FCM push notifications:', error);
        }
      }
    }

    return results;
  }

  /**
   * Send bulk notifications to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} data - Notification data (type, title, message, etc.)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Result with success and failure counts
   */
  async sendBulkNotifications(userIds, data, options = {}) {
    const results = {
      total: userIds.length,
      success: 0,
      failure: 0,
      notifications: []
    };

    // Process users in batches to avoid overwhelming the system
    const batchSize = options.batchSize || 100;
    const delay = options.delay || 1000; // Delay between batches in ms

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(userId => 
        this.createAndSendNotification({
          ...data,
          userId
        }, options)
        .then(notification => {
          if (notification) {
            results.success++;
            results.notifications.push(notification._id);
          }
          return notification;
        })
        .catch(error => {
          logger.error(`Failed to send notification to user ${userId}:`, error);
          results.failure++;
          return null;
        })
      );

      await Promise.all(batchPromises);

      // Add delay between batches if not the last batch
      if (i + batchSize < userIds.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Register a push token for a user
   * @param {String} userId - User ID
   * @param {Object} tokenData - Token data (type, token)
   * @returns {Promise<Object>} Updated user
   */
  async registerPushToken(userId, tokenData) {
    try {
      const { type, token } = tokenData;
      
      if (!userId || !type || !token) {
        throw new Error('User ID, token type, and token value are required');
      }

      // Validate token type
      if (!['expo', 'fcm', 'apns'].includes(type)) {
        throw new Error(`Invalid token type: ${type}`);
      }

      // Update user's push tokens
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Initialize push tokens array if it doesn't exist
      if (!user.pushTokens) {
        user.pushTokens = [];
      }

      // Check if token already exists
      const existingTokenIndex = user.pushTokens.findIndex(t => 
        t.token === token && t.type === type
      );

      if (existingTokenIndex >= 0) {
        // Update existing token
        user.pushTokens[existingTokenIndex].lastUsed = new Date();
        user.pushTokens[existingTokenIndex].disabled = false;
      } else {
        // Add new token
        user.pushTokens.push({
          type,
          token,
          device: tokenData.device || 'unknown',
          createdAt: new Date(),
          lastUsed: new Date(),
          disabled: false
        });
      }

      // Save user
      await user.save();
      logger.info(`Push token registered for user ${userId}`);
      
      return {
        success: true,
        message: 'Push token registered successfully',
        tokens: user.pushTokens.length
      };
    } catch (error) {
      logger.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Unregister a push token for a user
   * @param {String} userId - User ID
   * @param {String} token - Token to unregister
   * @returns {Promise<Object>} Updated user
   */
  async unregisterPushToken(userId, token) {
    try {
      if (!userId || !token) {
        throw new Error('User ID and token are required');
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // If user has no tokens, nothing to do
      if (!user.pushTokens || user.pushTokens.length === 0) {
        return {
          success: true,
          message: 'No tokens to unregister',
          tokens: 0
        };
      }

      // Filter out the token
      const initialCount = user.pushTokens.length;
      user.pushTokens = user.pushTokens.filter(t => t.token !== token);

      // If tokens were removed, save the user
      if (initialCount !== user.pushTokens.length) {
        await user.save();
        logger.info(`Push token unregistered for user ${userId}`);
      }

      return {
        success: true,
        message: 'Push token unregistered successfully',
        tokens: user.pushTokens.length
      };
    } catch (error) {
      logger.error('Error unregistering push token:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   * @param {String} userId - User ID
   * @param {Object} options - Query options (limit, page, filter)
   * @returns {Promise<Object>} Notifications with pagination
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { 
        limit = 20, 
        page = 1, 
        type,
        isRead,
        isArchived = false,
        sort = '-createdAt'
      } = options;

      // Build query
      const query = { userId };
      
      // Apply filters if provided
      if (type) {
        query.type = type;
      }
      
      if (isRead !== undefined) {
        query.isRead = isRead;
      }
      
      query.isArchived = isArchived;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination and sorting
      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        notifications,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.getUnreadCount(userId);
      
      return {
        success: true,
        unreadCount: count
      };
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  /**
   * Mark specific notifications as read
   * @param {String} userId - User ID
   * @param {Array} notificationIds - Array of notification IDs to mark as read
   * @returns {Promise<Object>} Update result
   */
  async markAsRead(userId, notificationIds) {
    try {
      if (!Array.isArray(notificationIds)) {
        // If a single ID is provided, convert to array
        notificationIds = [notificationIds];
      }

      const result = await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          userId: userId,
          isRead: false
        },
        {
          isRead: true,
          readAt: new Date()
        }
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);
      
      return {
        success: true,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Archive notifications
   * @param {String} userId - User ID
   * @param {Array} notificationIds - Array of notification IDs to archive
   * @returns {Promise<Object>} Update result
   */
  async archiveNotifications(userId, notificationIds) {
    try {
      const result = await Notification.archiveNotifications(userId, notificationIds);
      
      return {
        success: true,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };
    } catch (error) {
      logger.error('Error archiving notifications:', error);
      throw error;
    }
  }

  /**
   * Update a user's notification preferences
   * @param {String} userId - User ID
   * @param {Object} preferences - Notification preferences
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Initialize notification preferences if they don't exist
      if (!user.notificationPreferences) {
        user.notificationPreferences = {};
      }

      // Update preferences for each provided type
      for (const [type, enabled] of Object.entries(preferences)) {
        // Only update valid notification types
        if (NOTIFICATION_TEMPLATES[type] || type === 'all') {
          user.notificationPreferences[type] = Boolean(enabled);
        }
      }

      // Save user
      await user.save();
      logger.info(`Notification preferences updated for user ${userId}`);
      
      return {
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: user.notificationPreferences
      };
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get a user's notification preferences
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Notification preferences
   */
  async getNotificationPreferences(userId) {
    try {
      // Find user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Get preferences or initialize empty object
      const preferences = user.notificationPreferences || {};
      
      // Create default preferences for any missing notification types
      const allPreferences = { ...preferences };
      
      for (const type in NOTIFICATION_TEMPLATES) {
        if (allPreferences[type] === undefined) {
          allPreferences[type] = true; // Default all to enabled
        }
      }

      return {
        success: true,
        preferences: allPreferences
      };
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications
   * @param {Number} olderThanDays - Delete notifications older than this many days
   * @returns {Promise<Object>} Deletion result
   */
  async deleteOldNotifications(olderThanDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      logger.info(`Deleted ${result.deletedCount} old notifications`);
      
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      logger.error('Error deleting old notifications:', error);
      throw error;
    }
  }
}

// Create and export service instance
const pushNotificationService = new PushNotificationService();

// Initialize on module load
pushNotificationService.initialize()
  .then(initialized => {
    if (initialized) {
      logger.info('Push notification service started successfully');
    } else {
      logger.warn('Push notification service initialized with warnings');
    }
  })
  .catch(error => {
    logger.error('Failed to start push notification service:', error);
  });

module.exports = pushNotificationService;
