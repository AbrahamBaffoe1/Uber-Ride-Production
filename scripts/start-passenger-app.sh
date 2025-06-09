#!/bin/bash

# Script to start the Okada Passenger App with proper Expo configuration
echo "🚀 Starting Okada Passenger App..."

# Navigate to the passenger app directory
cd mobile/passenger-app/OkadaPassengerApp

# Kill any processes using port 8081
echo "🔄 Ensuring port 8081 is available..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Clear any previous cache and use localhost as host
echo "🧹 Clearing Metro bundler cache..."
USE_LOCALHOST=true npx expo start --clear --port 8081

# Make the script executable with:
# chmod +x scripts/start-passenger-app.sh
