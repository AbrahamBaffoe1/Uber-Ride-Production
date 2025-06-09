/**
 * Advanced Pricing Engine Service
 * Handles dynamic fare calculations based on multiple factors
 */
import mongoose from 'mongoose';
import mapsService from './maps.service.js';

// Try to load models dynamically to avoid circular dependencies
let RiderLocation, Ride, User;

// Function to import models
const importModels = async () => {
  try {
    const RiderLocationModule = await import('../mongodb/models/RiderLocation.js');
    const RideModule = await import('../mongodb/models/Ride.js');
    const UserModule = await import('../mongodb/models/User.js');
    
    RiderLocation = RiderLocationModule.default;
    Ride = RideModule.default;
    User = UserModule.default;
  } catch (error) {
    console.error('Error importing models in pricing engine:', error);
  }
};

// Base pricing configurations
const DEFAULT_PRICING = {
  // Base pricing (NGN)
  base: {
    motorcycle: 300,
    car: 500,
    tricycle: 350
  },
  // Per kilometer rate (NGN)
  perKm: {
    motorcycle: 80,
    car: 120,
    tricycle: 100
  },
  // Per minute rate (NGN)
  perMinute: {
    motorcycle: 5,
    car: 8,
    tricycle: 6
  },
  // Minimum fare (NGN)
  minimum: {
    motorcycle: 500,
    car: 800,
    tricycle: 600
  },
  // Service fee (NGN)
  serviceFee: {
    motorcycle: 50,
    car: 80,
    tricycle: 60
  },
  // Booking fee (NGN)
  bookingFee: 30,
  // Cancellation fee (after 2 minutes)
  cancellationFee: 200
};

// Time-based surge multipliers
const TIME_MULTIPLIERS = {
  // Morning rush (6-9 AM)
  morningRush: {
    startHour: 6,
    endHour: 9,
    multiplier: 1.3
  },
  // Evening rush (4-7 PM)
  eveningRush: {
    startHour: 16,
    endHour: 19,
    multiplier: 1.4
  },
  // Late night (11 PM - 5 AM)
  lateNight: {
    startHour: 23,
    endHour: 5,
    multiplier: 1.2
  },
  // Weekend nights (Fri-Sat nights)
  weekendNight: {
    days: [5, 6], // Friday and Saturday
    startHour: 20,
    endHour: 3,
    multiplier: 1.25
  }
};

// Weather condition multipliers
const WEATHER_MULTIPLIERS = {
  rain: 1.2,
  heavyRain: 1.4,
  storm: 1.5,
  default: 1.0
};

// Demand-based surge pricing thresholds
const DEMAND_THRESHOLDS = [
  { riderRatio: 0.8, multiplier: 1.0 },  // >80% rider availability (normal pricing)
  { riderRatio: 0.6, multiplier: 1.1 },  // 60-80% rider availability (slight surge)
  { riderRatio: 0.4, multiplier: 1.2 },  // 40-60% rider availability (moderate surge)
  { riderRatio: 0.2, multiplier: 1.3 },  // 20-40% rider availability (high surge)
  { riderRatio: 0.1, multiplier: 1.5 },  // <10% rider availability (extreme surge)
  { riderRatio: 0.05, multiplier: 1.8 }  // <5% rider availability (critical surge)
];

// Special event multipliers (can be updated via admin API)
let SPECIAL_EVENTS = [
  // Format: { name, startDate, endDate, affectedAreas, multiplier }
];

// Distance type weights for fare calculation
const DISTANCE_TYPE_WEIGHTS = {
  straightLine: 1.0,    // Basic Haversine calculation
  roadDistance: 1.2,    // Actual road distance from maps API
  trafficAware: 1.3     // Traffic-aware road distance
};

/**
 * Calculate the fare for a ride
 * @param {Object} params Ride parameters
 * @param {Object} params.origin Origin coordinates { lat, lng }
 * @param {Object} params.destination Destination coordinates { lat, lng }
 * @param {string} params.vehicleType Vehicle type (motorcycle, car, tricycle)
 * @param {Date} params.dateTime Optional ride date/time for estimation (defaults to now)
 * @param {string} params.distanceType Distance calculation type (straightLine, roadDistance, trafficAware)
 * @param {Object} params.customPricing Optional custom pricing override
 * @returns {Promise<Object>} Fare details
 */
const calculateFare = async (params) => {
  try {
    await importModels();
    
    const {
      origin,
      destination,
      vehicleType = 'motorcycle',
      dateTime = new Date(),
      distanceType = 'roadDistance',
      customPricing = null
    } = params;
    
    // Validate inputs
    if (!origin || !origin.lat || !origin.lng) {
      throw new Error('Valid origin coordinates are required');
    }
    
    if (!destination || !destination.lat || !destination.lng) {
      throw new Error('Valid destination coordinates are required');
    }
    
    // Use custom pricing if provided, otherwise use default
    const pricing = customPricing || DEFAULT_PRICING;
    
    // Step 1: Calculate distance and duration
    let distanceDetails;
    if (distanceType === 'straightLine') {
      // Use Haversine formula for quick estimates
      const { calculateDistance } = await import('./rides.service.js');
      const result = await calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
      distanceDetails = {
        distance: { value: result.distance * 1000, text: `${result.distance.toFixed(1)} km` },
        duration: { value: result.duration * 60, text: `${Math.ceil(result.duration)} mins` },
        straightLine: true
      };
    } else {
      // Use Maps API for road distance and traffic considerations
      const originCoords = { lat: origin.lat, lng: origin.lng };
      const destinationCoords = { lat: destination.lat, lng: destination.lng };
      
      // Use traffic-aware routing if specified
      const mode = 'driving';
      const result = await mapsService.calculateDistance(originCoords, destinationCoords, mode);
      
      if (!result.success) {
        // Fallback to Haversine if API fails
        const { calculateDistance } = await import('./rides.service.js');
        const haversineResult = await calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
        distanceDetails = {
          distance: { value: haversineResult.distance * 1000, text: `${haversineResult.distance.toFixed(1)} km` },
          duration: { value: haversineResult.duration * 60, text: `${Math.ceil(haversineResult.duration)} mins` },
          straightLine: true,
          fallback: true
        };
      } else {
        distanceDetails = {
          distance: result.data.distance,
          duration: result.data.duration,
          straightLine: false
        };
      }
    }
    
    // Step 2: Apply distance weight based on calculation type
    const distanceWeight = DISTANCE_TYPE_WEIGHTS[distanceType] || 1.0;
    const weightedDistance = distanceDetails.distance.value * distanceWeight / 1000; // Convert to km
    const durationMinutes = distanceDetails.duration.value / 60; // Convert to minutes
    
    // Step 3: Calculate base fare components
    const baseFare = pricing.base[vehicleType] || pricing.base.motorcycle;
    const distanceFare = weightedDistance * (pricing.perKm[vehicleType] || pricing.perKm.motorcycle);
    const timeFare = durationMinutes * (pricing.perMinute[vehicleType] || pricing.perMinute.motorcycle);
    const serviceFee = pricing.serviceFee[vehicleType] || pricing.serviceFee.motorcycle;
    const bookingFee = pricing.bookingFee;
    
    // Step 4: Calculate time-based multiplier
    const timeMultiplier = getTimeMultiplier(dateTime);
    
    // Step 5: Calculate demand-based multiplier
    const demandMultiplier = await getDemandMultiplier(origin);
    
    // Step 6: Calculate weather multiplier (simulated for now)
    const weatherMultiplier = getWeatherMultiplier('default');
    
    // Step 7: Calculate special event multiplier
    const eventMultiplier = getSpecialEventMultiplier(origin, dateTime);
    
    // Step 8: Calculate combined multiplier (cap at 3.0 to prevent excessive pricing)
    const combinedMultiplier = Math.min(
      timeMultiplier * demandMultiplier * weatherMultiplier * eventMultiplier,
      3.0
    );
    
    // Step 9: Apply multiplier to distance and time components only (not base fees)
    const subtotal = baseFare + (distanceFare + timeFare) * combinedMultiplier;
    
    // Step 10: Apply minimum fare if needed
    const minimumFare = pricing.minimum[vehicleType] || pricing.minimum.motorcycle;
    const fareBeforeFees = Math.max(subtotal, minimumFare);
    
    // Step 11: Add fees
    const totalFare = fareBeforeFees + serviceFee + bookingFee;
    
    // Step 12: Round to nearest whole number (NGN)
    const roundedFare = Math.ceil(totalFare);
    
    return {
      success: true,
      fare: {
        baseFare,
        distanceFare: distanceFare * combinedMultiplier,
        timeFare: timeFare * combinedMultiplier,
        subtotal: fareBeforeFees,
        serviceFee,
        bookingFee,
        totalFare: roundedFare,
        currency: 'NGN',
        multipliers: {
          time: timeMultiplier,
          demand: demandMultiplier,
          weather: weatherMultiplier,
          event: eventMultiplier,
          combined: combinedMultiplier
        }
      },
      distance: {
        value: distanceDetails.distance.value,
        text: distanceDetails.distance.text,
        weightedValue: weightedDistance,
        unit: 'km',
        straightLine: distanceDetails.straightLine
      },
      duration: {
        value: distanceDetails.duration.value,
        text: distanceDetails.duration.text,
        unit: 'seconds'
      },
      vehicleType,
      estimatedPickupTime: new Date(Date.now() + 5 * 60000) // Default 5min ETA
    };
  } catch (error) {
    console.error('Error calculating fare:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to calculate fare',
      error: error.toString()
    };
  }
};

/**
 * Get time-based price multiplier based on hour of day and day of week
 * @param {Date} dateTime Date and time
 * @returns {number} Price multiplier
 */
const getTimeMultiplier = (dateTime) => {
  const hour = dateTime.getHours();
  const day = dateTime.getDay(); // 0 (Sunday) to 6 (Saturday)
  
  // Check weekend night surcharge
  if (TIME_MULTIPLIERS.weekendNight.days.includes(day)) {
    const { startHour, endHour, multiplier } = TIME_MULTIPLIERS.weekendNight;
    if (hour >= startHour || hour < endHour) {
      return multiplier;
    }
  }
  
  // Check morning rush hour
  if (hour >= TIME_MULTIPLIERS.morningRush.startHour && hour < TIME_MULTIPLIERS.morningRush.endHour) {
    return TIME_MULTIPLIERS.morningRush.multiplier;
  }
  
  // Check evening rush hour
  if (hour >= TIME_MULTIPLIERS.eveningRush.startHour && hour < TIME_MULTIPLIERS.eveningRush.endHour) {
    return TIME_MULTIPLIERS.eveningRush.multiplier;
  }
  
  // Check late night
  if (hour >= TIME_MULTIPLIERS.lateNight.startHour || hour < TIME_MULTIPLIERS.lateNight.endHour) {
    return TIME_MULTIPLIERS.lateNight.multiplier;
  }
  
  return 1.0; // Default multiplier
};

/**
 * Get demand-based price multiplier based on rider availability
 * @param {Object} location Location coordinates
 * @returns {Promise<number>} Price multiplier
 */
const getDemandMultiplier = async (location) => {
  try {
    if (!RiderLocation) {
      await importModels();
    }
    
    // Default to moderate surge if models couldn't be loaded
    if (!RiderLocation) {
      return 1.2;
    }
    
    // Count total passengers in the area
    const passengerCount = await User.countDocuments({
      role: 'passenger',
      'lastKnownLocation.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          $maxDistance: 3000 // 3km radius
        }
      }
    });
    
    // Count available riders in the area
    const availableRiders = await RiderLocation.countDocuments({
      status: 'online',
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          },
          $maxDistance: 3000 // 3km radius
        }
      }
    });
    
    // If no passengers or no riders, use default moderate surge
    if (passengerCount === 0 || availableRiders === 0) {
      return 1.2;
    }
    
    // Calculate rider availability ratio
    const riderRatio = availableRiders / Math.max(1, passengerCount);
    
    // Find applicable multiplier based on thresholds
    for (const threshold of DEMAND_THRESHOLDS) {
      if (riderRatio <= threshold.riderRatio) {
        return threshold.multiplier;
      }
    }
    
    return 1.0; // Default: no surge
  } catch (error) {
    console.error('Error calculating demand multiplier:', error);
    return 1.2; // Default to moderate surge on error
  }
};

/**
 * Get weather-based price multiplier
 * @param {string} weatherCondition Weather condition
 * @returns {number} Price multiplier
 */
const getWeatherMultiplier = (weatherCondition) => {
  return WEATHER_MULTIPLIERS[weatherCondition] || WEATHER_MULTIPLIERS.default;
};

/**
 * Get special event price multiplier based on location and time
 * @param {Object} location Location coordinates
 * @param {Date} dateTime Date and time
 * @returns {number} Price multiplier
 */
const getSpecialEventMultiplier = (location, dateTime) => {
  // For now, return default multiplier as event detection is a future enhancement
  return 1.0;
};

/**
 * Calculate ETA for rider to reach passenger
 * @param {Object} riderLocation Rider's location coordinates
 * @param {Object} passengerLocation Passenger's location coordinates
 * @returns {Promise<number>} ETA in minutes
 */
const calculateETA = async (riderLocation, passengerLocation) => {
  try {
    // Use Maps API for accurate ETA with traffic
    const result = await mapsService.calculateDistance(
      riderLocation,
      passengerLocation,
      'driving'
    );
    
    if (result.success) {
      return Math.ceil(result.data.duration.value / 60); // Convert seconds to minutes
    }
    
    // Fallback to basic estimate
    const { calculateDistance } = await import('./rides.service.js');
    const { duration } = await calculateDistance(
      riderLocation.lat,
      riderLocation.lng,
      passengerLocation.lat,
      passengerLocation.lng
    );
    
    return Math.ceil(duration);
  } catch (error) {
    console.error('Error calculating ETA:', error);
    return 5; // Default 5 minutes
  }
};

/**
 * Update special events for dynamic pricing
 * @param {Array} events Array of special event objects
 * @returns {Object} Update result
 */
const updateSpecialEvents = (events) => {
  try {
    SPECIAL_EVENTS = events;
    return {
      success: true,
      message: `Updated ${events.length} special events`,
      events: SPECIAL_EVENTS
    };
  } catch (error) {
    console.error('Error updating special events:', error);
    return {
      success: false,
      message: 'Failed to update special events',
      error: error.toString()
    };
  }
};

/**
 * Get current pricing configuration
 * @returns {Object} Current pricing configuration
 */
const getPricingConfig = () => {
  return {
    success: true,
    pricing: {
      defaultPricing: DEFAULT_PRICING,
      timeMultipliers: TIME_MULTIPLIERS,
      weatherMultipliers: WEATHER_MULTIPLIERS,
      demandThresholds: DEMAND_THRESHOLDS,
      specialEvents: SPECIAL_EVENTS,
      distanceTypeWeights: DISTANCE_TYPE_WEIGHTS
    }
  };
};

/**
 * Update pricing configuration (for admin use)
 * @param {Object} config New pricing configuration
 * @returns {Object} Update result
 */
const updatePricingConfig = (config) => {
  try {
    if (config.defaultPricing) {
      Object.assign(DEFAULT_PRICING, config.defaultPricing);
    }
    
    if (config.timeMultipliers) {
      Object.assign(TIME_MULTIPLIERS, config.timeMultipliers);
    }
    
    if (config.weatherMultipliers) {
      Object.assign(WEATHER_MULTIPLIERS, config.weatherMultipliers);
    }
    
    if (config.demandThresholds) {
      DEMAND_THRESHOLDS = config.demandThresholds;
    }
    
    if (config.distanceTypeWeights) {
      Object.assign(DISTANCE_TYPE_WEIGHTS, config.distanceTypeWeights);
    }
    
    return {
      success: true,
      message: 'Pricing configuration updated successfully',
      pricing: getPricingConfig().pricing
    };
  } catch (error) {
    console.error('Error updating pricing configuration:', error);
    return {
      success: false,
      message: 'Failed to update pricing configuration',
      error: error.toString()
    };
  }
};

export {
  calculateFare,
  calculateETA,
  updateSpecialEvents,
  getPricingConfig,
  updatePricingConfig
};
