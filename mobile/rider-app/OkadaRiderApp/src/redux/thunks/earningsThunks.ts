import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  setEarningsSummary, 
  setEarningsHistory, 
  updateAvailableBalance,
  setLoading, 
  setError 
} from '../slices/earningsSlice';
import { earningsService, CashoutRequest } from '../../api/services/earnings.service';

/**
 * Fetch rider's earnings summary
 */
export const fetchEarningsSummary = createAsyncThunk(
  'earnings/fetchSummary',
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await earningsService.getEarningsSummary();
      
      if (response.status === 'success' && response.data) {
        // Transform the API response to match the slice's expected format
        const summaryData = {
          todayEarnings: response.data.todayEarnings,
          weeklyEarnings: response.data.weeklyEarnings,
          monthlyEarnings: response.data.monthlyEarnings,
          availableBalance: response.data.availableBalance,
          totalRides: response.data.ridesCompleted,
          totalHours: 0, // Not provided by API, could be calculated if needed
        };
        
        dispatch(setEarningsSummary(summaryData));
        return summaryData;
      } else {
        throw new Error(response.message || 'Failed to fetch earnings summary');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Fetch rider's earnings history
 */
export const fetchEarningsHistory = createAsyncThunk(
  'earnings/fetchHistory',
  async ({ page, limit }: { page?: number; limit?: number } = {}, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await earningsService.getEarningsHistory(page, limit);
      
      if (response.status === 'success' && response.data) {
        // Transform the API response to match the slice's expected format
        const historyData = response.data.map(item => ({
          id: item.id,
          date: item.date,
          amount: item.amount,
          rides: item.type === 'ride_fare' ? 1 : 0, // Assume 1 ride per ride_fare entry
        }));
        
        dispatch(setEarningsHistory(historyData));
        return historyData;
      } else {
        throw new Error(response.message || 'Failed to fetch earnings history');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);

/**
 * Request a cashout for available earnings
 */
export const requestCashout = createAsyncThunk(
  'earnings/cashout',
  async (cashoutData: CashoutRequest, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await earningsService.requestCashout(cashoutData);
      
      if (response.status === 'success' && response.data) {
        // Update the available balance in the store
        // We'll fetch the updated summary, but for immediate feedback we'll update the balance directly
        dispatch(updateAvailableBalance(0)); // Assume all available balance is being cashed out
        
        // Refresh the earnings summary to get the latest balances
        dispatch(fetchEarningsSummary());
        
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to request cashout');
      }
    } catch (error) {
      dispatch(setError((error as Error).message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);
