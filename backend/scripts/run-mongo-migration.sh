#!/bin/bash
# PostgreSQL to MongoDB Migration Script
# This script is a wrapper for the pg-to-mongo-migration.js Node.js script
# that handles the actual migration logic.

# Set the path to the migration script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="$SCRIPT_DIR/../src/scripts/pg-to-mongo-migration.js"

# Make the script executable if it isn't already
chmod +x "$MIGRATION_SCRIPT"

# Display usage instructions
function display_usage {
  echo "PostgreSQL to MongoDB Migration Tool"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --all           Migrate all data (default if no specific option provided)"
  echo "  --users         Migrate only users"
  echo "  --rides         Migrate only rides"
  echo "  --payments      Migrate only payments"
  echo "  --locations     Migrate only rider locations"
  echo "  --notifications Migrate only notifications"
  echo "  --documents     Migrate only rider documents"
  echo "  --earnings      Migrate only rider earnings"
  echo "  --batch=N       Batch size for processing (default: 100)"
  echo "  --dry-run       Run without writing to MongoDB"
  echo "  --verbose       Show verbose output"
  echo "  --help          Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --all --verbose"
  echo "  $0 --users --rides --batch=50"
  echo "  $0 --payments --dry-run"
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
echo "WARNING: This script will migrate data from PostgreSQL to MongoDB."
echo "It may cause high database load during migration."
echo "Make sure you have backed up your data before proceeding."
echo ""
echo "Migration options: $*"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Run the migration script with all provided arguments
  echo "Starting migration..."
  node "$MIGRATION_SCRIPT" "$@"
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Migration completed successfully."
  else
    echo "Migration failed with exit code $EXIT_CODE."
    echo "Check the logs above for more information."
  fi
else
  echo "Migration aborted."
fi
