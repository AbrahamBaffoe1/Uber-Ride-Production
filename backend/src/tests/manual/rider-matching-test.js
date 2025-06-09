/**
 * Manual Test Script for Rider Matching and Pricing Features
 * Run this with: node src/tests/manual/rider-matching-test.js
 */
const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// API client configuration
const API_URL = 'http://localhost:3000/api/v1';
let authToken = null;

// Sample locations in Lagos, Nigeria
const LOCATIONS = {
  ikejaGRA: { latitude: 6.5766, longitude: 3.3606 },
  lekkiPhase1: { latitude: 6.4559, longitude: 3.4738 },
  victoryIsland: { latitude: 6.4281, longitude: 3.4084 },
  surulere: { latitude: 6.5059, longitude: 3.3509 },
  yaba: { latitude: 6.5147, longitude: 3.3841 },
};

// Test pricing calculation
async function testPricing() {
  console.log('\n===== TESTING PRICING ENGINE =====');
  
  try {
    const origin = LOCATIONS.ikejaGRA;
    const destination = LOCATIONS.lekkiPhase1;
    
    console.log(`Calculating fare from Ikeja GRA to Lekki Phase 1...`);
    
    const response = await axios.post(`${API_URL}/ride-pricing/estimate`, {
      origin,
      destination,
      vehicleType: 'motorcycle',
      distanceType: 'roadDistance'
    }, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    
    console.log('\nPricing Results:');
    console.log(`Status: ${response.data.success ? 'Success' : 'Failed'}`);
    
    if (response.data.success) {
      console.log(`Base Fare: ${response.data.fare.baseFare} ${response.data.fare.currency}`);
      console.log(`Distance Fare: ${response.data.fare.distanceFare} ${response.data.fare.currency}`);
      console.log(`Time Fare: ${response.data.fare.timeFare} ${response.data.fare.currency}`);
      console.log(`Service Fee: ${response.data.fare.serviceFee || 0} ${response.data.fare.currency}`);
      console.log(`Booking Fee: ${response.data.fare.bookingFee || 0} ${response.data.fare.currency}`);
      console.log(`Total Fare: ${response.data.fare.totalFare} ${response.data.fare.currency}`);
      console.log(`Distance: ${response.data.distance.text}`);
      console.log(`Duration: ${response.data.duration.text}`);
      
      if (response.data.riderAvailability) {
        console.log(`\nRider Availability at Origin:`);
        console.log(`Total Riders: ${response.data.riderAvailability.totalRiders}`);
        console.log(`Available Riders: ${response.data.riderAvailability.availableRiders}`);
        console.log(`Has Riders Available: ${response.data.riderAvailability.hasRidersAvailable}`);
        
        if (response.data.riderAvailability.averageETA) {
          console.log(`Average ETA: ${response.data.riderAvailability.averageETA} minutes`);
        }
      }
    } else {
      console.log(`Error: ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error testing pricing:', error.response?.data || error.message);
  }
}

// Test rider availability at different locations
async function testRiderAvailability() {
  console.log('\n===== TESTING RIDER AVAILABILITY =====');
  
  for (const [locationName, coordinates] of Object.entries(LOCATIONS)) {
    try {
      console.log(`\nChecking rider availability at ${locationName}...`);
      
      const response = await axios.get(`${API_URL}/ride-pricing/availability`, {
        params: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      
      if (response.data.success) {
        console.log(`Status: Success`);
        console.log(`Total Riders: ${response.data.availability.totalRiders}`);
        console.log(`Available Riders: ${response.data.availability.availableRiders}`);
        console.log(`Has Riders Available: ${response.data.availability.hasRidersAvailable}`);
        
        if (response.data.availability.nearestRiderDistance) {
          console.log(`Nearest Rider Distance: ${response.data.availability.nearestRiderDistance} meters`);
        }
        
        if (response.data.availability.nearestRiderETA) {
          console.log(`Nearest Rider ETA: ${response.data.availability.nearestRiderETA} minutes`);
        }
      } else {
        console.log(`Status: Failed - ${response.data.message}`);
      }
    } catch (error) {
      console.error(`Error checking availability at ${locationName}:`, error.response?.data || error.message);
    }
  }
}

// Test finding nearby riders
async function testFindNearbyRiders() {
  console.log('\n===== TESTING NEARBY RIDERS =====');
  
  try {
    const location = LOCATIONS.ikejaGRA;
    
    console.log(`Finding nearby riders at Ikeja GRA...`);
    
    const response = await axios.get(`${API_URL}/ride-pricing/nearby-riders`, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        maxDistance: 5000 // 5km
      },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    
    if (response.data.success) {
      console.log(`Status: Success`);
      console.log(`Found ${response.data.riders.length} nearby riders`);
      
      if (response.data.riders.length > 0) {
        console.log('\nTop 3 Riders:');
        const topRiders = response.data.riders.slice(0, 3);
        
        topRiders.forEach((rider, index) => {
          console.log(`\nRider ${index + 1}:`);
          console.log(`Name: ${rider.name}`);
          console.log(`Vehicle: ${rider.vehicle.type} - ${rider.vehicle.model} (${rider.vehicle.plate})`);
          console.log(`Rating: ${rider.rating}`);
          console.log(`Distance: ${rider.distance} meters`);
          console.log(`ETA: ${rider.eta} minutes`);
        });
      }
      
      if (response.data.availability) {
        console.log(`\nAvailability Summary:`);
        console.log(`Total Riders: ${response.data.availability.totalRiders}`);
        console.log(`Available Riders: ${response.data.availability.availableRiders}`);
        console.log(`Has Riders Available: ${response.data.availability.hasRidersAvailable}`);
      }
    } else {
      console.log(`Status: Failed - ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error finding nearby riders:', error.response?.data || error.message);
  }
}

// Test getting rider density map
async function testRiderDensityMap() {
  console.log('\n===== TESTING RIDER DENSITY MAP =====');
  
  try {
    const center = LOCATIONS.ikejaGRA;
    
    console.log(`Getting rider density map around Ikeja GRA (5km radius)...`);
    
    const response = await axios.get(`${API_URL}/ride-pricing/density-map`, {
      params: {
        latitude: center.latitude,
        longitude: center.longitude,
        radius: 5 // 5km
      },
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    
    if (response.data.success) {
      console.log(`Status: Success`);
      console.log(`Found ${response.data.densityMap.length} density points`);
      
      if (response.data.densityMap.length > 0) {
        console.log('\nDensity Points:');
        response.data.densityMap.forEach((point, index) => {
          console.log(`\nPoint ${index + 1}:`);
          console.log(`Location: ${point.location.lat}, ${point.location.lng}`);
          console.log(`Distance: ${point.distance} km`);
          console.log(`Total Riders: ${point.stats.totalRiders}`);
          console.log(`Available Riders: ${point.stats.availableRiders}`);
          console.log(`Has Riders Available: ${point.stats.hasRidersAvailable}`);
        });
      }
    } else {
      console.log(`Status: Failed - ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error getting rider density map:', error.response?.data || error.message);
  }
}

// Calculate ETA between two points
async function testCalculateETA() {
  console.log('\n===== TESTING ETA CALCULATION =====');
  
  try {
    const origin = LOCATIONS.ikejaGRA;
    const destination = LOCATIONS.lekkiPhase1;
    
    console.log(`Calculating ETA from Ikeja GRA to Lekki Phase 1...`);
    
    const response = await axios.post(`${API_URL}/ride-pricing/calculate-eta`, {
      origin,
      destination
    }, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });
    
    if (response.data.success) {
      console.log(`Status: Success`);
      console.log(`ETA: ${response.data.eta} minutes`);
    } else {
      console.log(`Status: Failed - ${response.data.message}`);
    }
  } catch (error) {
    console.error('Error calculating ETA:', error.response?.data || error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    // Prompt for authentication token
    rl.question('Do you have an authentication token? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question('Enter your authentication token: ', async (token) => {
          authToken = token;
          await runTests();
          rl.close();
        });
      } else {
        console.log('Running tests without authentication...');
        await runTests();
        rl.close();
      }
    });
  } catch (error) {
    console.error('Error running tests:', error);
    rl.close();
  }
}

async function runTests() {
  await testPricing();
  await testRiderAvailability();
  await testFindNearbyRiders();
  await testRiderDensityMap();
  await testCalculateETA();
  
  console.log('\n===== ALL TESTS COMPLETED =====');
  console.log('Note: Some tests may fail if no riders are available in the database.');
  console.log('Make sure to populate the database with some rider data for complete testing.');
}

// Start the test suite
runAllTests();
