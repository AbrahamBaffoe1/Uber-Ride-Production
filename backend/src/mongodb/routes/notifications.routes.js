/**
 * Notification Routes
 * Defines API endpoints for notification management using MongoDB
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const pushNotificationService = require('../services/push-notification.service');
const Notification = require('../models/Notification');
const { isAdmin } = require('../middlewares/role.middleware');
const router = express.Router();

/**
 * @route GET /api/v1/mongo/notifications
 * @desc Get user notifications with pagination and filtering
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      limit = 20, 
      page = 1, 
      type, 
      isRead,
      isArchived = false,
      sort = '-createdAt' 
    } = req.query;
    
    // Convert query params to appropriate types
    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      sort
    };
    
    if (type) options.type = type;
    if (isRead !== undefined) options.isRead = isRead === 'true';
    if (isArchived !== undefined) options.isArchived = isArchived === 'true';
    
    const result = await pushNotificationService.getUserNotifications(
      req.user._id,
      options
    );
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/notifications
 * @desc Create and send a notification (typically called from other services)
 * @access Private (internal or admin)
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { 
      userId, 
      type, 
      title, 
      message, 
      data = {}, 
      sendPush = true 
    } = req.body;
    
    // If userId is provided and not the authenticated user, restrict to admins
    if (userId && userId !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send notifications to other users'
      });
    }
    
    // Default to authenticated user if no userId is provided
    const targetUserId = userId || req.user._id;
    
    const notification = await pushNotificationService.createAndSendNotification({
      userId: targetUserId,
      type,
      title,
      message,
      customData: data,
      sendPush
    });
    
    return res.status(201).json({
      success: true,
      notification,
      message: 'Notification created and sent successfully'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/notifications/count
 * @desc Get unread notification count for a user
 * @access Private
 */
router.get('/count', authenticate, async (req, res) => {
  try {
    const result = await pushNotificationService.getUnreadCount(req.user._id);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get unread notification count',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/notifications/read
 * @desc Mark notifications as read
 * @access Private
 */
router.put('/read', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Notification IDs array is required'
      });
    }
    
    const result = await pushNotificationService.markAsRead(req.user._id, notificationIds);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/notifications/read/all
 * @desc Mark all notifications as read for a user
 * @access Private
 */
router.put('/read/all', authenticate, async (req, res) => {
  try {
    const result = await pushNotificationService.markAllAsRead(req.user._id);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/notifications/archive
 * @desc Archive notifications
 * @access Private
 */
router.put('/archive', authenticate, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Notification IDs array is required'
      });
    }
    
    const result = await pushNotificationService.archiveNotifications(req.user._id, notificationIds);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error archiving notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive notifications',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/notifications/preferences
 * @desc Get user notification preferences
 * @access Private
 */
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const result = await pushNotificationService.getNotificationPreferences(req.user._id);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/notifications/preferences
 * @desc Update user notification preferences
 * @access Private
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Preferences object is required'
      });
    }
    
    const result = await pushNotificationService.updateNotificationPreferences(req.user._id, preferences);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/notifications/push-token
 * @desc Register a push token for a user
 * @access Private
 */
router.post('/push-token', authenticate, async (req, res) => {
  try {
    const { type, token, device } = req.body;
    
    if (!type || !token) {
      return res.status(400).json({
        success: false,
        message: 'Token type and value are required'
      });
    }
    
    const result = await pushNotificationService.registerPushToken(req.user._id, {
      type,
      token,
      device
    });
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error registering push token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register push token',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/notifications/push-token
 * @desc Unregister a push token for a user
 * @access Private
 */
router.delete('/push-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    const result = await pushNotificationService.unregisterPushToken(req.user._id, token);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unregister push token',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/notifications/bulk
 * @desc Send bulk notifications to multiple users (admin only)
 * @access Private (admin)
 */
router.post('/bulk', authenticate, isAdmin, async (req, res) => {
  try {
    const { 
      userIds, 
      type,
      title,
      message,
      data,
      sendPush,
      batchSize,
      delay
    } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Notification type is required'
      });
    }
    
    // Start the bulk send process
    const result = await pushNotificationService.sendBulkNotifications(
      userIds,
      {
        type,
        title,
        message,
        customData: data,
        sendPush
      },
      {
        batchSize,
        delay
      }
    );
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/notifications/cleanup
 * @desc Delete old notifications (admin only)
 * @access Private (admin)
 */
router.delete('/cleanup', authenticate, isAdmin, async (req, res) => {
  try {
    const { olderThanDays = 90 } = req.query;
    
    const result = await pushNotificationService.deleteOldNotifications(parseInt(olderThanDays));
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clean up old notifications',
      error: error.message
    });
  }
});

module.exports = router;
