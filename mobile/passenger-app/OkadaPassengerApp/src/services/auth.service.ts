import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';
import { API_ENDPOINTS } from '../api/config';

/**
 * Authentication Service
 * Handles user authentication, token management, and session state
 */
class AuthService {
  private authStateListeners: ((isAuthenticated: boolean) => void)[] = [];
  private currentUser: any = null;
  private isAuthenticated: boolean = false;

  /**
   * Initialize the auth service
   */
  constructor() {
    // Check for existing auth on startup
    this.checkAuthState();
  }

  /**
   * Check if user is authenticated by verifying stored tokens
   */
  async checkAuthState(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        this.setAuthState(false);
        return false;
      }
      
      // Validate token by fetching current user
      try {
        const userData = await this.getCurrentUser();
        this.currentUser = userData;
        this.setAuthState(true);
        return true;
      } catch (error) {
        console.log('Token validation failed:', error);
        // Clear invalid tokens
        await this.logout(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.setAuthState(false);
      return false;
    }
  }

  /**
   * Login with email/phone and password
   * @param identifier Email or phone number
   * @param password User password
   */
  async login(identifier: string, password: string): Promise<any> {
    try {
      // Validate inputs
      if (!identifier || !password) {
        throw new Error('Email/phone and password are required');
      }
      
      // Determine if identifier is email or phone
      const isEmail = identifier.includes('@');
      
      const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.LOGIN, {
        email: isEmail ? identifier : undefined,
        phoneNumber: !isEmail ? identifier : undefined,
        password
      });
      
      console.log('Login response:', response); // Debug log
      
      // Check if verification is required
      if (response?.requiresVerification || response?.data?.requiresVerification) {
        // Store temporary token for verification flow
        const tempToken = response.data?.tempToken || response.tempToken;
        if (tempToken) {
          await AsyncStorage.setItem('tempToken', tempToken);
        }
        
        return {
          requiresVerification: true,
          userId: response.data?.userId || response.userId,
          tempToken: tempToken,
          user: response.data?.user || response.user
        };
      }
      
      // Handle MongoDB response structure: { status: 'success', data: { user, token, refreshToken } }
      let token, refreshToken, user;
      
      // Check different response structures
      if (response?.data?.token) {
        // Response has data.token
        token = response.data.token;
        refreshToken = response.data.refreshToken || token;
        user = response.data.user;
      } else if (response?.token) {
        // Response has token directly
        token = response.token;
        refreshToken = response.refreshToken || token;
        user = response.user;
      } else {
        throw new Error('Invalid response format - no token received');
      }
      
      // Store tokens
      await AsyncStorage.multiSet([
        ['authToken', token],
        ['refreshToken', refreshToken]
      ]);
      
      console.log('Tokens stored successfully'); // Debug log
      
      // Update auth state
      this.currentUser = user;
      this.setAuthState(true);
      
      return response?.data || response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   * @param userData User registration data
   */
  async register(userData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    password: string;
    countryCode?: string;
  }): Promise<any> {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.REGISTER, userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Verify OTP for login or registration
   * @param userId User ID
   * @param code OTP code
   * @param type Verification type (login, verification, etc.)
   */
  async verifyOTP(userId: string, code: string, type: string = 'verification'): Promise<any> {
    try {
      const response = await apiClient.post<any>('/otp/verify', {
        userId,
        code,
        type
      });
      
      // If this was a login verification, store the tokens
      if (type === 'login' && response?.data?.tokens) {
        const { token, refreshToken } = response.data.tokens;
        await AsyncStorage.multiSet([
          ['authToken', token],
          ['refreshToken', refreshToken]
        ]);
        
        // Update auth state
        await this.getCurrentUser();
        this.setAuthState(true);
      }
      
      return response.data;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   * @param identifier Email or phone
   */
  async requestPasswordReset(identifier: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        identifier
      });
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password with OTP
   * @param userId User ID
   * @param code OTP code
   * @param newPassword New password
   */
  async resetPassword(userId: string, code: string, newPassword: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        userId,
        code,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<any> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.AUTH.CURRENT_USER);
      if (response?.data?.user) {
        this.currentUser = response.data.user;
      }
      return this.currentUser;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }
  
  /**
   * Update user profile
   * @param userData Partial user data to update
   */
  async updateProfile(userData: any): Promise<any> {
    try {
      const response = await apiClient.put<any>(API_ENDPOINTS.USER.UPDATE_PROFILE, userData);
      
      // Handle different response formats
      if (response?.data?.user) {
        this.currentUser = { ...this.currentUser, ...response.data.user };
        return { 
          success: true, 
          user: response.data.user 
        };
      } else if (response?.user) {
        this.currentUser = { ...this.currentUser, ...response.user };
        return { 
          success: true, 
          user: response.user 
        };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error };
    }
  }

  /**
   * Logout user
   * @param callApi Whether to call the logout API (true) or just clear local state (false)
   */
  async logout(callApi: boolean = true): Promise<void> {
    try {
      if (callApi) {
        try {
          await apiClient.post<any>(API_ENDPOINTS.AUTH.LOGOUT);
        } catch (logoutError) {
          console.warn('Logout API call failed:', logoutError);
          // Continue with local logout even if API call fails
        }
      }
      
      // Clear tokens and state
      await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
      this.currentUser = null;
      this.setAuthState(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure auth state is updated even if there's an error
      this.setAuthState(false);
      throw error;
    }
  }

  /**
   * Update auth state and notify listeners
   * @param isAuthenticated New auth state
   */
  private setAuthState(isAuthenticated: boolean): void {
    this.isAuthenticated = isAuthenticated;
    // Notify all listeners
    this.authStateListeners.forEach(listener => listener(isAuthenticated));
  }

  /**
   * Add auth state change listener
   * @param listener Function to call when auth state changes
   * @returns Function to remove the listener
   */
  onAuthStateChanged(listener: (isAuthenticated: boolean) => void): () => void {
    this.authStateListeners.push(listener);
    // Call immediately with current state
    listener(this.isAuthenticated);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current authentication state
   */
  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get current user data
   */
  getUser(): any {
    return this.currentUser;
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;
