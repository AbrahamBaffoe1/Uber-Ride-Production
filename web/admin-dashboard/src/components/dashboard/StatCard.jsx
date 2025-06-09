import React from 'react';
import { formatNumber, formatPercent, formatCurrency } from '../../utils/formatters';

const StatCard = ({ 
  title, 
  value, 
  previousValue,
  change,
  format = 'number',
  icon,
  iconBgColor = 'bg-blue-100',
  iconColor = 'text-blue-600',
  currency = 'NGN',
  loading = false,
  onClick
}) => {
  // Calculate percentage change if not provided but previous value is
  const percentChange = change !== undefined ? change : (
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null
  );
  
  // Format the value based on the specified format
  const formattedValue = (() => {
    if (loading) return '—';
    
    switch (format) {
      case 'currency':
        return formatCurrency(value, currency);
      case 'percent':
        return formatPercent(value);
      default:
        return formatNumber(value);
    }
  })();

  // Determine if change is positive or negative for styling
  const isPositive = percentChange > 0;
  const isNegative = percentChange < 0;
  // Neutral case when percentChange is 0 or null
  
  // Style classes for the change indicator
  const changeColorClass = isPositive 
    ? 'text-green-600 bg-green-50' 
    : isNegative 
      ? 'text-red-600 bg-red-50' 
      : 'text-gray-600 bg-gray-50';
  
  const changeIcon = isPositive 
    ? '↑' 
    : isNegative 
      ? '↓' 
      : '—';

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        {icon && (
          <div className={`p-2 rounded-full ${iconBgColor}`}>
            <span className={`${iconColor}`}>{icon}</span>
          </div>
        )}
      </div>
      
      <div className="mb-2">
        {loading ? (
          <div className="h-8 bg-gray-200 animate-pulse rounded w-24"></div>
        ) : (
          <h2 className="text-2xl font-bold text-gray-800">{formattedValue}</h2>
        )}
      </div>
      
      {(previousValue !== undefined || percentChange !== null) && (
        <div className="flex items-center text-sm">
          {loading ? (
            <div className="h-5 bg-gray-200 animate-pulse rounded w-16"></div>
          ) : (
            <>
              <span className={`px-2 py-0.5 rounded-full ${changeColorClass} mr-2`}>
                {changeIcon} {Math.abs(percentChange || 0).toFixed(1)}%
              </span>
              <span className="text-gray-500">vs. previous period</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
