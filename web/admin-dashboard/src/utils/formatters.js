/**
 * Utility functions for formatting data in the admin dashboard
 */

/**
 * Format a date according to the specified format
 * @param {Date} date - The date to format
 * @param {string} format - The format to use (short, medium, full)
 * @returns {string} The formatted date string
 */
export const formatDate = (date, format = 'medium') => {
  if (!date) return 'N/A';
  
  const options = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  };
  
  return new Date(date).toLocaleDateString('en-US', options[format] || options.medium);
};

/**
 * Format a number with comma separators for thousands
 * @param {number} number - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} The formatted number
 */
export const formatNumber = (number, decimals = 0) => {
  if (number === undefined || number === null) return 'N/A';
  return number.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

/**
 * Format a currency value
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (amount, currency = 'NGN') => {
  if (amount === undefined || amount === null) return 'N/A';
  
  const currencySymbols = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  
  const symbol = currencySymbols[currency] || currency;
  
  return `${symbol}${formatNumber(amount, 2)}`;
};

/**
 * Format a percentage value
 * @param {number} value - The value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} The formatted percentage string
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === undefined || value === null) return 'N/A';
  return `${formatNumber(value * 100, decimals)}%`;
};
