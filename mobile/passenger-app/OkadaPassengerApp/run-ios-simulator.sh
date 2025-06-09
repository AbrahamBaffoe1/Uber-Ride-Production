#!/bin/bash

echo "===== Okada Passenger App: iOS Simulator with C++ Exception Fix ====="

# Kill any processes using the required ports
echo "🔄 Checking for processes using port 8081 and other Metro ports..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000-19002 | xargs kill -9 2>/dev/null || true

# Perform thorough cache cleaning
echo "🧹 Performing thorough cache cleaning to prevent RCTJSThreadManager issues..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ios/build
watchman watch-del-all 2>/dev/null || true

# Clean temp directories that can cause stale cache issues
echo "🗑️ Cleaning temporary React Native and Metro caches..."
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
rm -rf "$TMPDIR/expo-*"

# Fix potential issues with dependencies
echo "🔧 Checking dependencies and fixing issues..."
yarn install --check-files

# Set critical environment variables to prevent C++ exceptions
echo "⚙️ Setting environment variables to prevent RCTJSThreadManager exceptions..."
export EXPO_USE_HERMES=1
export EXPO_SKIP_BUNDLER_VALIDATION=1
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
export RCT_NO_LAUNCH_PACKAGER=0
export RCT_METRO_PORT=8081
export RCT_CATCH_NATIVE_EXCEPTIONS=1
export JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1
export RCT_NO_THREAD_INIT_CRASH=1
export FORCE_BUNDLING=1

# Run the C++ exception fix script
echo "💉 Applying C++ exception fixes from the fix script..."
node fix-cpp-exception.js

echo "🚀 Starting app with optimized configuration to prevent thread manager exceptions..."
echo "📱 Using production mode and minification which helps avoid the exception..."
cd "$(dirname "$0")" && npx expo start --clear --ios --no-dev --minify
