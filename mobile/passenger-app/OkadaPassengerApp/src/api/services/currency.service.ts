import { apiClient } from '../apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

// Default currency for the application
export const DEFAULT_CURRENCY = 'NGN';

// Currency symbols for common currencies
export const CURRENCY_SYMBOLS: { [key: string]: string } = {
  'NGN': '₦',
  'GHS': '₵',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'INR': '₹',
  'JPY': '¥',
  'CNY': '¥',
  'ZAR': 'R',
  'KES': 'KSh',
  'AUD': 'A$',
  'CAD': 'C$',
};

/**
 * Get available currencies for selection
 * @returns Promise<Currency[]> List of available currencies
 */
export const getAvailableCurrencies = async (): Promise<Currency[]> => {
  try {
    // Try to fetch from API first
    const response = await apiClient.get<{
      status: string;
      data: { currencies: Currency[] }
    }>('/users/currencies');
    
    if (response.data?.currencies) {
      return response.data.currencies;
    }
  } catch (error) {
    console.error('Error fetching currencies from API:', error);
    // If API fails, use static list
  }
  
  // Fallback to static list if API fails
  return [
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  ];
};

/**
 * Get the currency symbol for a given currency code
 * @param currencyCode Currency code (e.g., 'NGN')
 * @returns Currency symbol (e.g., '₦')
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Get the user's preferred currency
 * Checks storage and fallbacks to default
 * @returns Promise<string> Currency code
 */
export const getPreferredCurrency = async (): Promise<string> => {
  try {
    const storedCurrency = await AsyncStorage.getItem('preferredCurrency');
    return storedCurrency || DEFAULT_CURRENCY;
  } catch (error) {
    console.error('Error getting preferred currency:', error);
    return DEFAULT_CURRENCY;
  }
};

/**
 * Set the user's preferred currency
 * @param currencyCode Currency code to set
 * @returns Promise<boolean> Success state
 */
export const setPreferredCurrency = async (currencyCode: string): Promise<boolean> => {
  try {
    // Store locally
    await AsyncStorage.setItem('preferredCurrency', currencyCode);
    
    // Try to update on server if user is logged in
    const authToken = await AsyncStorage.getItem('authToken');
    if (authToken) {
      try {
        await apiClient.put('/users/preferences/currency', { currencyCode });
      } catch (apiError) {
        console.error('Error updating currency on server:', apiError);
        // Continue with local storage update even if API fails
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error setting preferred currency:', error);
    return false;
  }
};

/**
 * Format a number as a currency string
 * @param amount Amount to format
 * @param currencyCode Currency code
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode?: string): string => {
  if (!currencyCode) {
    // Use default if no currency code provided
    currencyCode = DEFAULT_CURRENCY;
  }
  
  const symbol = getCurrencySymbol(currencyCode);
  
  // Different currencies have different decimal place conventions
  const decimalPlaces = ['JPY', 'KRW', 'IDR', 'VND'].includes(currencyCode) ? 0 : 0;
  
  const formattedAmount = amount.toFixed(decimalPlaces);
  
  // Some currencies put the symbol after the amount
  const symbolAfter = ['SEK', 'DKK', 'NOK', 'PLN'].includes(currencyCode);
  
  if (symbolAfter) {
    return `${formattedAmount} ${symbol}`;
  }
  
  return `${symbol}${formattedAmount}`;
};

/**
 * Convert amount from one currency to another
 * @param amount Amount to convert
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @returns Promise<number> Converted amount
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    // Try to fetch from API
    const response = await apiClient.get<{
      status: string;
      data: { convertedAmount: number }
    }>(
      `/currencies/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
    );
    
    if (response.data?.convertedAmount) {
      return response.data.convertedAmount;
    }
  } catch (error) {
    console.error('Error fetching conversion rate:', error);
    // If API fails, use static rates
  }
  
  // Fallback to static approximate rates if API fails
  const staticRates: { [key: string]: number } = {
    'NGN_TO_USD': 0.00065, // 1 NGN = 0.00065 USD
    'USD_TO_NGN': 1538.5,  // 1 USD = 1538.5 NGN
    'NGN_TO_EUR': 0.00060, // 1 NGN = 0.00060 EUR
    'EUR_TO_NGN': 1666.7,  // 1 EUR = 1666.7 NGN
    'NGN_TO_GBP': 0.00051, // 1 NGN = 0.00051 GBP
    'GBP_TO_NGN': 1960.8,  // 1 GBP = 1960.8 NGN
    'NGN_TO_GHS': 0.0099,  // 1 NGN = 0.0099 GHS
    'GHS_TO_NGN': 101.0,   // 1 GHS = 101.0 NGN
    'USD_TO_EUR': 0.92,    // 1 USD = 0.92 EUR
    'EUR_TO_USD': 1.09,    // 1 EUR = 1.09 USD
  };
  
  const rateKey = `${fromCurrency}_TO_${toCurrency}`;
  const inverseRateKey = `${toCurrency}_TO_${fromCurrency}`;
  
  if (staticRates[rateKey]) {
    return amount * staticRates[rateKey];
  } else if (staticRates[inverseRateKey]) {
    return amount / staticRates[inverseRateKey];
  }
  
  // If no direct conversion is found, try to convert via USD
  if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
    const fromToUsd = staticRates[`${fromCurrency}_TO_USD`];
    const usdToTarget = staticRates[`USD_TO_${toCurrency}`];
    
    if (fromToUsd && usdToTarget) {
      return amount * fromToUsd * usdToTarget;
    }
    
    const targetToUsd = staticRates[`${toCurrency}_TO_USD`];
    const usdToFrom = staticRates[`USD_TO_${fromCurrency}`];
    
    if (targetToUsd && usdToFrom) {
      return amount / (targetToUsd * usdToFrom);
    }
  }
  
  // If all conversion attempts fail, return original amount
  console.warn(`No conversion rate found for ${fromCurrency} to ${toCurrency}`);
  return amount;
};

export default {
  getAvailableCurrencies,
  getCurrencySymbol,
  getPreferredCurrency,
  setPreferredCurrency,
  formatCurrency,
  convertCurrency,
  DEFAULT_CURRENCY,
  CURRENCY_SYMBOLS
};
