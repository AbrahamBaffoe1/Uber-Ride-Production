/**
 * Restaurant middleware to check if the user has restaurant_owner role
 */
const restaurantMiddleware = (req, res, next) => {
  try {
    // Check if user exists and has restaurant_owner role (from auth middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'restaurant_owner') {
      return res.status(403).json({ message: 'Restaurant owner access required' });
    }

    // Check if the user has a restaurant ID assigned
    if (!req.user.restaurantId) {
      return res.status(403).json({ message: 'No restaurant associated with this account' });
    }

    next();
  } catch (error) {
    console.error('Restaurant middleware error:', error);
    res.status(500).json({ message: 'Error checking restaurant owner status', error: error.message });
  }
};

module.exports = restaurantMiddleware;
