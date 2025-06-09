#!/bin/bash
# MongoDB Index Creation Script
# This script is a wrapper for the create-mongodb-indexes.js Node.js script
# that handles the actual index creation logic.

# Set the path to the index creation script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INDEX_SCRIPT="$SCRIPT_DIR/../src/scripts/create-mongodb-indexes.js"

# Make the script executable if it isn't already
chmod +x "$INDEX_SCRIPT"

# Display usage instructions
function display_usage {
  echo "MongoDB Index Creation Tool"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --verbose       Show verbose output"
  echo "  --help          Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0"
  echo "  $0 --verbose"
}

# Check if help was requested
if [[ "$*" == *"--help"* ]]; then
  display_usage
  exit 0
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Please install Node.js and try again."
  exit 1
fi

# Warn about database impact
echo "WARNING: This script will create and update MongoDB indexes."
echo "Index creation may impact database performance during execution."
echo "Make sure you have backed up your data before proceeding."
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Run the index creation script
  echo "Starting MongoDB index creation..."
  node "$INDEX_SCRIPT" "$@"
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "Index creation completed successfully."
  else
    echo "Index creation failed with exit code $EXIT_CODE."
    echo "Check the logs above for more information."
  fi
else
  echo "Index creation aborted."
fi
