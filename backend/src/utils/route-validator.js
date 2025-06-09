/**
 * Route Validator Utility
 * Checks if controller methods exist before using them in routes
 */

/**
 * Create a wrapper function that ensures a controller method exists
 * before using it as middleware. If the method doesn't exist, it returns
 * a fallback middleware that sends a clear error message.
 *
 * @param {Object} controller - The controller object
 * @param {string} methodName - The name of the controller method
 * @returns {Function} Middleware function
 */
export function ensureControllerMethod(controller, methodName) {
  // Check if the controller method exists and is a function
  if (typeof controller[methodName] !== 'function') {
    console.error(`ERROR: Controller method '${methodName}' is undefined or not a function`);
    
    // Return a fallback middleware that sends an error response
    return (req, res) => {
      return res.status(500).json({
        status: 'error',
        message: `API endpoint not implemented: ${methodName}`,
        details: 'This feature is not yet available. The server administrator has been notified.'
      });
    };
  }
  
  // If the method exists, return it
  return controller[methodName];
}

// Named export is already defined above
