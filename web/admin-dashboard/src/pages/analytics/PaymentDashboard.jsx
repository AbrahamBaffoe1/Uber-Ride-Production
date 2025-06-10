import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// This component is correctly defined and exported below,
// but was being assigned to 'const PaymentDashboard' which wasn't then exported
const PaymentDashboardComponent = () => {
  const [period, setPeriod] = useState('week');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for different data types
  const [summaryData, setSummaryData] = useState(null);
  const [paymentTimeSeries, setPaymentTimeSeries] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [transactionsByStatus, setTransactionsByStatus] = useState([]);
  const [hourlyDistribution, setHourlyDistribution] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [revenueSourceData, setRevenueSourceData] = useState([]);
  const [gatewayPerformance, setGatewayPerformance] = useState([]);

  // Fetch analytics data when period changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch summary metrics
        const summaryResponse = await analyticsService.getPaymentSummary({ period });
        if (summaryResponse.success) {
          setSummaryData(summaryResponse.data);
        }
        
        // Fetch full analytics data
        const analyticsResponse = await analyticsService.getPaymentAnalytics({ timeframe: period });
        if (analyticsResponse.success) {
          const data = analyticsResponse.data;
          
          // Set time series data
          if (data.payments) {
            setPaymentTimeSeries(data.payments.map(item => ({
              name: item.date,
              transactions: item.transactions.total,
              amount: item.totalAmount
            })));
            
            // Create weekly data from the full time series
            const last7Days = [...data.payments]
              .slice(-7)
              .map(item => ({
                day: new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
                transactions: item.transactions.total,
                amount: item.totalAmount
              }));
            setWeeklyData(last7Days);
          }
          
          // Set transactions by status
          if (data.transactionsByStatus) {
            const statusPieData = [
              { name: 'Successful', value: data.transactionsByStatus.completed || 0 },
              { name: 'Failed', value: data.transactionsByStatus.failed || 0 },
              { name: 'Pending', value: data.transactionsByStatus.pending || 0 }
            ];
            setTransactionsByStatus(statusPieData);
          }
          
          // Format payment methods for chart
          if (data.transactionsByPaymentMethod) {
            const methodData = Object.keys(data.transactionsByPaymentMethod).map(key => ({
              name: key.charAt(0).toUpperCase() + key.slice(1),
              value: data.transactionsByPaymentMethod[key]
            }));
            setPaymentMethodData(methodData);
          }
          
          // Set gateway performance data
          if (data.gatewayPerformance) {
            setGatewayPerformance(data.gatewayPerformance);
          }
          
          // Sample revenue source breakdown - may come from transactionsByType
          if (data.transactionsByType) {
            const total = Object.values(data.transactionsByType).reduce((sum, count) => sum + count, 0);
            const revenueData = Object.entries(data.transactionsByType).map(([type, count]) => ({
              name: type.charAt(0).toUpperCase() + type.slice(1),
              value: (count / total) * 100
            }));
            setRevenueSourceData(revenueData);
          }
          
          // Set hourly distribution if available
          if (data.hourlyDistribution) {
            setHourlyDistribution(data.hourlyDistribution);
          }
        }
      } catch (err) {
        console.error('Error fetching payment analytics:', err);
        setError('Failed to load payment analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [period]);

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleTabChange = (index) => {
    setActiveTab(index);
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return `₦${new Intl.NumberFormat().format(amount)}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Payment Analytics Dashboard</h1>
        <p className="text-gray-600">View and analyze payment data across the platform</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-6 mb-6">
            {/* Summary Cards */}
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Total Transactions</h3>
                <div className="card-value">
                  {summaryData ? new Intl.NumberFormat().format(summaryData.totalTransactions) : '-'}
                </div>
                <div className="card-trend trend-up">
                  {summaryData ? `${summaryData.successRate}% success rate` : ''}
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Transaction Value</h3>
                <div className="card-value">
                  {summaryData ? formatCurrency(summaryData.totalAmount) : '-'}
                </div>
                <div className="card-trend trend-up">
                  Total payment volume
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Success Rate</h3>
                <div className="card-value">
                  {summaryData ? `${summaryData.successRate}%` : '-'}
                </div>
                <div className="card-trend" style={{ color: summaryData?.successRate > 95 ? 'var(--success)' : 'var(--danger)' }}>
                  Completion rate
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Avg. Transaction Value</h3>
                <div className="card-value">
                  {summaryData ? formatCurrency(summaryData.avgTransactionValue) : '-'}
                </div>
                <div className="card-trend">
                  Per transaction
                </div>
              </div>
            </div>
          </div>

      {/* Period Selector */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Transaction Analysis</h2>
        <div className="form-control" style={{ minWidth: '160px', margin: 0 }}>
          <label className="input-label" htmlFor="period-select">Period</label>
          <select 
            id="period-select"
            className="form-select" 
            value={period} 
            onChange={handlePeriodChange}
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Transaction Volume Line Chart */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">Transaction Volume Over Time</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={paymentTimeSeries}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="transactions" 
                    stroke="#3a7bd5" 
                    strokeWidth={2}
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Transaction Amount Area Chart */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">Transaction Amounts (₦)</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={paymentTimeSeries}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₦${new Intl.NumberFormat().format(value)}`} />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3a7bd5" 
                    fill="rgba(58, 123, 213, 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Weekly Transaction Pattern */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">Weekly Transaction Pattern</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart
                  data={weeklyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                  <Legend />
                  <Bar dataKey="transactions" fill="#3a7bd5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Transaction Status Distribution */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">Transaction Status Distribution</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={transactionsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {transactionsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Section */}
      <div className="paper">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 0 ? 'active' : ''}`} 
            onClick={() => handleTabChange(0)}
          >
            Payment Methods
          </button>
          <button 
            className={`tab ${activeTab === 1 ? 'active' : ''}`} 
            onClick={() => handleTabChange(1)}
          >
            Transaction Status
          </button>
          <button 
            className={`tab ${activeTab === 2 ? 'active' : ''}`} 
            onClick={() => handleTabChange(2)}
          >
            Revenue Sources
          </button>
          <button 
            className={`tab ${activeTab === 3 ? 'active' : ''}`} 
            onClick={() => handleTabChange(3)}
          >
            Platform Performance
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 0 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Payment Methods Bar Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={paymentMethodData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" scale="band" />
                    <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                    <Legend />
                    <Bar dataKey="value" name="Transactions" fill="#3a7bd5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Payment Method</th>
                      <th style={{ textAlign: 'right' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentMethodData.map((method, index) => (
                      <tr key={`method-${index}`}>
                        <td>{method.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          {new Intl.NumberFormat().format(method.value)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {(method.value / paymentMethodData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {paymentMethodData.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>No payment method data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 1 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Transaction Status Pie Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={transactionsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {transactionsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Transaction Status Breakdown</h3>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Successful Transactions 
                    ({summaryData ? `${summaryData.successRate}%` : '-'})
                  </h4>
                  <p className="text-gray-600">Transactions that were completed without any issues. Customers were charged correctly and received their services.</p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Failed Transactions 
                    ({transactionsByStatus.length > 1 ? `${((transactionsByStatus[1].value / transactionsByStatus.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%` : '-'})
                  </h4>
                  <p className="text-gray-600">Transactions that couldn't be completed due to payment gateway errors, insufficient funds, or other issues.</p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Pending Transactions 
                    ({transactionsByStatus.length > 2 ? `${((transactionsByStatus[2].value / transactionsByStatus.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%` : '-'})
                  </h4>
                  <p className="text-gray-600">Transactions that have been initiated but haven't been completed or failed yet, usually waiting for confirmation.</p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 2 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Revenue Sources Pie Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={revenueSourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {revenueSourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Revenue Source Analysis</h3>
                {revenueSourceData.map((source, index) => (
                  <div className="mb-4" key={`source-${index}`}>
                    <h4 className="font-medium">
                      {source.name} ({source.value.toFixed(1)}%)
                    </h4>
                    <p className="text-gray-600">
                      {source.name === 'Rides' && 'Standard transportation services account for a significant portion of revenue.'}
                      {source.name === 'Delivery' && 'Package and food delivery services revenue stream.'}
                      {source.name === 'Premium' && 'Higher-tier services including scheduled rides and VIP transportation.'}
                      {!['Rides', 'Delivery', 'Premium'].includes(source.name) && `${source.name} services.`}
                    </p>
                  </div>
                ))}
                {revenueSourceData.length === 0 && (
                  <div className="mb-4">
                    <p className="text-gray-600">No revenue source data available.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Gateway</th>
                      <th style={{ textAlign: 'right' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Success Rate</th>
                      <th style={{ textAlign: 'right' }}>Avg. Processing Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gatewayPerformance.map((gateway, index) => (
                      <tr key={`gateway-${index}`}>
                        <td>{gateway.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          {new Intl.NumberFormat().format(gateway.transactions)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {gateway.successRate.toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {gateway.avgProcessingTime.toFixed(1)}s
                        </td>
                      </tr>
                    ))}
                    {gatewayPerformance.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center' }}>No gateway performance data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Gateway Performance Insights</h3>
                <div className="mb-4">
                  {gatewayPerformance.length > 0 ? (
                    <>
                      <p className="mb-3 text-gray-600">
                        <strong>Success Rate Summary:</strong> Across all payment gateways, the average success rate is {
                          (gatewayPerformance.reduce((sum, gateway) => sum + gateway.successRate, 0) / gatewayPerformance.length).toFixed(1)
                        }%.
                      </p>
                      <p className="mb-3 text-gray-600">
                        <strong>Processing Time:</strong> Average transaction processing time is {
                          (gatewayPerformance.reduce((sum, gateway) => sum + gateway.avgProcessingTime, 0) / gatewayPerformance.length).toFixed(2)
                        } seconds.
                      </p>
                      <p className="mb-3 text-gray-600">
                        <strong>Recommendation:</strong> Focus on {
                          gatewayPerformance.reduce((worst, current) => 
                            current.successRate < worst.successRate ? current : worst, gatewayPerformance[0]).name
                        } which has the lowest performance.
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-600">Gateway performance data is not available.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default PaymentDashboardComponent;
