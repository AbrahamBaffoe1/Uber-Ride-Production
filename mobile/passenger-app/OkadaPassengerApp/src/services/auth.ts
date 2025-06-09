import authService from './auth.service';

/**
 * Listen for authentication state changes
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChanged = (callback: (user: any) => void) => {
  return authService.onAuthStateChanged((isAuthenticated) => {
    if (isAuthenticated) {
      const user = authService.getUser();
      callback(user);
    } else {
      callback(null);
    }
  });
};

/**
 * Sign in with email/phone and password
 * @param identifier Email or phone
 * @param password User password
 */
export const signIn = async (identifier: string, password: string) => {
  return authService.login(identifier, password);
};

/**
 * Sign up a new user
 * @param userData User registration data
 */
export const signUp = async (userData: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
  countryCode?: string;
}) => {
  return authService.register(userData);
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  return authService.logout();
};

/**
 * Get the current user
 */
export const getCurrentUser = () => {
  return authService.getUser();
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return authService.getIsAuthenticated();
};

/**
 * Request password reset
 * @param identifier Email or phone
 */
export const requestPasswordReset = async (identifier: string) => {
  return authService.requestPasswordReset(identifier);
};

/**
 * Reset password with OTP
 * @param userId User ID
 * @param code OTP code
 * @param newPassword New password
 */
export const resetPassword = async (userId: string, code: string, newPassword: string) => {
  return authService.resetPassword(userId, code, newPassword);
};

/**
 * Verify OTP
 * @param userId User ID
 * @param code OTP code
 * @param type Verification type
 */
export const verifyOTP = async (userId: string, code: string, type: string = 'verification') => {
  return authService.verifyOTP(userId, code, type);
};

export default {
  onAuthStateChanged,
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  isAuthenticated,
  requestPasswordReset,
  resetPassword,
  verifyOTP
};
