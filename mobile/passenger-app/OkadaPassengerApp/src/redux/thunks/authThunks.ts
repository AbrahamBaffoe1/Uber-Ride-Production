// The auth slice already defines thunks for all auth operations.
// This file re-exports them for a consistent API across the app.

import { 
  login, 
  register, 
  logoutUser, 
  fetchCurrentUser, 
  forgotPassword, 
  resetPassword,
  clearError,
  updateUserProfile,
  resetPasswordStatus
} from '../../redux/slices/authSlice';

// Re-export the auth thunks for consistency with other thunk files
export { 
  login as loginUser, 
  register as registerUser, 
  logoutUser,
  fetchCurrentUser as getCurrentUser,
  forgotPassword,
  resetPassword,
  clearError,
  updateUserProfile,
  resetPasswordStatus
};

/**
 * Check if user is authenticated by attempting to get current user
 * This is a convenience function that uses the fetchCurrentUser thunk
 */
export const checkAuth = () => {
  return fetchCurrentUser();
};
