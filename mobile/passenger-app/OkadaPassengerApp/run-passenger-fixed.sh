#!/bin/bash

echo "============================================================="
echo "Starting Okada Passenger App with comprehensive C++ exception fixes"
echo "============================================================="

# Kill any processes using the required ports
echo "Checking for processes using ports..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000-19002 | xargs kill -9 2>/dev/null || true

# Clean caches for a fresh start
echo "Cleaning build caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
watchman watch-del-all 2>/dev/null || true

# Apply our native code patches
echo "Applying direct native code patches..."
node patch-native-modules.js

# Configure environment with critical variables 
export EXPO_USE_HERMES=1
export EXPO_SKIP_BUNDLER_VALIDATION=1
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
export RCT_NO_LAUNCH_PACKAGER=0
export RCT_METRO_PORT=8081

# This is critical for fixing the specific RCTJSThreadManager issue
export RCT_CATCH_NATIVE_EXCEPTIONS=1
export JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1
export RCT_NO_THREAD_INIT_CRASH=1

# Start the app with production mode settings (which avoids many threading issues)
echo "Starting app with optimized production settings..."
npx expo start --clear --no-dev --minify --ios
