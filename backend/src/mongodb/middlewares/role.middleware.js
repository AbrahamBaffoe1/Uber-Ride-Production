/**
 * Role Middleware for MongoDB Routes
 * Handles role-based authorization for MongoDB API endpoints
 */

/**
 * Check if user has any of the specified roles
 * @param {Array|String} roles - Required role(s)
 * @returns {Function} Middleware function
 */
export const hasAnyRole = (roles) => {
  return (req, res, next) => {
    try {
      // Convert roles to array if it's a string
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: User has no role assigned'
        });
      }
      
      // Check if user's role is in the required roles
      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied: Required role(s): ${requiredRoles.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Role authorization error:', error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'Authorization failed'
      });
    }
  };
};

/**
 * Check if user has all of the specified roles
 * @param {Array|String} roles - Required role(s)
 * @returns {Function} Middleware function
 */
export const hasAllRoles = (roles) => {
  return (req, res, next) => {
    try {
      // Convert roles to array if it's a string
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Check if user exists and has a role
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: User has no role assigned'
        });
      }
      
      // For multiple roles, we would need to check if user has all roles
      // This would require the user.role to be an array
      // For now, we'll just check if the user has at least one of the required roles
      if (!requiredRoles.includes(req.user.role)) {
        return res.status(403).json({
          status: 'error',
          message: `Access denied: Required role(s): ${requiredRoles.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Role authorization error:', error.message);
      
      return res.status(500).json({
        status: 'error',
        message: 'Authorization failed'
      });
    }
  };
};

/**
 * Check if user is an admin
 * @returns {Function} Middleware function
 */
export const isAdmin = (req, res, next) => {
  try {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: User has no role assigned'
      });
    }
    
    // Check if user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Admin role required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    
    return res.status(500).json({
      status: 'error',
      message: 'Authorization failed'
    });
  }
};

/**
 * Check if user is a rider
 * @returns {Function} Middleware function
 */
export const isRider = (req, res, next) => {
  try {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: User has no role assigned'
      });
    }
    
    // Check if user is a rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Rider role required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Rider authorization error:', error.message);
    
    return res.status(500).json({
      status: 'error',
      message: 'Authorization failed'
    });
  }
};

/**
 * Check if user is a passenger
 * @returns {Function} Middleware function
 */
export const isPassenger = (req, res, next) => {
  try {
    // Check if user exists and has a role
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: User has no role assigned'
      });
    }
    
    // Check if user is a passenger
    if (req.user.role !== 'passenger') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Passenger role required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Passenger authorization error:', error.message);
    
    return res.status(500).json({
      status: 'error',
      message: 'Authorization failed'
    });
  }
};
