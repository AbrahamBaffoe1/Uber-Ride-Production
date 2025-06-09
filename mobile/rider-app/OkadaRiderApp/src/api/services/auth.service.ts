/**
 * Auth Service
 * Handles API calls for authentication, including OTP verification
 */
import { apiClient } from '../client';

// Auth endpoints
const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  REQUEST_OTP: '/auth/request-otp',
  VERIFY_OTP: '/otp/verify',
  RESET_PASSWORD_REQUEST: '/auth/reset-password-request',
  RESET_PASSWORD: '/auth/reset-password',
  REFRESH_TOKEN: '/auth/refresh-token',
  TWO_FACTOR: '/auth/two-factor',
};

// Register a new user
export const register = async (userData: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  countryCode?: string;
}) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.REGISTER, userData);
  return response.data;
};

// Login a user
export const login = async (credentials: {
  identifier: string; // email or phone
  password: string;
}) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, credentials);
  return response.data;
};

// Request an OTP
export const requestOTP = async (data: {
  identifier: string; // email or phone
  type: 'verification' | 'passwordReset' | 'login';
}) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.REQUEST_OTP, data);
  return response.data;
};

// Verify an OTP
export const verifyOTP = async (data: {
  userId: string;
  code: string;
  type: 'verification' | 'passwordReset' | 'login';
}) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.VERIFY_OTP, data);
  return response.data;
};

// Request a password reset
export const resetPasswordRequest = async (data: {
  identifier: string; // email or phone
}) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD_REQUEST, data);
  return response.data;
};

// Reset password with OTP
export const resetPassword = async (data: {
  userId: string;
  code: string;
  newPassword: string;
}) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD, data);
  return response.data;
};

// Refresh access token
export const refreshToken = async (refreshToken: string) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH_TOKEN, { refreshToken });
  return response.data;
};

// Toggle two-factor authentication
export const toggleTwoFactor = async (data: {
  userId: string;
  enable: boolean;
  method?: 'sms' | 'email';
}, token: string) => {
  const response = await apiClient.post(AUTH_ENDPOINTS.TWO_FACTOR, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Format OTP code from array to string
export const formatOtpCode = (otpArray: string[]): string => {
  return otpArray.join('');
};

// Check if string is an email
export const isEmail = (input: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
};

// Check if string is a phone number
export const isPhoneNumber = (input: string): boolean => {
  return /^\+\d{10,15}$/.test(input);
};

// Export as default object
const authService = {
  register,
  login,
  requestOTP,
  verifyOTP,
  resetPasswordRequest,
  resetPassword,
  refreshToken,
  toggleTwoFactor,
  formatOtpCode,
  isEmail,
  isPhoneNumber
};

export default authService;
