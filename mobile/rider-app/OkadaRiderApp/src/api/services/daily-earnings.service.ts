import { apiClient, ApiError } from '../apiClient';

export interface DailyEarnings {
  date: string;
  amount: number;
  ridesCount: number;
  hoursWorked: number;
  breakdownByHour?: { [hour: string]: number };
}

/**
 * Get daily earnings for a specific date
 * @param date Date in YYYY-MM-DD format
 * @param riderId Optional rider ID (defaults to current rider)
 * @returns Promise with daily earnings data
 */
const getDailyEarnings = async (date: string, riderId?: string): Promise<DailyEarnings> => {
  try {
    // Build query parameters
    const params: any = { date };
    if (riderId) params.riderId = riderId;

    // Make API request
    const response = await apiClient.get('/earnings/daily', { params });
    
    // Return the data
    return response.data;
  } catch (error) {
    console.error('Error fetching daily earnings:', error);
    
    // Return default data structure if 404 or other error
    if (error instanceof ApiError && error.code === 404) {
      console.log('Resource not found: /earnings/daily');
    }

    // Return default data to prevent UI errors
    return {
      date,
      amount: 0,
      ridesCount: 0,
      hoursWorked: 0,
      breakdownByHour: {}
    };
  }
};

/**
 * Get weekly earnings data
 * @param weekStartDate Start date of the week (YYYY-MM-DD)
 * @param riderId Optional rider ID
 * @returns Promise with weekly earnings data
 */
const getWeeklyEarnings = async (weekStartDate: string, riderId?: string) => {
  try {
    // Build query parameters
    const params: any = { weekStartDate };
    if (riderId) params.riderId = riderId;

    // Make API request
    const response = await apiClient.get('/earnings/weekly', { params });
    
    // Return the data
    return response.data;
  } catch (error) {
    console.error('Error fetching weekly earnings:', error);
    
    // Return default data structure if 404 or other error
    if (error instanceof ApiError && error.code === 404) {
      console.log('Resource not found: /earnings/weekly');
    }

    // Return default data to prevent UI errors
    return {
      weekStartDate,
      weekEndDate: weekStartDate, // Just a placeholder
      totalAmount: 0,
      totalRides: 0,
      totalHours: 0,
      dailyBreakdown: []
    };
  }
};

/**
 * Get monthly earnings summary
 * @param year Year (YYYY)
 * @param month Month (1-12)
 * @param riderId Optional rider ID
 * @returns Promise with monthly earnings data
 */
const getMonthlyEarnings = async (year: number, month: number, riderId?: string) => {
  try {
    // Build query parameters
    const params: any = { year, month };
    if (riderId) params.riderId = riderId;

    // Make API request
    const response = await apiClient.get('/earnings/monthly', { params });
    
    // Return the data
    return response.data;
  } catch (error) {
    console.error('Error fetching monthly earnings:', error);
    
    // Return default data structure if 404 or other error
    if (error instanceof ApiError && error.code === 404) {
      console.log('Resource not found: /earnings/monthly');
    }

    // Return default data to prevent UI errors
    return {
      year,
      month,
      totalAmount: 0,
      totalRides: 0,
      totalHours: 0,
      weeklyBreakdown: []
    };
  }
};

export const dailyEarningsService = {
  getDailyEarnings,
  getWeeklyEarnings,
  getMonthlyEarnings
};

export default dailyEarningsService;
