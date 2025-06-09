/**
 * Admin middleware to check if the user has admin role
 */
const adminMiddleware = (req, res, next) => {
  try {
    // Check if user exists and has admin role (from auth middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Error checking admin status', error: error.message });
  }
};

module.exports = adminMiddleware;
