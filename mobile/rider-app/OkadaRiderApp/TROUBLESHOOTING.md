# Rider App C++ Exception Troubleshooting

This document explains how to fix the non-std C++ exception that occurs in the Okada Rider App, particularly the `RCTJSThreadManager` initialization error.

## Error Details

The following error stack trace can occur when running the Rider App:

```
non-std C++ exception

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

This is commonly caused by:

1. Stale Metro caches
2. Issues with the JavaScript engine configuration
3. Conflicts in the React Native thread management
4. Incompatible transformation settings

## Solution

A comprehensive fix script has been created to resolve these issues. The script:

1. Cleans Metro and React Native caches
2. Updates the Metro configuration to use Hermes engine with proper bytecode settings
3. Creates an optimized runtime environment
4. Provides a dedicated startup script with proper configurations

## How to Fix

### Option 1: Run the Fix Script (Recommended)

```bash
# Navigate to the Rider App directory
cd mobile/rider-app/OkadaRiderApp

# Run the fix script
yarn fix-cpp
```

This will:
- Clean all relevant caches
- Update the Metro configuration
- Create the run script
- Reinstall dependencies

### Option 2: Start with Fixed Configuration

After running the fix script once, you can use:

```bash
# Navigate to the Rider App directory
cd mobile/rider-app/OkadaRiderApp

# Start with fixed configuration
yarn start-fixed
```

### Manual Fix Steps

If you need to manually fix the issue:

1. Kill any processes using port 8082:
   ```bash
   lsof -ti:8082 | xargs kill -9 2>/dev/null || true
   ```

2. Clear Metro and React Native caches:
   ```bash
   rm -rf node_modules/.cache/metro
   rm -rf "$TMPDIR/metro-*"
   rm -rf "$TMPDIR/haste-map-*"
   rm -rf .expo
   ```

3. Update the Metro configuration to use proper transformation settings:
   ```javascript
   // In metro.config.js
   config.transformer = {
     ...config.transformer,
     // Force Hermes as the transform engine to prevent C++ exceptions
     unstable_transformProfile: 'hermes-canary',
     minifierPath: 'metro-minify-terser'
   };
   ```

4. Start with optimized settings:
   ```bash
   REACT_NATIVE_PACKAGER_HOSTNAME=localhost npx expo start --clear --port 8082
   ```

## Technical Details

### The Root Cause

The `RCTJSThreadManager` C++ exception typically occurs due to issues with the JavaScript engine initialization, particularly:

1. When the JavaScript engine (like Hermes) is not properly configured
2. When there are stale caches causing conflicts
3. When there are issues with the bytecode generation or execution
4. When the Metro bundler encounters conflicts in module resolution

### How the Fix Works

The fix script addresses these issues by:

1. **Cache Cleaning**: Removes all potential stale caches that could corrupt the JavaScript engine initialization
2. **Metro Configuration**: Updates the Metro bundler configuration to use optimized settings for Hermes
3. **Transformation Settings**: Configures proper bytecode generation and transformation profiles
4. **Environment Variables**: Sets the appropriate environment variables to ensure stable connections

## Preventive Measures

To avoid this issue in the future:

1. Regularly clear Metro cache: `yarn clear-cache`
2. Use the optimized start script: `yarn start-fixed`
3. Keep React Native, Expo, and other dependencies updated
4. Avoid running multiple Metro bundler instances simultaneously

## Related Issues

This fix may also resolve related issues:

- Metro bundler hanging or freezing
- JavaScript errors that crash the entire app
- Slow bundling times
- Inconsistent app behavior

If you encounter further issues, please document them and update this troubleshooting guide.
