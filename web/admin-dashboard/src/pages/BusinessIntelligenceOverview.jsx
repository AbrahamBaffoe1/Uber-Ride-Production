import React, { useEffect, useState } from 'react';
import StatCard from '../components/dashboard/StatCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import PieChart from '../components/charts/PieChart';
// No formatters needed for this component

const BusinessIntelligenceOverview = () => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // day, week, month, year
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalRides: 0,
    activeRiders: 0,
    activePassengers: 0,
    conversionRate: 0,
    averageRideValue: 0,
    riderRetentionRate: 0,
    passengerRetentionRate: 0
  });

  const [growthMetrics, setGrowthMetrics] = useState({
    revenue: { current: 0, previous: 0, change: 0 },
    rides: { current: 0, previous: 0, change: 0 },
    riders: { current: 0, previous: 0, change: 0 },
    passengers: { current: 0, previous: 0, change: 0 }
  });

  const [revenueData, setRevenueData] = useState({
    labels: [],
    data: []
  });

  const [ridesData, setRidesData] = useState({
    labels: [],
    data: []
  });

  const [userAcquisitionData, setUserAcquisitionData] = useState({
    labels: [],
    riderData: [],
    passengerData: []
  });

  const [paymentMethodsData, setPaymentMethodsData] = useState({
    labels: [],
    data: []
  });

  // Fetch data based on selected timeframe
  useEffect(() => {
    setLoading(true);
    
    // Simulate API call to fetch data
    setTimeout(() => {
      // Generate mock data based on timeframe
      const mockData = generateMockData(timeframe);
      
      // Update state with mock data
      setMetrics(mockData.metrics);
      setGrowthMetrics(mockData.growthMetrics);
      setRevenueData(mockData.revenueData);
      setRidesData(mockData.ridesData);
      setUserAcquisitionData(mockData.userAcquisitionData);
      setPaymentMethodsData(mockData.paymentMethodsData);
      
      setLoading(false);
    }, 1000);
  }, [timeframe]);

  // Generate mock data based on timeframe
  const generateMockData = (timeframe) => {
    let labels = [];
    let revenueValues = [];
    let rideValues = [];
    let riderValues = [];
    let passengerValues = [];
    
    const getRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomPercentage = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
    
    // Generate appropriate labels and data points based on timeframe
    switch (timeframe) {
      case 'day':
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        for (let i = 0; i < 24; i++) {
          revenueValues.push(getRandomValue(10000, 50000));
          rideValues.push(getRandomValue(50, 200));
          riderValues.push(getRandomValue(20, 80));
          passengerValues.push(getRandomValue(50, 150));
        }
        break;
      case 'week':
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        for (let i = 0; i < 7; i++) {
          revenueValues.push(getRandomValue(50000, 200000));
          rideValues.push(getRandomValue(300, 1000));
          riderValues.push(getRandomValue(100, 300));
          passengerValues.push(getRandomValue(200, 500));
        }
        break;
      case 'month':
        labels = Array.from({ length: 30 }, (_, i) => `Day ${i+1}`);
        for (let i = 0; i < 30; i++) {
          revenueValues.push(getRandomValue(100000, 500000));
          rideValues.push(getRandomValue(1000, 3000));
          riderValues.push(getRandomValue(300, 900));
          passengerValues.push(getRandomValue(600, 1500));
        }
        break;
      case 'year':
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 0; i < 12; i++) {
          revenueValues.push(getRandomValue(1000000, 5000000));
          rideValues.push(getRandomValue(10000, 30000));
          riderValues.push(getRandomValue(3000, 9000));
          passengerValues.push(getRandomValue(6000, 15000));
        }
        break;
      default:
        break;
    }
    
    // Mock metrics
    const mockMetrics = {
      totalRevenue: revenueValues.reduce((acc, val) => acc + val, 0),
      totalRides: rideValues.reduce((acc, val) => acc + val, 0),
      activeRiders: getRandomValue(1000, 5000),
      activePassengers: getRandomValue(5000, 20000),
      conversionRate: getRandomPercentage(0.1, 0.3),
      averageRideValue: getRandomValue(500, 2000),
      riderRetentionRate: getRandomPercentage(0.6, 0.9),
      passengerRetentionRate: getRandomPercentage(0.4, 0.8)
    };
    
    // Mock growth metrics
    const mockGrowthMetrics = {
      revenue: { 
        current: revenueValues.reduce((acc, val) => acc + val, 0), 
        previous: revenueValues.reduce((acc, val) => acc + val, 0) * (1 - (Math.random() * 0.4 - 0.2)), 
        change: getRandomPercentage(-20, 40)
      },
      rides: { 
        current: rideValues.reduce((acc, val) => acc + val, 0), 
        previous: rideValues.reduce((acc, val) => acc + val, 0) * (1 - (Math.random() * 0.4 - 0.2)), 
        change: getRandomPercentage(-15, 35)
      },
      riders: { 
        current: mockMetrics.activeRiders, 
        previous: mockMetrics.activeRiders * (1 - (Math.random() * 0.4 - 0.2)), 
        change: getRandomPercentage(-10, 30)
      },
      passengers: { 
        current: mockMetrics.activePassengers, 
        previous: mockMetrics.activePassengers * (1 - (Math.random() * 0.4 - 0.2)), 
        change: getRandomPercentage(-10, 30)
      }
    };
    
    // Mock payment methods data
    const mockPaymentMethodsData = {
      labels: ['Credit Card', 'Mobile Money', 'Cash', 'Digital Wallet', 'Bank Transfer'],
      data: [
        getRandomValue(20, 40),
        getRandomValue(30, 50),
        getRandomValue(10, 30),
        getRandomValue(5, 15),
        getRandomValue(2, 10)
      ]
    };
    
    return {
      metrics: mockMetrics,
      growthMetrics: mockGrowthMetrics,
      revenueData: {
        labels,
        data: revenueValues
      },
      ridesData: {
        labels,
        data: rideValues
      },
      userAcquisitionData: {
        labels,
        riderData: riderValues,
        passengerData: passengerValues
      },
      paymentMethodsData: mockPaymentMethodsData
    };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Business Intelligence Dashboard</h1>
        
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('day')}
          >
            Day
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('year')}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={growthMetrics.revenue.current}
          change={parseFloat(growthMetrics.revenue.change)}
          format="currency"
          icon="💰"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          loading={loading}
        />
        <StatCard
          title="Total Rides"
          value={growthMetrics.rides.current}
          change={parseFloat(growthMetrics.rides.change)}
          icon="🚗"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading}
        />
        <StatCard
          title="Active Riders"
          value={growthMetrics.riders.current}
          change={parseFloat(growthMetrics.riders.change)}
          icon="🏍️"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          loading={loading}
        />
        <StatCard
          title="Active Passengers"
          value={growthMetrics.passengers.current}
          change={parseFloat(growthMetrics.passengers.change)}
          icon="👤"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          loading={loading}
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <LineChart
              data={revenueData.data}
              labels={revenueData.labels}
              title=""
              height={320}
              fill={true}
              colors={['#10b981']}
            />
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Rides Completed</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <BarChart
              data={ridesData.data}
              labels={ridesData.labels}
              title=""
              height={320}
              colors={['#3b82f6']}
            />
          )}
        </div>
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">User Acquisition</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <LineChart
              data={[userAcquisitionData.riderData, userAcquisitionData.passengerData]}
              labels={[userAcquisitionData.labels, ['Riders', 'Passengers']]}
              title=""
              height={320}
              colors={['#a855f7', '#f59e0b']}
            />
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <PieChart
              data={paymentMethodsData.data}
              labels={paymentMethodsData.labels}
              title=""
              height={320}
              doughnut={true}
            />
          )}
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Conversion Rate"
          value={metrics.conversionRate}
          format="percent"
          icon="📈"
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          loading={loading}
        />
        <StatCard
          title="Average Ride Value"
          value={metrics.averageRideValue}
          format="currency"
          icon="💵"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          loading={loading}
        />
        <StatCard
          title="Rider Retention"
          value={metrics.riderRetentionRate}
          format="percent"
          icon="🏆"
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          loading={loading}
        />
        <StatCard
          title="Passenger Retention"
          value={metrics.passengerRetentionRate}
          format="percent"
          icon="👥"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          loading={loading}
        />
      </div>
    </div>
  );
};

export default BusinessIntelligenceOverview;
