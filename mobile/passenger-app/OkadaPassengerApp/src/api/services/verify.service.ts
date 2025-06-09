import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS } from '../config';

export interface SendVerificationCodeRequest {
  email: string;
}

export interface SendVerificationSMSRequest {
  phoneNumber: string;
}

export interface VerifyCodeRequest {
  code: string;
  email?: string;
  phoneNumber?: string;
}

export interface VerificationResponse {
  verificationToken: string;
  expiresAt: string;
}

/**
 * Service for handling user verification processes
 */
class VerifyService {
  /**
   * Send a verification code to a user's email
   * @param email User's email
   * @returns Promise with verification token
   */
  async sendVerificationCode(email: string): Promise<ApiResponse<VerificationResponse>> {
    return apiClient.post<ApiResponse<VerificationResponse>>(
      API_ENDPOINTS.VERIFY.SEND,
      { email }
    );
  }

  /**
   * Send a verification code via SMS
   * @param phoneNumber User's phone number
   * @returns Promise with verification token
   */
  async sendVerificationSMS(phoneNumber: string): Promise<ApiResponse<VerificationResponse>> {
    return apiClient.post<ApiResponse<VerificationResponse>>(
      API_ENDPOINTS.VERIFY.SEND_SMS,
      { phoneNumber }
    );
  }

  /**
   * Resend verification code to email
   * @param email User's email
   * @returns Promise with verification token
   */
  async resendVerificationCode(email: string): Promise<ApiResponse<VerificationResponse>> {
    return apiClient.post<ApiResponse<VerificationResponse>>(
      API_ENDPOINTS.VERIFY.RESEND,
      { email }
    );
  }

  /**
   * Resend verification code via SMS
   * @param phoneNumber User's phone number
   * @returns Promise with verification token
   */
  async resendVerificationSMS(phoneNumber: string): Promise<ApiResponse<VerificationResponse>> {
    return apiClient.post<ApiResponse<VerificationResponse>>(
      API_ENDPOINTS.VERIFY.RESEND_SMS,
      { phoneNumber }
    );
  }

  /**
   * Verify a code sent to email
   * @param verifyData Code and email
   * @returns Promise with success/error status
   */
  async verifyEmailCode(verifyData: VerifyCodeRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.VERIFY.EMAIL,
      verifyData
    );
  }

  /**
   * Verify a code sent to SMS
   * @param verifyData Code and phone number
   * @returns Promise with success/error status
   */
  async verifySMSCode(verifyData: VerifyCodeRequest): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.VERIFY.CHECK,
      verifyData
    );
  }

  /**
   * Complete registration with verification
   * @param userData Registration data with verification token
   * @returns Promise with registration data
   */
  async completeRegistration(userData: any): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
  }
}

// Export a singleton instance
export const verifyService = new VerifyService();
