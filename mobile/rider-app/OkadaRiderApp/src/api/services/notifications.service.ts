import { apiClient } from '../apiClient';
import { Platform } from 'react-native';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ride' | 'payment' | 'system' | 'promo';
  isRead: boolean;
  isArchived: boolean;
  customData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  ride: boolean;
  payment: boolean;
  system: boolean;
  promo: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
}

interface NotificationResponse {
  status: string;
  data: {
    notifications: Notification[];
    pagination?: {
      totalItems: number;
      currentPage: number;
      itemsPerPage: number;
      totalPages: number;
    }
  };
  message?: string;
}

interface NotificationCountResponse {
  status: string;
  data: {
    count: number;
  };
  message?: string;
}

class NotificationsService {
  /**
   * Get rider's notifications
   * @param page Page number for pagination
   * @param limit Number of notifications per page
   * @param type Optional notification type filter
   */
  async getNotifications(page: number = 1, limit: number = 20, type?: string): Promise<Notification[]> {
    try {
      const params: any = { page, limit, isArchived: false };
      if (type) params.type = type;
      
      const response = await apiClient.get<NotificationResponse>('/notifications', {
        params
      });
      
      if (response.status !== 'success' || !response.data.notifications) {
        console.error('Failed to get notifications:', response.message);
        return [];
      }
      
      // Transform string dates to Date objects
      return response.data.notifications.map(notification => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
        updatedAt: new Date(notification.updatedAt)
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }
  
  /**
   * Mark notifications as read
   * @param notificationIds Array of notification IDs to mark as read
   */
  async markAsRead(notificationIds: string[]): Promise<boolean> {
    try {
      const response = await apiClient.put<{status: string, message: string}>('/notifications/read', {
        notificationIds
      });
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return false;
    }
  }
  
  /**
   * Mark a single notification as read
   * @param notificationId ID of the notification to mark as read
   */
  async markOneAsRead(notificationId: string): Promise<boolean> {
    return this.markAsRead([notificationId]);
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const response = await apiClient.put<{status: string, message: string}>('/notifications/read/all');
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }
  
  /**
   * Archive notifications (soft delete)
   * @param notificationIds Array of notification IDs to archive
   */
  async archiveNotifications(notificationIds: string[]): Promise<boolean> {
    try {
      const response = await apiClient.put<{status: string, message: string}>('/notifications/archive', {
        notificationIds
      });
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error archiving notifications:', error);
      return false;
    }
  }
  
  /**
   * Archive a single notification
   * @param notificationId ID of the notification to archive
   */
  async archiveNotification(notificationId: string): Promise<boolean> {
    return this.archiveNotifications([notificationId]);
  }
  
  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<NotificationCountResponse>('/notifications/count');
      
      if (response.status !== 'success') {
        console.error('Failed to get unread count:', response.message);
        return 0;
      }
      
      return response.data.count;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }
  
  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await apiClient.get<{
        status: string, 
        data: {
          preferences: NotificationPreferences
        },
        message: string
      }>('/notifications/preferences');
      
      if (response.status !== 'success') {
        console.error('Failed to get notification preferences:', response.message);
        return null;
      }
      
      return response.data.preferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }
  
  /**
   * Update notification preferences
   * @param preferences NotificationPreferences object
   */
  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const response = await apiClient.put<{status: string, message: string}>('/notifications/preferences', {
        preferences
      });
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
  
  /**
   * Register push notification token
   * @param token Push notification token from Firebase/APNS
   */
  async registerPushToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{status: string, message: string}>('/notifications/push-token', {
        type: Platform.OS === 'ios' ? 'apns' : 'fcm',
        token,
        device: {
          platform: Platform.OS,
          model: Platform.OS,
          appVersion: '1.0.0' // This should be dynamically determined
        }
      });
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }
  
  /**
   * Unregister push notification token
   * @param token Push notification token to unregister
   */
  async unregisterPushToken(token: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<{status: string, message: string}>('/notifications/push-token', {
        data: { token }
      });
      
      return response.status === 'success';
    } catch (error) {
      console.error('Error unregistering push token:', error);
      return false;
    }
  }
}

export const notificationsService = new NotificationsService();
