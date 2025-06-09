/**
 * Ride Model for MongoDB
 * Defines the schema and methods for ride tracking and management
 */
import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
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

const rideSchema = new mongoose.Schema({
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
  pickupLocation: {
    address: String,
    coordinates: {
      type: pointSchema,
      required: true,
      index: '2dsphere'
    }
  },
  destination: {
    address: String,
    coordinates: {
      type: pointSchema,
      required: true,
      index: '2dsphere'
    }
  },
  intermediateStops: [{
    address: String,
    coordinates: pointSchema,
    arrivedAt: Date,
    departedAt: Date,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: [
      'requested',        // Ride requested by passenger
      'accepted',         // Ride accepted by rider
      'arrived_pickup',   // Rider arrived at pickup location
      'in_progress',      // Ride in progress
      'arrived_destination', // Arrived at destination
      'completed',        // Ride completed
      'cancelled',        // Ride cancelled
      'failed',           // Ride failed for some reason
      'paid'              // Payment completed
    ],
    default: 'requested',
    index: true
  },
  scheduledPickupTime: Date, // For scheduled rides
  actualPickupTime: Date,
  actualDropoffTime: Date,
  estimatedDuration: Number, // in seconds
  actualDuration: Number,    // in seconds
  estimatedDistance: Number, // in meters
  actualDistance: Number,    // in meters
  fare: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    surgeMultiplier: {
      type: Number,
      default: 1.0
    },
    totalFare: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'NGN'
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String, // Reference to payment record if applicable
  rating: {
    fromPassenger: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: Date
    },
    fromRider: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: Date
    }
  },
  cancelledBy: {
    type: String,
    enum: ['passenger', 'rider', 'system', null],
    default: null
  },
  cancellationReason: String,
  cancellationFee: Number,
  promoCode: String,
  promoDiscount: Number,
  route: {
    encodedPolyline: String,
    waypoints: [pointSchema]
  },
  notes: String,
  isShared: {
    type: Boolean,
    default: false
  },
  relatedRideIds: [mongoose.Schema.Types.ObjectId], // For shared rides
  // Tracking data
  riderLocationHistory: [{
    coordinates: pointSchema,
    timestamp: Date
  }],
  metaData: {
    appVersion: String,
    userAgent: String,
    ipAddress: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Add compound indexes for common queries
rideSchema.index({ status: 1 });
rideSchema.index({ riderId: 1, status: 1 });
rideSchema.index({ userId: 1, status: 1 });
rideSchema.index({ createdAt: -1 });

// Virtual for ride duration in minutes
rideSchema.virtual('durationInMinutes').get(function() {
  if (!this.actualDuration) return null;
  return Math.round(this.actualDuration / 60);
});

// Virtual for distance in kilometers
rideSchema.virtual('distanceInKm').get(function() {
  if (!this.actualDistance) return null;
  return (this.actualDistance / 1000).toFixed(2);
});

// Method to calculate ETA based on current coordinates and destination
rideSchema.methods.calculateETA = function(currentCoordinates) {
  // Implementation would normally use a maps API
  // This is a placeholder that returns a random ETA between 5-30 minutes
  return Math.floor(Math.random() * 25) + 5;
};

// Static method to find nearby available rides
rideSchema.statics.findNearbyRides = async function(coordinates, maxDistance = 5000) {
  return this.find({
    status: 'requested',
    'pickupLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates // [longitude, latitude]
        },
        $maxDistance: maxDistance // meters
      }
    }
  }).limit(10);
};

// Pre-save hook for validation or additional logic
rideSchema.pre('save', function(next) {
  // Set completed time if status changed to completed
  if (this.isModified('status') && this.status === 'completed' && !this.actualDropoffTime) {
    this.actualDropoffTime = new Date();
    
    // Calculate actual duration if we have both pickup and dropoff times
    if (this.actualPickupTime) {
      this.actualDuration = Math.round((this.actualDropoffTime - this.actualPickupTime) / 1000);
    }
  }
  
  // Set actual pickup time if status changed to in_progress
  if (this.isModified('status') && this.status === 'in_progress' && !this.actualPickupTime) {
    this.actualPickupTime = new Date();
  }
  
  next();
});

// Create and export the model
const Ride = mongoose.model('Ride', rideSchema);
export default Ride;
