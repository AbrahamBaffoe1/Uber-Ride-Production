/**
 * Tracking Event Model
 * Records real-time tracking events for analytics and audit
 */
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Define tracking event schema
const trackingEventSchema = new Schema({
  // Event type
  eventType: {
    type: String,
    required: true,
    enum: [
      'location_update',     // Regular location update
      'status_change',       // Rider status change
      'tracking_started',    // Tracking relationship started
      'tracking_stopped',    // Tracking relationship ended
      'ride_started',        // Ride started
      'ride_completed',      // Ride completed
      'ride_cancelled',      // Ride cancelled
      'connection',          // User connected
      'disconnection',       // User disconnected
      'error'                // Error event
    ],
    index: true
  },
  
  // User who generated the event
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User role
  userRole: {
    type: String,
    enum: ['rider', 'passenger', 'admin'],
    required: true
  },
  
  // Related ride, if applicable
  rideId: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    index: true
  },
  
  // Related user, if applicable (e.g., for tracking events)
  relatedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Location data, if applicable
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: function() {
        return this.location && this.location.coordinates && this.location.coordinates.length === 2;
      }
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: function() {
        return this.location && this.location.type === 'Point';
      },
      validate: {
        validator: function(v) {
          return !this.location || !this.location.type || v.length === 2;
        },
        message: 'Coordinates must be an array of [longitude, latitude]'
      }
    }
  },
  
  // Additional location metadata
  locationMetadata: {
    accuracy: Number,
    heading: Number,
    speed: Number,
    altitude: Number,
    formattedAddress: String
  },
  
  // Device data
  deviceData: {
    deviceId: String,
    appVersion: String,
    provider: String,
    batteryLevel: Number,
    connectionType: String,
    os: String,
    osVersion: String,
    browser: String,
    browserVersion: String
  },
  
  // Additional event data (depends on event type)
  eventData: {
    type: Schema.Types.Mixed
  },
  
  // Event status (for errors or processing states)
  status: {
    type: String,
    enum: ['success', 'error', 'pending', 'processed'],
    default: 'success'
  },
  
  // Error message, if applicable
  errorMessage: String,
  
  // Session ID for grouping related events
  sessionId: {
    type: String,
    index: true
  },
}, {
  timestamps: true
});

// Add geospatial index on location field
trackingEventSchema.index({ location: '2dsphere' });

// Add compound indices for common queries
trackingEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
trackingEventSchema.index({ rideId: 1, eventType: 1, createdAt: -1 });
trackingEventSchema.index({ createdAt: -1 });

/**
 * Create a location update event
 * @param {Object} data Event data
 * @returns {Promise<Object>} Created event
 */
trackingEventSchema.statics.createLocationEvent = async function(data) {
  try {
    if (!data.userId || !data.location) {
      throw new Error('UserId and location are required for location events');
    }
    
    const event = new this({
      eventType: 'location_update',
      userId: data.userId,
      userRole: data.userRole || 'rider',
      rideId: data.rideId,
      location: {
        type: 'Point',
        coordinates: [data.location.lng, data.location.lat]
      },
      locationMetadata: {
        accuracy: data.accuracy,
        heading: data.heading,
        speed: data.speed,
        altitude: data.altitude,
        formattedAddress: data.formattedAddress
      },
      deviceData: data.deviceData || {},
      eventData: data.eventData || {},
      sessionId: data.sessionId
    });
    
    return await event.save();
  } catch (error) {
    console.error('Error creating location event:', error);
    throw error;
  }
};

/**
 * Create a status change event
 * @param {Object} data Event data
 * @returns {Promise<Object>} Created event
 */
trackingEventSchema.statics.createStatusEvent = async function(data) {
  try {
    if (!data.userId || !data.status) {
      throw new Error('UserId and status are required for status events');
    }
    
    const event = new this({
      eventType: 'status_change',
      userId: data.userId,
      userRole: data.userRole || 'rider',
      rideId: data.rideId,
      location: data.location ? {
        type: 'Point',
        coordinates: [data.location.lng, data.location.lat]
      } : undefined,
      eventData: {
        oldStatus: data.oldStatus,
        newStatus: data.status,
        reason: data.reason
      },
      deviceData: data.deviceData || {},
      sessionId: data.sessionId
    });
    
    return await event.save();
  } catch (error) {
    console.error('Error creating status event:', error);
    throw error;
  }
};

/**
 * Create a tracking relationship event
 * @param {Object} data Event data
 * @returns {Promise<Object>} Created event
 */
trackingEventSchema.statics.createTrackingEvent = async function(data) {
  try {
    if (!data.userId || !data.relatedUserId || !data.eventType) {
      throw new Error('UserId, relatedUserId and eventType are required for tracking events');
    }
    
    if (!['tracking_started', 'tracking_stopped'].includes(data.eventType)) {
      throw new Error('Invalid event type for tracking events');
    }
    
    const event = new this({
      eventType: data.eventType,
      userId: data.userId,
      userRole: data.userRole || 'passenger',
      relatedUserId: data.relatedUserId,
      rideId: data.rideId,
      eventData: data.eventData || {},
      deviceData: data.deviceData || {},
      sessionId: data.sessionId
    });
    
    return await event.save();
  } catch (error) {
    console.error('Error creating tracking event:', error);
    throw error;
  }
};

/**
 * Create a ride event
 * @param {Object} data Event data
 * @returns {Promise<Object>} Created event
 */
trackingEventSchema.statics.createRideEvent = async function(data) {
  try {
    if (!data.userId || !data.rideId || !data.eventType) {
      throw new Error('UserId, rideId and eventType are required for ride events');
    }
    
    if (!['ride_started', 'ride_completed', 'ride_cancelled'].includes(data.eventType)) {
      throw new Error('Invalid event type for ride events');
    }
    
    const event = new this({
      eventType: data.eventType,
      userId: data.userId,
      userRole: data.userRole,
      rideId: data.rideId,
      relatedUserId: data.relatedUserId,
      location: data.location ? {
        type: 'Point',
        coordinates: [data.location.lng, data.location.lat]
      } : undefined,
      eventData: data.eventData || {},
      deviceData: data.deviceData || {},
      sessionId: data.sessionId
    });
    
    return await event.save();
  } catch (error) {
    console.error('Error creating ride event:', error);
    throw error;
  }
};

/**
 * Create a connection event
 * @param {Object} data Event data
 * @returns {Promise<Object>} Created event
 */
trackingEventSchema.statics.createConnectionEvent = async function(data) {
  try {
    if (!data.userId || !data.eventType) {
      throw new Error('UserId and eventType are required for connection events');
    }
    
    if (!['connection', 'disconnection'].includes(data.eventType)) {
      throw new Error('Invalid event type for connection events');
    }
    
    // Create a connectionEvent object with all required fields
    const eventData = {
      eventType: data.eventType,
      userId: data.userId,
      userRole: data.userRole,
      deviceData: data.deviceData || {},
      eventData: data.eventData || {},
      sessionId: data.sessionId
    };
    
    // Only add location if it has valid coordinates
    if (data.location && 
        typeof data.location === 'object' && 
        data.location.lat !== undefined && 
        data.location.lng !== undefined) {
      eventData.location = {
        type: 'Point',
        coordinates: [data.location.lng, data.location.lat]
      };
    }
    
    const event = new this(eventData);
    
    return await event.save();
  } catch (error) {
    console.error('Error creating connection event:', error);
    throw error;
  }
};

/**
 * Create an error event
 * @param {Object} data Event data
 * @returns {Promise<Object>} Created event
 */
trackingEventSchema.statics.createErrorEvent = async function(data) {
  try {
    if (!data.userId || !data.errorMessage) {
      throw new Error('UserId and errorMessage are required for error events');
    }
    
    const event = new this({
      eventType: 'error',
      userId: data.userId,
      userRole: data.userRole,
      rideId: data.rideId,
      errorMessage: data.errorMessage,
      eventData: data.eventData || {},
      deviceData: data.deviceData || {},
      status: 'error',
      sessionId: data.sessionId
    });
    
    return await event.save();
  } catch (error) {
    console.error('Error creating error event:', error);
    throw error;
  }
};

/**
 * Get location history for a user
 * @param {ObjectId} userId User ID
 * @param {Date} startDate Start date
 * @param {Date} endDate End date
 * @returns {Promise<Array>} Location history
 */
trackingEventSchema.statics.getLocationHistory = async function(userId, startDate, endDate) {
  try {
    return await this.find({
      userId,
      eventType: 'location_update',
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: 1 });
  } catch (error) {
    console.error('Error getting location history:', error);
    throw error;
  }
};

/**
 * Get ride events for a ride
 * @param {ObjectId} rideId Ride ID
 * @returns {Promise<Array>} Ride events
 */
trackingEventSchema.statics.getRideEvents = async function(rideId) {
  try {
    return await this.find({
      rideId,
      eventType: { $in: ['location_update', 'status_change', 'ride_started', 'ride_completed', 'ride_cancelled'] }
    }).sort({ createdAt: 1 });
  } catch (error) {
    console.error('Error getting ride events:', error);
    throw error;
  }
};

// Create model
const TrackingEvent = mongoose.model('TrackingEvent', trackingEventSchema);

export default TrackingEvent;
