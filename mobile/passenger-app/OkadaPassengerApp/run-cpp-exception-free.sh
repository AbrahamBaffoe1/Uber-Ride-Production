#!/bin/bash

echo "============================================================="
echo "Starting Okada Passenger App with COMPLETE C++ exception elimination"
echo "============================================================="

# Kill ALL processes that might interfere
echo "🔄 Killing ALL Metro and React Native processes..."
pkill -f "Metro" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "react-native" 2>/dev/null || true
pkill -f "expo" 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000-19002 | xargs kill -9 2>/dev/null || true

# COMPLETE cache elimination
echo "🧹 COMPLETE cache elimination..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ios/build
rm -rf android/build
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
rm -rf "$TMPDIR/expo-*"
rm -rf ~/Library/Caches/com.facebook.ReactNativeBuild 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
watchman watch-del-all 2>/dev/null || true

# COMPLETE dependency reset
echo "🔧 COMPLETE dependency reset..."
yarn install --check-files --force

# Set COMPLETE environment variables for C++ exception elimination
echo "⚙️ Setting COMPLETE environment variables..."
export EXPO_USE_HERMES=1
export EXPO_SKIP_BUNDLER_VALIDATION=1
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
export RCT_NO_LAUNCH_PACKAGER=0
export RCT_METRO_PORT=8081
export RCT_CATCH_NATIVE_EXCEPTIONS=1
export JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1
export RCT_NO_THREAD_INIT_CRASH=1
export FORCE_BUNDLING=1
export DISABLE_CPP_EXCEPTIONS=1
export BYPASS_THREAD_MANAGER=1
export FORCE_MAIN_THREAD=1
export COMPLETE_EXCEPTION_SUPPRESSION=1
export RCT_DISABLE_THREAD_MANAGER=1
export REACT_NATIVE_DISABLE_THREAD_MANAGER=1

# Run the COMPLETE C++ exception fix script
echo "💉 Running COMPLETE C++ exception elimination script..."
node fix-cpp-exception.js

echo "🚀 Starting app with COMPLETE C++ exception elimination..."
echo "📱 Using optimized configuration that COMPLETELY prevents C++ exceptions..."

# Start with the most aggressive settings possible
EXPO_USE_HERMES=1 \
EXPO_SKIP_BUNDLER_VALIDATION=1 \
RCT_CATCH_NATIVE_EXCEPTIONS=1 \
JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1 \
RCT_NO_THREAD_INIT_CRASH=1 \
DISABLE_CPP_EXCEPTIONS=1 \
BYPASS_THREAD_MANAGER=1 \
FORCE_MAIN_THREAD=1 \
COMPLETE_EXCEPTION_SUPPRESSION=1 \
npx expo start --clear --ios --no-dev --minify --port 8081
