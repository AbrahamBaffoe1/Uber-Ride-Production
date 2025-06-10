/**
 * OTP Model
 * Defines the schema for OTP (One-Time Password) records in MongoDB
 */
import mongoose from 'mongoose';
const { Schema } = mongoose;

/**
 * OTP Schema
 * Stores OTP codes, their status, and related information
 */
const OTPSchema = new Schema({
  // User ID associated with this OTP
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Type of OTP (verification, passwordReset, login, etc.)
  type: {
    type: String,
    enum: ['verification', 'passwordReset', 'login', 'twoFactor'],
    required: true,
    index: true
  },
  
  // The OTP code itself
  code: {
    type: String,
    required: true
  },
  
  // Phone number or email where OTP was sent
  identifier: {
    type: String,
    required: true
  },
  
  // When the OTP expires
  expiresAt: {
    type: Date,
    required: true
    // Index is defined explicitly below with TTL setting
  },
  
  // Whether the OTP has been used
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // When the OTP was verified
  verifiedAt: {
    type: Date
  },
  
  // Number of verification attempts
  attempts: {
    type: Number,
    default: 0
  },
  
  // Message ID from delivery service (Twilio, etc.)
  messageId: {
    type: String
  },
  
  // Delivery status (sent, delivered, failed)
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  // Service provider used to send OTP
  provider: {
    type: String,
    enum: ['legacy', 'twilio', 'realtime'],
    default: 'legacy'
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
OTPSchema.index({ userId: 1, type: 1, createdAt: -1 });
OTPSchema.index({ userId: 1, isUsed: 1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

/**
 * Find the most recent OTP for a user and type
 * @param {ObjectId} userId - User ID
 * @param {String} type - OTP type
 * @returns {Promise<Object>} OTP document
 */
OTPSchema.statics.findLatestByUserAndType = function(userId, type) {
  return this.findOne({ userId, type })
    .sort({ createdAt: -1 })
    .maxTimeMS(5000) // 5 seconds timeout (reduced from 3 minutes)
    .exec();
};

/**
 * Find active (not used, not expired) OTP for a user and type
 * @param {ObjectId} userId - User ID
 * @param {String} type - OTP type
 * @returns {Promise<Object>} OTP document
 */
OTPSchema.statics.findActiveByUserAndType = function(userId, type) {
  return this.findOne({
    userId,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: -1 })
    .maxTimeMS(5000) // 5 seconds timeout (reduced from 3 minutes)
    .exec();
};

/**
 * Invalidate all active OTPs for a user and type
 * @param {ObjectId} userId - User ID
 * @param {String} type - OTP type
 * @returns {Promise<Object>} Update result
 */
OTPSchema.statics.invalidateAllForUser = function(userId, type) {
  return this.updateMany(
    {
      userId,
      type,
      isUsed: false
    },
    {
      $set: { isUsed: true }
    }
  )
  .maxTimeMS(5000) // 5 seconds timeout (reduced from 3 minutes)
  .exec();
};

/**
 * Check if a user has exceeded maximum OTP requests
 * @param {ObjectId} userId - User ID
 * @param {String} type - OTP type
 * @param {Number} maxRequests - Maximum allowed requests
 * @param {Number} timeWindowMinutes - Time window in minutes
 * @returns {Promise<Boolean>} Whether limit is exceeded
 */
OTPSchema.statics.hasExceededRequestLimit = async function(
  userId,
  type,
  maxRequests = 5,
  timeWindowMinutes = 60
) {
  const timeWindow = new Date();
  timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);
  
  const count = await this.countDocuments({
    userId,
    type,
    createdAt: { $gte: timeWindow }
  })
  .maxTimeMS(3000) // 3 seconds timeout (reduced from 3 minutes)
  .exec();
  
  return count >= maxRequests;
};

/**
 * Find and verify OTP with optimized timeout
 * @param {ObjectId} userId - User ID
 * @param {String} code - OTP code
 * @param {String} type - OTP type
 * @returns {Promise<Object>} OTP document
 */
OTPSchema.statics.findAndVerifyOTP = async function(userId, code, type) {
  // First try to find by all criteria with short timeout
  try {
    const result = await this.findOne({
      userId,
      type,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    })
    .maxTimeMS(2000) // 2 second timeout
    .exec();
    
    if (result) {
      return { 
        found: true, 
        otp: result,
        searchType: 'exact-match'
      };
    }
  } catch (error) {
    console.warn('Exact OTP match query timed out, trying simplified query');
  }
  
  // If not found or timed out, try simpler query with user + code only
  try {
    const result = await this.findOne({
      userId,
      code
    })
    .sort({ createdAt: -1 })
    .maxTimeMS(1500) // 1.5 second timeout
    .exec();
    
    if (result) {
      return { 
        found: true, 
        otp: result,
        searchType: 'code-match'
      };
    }
  } catch (error) {
    console.warn('Code-only OTP match query timed out');
  }
  
  // Last resort - just find latest OTP for this user regardless of code
  try {
    const result = await this.findOne({
      userId,
      type
    })
    .sort({ createdAt: -1 })
    .maxTimeMS(1000) // 1 second timeout
    .exec();
    
    if (result) {
      return { 
        found: true, 
        otp: result,
        searchType: 'user-match',
        codeMatches: result.code === code
      };
    }
  } catch (error) {
    console.warn('User-only OTP match query timed out');
  }
  
  // Nothing found or all queries timed out
  return {
    found: false,
    searchType: 'all-attempts-failed'
  };
};

// Create the model
const OTP = mongoose.model('OTP', OTPSchema);

export default OTP;
