import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    enum: ['passenger', 'rider'],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    maxlength: 500
  },
  categories: [{
    type: String,
    enum: [
      // Passenger rating categories
      'safe_driving', 'friendly', 'punctual', 'clean_vehicle', 'professional',
      // Rider rating categories  
      'polite', 'clear_directions', 'payment_ready', 'pickup_location'
    ]
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  response: {
    text: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure one rating per ride per user
ratingSchema.index({ rideId: 1, fromUserId: 1 }, { unique: true });
ratingSchema.index({ toUserId: 1, rating: 1 });
ratingSchema.index({ createdAt: -1 });

export default ratingSchema;
