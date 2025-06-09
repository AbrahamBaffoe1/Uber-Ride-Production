/**
 * SavedLocation Model for MongoDB
 * Stores user's saved locations (home, work, favorites, etc.)
 */
import mongoose from 'mongoose';

const savedLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String
  },
  destination: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String
  },
  type: {
    type: String,
    enum: ['home', 'work', 'favorite', 'airport', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['active', 'deleted'],
    default: 'active',
    index: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  metadata: {
    placeId: String, // Google Places ID if available
    formattedAddress: String,
    addressComponents: {
      type: Map,
      of: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
savedLocationSchema.index({ coordinates: '2dsphere' });
savedLocationSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
savedLocationSchema.index({ 'destination.coordinates': '2dsphere' });
savedLocationSchema.index({ userId: 1, status: 1 });
savedLocationSchema.index({ riderId: 1, status: 1 });
savedLocationSchema.index({ createdAt: -1 });

// Virtual for coordinates in lat/lng format
savedLocationSchema.virtual('location').get(function() {
  if (this.coordinates && this.coordinates.coordinates) {
    return {
      lat: this.coordinates.coordinates[1],
      lng: this.coordinates.coordinates[0]
    };
  }
  return null;
});

// Method to increment usage count
savedLocationSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return await this.save();
};

// Static method to get most used locations for a user
savedLocationSchema.statics.getMostUsedLocations = async function(userId, limit = 5) {
  return await this.find({
    userId,
    status: 'active'
  })
  .sort({ usageCount: -1, lastUsed: -1 })
  .limit(limit);
};

// Static method to find locations near a point
savedLocationSchema.statics.findNearbyLocations = async function(userId, coordinates, maxDistance = 1000) {
  return await this.find({
    userId,
    status: 'active',
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.lng, coordinates.lat]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

export default mongoose.model('SavedLocation', savedLocationSchema);
