#!/bin/bash
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
  echo -e "${GREEN}[DB SETUP] $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}[DB SETUP] $1${NC}"
}

print_error() {
  echo -e "${RED}[DB SETUP] ERROR: $1${NC}"
}

# Start PostgreSQL with Docker if not already running
print_message "Checking if PostgreSQL container is running..."
if ! docker ps | grep -q "postgres:14"; then
  print_message "Starting PostgreSQL container..."
  docker-compose up -d postgres
  # Wait for database to be ready
  print_message "Waiting for PostgreSQL to start..."
  sleep 5
else
  print_warning "PostgreSQL container is already running"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  print_message "Installing dependencies..."
  npm install
fi

# Run database migrations
print_message "Running database migrations..."
npx sequelize-cli db:migrate

# Seed database with initial data
print_message "Seeding database with initial data..."
npx sequelize-cli db:seed:all

print_message "Database setup completed successfully!"
