/**
 * API Configuration
 * This file contains centralized configuration for the API endpoints
 */
import { Platform } from 'react-native';

// Set the base URL for all API calls
// In production, this would be changed to the actual API URL
export const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/api/v1/mongo'  // Android emulator needs this special IP to access host's localhost
    : 'http://localhost:3001/api/v1/mongo'  // iOS simulator or web can use localhost directly
  : 'https://api.okada-transportation.com/api/v1/mongo'; // Production MongoDB URL

// WebSocket URL for real-time communication
export const SOCKET_URL = __DEV__
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:3001'  // Android emulator needs this special IP to access host's localhost
    : 'http://localhost:3001' // iOS simulator or web can use localhost directly
  : 'https://api.okada-transportation.com';

// API endpoint paths organized by feature
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    FORGOT_PASSWORD: '/auth/reset-password-request',
    RESET_PASSWORD: '/auth/reset-password',
    CURRENT_USER: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  VERIFY: {
    SEND: '/verify/send',
    SEND_SMS: '/verify/send-sms',
    RESEND: '/verify/resend',
    RESEND_SMS: '/verify/resend-sms',
    EMAIL: '/verify/email',
    CHECK: '/verify/check',
  },
  RIDER: {
    EARNINGS_SUMMARY: '/riders/earnings/summary',
    EARNINGS_HISTORY: '/riders/earnings/history',
    CASHOUT: '/riders/earnings/cashout',
    UPDATE_LOCATION: '/riders/location',
    UPDATE_AVAILABILITY: '/riders/availability',
    AVAILABLE_RIDES: '/riders/rides/available',
    ACCEPT_RIDE: (id: string) => `/riders/rides/${id}/accept`,
    REJECT_RIDE: (id: string) => `/riders/rides/${id}/reject`,
    UPDATE_RIDE_STATUS: (id: string) => `/riders/rides/${id}/status`,
    ACTIVE_RIDE: '/riders/rides/active',
    RIDE_HISTORY: '/riders/rides/history'
  },
  LOCATION: {
    UPDATE: '/location/update',
    AVAILABLE: '/location/available',
    UNAVAILABLE: '/location/unavailable',
  },
  PAYMENT: {
    EARNINGS: '/payments/earnings',
    WITHDRAWALS: '/payments/withdrawals',
    REQUEST_WITHDRAWAL: '/payments/withdrawals/request',
    HISTORY: '/payments/history',
  },
  USER: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPLOAD_PHOTO: '/users/profile/photo',
    DOCUMENTS: '/users/documents',
    UPLOAD_DOCUMENT: '/users/documents',
  },
  SAFETY: {
    EMERGENCY_CONTACTS: '/safety/contacts',
    SOS: '/safety/sos',
    REPORT_ISSUE: '/safety/issues',
  },
};

// Common API request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// API request timeout in milliseconds
export const REQUEST_TIMEOUT = 60000; // 60 seconds - increased to handle slow SMS delivery
