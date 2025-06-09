// Example usage of the Enhanced Tracking Service
import enhancedTrackingService from './api/services/enhancedTrackingService';

/**
 * This is an example showing how to use the enhanced tracking features
 * in a React component. It's not meant to be run directly.
 */

// Example React component pseudo-code
class RideTrackingExample {
  // State variables would be here in a real component
  riderId: string = '60a2b7e8f12d4a3b5c6d7e8f';
  rideId: string = '60a2b7e8f12d4a3b5c6d7e9f';
  
  async componentDidMount() {
    try {
      // Start tracking the rider
      const trackingInfo = await enhancedTrackingService.startTracking(
        this.riderId,
        this.rideId,
        {
          enableGeofencing: true,
          enablePredictions: true,
          etaInterval: 30000 // 30 seconds
        }
      );
      
      console.log('Tracking started:', trackingInfo);
      
      // Set up listeners for real-time updates
      
      // 1. Location updates
      const locationCleanup = enhancedTrackingService.onLocationUpdate((locationEvent) => {
        console.log('Rider location updated:', locationEvent.location);
        // Update map with new location
      });
      
      // 2. ETA updates
      const etaCleanup = enhancedTrackingService.onEtaUpdate((eta) => {
        console.log('ETA updated:', eta);
        // Update ETA display
        const etaTime = eta.destination?.eta;
        const minutesRemaining = Math.floor((eta.destination?.remainingSeconds || 0) / 60);
        console.log(`Rider will arrive in approximately ${minutesRemaining} minutes`);
      });
      
      // 3. Geofence events
      const geofenceCleanup = enhancedTrackingService.onGeofenceEvent((event) => {
        if (event.type === 'enter') {
          console.log(`Rider entered the ${event.geofenceType} area`);
          if (event.geofenceType === 'pickup') {
            // Show pickup notification
            console.log('Rider has arrived at pickup location!');
          } else if (event.geofenceType === 'destination') {
            // Show destination arrival notification
            console.log('Rider has arrived at destination!');
          }
        } else if (event.type === 'exit') {
          console.log(`Rider left the ${event.geofenceType} area`);
        }
      });
      
      // Store cleanup functions for later use
      this.cleanupFunctions = [locationCleanup, etaCleanup, geofenceCleanup];
      
      // Create a custom geofence (e.g., for a favorite location)
      await enhancedTrackingService.createGeofence({
        name: 'Home',
        latitude: 6.4355,
        longitude: 3.4510,
        radius: 200, // meters
        type: 'custom',
        riderId: this.riderId
      });
      
      // Request latest ETA explicitly (in addition to automatic updates)
      const etaInfo = await enhancedTrackingService.requestEta(this.rideId, this.riderId);
      console.log('Latest ETA:', etaInfo);
      
      // Get rider's trajectory predictions
      const predictions = await enhancedTrackingService.getPredictions(this.riderId);
      console.log('Trajectory predictions:', predictions);
      
      // Get location history for last 30 minutes
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const locationHistory = await enhancedTrackingService.getLocationHistory(this.riderId, {
        startDate: thirtyMinutesAgo,
        limit: 100
      });
      console.log(`Got ${locationHistory.count} location history points`);
      
    } catch (error) {
      console.error('Error setting up tracking:', error);
    }
  }
  
  componentWillUnmount() {
    // Stop tracking when component unmounts
    enhancedTrackingService.stopTracking(this.riderId, this.rideId)
      .then(() => console.log('Tracking stopped'))
      .catch(error => console.error('Error stopping tracking:', error));
    
    // Clean up all event listeners
    if (this.cleanupFunctions) {
      this.cleanupFunctions.forEach(cleanup => cleanup());
    }
  }
  
  // Rest of component would be here
  cleanupFunctions: Array<() => void> = [];
}

export default RideTrackingExample;
