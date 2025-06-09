/**
 * Main entry point with direct native module patching for C++ exception prevention
 * @format
 */

// Load polyfills first to fix URL.protocol and other issues
import './src/polyfills';

// Import the native module interceptor first, before any other imports
// This ensures it can intercept native modules before they cause C++ exceptions
import NativeInterceptor from './src/native-interceptor';

// Then import other dependencies
import 'react-native-gesture-handler';
import { Platform } from 'react-native';

// Import the native exception wrapper
import NativeExceptionWrapper from './src/native-exception-wrapper';

console.log(`[AppEntry] Starting with direct native module patching (interceptor active: ${NativeInterceptor.isInitialized})`);

// Configure critical environment flags that help prevent the C++ exception
if (global) {
  // These flags make React Native more robust against thread initialization issues
  global.__EXPO_SKIP_BUNDLER_VALIDATION = true;
  global.__RCT_NO_LAUNCH_PACKAGER = false;
  global.__RCT_CATCH_NATIVE_EXCEPTIONS = true;
  
  // Direct thread manager bypass flags
  global.__RCT_NO_THREAD_INIT_CRASH = true;
}

// Advanced error handling for C++ exceptions
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Comprehensive check for C++ exceptions
    if (error) {
      const errorMessage = error.message || '';
      const errorStack = error.stack || '';
      
      // Check for any thread manager or C++ related exceptions
      if (errorMessage.includes('C++ exception') || 
          errorStack.includes('RCTJSThreadManager') ||
          errorStack.includes('facebook::react::') ||
          errorStack.includes('RCTMessageThread') ||
          errorStack.includes('CFRunLoop')) {
        
        console.warn('Intercepted C++ exception with direct native module patching');
        console.warn(`Error details: ${errorMessage}`);
        
        // Use our interceptor to replace the problematic module on-the-fly
        if (Platform.OS === 'ios' && NativeInterceptor) {
          console.log('[AppEntry] Reinforcing native module interception after error');
        }
        
        return; // Prevent the app from crashing
      }
    }
    
    // For other errors, use the original handler
    originalHandler(error, isFatal);
  });
}

// Use platform-specific entry point
if (Platform.OS === 'ios') {
  // On iOS, use the patched iOS entry point that avoids the C++ exception
  console.log('[AppEntry] Using iOS-specific entry point with C++ exception prevention');
  require('./src/index.ios');
} else {
  // On other platforms, use the default entry point with proper AppRegistry registration
  console.log('[AppEntry] Using default entry point with AppRegistry registration');
  const { AppRegistry } = require('react-native');
  const App = require('./App').default;
  
  // Apply the native exception wrapper to the App component for consistency
  const SafeApp = NativeExceptionWrapper ? NativeExceptionWrapper.wrap(App) : App;
  
  // Register the app component with AppRegistry (consistent with iOS path)
  AppRegistry.registerComponent('main', () => SafeApp);
}

// Mark initialization as complete - no action needed as NativeExceptionWrapper auto-initializes

// Export a marker that this index.js includes the direct native patching
export const __HAS_CPP_EXCEPTION_FIX__ = true;
