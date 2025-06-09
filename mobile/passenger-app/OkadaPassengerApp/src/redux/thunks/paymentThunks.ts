import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  paymentService, 
  PaymentMethod, 
  AddPaymentMethodRequest, 
  PaymentTransaction 
} from '../../api/services/payment.service';
import { 
  setPaymentMethods, 
  addPaymentMethod as addPaymentMethodAction, 
  setDefaultPaymentMethod,
  removePaymentMethod,
  setUserLoading,
  setUserError
} from '../../redux/slices/userSlice';
import { RootState } from '../../redux/store';

/**
 * Get all payment methods
 */
export const getPaymentMethods = createAsyncThunk(
  'payment/getPaymentMethods',
  async (_, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await paymentService.getPaymentMethods();
      
      if (response.status === 'success' && response.data) {
        // Map API payment methods to Redux state format
        const formattedMethods = response.data.map(method => {
          // Convert API payment method type to Redux type
          let paymentType: 'card' | 'mobileMoney' | 'cash';
          if (method.type === 'mobile_money') {
            paymentType = 'mobileMoney';
          } else if (method.type === 'card' || method.type === 'bank') {
            paymentType = 'card';
          } else {
            paymentType = 'cash';
          }

          return {
            id: method.id,
            type: paymentType,
            name: getPaymentMethodName(method),
            last4: method.details.lastFour,
            expiryDate: method.details.expiryMonth && method.details.expiryYear 
              ? `${method.details.expiryMonth}/${method.details.expiryYear}` 
              : undefined,
            isDefault: method.isDefault
          };
        });
        
        dispatch(setPaymentMethods(formattedMethods));
        dispatch(setUserLoading(false));
        return formattedMethods;
      } else {
        throw new Error(response.message || 'Failed to get payment methods');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Add a new payment method
 */
export const addPaymentMethod = createAsyncThunk(
  'payment/addPaymentMethod',
  async (methodData: AddPaymentMethodRequest, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await paymentService.addPaymentMethod(methodData);
      
      if (response.status === 'success' && response.data) {
        // Format the payment method for the Redux store
        // Convert API payment method type to Redux type
        let paymentType: 'card' | 'mobileMoney' | 'cash';
        if (response.data.type === 'mobile_money') {
          paymentType = 'mobileMoney';
        } else if (response.data.type === 'card' || response.data.type === 'bank') {
          paymentType = 'card';
        } else {
          paymentType = 'cash';
        }

        const newMethod = {
          id: response.data.id,
          type: paymentType,
          name: getPaymentMethodName(response.data),
          last4: response.data.details.lastFour,
          expiryDate: response.data.details.expiryMonth && response.data.details.expiryYear 
            ? `${response.data.details.expiryMonth}/${response.data.details.expiryYear}` 
            : undefined,
          isDefault: response.data.isDefault
        };
        
        dispatch(addPaymentMethodAction(newMethod));
        dispatch(setUserLoading(false));
        return newMethod;
      } else {
        throw new Error(response.message || 'Failed to add payment method');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Set default payment method
 */
export const updateDefaultPaymentMethod = createAsyncThunk(
  'payment/updateDefaultPaymentMethod',
  async (paymentMethodId: string, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await paymentService.setDefaultPaymentMethod(paymentMethodId);
      
      if (response.status === 'success') {
        dispatch(setDefaultPaymentMethod(paymentMethodId));
        dispatch(setUserLoading(false));
        return true;
      } else {
        throw new Error(response.message || 'Failed to set default payment method');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Process payment for a ride
 */
export const processPayment = createAsyncThunk(
  'payment/processPayment',
  async (
    params: { rideId: string; paymentMethodId?: string },
    { dispatch }
  ) => {
    const { rideId, paymentMethodId } = params;
    try {
      dispatch(setUserLoading(true));
      const response = await paymentService.processPayment(rideId, paymentMethodId);
      
      if (response.status === 'success' && response.data) {
        dispatch(setUserLoading(false));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to process payment');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Get payment history
 */
export const getPaymentHistory = createAsyncThunk(
  'payment/getPaymentHistory',
  async ({ page, limit }: { page?: number; limit?: number } = {}, { dispatch }) => {
    try {
      dispatch(setUserLoading(true));
      const response = await paymentService.getPaymentHistory(page, limit);
      
      if (response.status === 'success' && response.data) {
        dispatch(setUserLoading(false));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get payment history');
      }
    } catch (error) {
      dispatch(setUserError((error as Error).message));
      dispatch(setUserLoading(false));
      throw error;
    }
  }
);

/**
 * Helper function to get a human-readable name for a payment method
 */
function getPaymentMethodName(method: PaymentMethod): string {
  if (method.type === 'card') {
    return `${method.details.brand} •••• ${method.details.lastFour || ''}`;
  } else if (method.type === 'bank') {
    return `${method.details.bankName || 'Bank'} •••• ${method.details.lastFour || ''}`;
  } else if (method.type === 'mobile_money') {
    return `${method.details.provider || 'Mobile Money'}`;
  } else {
    return 'Cash';
  }
}
