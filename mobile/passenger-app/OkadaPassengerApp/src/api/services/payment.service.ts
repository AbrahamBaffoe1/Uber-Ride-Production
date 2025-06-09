import { apiClient, ApiResponse } from '../client';
import { API_ENDPOINTS } from '../config';

// Type definitions
export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'cash' | 'mobile_money';
  isDefault: boolean;
  details: {
    lastFour?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
    bankName?: string;
    accountName?: string;
    provider?: string;
  };
}

export interface PaymentTransaction {
  id: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  rideId: string;
  method: 'card' | 'bank' | 'cash' | 'mobile_money';
  reference: string;
  createdAt: string;
}

export interface AddPaymentMethodRequest {
  type: PaymentMethod['type'];
  token?: string; // Token from payment processor for cards
  accountNumber?: string; // For bank accounts
  bankCode?: string; // For bank accounts
  phoneNumber?: string; // For mobile money
  provider?: string; // For mobile money
  makeDefault?: boolean;
}

class PaymentService {
  /**
   * Get all payment methods for current user
   * @returns Promise with payment methods
   */
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return apiClient.get<ApiResponse<PaymentMethod[]>>(
      API_ENDPOINTS.PAYMENT.METHODS
    );
  }

  /**
   * Add a new payment method
   * @param method Payment method details
   * @returns Promise with the new payment method
   */
  async addPaymentMethod(method: AddPaymentMethodRequest): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.post<ApiResponse<PaymentMethod>>(
      API_ENDPOINTS.PAYMENT.ADD_METHOD,
      method
    );
  }

  /**
   * Set a payment method as default
   * @param paymentMethodId ID of the payment method
   * @returns Promise with success/error status
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>(
      API_ENDPOINTS.PAYMENT.DEFAULT_METHOD,
      { paymentMethodId }
    );
  }

  /**
   * Process a payment for a ride
   * @param rideId ID of the ride
   * @param paymentMethodId ID of the payment method (optional, uses default if not provided)
   * @returns Promise with transaction details
   */
  async processPayment(rideId: string, paymentMethodId?: string): Promise<ApiResponse<PaymentTransaction>> {
    return apiClient.post<ApiResponse<PaymentTransaction>>(
      API_ENDPOINTS.PAYMENT.PROCESS_PAYMENT,
      { rideId, paymentMethodId }
    );
  }

  /**
   * Get payment transaction history
   * @param page Page number for pagination
   * @param limit Items per page
   * @returns Promise with array of transactions
   */
  async getPaymentHistory(page: number = 1, limit: number = 10): Promise<ApiResponse<PaymentTransaction[]>> {
    return apiClient.get<ApiResponse<PaymentTransaction[]>>(
      API_ENDPOINTS.PAYMENT.HISTORY,
      { page, limit }
    );
  }
}

// Export a singleton instance
export const paymentService = new PaymentService();
