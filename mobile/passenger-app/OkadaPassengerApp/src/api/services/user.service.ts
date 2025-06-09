import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS } from '../config';
import { User } from './authService';

// Type definitions
export interface UserProfile extends User {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  emergencyContacts?: EmergencyContact[];
  profilePicture?: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
}

export interface UploadPhotoResponse {
  profilePicture: string;
}

class UserService {
  /**
   * Get user profile
   * @returns Promise with user profile data
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      return await apiClient.get<ApiResponse<UserProfile>>(
        API_ENDPOINTS.USER.PROFILE
      );
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param profileData Profile data to update
   * @returns Promise with updated user profile
   */
  async updateProfile(profileData: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    return apiClient.put<ApiResponse<UserProfile>>(
      API_ENDPOINTS.USER.UPDATE_PROFILE,
      profileData
    );
  }

  /**
   * Upload profile photo
   * Note: This would typically involve FormData for the image upload
   * @param imageUri Local URI of the image to upload
   * @returns Promise with the URL of the uploaded image
   */
  async uploadProfilePhoto(imageUri: string): Promise<ApiResponse<UploadPhotoResponse>> {
    // Create FormData for image upload
    const formData = new FormData();
    
    // Extract filename and type from uri
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    
    // Append image to FormData
    formData.append('photo', {
      uri: imageUri,
      name: `profile-photo.${fileType}`,
      type: `image/${fileType}`,
    } as any);
    
    // Make request with FormData
    return apiClient.post<ApiResponse<UploadPhotoResponse>>(
      API_ENDPOINTS.USER.UPLOAD_PHOTO,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  /**
   * Get emergency contacts
   * @returns Promise with array of emergency contacts
   */
  async getEmergencyContacts(): Promise<ApiResponse<EmergencyContact[]>> {
    return apiClient.get<ApiResponse<EmergencyContact[]>>(
      API_ENDPOINTS.SAFETY.EMERGENCY_CONTACTS
    );
  }

  /**
   * Add emergency contact
   * @param contact Emergency contact details
   * @returns Promise with the new contact
   */
  async addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<ApiResponse<EmergencyContact>> {
    return apiClient.post<ApiResponse<EmergencyContact>>(
      API_ENDPOINTS.SAFETY.EMERGENCY_CONTACTS,
      contact
    );
  }

  /**
   * Update emergency contact
   * @param contactId ID of contact to update
   * @param contact Updated contact details
   * @returns Promise with updated contact
   */
  async updateEmergencyContact(
    contactId: string, 
    contact: Omit<EmergencyContact, 'id'>
  ): Promise<ApiResponse<EmergencyContact>> {
    return apiClient.put<ApiResponse<EmergencyContact>>(
      `${API_ENDPOINTS.SAFETY.EMERGENCY_CONTACTS}/${contactId}`,
      contact
    );
  }

  /**
   * Delete emergency contact
   * @param contactId ID of contact to delete
   * @returns Promise with success status
   */
  async deleteEmergencyContact(contactId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(
      `${API_ENDPOINTS.SAFETY.EMERGENCY_CONTACTS}/${contactId}`
    );
  }

  /**
   * Send SOS alert
   * @param location Current location
   * @param message Optional message to include
   * @returns Promise with SOS response
   */
  async sendSOS(
    location: { latitude: number; longitude: number }, 
    message?: string
  ): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.SAFETY.SOS,
      { location, message }
    );
  }

  /**
   * Report safety issue
   * @param issue Issue details
   * @returns Promise with report response
   */
  async reportIssue(issue: {
    type: string;
    description: string;
    rideId?: string;
    location?: { latitude: number; longitude: number };
  }): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.SAFETY.REPORT_ISSUE,
      issue
    );
  }
}

// Export a singleton instance
export const userService = new UserService();
