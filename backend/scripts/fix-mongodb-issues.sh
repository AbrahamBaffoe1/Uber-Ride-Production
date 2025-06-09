#!/bin/bash
# MongoDB Connection Verification and Troubleshooting Script
# This script checks MongoDB connections and helps troubleshoot common issues

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Banner
echo -e "${BLUE}${BOLD}"
echo "====================================================="
echo "   OKADA TRANSPORTATION - MONGODB CONNECTION FIXER   "
echo "====================================================="
echo -e "${NC}"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
  if [ -f "../package.json" ]; then
    cd ..
    echo -e "${YELLOW}Changed directory to project root${NC}"
  else
    echo -e "${RED}Error: Please run this script from the project root or 'scripts' directory${NC}"
    exit 1
  fi
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js first.${NC}"
  exit 1
fi

echo -e "${CYAN}Step 1: Checking if required environment variables are set...${NC}"

# Check for MongoDB connection string
if [ -z "$MONGODB_URI" ] && [ -f ".env" ]; then
  MONGODB_URI=$(grep "MONGODB_URI" .env | cut -d '=' -f2-)
  echo "Found MONGODB_URI in .env file"
fi

if [ -z "$MONGODB_URI" ]; then
  echo -e "${YELLOW}Warning: MONGODB_URI environment variable is not set.${NC}"
  echo -e "${YELLOW}MongoDB connection string is required for authentication.${NC}"
  
  read -p "Would you like to set the MongoDB connection string now? (y/n): " SET_URI
  if [[ "$SET_URI" =~ ^[Yy]$ ]]; then
    read -p "Enter MongoDB connection string: " MONGODB_URI
    if [ -f ".env" ]; then
      # Check if MONGODB_URI already exists in .env
      if grep -q "MONGODB_URI=" .env; then
        # Replace existing MONGODB_URI
        sed -i.bak "s|MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" .env
      else
        # Add MONGODB_URI to .env
        echo "MONGODB_URI=$MONGODB_URI" >> .env
      fi
      echo -e "${GREEN}Added MONGODB_URI to .env file${NC}"
    else
      echo "MONGODB_URI=$MONGODB_URI" > .env
      echo -e "${GREEN}Created .env file with MONGODB_URI${NC}"
    fi
    export MONGODB_URI="$MONGODB_URI"
  else
    echo -e "${YELLOW}Continuing without setting MONGODB_URI${NC}"
  fi
fi

echo -e "${CYAN}Step 2: Running MongoDB connection verification script...${NC}"
echo ""

# Run the verification script
node src/scripts/verify-mongodb-connection.js
VERIFICATION_RESULT=$?

echo ""
if [ $VERIFICATION_RESULT -eq 0 ]; then
  echo -e "${GREEN}${BOLD}MongoDB verification passed!${NC}"
  echo -e "${GREEN}All database connections are working correctly.${NC}"
else
  echo -e "${RED}${BOLD}MongoDB verification failed!${NC}"
  echo -e "${YELLOW}Let's try to troubleshoot common issues:${NC}"
  
  echo -e "${CYAN}Step 3: Checking MongoDB connectivity...${NC}"
  
  # Check if MongoDB URI is valid
  if [ -n "$MONGODB_URI" ]; then
    if [[ ! "$MONGODB_URI" =~ ^mongodb(\+srv)?:// ]]; then
      echo -e "${RED}Error: MONGODB_URI does not start with 'mongodb://' or 'mongodb+srv://'${NC}"
      echo -e "${YELLOW}Please check your MongoDB connection string format.${NC}"
    fi
    
    # Check if credentials are included
    if [[ ! "$MONGODB_URI" =~ @ ]]; then
      echo -e "${YELLOW}Warning: MONGODB_URI does not appear to include credentials.${NC}"
      echo -e "${YELLOW}Make sure your connection string includes username and password.${NC}"
    fi
  fi
  
  echo -e "${CYAN}Step 4: Checking dependencies...${NC}"
  
  # Install or update mongodb driver
  read -p "Would you like to update MongoDB dependencies? (y/n): " UPDATE_DEPS
  if [[ "$UPDATE_DEPS" =~ ^[Yy]$ ]]; then
    echo "Installing/updating MongoDB dependencies..."
    npm install mongodb mongoose --save
    echo -e "${GREEN}MongoDB dependencies updated${NC}"
  fi
  
  echo -e "${CYAN}Step 5: Checking for authentication issues...${NC}"
  echo -e "${YELLOW}Common authentication issues:${NC}"
  echo -e "1. Incorrect username or password in connection string"
  echo -e "2. IP access restrictions on MongoDB Atlas"
  echo -e "3. Database user doesn't have correct permissions"
  echo -e "4. VPN or network blocking MongoDB connections"
  
  echo -e "${CYAN}Step 6: Attempting to run backend server...${NC}"
  read -p "Would you like to try starting the backend server? (y/n): " START_SERVER
  if [[ "$START_SERVER" =~ ^[Yy]$ ]]; then
    echo "Starting backend server for 10 seconds to check for connection errors..."
    timeout 10s node src/index.js &
    SERVER_PID=$!
    sleep 10
    kill $SERVER_PID 2>/dev/null
    echo -e "${GREEN}Server test completed. Check the logs above for MongoDB connection errors.${NC}"
  fi
  
  echo -e "${CYAN}${BOLD}Troubleshooting Summary:${NC}"
  echo -e "1. ${YELLOW}Check that your MongoDB connection string is correct in .env file${NC}"
  echo -e "2. ${YELLOW}Make sure you have network access to MongoDB Atlas${NC}"
  echo -e "3. ${YELLOW}Verify that the database user has correct permissions${NC}"
  echo -e "4. ${YELLOW}Try restarting the backend server${NC}"
  echo -e "5. ${YELLOW}Check MongoDB Atlas dashboard for connection issues${NC}"
  
  echo -e "${CYAN}Run this script again after making changes to verify the connection.${NC}"
fi

echo ""
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${CYAN}For support, contact the development team.${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"
