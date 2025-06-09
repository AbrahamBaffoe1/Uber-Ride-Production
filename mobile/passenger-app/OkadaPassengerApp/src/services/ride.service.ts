import { apiClient } from '../api/apiClient';
import { API_ENDPOINTS } from '../api/config';
import socketService from './socketService';

/**
 * Ride Service
 * Handles ride requests, tracking, history, and related functionality
 */
class RideService {
  private activeRide: any = null;
  private rideStatusListeners: ((ride: any) => void)[] = [];
  private locationUpdateInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the ride service
   */
  constructor() {
    // Check for active ride on startup
    this.checkForActiveRide();
  }

  /**
   * Check if there's an active ride
   */
  async checkForActiveRide(): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.RIDE.ACTIVE);
      
      if (response?.data?.ride) {
        this.activeRide = response.data.ride;
        this.setupRideTracking(this.activeRide.id);
        return this.activeRide;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking for active ride:', error);
      return null;
    }
  }

  /**
   * Request a new ride
   * @param rideData Ride request data
   */
  async requestRide(rideData: {
    pickupLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    destination: {
      latitude: number;
      longitude: number;
      address: string;
    };
    paymentMethod: string;
    notes?: string;
    scheduledTime?: string;
  }): Promise<any> {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.RIDE.REQUEST, rideData);
      
      if (response?.data?.ride) {
        this.activeRide = response.data.ride;
        this.setupRideTracking(this.activeRide.id);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error requesting ride:', error);
      throw error;
    }
  }

  /**
   * Cancel a ride
   * @param rideId Ride ID
   * @param reason Cancellation reason
   */
  async cancelRide(rideId: string, reason: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.RIDE.CANCEL(rideId), { reason });
      
      if (response?.data?.success) {
        this.cleanupRideTracking();
        this.activeRide = null;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  }

  /**
   * Get ride details by ID
   * @param rideId Ride ID
   */
  async getRideById(rideId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.RIDE.GET_BY_ID(rideId));
      return response.data;
    } catch (error) {
      console.error(`Error getting ride ${rideId}:`, error);
      throw error;
    }
  }

  /**
   * Get ride history
   * @param page Page number
   * @param limit Items per page
   */
  async getRideHistory(page: number = 1, limit: number = 10): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.RIDE.HISTORY, {
        params: { page, limit }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting ride history:', error);
      throw error;
    }
  }

  /**
   * Rate a completed ride
   * @param rideId Ride ID
   * @param rating Rating (1-5)
   * @param feedback Optional feedback text
   */
  async rateRide(rideId: string, rating: number, feedback?: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.RIDE.RATE(rideId), {
        rating,
        feedback
      });
      
      return response.data;
    } catch (error) {
      console.error('Error rating ride:', error);
      throw error;
    }
  }

  /**
   * Track a ride's location and status
   * @param rideId Ride ID
   */
  async trackRide(rideId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.RIDE.TRACK(rideId));
      return response.data;
    } catch (error) {
      console.error(`Error tracking ride ${rideId}:`, error);
      throw error;
    }
  }

  /**
   * Setup real-time tracking for a ride
   * @param rideId Ride ID
   */
  private async setupRideTracking(rideId: string): Promise<void> {
    try {
      // Clean up any existing tracking
      this.cleanupRideTracking();
      
      // Connect to socket
      await socketService.connect();
      
      // Join ride-specific room
      const socket = await socketService.getNamespace(`ride-${rideId}`);
      
      if (socket) {
        // Listen for ride updates
        socket.on('ride:update', (data: any) => {
          this.activeRide = data.ride;
          this.notifyRideStatusListeners(data.ride);
        });
        
        socket.on('ride:location', (data: any) => {
          if (this.activeRide) {
            this.activeRide.riderLocation = data.location;
            this.notifyRideStatusListeners(this.activeRide);
          }
        });
        
        socket.on('ride:completed', (data: any) => {
          this.activeRide = data.ride;
          this.notifyRideStatusListeners(data.ride);
          this.cleanupRideTracking();
        });
        
        socket.on('ride:cancelled', (data: any) => {
          this.activeRide = data.ride;
          this.notifyRideStatusListeners(data.ride);
          this.cleanupRideTracking();
        });
      }
      
      // Fallback: Poll for updates every 10 seconds if socket fails
      this.locationUpdateInterval = setInterval(async () => {
        try {
          const response = await this.trackRide(rideId);
          if (response?.ride) {
            this.activeRide = response.ride;
            this.notifyRideStatusListeners(response.ride);
            
            // If ride is completed or cancelled, stop tracking
            if (['completed', 'cancelled'].includes(response.ride.status)) {
              this.cleanupRideTracking();
            }
          }
        } catch (error) {
          console.error('Error in ride tracking interval:', error);
        }
      }, 10000);
    } catch (error) {
      console.error('Error setting up ride tracking:', error);
    }
  }

  /**
   * Clean up tracking resources
   */
  private cleanupRideTracking(): void {
    // Clear polling interval
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
    
    // Disconnect from socket namespace
    if (this.activeRide) {
      const rideId = this.activeRide.id;
      const socket = socketService.getSocket();
      
      if (socket) {
        socket.off('ride:update');
        socket.off('ride:location');
        socket.off('ride:completed');
        socket.off('ride:cancelled');
        socket.emit('leave:room', { room: `ride-${rideId}` });
      }
    }
  }

  /**
   * Notify all listeners of ride status changes
   * @param ride Updated ride object
   */
  private notifyRideStatusListeners(ride: any): void {
    this.rideStatusListeners.forEach(listener => listener(ride));
  }

  /**
   * Add ride status change listener
   * @param listener Function to call when ride status changes
   * @returns Function to remove the listener
   */
  onRideStatusChanged(listener: (ride: any) => void): () => void {
    this.rideStatusListeners.push(listener);
    
    // Call immediately with current ride if available
    if (this.activeRide) {
      listener(this.activeRide);
    }
    
    // Return unsubscribe function
    return () => {
      this.rideStatusListeners = this.rideStatusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get the active ride if any
   */
  getActiveRide(): any {
    return this.activeRide;
  }

  /**
   * Calculate estimated fare
   * @param pickupLocation Pickup coordinates
   * @param destination Destination coordinates
   */
  async calculateFare(
    pickupLocation: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<any> {
    try {
      const response = await apiClient.post<any>('/rides/estimate', {
        pickupLocation,
        destination
      });
      
      return response.data;
    } catch (error) {
      console.error('Error calculating fare:', error);
      throw error;
    }
  }

  /**
   * Format ride status for display
   * @param status Ride status from API
   */
  formatRideStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'requested': 'Requesting Ride',
      'pending': 'Finding Driver',
      'accepted': 'Driver Accepted',
      'arrived': 'Driver Arrived',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'expired': 'Expired'
    };
    
    return statusMap[status] || status;
  }
}

// Create and export singleton instance
const rideService = new RideService();
export default rideService;
