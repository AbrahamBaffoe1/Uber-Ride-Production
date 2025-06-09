#!/bin/bash

# Script to start the Okada Rider App with proper Expo configuration
echo "🚀 Starting Okada Rider App..."

# Navigate to the rider app directory
cd mobile/rider-app/OkadaRiderApp

# Kill any processes using port 8082
echo "🔄 Ensuring port 8082 is available..."
lsof -ti:8082 | xargs kill -9 2>/dev/null || true

# Clear any previous cache and use localhost as host
echo "🧹 Clearing Metro bundler cache..."
USE_LOCALHOST=true npx expo start --clear --port 8082

# Make the script executable with:
# chmod +x scripts/start-rider-app.sh
