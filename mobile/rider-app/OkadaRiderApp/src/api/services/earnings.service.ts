import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS } from '../config';

// Type definitions
export interface EarningsSummary {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalPaidOut: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  ridesCompleted: number;
  currency: string;
  lastPayoutDate?: string;
  lastPayoutAmount?: number;
}

export interface EarningsHistoryItem {
  id: string;
  type: 'ride_fare' | 'tip' | 'bonus' | 'adjustment' | 'payout';
  amount: number;
  status: 'pending' | 'available' | 'processing' | 'paid' | 'failed';
  date: string;
  description?: string;
  rideId?: string;
  rideDetails?: {
    pickupAddress: string;
    dropoffAddress: string;
  };
  currency: string;
}

export interface CashoutRequest {
  amount: number;
  payoutMethod: 'bank_transfer' | 'mobile_money' | 'cash';
  accountDetails?: any;
}

export interface CashoutResponse {
  id: string;
  amount: number;
  currency: string;
  status: 'requested' | 'processing' | 'completed' | 'failed' | 'canceled';
  payoutMethod: 'bank_transfer' | 'mobile_money' | 'cash';
  requestedAt: string;
  estimatedProcessingTime: string;
}

class EarningsService {
  async getEarningsSummary(): Promise<ApiResponse<EarningsSummary>> {
    return apiClient.get<ApiResponse<EarningsSummary>>(
      API_ENDPOINTS.RIDER.EARNINGS_SUMMARY
    );
  }
  
  async getEarningsHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<EarningsHistoryItem[]>> {
    return apiClient.get<ApiResponse<EarningsHistoryItem[]>>(
      API_ENDPOINTS.RIDER.EARNINGS_HISTORY,
      { page, limit }
    );
  }
  
  async requestCashout(cashoutData: CashoutRequest): Promise<ApiResponse<CashoutResponse>> {
    return apiClient.post<ApiResponse<CashoutResponse>>(
      API_ENDPOINTS.RIDER.CASHOUT,
      cashoutData
    );
  }
}

export const earningsService = new EarningsService();
