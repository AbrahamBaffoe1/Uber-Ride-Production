/**
 * Ride Service
 * This service handles ride-specific business logic
 */

const axios = require('axios');

/**
 * Calculate estimated fare, distance, and duration between two locations
 * In a real app, this would call a mapping/routing API like Google Maps or Mapbox
 * 
 * @param {Object} pickupLocation - Pickup location coordinates
 * @param {Object} dropoffLocation - Dropoff location coordinates
 * @returns {Object} fare, distance, and duration estimates
 */
const calculateFare = async (pickupLocation, dropoffLocation) => {
  try {
    // In a real implementation, we would call a mapping API
    // For demo purposes, we'll simulate the calculation
    
    // Calculate distance using Haversine formula (approximation)
    const distanceInKm = calculateHaversineDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      dropoffLocation.latitude,
      dropoffLocation.longitude
    );
    
    // Estimate duration (approx 2 minutes per km)
    const durationInMinutes = Math.ceil(distanceInKm * 2);
    
    // Calculate fare (base fare + per km rate)
    const baseFare = 1000; // in local currency (e.g. Naira)
    const perKmRate = 150; // in local currency
    const estimatedFare = baseFare + (perKmRate * distanceInKm);
    
    return {
      fare: estimatedFare.toFixed(2),
      distance: `${distanceInKm.toFixed(1)} km`,
      duration: `${durationInMinutes} min`,
    };
  } catch (error) {
    console.error('Error calculating fare:', error);
    // Return default values in case of error
    return {
      fare: '0.00',
      distance: '0.0 km',
      duration: '0 min',
    };
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param {Number} lat1 - Latitude of first point
 * @param {Number} lon1 - Longitude of first point
 * @param {Number} lat2 - Latitude of second point
 * @param {Number} lon2 - Longitude of second point
 * @returns {Number} distance in kilometers
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {Number} deg - Degrees
 * @returns {Number} Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Get nearby available riders for a ride request
 * In a real app, this would query a database for nearby riders
 * 
 * @param {Object} location - Pickup location
 * @param {Number} radius - Search radius in km
 * @returns {Array} List of available riders
 */
const getNearbyRiders = async (location, radius = 5) => {
  // In a real implementation, this would query a database for nearby riders
  // For demo purposes, we'll return a mock response
  
  return [
    {
      id: '98765-abcde-12345',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+2347012345678',
      profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
      rating: 4.8,
      currentLocation: {
        latitude: location.latitude + (Math.random() * 0.01 - 0.005),
        longitude: location.longitude + (Math.random() * 0.01 - 0.005),
      },
      vehicleInfo: 'Honda CBR 150 (Black)',
      distanceToPickup: '1.2 km',
      estimatedArrival: '3 min',
    },
    {
      id: '54321-fghij-67890',
      firstName: 'Jane',
      lastName: 'Smith',
      phoneNumber: '+2347098765432',
      profilePicture: 'https://randomuser.me/api/portraits/women/2.jpg',
      rating: 4.5,
      currentLocation: {
        latitude: location.latitude + (Math.random() * 0.02 - 0.01),
        longitude: location.longitude + (Math.random() * 0.02 - 0.01),
      },
      vehicleInfo: 'Yamaha YBR 125 (Red)',
      distanceToPickup: '2.5 km',
      estimatedArrival: '5 min',
    },
  ];
};

module.exports = {
  calculateFare,
  getNearbyRiders,
};
