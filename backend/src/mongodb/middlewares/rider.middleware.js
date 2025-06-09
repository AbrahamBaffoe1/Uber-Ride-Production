/**
 * Rider middleware to check if the user has rider role
 */
const riderMiddleware = (req, res, next) => {
  try {
    // Check if user exists and has rider role (from auth middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'rider') {
      return res.status(403).json({ message: 'Rider access required' });
    }

    // Additional rider-specific checks could be added here
    // For example, checking if rider account is verified or active

    next();
  } catch (error) {
    console.error('Rider middleware error:', error);
    res.status(500).json({ message: 'Error checking rider status', error: error.message });
  }
};

module.exports = riderMiddleware;
