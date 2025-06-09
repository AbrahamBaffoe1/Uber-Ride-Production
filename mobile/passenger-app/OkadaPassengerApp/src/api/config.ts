/**
 * API Configuration
 * This file contains centralized configuration for the API endpoints
 */

// Set the base URL for all API calls based on environment
export const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:3001/api/v1/mongo'  // Development backend URL using MongoDB with Android emulator localhost
  : 'https://api.okada-transportation.com/api/v1/mongo'; // Production MongoDB URL

// WebSocket URL for real-time communication
export const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3001'
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
  RIDE: {
    REQUEST: '/rides',
    CANCEL: (id: string) => `/rides/${id}/cancel`,
    GET_BY_ID: (id: string) => `/rides/${id}`,
    HISTORY: '/rides/history',
    ACTIVE: '/rides/active',
    RATE: (id: string) => `/rides/${id}/rate`,
    TRACK: (id: string) => `/rides/${id}/track`,
  },
  PAYMENT: {
    METHODS: '/payments/methods',
    ADD_METHOD: '/payments/methods',
    DEFAULT_METHOD: '/payments/methods/default',
    PROCESS_PAYMENT: '/payments/process',
    HISTORY: '/payments/history',
  },
  USER: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPLOAD_PHOTO: '/users/profile/photo',
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

// API request timeout in milliseconds - increased to handle slow connections
export const REQUEST_TIMEOUT = 60000; // 60 seconds
