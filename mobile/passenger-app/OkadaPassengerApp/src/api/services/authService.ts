import { apiClient, ApiResponse } from '../client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { otpService, OTPResponse } from './otpService';

export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  // Login with email and password
  async login(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting login with MongoDB backend');
      
      const response = await apiClient.post<any>('/auth/login', {
        email,
        password
      });
      
      // Enhanced handling of MongoDB response structure
      // The API might return data in different formats
      let userData: User | null = null;
      let tokenData: string | null = null;
      let refreshTokenData: string | null = null;
      
      if (response.data?.user) {
        // Direct structure: { data: { user, token, refreshToken } }
        userData = response.data.user;
        tokenData = response.data.token;
        refreshTokenData = response.data.refreshToken;
      } else if (response.data?.data?.user) {
        // Nested structure: { data: { data: { user, token, refreshToken } } }
        userData = response.data.data.user;
        tokenData = response.data.data.token;
        refreshTokenData = response.data.data.refreshToken;
      } else {
        console.error('Unexpected API response format:', response);
        throw new Error('Unexpected API response format');
      }
      
      if (!userData || !tokenData) {
        throw new Error('Invalid authentication response');
      }
      
      // Only store tokens if they exist
      const tokensToStore: [string, string][] = [
        ['authToken', tokenData]
      ];
      
      if (refreshTokenData) {
        tokensToStore.push(['refreshToken', refreshTokenData]);
      }
      
      await AsyncStorage.multiSet(tokensToStore);
      apiClient.setToken(tokenData);
      
      // Set current user
      this.currentUser = userData;
      this.notifyAuthStateChanged();
      
      console.log('User authenticated successfully');
      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extract meaningful error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Authentication failed. Please check your credentials and try again.';
      
      throw new Error(errorMessage);
    }
  }
  
  // Register new user
  async signup(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  }): Promise<User> {
    try {
      console.log('Starting registration with MongoDB backend');
      
      const response = await apiClient.post<any>('/auth/register', {
        ...userData,
        // Default user type to passenger
        role: 'passenger',
        userType: 'passenger'
      });
      
      // Enhanced handling of MongoDB response structure
      let user: User | null = null;
      let token: string | null = null;
      let refreshToken: string | null = null;
      
      if (response.data?.user) {
        // Direct structure
        user = response.data.user;
        token = response.data.token;
        refreshToken = response.data.refreshToken;
      } else if (response.data?.data?.user) {
        // Nested structure
        user = response.data.data.user;
        token = response.data.data.token;
        refreshToken = response.data.data.refreshToken;
      } else {
        console.error('Unexpected API response format during registration:', response);
        throw new Error('Invalid response format from registration endpoint');
      }
      
      if (!user || !token) {
        throw new Error('Registration successful but received invalid user data');
      }
      
      // Store tokens
      const tokensToStore: [string, string][] = [
        ['authToken', token]
      ];
      
      if (refreshToken) {
        tokensToStore.push(['refreshToken', refreshToken]);
      }
      
      await AsyncStorage.multiSet(tokensToStore);
      apiClient.setToken(token);
      
      // Set current user
      this.currentUser = user;
      this.notifyAuthStateChanged();
      
      console.log('Registration completed successfully');
      return user;
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Extract meaningful error message based on response format
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific error conditions
      if (error.response?.status === 409) {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      }
      
      throw new Error(errorMessage);
    }
  }
  
  // Get current authenticated user
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    try {
      // First check if we have a token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found, user needs to log in');
        return null;
      }
      
      // Set token in apiClient to ensure it's available for the request
      apiClient.setToken(token);
      
      try {
        console.log('Fetching current user from MongoDB backend');
        // Try using MongoDB's format - use any to handle all response types
        const response = await apiClient.get<any>('/auth/me');
        
        // Enhanced handling of response formats
        let userData: User | null = null;
        
        if (response?.data?.user) {
          // Format: { data: { user: {...} } }
          userData = response.data.user;
        } else if (response?.data?.data?.user) {
          // Format: { data: { data: { user: {...} } } }
          userData = response.data.data.user;
        } else if (response?.user) {
          // Format: { user: {...} }
          userData = response.user;
        } else if (response?.status === 'success' && response?.data) {
          // Format: { status: 'success', data: {...} }
          userData = response.data as unknown as User;
        } else if (response && typeof response === 'object' && 'id' in response) {
          // Direct user object format
          userData = response as unknown as User;
        }
        
        // If we successfully got user data, update local state
        if (userData && userData.id) {
          this.currentUser = userData;
          this.notifyAuthStateChanged();
          return this.currentUser;
        } else {
          console.error('Invalid or missing user data in response', response);
          throw new Error('Invalid response format from auth endpoint');
        }
      } catch (error: any) {
        // Check if this is an authentication error
        if (error.code === 401 || error.response?.status === 401) {
          console.log('Auth token invalid or expired, attempting refresh');
          
          // Try to use refresh token
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const refreshResponse = await apiClient.post<any>('/auth/refresh-token', { refreshToken });
              
              // Handle MongoDB response with nested data structure
              const newToken = refreshResponse?.data?.token;
              const newRefreshToken = refreshResponse?.data?.refreshToken;
              
              if (newToken) {
                // Got a new token, save it and retry
                await AsyncStorage.setItem('authToken', newToken);
                
                // If we also got a new refresh token, save that too
                if (newRefreshToken) {
                  await AsyncStorage.setItem('refreshToken', newRefreshToken);
                }
                
                apiClient.setToken(newToken);
                
                // Retry the original request
                return this.getCurrentUser();
              }
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError);
              // Clear tokens as they're invalid
              await this.logout();
            }
          } else {
            // No refresh token, clear auth state
            await this.logout();
          }
        }
        
        console.error('Error getting current user:', error);
        return null;
      }
    } catch (error: any) {
      console.error('Unexpected error in getCurrentUser:', error);
      return null;
    }
  }
  
  // Logout user
  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      // Clear auth tokens from both storage and apiClient
      await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
      apiClient.clearToken();
      this.currentUser = null;
      this.notifyAuthStateChanged();
    }
  }
  
  // Request password reset - Now using otpService
  async requestPasswordReset(email: string): Promise<OTPResponse> {
    return await otpService.requestPublicOTP({
      channel: 'email',
      type: 'passwordReset',
      email
    });
  }
  
  // Verify OTP code for password reset - Now using otpService
  async verifyOTP(userId: string, code: string, type: string): Promise<OTPResponse> {
    return await otpService.verifyPublicOTP({
      userId,
      code,
      type: type as 'passwordReset' | 'verification' | 'login'
    });
  }
  
  // Reset password with token
  async resetPassword(userId: string, resetToken: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      userId,
      resetToken,
      newPassword
    });
  }
  
  // Verify email or phone
  async verifyContact(userId: string, code: string, type: 'email' | 'phone'): Promise<void> {
    await apiClient.post('/otp/verify', {
      userId,
      code,
      type: 'verification'
    });
  }
  
  // Subscribe to auth state changes
  onAuthStateChanged(listener: (user: User | null) => void): () => void {
    this.authStateListeners.push(listener);
    
    // Initial call with current state
    if (this.currentUser !== undefined) {
      listener(this.currentUser);
    } else {
      // Try to load current user
      this.getCurrentUser().catch(console.error);
    }
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    };
  }
  
  // Notify all listeners of auth state change
  private notifyAuthStateChanged(): void {
    for (const listener of this.authStateListeners) {
      listener(this.currentUser);
    }
  }
  
  // Get auth token for requests
  async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('authToken');
    return token || '';
  }
}

export const authService = new AuthService();
