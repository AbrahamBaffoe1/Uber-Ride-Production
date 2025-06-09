/**
 * Ride Service
 * Provides utility functions for ride calculations
 */

/**
 * Calculate distance and duration between coordinates
 * @param {number} startLat Starting latitude
 * @param {number} startLng Starting longitude
 * @param {number} endLat Ending latitude
 * @param {number} endLng Ending longitude
 * @returns {Promise<{distance: number, duration: number}>} Distance in km and duration in minutes
 */
const calculateDistance = async (startLat, startLng, endLat, endLng) => {
  try {
    // In a real implementation, use a map service like Google Maps or Mapbox
    // For this implementation, we'll calculate a simplified distance
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = toRadians(endLat - startLat);
    const dLon = toRadians(endLng - startLng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRadians(startLat)) * Math.cos(toRadians(endLat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    // Estimate duration: assume average speed of 30 km/h
    const duration = (distance / 30) * 60; // Duration in minutes
    
    return {
      distance: distance,
      duration: duration
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    
    // Return default values in case of error
    return {
      distance: 5,
      duration: 15
    };
  }
};

/**
 * Helper function to convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate fare based on distance, duration, and pricing
 * @param {number} distance Distance in km
 * @param {number} duration Duration in minutes
 * @param {Object} pricing Pricing configuration
 * @returns {Object} Fare breakdown
 */
const calculateFare = (distance, duration, pricing) => {
  const { basePrice, pricePerKm, pricePerMinute } = pricing;
  
  // Calculate components
  const baseFare = basePrice;
  const distanceFare = distance * pricePerKm;
  const timeFare = duration * pricePerMinute;
  
  // Apply any additional fees or discounts
  const serviceFee = 50;
  
  // Calculate total fare
  const subtotal = baseFare + distanceFare + timeFare;
  const totalFare = subtotal + serviceFee;
  
  return {
    baseFare,
    distanceFare,
    timeFare,
    serviceFee,
    subtotal,
    totalFare: Math.ceil(totalFare) // Round up to nearest whole number
  };
};

/**
 * Find nearby available riders
 * @param {number} latitude Passenger latitude
 * @param {number} longitude Passenger longitude
 * @param {number} maxDistance Maximum distance in meters
 * @param {Object} RiderLocation Mongoose model for rider locations
 * @returns {Promise<Array>} Array of nearby available riders
 */
const findNearbyRiders = async (latitude, longitude, maxDistance = 5000, RiderLocation) => {
  try {
    const nearbyRiders = await RiderLocation.find({
      status: 'online',
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistance
        }
      }
    }).populate('riderId', 'firstName lastName phoneNumber riderProfile.vehicleType riderProfile.vehicleModel riderProfile.averageRating').limit(10);
    
    return nearbyRiders;
  } catch (error) {
    console.error('Error finding nearby riders:', error);
    return [];
  }
};

/**
 * Calculate ETA for rider to reach passenger
 * @param {number} riderLat Rider latitude
 * @param {number} riderLng Rider longitude
 * @param {number} passengerLat Passenger latitude
 * @param {number} passengerLng Passenger longitude
 * @returns {Promise<number>} ETA in minutes
 */
const calculateETA = async (riderLat, riderLng, passengerLat, passengerLng) => {
  try {
    // Get distance between rider and passenger
    const { distance } = await calculateDistance(riderLat, riderLng, passengerLat, passengerLng);
    
    // Calculate ETA using average speed of 20 km/h for urban traffic
    const eta = (distance / 20) * 60;
    
    return Math.ceil(eta); // Round up to nearest minute
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return 5; // Default 5 minutes
  }
};

export {
  calculateDistance,
  calculateFare,
  findNearbyRiders,
  calculateETA
};
