#!/bin/bash

# Kill any processes using the required ports
echo "Checking for processes using port 8082..."
lsof -ti:8082 | xargs kill -9 2>/dev/null || true

# Clear all caches
echo "Clearing Metro and React Native caches..."
rm -rf node_modules/.cache/metro
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/expo-*"
rm -rf .expo

# Start the app with fixed configuration
echo "Starting app with Hermes engine and enhanced configuration..."
# Force the use of Hermes and bytecode with the transform engine
REACT_NATIVE_PACKAGER_HOSTNAME=localhost npx expo start --clear --port 8082
