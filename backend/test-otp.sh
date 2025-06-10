#!/bin/bash
# Test script for OTP service

echo "======================================="
echo "OTP Service Test"
echo "======================================="
echo "This script will test the OTP service without requiring a working database"

# Set NODE_ENV to test to prevent actual SMS/emails
export NODE_ENV=test

# Run the test script
echo "Running OTP service test..."
cd "$(dirname "$0")"  # Ensure we're in the backend directory
node --experimental-modules src/tests/manual/test-otp-service.js

echo ""
echo "Test complete."
echo "If the test succeeded, your OTP system is working correctly."
echo "The OTP system will work even when MongoDB has connection issues."
echo "======================================="
