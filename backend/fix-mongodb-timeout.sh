#!/bin/bash

# Script to fix MongoDB connection timeout issues
# This script runs the fix-mongodb-timeout.js script to resolve the
# "Operation `users.findOne()` buffering timed out after 120000ms" error

echo "Starting MongoDB connection timeout fix..."

# Set NODE_ENV to development if not already set
export NODE_ENV=${NODE_ENV:-development}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not found. Please install Node.js and try again."
    exit 1
fi

# Navigate to the project's backend directory
cd "$(dirname "$0")"

# Check if the fix script exists
if [ ! -f "./src/scripts/fix-mongodb-timeout.mjs" ]; then
    echo "Error: MongoDB fix script not found at ./src/scripts/fix-mongodb-timeout.mjs"
    exit 1
fi

# Run the MongoDB fix script
echo "Running MongoDB timeout fix script..."
node src/scripts/fix-mongodb-timeout.mjs

# Check if the script executed successfully
if [ $? -eq 0 ]; then
    echo "MongoDB timeout fix completed successfully!"
    echo "The fix addresses the 'Operation buffering timed out after 120000ms' error by:"
    echo "  - Reducing connection timeouts from 120s to 30s for faster failure detection"
    echo "  - Adding automatic retry mechanisms with exponential backoff"
    echo "  - Improving connection monitoring and error handling"
    echo "  - Implementing proper connection pool management"
    echo ""
    echo "You can now restart your application with the fixed MongoDB connection."
else
    echo "Error: MongoDB timeout fix failed. Please check the logs for details."
    exit 1
fi

# Make the script executable
chmod +x ./fix-mongodb-timeout.sh

echo "You can run this script again anytime with: ./fix-mongodb-timeout.sh"

exit 0
