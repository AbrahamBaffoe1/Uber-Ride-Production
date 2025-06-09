/**
 * Admin User Service
 * Handles admin operations for user management
 */
import mongoose from 'mongoose';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

/**
 * Toggle user verification status (email and/or phone)
 * @param {string} userId - User ID to update
 * @param {Object} updates - Update fields { verifyEmail, verifyPhone }
 * @returns {Promise<Object>} Updated user data
 * @throws {Error} If update fails
 */
export const toggleUserVerification = async (userId, updates) => {
  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID format');
  }

  // Find the user
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Prepare update fields
  const updateFields = {};
  if (updates.verifyEmail !== undefined) {
    updateFields.isEmailVerified = updates.verifyEmail;
  }
  if (updates.verifyPhone !== undefined) {
    updateFields.isPhoneVerified = updates.verifyPhone;
  }

  // Apply updates
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return {
    id: updatedUser._id,
    email: updatedUser.email,
    isEmailVerified: updatedUser.isEmailVerified,
    phoneNumber: updatedUser.phoneNumber,
    isPhoneVerified: updatedUser.isPhoneVerified
  };
};

/**
 * Get all users with filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Results per page
 * @param {string} options.sort - Sort field
 * @param {string} options.search - Search query
 * @param {string} options.role - Filter by role
 * @param {string} options.isActive - Filter by active status
 * @returns {Promise<Object>} Users and pagination data
 */
export const getAllUsers = async (options) => {
  const { page = 1, limit = 10, sort = '-createdAt', search, role, isActive } = options;
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Build search filter
  const searchFilter = {};
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    searchFilter.$or = [
      { email: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
      { phoneNumber: searchRegex }
    ];
  }
  
  // Role filter
  if (role && role !== 'all') {
    searchFilter.role = role;
  }
  
  // Status filter
  if (isActive === 'true') {
    searchFilter.isActive = true;
  } else if (isActive === 'false') {
    searchFilter.isActive = false;
  }
  
  // Set up query with timeout protection
  try {
    const findPromise = User.find(searchFilter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const countPromise = User.countDocuments(searchFilter);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('User query timed out after 15 seconds')), 15000)
    );
    
    // Execute queries with timeout protection
    const [users, total] = await Promise.all([
      Promise.race([findPromise, timeoutPromise]),
      Promise.race([countPromise, timeoutPromise])
    ]);
    
    return {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw new Error(error.message.includes('timed out')
      ? 'Request timed out. Please try again or contact support.'
      : 'Failed to fetch users');
  }
};

/**
 * Create a new admin user
 * @param {Object} userData - User data
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Password
 * @param {string} userData.firstName - First name
 * @param {string} userData.lastName - Last name
 * @param {string} userData.phoneNumber - Phone number
 * @returns {Promise<Object>} Created user
 * @throws {Error} If user creation fails
 */
export const createAdminUser = async (userData) => {
  const { email, password, firstName, lastName, phoneNumber } = userData;
  
  // Validate required fields
  if (!email || !password || !firstName || !lastName || !phoneNumber) {
    throw new Error('Email, password, first name, last name, and phone number are required');
  }
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Create new admin user
  const newAdmin = new User({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    phoneNumber,
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true,
    status: 'active',
    accountStatus: 'active'
  });
  
  // Save admin user
  await newAdmin.save();
  
  return {
    id: newAdmin._id,
    email: newAdmin.email,
    firstName: newAdmin.firstName,
    lastName: newAdmin.lastName,
    role: newAdmin.role
  };
};
