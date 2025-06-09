import { apiClient } from '../apiClient';

export interface EarningsSummary {
  total: number;
  available: number;
  pending: number;
  todayEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  totalRides: number;
  totalHours: number;
  currency: string;
  lastCashout?: {
    amount: number;
    date: Date;
    status: 'pending' | 'completed' | 'failed';
  };
}

export interface EarningsHistoryItem {
  _id: string;
  date: Date;
  amount: number;
  currency: string;
  rideId?: string;
  type: 'ride' | 'bonus' | 'cashout' | 'adjustment';
  description: string;
  status: 'pending' | 'completed';
}

export interface CashoutRequest {
  amount: number;
  paymentMethod: string;
  accountDetails?: {
    accountNumber?: string;
    bankCode?: string;
    mobileNumber?: string;
    provider?: string;
  };
}

export interface CashoutResponse {
  _id: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedArrivalTime: string;
  createdAt: Date;
  reference?: string;
  paymentProvider?: string;
}

export interface TodayEarnings {
  amount: number;
  totalTrips: number;
  currency: string;
}

export interface RiderStats {
  averageRating: number;
  totalTrips: number;
  completionRate: number;
  acceptanceRate: number;
}

class EarningsService {
  // Get rider's earnings summary
  async getEarningsSummary(): Promise<EarningsSummary> {
    try {
      // First we need to get the user ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      // Get the earnings summary from the MongoDB endpoint
      const response = await apiClient.get<{
        status: string;
        data: {
          summary: EarningsSummary
        }
      }>('/earnings/summary', {
        params: { riderId }
      });
      
      if (response.status !== 'success') {
        throw new Error('Failed to get earnings summary');
      }
      
      return response.data.summary;
    } catch (error) {
      console.error('Error fetching earnings summary:', error);
      
      // Return default empty summary for graceful fallback
      return {
        total: 0,
        available: 0,
        pending: 0,
        todayEarnings: 0,
        thisWeekEarnings: 0,
        thisMonthEarnings: 0,
        totalRides: 0,
        totalHours: 0,
        currency: 'NGN'
      };
    }
  }
  
  // Get rider's earnings history
  async getEarningsHistory(page: number = 1, limit: number = 20): Promise<EarningsHistoryItem[]> {
    try {
      // First we need to get the user ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      const response = await apiClient.get<{
        status: string;
        data: {
          transactions: EarningsHistoryItem[];
          pagination: {
            totalPages: number;
            currentPage: number;
            totalItems: number;
          }
        }
      }>('/earnings/history', {
        params: { 
          riderId,
          page,
          limit 
        }
      });
      
      if (response.status !== 'success') {
        throw new Error('Failed to get earnings history');
      }
      
      return response.data.transactions || [];
    } catch (error) {
      console.error('Error fetching earnings history:', error);
      return [];
    }
  }
  
  // Request cashout of available earnings
  async requestCashout(request: CashoutRequest): Promise<CashoutResponse> {
    try {
      // First we need to get the user ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      // Form the request to the MongoDB endpoint
      const response = await apiClient.post<{
        status: string;
        message: string;
        data: {
          cashout: CashoutResponse
        }
      }>('/earnings/cashout', {
        ...request,
        riderId
      });
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Cashout request failed');
      }
      
      return response.data.cashout;
    } catch (error: any) {
      console.error('Error requesting cashout:', error);
      throw new Error(error.response?.data?.message || 'Failed to request cashout. Please try again.');
    }
  }

  // Get today's earnings for dashboard
  async getTodayEarnings(): Promise<TodayEarnings> {
    try {
      // First we need to get the user ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      // Get today's earnings from the MongoDB endpoint
      const response = await apiClient.get<{
        status: string;
        data: {
          earnings: TodayEarnings
        }
      }>('/earnings/daily', {
        params: { riderId, date: new Date().toISOString().split('T')[0] }
      });
      
      if (response.status !== 'success') {
        throw new Error('Failed to get today\'s earnings');
      }
      
      return response.data.earnings;
    } catch (error) {
      console.error('Error fetching today\'s earnings:', error);
      
      // Return default empty earnings with realistic default currency
      return {
        amount: 0,
        totalTrips: 0,
        currency: 'NGN'
      };
    }
  }

  // Get rider statistics for dashboard
  async getRiderStats(): Promise<RiderStats> {
    try {
      // First we need to get the user ID
      const userInfo = await apiClient.get<{
        status: string;
        data: {
          user: {
            id: string;
          }
        }
      }>('/auth/me');
      
      if (userInfo.status !== 'success') {
        throw new Error('Failed to get user info');
      }
      
      const riderId = userInfo.data.user.id;
      
      // Get rider stats from the MongoDB endpoint - use correct endpoint
      const response = await apiClient.get<{
        status: string;
        data: {
          stats: RiderStats
        }
      }>('/users/rider-stats', {
        params: { riderId }
      });
      
      if (response.status !== 'success') {
        throw new Error('Failed to get rider stats');
      }
      
      return response.data.stats;
    } catch (error) {
      console.error('Error fetching rider stats:', error);
      
      // Instead of using mock data, show loading state and retry
      throw new Error('Failed to fetch rider statistics from server');
    }
  }
}

export const earningsService = new EarningsService();
