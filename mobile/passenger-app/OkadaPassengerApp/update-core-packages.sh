#!/bin/bash

echo "🔄 Starting Selective Package Update for Okada Passenger App 🔄"
echo "This script will update core packages while preserving C++ exception fixes"

# First, back up package.json
echo "📦 Backing up package.json..."
cp package.json package.json.backup

# Kill any existing Metro processes
echo "🔪 Killing any existing Metro processes..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000 | xargs kill -9 2>/dev/null || true

# Clean caches before updating
echo "🧹 Cleaning caches before updating..."
rm -rf node_modules/.cache
rm -rf .expo
watchman watch-del-all 2>/dev/null || true

# Update core packages first
echo "🔄 Updating core packages (expo and react-native)..."
npx expo install expo@~52.0.46 react-native@0.76.9

echo "✅ Core packages updated. It's recommended to test the app after this update before proceeding."
echo "To run the app with the enhanced C++ exception prevention configuration:"
echo "  ./run-fixed-app.sh"
echo ""
echo "If the app runs successfully without C++ exceptions, you can update the remaining packages with:"
echo "  npx expo install @react-native-async-storage/async-storage@1.23.1 @react-native-community/datetimepicker@8.2.0 @react-native-community/slider@4.5.5 expo-device@~7.0.3 expo-location@~18.0.10 lottie-react-native@7.1.0 react-native-gesture-handler@~2.20.2 react-native-maps@1.18.0 react-native-reanimated@~3.16.1 react-native-safe-area-context@4.12.0 react-native-screens@~4.4.0 react-native-svg@15.8.0"
