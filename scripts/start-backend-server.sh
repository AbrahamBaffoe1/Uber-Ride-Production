#!/bin/bash
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
  echo -e "${GREEN}[BACKEND SERVER] $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}[BACKEND SERVER] $1${NC}"
}

print_error() {
  echo -e "${RED}[BACKEND SERVER] ERROR: $1${NC}"
}

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  print_message "Installing dependencies..."
  npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  print_warning ".env file not found. Creating default .env file..."
  cp ../backend/.env.example .env 2>/dev/null || cat > .env << EOF
# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=admin
DB_NAME=okada_transportation
DB_HOST=localhost
DB_PORT=5432

# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=okada_rider_app_development_secret
JWT_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=7d

# Redis Configuration
REDIS_URL=redis://localhost:6379

# SMS configuration
SMS_PROVIDER=console
SMS_API_KEY=test_key
SMS_SENDER_ID=OKADA
EOF
  print_message "Created default .env file. Please update it with your configuration."
fi

# Start the server
print_message "Starting backend server..."
print_message "Server will be available at http://localhost:3000"
npm run dev
