/**
 * Development Controller
 * Contains endpoints that are only available in development mode
 * NEVER use these in production!
 */
const User = require('../models/User');

/**
 * Auto-verify a user by email
 * @route POST /api/v1/dev/verify-user
 * @access Public (DEVELOPMENT ONLY)
 */
exports.verifyUser = async (req, res) => {
  try {
    // Ensure this only runs in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        status: 'error',
        message: 'This endpoint is not available in production'
      });
    }
    
    const { email, phoneNumber } = req.body;
    
    if (!email && !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone number is required'
      });
    }
    
    // Find user by email or phone
    const searchCriteria = email ? { email } : { phoneNumber };
    const user = await User.findOne(searchCriteria);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update verification status
    if (email) {
      user.isEmailVerified = true;
    }
    
    if (phoneNumber) {
      user.isPhoneVerified = true;
    }
    
    await user.save();
    
    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'User verification status updated',
      data: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      }
    });
  } catch (error) {
    console.error('Error in development verify-user endpoint:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * List all users (simplified, no pagination)
 * @route GET /api/v1/dev/users
 * @access Public (DEVELOPMENT ONLY)
 */
exports.listUsers = async (req, res) => {
  try {
    // Ensure this only runs in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        status: 'error',
        message: 'This endpoint is not available in production'
      });
    }
    
    // Find all users (limit to 50 for safety)
    const users = await User.find()
      .select('-password')
      .limit(50);
    
    // Return users data
    return res.status(200).json({
      status: 'success',
      count: users.length,
      data: users.map(user => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      }))
    });
  } catch (error) {
    console.error('Error in development list-users endpoint:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
};
