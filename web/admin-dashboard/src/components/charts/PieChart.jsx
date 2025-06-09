import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { formatNumber } from '../../utils/formatters';

// Register all Chart.js components
Chart.register(...registerables);

const PieChart = ({ 
  data, 
  title, 
  labels, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f43f5e', '#6366f1'],
  height = 300,
  showLegend = true,
  doughnut = false,
  cutout = '50%',
  showPercentage = true,
  customTooltip = null
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef && chartRef.current && data) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      
      // Calculate total for percentage display
      const total = data.reduce((sum, value) => sum + value, 0);
      
      chartInstance.current = new Chart(ctx, {
        type: doughnut ? 'doughnut' : 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderColor: 'white',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: doughnut ? cutout : 0,
          plugins: {
            legend: {
              display: showLegend,
              position: 'top',
              labels: {
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            title: {
              display: !!title,
              text: title,
              font: {
                size: 16,
              }
            },
            tooltip: customTooltip || {
              callbacks: {
                label: function(context) {
                  const value = context.parsed;
                  const label = context.label || '';
                  const percentage = (value / total * 100).toFixed(1);
                  
                  if (showPercentage) {
                    return `${label}: ${formatNumber(value)} (${percentage}%)`;
                  } else {
                    return `${label}: ${formatNumber(value)}`;
                  }
                }
              }
            }
          }
        }
      });
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, labels, title, colors, height, doughnut, cutout, showLegend, showPercentage, customTooltip]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {title && !chartInstance.current && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div style={{ height: `${height}px` }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default PieChart;
