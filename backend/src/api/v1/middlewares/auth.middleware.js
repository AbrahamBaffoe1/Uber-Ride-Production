import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        code: 401, 
        message: 'Authentication required' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      status: 'error', 
      code: 401, 
      message: 'Invalid or expired token' 
    });
  }
};

export const hasRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        status: 'error', 
        code: 401, 
        message: 'Authentication required' 
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasPermission = roles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        status: 'error', 
        code: 403, 
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

// Named exports are already defined above
