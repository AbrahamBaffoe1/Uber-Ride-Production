import { apiClient } from '../apiClient';

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
  userId: string;
  type: string;
  isVerified: boolean;
  expiresAt: Date;
  attemptsLeft: number;
  cooldownEndsAt?: Date;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  userId?: string;
  expiresAt?: Date;
  cooldownEndsAt?: Date;
  resetToken?: string;
  attemptsLeft?: number;
  data?: {
    userId: string;
    expiresAt: Date;
    resetToken?: string;
  };
}

class OTPService {
  // Request OTP via SMS (authenticated users)
  async requestSMSOTP(params: Omit<OTPRequestParams, 'channel'>): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>('/otp/sms', {
      ...params,
      channel: 'sms'
    });
    return response;
  }

  // Request OTP via Email (authenticated users)
  async requestEmailOTP(params: Omit<OTPRequestParams, 'channel'>): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>('/otp/email', {
      ...params,
      channel: 'email'
    });
    return response;
  }

  // Verify OTP (authenticated users)
  async verifyOTP(params: OTPVerifyParams): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>('/otp/verify', params);
    return response;
  }

  // Resend OTP (authenticated users)
  async resendOTP(params: OTPRequestParams): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>('/otp/resend', params);
    return response;
  }

  // Get OTP status
  async getOTPStatus(userId: string, type: string): Promise<OTPStatus> {
    const response = await apiClient.get<OTPStatus>(`/otp/status/${userId}/${type}`);
    return response;
  }

  // Request OTP for public users (signup, password reset)
  async requestPublicOTP(params: OTPRequestParams): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>('/otp/public/request', params);
    return response;
  }

  // Verify OTP for public users
  async verifyPublicOTP(params: OTPVerifyParams): Promise<OTPResponse> {
    const response = await apiClient.post<OTPResponse>('/otp/public/verify', params);
    return response;
  }
}

export const otpService = new OTPService();
