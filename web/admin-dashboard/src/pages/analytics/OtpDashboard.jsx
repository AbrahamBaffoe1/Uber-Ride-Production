import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ComposedChart
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const OtpDashboard = () => {
  const [period, setPeriod] = useState('week');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for different data types
  const [summaryData, setSummaryData] = useState(null);
  const [otpTimeSeries, setOtpTimeSeries] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [otpByStatus, setOtpByStatus] = useState([]);
  const [hourlyDistribution, setHourlyDistribution] = useState([]);
  const [deliveryMethodsData, setDeliveryMethodsData] = useState({});
  const [userSegmentsData, setUserSegmentsData] = useState({});
  const [verificationTimeData, setVerificationTimeData] = useState([]);

  // Fetch analytics data when period changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch summary metrics
        const summaryResponse = await analyticsService.getOtpSummary({ period });
        if (summaryResponse.success) {
          setSummaryData(summaryResponse.data);
        }
        
        // Fetch full analytics data
        const analyticsResponse = await analyticsService.getOtpAnalytics({ timeframe: period });
        if (analyticsResponse.success) {
          const data = analyticsResponse.data;
          
          // Set time series data
          setOtpTimeSeries(data.otpTimeSeries || []);
          
          // Transform weekly data if it exists
          if (data.otpTimeSeries) {
            // Filter to just the last 7 days and format for weekly chart
            const last7Days = [...data.otpTimeSeries]
              .slice(-7)
              .map(item => ({
                day: new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
                generated: item.generated,
                verified: item.verified,
                failed: item.failed
              }));
            setWeeklyData(last7Days);
          }
          
          // Extract hourly data if available or create placeholder
          const hourlyData = data.hourlyDistribution || [];
          setHourlyDistribution(hourlyData);
          
          // Format OTP status data for pie chart
          if (data.otpByStatus) {
            const statusData = [
              { name: 'Successful', value: data.otpByStatus.verified || 0 },
              { name: 'Failed', value: data.otpByStatus.expired || 0 + (data.otpByStatus.unused || 0) }
            ];
            setOtpByStatus(statusData);
          }
          
          // Set verification time distribution
          if (data.verificationTimeDistribution) {
            setVerificationTimeData(data.verificationTimeDistribution);
          }
        }
        
        // Fetch delivery methods data
        const deliveryResponse = await analyticsService.getOtpDeliveryMethods({ period });
        if (deliveryResponse.success && deliveryResponse.data) {
          setDeliveryMethodsData(deliveryResponse.data);
        }
        
        // Fetch user segments data
        const segmentsResponse = await analyticsService.getOtpUserSegments({ period });
        if (segmentsResponse.success && segmentsResponse.data) {
          setUserSegmentsData(segmentsResponse.data);
        }
      } catch (err) {
        console.error('Error fetching OTP analytics:', err);
        setError('Failed to load OTP analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [period]);
  
  // Transform user segments data for pie chart
  const userSegmentChartData = userSegmentsData ? [
    { name: 'New Users', value: userSegmentsData.newUsers || 0 },
    { name: 'Returning Users', value: userSegmentsData.returningUsers || 0 },
    { name: 'Dormant Users', value: userSegmentsData.dormantUsers || 0 }
  ] : [];
  
  // Transform delivery methods data for chart and table
  const deliveryMethodsChartData = deliveryMethodsData.sms && deliveryMethodsData.email ? [
    { 
      name: 'SMS', 
      value: deliveryMethodsData.sms.total || 0,
      successRate: deliveryMethodsData.sms.successRate || 0,
      avgTime: deliveryMethodsData.sms.avgVerificationTime || 0
    },
    { 
      name: 'Email', 
      value: deliveryMethodsData.email.total || 0,
      successRate: deliveryMethodsData.email.successRate || 0, 
      avgTime: deliveryMethodsData.email.avgVerificationTime || 0
    }
  ] : [];

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleTabChange = (index) => {
    setActiveTab(index);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">OTP Analytics Dashboard</h1>
        <p className="text-gray-600">Monitor and analyze OTP usage across the platform</p>
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
                <h3 className="card-title">Total OTPs Generated</h3>
                <div className="card-value">
                  {summaryData ? new Intl.NumberFormat().format(summaryData.totalGenerated) : '-'}
                </div>
                <div className="card-trend trend-up">
                  {summaryData?.successRate ? `${summaryData.successRate}% success rate` : '-'}
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Successful Verifications</h3>
                <div className="card-value">
                  {summaryData ? new Intl.NumberFormat().format(summaryData.successfulVerifications) : '-'}
                </div>
                <div className="card-trend trend-up">
                  {summaryData?.successRate ? `${summaryData.successRate}% of total` : '-'}
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Failed Verifications</h3>
                <div className="card-value">
                  {summaryData ? new Intl.NumberFormat().format(summaryData.failedVerifications) : '-'}
                </div>
                <div className="card-trend" style={{ color: 'var(--danger)' }}>
                  {summaryData?.successRate ? `${(100 - summaryData.successRate).toFixed(1)}% of total` : '-'}
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-content">
                <h3 className="card-title">Avg. Verification Time</h3>
                <div className="card-value">
                  {summaryData?.avgVerificationTime ? `${summaryData.avgVerificationTime}s` : '-'}
                </div>
                <div className="card-trend trend-up">
                  Response time
                </div>
              </div>
            </div>
          </div>

      {/* Period Selector */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">OTP Verification Analysis</h2>
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
        {/* OTP Activity Over Time */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">OTP Activity Over Time</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={otpTimeSeries}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="generated" 
                    name="OTPs Generated"
                    stroke="#3a7bd5" 
                    strokeWidth={2}
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="verified" 
                    name="OTPs Verified"
                    stroke="#00C49F" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Weekly OTP Pattern */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">Weekly OTP Pattern</h3>
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
                  <Bar dataKey="generated" name="OTPs Generated" fill="#3a7bd5" />
                  <Bar dataKey="verified" name="OTPs Verified" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* OTP Success/Failure Trends */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">OTP Success/Failure Trends</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={otpTimeSeries}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="verified" 
                    name="Successful Verifications"
                    stackId="1"
                    stroke="#00C49F" 
                    fill="#00C49F" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failed" 
                    name="Failed Verifications"
                    stackId="1"
                    stroke="#FF8042" 
                    fill="#FF8042" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Hourly OTP Distribution */}
        <div className="paper">
          <div className="paper-header">
            <h3 className="paper-title">Hourly OTP Distribution</h3>
          </div>
          <div className="paper-content">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={hourlyDistribution}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid stroke="#f5f5f5" />
                  <XAxis dataKey="hour" scale="band" />
                  <YAxis />
                  <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                  <Legend />
                  <Bar dataKey="count" name="OTPs Sent" barSize={20} fill="#3a7bd5" />
                  <Line type="monotone" dataKey="count" name="Trend" stroke="#ff7300" dot={false} />
                </ComposedChart>
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
            Delivery Methods
          </button>
          <button 
            className={`tab ${activeTab === 1 ? 'active' : ''}`} 
            onClick={() => handleTabChange(1)}
          >
            Verification Status
          </button>
          <button 
            className={`tab ${activeTab === 2 ? 'active' : ''}`} 
            onClick={() => handleTabChange(2)}
          >
            User Segments
          </button>
          <button 
            className={`tab ${activeTab === 3 ? 'active' : ''}`} 
            onClick={() => handleTabChange(3)}
          >
            Verification Time
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 0 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Delivery Methods Bar Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={deliveryMethodsChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" scale="band" />
                    <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                    <Legend />
                    <Bar dataKey="value" name="OTPs Sent" fill="#3a7bd5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Delivery Methods Table */}
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Delivery Method</th>
                      <th style={{ textAlign: 'right' }}>OTPs Sent</th>
                      <th style={{ textAlign: 'right' }}>Success Rate</th>
                      <th style={{ textAlign: 'right' }}>Avg. Time to Verify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryMethodsData.sms && (
                      <tr>
                        <td>SMS</td>
                        <td style={{ textAlign: 'right' }}>
                          {deliveryMethodsData.sms.total ? new Intl.NumberFormat().format(deliveryMethodsData.sms.total) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {deliveryMethodsData.sms.successRate ? `${deliveryMethodsData.sms.successRate.toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {deliveryMethodsData.sms.avgVerificationTime ? `${deliveryMethodsData.sms.avgVerificationTime}s` : '-'}
                        </td>
                      </tr>
                    )}
                    {deliveryMethodsData.email && (
                      <tr>
                        <td>Email</td>
                        <td style={{ textAlign: 'right' }}>
                          {deliveryMethodsData.email.total ? new Intl.NumberFormat().format(deliveryMethodsData.email.total) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {deliveryMethodsData.email.successRate ? `${deliveryMethodsData.email.successRate.toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {deliveryMethodsData.email.avgVerificationTime ? `${deliveryMethodsData.email.avgVerificationTime}s` : '-'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 1 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Verification Status Pie Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={otpByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {otpByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Verification Analysis</h3>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Successful Verifications 
                    ({summaryData ? `${summaryData.successRate}%` : '-'})
                  </h4>
                  <p className="text-gray-600">OTPs that were successfully verified by users within the allotted time window.</p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Failed Verifications 
                    ({summaryData ? `${(100 - summaryData.successRate).toFixed(1)}%` : '-'})
                  </h4>
                  <p className="text-gray-600">OTPs that expired, were entered incorrectly multiple times, or had other verification issues.</p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">Key Insights</h4>
                  <ul className="list-disc pl-5 text-gray-600">
                    <li>SMS verification has a 7.2% higher success rate than email</li>
                    <li>Most failures occur during high-traffic periods (6-8 PM)</li>
                    <li>New users have a 5% lower verification success rate than returning users</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 2 && (
            <div className="grid grid-cols-2 gap-6">
              {/* User Segments Pie Chart */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={userSegmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {userSegmentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">User Segment Analysis</h3>
                <div className="mb-4">
                  <h4 className="font-medium">
                    New Users 
                    ({userSegmentChartData.length > 0 ? `${((userSegmentChartData[0].value / userSegmentChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%` : '-'})
                  </h4>
                  <p className="text-gray-600">Users who registered within the last 30 days and are verifying their accounts or making first transactions.</p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Returning Users 
                    ({userSegmentChartData.length > 1 ? `${((userSegmentChartData[1].value / userSegmentChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%` : '-'})
                  </h4>
                  <p className="text-gray-600">Regular users who verify for login, payment, or other service actions.</p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">
                    Dormant Users 
                    ({userSegmentChartData.length > 2 ? `${((userSegmentChartData[2].value / userSegmentChartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%` : '-'})
                  </h4>
                  <p className="text-gray-600">Users returning after 60+ days of inactivity, typically requiring additional verification.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div className="grid grid-cols-2 gap-6">
              {/* Verification Time Distribution */}
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={verificationTimeData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat().format(value)} />
                    <Legend />
                    <Bar dataKey="count" name="Number of Verifications" fill="#3a7bd5" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Verification Time Analysis</h3>
                <div className="mb-4">
                  <h4 className="font-medium">Verification Speed</h4>
                  <p className="text-gray-600">
                    The average verification time is {summaryData?.avgVerificationTime || '-'} seconds.
                    Most verifications are completed within 30 seconds.
                  </p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">Performance Trends</h4>
                  <p className="text-gray-600">
                    {deliveryMethodsData.sms && deliveryMethodsData.email ? 
                      `SMS verifications are ${Math.abs(deliveryMethodsData.sms.avgVerificationTime - deliveryMethodsData.email.avgVerificationTime).toFixed(1)} seconds faster than email on average.` : 
                      'Verification performance trends are being analyzed.'}
                  </p>
                </div>
                <div className="mb-4">
                  <h4 className="font-medium">Improvement Opportunities</h4>
                  <p className="text-gray-600">
                    Optimizing verification times for slower channels can improve overall user experience.
                  </p>
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

export default OtpDashboard;
