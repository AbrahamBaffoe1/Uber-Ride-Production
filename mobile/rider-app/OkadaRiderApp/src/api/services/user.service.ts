import { apiClient } from '../apiClient';
import { authService, User } from './authService';

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  profilePicture?: string;
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
  role: string;
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDetails {
  type?: string;
  registrationNumber?: string;
  model?: string;
  color?: string;
}

interface UserServiceResponse {
  status: string;
  data: {
    user: UserProfile;
  };
  message?: string;
}

interface ImageUploadResponse {
  status: string;
  data: {
    profilePicture: string;
  };
  message?: string;
}

class UserService {
  /**
   * Get the rider's profile information
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      // Use existing user data from auth service if available
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        return this.convertToUserProfile(currentUser);
      }
      
      // Otherwise fetch from API
      const response = await apiClient.get<UserServiceResponse>('/users/profile');
      
      if (response.status !== 'success') {
        console.error('Failed to get profile:', response.message);
        return null;
      }
      
      return this.convertToUserProfile(response.data.user);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  /**
   * Update the rider's profile information
   * @param profileData User profile data to update
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      // Remove _id field if it exists
      const { _id, ...updateData } = profileData;
      
      const response = await apiClient.patch<UserServiceResponse>('/users/profile', updateData);
      
      if (response.status !== 'success') {
        console.error('Failed to update profile:', response.message);
        return null;
      }
      
      return this.convertToUserProfile(response.data.user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }
  
  /**
   * Update the rider's vehicle details
   * @param vehicleDetails Vehicle details to update
   */
  async updateVehicleDetails(vehicleDetails: VehicleDetails): Promise<UserProfile | null> {
    try {
      const response = await apiClient.patch<UserServiceResponse>('/users/vehicle', {
        vehicleDetails
      });
      
      if (response.status !== 'success') {
        console.error('Failed to update vehicle details:', response.message);
        return null;
      }
      
      return this.convertToUserProfile(response.data.user);
    } catch (error) {
      console.error('Error updating vehicle details:', error);
      return null;
    }
  }
  
  /**
   * Update the rider's profile picture
   * @param imageUri URI of the profile image to upload
   */
  async updateProfileImage(imageUri: string): Promise<string | null> {
    try {
      const formData = new FormData();
      
      // Create file object from URI
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // @ts-ignore - formData.append has compatibility issues with TypeScript
      formData.append('profilePicture', {
        uri: imageUri,
        name: filename,
        type,
      });
      
      const response = await apiClient.post<ImageUploadResponse>(
        '/users/profile-picture',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      if (response.status !== 'success') {
        console.error('Failed to upload profile picture:', response.message);
        return null;
      }
      
      return response.data.profilePicture;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return null;
    }
  }
  
  /**
   * Change the rider's password
   * @param currentPassword Current password
   * @param newPassword New password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{
        status: string;
        message: string;
      }>('/users/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: newPassword
      });
      
      if (response.status !== 'success') {
        console.error('Failed to change password:', response.message);
      }
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }
  
  /**
   * Get documents required for rider verification
   */
  async getRequiredDocuments(): Promise<string[]> {
    try {
      const response = await apiClient.get<{
        status: string;
        data: {
          documents: string[];
        }
      }>('/users/required-documents');
      
      if (response.status !== 'success') {
        return [];
      }
      
      return response.data.documents;
    } catch (error) {
      console.error('Error getting required documents:', error);
      return [];
    }
  }
  
  /**
   * Upload a verification document
   * @param documentType Type of document
   * @param documentUri URI of the document image
   */
  async uploadDocument(documentType: string, documentUri: string): Promise<boolean> {
    try {
      const formData = new FormData();
      
      // Create file object from URI
      const filename = documentUri.split('/').pop() || `${documentType}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // @ts-ignore - formData.append has compatibility issues with TypeScript
      formData.append('document', {
        uri: documentUri,
        name: filename,
        type,
      });
      
      formData.append('documentType', documentType);
      
      const response = await apiClient.post<{
        status: string;
        message: string;
      }>(
        '/users/documents',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.status === 'success';
    } catch (error) {
      console.error(`Error uploading ${documentType} document:`, error);
      return false;
    }
  }
  
  // Helper method to convert user data to UserProfile
  private convertToUserProfile(user: User | UserProfile): UserProfile {
    // Create a base profile with required fields
    const profile: UserProfile = {
      _id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      email: user.email || '',
      role: user.role || 'rider',
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
    };
    
    // Add optional fields if they exist in the user object
    if ('address' in user && user.address) profile.address = user.address;
    if ('birthDate' in user && user.birthDate) profile.birthDate = user.birthDate;
    if ('gender' in user && user.gender) profile.gender = user.gender;
    if ('profilePicture' in user && user.profilePicture) profile.profilePicture = user.profilePicture;
    if ('riderProfile' in user && user.riderProfile) profile.riderProfile = user.riderProfile;
    if ('isVerified' in user) profile.isVerified = user.isVerified;
    if ('isPhoneVerified' in user) profile.isPhoneVerified = user.isPhoneVerified;
    if ('isEmailVerified' in user) profile.isEmailVerified = user.isEmailVerified;
    
    return profile;
  }
}

export const userService = new UserService();
