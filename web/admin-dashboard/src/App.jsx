import React, { useState, useEffect } from 'react';
import BusinessIntelligenceOverview from './pages/BusinessIntelligenceOverview';
import UserBehaviorAnalysis from './pages/UserBehaviorAnalysis';
import PaymentDashboard from './pages/analytics/PaymentDashboard';
import OtpDashboard from './pages/analytics/OtpDashboard';
import UserManagement from './pages/UserManagement';
import PaymentReconciliationDashboard from './pages/PaymentReconciliationDashboard';
import LoginPage from './pages/auth/LoginPage';
import authService from './services/authService';
import { formatDate } from './utils/formatters';
import { CircularProgress } from '@mui/material';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard'); // dashboard, user-behavior, growth-trends, document-analytics, payment-analytics, otp-analytics, user-management, payment-reconciliation
  const [loading, setLoading] = useState(true);
  
  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in local storage
        if (authService.isAuthenticated()) {
          // Validate token by getting current user
          const response = await authService.getCurrentUser();
          
          if (response.success) {
            setIsAuthenticated(true);
            setCurrentUser(response.data);
          } else {
            // Token is invalid, proceed to login
            setIsAuthenticated(false);
            setCurrentUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setCurrentUser(userData);
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
      setCurrentUser(null);
      setActivePage('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <BusinessIntelligenceOverview />;
      case 'user-behavior':
        return <UserBehaviorAnalysis />;
      case 'payment-analytics':
        return <PaymentDashboard />;
      case 'otp-analytics':
        return <OtpDashboard />;
      case 'user-management':
        return <UserManagement />;
      case 'payment-reconciliation':
        return <PaymentReconciliationDashboard />;
      case 'document-analytics':
        // Placeholder for future implementation
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Document Upload Analytics</h1>
            <p className="text-gray-600">This feature is coming soon.</p>
          </div>
        );
      case 'growth-trends':
        // Placeholder for future implementation
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Growth Trend Visualization</h1>
            <p className="text-gray-600">This feature is coming soon.</p>
          </div>
        );
      default:
        return <BusinessIntelligenceOverview />;
    }
  };

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <CircularProgress />
      </div>
    );
  }
  
  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Main authenticated app
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="sidebar-logo">
          <div>
            <h1>Okada Transportation</h1>
            <p>Admin Dashboard</p>
          </div>
        </div>
        
        <nav className="flex-1">
          <ul>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'dashboard' ? 'active' : ''
                }`}
                onClick={() => setActivePage('dashboard')}
              >
                <span className="icon">📊</span>
                Business Intelligence
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'user-behavior' ? 'active' : ''
                }`}
                onClick={() => setActivePage('user-behavior')}
              >
                <span className="icon">👥</span>
                User Behavior
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'growth-trends' ? 'active' : ''
                }`}
                onClick={() => setActivePage('growth-trends')}
              >
                <span className="icon">📈</span>
                Growth Trends
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'document-analytics' ? 'active' : ''
                }`}
                onClick={() => setActivePage('document-analytics')}
              >
                <span className="icon">📄</span>
                Document Analytics
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'payment-analytics' ? 'active' : ''
                }`}
                onClick={() => setActivePage('payment-analytics')}
              >
                <span className="icon">💰</span>
                Payment Analytics
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'payment-reconciliation' ? 'active' : ''
                }`}
                onClick={() => setActivePage('payment-reconciliation')}
              >
                <span className="icon">🔄</span>
                Payment Reconciliation
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'otp-analytics' ? 'active' : ''
                }`}
                onClick={() => setActivePage('otp-analytics')}
              >
                <span className="icon">🔐</span>
                OTP Analytics
              </button>
            </li>
            <li>
              <button
                className={`flex items-center w-full text-left ${
                  activePage === 'user-management' ? 'active' : ''
                }`}
                onClick={() => setActivePage('user-management')}
              >
                <span className="icon">👥</span>
                User Management
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="date-label">Today's Date</div>
          <div className="date">{formatDate(new Date(), 'full')}</div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header>
          <div className="px-6 py-4 flex justify-between items-center">
            <h2 className="page-title">
              {activePage === 'dashboard' && 'Business Intelligence Dashboard'}
              {activePage === 'user-behavior' && 'User Behavior Analysis'}
              {activePage === 'growth-trends' && 'Growth Trend Visualization'}
              {activePage === 'document-analytics' && 'Document Upload Analytics'}
              {activePage === 'payment-analytics' && 'Payment Analytics Dashboard'}
              {activePage === 'payment-reconciliation' && 'Payment Reconciliation Dashboard'}
              {activePage === 'otp-analytics' && 'OTP Analytics Dashboard'}
              {activePage === 'user-management' && 'User Management'}
            </h2>
            
            <div className="flex items-center">
              <button className="notification-button">
                🔔
              </button>
              <div className="user-profile">
                <div className="user-avatar">
                  {currentUser ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}` : 'AD'}
                </div>
                <div className="user-info">
                  <span className="user-name">{currentUser?.firstName || 'Admin'}</span>
                  <button 
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
