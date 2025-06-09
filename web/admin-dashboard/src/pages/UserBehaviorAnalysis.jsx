import React, { useState, useEffect } from 'react';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';
import StatCard from '../components/dashboard/StatCard';
import { formatNumber } from '../utils/formatters';

const UserBehaviorAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [userSegment, setUserSegment] = useState('all'); // all, riders, passengers
  const [timeframe, setTimeframe] = useState('month'); // week, month, quarter, year
  
  const [userMetrics, setUserMetrics] = useState({
    activeUsers: 0,
    newUsers: 0,
    churned: 0,
    retentionRate: 0,
    averageSessionDuration: 0,
    sessionsPerUser: 0,
    bounceRate: 0,
    appOpenRate: 0
  });
  
  const [sessionData, setSessionData] = useState({
    labels: [],
    data: []
  });
  
  // Retention cohorts data would be used in a future feature
  const [, setRetentionCohorts] = useState({
    labels: [],
    cohorts: []
  });
  
  const [funnelData, setFunnelData] = useState({
    labels: [],
    data: []
  });
  
  const [heatmapData, setHeatmapData] = useState({
    days: [],
    hours: [],
    data: []
  });
  
  const [userSegmentData, setUserSegmentData] = useState({
    labels: [],
    data: []
  });

  // Fetch data based on selected filters
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Generate mock data
      const mockData = generateMockData(userSegment, timeframe);
      
      // Update state with mock data
      setUserMetrics(mockData.userMetrics);
      setSessionData(mockData.sessionData);
      setRetentionCohorts(mockData.retentionCohorts);
      setFunnelData(mockData.funnelData);
      setHeatmapData(mockData.heatmapData);
      setUserSegmentData(mockData.userSegmentData);
      
      setLoading(false);
    }, 1000);
  }, [userSegment, timeframe]);

  // Generate mock data based on filters
  const generateMockData = (segment, timeframe) => {
    // Helper functions to generate random data
    const getRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomDecimal = (min, max) => Number((Math.random() * (max - min) + min).toFixed(2));
    
    let sessionLabels = [];
    let sessionValues = [];
    
    // Generate appropriate labels based on timeframe
    switch (timeframe) {
      case 'week':
        sessionLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'month':
        sessionLabels = Array.from({ length: 30 }, (_, i) => `Day ${i+1}`);
        break;
      case 'quarter':
        sessionLabels = Array.from({ length: 12 }, (_, i) => `Week ${i+1}`);
        break;
      case 'year':
        sessionLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      default:
        sessionLabels = Array.from({ length: 30 }, (_, i) => `Day ${i+1}`);
    }
    
    // Generate session data
    for (let i = 0; i < sessionLabels.length; i++) {
      // Different ranges based on user segment
      let min, max;
      if (segment === 'riders') {
        min = 50;
        max = 200;
      } else if (segment === 'passengers') {
        min = 200;
        max = 800;
      } else {
        min = 250;
        max = 1000;
      }
      sessionValues.push(getRandomValue(min, max));
    }
    
    // Generate retention cohort data
    // Each row represents a cohort (users who joined in a specific week/month)
    // Each column represents retention after X weeks/months
    const cohortLabels = timeframe === 'week' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'] : 
                         ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5'];
    
    const cohorts = [];
    for (let i = 0; i < 6; i++) {
      const cohort = [];
      // First value is 100% (all users who joined)
      cohort.push(100);
      // Subsequent values show decreasing retention
      for (let j = 1; j < 5; j++) {
        // Retention decreases over time but at different rates for different segments
        let retention;
        if (segment === 'riders') {
          retention = getRandomDecimal(65, 95) - (j * 5);
        } else if (segment === 'passengers') {
          retention = getRandomDecimal(50, 85) - (j * 7);
        } else {
          retention = getRandomDecimal(55, 90) - (j * 6);
        }
        // Ensure retention doesn't go below 20%
        cohort.push(Math.max(20, retention));
      }
      cohorts.push(cohort);
    }
    
    // Generate funnel data - conversion through key app flows
    const funnelSteps = segment === 'riders' ? 
      ['App Open', 'Online Status', 'Ride Request', 'Accept Ride', 'Pickup', 'Complete Ride'] : 
      ['App Open', 'Search Ride', 'Request Ride', 'Match Found', 'Ride Start', 'Ride Complete'];
    
    const funnelValues = [];
    let currentValue = getRandomValue(900, 1000);
    funnelValues.push(currentValue);
    
    // Conversion rates differ by segment
    let dropFactors;
    if (segment === 'riders') {
      dropFactors = [0.1, 0.15, 0.05, 0.02, 0.01];
    } else if (segment === 'passengers') {
      dropFactors = [0.15, 0.25, 0.1, 0.05, 0.02];
    } else {
      dropFactors = [0.12, 0.2, 0.08, 0.04, 0.015];
    }
    
    for (let i = 0; i < 5; i++) {
      currentValue = Math.floor(currentValue * (1 - dropFactors[i]));
      funnelValues.push(currentValue);
    }
    
    // Generate usage heatmap data (days of week vs hours of day)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    
    const heatmapValues = [];
    for (let day = 0; day < 7; day++) {
      const dayData = [];
      for (let hour = 0; hour < 24; hour++) {
        // Different usage patterns based on segment and time
        let value;
        
        // Weekday morning and evening commute hours
        const isMorningCommute = hour >= 6 && hour <= 9;
        const isEveningCommute = hour >= 16 && hour <= 19;
        const isWeekend = day >= 5; // Saturday and Sunday
        
        if (segment === 'riders') {
          if (isMorningCommute || isEveningCommute) {
            value = getRandomValue(70, 100);
          } else if (hour >= 22 || hour <= 5) {
            value = getRandomValue(10, 40); // Late night
          } else {
            value = getRandomValue(30, 70);
          }
          
          // Weekend adjustments
          if (isWeekend) {
            if (hour >= 10 && hour <= 16) {
              value = getRandomValue(40, 80); // Daytime weekend
            } else if (hour >= 20 && hour <= 23) {
              value = getRandomValue(60, 90); // Weekend evening
            }
          }
        } else if (segment === 'passengers') {
          if (isMorningCommute) {
            value = getRandomValue(80, 100);
          } else if (isEveningCommute) {
            value = getRandomValue(70, 95);
          } else if (hour >= 22 || hour <= 5) {
            value = getRandomValue(15, 50); // Late night
          } else {
            value = getRandomValue(20, 60);
          }
          
          // Weekend adjustments
          if (isWeekend) {
            if (hour >= 10 && hour <= 16) {
              value = getRandomValue(50, 80); // Daytime weekend
            } else if (hour >= 19 && hour <= 23) {
              value = getRandomValue(70, 100); // Weekend evening
            }
          }
        } else {
          // Combined
          if (isMorningCommute) {
            value = getRandomValue(75, 100);
          } else if (isEveningCommute) {
            value = getRandomValue(65, 95);
          } else if (hour >= 22 || hour <= 5) {
            value = getRandomValue(10, 45); // Late night
          } else {
            value = getRandomValue(25, 65);
          }
          
          // Weekend adjustments
          if (isWeekend) {
            if (hour >= 10 && hour <= 16) {
              value = getRandomValue(45, 80); // Daytime weekend
            } else if (hour >= 19 && hour <= 23) {
              value = getRandomValue(65, 95); // Weekend evening
            }
          }
        }
        
        dayData.push(value);
      }
      heatmapValues.push(dayData);
    }
    
    // User segments data (distribution)
    let segmentLabels, segmentValues;
    
    if (segment === 'riders') {
      // Rider segments
      segmentLabels = ['Full-time', 'Part-time', 'Weekend Only', 'Occasional', 'New Riders'];
      segmentValues = [
        getRandomValue(30, 40),
        getRandomValue(25, 35),
        getRandomValue(15, 25),
        getRandomValue(5, 15),
        getRandomValue(5, 10)
      ];
    } else if (segment === 'passengers') {
      // Passenger segments
      segmentLabels = ['Daily Commuters', 'Regular Users', 'Weekend Users', 'Occasional', 'One-time'];
      segmentValues = [
        getRandomValue(20, 30),
        getRandomValue(25, 35),
        getRandomValue(15, 25),
        getRandomValue(15, 25),
        getRandomValue(5, 15)
      ];
    } else {
      // All users segments
      segmentLabels = ['Power Users', 'Regular Users', 'Occasional', 'Dormant', 'New Users'];
      segmentValues = [
        getRandomValue(15, 25),
        getRandomValue(30, 40),
        getRandomValue(20, 30),
        getRandomValue(10, 20),
        getRandomValue(5, 15)
      ];
    }
    
    // User metrics based on segment
    const mockUserMetrics = {
      activeUsers: segment === 'riders' ? getRandomValue(1000, 5000) : 
                  segment === 'passengers' ? getRandomValue(5000, 20000) : 
                  getRandomValue(6000, 25000),
      newUsers: segment === 'riders' ? getRandomValue(200, 800) : 
                segment === 'passengers' ? getRandomValue(800, 3000) : 
                getRandomValue(1000, 3800),
      churned: segment === 'riders' ? getRandomValue(50, 200) : 
              segment === 'passengers' ? getRandomValue(500, 1500) : 
              getRandomValue(550, 1700),
      retentionRate: segment === 'riders' ? getRandomDecimal(0.7, 0.9) : 
                    segment === 'passengers' ? getRandomDecimal(0.5, 0.75) : 
                    getRandomDecimal(0.55, 0.8),
      averageSessionDuration: segment === 'riders' ? getRandomValue(8, 25) : 
                              segment === 'passengers' ? getRandomValue(4, 15) : 
                              getRandomValue(5, 20),
      sessionsPerUser: segment === 'riders' ? getRandomDecimal(8, 15) : 
                      segment === 'passengers' ? getRandomDecimal(2, 8) : 
                      getRandomDecimal(3, 10),
      bounceRate: segment === 'riders' ? getRandomDecimal(0.1, 0.25) : 
                segment === 'passengers' ? getRandomDecimal(0.15, 0.35) : 
                getRandomDecimal(0.12, 0.3),
      appOpenRate: segment === 'riders' ? getRandomDecimal(0.5, 0.8) : 
                  segment === 'passengers' ? getRandomDecimal(0.3, 0.6) : 
                  getRandomDecimal(0.35, 0.7)
    };
    
    return {
      userMetrics: mockUserMetrics,
      sessionData: {
        labels: sessionLabels,
        data: sessionValues
      },
      retentionCohorts: {
        labels: cohortLabels,
        cohorts: cohorts
      },
      funnelData: {
        labels: funnelSteps,
        data: funnelValues
      },
      heatmapData: {
        days,
        hours,
        data: heatmapValues
      },
      userSegmentData: {
        labels: segmentLabels,
        data: segmentValues
      }
    };
  };

  const renderSimpleHeatmap = () => {
    if (loading) {
      return <div className="h-96 bg-gray-100 animate-pulse rounded" />;
    }
    
    // Simplified heatmap visualization using a grid
    // Each cell color is based on the value (0-100)
    return (
      <div className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border border-gray-200">Hour/Day</th>
              {heatmapData.days.map((day, i) => (
                <th key={i} className="p-2 border border-gray-200">{day.substring(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.hours.filter((_, i) => i % 2 === 0).map((hour, hourIndex) => (
              <tr key={hourIndex}>
                <td className="p-2 border border-gray-200 font-medium">{hour}</td>
                {heatmapData.days.map((_, dayIndex) => {
                  // Get the value for this day/hour
                  const value = heatmapData.data[dayIndex] ? heatmapData.data[dayIndex][hourIndex * 2] : 0;
                  
                  // Calculate color based on value (0-100)
                  // From white (low) to blue (high)
                  const intensity = Math.min(255, Math.floor(255 - (value * 2.55)));
                  const bgColor = `rgb(${intensity}, ${intensity}, 255)`;
                  
                  return (
                    <td 
                      key={dayIndex} 
                      className="p-2 border border-gray-200 text-center text-xs"
                      style={{ backgroundColor: bgColor, color: value > 50 ? 'white' : 'black' }}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Behavior Analysis</h1>
        
        <div className="flex space-x-4">
          <div>
            <label className="mr-2 text-sm font-medium text-gray-700">User Segment:</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={userSegment}
              onChange={(e) => setUserSegment(e.target.value)}
            >
              <option value="all">All Users</option>
              <option value="riders">Riders</option>
              <option value="passengers">Passengers</option>
            </select>
          </div>
          
          <div>
            <label className="mr-2 text-sm font-medium text-gray-700">Timeframe:</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Users"
          value={userMetrics.activeUsers}
          icon="👥"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading}
        />
        <StatCard
          title="New Users"
          value={userMetrics.newUsers}
          icon="✨"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          loading={loading}
        />
        <StatCard
          title="Retention Rate"
          value={userMetrics.retentionRate}
          format="percent"
          icon="🔄"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          loading={loading}
        />
        <StatCard
          title="App Opens per User"
          value={userMetrics.sessionsPerUser}
          icon="📱"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          loading={loading}
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Daily Sessions</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <LineChart
              data={sessionData.data}
              labels={sessionData.labels}
              title=""
              height={320}
              fill={true}
              colors={['#3b82f6']}
            />
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">User Segments</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <PieChart
              data={userSegmentData.data}
              labels={userSegmentData.labels}
              title=""
              height={320}
              doughnut={true}
            />
          )}
        </div>
      </div>
      
      {/* Funnel Visualization */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                {funnelData.labels.map((label, i) => (
                  <div key={i} className="text-center" style={{ width: `${100 / funnelData.labels.length}%` }}>
                    {label}
                  </div>
                ))}
              </div>
              <div className="relative h-20">
                {funnelData.data.map((value, i) => {
                  // Calculate width percentage based on first value
                  const widthPercent = (value / funnelData.data[0]) * 100;
                  // Calculate conversion rate from previous step
                  const conversionRate = i > 0 
                    ? ((value / funnelData.data[i-1]) * 100).toFixed(1) 
                    : '100';
                  
                  return (
                    <div 
                      key={i} 
                      className="absolute h-16"
                      style={{ 
                        width: `${widthPercent}%`, 
                        left: 0, 
                        top: 0,
                        background: `rgba(59, 130, 246, ${0.3 + (i * 0.1)})`,
                        borderRadius: '4px',
                        transition: 'width 1s ease-in-out',
                        transform: `translateY(${i * 4}px)`,
                        zIndex: 10 - i
                      }}
                    >
                      <div className="flex justify-between items-center px-2 h-full text-white text-xs md:text-sm">
                        <span className="font-bold">{formatNumber(value)}</span>
                        {i > 0 && <span className="bg-blue-900 px-1 py-0.5 rounded text-xs">{conversionRate}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-24">
                {funnelData.data.map((value, i) => (
                  <div key={i} className="text-center" style={{ width: `${100 / funnelData.data.length}%` }}>
                    {formatNumber(value)} users
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Heatmap */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Usage Heatmap (Days & Hours)</h3>
          {renderSimpleHeatmap()}
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Avg Session Duration"
          value={userMetrics.averageSessionDuration}
          format="number"
          suffix=" min"
          icon="⏱️"
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          loading={loading}
        />
        <StatCard
          title="Bounce Rate"
          value={userMetrics.bounceRate}
          format="percent"
          icon="↩️"
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          loading={loading}
        />
        <StatCard
          title="Churned Users"
          value={userMetrics.churned}
          icon="👋"
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
          loading={loading}
        />
        <StatCard
          title="App Open Rate"
          value={userMetrics.appOpenRate}
          format="percent"
          icon="🔔"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading}
        />
      </div>
    </div>
  );
};

export default UserBehaviorAnalysis;
