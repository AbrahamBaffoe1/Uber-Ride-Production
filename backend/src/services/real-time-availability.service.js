/**
 * Real-time Rider Availability Service
 * Handles broadcasting rider availability updates to passengers
 */
import mongoose from 'mongoose';
import { getSocketIo, emitToUser, broadcastMessage } from './socket.service.js';
import { checkRidersAvailable, getRiderDensityMap } from './rider-matching.service.js';

// Try to load models dynamically to avoid circular dependencies
let RiderLocation, User;

// Function to import models
const importModels = async () => {
  try {
    const RiderLocationModule = await import('../mongodb/models/RiderLocation.js');
    const UserModule = await import('../mongodb/models/User.js');
    
    RiderLocation = RiderLocationModule.default;
    User = UserModule.default;
  } catch (error) {
    console.error('Error importing models in real-time availability service:', error);
  }
};

// Configuration
const CONFIG = {
  // How often to broadcast updates (in milliseconds)
  broadcastInterval: 60000, // 1 minute
  
  // How often to check for rider updates (in milliseconds)
  checkInterval: 10000, // 10 seconds
  
  // Maximum distance to consider for density updates (in km)
  maxDistanceKm: 5,
  
  // Threshold for significant change in rider count (percentage)
  significantChangeThreshold: 0.2, // 20%
  
  // Minimum number of active passengers to enable broadcast
  minimumActivePassengers: 1
};

// Cache of recent passenger locations and their last broadcast time
const passengerLocationCache = new Map();

// Cache of rider density data by grid cell
const riderDensityCache = new Map();

// Timer for periodic broadcasts
let broadcastTimer = null;

// Timer for availability checks
let checkTimer = null;

/**
 * Initialize the real-time availability service
 */
const initialize = async () => {
  await importModels();
  
  // Start periodic broadcasts
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
  }
  
  broadcastTimer = setInterval(broadcastAvailabilityUpdates, CONFIG.broadcastInterval);
  
  // Start periodic availability checks
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  
  checkTimer = setInterval(checkRiderAvailabilityChanges, CONFIG.checkInterval);
  
  console.log('Real-time rider availability service initialized');
};

/**
 * Track a passenger's location for availability updates
 * @param {string} userId User ID
 * @param {Object} location Location coordinates { lat, lng }
 */
const trackPassengerLocation = async (userId, location) => {
  try {
    if (!location || !location.lat || !location.lng) {
      return;
    }
    
    // Create a grid cell key (rounded to 2 decimal places, ~1km precision)
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;
    const gridKey = `${lat},${lng}`;
    
    // Update passenger location cache
    passengerLocationCache.set(userId, {
      location: { lat, lng },
      gridKey,
      timestamp: Date.now(),
      lastBroadcast: 0
    });
    
    // Get current rider availability for this location
    const availability = await checkRidersAvailable(location);
    
    if (availability.success) {
      // Update rider density cache for this grid cell
      riderDensityCache.set(gridKey, {
        stats: availability.availability,
        timestamp: Date.now(),
        lastBroadcast: 0
      });
      
      // Send immediate update to this passenger
      emitToUser(userId, 'riders:availability_update', {
        timestamp: new Date(),
        ...availability.availability
      });
    }
  } catch (error) {
    console.error('Error tracking passenger location:', error);
  }
};

/**
 * Broadcast rider availability updates to passengers
 */
const broadcastAvailabilityUpdates = async () => {
  try {
    // Get active passenger count
    const activePassengerCount = passengerLocationCache.size;
    
    // Skip if not enough active passengers
    if (activePassengerCount < CONFIG.minimumActivePassengers) {
      return;
    }
    
    // Group passengers by grid cell
    const gridCells = new Map();
    
    for (const [userId, data] of passengerLocationCache.entries()) {
      const { gridKey } = data;
      
      if (!gridCells.has(gridKey)) {
        gridCells.set(gridKey, []);
      }
      
      gridCells.get(gridKey).push(userId);
    }
    
    // Update and broadcast for each grid cell
    for (const [gridKey, userIds] of gridCells.entries()) {
      // Skip if no users in this cell
      if (userIds.length === 0) {
        continue;
      }
      
      // Get a representative location from the first user
      const userData = passengerLocationCache.get(userIds[0]);
      const location = userData.location;
      
      // Get current rider availability for this location
      const availability = await checkRidersAvailable(location);
      
      if (availability.success) {
        // Update rider density cache for this grid cell
        riderDensityCache.set(gridKey, {
          stats: availability.availability,
          timestamp: Date.now(),
          lastBroadcast: Date.now()
        });
        
        // Broadcast to all passengers in this grid cell
        for (const userId of userIds) {
          emitToUser(userId, 'riders:availability_update', {
            timestamp: new Date(),
            ...availability.availability
          });
          
          // Update last broadcast time
          const userData = passengerLocationCache.get(userId);
          if (userData) {
            userData.lastBroadcast = Date.now();
            passengerLocationCache.set(userId, userData);
          }
        }
      }
    }
    
    // Clean up old entries from passenger location cache
    const cutoff = Date.now() - (15 * 60 * 1000); // 15 minutes
    for (const [userId, data] of passengerLocationCache.entries()) {
      if (data.timestamp < cutoff) {
        passengerLocationCache.delete(userId);
      }
    }
  } catch (error) {
    console.error('Error broadcasting availability updates:', error);
  }
};

/**
 * Check for significant changes in rider availability
 */
const checkRiderAvailabilityChanges = async () => {
  try {
    // Skip if no passengers to notify
    if (passengerLocationCache.size === 0) {
      return;
    }
    
    // Check each grid cell with cached rider density
    for (const [gridKey, densityData] of riderDensityCache.entries()) {
      // Parse lat, lng from grid key
      const [lat, lng] = gridKey.split(',').map(Number);
      const location = { lat, lng };
      
      // Get current rider availability
      const availability = await checkRidersAvailable(location);
      
      if (availability.success) {
        const prevCount = densityData.stats.availableRiders || 0;
        const currentCount = availability.availability.availableRiders || 0;
        
        // Calculate percentage change
        let percentChange = 0;
        if (prevCount > 0) {
          percentChange = Math.abs(currentCount - prevCount) / prevCount;
        } else if (currentCount > 0) {
          percentChange = 1; // 100% change if previously 0
        }
        
        // Check if significant change occurred
        const significantChange = percentChange >= CONFIG.significantChangeThreshold;
        
        // If significant change, update all passengers in this grid cell
        if (significantChange) {
          // Update rider density cache
          riderDensityCache.set(gridKey, {
            stats: availability.availability,
            timestamp: Date.now(),
            lastBroadcast: Date.now()
          });
          
          // Find passengers in this grid cell
          for (const [userId, userData] of passengerLocationCache.entries()) {
            if (userData.gridKey === gridKey) {
              // Broadcast update
              emitToUser(userId, 'riders:availability_update', {
                timestamp: new Date(),
                ...availability.availability
              });
              
              // Update last broadcast time
              userData.lastBroadcast = Date.now();
              passengerLocationCache.set(userId, userData);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking rider availability changes:', error);
  }
};

/**
 * Generate a density map for the area around a passenger
 * @param {string} userId User ID
 * @returns {Promise<Object>} Density map result
 */
const generateDensityMap = async (userId) => {
  try {
    // Get passenger location
    const userData = passengerLocationCache.get(userId);
    if (!userData) {
      throw new Error('User location not found');
    }
    
    // Get density map
    const result = await getRiderDensityMap({
      center: userData.location,
      radius: CONFIG.maxDistanceKm
    });
    
    if (result.success) {
      // Emit density map to passenger
      emitToUser(userId, 'riders:density_map', {
        timestamp: new Date(),
        densityMap: result.densityMap
      });
      
      return {
        success: true,
        densityMap: result.densityMap
      };
    } else {
      throw new Error(result.message || 'Failed to generate density map');
    }
  } catch (error) {
    console.error('Error generating density map:', error);
    return {
      success: false,
      message: error.message || 'Failed to generate density map',
      error: error.toString()
    };
  }
};

/**
 * Handle rider location update
 * @param {string} riderId Rider ID
 * @param {Object} location Location coordinates { lat, lng }
 * @param {string} status Rider status
 */
const handleRiderLocationUpdate = async (riderId, location, status) => {
  try {
    if (!location || !location.lat || !location.lng) {
      return;
    }
    
    // Create a grid cell key (rounded to 2 decimal places, ~1km precision)
    const lat = Math.round(location.lat * 100) / 100;
    const lng = Math.round(location.lng * 100) / 100;
    const gridKey = `${lat},${lng}`;
    
    // Invalidate rider density cache for this grid cell
    // This will force a recalculation on next check
    if (riderDensityCache.has(gridKey)) {
      const densityData = riderDensityCache.get(gridKey);
      
      // Mark as outdated but keep the old stats for comparison
      densityData.timestamp = 0;
      riderDensityCache.set(gridKey, densityData);
    }
  } catch (error) {
    console.error('Error handling rider location update:', error);
  }
};

/**
 * Update configuration
 * @param {Object} config New configuration
 * @returns {Object} Update result
 */
const updateConfig = (config) => {
  try {
    if (config.broadcastInterval !== undefined) {
      CONFIG.broadcastInterval = config.broadcastInterval;
      
      // Update broadcast timer
      if (broadcastTimer) {
        clearInterval(broadcastTimer);
        broadcastTimer = setInterval(broadcastAvailabilityUpdates, CONFIG.broadcastInterval);
      }
    }
    
    if (config.checkInterval !== undefined) {
      CONFIG.checkInterval = config.checkInterval;
      
      // Update check timer
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = setInterval(checkRiderAvailabilityChanges, CONFIG.checkInterval);
      }
    }
    
    if (config.maxDistanceKm !== undefined) {
      CONFIG.maxDistanceKm = config.maxDistanceKm;
    }
    
    if (config.significantChangeThreshold !== undefined) {
      CONFIG.significantChangeThreshold = config.significantChangeThreshold;
    }
    
    if (config.minimumActivePassengers !== undefined) {
      CONFIG.minimumActivePassengers = config.minimumActivePassengers;
    }
    
    return {
      success: true,
      message: 'Configuration updated successfully',
      config: CONFIG
    };
  } catch (error) {
    console.error('Error updating configuration:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to update configuration',
      error: error.toString()
    };
  }
};

/**
 * Get current configuration
 * @returns {Object} Current configuration
 */
const getConfig = () => {
  return {
    success: true,
    config: CONFIG
  };
};

/**
 * Get service status
 * @returns {Object} Service status
 */
const getStatus = () => {
  return {
    success: true,
    status: {
      activePassengers: passengerLocationCache.size,
      cachedGridCells: riderDensityCache.size,
      broadcastTimerActive: !!broadcastTimer,
      checkTimerActive: !!checkTimer
    }
  };
};

export {
  initialize,
  trackPassengerLocation,
  broadcastAvailabilityUpdates,
  checkRiderAvailabilityChanges,
  generateDensityMap,
  handleRiderLocationUpdate,
  updateConfig,
  getConfig,
  getStatus
};
