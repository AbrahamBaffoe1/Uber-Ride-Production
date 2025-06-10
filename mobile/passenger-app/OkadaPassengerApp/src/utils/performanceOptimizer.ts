/**
 * Performance Optimizer
 * Centralized management of all performance optimizations for the app
 */

import { Platform, AppState, NativeEventSubscription } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';

// Import optimizations
import { 
  initializeAppSizeOptimizer, 
  cleanImageCache,
  OPTIMIZATION_CONFIG 
} from './appSizeOptimizer';
import mapCachingService from '../services/mapCachingService';

// Constants for location update throttling
const LOCATION_UPDATE_CONFIG = {
  // Frequency of updates (in milliseconds)
  FOREGROUND_INTERVAL: 3000, // 3 seconds when app is in foreground
  BACKGROUND_INTERVAL: 15000, // 15 seconds when app is in background
  IDLE_INTERVAL: 30000, // 30 seconds when user is stationary
  
  // Distance filter (in meters) - minimum distance to trigger update
  FOREGROUND_DISTANCE: 10, // 10 meters in foreground
  BACKGROUND_DISTANCE: 50, // 50 meters in background
  
  // Accuracy settings
  FOREGROUND_ACCURACY: Location.Accuracy.High,
  BACKGROUND_ACCURACY: Location.Accuracy.Balanced,
  
  // Battery saving - disable updates below this battery level
  LOW_BATTERY_THRESHOLD: 15, // 15%
  
  // Activity detection - change update frequency based on activity
  ACTIVITY_CHECK_INTERVAL: 60000, // 1 minute
  
  // Cache size for location history to detect patterns
  LOCATION_HISTORY_CACHE_SIZE: 20
};

// Track initialization state
let isInitialized = false;
let appStateSubscription: NativeEventSubscription | null = null;
let locationSubscription: any = null;
let locationUpdateTimer: NodeJS.Timeout | null = null;
let lastKnownLocation: Location.LocationObject | null = null;
let locationHistory: Location.LocationObject[] = [];
let isLocationPermissionGranted = false;

/**
 * Check if two locations are significantly different
 * @param loc1 First location
 * @param loc2 Second location
 * @param threshold Threshold in meters
 * @returns Boolean indicating if locations differ by more than threshold
 */
const isLocationSignificantlyDifferent = (
  loc1: Location.LocationObject, 
  loc2: Location.LocationObject, 
  threshold: number
): boolean => {
  if (!loc1 || !loc2) return true;
  
  // Use Haversine formula to calculate distance
  const R = 6371e3; // Earth radius in meters
  const φ1 = loc1.coords.latitude * Math.PI / 180;
  const φ2 = loc2.coords.latitude * Math.PI / 180;
  const Δφ = (loc2.coords.latitude - loc1.coords.latitude) * Math.PI / 180;
  const Δλ = (loc2.coords.longitude - loc1.coords.longitude) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = R * c;
  
  return distance > threshold;
};

/**
 * Determine if user is stationary based on location history
 * @returns Boolean indicating if user is stationary
 */
const isUserStationary = (): boolean => {
  if (locationHistory.length < 3) return false;
  
  // Check the last 3 locations
  const lastLocation = locationHistory[locationHistory.length - 1];
  const prevLocation = locationHistory[locationHistory.length - 3];
  
  return !isLocationSignificantlyDifferent(
    lastLocation, 
    prevLocation, 
    LOCATION_UPDATE_CONFIG.FOREGROUND_DISTANCE
  );
};

/**
 * Update location tracking parameters based on app state and user activity
 */
const updateLocationTrackingParameters = async (): Promise<void> => {
  try {
    if (!isLocationPermissionGranted) return;
    
    const appState = AppState.currentState;
    const isForeground = appState === 'active';
    const isStationary = isUserStationary();
    
    // Get battery level if available
    let batteryLevel = 100;
    try {
      const batteryInfo = await AsyncStorage.getItem('deviceBatteryLevel');
      if (batteryInfo) {
        batteryLevel = parseInt(batteryInfo, 10);
      }
    } catch (e) {
      console.warn('Error getting battery level:', e);
    }
    
    // Disable location updates if battery is too low
    if (batteryLevel < LOCATION_UPDATE_CONFIG.LOW_BATTERY_THRESHOLD) {
      stopLocationTracking();
      return;
    }
    
    // Determine appropriate update interval
    let updateInterval = LOCATION_UPDATE_CONFIG.FOREGROUND_INTERVAL;
    let distanceFilter = LOCATION_UPDATE_CONFIG.FOREGROUND_DISTANCE;
    let accuracy = LOCATION_UPDATE_CONFIG.FOREGROUND_ACCURACY;
    
    if (!isForeground) {
      updateInterval = LOCATION_UPDATE_CONFIG.BACKGROUND_INTERVAL;
      distanceFilter = LOCATION_UPDATE_CONFIG.BACKGROUND_DISTANCE;
      accuracy = LOCATION_UPDATE_CONFIG.BACKGROUND_ACCURACY;
    } else if (isStationary) {
      updateInterval = LOCATION_UPDATE_CONFIG.IDLE_INTERVAL;
    }
    
    // Update location tracking
    startLocationTracking(updateInterval, distanceFilter, accuracy);
    
  } catch (error) {
    console.warn('Error updating location tracking parameters:', error);
  }
};

/**
 * Start location tracking with optimized parameters
 */
const startLocationTracking = async (
  interval: number = LOCATION_UPDATE_CONFIG.FOREGROUND_INTERVAL,
  distanceFilter: number = LOCATION_UPDATE_CONFIG.FOREGROUND_DISTANCE,
  accuracy: Location.Accuracy = LOCATION_UPDATE_CONFIG.FOREGROUND_ACCURACY
): Promise<void> => {
  try {
    // Stop any existing tracking
    await stopLocationTracking();
    
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    isLocationPermissionGranted = status === 'granted';
    
    if (!isLocationPermissionGranted) {
      console.log('Location permission not granted');
      return;
    }
    
    // Configure location tracking
    await Location.enableNetworkProviderAsync();
    
    // Start watching position with optimized settings
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy,
        distanceInterval: distanceFilter,
        timeInterval: interval
      },
      (location) => handleLocationUpdate(location)
    );
    
    // Set timer for periodic parameter updates
    locationUpdateTimer = setInterval(
      updateLocationTrackingParameters,
      LOCATION_UPDATE_CONFIG.ACTIVITY_CHECK_INTERVAL
    );
    
    console.log(`Location tracking started: interval=${interval}ms, distance=${distanceFilter}m`);
  } catch (error) {
    console.warn('Error starting location tracking:', error);
  }
};

/**
 * Handle new location updates
 */
const handleLocationUpdate = async (location: Location.LocationObject): Promise<void> => {
  try {
    // Save last known location
    lastKnownLocation = location;
    
    // Update location history (with size limit)
    locationHistory.push(location);
    if (locationHistory.length > LOCATION_UPDATE_CONFIG.LOCATION_HISTORY_CACHE_SIZE) {
      locationHistory.shift();
    }
    
    // Trigger map pre-caching for current location if significantly different
    if (locationHistory.length > 1) {
      const prevLocation = locationHistory[locationHistory.length - 2];
      
      if (isLocationSignificantlyDifferent(
        location, 
        prevLocation, 
        LOCATION_UPDATE_CONFIG.BACKGROUND_DISTANCE
      )) {
        // Pre-cache map tiles for new area
        const region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02
        };
        
        // Only pre-cache if app is in foreground or if we're using offline maps
        const featureConfig = await AsyncStorage.getItem('featureConfig');
        const offlineMapsEnabled = featureConfig && 
          JSON.parse(featureConfig).offlineMapSupport;
        
        if (AppState.currentState === 'active' || offlineMapsEnabled) {
          mapCachingService.preCacheRegion(region, [13, 14], false);
        }
      }
    }
    
    // Send update to the server (with adaptive throttling)
    // This would be handled by a service like socketService
    
  } catch (error) {
    console.warn('Error handling location update:', error);
  }
};

/**
 * Stop location tracking
 */
const stopLocationTracking = async (): Promise<void> => {
  try {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    
    if (locationUpdateTimer) {
      clearInterval(locationUpdateTimer);
      locationUpdateTimer = null;
    }
    
    console.log('Location tracking stopped');
  } catch (error) {
    console.warn('Error stopping location tracking:', error);
  }
};

/**
 * Handle app state changes
 */
const handleAppStateChange = (nextAppState: string): void => {
  if (nextAppState === 'active') {
    // App moved to foreground
    // Resume more frequent location updates
    updateLocationTrackingParameters();
    
    // Clean up caches
    cleanImageCache();
    
    // Pre-cache common regions
    if (lastKnownLocation) {
      const region = {
        latitude: lastKnownLocation.coords.latitude,
        longitude: lastKnownLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
      
      mapCachingService.preCacheRegion(region, [12, 13], false);
    } else {
      mapCachingService.preCacheCommonRegions(false);
    }
    
  } else if (nextAppState === 'background' || nextAppState === 'inactive') {
    // App moved to background
    // Reduce location update frequency
    updateLocationTrackingParameters();
  }
};

/**
 * Initialize all performance optimizations
 * This should be called during app startup
 */
export const initializePerformanceOptimizations = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    console.log('Initializing performance optimizations...');
    
    // Initialize app size optimizer
    await initializeAppSizeOptimizer();
    
    // Initialize map tile caching
    // This is auto-initialized when imported
    
    // Set up app state change listener for adaptive optimizations
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Set up location tracking with optimized parameters
    await startLocationTracking();
    
    // Initialize successful
    isInitialized = true;
    console.log('Performance optimizations initialized successfully');
  } catch (error) {
    console.error('Error initializing performance optimizations:', error);
  }
};

/**
 * Clean up performance optimization resources
 * This should be called when the app is shutting down
 */
export const cleanupPerformanceOptimizations = (): void => {
  try {
    // Remove app state listener
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
    
    // Stop location tracking
    stopLocationTracking();
    
    isInitialized = false;
    console.log('Performance optimizations cleaned up');
  } catch (error) {
    console.error('Error cleaning up performance optimizations:', error);
  }
};

export default {
  initializePerformanceOptimizations,
  cleanupPerformanceOptimizations,
  startLocationTracking,
  stopLocationTracking,
  updateLocationTrackingParameters
};
