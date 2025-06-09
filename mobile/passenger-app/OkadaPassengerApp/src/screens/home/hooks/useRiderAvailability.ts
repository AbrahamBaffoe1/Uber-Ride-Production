/**
 * Hook for tracking rider availability in the passenger app
 */
import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../../api/services/socket.service';
import * as pricingService from '../../../api/services/pricing.service';

interface RiderAvailability {
  totalRiders: number;
  availableRiders: number;
  hasRidersAvailable: boolean;
  nearestRiderDistance?: number;
  nearestRiderETA?: number;
  averageETA?: number;
  lastUpdated: Date;
}

interface RiderDensityMap {
  densityMap: Array<{
    location: {
      lat: number;
      lng: number;
    };
    stats: {
      totalRiders: number;
      availableRiders: number;
      hasRidersAvailable: boolean;
    };
    distance: number;
  }>;
  lastUpdated: Date;
}

/**
 * Hook to track rider availability around a location
 * @param location Current location
 */
export const useRiderAvailability = (location: {
  latitude: number;
  longitude: number;
} | null) => {
  const [availability, setAvailability] = useState<RiderAvailability | null>(null);
  const [densityMap, setDensityMap] = useState<RiderDensityMap | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check availability on location change
  useEffect(() => {
    let isMounted = true;
    
    const checkAvailability = async () => {
      if (!location) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Start tracking this location for real-time updates
        pricingService.startLocationTracking({
          latitude: location.latitude,
          longitude: location.longitude
        });
        
        // Get initial availability data
        const result = await pricingService.checkRiderAvailability({
          latitude: location.latitude,
          longitude: location.longitude
        });
        
        if (isMounted && result.success) {
          setAvailability({
            ...result.availability,
            lastUpdated: new Date()
          });
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to check rider availability');
          console.error('Error checking rider availability:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    checkAvailability();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [location?.latitude, location?.longitude]);
  
  // Listen for real-time availability updates
  useEffect(() => {
    const handleAvailabilityUpdate = (data: any) => {
      setAvailability({
        totalRiders: data.totalRiders,
        availableRiders: data.availableRiders,
        hasRidersAvailable: data.hasRidersAvailable,
        nearestRiderDistance: data.nearestRiderDistance,
        nearestRiderETA: data.nearestRiderETA,
        averageETA: data.averageETA,
        lastUpdated: new Date(data.timestamp || Date.now())
      });
    };
    
    const handleDensityMap = (data: any) => {
      setDensityMap({
        densityMap: data.densityMap,
        lastUpdated: new Date(data.timestamp || Date.now())
      });
    };
    
    // Subscribe to real-time updates
    socketService.on('riders:availability_update', handleAvailabilityUpdate);
    socketService.on('riders:density_map', handleDensityMap);
    
    // Cleanup function
    return () => {
      socketService.off('riders:availability_update', handleAvailabilityUpdate);
      socketService.off('riders:density_map', handleDensityMap);
    };
  }, []);
  
  // Function to manually refresh availability
  const refreshAvailability = useCallback(async () => {
    if (!location) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await pricingService.checkRiderAvailability({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      if (result.success) {
        setAvailability({
          ...result.availability,
          lastUpdated: new Date()
        });
      }
    } catch (err) {
      setError('Failed to refresh rider availability');
      console.error('Error refreshing rider availability:', err);
    } finally {
      setIsLoading(false);
    }
  }, [location]);
  
  // Function to request density map
  const requestDensityMap = useCallback(async () => {
    if (!location) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try via socket
      socketService.requestRiderDensityMap();
      
      // Also try via API
      const result = await pricingService.getRiderDensityMap({
        latitude: location.latitude,
        longitude: location.longitude
      });
      
      if (result.success) {
        setDensityMap({
          densityMap: result.densityMap,
          lastUpdated: new Date()
        });
      }
    } catch (err) {
      setError('Failed to get rider density map');
      console.error('Error getting rider density map:', err);
    } finally {
      setIsLoading(false);
    }
  }, [location]);
  
  return {
    availability,
    densityMap,
    isLoading,
    error,
    refreshAvailability,
    requestDensityMap
  };
};
