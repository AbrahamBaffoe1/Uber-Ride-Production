#!/bin/bash

echo "=========================================="
echo "Testing Okada Rider App Metrics Screen Fix"
echo "=========================================="

# Check if required packages are installed
echo "Checking dependencies..."
if ! npm list expo-linear-gradient > /dev/null 2>&1; then
  echo "Installing expo-linear-gradient..."
  npm install --save expo-linear-gradient
fi

# Make the script executable
chmod +x ./run-fixed-app.sh

# Clear metro cache to ensure changes take effect
echo "Clearing Metro cache..."
npm run clear-cache

# Run the app with the fix-cpp-exception script
echo "Starting the app with error handling..."
./run-fixed-app.sh

echo "Test complete. If the metrics screen loads properly with fallback data, the fix was successful."
