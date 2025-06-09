/**
 * Native Exception Wrapper
 * 
 * This module helps prevent non-standard C++ exceptions from crashing the app,
 * particularly those related to RCTJSThreadManager.
 */

class NativeExceptionWrapper {
  static wrap(Component) {
    // Don't wrap twice
    if (Component.__isWrapped) {
      return Component;
    }

    // Keep track of any errors that occur
    if (!global.__nativeExceptions) {
      global.__nativeExceptions = [];
    }

    // Set up global error handler for native thread errors
    if (!global.__nativeExceptionHandlerSet) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // Check if it's a C++ related error
        const errorString = error.toString();
        const stack = error.stack || '';
        
        if (
          errorString.includes('non-std C++ exception') ||
          stack.includes('RCTJSThreadManager') ||
          stack.includes('RCTMessageThread') ||
          isFatal
        ) {
          global.__nativeExceptions.push({
            error: errorString,
            stack,
            time: new Date().toISOString(),
          });
          
          console.warn('[NativeExceptionWrapper] Caught native exception:', errorString);
          
          // Let the app continue if possible
          if (isFatal) {
            console.warn('[NativeExceptionWrapper] Attempting to recover from fatal error');
            
            // For fatal errors, we try to keep the app alive
            return false;
          }
        }
        
        // Call the original handler for other errors
        return originalHandler(error, isFatal);
      });
      
      global.__nativeExceptionHandlerSet = true;
    }

    // Mark as wrapped
    Component.__isWrapped = true;
    
    // Return the original component - the wrapping is done via global handlers
    return Component;
  }

  // Get all caught exceptions
  static getExceptions() {
    return global.__nativeExceptions || [];
  }

  // Clear exception history
  static clearExceptions() {
    global.__nativeExceptions = [];
  }

  // Mark initialization as complete
  static markInitialized() {
    console.log('[NativeExceptionWrapper] Initialization complete');
    global.__nativeInitialized = true;
    
    // Verify error handlers are properly set up
    if (!global.__nativeExceptionHandlerSet) {
      console.warn('[NativeExceptionWrapper] Warning: Native exception handler not set up');
      NativeExceptionWrapper.setupErrorHandlers();
    }
  }

  // Setup error handlers if not already done
  static setupErrorHandlers() {
    if (!global.__nativeExceptionHandlerSet && global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // Check if it's a C++ related error
        const errorString = error.toString();
        const stack = error.stack || '';
        
        if (
          errorString.includes('non-std C++ exception') ||
          stack.includes('RCTJSThreadManager') ||
          stack.includes('RCTMessageThread') ||
          isFatal
        ) {
          if (!global.__nativeExceptions) {
            global.__nativeExceptions = [];
          }
          
          global.__nativeExceptions.push({
            error: errorString,
            stack,
            time: new Date().toISOString(),
          });
          
          console.warn('[NativeExceptionWrapper] Caught native exception:', errorString);
          
          // Let the app continue if possible
          if (isFatal) {
            console.warn('[NativeExceptionWrapper] Attempting to recover from fatal error');
            return false;
          }
        }
        
        // Call the original handler for other errors
        return originalHandler(error, isFatal);
      });
      
      global.__nativeExceptionHandlerSet = true;
    }
  }
}

export default NativeExceptionWrapper;
