/**
 * Socket Service
 * Provides a socket.io client connection to the server for real-time updates
 */
import io, { Socket, ManagerOptions } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

import { SOCKET_URL } from '../api/config';

// Ensure SOCKET_URL is defined
const SOCKET_SERVER_URL = SOCKET_URL || 'http://localhost:3001';

// Configure server URL - use the one from config or fallback
// This ensures consistency with the API configuration

interface DeviceInfo {
  deviceId: string;
  appVersion: string;
  os: string;
  osVersion: string;
}

class SocketService {
  private socket: Socket | null = null;
  private namespaces: Map<string, Socket> = new Map();
  private deviceInfo: DeviceInfo | null = null;
  
  constructor() {
    this.initializeDeviceInfo();
  }
  
  /**
   * Initialize device information for tracking
   */
  private async initializeDeviceInfo() {
    // Get or generate device ID
    let deviceId = await AsyncStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = Device.deviceName || `${Platform.OS}-${Date.now()}`;
      await AsyncStorage.setItem('deviceId', deviceId);
    }
    
    // Get app version from Expo Constants
    const appVersion = Constants.manifest?.version || '1.0.0';
    
    // Get OS info
    const os = Platform.OS;
    const osVersion = Platform.Version.toString();
    
    this.deviceInfo = {
      deviceId,
      appVersion,
      os,
      osVersion
    };
  }
  
  /**
   * Get device information for socket connections
   * @returns Device information object
   */
  getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      return {
        deviceId: 'unknown',
        appVersion: '1.0.0',
        os: Platform.OS,
        osVersion: Platform.Version.toString()
      };
    }
    return this.deviceInfo;
  }
  
  /**
   * Connect to the socket server
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<void> {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return Promise.resolve();
    }
    
    return new Promise(async (resolve, reject) => {
      try {
        // Get authentication token
        const token = await AsyncStorage.getItem('authToken');
        
        // Socket.io connection options
        const options: Partial<ManagerOptions & { auth: { token: string } }> = {
          transports: __DEV__ ? ['websocket'] : ['websocket', 'polling'], // Use both in production
          reconnection: true,
          reconnectionAttempts: __DEV__ ? 10 : Infinity, // Unlimited reconnection attempts in production
          reconnectionDelay: __DEV__ ? 1000 : 2000, // Longer delay in production
          timeout: __DEV__ ? 20000 : 30000, // Longer timeout in production
          auth: {
            token: token || (__DEV__ ? 'dev-token-for-testing' : '')
          },
          query: {
            deviceId: this.deviceInfo?.deviceId,
            appVersion: this.deviceInfo?.appVersion,
            os: this.deviceInfo?.os,
            osVersion: this.deviceInfo?.osVersion
          },
          // Additional production-specific options
          ...(!__DEV__ && {
            pingTimeout: 60000,  // 60s timeout
            pingInterval: 25000, // Send ping every 25s
            reconnectionDelayMax: 10000, // Maximum delay between reconnection attempts
            randomizationFactor: 0.5,
            upgrade: true,       // Allow transport upgrades
          })
        };
        
        // In development mode, log if we're using a dev token
        if (__DEV__ && !token) {
          console.warn('Using development token for socket connection. This should only happen in development mode.');
        }
        
        // Log connection details for debugging
        console.log(`Connecting to socket server at: ${SOCKET_SERVER_URL}`);
        
        // Add additional logging for Android emulator users
        if (Platform.OS === 'android' && __DEV__ && SOCKET_SERVER_URL.includes('localhost')) {
          console.warn(
            'Android emulator detected with localhost URL. ' +
            'If you experience connection issues, try using 10.0.2.2 instead of localhost in the API config.'
          );
        }
        
        // Initialize socket
        this.socket = io(SOCKET_SERVER_URL, options);
        
        // Set up event handlers
        this.socket.on('connect', () => {
          console.log('Socket connected successfully with ID:', this.socket?.id);
          resolve();
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error.message);
          
          // Only reject if this is the initial connection attempt
          if (!this.socket?.connected) {
            // Try to provide more helpful error information
            let errorMessage = `Connection failed: ${error.message}`;
            
            if (error.message.includes('xhr poll error')) {
              errorMessage += ' - Server may be unreachable or CORS issues';
            } else if (error.message.includes('timeout')) {
              errorMessage += ' - Connection timed out';
            } else if (error.message.includes('auth')) {
              errorMessage += ' - Authentication failed';
            }
            
            reject(new Error(errorMessage));
          }
        });
        
        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          
          // Clear namespace connections on disconnect
          this.namespaces.forEach((ns) => {
            ns.disconnect();
          });
          this.namespaces.clear();
        });
        
        this.socket.on('error', (error) => {
          console.error('Socket error:', error);
        });
      } catch (error) {
        console.error('Error setting up socket connection:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the socket server
   */
  disconnect() {
    // Disconnect all namespaces
    this.namespaces.forEach((ns) => {
      ns.disconnect();
    });
    this.namespaces.clear();
    
    // Disconnect main socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  /**
   * Check if socket is connected
   * @returns True if connected
   */
  isConnected(): boolean {
    return !!(this.socket && this.socket.connected);
  }
  
  /**
   * Get or create a namespace connection - Note: This actually uses 
   * the main socket to join a room, instead of using a true namespace
   * @param roomName - The room name to join
   * @returns Promise that resolves with the main socket or null
   */
  async getNamespace(roomName: string): Promise<Socket | null> {
    // Try to connect the main socket if it's not connected
    if (!this.socket || !this.socket.connected) {
      try {
        // Attempt to connect the main socket first
        await this.connect();
      } catch (error) {
        console.error('Failed to connect main socket:', error);
        return null;
      }
      
      // Double-check connection after attempt
      if (!this.socket || !this.socket.connected) {
        console.error('Cannot connect to room: main socket not connected');
        return null;
      }
    }
    
    try {
      // Sanitize room name to prevent issues
      const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9_-]/g, '');
      
      // Join the room using the main socket instead of creating a new namespace
      console.log(`Joining room: ${sanitizedRoomName}`);
      
      // Create a promise to wait for room join confirmation
      const joinPromise = new Promise<void>((resolve, reject) => {
        // Set timeout for room join
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout joining room ${sanitizedRoomName}`));
        }, 5000);
        
        // Listen for join confirmation
        this.socket?.once(`joined:${sanitizedRoomName}`, () => {
          clearTimeout(timeout);
          console.log(`Successfully joined room: ${sanitizedRoomName}`);
          resolve();
        });
        
        // Emit an event to join the room
        this.socket?.emit('join:room', { room: sanitizedRoomName });
      });
      
      // Wait for join confirmation
      await joinPromise;
      
      // Create a key for this room in our local Map
      if (!this.namespaces.has(sanitizedRoomName)) {
        // Store the main socket in our namespaces map
        this.namespaces.set(sanitizedRoomName, this.socket);
      }
      
      return this.socket;
    } catch (error) {
      console.error(`Error joining room ${roomName}:`, error);
      return null;
    }
  }
  
  /**
   * Get the main socket instance
   * @returns Main socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;
