/**
 * Token Blacklist Model
 * Stores invalidated (revoked) tokens for security purposes
 */
import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['logout', 'password_change', 'security_breach', 'token_refresh', 'other'],
    default: 'logout'
  },
  expiresAt: {
    type: Date,
    required: true
    // Index is defined explicitly below
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add indexes for better query performance
// Note: token field already has an index due to unique: true
tokenBlacklistSchema.index({ user: 1 });
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Static method to check if token is blacklisted
tokenBlacklistSchema.statics.isBlacklisted = async function(token) {
  const blacklistedToken = await this.findOne({ token });
  return !!blacklistedToken;
};

/**
 * Token Blacklist Model
 * Used for storing invalidated JWT tokens for security purposes
 */
export default mongoose.model('TokenBlacklist', tokenBlacklistSchema);
