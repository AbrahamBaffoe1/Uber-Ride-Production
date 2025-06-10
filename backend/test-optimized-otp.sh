#!/bin/bash
# Test script for the optimized OTP service

echo "======================================="
echo "Optimized OTP Service Test"
echo "======================================="
echo "This script will test the performance of the improved OTP system"

# Set NODE_ENV to development to see OTP codes in logs
export NODE_ENV=development

# Run the test script
echo "Running optimized OTP service test..."
cd "$(dirname "$0")"  # Ensure we're in the backend directory
node --experimental-modules src/tests/manual/test-optimized-otp.js

echo ""
echo "Test complete."
echo "If the test succeeded, your optimized OTP system is working correctly."
echo "The system should respond quickly with proper timeout handling."
echo "======================================="
