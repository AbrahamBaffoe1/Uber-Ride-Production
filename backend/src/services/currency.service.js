/**
 * Currency Service
 * Handles currency conversion, formatting, and country-currency mappings
 */
import axios from 'axios';
import NodeCache from 'node-cache';

// Default currency for the application
export const DEFAULT_CURRENCY = 'NGN';

// Cache for exchange rates to avoid hitting API limits
// Rates are stored for 3 hours (10800 seconds)
const ratesCache = new NodeCache({ stdTTL: 10800 });

// Cache key for rates
const RATES_CACHE_KEY = 'exchange_rates';

// Country to currency code mapping
// Maps ISO country codes to their respective currency codes
const COUNTRY_CURRENCY_MAP = {
  // Africa
  'NG': 'NGN', // Nigeria
  'GH': 'GHS', // Ghana
  'KE': 'KES', // Kenya
  'ZA': 'ZAR', // South Africa
  'EG': 'EGP', // Egypt
  'TZ': 'TZS', // Tanzania
  'UG': 'UGX', // Uganda
  'RW': 'RWF', // Rwanda
  'ET': 'ETB', // Ethiopia
  'CI': 'XOF', // Côte d'Ivoire
  'SN': 'XOF', // Senegal
  
  // Americas
  'US': 'USD', // United States
  'CA': 'CAD', // Canada
  'MX': 'MXN', // Mexico
  'BR': 'BRL', // Brazil
  'AR': 'ARS', // Argentina
  
  // Europe
  'GB': 'GBP', // United Kingdom
  'DE': 'EUR', // Germany
  'FR': 'EUR', // France
  'IT': 'EUR', // Italy
  'ES': 'EUR', // Spain
  'CH': 'CHF', // Switzerland
  'SE': 'SEK', // Sweden
  'NO': 'NOK', // Norway
  'DK': 'DKK', // Denmark
  
  // Asia & Pacific
  'JP': 'JPY', // Japan
  'CN': 'CNY', // China
  'IN': 'INR', // India
  'AU': 'AUD', // Australia
  'NZ': 'NZD', // New Zealand
  'SG': 'SGD', // Singapore
  'MY': 'MYR', // Malaysia
  'ID': 'IDR', // Indonesia
  'PH': 'PHP', // Philippines
  'AE': 'AED', // United Arab Emirates
  'SA': 'SAR', // Saudi Arabia
};

// Currency symbols for common currencies
const CURRENCY_SYMBOLS = {
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
  'AED': 'د.إ',
  'SAR': '﷼',
};

/**
 * Get the currency code for a given country code
 * @param {string} countryCode - ISO country code (e.g., 'NG' for Nigeria)
 * @returns {string} Currency code (e.g., 'NGN')
 */
export const getCurrencyForCountry = (countryCode) => {
  const normalizedCountryCode = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[normalizedCountryCode] || DEFAULT_CURRENCY;
};

/**
 * Get the currency symbol for a given currency code
 * @param {string} currencyCode - Currency code (e.g., 'NGN')
 * @returns {string} Currency symbol (e.g., '₦')
 */
export const getCurrencySymbol = (currencyCode) => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Format a number as a currency string
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = DEFAULT_CURRENCY) => {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Different currencies have different decimal place conventions
  const decimalPlaces = ['JPY', 'KRW', 'IDR', 'VND'].includes(currencyCode) ? 0 : 2;
  
  const formattedAmount = amount.toFixed(decimalPlaces);
  
  // Some currencies put the symbol after the amount
  const symbolAfter = ['SEK', 'DKK', 'NOK', 'PLN'].includes(currencyCode);
  
  if (symbolAfter) {
    return `${formattedAmount} ${symbol}`;
  }
  
  return `${symbol}${formattedAmount}`;
};

/**
 * Get the preferred currency for a user
 * Falls back to country currency if preferred currency not set
 * @param {Object} user - User object from database
 * @returns {string} Currency code
 */
export const getUserCurrency = (user) => {
  if (user.preferredCurrency) {
    return user.preferredCurrency;
  } 
  
  if (user.country) {
    return getCurrencyForCountry(user.country);
  }
  
  return DEFAULT_CURRENCY;
};

/**
 * Fetch current exchange rates from API
 * Uses Free Currency API (or similar) to get latest rates
 * @returns {Promise<Object>} Exchange rates with base currency as key
 */
const fetchExchangeRates = async () => {
  try {
    // First check cache
    const cachedRates = ratesCache.get(RATES_CACHE_KEY);
    if (cachedRates) {
      return cachedRates;
    }
    
    // If not in cache, fetch from API
    // Note: In production, you'd use an API key from environment variables
    const apiKey = process.env.CURRENCY_API_KEY || 'demo-key';
    const baseCurrency = DEFAULT_CURRENCY;
    
    // Free Currency API example (replace with your preferred provider)
    const response = await axios.get(
      `https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=${baseCurrency}`
    );
    
    if (response.data && response.data.data) {
      // Cache the results
      ratesCache.set(RATES_CACHE_KEY, response.data.data);
      return response.data.data;
    }
    
    throw new Error('Invalid response from currency API');
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // If API fails, use fallback static rates for critical currencies
    // This is just for resilience, should be updated regularly
    const fallbackRates = {
      'USD': 0.00065, // 1 NGN = 0.00065 USD (approx)
      'EUR': 0.00060, // 1 NGN = 0.00060 EUR (approx)
      'GBP': 0.00051, // 1 NGN = 0.00051 GBP (approx)
      'GHS': 0.0099,  // 1 NGN = 0.0099 GHS (approx)
      'KES': 0.085,   // 1 NGN = 0.085 KES (approx)
      'ZAR': 0.012,   // 1 NGN = 0.012 ZAR (approx)
    };
    
    return fallbackRates;
  }
};

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number>} Converted amount
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    const rates = await fetchExchangeRates();
    
    // If converting from the base currency (NGN)
    if (fromCurrency === DEFAULT_CURRENCY) {
      const rate = rates[toCurrency];
      if (!rate) {
        throw new Error(`Exchange rate not available for ${toCurrency}`);
      }
      return amount * rate;
    }
    
    // If converting to the base currency (NGN)
    if (toCurrency === DEFAULT_CURRENCY) {
      const rate = rates[fromCurrency];
      if (!rate) {
        throw new Error(`Exchange rate not available for ${fromCurrency}`);
      }
      return amount / rate;
    }
    
    // If converting between two non-base currencies
    // First convert to base currency, then to target currency
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
    }
    
    // Convert from source to NGN, then from NGN to target
    const amountInNGN = amount / fromRate;
    return amountInNGN * toRate;
  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Fallback: use a fixed approximate conversion to avoid breaking functionality
    if (fromCurrency === 'NGN' && toCurrency === 'USD') {
      return amount * 0.00065; // Approximate NGN to USD rate
    } else if (fromCurrency === 'USD' && toCurrency === 'NGN') {
      return amount * 1538.5; // Approximate USD to NGN rate
    }
    
    // If all else fails, return the original amount
    // This ensures the app keeps working even if conversion fails
    return amount;
  }
};

/**
 * Get available currencies for user selection
 * @returns {Array<Object>} List of available currencies with code and name
 */
export const getAvailableCurrencies = () => {
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
