/**
 * AdminUser Model for MongoDB
 * Defines the schema and methods for admin user accounts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminUserSchema = new mongoose.Schema({
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
  role: {
    type: String,
    default: 'admin',
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  bufferCommands: true, // Enable command buffering (default)
  bufferTimeoutMS: parseInt(process.env.MONGODB_BUFFER_TIMEOUT_MS) || 120000 // Use environment variable or default to 120000ms
});

// Pre-save hook to hash password
adminUserSchema.pre('save', async function(next) {
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

// Method to compare passwords
adminUserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Compare the candidate password with the stored hashed password
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Generate JWT token method
adminUserSchema.methods.generateAuthToken = function() {
  const token = jwt.sign(
    { id: this._id, role: 'admin' },
    process.env.JWT_SECRET || 'dev-secret-key',
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
  return token;
};

// Generate refresh token method
adminUserSchema.methods.generateRefreshToken = function() {
  const refreshToken = jwt.sign(
    { id: this._id, role: 'admin' },
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  return refreshToken;
};

/**
 * AdminUser Model for MongoDB
 */
export default mongoose.model('AdminUser', adminUserSchema);
