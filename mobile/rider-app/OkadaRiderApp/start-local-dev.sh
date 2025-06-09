#!/bin/bash

# Default to using localhost (not IP address)
USE_LOCALHOST=true

# Clear Metro bundler cache
echo "Clearing Metro bundler cache..."
rm -rf node_modules/.cache/metro

# Start the custom server with localhost preference
echo "Starting custom development server..."
if [ "$USE_LOCALHOST" = true ]; then
  echo "Using localhost for connections (for simulators/emulators)"
  USE_LOCALHOST=true node server.js
else
  # Get the local IP address dynamically (only used for reference)
  LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
  echo "Using network connections with IP: $LOCAL_IP"
  node server.js
fi
