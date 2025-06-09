/**
 * Rider Location Model
 * Tracks real-time and historical location data for riders
 */
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// Geospatial point schema
const pointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
});

// Check if an ID is a temporary one
const isTemporaryId = (id) => typeof id === 'string' && id.startsWith('temp-');

// Rider location schema
const riderLocationSchema = new Schema({
  riderId: {
    type: Schema.Types.Mixed, // Changed from ObjectId to Mixed to support temporary string IDs
    ref: 'User',
    required: true,
    index: true,
    // Custom validation to allow both ObjectId and temporary string IDs
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v) || isTemporaryId(v);
      },
      message: props => `${props.value} is not a valid rider ID!`
    }
  },
  
  // Current location
  currentLocation: {
    type: pointSchema,
    required: true
  },
  
  // Formatted address (from reverse geocoding)
  formattedAddress: {
    type: String,
    default: null
  },
  
  // Address components
  addressComponents: {
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  // Location accuracy in meters
  accuracy: {
    type: Number,
    default: 0
  },
  
  // Rider status
  status: {
    type: String,
    enum: ['offline', 'online', 'busy', 'en_route'],
    default: 'offline'
  },
  
  // Current heading (direction) in degrees (0-360)
  heading: {
    type: Number,
    default: 0
  },
  
  // Speed in meters per second
  speed: {
    type: Number,
    default: 0
  },
  
  // Altitude in meters
  altitude: {
    type: Number,
    default: 0
  },
  
  // If the rider is currently assigned to a ride
  currentRideId: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  },
  
  // Battery level of rider's device (0-100)
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  
  // Location metadata
  metadata: {
    deviceId: String,
    appVersion: String,
    provider: {
      type: String,
      enum: ['gps', 'network', 'fused', 'manual'],
      default: 'gps'
    },
    mock: {
      type: Boolean,
      default: false
    }
  },
  
  // Last update time
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, 
{
  timestamps: true
});

// Create indexes
riderLocationSchema.index({ currentLocation: '2dsphere' });
riderLocationSchema.index({ riderId: 1, lastUpdated: -1 });
riderLocationSchema.index({ status: 1 });

/**
 * Find nearby riders
 * @param {Object} coordinates - Coordinates object with lat and lng
 * @param {Number} maxDistance - Maximum distance in meters
 * @param {String} status - Rider status (optional)
 * @returns {Promise<Array>} - List of nearby riders
 */
riderLocationSchema.statics.findNearbyRiders = async function(coordinates, maxDistance = 5000, status = 'online') {
  const query = {
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat]
        },
        $maxDistance: maxDistance
      }
    }
  };
  
  // Add status filter if provided
  if (status) {
    query.status = status;
  }
  
  // Exclude temporary rider IDs from nearby search
  query.riderId = { $not: { $regex: /^temp-/ } };
  
  return this.find(query)
    .populate('riderId', 'firstName lastName phoneNumber profilePicture riderProfile.averageRating')
    .sort('distance')
    .exec();
};

/**
 * Update rider location
 * @param {ObjectId|String} riderId - Rider's user ID (can be ObjectId or temp string)
 * @param {Object} locationData - Location data to update
 * @returns {Promise<Object>} - Updated rider location document
 */
riderLocationSchema.statics.updateRiderLocation = async function(riderId, locationData) {
  // Handle temporary IDs with a synthetic response
  if (isTemporaryId(riderId)) {
    console.log('Skipping database update for temporary rider ID:', riderId);
    
    const { lat, lng, accuracy, heading, speed, altitude, status, batteryLevel, metadata } = locationData;
    
    // Return a synthetic document without touching the database
    return {
      riderId: riderId,
      currentLocation: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      accuracy: accuracy || 0,
      heading: heading || 0,
      speed: speed || 0,
      altitude: altitude || 0,
      status: status || 'offline',
      batteryLevel: batteryLevel || 100,
      metadata: metadata || {},
      formattedAddress: 'Registration in progress',
      lastUpdated: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  // Normal processing for regular user IDs
  const { lat, lng, accuracy, heading, speed, altitude, status, batteryLevel, metadata } = locationData;
  
  const updateData = {
    currentLocation: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    accuracy: accuracy || 0,
    lastUpdated: new Date()
  };
  
  // Add optional fields if provided
  if (heading !== undefined) updateData.heading = heading;
  if (speed !== undefined) updateData.speed = speed;
  if (altitude !== undefined) updateData.altitude = altitude;
  if (status) updateData.status = status;
  if (batteryLevel !== undefined) updateData.batteryLevel = batteryLevel;
  if (metadata) updateData.metadata = { ...metadata };
  
  // Update or create the rider location document
  try {
    const riderLocation = await this.findOneAndUpdate(
      { riderId },
      { $set: updateData },
      { upsert: true, new: true }
    );
    
    return riderLocation;
  } catch (error) {
    console.error('Error updating rider location:', error);
    throw error;
  }
};

/**
 * Get location history for a rider
 * @param {ObjectId|String} riderId - Rider's user ID
 * @param {Date} startDate - Start date for history
 * @param {Date} endDate - End date for history
 * @returns {Promise<Array>} - Location history
 */
riderLocationSchema.statics.getRiderLocationHistory = async function(riderId, startDate, endDate) {
  // Handle temporary IDs with an empty response
  if (isTemporaryId(riderId)) {
    console.log('No location history for temporary rider ID:', riderId);
    return [];
  }
  
  // This would typically come from a separate collection for historical location data
  // For now, we'll just return the current location
  try {
    const riderLocation = await this.findOne({ riderId });
    return riderLocation ? [riderLocation] : [];
  } catch (error) {
    console.error('Error getting rider location history:', error);
    return [];
  }
};

// Create model
const RiderLocation = mongoose.model('RiderLocation', riderLocationSchema);

export default RiderLocation;
