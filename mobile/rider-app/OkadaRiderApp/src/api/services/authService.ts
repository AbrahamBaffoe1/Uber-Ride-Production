import { apiClient } from '../apiClient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { otpService, OTPResponse } from './otpService';
import { API_BASE_URL } from '../config';
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../constants/auth';
import { enhancedNetworkService } from '../../services/enhanced-network.service';

export interface User {
  _id: string;
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isActive?: boolean;
  role?: string;
  country?: string;
  riderProfile?: {
    vehicleDetails?: {
      type?: string;
      registrationNumber?: string;
      model?: string;
      color?: string;
    };
    averageRating?: number;
    isApproved?: boolean;
    completedRides?: number;
  };
  metaData?: {
    lastLogin?: Date;
    deviceInfo?: string;
    appVersion?: string;
  };
  profilePicture?: string;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
  message?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authStateListeners: ((user: User | null) => void)[] = [];

  // Login with email/phone and password - Using MongoDB backend
  async login(identifier: string, password: string): Promise<User> {
    try {
      console.log(`Attempting login at: ${API_BASE_URL}/auth/login`);
      console.log('Login payload:', { identifier, password: '******' });
      
      // Ensure identifier is not undefined or empty
      if (!identifier) {
        throw new Error('Email or phone number is required for login');
      }
      
      // Ensure password is not undefined or empty
      if (!password) {
        throw new Error('Password is required for login');
      }
      
      // Determine if identifier is email or phone
      const isEmail = identifier.includes('@');
      
      // Log login attempt type for debugging
      console.log('Login attempt with:', {
        email: isEmail ? identifier : 'N/A',
        loginMethod: isEmail ? 'email' : 'phone',
        passwordLength: password.length,
        phone: !isEmail ? identifier : 'N/A'
      });
      
      const loginPayload = {
        [isEmail ? 'email' : 'phoneNumber']: identifier,
        password: password
      };
      
      console.log('Sending login request with payload:', { ...loginPayload, password: '******' });
      
      const response = await axios.post(`${API_BASE_URL}/auth/login`, loginPayload);
      
      // Extract API response from axios response object
      const apiResponse = response.data;
      
      // Handle various response formats from MongoDB backend
      if (!apiResponse || 
          (apiResponse.status && apiResponse.status !== 'success') ||
          !apiResponse.data) {
        console.error('Login failed with response:', apiResponse);
        throw new Error(apiResponse?.message || 'Authentication failed');
      }
      
      // Map backend user format to our app's User format and enforce 'rider' role
      const user: User = {
        _id: apiResponse.data.user.id,
        email: apiResponse.data.user.email,
        firstName: apiResponse.data.user.firstName,
        lastName: apiResponse.data.user.lastName,
        phoneNumber: apiResponse.data.user.phoneNumber,
        // Always use 'rider' role for this app regardless of what the API returns
        role: 'rider',
        profilePicture: apiResponse.data.user.profilePicture,
        country: apiResponse.data.user.country,
        isPhoneVerified: apiResponse.data.user.isPhoneVerified,
        isEmailVerified: apiResponse.data.user.isEmailVerified
      };
      
      // Log user role for debugging
      console.log('User is logged in as:', user.role);
      
      console.log('User authenticated successfully with MongoDB');
      
      // Store tokens
      await AsyncStorage.multiSet([
        [AUTH_TOKEN_KEY, apiResponse.data.token],
        [REFRESH_TOKEN_KEY, apiResponse.data.refreshToken]
      ]);
      
      this.currentUser = user;
      this.notifyAuthStateChanged();
      
      return user;
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data
      });
      
      // Handle network errors
      if (error.message === 'Network Error') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      // Handle invalid credentials
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      
      // Better error handling to show meaningful messages to users
      const errorMessage = error.response?.data?.message || 
                          'Authentication failed. Please check your credentials and try again.';
      
      throw new Error(errorMessage);
    }
  }
  
  // Signup with email/password - Using MongoDB backend
  async signup(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    country?: string;
    role?: string;
    userType?: string;
  }): Promise<User> {
    try {
      console.log('Starting user registration with MongoDB backend');
      
      // Ensure we use the MongoDB endpoint for registration
      const response = await apiClient.post<{
        status: string;
        message: string;
        data: {
          user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            phoneNumber?: string;
            role: string;
            country?: string;
          };
          token: string;
          refreshToken?: string;
        };
      }>('/auth/register', {
        ...userData,
        // Default role and userType if not provided
        role: userData.role || 'rider',
        userType: userData.userType || 'rider'
      });
      
      if (response.status !== 'success') {
        console.error('Registration failed with status:', response.status);
        throw new Error(response.message || 'Registration failed');
      }
      
      console.log('User registered successfully with MongoDB backend');
      
      // Map backend user format to our app's User format and enforce 'rider' role
      const user: User = {
        _id: response.data.user.id,
        email: response.data.user.email,
        firstName: response.data.user.firstName,
        lastName: response.data.user.lastName,
        phoneNumber: response.data.user.phoneNumber,
        // Always set role to 'rider' for this app
        role: 'rider',
        // Add additional fields
        country: response.data.user.country
      };
      
      // Log user role for debugging
      console.log('User is registered as:', user.role);
      
      // Store tokens - MongoDB auth should return both tokens
      const tokensToStore: [string, string][] = [
        [AUTH_TOKEN_KEY, response.data.token]
      ];
      
      if (response.data.refreshToken) {
        tokensToStore.push([REFRESH_TOKEN_KEY, response.data.refreshToken]);
        console.log('Refresh token received and stored');
      } else {
        console.warn('No refresh token received during registration');
      }
      
      await AsyncStorage.multiSet(tokensToStore);
      
      this.currentUser = user;
      this.notifyAuthStateChanged();
      
      console.log('User authentication completed');
      return user;
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        response: error.response?.data
      });
      
      // Handle conflict errors (409)
      if (error.response?.status === 409) {
        throw new Error('This email or phone number is already in use. Please try with different credentials.');
      }
      
      // Check for validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const firstError = validationErrors[0]?.msg || 'Validation error';
        throw new Error(firstError);
      }
      
      // Handle network errors
      if (error.message === 'Network Error') {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw new Error(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  }
  
  // Get current user - Using MongoDB backend
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return null;
      }
      
      const response = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            phoneNumber?: string;
            role: string;
            profilePicture?: string;
            isEmailVerified?: boolean;
            isPhoneVerified?: boolean;
            createdAt?: string;
            updatedAt?: string;
            country?: string;
          };
        };
      }>('/auth/me');
      
      if (response.status !== 'success') {
        throw new Error('Failed to get current user');
      }
      
      // Map backend user format to our app's User format and enforce 'rider' role
      // Also automatically mark users as verified since we're not using OTP verification anymore
      const user: User = {
        _id: response.data.user.id,
        email: response.data.user.email,
        firstName: response.data.user.firstName,
        lastName: response.data.user.lastName,
        phoneNumber: response.data.user.phoneNumber,
        // Always set role to 'rider' for this app
        role: 'rider',
        profilePicture: response.data.user.profilePicture,
        // Auto-verify all riders since OTP verification is removed
        isEmailVerified: true,
        isPhoneVerified: true,
        country: response.data.user.country,
        createdAt: response.data.user.createdAt ? new Date(response.data.user.createdAt) : undefined,
        updatedAt: response.data.user.updatedAt ? new Date(response.data.user.updatedAt) : undefined
      };
      
      this.currentUser = user;
      this.notifyAuthStateChanged();
      
      return user;
    } catch (error: any) {
      // If unauthorized, clear tokens
      if (error.response?.status === 401) {
        await this.logout();
      }
      console.error('Error getting current user:', error);
      return null;
    }
  }
  
  // Logout - Using MongoDB backend
  async logout(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      this.currentUser = null;
      this.notifyAuthStateChanged();
    }
  }
  
  // Request password reset - Using otpService and MongoDB backend
  async requestPasswordReset(payload: { identifier: string }): Promise<OTPResponse> {
    // Determine if the identifier is an email or phone number
    const isEmail = payload.identifier.includes('@');
    
    return await otpService.requestPublicOTP({
      channel: isEmail ? 'email' : 'sms',
      type: 'passwordReset',
      ...(isEmail ? { email: payload.identifier } : { phoneNumber: payload.identifier })
    });
  }
  
  // Verify OTP code - Using otpService and MongoDB backend
  async verifyOTP(userId: string, code: string, type: string): Promise<OTPResponse> {
    return await otpService.verifyPublicOTP({
      userId,
      code,
      type: type as 'passwordReset' | 'verification' | 'login'
    });
  }
  
  // Request verification code for email or phone - Using MongoDB backend
  async requestVerificationCode(
    userId: string, 
    contactType: 'email' | 'phone', 
    contactInfo?: string
  ): Promise<OTPResponse> {
    try {
      console.log(`Requesting verification code for ${contactType}:`, contactInfo || 'from user profile');
      
      // Get current user if not provided
      if (!contactInfo) {
        const user = await this.getCurrentUser();
        if (!user) {
          throw new Error('User not found');
        }
        
        contactInfo = contactType === 'email' ? user.email : user.phoneNumber;
      }
      
      if (!contactInfo) {
        throw new Error(`User ${contactType} is not available`);
      }
      
      // Use the appropriate OTP endpoint for sending verification codes
      if (contactType === 'email') {
        return await otpService.requestEmailOTP({
          userId,
          type: 'verification',
          email: contactInfo
        });
      } else {
        return await otpService.requestSMSOTP({
          userId,
          type: 'verification',
          phoneNumber: contactInfo
        });
      }
    } catch (error: any) {
      console.error(`Error requesting ${contactType} verification code:`, error);
      throw new Error(error.response?.data?.message || 'Failed to send verification code. Please try again.');
    }
  }
  
  // Resend verification code - Using MongoDB backend
  async resendVerificationCode(
    userId: string, 
    contactType: 'email' | 'phone', 
    contactInfo?: string
  ): Promise<OTPResponse> {
    try {
      console.log(`Resending verification code for ${contactType}:`, contactInfo || 'from user profile');
      
      // Get current user if not provided
      if (!contactInfo) {
        const user = await this.getCurrentUser();
        if (!user) {
          throw new Error('User not found');
        }
        
        contactInfo = contactType === 'email' ? user.email : user.phoneNumber;
      }
      
      if (!contactInfo) {
        throw new Error(`User ${contactType} is not available`);
      }
      
      // Use the OTP service to resend the verification code
      if (contactType === 'email') {
        return await otpService.requestEmailOTP({
          userId,
          type: 'verification',
          email: contactInfo
        });
      } else {
        return await otpService.requestSMSOTP({
          userId,
          type: 'verification',
          phoneNumber: contactInfo
        });
      }
    } catch (error: any) {
      console.error(`Error resending ${contactType} verification code:`, error);
      throw new Error(error.response?.data?.message || 'Failed to resend verification code. Please try again.');
    }
  }
  
  // Reset password with token - Using MongoDB backend
  async resetPassword(userId: string, resetToken: string, newPassword: string): Promise<void> {
    try {
      const response = await apiClient.post<{
        status: string;
        message: string;
      }>('/auth/reset-password', {
        userId,
        resetToken,
        newPassword,
        confirmPassword: newPassword // Adding this since the backend may require it
      });
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Password reset failed');
      }
      
      console.log('Password reset successful');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    }
  }
  
  // Update rider profile - Using MongoDB backend
  async updateProfile(profileData: Partial<User>): Promise<User> {
    try {
      // Remove _id from the data if it exists
      const { _id, ...updateData } = profileData;
      
      const response = await apiClient.patch<{
        status: string;
        message: string;
        data: {
          user: User;
        };
      }>('/users/profile', updateData);
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Profile update failed');
      }
      
      // Update current user with new data
      const updatedUser = response.data.user;
      this.currentUser = updatedUser;
      this.notifyAuthStateChanged();
      
      return updatedUser;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile. Please try again.');
    }
  }
  
  // Update rider vehicle details - Using MongoDB backend
  async updateVehicleDetails(vehicleDetails: {
    type?: string;
    registrationNumber?: string;
    model?: string;
    color?: string;
  }): Promise<User> {
    try {
      const response = await apiClient.patch<{
        status: string;
        message: string;
        data: {
          user: User;
        };
      }>('/users/vehicle', {
        vehicleDetails
      });
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Vehicle details update failed');
      }
      
      // Update current user with new data
      const updatedUser = response.data.user;
      this.currentUser = updatedUser;
      this.notifyAuthStateChanged();
      
      return updatedUser;
    } catch (error: any) {
      console.error('Error updating vehicle details:', error);
      throw new Error(error.response?.data?.message || 'Failed to update vehicle details. Please try again.');
    }
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
  
  // Notify listeners of auth state change
  private notifyAuthStateChanged(): void {
    for (const listener of this.authStateListeners) {
      listener(this.currentUser);
    }
  }
  
  // Get auth token (used by RidesScreen)
  async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token || '';
  }
  
  // Refresh token (used by RidesScreen) - Using MongoDB backend
  async handleTokenRefresh(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post<{
        status: string;
        data: {
          token: string;
          refreshToken: string;
        };
      }>('/auth/refresh-token', {
        refreshToken
      });
      
      if (response.status !== 'success') {
        throw new Error('Token refresh failed');
      }
      
      // Store new access token
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
      
      // Store new refresh token (always provided with our updated backend)
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.logout();
      throw error;
    }
  }
  
  // Check if user is verified (email or phone) - Always returns true since verification is removed
  async checkVerificationStatus(): Promise<{isEmailVerified: boolean, isPhoneVerified: boolean}> {
    // Always return true for verification status since we removed OTP verification for riders
    return {
      isEmailVerified: true,
      isPhoneVerified: true
    };
  }
  
  // Upload profile picture - Using MongoDB backend
  async uploadProfilePicture(imageUri: string): Promise<string> {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('profilePicture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile-picture.jpg'
      } as any);
      
      const response = await apiClient.post<{
        status: string;
        data: {
          profilePicture: string;
        };
      }>('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status !== 'success') {
        throw new Error('Failed to upload profile picture');
      }
      
      // Update the profile picture in the current user object
      if (this.currentUser) {
        this.currentUser.profilePicture = response.data.profilePicture;
        this.notifyAuthStateChanged();
      }
      
      return response.data.profilePicture;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
