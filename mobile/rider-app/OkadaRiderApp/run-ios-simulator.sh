#!/bin/bash

# Kill any processes using the required ports
echo "Checking for processes using ports 8082 and 8083..."
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true

# Clear all caches
echo "Clearing Metro and React Native caches..."
rm -rf node_modules/.cache/metro
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/expo-*"
rm -rf .expo

# Fix potential issues with the installation
echo "Fixing any dependency issues..."
yarn install --check-files

# Set up environment specifically for iOS
echo "Setting up environment variables for iOS..."
export EXPO_USE_HERMES=1
export EXPO_SKIP_BUNDLER_VALIDATION=1

# Start the app with optimized configuration for iOS simulator
echo "Starting app on iOS simulator with enhanced configuration..."
npx expo start --clear --ios --no-dev --minify
