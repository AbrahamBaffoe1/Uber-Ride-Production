/**
 * User Model for MongoDB
 * Defines the schema and methods for user accounts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  country: {
    type: String,
    default: 'NG',  // Default to Nigeria
    trim: true,
    uppercase: true
  },
  preferredCurrency: {
    type: String,
    default: null, // Will be derived from country if null
    trim: true,
    uppercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  role: {
    type: String,
    enum: ['passenger', 'rider', 'admin'],
    default: 'passenger'
  },
  profilePicture: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorMethod: {
    type: String,
    enum: ['sms', 'email', 'authenticator', null],
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  riderProfile: {
    isActive: {
      type: Boolean,
      default: false
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalRides: {
      type: Number,
      default: 0
    },
    vehicleType: {
      type: String,
      enum: ['motorcycle', 'bicycle', 'car', null],
      default: null
    },
    documentVerified: {
      type: Boolean,
      default: false
    }
  },
  passengerProfile: {
    totalRides: {
      type: Number,
      default: 0
    },
    savedAddresses: [{
      name: String,
      address: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    }],
    preferredPaymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_money', null],
      default: null
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: true, // Enable command buffering (default)
  bufferTimeoutMS: parseInt(process.env.MONGODB_BUFFER_TIMEOUT_MS) || 120000 // Use environment variable or default to 120000ms
});

// Add indexes for better query performance
// Note: Mongoose automatically creates indexes for fields with unique: true
// so we don't need to explicitly define indexes for email and phoneNumber
userSchema.index({ status: 1 });

// Import for country-to-currency mapping
import { getCurrencyForCountry } from '../../services/currency.service.js';

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to set preferred currency based on country if not explicitly set
userSchema.pre('save', function(next) {
  // If country is set but preferred currency is not, derive it from country
  if (this.country && !this.preferredCurrency) {
    try {
      this.preferredCurrency = getCurrencyForCountry(this.country);
    } catch (error) {
      console.error('Error setting preferred currency:', error);
      // Continue without setting currency - will use default in services
    }
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Compare the candidate password with the stored hashed password
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Generate JWT token method
userSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
  return token;
};

// Generate refresh token method
userSchema.methods.generateRefreshToken = function() {
  const refreshToken = jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  return refreshToken;
};

/**
 * User Model for MongoDB
 * Defines the schema and methods for user accounts
 */
export default mongoose.model('User', userSchema);
