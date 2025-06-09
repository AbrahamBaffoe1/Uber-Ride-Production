import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../contexts/AuthContext';

interface CurrencyDisplayProps {
  amount: number | string;
  currencyCode?: string;
  style?: any;
  showSymbol?: boolean;
  isRange?: boolean;
  rangeSeparator?: string;
  fallbackCurrency?: string;
}

// Currency symbols for common currencies
const CURRENCY_SYMBOLS: { [key: string]: string } = {
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

// Default currency
const DEFAULT_CURRENCY = 'NGN';

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currencyCode,
  style,
  showSymbol = true,
  isRange = false,
  rangeSeparator = '-',
  fallbackCurrency = DEFAULT_CURRENCY
}) => {
  const { user } = useContext(AuthContext) || {};
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  
  // Load user's preferred currency
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        // First try to get it from context if available
        if (user?.preferredCurrency) {
          setUserCurrency(user.preferredCurrency);
          return;
        }
        
        // Otherwise try to get from storage
        const storedCurrency = await AsyncStorage.getItem('preferredCurrency');
        if (storedCurrency) {
          setUserCurrency(storedCurrency);
          return;
        }
        
        // If not available, try to derive from country
        if (user?.country) {
          const countryCurrency = getCountryCurrency(user.country);
          if (countryCurrency) {
            setUserCurrency(countryCurrency);
            return;
          }
        }
        
        // Default to NGN if nothing else is available
        setUserCurrency(DEFAULT_CURRENCY);
      } catch (error) {
        console.error('Error loading currency preference:', error);
        setUserCurrency(DEFAULT_CURRENCY);
      }
    };
    
    loadCurrency();
  }, [user]);
  
  // Get currency code to use (provided, user's, or fallback)
  const activeCurrencyCode = currencyCode || userCurrency || fallbackCurrency;
  
  // Get symbol for the active currency
  const symbol = CURRENCY_SYMBOLS[activeCurrencyCode] || activeCurrencyCode;
  
  // Format the amount based on currency
  const formatAmount = (value: number | string): string => {
    let numericValue: number;
    
    if (typeof value === 'string') {
      // Handle string values that might have currency symbols
      numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      if (isNaN(numericValue)) return value;
    } else {
      numericValue = value;
    }
    
    // Different currencies have different decimal place conventions
    const decimalPlaces = ['JPY', 'KRW', 'IDR', 'VND'].includes(activeCurrencyCode) ? 0 : 0;
    
    return numericValue.toFixed(decimalPlaces);
  };
  
  // Format a complete price with symbol
  const formatPrice = (value: number | string): string => {
    const formattedAmount = formatAmount(value);
    if (!showSymbol) return formattedAmount;
    
    // Some currencies put the symbol after the amount
    const symbolAfter = ['SEK', 'DKK', 'NOK', 'PLN', 'CZK', 'RUB'].includes(activeCurrencyCode);
    
    if (symbolAfter) {
      return `${formattedAmount} ${symbol}`;
    }
    
    return `${symbol}${formattedAmount}`;
  };
  
  // If we're displaying a range (e.g. "₦300-500")
  if (isRange && typeof amount === 'string') {
    const parts = amount.split(rangeSeparator).map(part => part.trim());
    if (parts.length === 2) {
      return (
        <Text style={[styles.text, style]}>
          {formatPrice(parts[0])}{rangeSeparator}{formatPrice(parts[1]).replace(symbol, '')}
        </Text>
      );
    }
  }
  
  // Regular single amount display
  return <Text style={[styles.text, style]}>{formatPrice(amount)}</Text>;
};

// Helper function to get default currency for a country
const getCountryCurrency = (countryCode: string): string | null => {
  const COUNTRY_CURRENCY_MAP: { [key: string]: string } = {
    'NG': 'NGN', // Nigeria
    'GH': 'GHS', // Ghana
    'KE': 'KES', // Kenya
    'ZA': 'ZAR', // South Africa
    'US': 'USD', // United States
    'GB': 'GBP', // United Kingdom
    'DE': 'EUR', // Germany (and other Euro countries)
    'FR': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'IN': 'INR', // India
    'CN': 'CNY', // China
    'JP': 'JPY', // Japan
    'AU': 'AUD', // Australia
    'CA': 'CAD', // Canada
  };
  
  return COUNTRY_CURRENCY_MAP[countryCode] || null;
};

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
  },
});

export default CurrencyDisplay;
