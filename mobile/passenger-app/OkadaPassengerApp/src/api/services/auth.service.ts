import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS } from '../config';

// Type definitions
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: string;
  profilePicture?: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  userId: string;
  code: string;
  newPassword: string;
}

class AuthService {
  /**
   * Register a new user
   * @param userData User registration data
   * @returns Promise with user data and token
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
    return apiClient.post<ApiResponse<RegisterResponse>>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
  }

  /**
   * Login a user
   * @param credentials Login credentials
   * @returns Promise with user data and token
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    // If login successful, store the token
    if (response.status === 'success' && response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    
    return response;
  }

  /**
   * Request password reset
   * @param email User's email
   * @returns Promise with success/error status
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email }
    );
  }

  /**
   * Reset password with token
   * @param resetData Token and new password
   * @returns Promise with success/error status
   */
  async resetPassword(resetData: ResetPasswordRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      resetData
    );
  }

  /**
   * Get current user profile
   * @returns Promise with user data
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return apiClient.get<ApiResponse<AuthUser>>(
      API_ENDPOINTS.AUTH.CURRENT_USER
    );
  }

  /**
   * Logout the current user
   * Clears the token from storage
   */
  async logout(): Promise<void> {
    // Call the logout endpoint if server needs to invalidate token
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.warn('Logout API call failed, continuing with client-side logout');
    }
    // Always clear the token locally even if server call fails
    apiClient.clearToken();
  }

  /**
   * Check if user is authenticated
   * @returns Promise with boolean indicating auth status
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.getCurrentUser();
      return response.status === 'success' && !!response.data;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const authService = new AuthService();
