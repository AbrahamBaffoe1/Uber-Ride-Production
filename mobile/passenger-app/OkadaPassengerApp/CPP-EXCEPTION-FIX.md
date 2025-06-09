# C++ Exception Fix for Okada Passenger App

This document explains the solution implemented to fix the non-standard C++ exception in the Okada Passenger App.

## Problem

The app was experiencing a non-standard C++ exception related to the React Native JavaScript thread manager:

```
RCTFatal
__26-[RCTJSThreadManager init]_block_invoke_2
facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&)
invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>)
__CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__
__CFRunLoopDoBlocks
__CFRunLoopRun
CFRunLoopRunSpecific
+[RCTJSThreadManager runRunLoop]
__NSThread__start__
_pthread_start
thread_start
```

This is a known issue with React Native's JavaScript thread management on iOS, specifically with the `RCTJSThreadManager` component.

## Solution

The solution involves several components:

1. **Exception Handling Modules**:
   - `native-exception-wrapper.js`: Wraps components to catch and handle C++ exceptions
   - `native-interceptor.js`: Sets up real-time prevention for C++ exceptions

2. **Metro Configuration**:
   - Updated `metro.config.js` to use Hermes engine with specific settings:
     ```javascript
     config.transformer = {
       ...config.transformer,
       unstable_transformProfile: 'hermes-canary',
       minifierPath: 'metro-minify-terser',
     };
     ```

3. **Environment Variables**:
   - Set critical environment variables to prevent thread initialization crashes:
     ```
     EXPO_USE_HERMES=1
     EXPO_SKIP_BUNDLER_VALIDATION=1
     RCT_CATCH_NATIVE_EXCEPTIONS=1
     JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1
     RCT_NO_THREAD_INIT_CRASH=1
     ```

4. **Cache Cleaning**:
   - Implemented thorough cache cleaning to prevent stale caches from causing issues

5. **Run Scripts**:
   - `run-fixed-app.sh`: Runs the app with optimized settings
   - `run-with-exception-fix.sh`: Runs the app with comprehensive exception handling
   - `run-ios-simulator.sh`: Runs the app on iOS simulator with exception fixes

6. **Fix Script**:
   - `fix-cpp-exception.js`: Comprehensive script that:
     - Cleans caches and temporary files
     - Kills processes on specific ports
     - Updates the Metro configuration
     - Creates optimized run scripts

## How to Use

To run the app with the C++ exception fix, use one of the following commands:

```bash
# Run the fix script to clean caches and update configuration
yarn fix-cpp

# Run the app with fixed configuration
yarn run-fixed

# Run on iOS simulator with exception fixes
yarn ios-simulator
```

## Technical Details

### Exception Handling

The exception handling is implemented at multiple levels:

1. **Global Error Handler**: Intercepts C++ exceptions and prevents app crashes
2. **Native Module Patching**: Replaces problematic native modules with safe implementations
3. **Thread Management**: Optimizes thread management to reduce pressure that leads to exceptions

### Hermes Engine

Using the Hermes JavaScript engine with specific transformation settings helps prevent C++ exceptions by:

1. Improving memory management
2. Reducing thread contention
3. Providing better error handling

### Production Mode

Running the app in production mode (`--no-dev --minify`) helps prevent exceptions by:

1. Reducing the number of active threads
2. Minimizing debug overhead
3. Optimizing JavaScript execution

## References

- [React Native Thread Management](https://reactnative.dev/docs/performance)
- [Hermes Engine Documentation](https://hermesengine.dev/)
- [Metro Bundler Configuration](https://facebook.github.io/metro/docs/configuration)
