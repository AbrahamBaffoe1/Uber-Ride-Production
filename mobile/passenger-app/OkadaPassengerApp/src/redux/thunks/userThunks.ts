import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  userService, 
  UserProfile, 
  UpdateProfileRequest, 
  EmergencyContact 
} from '../../api/services/user.service';
import { 
  setUserProfile, 
  updateUserProfile as updateUserProfileAction, 
  setUserLoading,
  setUserError
} from '../../redux/slices/userSlice';
import { RootState } from '../../redux/store';

/**
 * Get user profile
 */
export const getUserProfile = createAsyncThunk(
  'user/getUserProfile',
  async (_, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await userService.getProfile();
      
      if (response.status === 'success' && response.data) {
        dispatch(setUserProfile(response.data));
        dispatch(setUserLoading(false));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get user profile');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Update user profile
 */
export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (profileData: UpdateProfileRequest, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await userService.updateProfile(profileData);
      
      if (response.status === 'success' && response.data) {
        dispatch(updateUserProfileAction(response.data));
        dispatch(setUserLoading(false));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update user profile');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = createAsyncThunk(
  'user/uploadProfilePhoto',
  async (imageUri: string, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await userService.uploadProfilePhoto(imageUri);
      
      if (response.status === 'success' && response.data) {
        dispatch(updateUserProfileAction({ photo: response.data.profilePicture }));
        dispatch(setUserLoading(false));
        return response.data.profilePicture;
      } else {
        throw new Error(response.message || 'Failed to upload profile photo');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Get emergency contacts
 */
export const getEmergencyContacts = createAsyncThunk(
  'user/getEmergencyContacts',
  async (_, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await userService.getEmergencyContacts();
      
      if (response.status === 'success' && response.data) {
        dispatch(setUserLoading(false));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get emergency contacts');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Add emergency contact
 */
export const addEmergencyContact = createAsyncThunk(
  'user/addEmergencyContact',
  async (contact: Omit<EmergencyContact, 'id'>, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await userService.addEmergencyContact(contact);
      
      if (response.status === 'success' && response.data) {
        // Update user profile with new emergency contact
        dispatch(updateUserProfileAction({
          emergencyContact: {
            name: response.data.name,
            phoneNumber: response.data.phoneNumber,
            relationship: response.data.relationship
          }
        }));
        dispatch(setUserLoading(false));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to add emergency contact');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Send SOS alert
 */
export const sendSOS = createAsyncThunk(
  'user/sendSOS',
  async (
    params: { 
      location: { latitude: number; longitude: number }; 
      message?: string 
    }, 
    { dispatch }
  ) => {
    const { location, message } = params;
    try {
      dispatch(setUserLoading(true));
      const response = await userService.sendSOS(location, message);
      
      if (response.status === 'success') {
        dispatch(setUserLoading(false));
        return true;
      } else {
        throw new Error(response.message || 'Failed to send SOS alert');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Report safety issue
 */
export const reportSafetyIssue = createAsyncThunk(
  'user/reportSafetyIssue',
  async (issue: {
    type: string;
    description: string;
    rideId?: string;
    location?: { latitude: number; longitude: number };
  }, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await userService.reportIssue(issue);
      
      if (response.status === 'success') {
        dispatch(setUserLoading(false));
        return true;
      } else {
        throw new Error(response.message || 'Failed to report safety issue');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);
