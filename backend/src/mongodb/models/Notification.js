/**
 * Notification Model for MongoDB
 * Defines the schema and methods for user notifications
 */
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Define notification schema
const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true,
    enum: [
      'ride_request',         // New ride request
      'ride_accepted',        // Ride accepted by rider
      'ride_arrived_pickup',  // Rider arrived at pickup
      'ride_started',         // Ride started
      'ride_completed',       // Ride completed
      'ride_cancelled',       // Ride cancelled
      'payment_success',      // Payment successful 
      'payment_failed',       // Payment failed
      'earnings_available',   // Earnings available for cashout
      'earnings_sent',        // Earnings sent to bank
      'document_approved',    // Document approved
      'document_rejected',    // Document rejected
      'account_update',       // Account updated
      'security_alert',       // Security alert
      'promotion',            // Promotion or offer
      'system'                // System notification
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration 30 days from creation
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date;
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add compound indices for common queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });

/**
 * Get unread notifications count for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isArchived: false
  });
};

/**
 * Get recent notifications for a user
 * @param {ObjectId} userId - User ID
 * @param {Number} limit - Maximum number of notifications to return
 * @returns {Promise<Array>} Recent notifications
 */
notificationSchema.statics.getRecent = async function(userId, limit = 10) {
  return this.find({
    userId,
    isArchived: false
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

/**
 * Mark all notifications as read for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Update result
 */
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    {
      userId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

/**
 * Mark notifications as archived for a user
 * @param {ObjectId} userId - User ID
 * @param {Array} notificationIds - Array of notification IDs to archive
 * @returns {Promise<Object>} Update result
 */
notificationSchema.statics.archiveNotifications = async function(userId, notificationIds) {
  return this.updateMany(
    {
      userId,
      _id: { $in: notificationIds }
    },
    {
      isArchived: true
    }
  );
};

/**
 * Create notification
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  return notification.save();
};

// Create model
const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
