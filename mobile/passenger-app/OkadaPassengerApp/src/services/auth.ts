import authService from './auth.service';

/**
 * Helper function to handle auth state changes
 * This acts as a bridge between the auth service and components
 * 
 * @param callback Function to be called when auth state changes
 * @returns Function to unsubscribe from auth state changes
 */
export const onAuthStateChanged = (callback: (user: any) => void): (() => void) => {
  // Set up subscription to auth service
  const unsubscribe = authService.onAuthStateChanged((isAuthenticated) => {
    if (isAuthenticated) {
      // If authenticated, get the user data
      const user = authService.getUser();
      callback(user);
    } else {
      // If not authenticated, pass null to indicate logged out state
      callback(null);
    }
  });
  
  return unsubscribe;
};

/**
 * Check if user is currently authenticated
 * @returns Promise<boolean> indicating auth state
 */
export const isAuthenticated = async (): Promise<boolean> => {
  return await authService.checkAuthState();
};

/**
 * Get current user synchronously (no API call)
 * @returns User object or null if not authenticated
 */
export const getCurrentUser = (): any => {
  return authService.getUser();
};

/**
 * Sign out the current user
 * @returns Promise that resolves when logout is complete
 */
export const signOut = async (): Promise<void> => {
  return await authService.logout();
};
