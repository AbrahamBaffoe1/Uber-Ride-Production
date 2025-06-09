#!/bin/bash

# Start with MongoDB Initialization Script
# This script initializes MongoDB and starts the backend server

echo "Starting Okada Transportation system with MongoDB initialization..."

# Step 1: Navigate to backend directory
cd "$(dirname "$0")/../backend" || { echo "Error: Could not navigate to backend directory"; exit 1; }

# Step 2: Check for required dependencies
echo "Checking backend dependencies..."
if ! command -v node &>/dev/null; then
    echo "Error: Node.js is not installed" >&2
    exit 1
fi

# Check if important packages are installed
if ! npm list bcrypt &>/dev/null || ! npm list uuid &>/dev/null || ! npm list mongodb &>/dev/null; then
    echo "Installing missing dependencies..."
    npm install bcrypt uuid mongodb socket.io
fi

# Kill any processes using port 3001
echo "Ensuring port 3001 is available..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Step 3: Check MongoDB connection based on .env file
echo "Checking MongoDB connection configuration..."
if grep -q "MONGODB_URI=" .env; then
    echo "Using MongoDB connection from .env file."
else
    echo "Warning: No MONGODB_URI found in .env file." 
    echo "Using default cloud connection."
fi

# Step 4: Initialize MongoDB database
echo "Initializing MongoDB database..."
node scripts/init-mongodb.js || { 
    echo "MongoDB initialization failed. Continuing with existing database." 
}

# Step 5: Start the backend server with proper error handling
echo "Starting backend server..."
npm start || {
    echo "Backend server failed to start. Please check errors above."
    exit 1
}
