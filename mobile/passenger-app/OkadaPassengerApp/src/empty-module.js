/**
 * Empty module implementation
 * 
 * This provides a safe implementation to replace problematic native modules
 * like RCTJSThreadManager and MessageThread that can cause C++ exceptions.
 */

// Empty implementation that acts as a drop-in replacement for native modules
const safeModule = {
  // Common methods found in thread management modules
  start: () => {
    console.log('[SafeModule] Thread start called - using safe implementation');
    return true;
  },
  
  stop: () => {
    console.log('[SafeModule] Thread stop called - using safe implementation');
    return true;
  },
  
  runAsync: (callback) => {
    console.log('[SafeModule] runAsync called - using safe setTimeout implementation');
    if (typeof callback === 'function') {
      setTimeout(callback, 0);
    }
  },
  
  runOnQueue: (task) => {
    console.log('[SafeModule] runOnQueue called - using safe setTimeout implementation');
    if (typeof task === 'function') {
      setTimeout(task, 0);
    }
  },
  
  callFunctionOnModule: () => {
    console.log('[SafeModule] callFunctionOnModule called - safely ignoring');
    return null;
  },
  
  // Add any other methods that might be called
  init: () => true,
  enableLogging: () => {},
  disableLogging: () => {}
};

// Export the safe implementation
module.exports = safeModule;
