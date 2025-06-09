import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS, SOCKET_URL } from '../config';
import { socketService } from '../../services/socketService';

// Type definitions
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  rating?: number;
}

export interface RideDetails {
  id: string;
  status: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled' | 'expired';
  passenger: Passenger;
  pickupLocation: Location;
  dropoffLocation: Location;
  fare: number;
  distance: string | number;
  duration: string | number;
  distanceToPickup?: string | number;
  estimatedArrival?: string;
  requestedAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
}

export interface RideHistory {
  id: string;
  status: 'completed' | 'cancelled';
  passenger: {
    id: string;
    name: string;
    photo?: string;
  };
  pickupLocation: {
    address: string;
  };
  dropoffLocation: {
    address: string;
  };
  fare: number;
  distance: string | number;
  duration: string | number;
  earnings: number;
  completedAt?: string;
  cancelledAt?: string;
  rating?: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
}

export interface RideStatusUpdate {
  status: 'arrived' | 'started' | 'completed';
  actualDistance?: number;
  actualDuration?: number;
  actualFare?: number;
}

// Define ActiveRide interface needed by RidesScreen
export interface ActiveRide {
  id: string;
  status: string;
  passengerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  distance: string;
  estimatedDuration: string;
}

class RideService {
  private activeRide: RideDetails | null = null;
  private rideRequests: RideDetails[] = [];
  private rideStatusListeners: ((activeRide: ActiveRide | null) => void)[] = [];
  private rideRequestsListeners: ((rideRequests: RideDetails[]) => void)[] = [];
  private isSocketConnected: boolean = false;
  
  constructor() {
    // Initialize socket connection when service is created
    this.initializeSocketConnection();
  }
  
  /**
   * Initialize socket connection and set up event listeners
   */
  private async initializeSocketConnection(): Promise<void> {
    try {
      // Connect to socket server
      await socketService.connect();
      this.isSocketConnected = true;
      
      // Set up event listeners for ride-related events
      this.setupSocketListeners();
      
      console.log('Ride service socket connection initialized');
    } catch (error) {
      console.error('Failed to initialize socket connection:', error);
      this.isSocketConnected = false;
    }
  }
  
  /**
   * Set up socket event listeners for ride-related events
   */
  private setupSocketListeners(): void {
    // Listen for new ride requests
    socketService.on('ride:new_request', (data) => {
      console.log('New ride request received:', data);
      
      // Add to ride requests if not already present
      if (!this.rideRequests.some(ride => ride.id === data.rideId)) {
        this.fetchAvailableRides().then(() => {
          // Notify listeners of updated ride requests
          this.notifyRideRequestsListeners();
        });
      }
    });
    
    // Listen for ride taken by another rider
    socketService.on('ride:taken', (data) => {
      console.log('Ride taken by another rider:', data);
      
      // Remove from ride requests
      this.rideRequests = this.rideRequests.filter(ride => ride.id !== data.rideId);
      
      // Notify listeners of updated ride requests
      this.notifyRideRequestsListeners();
    });
    
    // Listen for ride acceptance confirmation
    socketService.on('ride:acceptance_confirmed', (data) => {
      console.log('Ride acceptance confirmed:', data);
      
      // Fetch active ride to update UI
      this.fetchActiveRide().then(() => {
        // Notify listeners of updated active ride
        this.notifyRideStatusListeners();
      });
    });
    
    // Listen for ride status update confirmation
    socketService.on('ride:status_update_confirmed', (data) => {
      console.log('Ride status update confirmed:', data);
      
      // Update active ride status if it matches
      if (this.activeRide && this.activeRide.id === data.rideId) {
        this.fetchActiveRide().then(() => {
          // Notify listeners of updated active ride
          this.notifyRideStatusListeners();
        });
      }
    });
    
    // Listen for ride cancellation
    socketService.on('ride:cancelled', (data) => {
      console.log('Ride cancelled:', data);
      
      // If it's the active ride, clear it
      if (this.activeRide && this.activeRide.id === data.rideId) {
        this.activeRide = null;
        this.notifyRideStatusListeners();
        
        // Fetch available rides again
        this.fetchAvailableRides().then(() => {
          this.notifyRideRequestsListeners();
        });
      }
    });
  }
  
  /**
   * Fetch active ride from API
   */
  private async fetchActiveRide(): Promise<void> {
    try {
      const response = await this.getActiveRide();
      // Ensure we handle undefined case
      this.activeRide = response.data || null;
      
      // If active ride exists, join the ride-specific room
      if (this.activeRide) {
        socketService.joinRideRoom(this.activeRide.id);
      }
    } catch (error) {
      console.error('Error fetching active ride:', error);
      this.activeRide = null;
    }
  }
  
  /**
   * Fetch available rides from API
   */
  private async fetchAvailableRides(): Promise<void> {
    try {
      const response = await this.getAvailableRides();
      this.rideRequests = response.data || [];
    } catch (error) {
      console.error('Error fetching available rides:', error);
      this.rideRequests = [];
    }
  }
  
  /**
   * Notify all ride status listeners
   */
  private notifyRideStatusListeners(): void {
    if (!this.activeRide) {
      this.rideStatusListeners.forEach(listener => listener(null));
      return;
    }
    
    const formattedActiveRide: ActiveRide = {
      id: this.activeRide.id,
      status: this.activeRide.status,
      passengerName: this.activeRide.passenger.name,
      pickupLocation: this.activeRide.pickupLocation.address || 'Unknown location',
      dropoffLocation: this.activeRide.dropoffLocation.address || 'Unknown destination',
      distance: typeof this.activeRide.distance === 'number' ? 
        `${(this.activeRide.distance / 1000).toFixed(1)} km` : this.activeRide.distance.toString(),
      estimatedDuration: typeof this.activeRide.duration === 'number' ? 
        `${Math.ceil(this.activeRide.duration / 60)} mins` : this.activeRide.duration.toString()
    };
    
    this.rideStatusListeners.forEach(listener => listener(formattedActiveRide));
  }
  
  /**
   * Notify all ride requests listeners
   */
  private notifyRideRequestsListeners(): void {
    this.rideRequestsListeners.forEach(listener => listener(this.rideRequests));
  }
  
  /**
   * Subscribe to ride status changes
   * @param listener Function to call when ride status changes
   * @returns Function to unsubscribe
   */
  onRideStatusChanged(listener: (activeRide: ActiveRide | null) => void): () => void {
    this.rideStatusListeners.push(listener);
    
    // Call immediately with current state
    if (this.activeRide) {
      const formattedActiveRide: ActiveRide = {
        id: this.activeRide.id,
        status: this.activeRide.status,
        passengerName: this.activeRide.passenger.name,
        pickupLocation: this.activeRide.pickupLocation.address || 'Unknown location',
        dropoffLocation: this.activeRide.dropoffLocation.address || 'Unknown destination',
        distance: typeof this.activeRide.distance === 'number' ? 
          `${(this.activeRide.distance / 1000).toFixed(1)} km` : this.activeRide.distance.toString(),
        estimatedDuration: typeof this.activeRide.duration === 'number' ? 
          `${Math.ceil(this.activeRide.duration / 60)} mins` : this.activeRide.duration.toString()
      };
      listener(formattedActiveRide);
    } else {
      listener(null);
    }
    
    // Return unsubscribe function
    return () => {
      this.rideStatusListeners = this.rideStatusListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Subscribe to ride requests changes
   * @param listener Function to call when ride requests change
   * @returns Function to unsubscribe
   */
  onRideRequestsChanged(listener: (rideRequests: RideDetails[]) => void): () => void {
    this.rideRequestsListeners.push(listener);
    
    // Call immediately with current state
    listener(this.rideRequests);
    
    // Return unsubscribe function
    return () => {
      this.rideRequestsListeners = this.rideRequestsListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get rider's rides (active ride and available ride requests)
   * Used by RidesScreen
   * @returns Promise with active ride and available ride requests
   */
  async getRiderRides(): Promise<{activeRide: ActiveRide | null, rideRequests: RideDetails[]}> {
    try {
      // Fetch active ride
      await this.fetchActiveRide();
      
      // If there's an active ride, don't fetch ride requests
      if (!this.activeRide) {
        // Fetch available ride requests
        await this.fetchAvailableRides();
      }
      
      // Format active ride for UI
      let formattedActiveRide: ActiveRide | null = null;
      if (this.activeRide) {
        formattedActiveRide = {
          id: this.activeRide.id,
          status: this.activeRide.status,
          passengerName: this.activeRide.passenger.name,
          pickupLocation: this.activeRide.pickupLocation.address || 'Unknown location',
          dropoffLocation: this.activeRide.dropoffLocation.address || 'Unknown destination',
          distance: typeof this.activeRide.distance === 'number' ? 
            `${(this.activeRide.distance / 1000).toFixed(1)} km` : this.activeRide.distance.toString(),
          estimatedDuration: typeof this.activeRide.duration === 'number' ? 
            `${Math.ceil(this.activeRide.duration / 60)} mins` : this.activeRide.duration.toString()
        };
      }
      
      return {
        activeRide: formattedActiveRide,
        rideRequests: this.activeRide ? [] : this.rideRequests
      };
    } catch (error) {
      console.error('Error fetching rider rides:', error);
      return {
        activeRide: null,
        rideRequests: []
      };
    }
  }
  
  /**
   * Update rider's availability status
   * @param isAvailable Whether the rider is available for rides
   */
  async updateAvailability(isAvailable: boolean): Promise<ApiResponse> {
    const status = isAvailable ? 'online' : 'offline';
    
    // Update via API
    const response = await apiClient.post<ApiResponse>(
      API_ENDPOINTS.LOCATION.UPDATE,
      { status }
    );
    
    // Also update via socket for real-time status change
    if (this.isSocketConnected) {
      socketService.updateAvailability(status as 'online' | 'offline' | 'busy');
    }
    
    return response;
  }

  /**
   * Get available rides near rider's location
   * @param radius Optional radius to search in (km)
   * @returns Promise with array of available rides
   */
  async getAvailableRides(radius?: number): Promise<ApiResponse<RideDetails[]>> {
    const params: any = {};
    if (radius) {
      params.radius = radius;
    }
    
    return apiClient.get<ApiResponse<RideDetails[]>>(
      API_ENDPOINTS.RIDER.AVAILABLE_RIDES,
      params
    );
  }
  
  /**
   * Accept a ride request
   * @param rideId The ride ID to accept
   * @returns Promise with accepted ride details
   */
  async acceptRide(rideId: string): Promise<ApiResponse<RideDetails>> {
    // Accept via API
    const response = await apiClient.post<ApiResponse<RideDetails>>(
      API_ENDPOINTS.RIDER.ACCEPT_RIDE(rideId)
    );
    
    // Also accept via socket for real-time updates
    if (this.isSocketConnected) {
      socketService.acceptRide(rideId);
    }
    
    // Update active ride and notify listeners
    if (response.data) {
      this.activeRide = response.data;
      this.notifyRideStatusListeners();
      
      // Join ride-specific room
      socketService.joinRideRoom(rideId);
    }
    
    return response;
  }
  
  /**
   * Reject a ride request
   * @param rideId The ride ID to reject
   * @param reason Optional reason for rejection
   * @returns Promise with success message
   */
  async rejectRide(rideId: string, reason?: string): Promise<ApiResponse> {
    // Remove from local ride requests
    this.rideRequests = this.rideRequests.filter(ride => ride.id !== rideId);
    this.notifyRideRequestsListeners();
    
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.RIDER.REJECT_RIDE(rideId),
      { reason }
    );
  }
  
  /**
   * Update a ride's status (arrived, started, completed)
   * @param rideId The ride ID
   * @param statusUpdate Status update information
   * @returns Promise with updated ride details
   */
  async updateRideStatus(rideId: string, statusUpdate: RideStatusUpdate): Promise<ApiResponse<RideDetails>> {
    // Update via API
    const response = await apiClient.post<ApiResponse<RideDetails>>(
      API_ENDPOINTS.RIDER.UPDATE_RIDE_STATUS(rideId),
      statusUpdate
    );
    
    // Also update via socket for real-time updates
    if (this.isSocketConnected) {
      // Map the status to match what the socket service expects
      const socketStatus = statusUpdate.status === 'arrived' ? 'arrived_pickup' :
                          statusUpdate.status === 'started' ? 'in_progress' :
                          statusUpdate.status === 'completed' ? 'completed' : 'in_progress';
      
      socketService.updateRideStatus(
        rideId, 
        socketStatus,
        {
          actualFare: statusUpdate.actualFare,
          actualDistance: statusUpdate.actualDistance
        }
      );
    }
    
    // Update active ride if it matches
    if (response.data && this.activeRide && this.activeRide.id === rideId) {
      this.activeRide = response.data;
      this.notifyRideStatusListeners();
      
      // If ride is completed, leave the ride room
      if (statusUpdate.status === 'completed') {
        socketService.leaveRideRoom(rideId);
        
        // Clear active ride after a delay to allow UI to show completion
        setTimeout(() => {
          this.activeRide = null;
          this.notifyRideStatusListeners();
          
          // Fetch available rides again
          this.fetchAvailableRides().then(() => {
            this.notifyRideRequestsListeners();
          });
        }, 5000);
      }
    }
    
    return response;
  }
  
  /**
   * Get rider's active ride if any
   * @returns Promise with active ride details or null
   */
  async getActiveRide(): Promise<ApiResponse<RideDetails | null>> {
    return apiClient.get<ApiResponse<RideDetails | null>>(
      API_ENDPOINTS.RIDER.ACTIVE_RIDE
    );
  }
  
  /**
   * Get rider's ride history
   * @param page Page number for pagination
   * @param limit Items per page
   * @returns Promise with ride history
   */
  async getRideHistory(page: number = 1, limit: number = 10): Promise<ApiResponse<RideHistory[]>> {
    return apiClient.get<ApiResponse<RideHistory[]>>(
      API_ENDPOINTS.RIDER.RIDE_HISTORY,
      { page, limit }
    );
  }
}

// Export a singleton instance
export const rideService = new RideService();
