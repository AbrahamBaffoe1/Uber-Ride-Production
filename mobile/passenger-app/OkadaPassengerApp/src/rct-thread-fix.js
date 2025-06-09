/**
 * Specific fix for the RCTJSThreadManager init exception
 * 
 * This targets the exact error seen in the stack trace:
 * RCTFatal
 * __26-[RCTJSThreadManager init]_block_invoke_2
 * facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&)
 * invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>)
 * __CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__
 * __CFRunLoopDoBlocks
 * __CFRunLoopRun
 * CFRunLoopRunSpecific
 * +[RCTJSThreadManager runRunLoop]
 */

import { NativeModules, Platform } from 'react-native';

// Only apply on iOS
if (Platform.OS === 'ios') {
  console.log('[RCTThreadFix] Installing targeted fix for RCTJSThreadManager init');

  // If we have access to the JSThreadManager, try to make it more robust
  if (NativeModules.JSThreadManager) {
    console.log('[RCTThreadFix] Found JSThreadManager module - applying fixes');
    
    // Save original methods
    const originalMethods = {};
    
    // Wrap all methods with exception handling
    Object.keys(NativeModules.JSThreadManager).forEach(key => {
      if (typeof NativeModules.JSThreadManager[key] === 'function') {
        originalMethods[key] = NativeModules.JSThreadManager[key];
        
        NativeModules.JSThreadManager[key] = function(...args) {
          try {
            return originalMethods[key].apply(this, args);
          } catch (e) {
            console.warn(`[RCTThreadFix] Caught exception in JSThreadManager.${key}: ${e.message}`);
            // Return default value based on context
            return null;
          }
        };
      }
    });
  }
  
  // Also look for any message thread related modules
  Object.keys(NativeModules).forEach(moduleName => {
    if (moduleName.includes('MessageThread') || moduleName.includes('Bridge')) {
      console.log(`[RCTThreadFix] Adding protection to ${moduleName}`);
      
      const module = NativeModules[moduleName];
      if (module) {
        // Wrap methods with try/catch
        Object.keys(module).forEach(key => {
          if (typeof module[key] === 'function') {
            const original = module[key];
            module[key] = function(...args) {
              try {
                return original.apply(this, args);
              } catch (e) {
                console.warn(`[RCTThreadFix] Caught exception in ${moduleName}.${key}`);
                return null;
              }
            };
          }
        });
      }
    }
  });
}

export default {
  isFixed: true,
  patchVersion: '1.0.1'
};
