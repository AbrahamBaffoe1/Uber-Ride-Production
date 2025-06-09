#!/bin/bash

echo "============================================================="
echo "Starting Okada Passenger App with real-time C++ exception fixes"
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
rm -rf ~/Library/Caches/com.facebook.ReactNativeBuild 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true

# Fix potential issues with dependencies
echo "Checking dependencies and fixing issues..."
yarn install --check-files

# Set critical environment variables
export EXPO_USE_HERMES=1
export EXPO_SKIP_BUNDLER_VALIDATION=1
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
export RCT_NO_LAUNCH_PACKAGER=0
export RCT_METRO_PORT=8081

# This is critical for fixing the specific RCTJSThreadManager issue
export RCT_CATCH_NATIVE_EXCEPTIONS=1
export JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1
export RCT_NO_THREAD_INIT_CRASH=1
export FORCE_BUNDLING=1

# Run the C++ exception fix script
echo "Applying C++ exception fixes from the fix script..."
node fix-cpp-exception.js

echo "Starting app with real-time exception monitoring..."
echo "Using production mode and minification which helps avoid the exception..."
npx expo start --clear --ios --no-dev --minify
