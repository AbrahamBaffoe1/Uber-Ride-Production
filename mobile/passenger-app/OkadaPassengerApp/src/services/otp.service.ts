import { apiClient } from '../api/apiClient';
import { API_BASE_URL } from '../api/config';

export interface OTPRequestParams {
  channel: 'sms' | 'email';
  type: 'verification' | 'passwordReset' | 'login';
  email?: string;
  phoneNumber?: string;
  userId?: string;
}

export interface OTPVerifyParams {
  userId: string;
  code: string;
  type: 'verification' | 'passwordReset' | 'login';
}

export interface OTPStatus {
  _id: string;
  userId: string;
  type: string;
  isUsed: boolean;
  expiresAt: Date;
  attempts: number;
  identifier?: string;
  createdAt: Date;
  updatedAt: Date;
  messageId?: string;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface OTPResponse {
  success: boolean;
  message: string;
  userId?: string;
  expiresAt?: Date;
  cooldownEndsAt?: Date;
  resetToken?: string;
  attemptsLeft?: number;
  messageId?: string;
}

export interface MessageStatusResponse {
  success: boolean;
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered' | 'unknown';
  message?: string;
  timestamp?: Date;
}

class OTPService {
  // Request OTP via SMS (authenticated users)
  async requestSMSOTP(params: Omit<OTPRequestParams, 'channel'>): Promise<OTPResponse> {
    try {
      // Get the current user ID if not provided
      let userId = params.userId;
      if (!userId) {
        const userInfo = await apiClient.get<{
          status: string;
          data: {
            user: {
              id: string;
            }
          }
        }>('/auth/me');
        userId = userInfo.data.user.id;
      }
      
      console.log('Requesting SMS OTP with params:', {
        ...params,
        userId,
        channel: 'sms'
      });
      
      // Implement retry logic with exponential backoff
      const maxRetries = 2; // Maximum number of retries
      let retryCount = 0;
      let lastError: any = null;
      
      while (retryCount <= maxRetries) {
        try {
          // If this is a retry, add a small delay with exponential backoff
          if (retryCount > 0) {
            const delayMs = Math.pow(2, retryCount) * 1000; // 2s, 4s
            console.log(`Retry attempt ${retryCount} after ${delayMs}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          const response = await apiClient.post<{
            status: string;
            message: string;
            data: {
              expiresAt: string;
              cooldownEndsAt?: string;
              attemptsLeft?: number;
              messageId?: string;
            }
          }>('/otp/send', {
            ...params,
            userId,
            channel: 'sms'
          });
          
          return {
            success: response.status === 'success',
            message: response.message || 'OTP sent successfully to your phone',
            userId,
            expiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
            cooldownEndsAt: response.data?.cooldownEndsAt ? new Date(response.data.cooldownEndsAt) : undefined,
            attemptsLeft: response.data?.attemptsLeft,
            messageId: response.data?.messageId
          };
        } catch (error: any) {
          lastError = error;
          
          // Only retry on timeout or network errors, not on 4xx client errors
          if (error.code === 'ECONNABORTED' || 
              !error.response || 
              error.message.includes('timeout') || 
              error.message.includes('Network Error')) {
            retryCount++;
            console.warn(`SMS OTP request failed (attempt ${retryCount}/${maxRetries}):`, error.message);
          } else {
            // Don't retry on client errors or other issues
            break;
          }
        }
      }
      
      // If we got here, all retries failed
      console.error('Failed to request SMS OTP after retries:', lastError);
      return {
        success: false,
        message: lastError?.response?.data?.message || 'Failed to send OTP. Please check your connection and try again.'
      };
    } catch (error: any) {
      console.error('Failed to request SMS OTP:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP. Please try again.'
      };
    }
  }

  // Request OTP via Email (authenticated users)
  async requestEmailOTP(params: Omit<OTPRequestParams, 'channel'>): Promise<OTPResponse> {
    try {
      // Get the current user ID if not provided
      let userId = params.userId;
      if (!userId) {
        const userInfo = await apiClient.get<{
          status: string;
          data: {
            user: {
              id: string;
            }
          }
        }>('/auth/me');
        userId = userInfo.data.user.id;
      }
      
      console.log('Requesting Email OTP with params:', {
        ...params,
        userId,
        channel: 'email'
      });
      
      // Implement retry logic with exponential backoff
      const maxRetries = 2; // Maximum number of retries
      let retryCount = 0;
      let lastError: any = null;
      
      while (retryCount <= maxRetries) {
        try {
          // If this is a retry, add a small delay with exponential backoff
          if (retryCount > 0) {
            const delayMs = Math.pow(2, retryCount) * 1000; // 2s, 4s
            console.log(`Retry attempt ${retryCount} after ${delayMs}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
          const response = await apiClient.post<{
            status: string;
            message: string;
            data: {
              expiresAt: string;
              cooldownEndsAt?: string;
              attemptsLeft?: number;
              messageId?: string;
            }
          }>('/otp/send', {
            ...params,
            userId,
            channel: 'email'
          });
          
          return {
            success: response.status === 'success',
            message: response.message || 'OTP sent successfully to your email',
            userId,
            expiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
            cooldownEndsAt: response.data?.cooldownEndsAt ? new Date(response.data.cooldownEndsAt) : undefined,
            attemptsLeft: response.data?.attemptsLeft,
            messageId: response.data?.messageId
          };
        } catch (error: any) {
          lastError = error;
          
          // Only retry on timeout or network errors, not on 4xx client errors
          if (error.code === 'ECONNABORTED' || 
              !error.response || 
              error.message.includes('timeout') || 
              error.message.includes('Network Error')) {
            retryCount++;
            console.warn(`Email OTP request failed (attempt ${retryCount}/${maxRetries}):`, error.message);
          } else {
            // Don't retry on client errors or other issues
            break;
          }
        }
      }
      
      // If we got here, all retries failed
      console.error('Failed to request Email OTP after retries:', lastError);
      return {
        success: false,
        message: lastError?.response?.data?.message || 'Failed to send OTP. Please check your connection and try again.'
      };
    } catch (error: any) {
      console.error('Failed to request Email OTP:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP. Please try again.'
      };
    }
  }

  // Verify OTP (authenticated users)
  async verifyOTP(params: OTPVerifyParams): Promise<OTPResponse> {
    try {
      console.log('Verifying OTP with params:', params);
      
      const response = await apiClient.post<{
        status: string;
        message: string;
        data?: {
          resetToken?: string;
          attemptsLeft?: number;
        }
      }>('/otp/verify', params);
      
      return {
        success: response.status === 'success',
        message: response.message || 'OTP verified successfully',
        userId: params.userId,
        resetToken: response.data?.resetToken,
        attemptsLeft: response.data?.attemptsLeft
      };
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify OTP. Please try again.'
      };
    }
  }

  // Resend OTP (authenticated users)
  async resendOTP(params: OTPRequestParams): Promise<OTPResponse> {
    try {
      // Get the current user ID if not provided
      let userId = params.userId;
      if (!userId) {
        const userInfo = await apiClient.get<{
          status: string;
          data: {
            user: {
              id: string;
            }
          }
        }>('/auth/me');
        userId = userInfo.data.user.id;
      }
      
      // Use the mongo endpoint for better connectivity with temporary IDs
      console.log('Attempting to resend OTP with params:', {
        ...params,
        userId
      });
      
      const response = await apiClient.post<{
        status: string;
        message: string;
        data: {
          expiresAt: string;
          cooldownEndsAt?: string;
          attemptsLeft?: number;
          messageId?: string;
        }
      }>('/otp/resend', {
        ...params,
        userId
      });
      
      console.log('Resend OTP response:', response);
      
      return {
        success: response.status === 'success',
        message: response.message || `OTP resent successfully to your ${params.channel}`,
        userId,
        expiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
        cooldownEndsAt: response.data?.cooldownEndsAt ? new Date(response.data.cooldownEndsAt) : undefined,
        attemptsLeft: response.data?.attemptsLeft,
        messageId: response.data?.messageId
      };
    } catch (error: any) {
      console.error('Failed to resend OTP:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend OTP. Please try again later.'
      };
    }
  }

  // Get OTP status
  async getOTPStatus(userId: string, type: string): Promise<OTPStatus | null> {
    try {
      // Use the mongo endpoint for better connectivity with temporary IDs
      const response = await apiClient.get<{
        status: string;
        data: {
          otp: {
            _id: string;
            userId: string;
            type: string;
            isUsed: boolean;
            expiresAt: string;
            attempts: number;
            identifier?: string;
            messageId?: string;
            deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed';
            createdAt: string;
            updatedAt: string;
          }
        }
      }>(`/otp/status/${userId}/${type}`);
      
      console.log('OTP status response:', response);
      
      if (!response || response.status !== 'success' || !response.data?.otp) {
        console.warn('No valid OTP status found in response');
        return null;
      }
      
      // Convert date strings to Date objects
      return {
        _id: response.data.otp._id,
        userId: response.data.otp.userId,
        type: response.data.otp.type,
        isUsed: response.data.otp.isUsed,
        expiresAt: new Date(response.data.otp.expiresAt),
        attempts: response.data.otp.attempts,
        identifier: response.data.otp.identifier,
        messageId: response.data.otp.messageId,
        deliveryStatus: response.data.otp.deliveryStatus,
        createdAt: new Date(response.data.otp.createdAt),
        updatedAt: new Date(response.data.otp.updatedAt)
      };
    } catch (error: any) {
      console.error('Failed to get OTP status:', error);
      throw error;
    }
  }
  
  /**
   * Check the delivery status of a message
   * Uses the SMS service's delivery status API
   * @param messageId - The message ID to check
   * @returns Promise<MessageStatusResponse>
   */
  async checkMessageDeliveryStatus(messageId: string): Promise<MessageStatusResponse> {
    try {
      const response = await apiClient.get<{
        status: string;
        data: {
          messageId: string;
          status: 'pending' | 'sent' | 'delivered' | 'failed' | 'undelivered' | 'unknown';
          timestamp?: string;
          provider?: string;
          error?: string;
        }
      }>(`/sms/status/${messageId}`);
      
      if (response.status !== 'success') {
        return {
          success: false,
          messageId,
          status: 'unknown',
          message: 'Failed to retrieve status information'
        };
      }
      
      return {
        success: true,
        messageId: response.data.messageId,
        status: response.data.status,
        message: response.data.error,
        timestamp: response.data.timestamp ? new Date(response.data.timestamp) : undefined
      };
    } catch (error: any) {
      console.error('Failed to check message delivery status:', error);
      return {
        success: false,
        messageId,
        status: 'unknown',
        message: error.response?.data?.message || 'Network error while checking status'
      };
    }
  }

  // Request OTP for public users (signup, password reset)
  async requestPublicOTP(params: OTPRequestParams): Promise<OTPResponse> {
    try {
      console.log('Requesting public OTP with params:', params);
      
      const response = await apiClient.post<{
        status: string;
        message: string;
        data: {
          userId?: string;
          expiresAt?: string;
          cooldownEndsAt?: string;
          attemptsLeft?: number;
          messageId?: string;
        }
      }>('/otp/public/request', {
        ...params
      });
      
      return {
        success: response.status === 'success',
        message: response.message || `OTP sent successfully to your ${params.channel}`,
        userId: response.data?.userId,
        expiresAt: response.data?.expiresAt ? new Date(response.data.expiresAt) : undefined,
        cooldownEndsAt: response.data?.cooldownEndsAt ? new Date(response.data.cooldownEndsAt) : undefined,
        attemptsLeft: response.data?.attemptsLeft,
        messageId: response.data?.messageId
      };
    } catch (error: any) {
      console.error('Failed to request public OTP:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send OTP. Please try again.'
      };
    }
  }

  // Verify OTP for public users
  async verifyPublicOTP(params: OTPVerifyParams): Promise<OTPResponse> {
    try {
      console.log('Verifying public OTP with params:', params);
      
      const response = await apiClient.post<{
        status: string;
        message: string;
        data?: {
          resetToken?: string;
          attemptsLeft?: number;
        }
      }>('/otp/public/verify', params);
      
      return {
        success: response.status === 'success',
        message: response.message || 'OTP verified successfully',
        userId: params.userId,
        resetToken: response.data?.resetToken,
        attemptsLeft: response.data?.attemptsLeft
      };
    } catch (error: any) {
      console.error('Failed to verify public OTP:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify OTP. Please try again.'
      };
    }
  }
}

export const otpService = new OTPService();
