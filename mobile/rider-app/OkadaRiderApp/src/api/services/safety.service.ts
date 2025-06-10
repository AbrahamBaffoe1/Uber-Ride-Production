import { apiClient, ApiError, ApiResponse } from '../client';

export interface EmergencyContact {
  id?: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isPrimary: boolean;
  createdAt?: Date;
}

export interface SOSAlert {
  id?: string;
  situation: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rideId?: string;
  createdAt?: Date;
}

export interface SafetyIncident {
  id?: string;
  type: string;
  description: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rideId?: string;
  media?: string[];
  status?: string;
  createdAt?: Date;
}

/**
 * Trigger an SOS alert
 * @param location Current location coordinates
 * @param situation Description of the emergency situation
 * @param rideId Optional ride ID if during a ride
 * @returns Promise with SOS alert data
 */
const triggerSOS = async (
  location: { latitude: number; longitude: number },
  situation?: string,
  rideId?: string
): Promise<{ sosId: string; createdAt: Date }> => {
  try {
    const response = await apiClient.post<ApiResponse<{ sosId: string; createdAt: Date }>>('/safety/sos', {
      location,
      situation: situation || 'Emergency assistance needed',
      rideId
    });
    
    if (!response.data) {
      throw new Error('Invalid response: Missing data');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error triggering SOS alert:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    throw new Error('Failed to trigger SOS alert. Please try another method to get help.');
  }
};

/**
 * Get active SOS alerts for the current user
 * @returns Promise with active SOS alerts
 */
const getActiveSOS = async (): Promise<SOSAlert[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ alerts: SOSAlert[] }>>('/safety/sos/active');
    
    if (!response.data || !response.data.alerts) {
      return [];
    }
    
    return response.data.alerts;
  } catch (error: any) {
    console.error('Error fetching active SOS alerts:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    return [];
  }
};

/**
 * Cancel an active SOS alert
 * @param sosId SOS alert ID
 * @param reason Reason for cancellation
 * @returns Promise with success/failure
 */
const cancelSOS = async (sosId: string, reason?: string): Promise<boolean> => {
  try {
    await apiClient.put(`/safety/sos/${sosId}/cancel`, { reason });
    return true;
  } catch (error: any) {
    console.error('Error cancelling SOS alert:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    return false;
  }
};

/**
 * Get user's emergency contacts
 * @returns Promise with emergency contacts
 */
const getEmergencyContacts = async (): Promise<EmergencyContact[]> => {
  try {
    const response = await apiClient.get<ApiResponse<{ contacts: EmergencyContact[] }>>('/safety/emergency-contacts');
    
    if (!response.data || !response.data.contacts) {
      return [];
    }
    
    return response.data.contacts;
  } catch (error: any) {
    console.error('Error fetching emergency contacts:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    return [];
  }
};

/**
 * Add a new emergency contact
 * @param contact Emergency contact data
 * @returns Promise with added contact
 */
const addEmergencyContact = async (contact: EmergencyContact): Promise<EmergencyContact | null> => {
  try {
    const response = await apiClient.post<ApiResponse<{ contact: EmergencyContact }>>('/safety/emergency-contacts', contact);
    
    if (!response.data || !response.data.contact) {
      return null;
    }
    
    return response.data.contact;
  } catch (error: any) {
    console.error('Error adding emergency contact:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    throw new Error('Failed to add emergency contact');
  }
};

/**
 * Update an existing emergency contact
 * @param contactId Contact ID
 * @param updates Contact data updates
 * @returns Promise with updated contact
 */
const updateEmergencyContact = async (contactId: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact | null> => {
  try {
    const response = await apiClient.put<ApiResponse<{ contact: EmergencyContact }>>(`/safety/emergency-contacts/${contactId}`, updates);
    
    if (!response.data || !response.data.contact) {
      return null;
    }
    
    return response.data.contact;
  } catch (error: any) {
    console.error('Error updating emergency contact:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    throw new Error('Failed to update emergency contact');
  }
};

/**
 * Delete an emergency contact
 * @param contactId Contact ID
 * @returns Promise with success/failure
 */
const deleteEmergencyContact = async (contactId: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/safety/emergency-contacts/${contactId}`);
    return true;
  } catch (error: any) {
    console.error('Error deleting emergency contact:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    return false;
  }
};

/**
 * Report a safety incident
 * @param incident Incident data
 * @returns Promise with incident ID
 */
const reportIncident = async (incident: {
  type: string;
  description: string;
  location?: { latitude: number; longitude: number };
  rideId?: string;
  media?: string[];
}): Promise<{ incidentId: string; createdAt: Date } | null> => {
  try {
    const response = await apiClient.post<ApiResponse<{ incidentId: string; createdAt: Date }>>('/safety/report-incident', incident);
    
    if (!response.data) {
      return null;
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error reporting safety incident:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    throw new Error('Failed to report safety incident');
  }
};

/**
 * Get user's safety incidents
 * @param page Page number for pagination
 * @param limit Items per page
 * @returns Promise with incidents and pagination data
 */
const getSafetyIncidents = async (page: number = 1, limit: number = 10): Promise<{
  incidents: SafetyIncident[];
  pagination: { totalItems: number; totalPages: number; currentPage: number };
}> => {
  try {
    const response = await apiClient.get<ApiResponse<{
      incidents: SafetyIncident[];
      pagination: { totalItems: number; totalPages: number; currentPage: number };
    }>>('/safety/incidents', { params: { page, limit } });
    
    if (!response.data) {
      return { incidents: [], pagination: { totalItems: 0, totalPages: 0, currentPage: page } };
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching safety incidents:', error);
    
    if (error instanceof ApiError) {
      console.error(`API error (${error.code}): ${error.message}`);
    }
    
    return { incidents: [], pagination: { totalItems: 0, totalPages: 0, currentPage: page } };
  }
};

export const safetyService = {
  triggerSOS,
  getActiveSOS,
  cancelSOS,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  reportIncident,
  getSafetyIncidents
};

export default safetyService;
