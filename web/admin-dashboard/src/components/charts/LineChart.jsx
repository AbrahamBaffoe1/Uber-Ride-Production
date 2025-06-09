import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { formatNumber } from '../../utils/formatters';

// Register all Chart.js components
Chart.register(...registerables);

const LineChart = ({ 
  data, 
  title, 
  labels, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
  height = 300,
  fill = false,
  tension = 0.4,
  showLegend = true,
  showGrid = true,
  yAxisMin = null,
  yAxisMax = null,
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
      
      const datasets = Array.isArray(data[0]) 
        ? data.map((dataset, index) => ({
            label: labels[index] || `Dataset ${index + 1}`,
            data: dataset,
            backgroundColor: fill ? colors[index % colors.length] + '40' : colors[index % colors.length],
            borderColor: colors[index % colors.length],
            borderWidth: 2,
            tension: tension,
            fill: fill,
            pointRadius: 3,
            pointHoverRadius: 5,
          }))
        : [{
            label: title,
            data: data,
            backgroundColor: fill ? colors[0] + '40' : colors[0],
            borderColor: colors[0],
            borderWidth: 2,
            tension: tension,
            fill: fill,
            pointRadius: 3,
            pointHoverRadius: 5,
          }];

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array.isArray(data[0]) ? labels[0] : labels,
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: showLegend,
              position: 'top',
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
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += formatNumber(context.parsed.y);
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            x: {
              grid: {
                display: showGrid,
                color: 'rgba(0, 0, 0, 0.05)',
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45
              }
            },
            y: {
              beginAtZero: yAxisMin === null,
              min: yAxisMin,
              max: yAxisMax,
              grid: {
                display: showGrid,
                color: 'rgba(0, 0, 0, 0.05)',
              },
              ticks: {
                callback: function(value) {
                  return formatNumber(value);
                }
              }
            }
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          elements: {
            point: {
              hoverBackgroundColor: '#fff',
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
  }, [data, labels, title, colors, height, fill, tension, showLegend, showGrid, yAxisMin, yAxisMax, customTooltip]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      {title && !chartInstance.current && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div style={{ height: `${height}px` }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default LineChart;
