/**
 * Authentication Constants
 * Centralized location for all authentication-related constants
 * to ensure consistency across the app
 */

// Storage keys for authentication tokens
export const AUTH_TOKEN_KEY = 'authToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

// Token related constants
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds

// Authentication statuses
export enum AuthStatus {
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
  LOADING = 'loading',
  ERROR = 'error'
}

// Authentication errors
export enum AuthErrorType {
  NETWORK_ERROR = 'network_error',
  INVALID_CREDENTIALS = 'invalid_credentials',
  SERVER_ERROR = 'server_error',
  TOKEN_EXPIRED = 'token_expired',
  UNKNOWN_ERROR = 'unknown_error'
}
