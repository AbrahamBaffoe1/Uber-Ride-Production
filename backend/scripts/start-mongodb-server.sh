#!/bin/bash

# Start the backend server with MongoDB integration
echo "Starting Okada Transportation backend server with MongoDB..."
echo "MongoDB URI: ${MONGODB_URI:-mongodb://localhost:27017/okada-transportation}"

# Change to the root directory of the backend
cd "$(dirname "$0")/.." || exit

# Make sure required packages are installed
npm install --no-save

# Start the server
node src/index.js
