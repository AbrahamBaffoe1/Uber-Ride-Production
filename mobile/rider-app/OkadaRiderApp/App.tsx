// App.tsx
import React, { useEffect, useState, createContext } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '../OkadaRiderApp/src/redux/store';
import RootNavigator from '../OkadaRiderApp/src/screens/navigation/RootNavigator';
import FlashMessage from 'react-native-flash-message';
import { authService } from './src/api/services/authService';
import NetworkStatusIndicator from './src/components/common/NetworkStatusIndicator';
import { apiClient } from './src/api/client';
import networkService from './src/services/network.service';

// Create a context to track authentication state throughout the app
export const AuthContext = createContext<{
  isAuthenticated: boolean;
  userType: 'rider' | 'passenger' | 'admin' | null;
  userId: string | null;
  userName: string | null;
  setIsAuthenticated: (value: boolean) => void;
  setUserType: (value: 'rider' | 'passenger' | 'admin' | null) => void;
  setUserId: (value: string | null) => void;
  setUserName: (value: string | null) => void;
}>({
  isAuthenticated: false,
  userType: null,
  userId: null,
  userName: null,
  setIsAuthenticated: () => {},
  setUserType: () => {},
  setUserId: () => {},
  setUserName: () => {},
});

const App = () => {
  // State to track authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'rider' | 'passenger' | 'admin' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Cleanup resources when app is unmounted
  useEffect(() => {
    return () => {
      // Cleanup network-related resources
      networkService.cleanup();
      apiClient.cleanup();
    };
  }, []);

  // Check authentication status when app starts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setIsAuthenticated(true);
          setUserId(currentUser._id);
          setUserName(`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim());
          
          // Set user type based on role
          if (currentUser.role === 'rider') {
            setUserType('rider');
            console.log('🏍️ User is logged in as: RIDER');
          } else if (currentUser.role === 'passenger') {
            setUserType('passenger');
            console.log('🧑 User is logged in as: PASSENGER');
          } else if (currentUser.role === 'admin') {
            setUserType('admin');
            console.log('👑 User is logged in as: ADMIN');
          } else {
            console.warn('⚠️ Unknown user role:', currentUser.role);
            setUserType(null);
          }
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setIsAuthenticated(false);
        setUserType(null);
        setUserId(null);
        setUserName(null);
      }
    };
    
    checkAuth();
  }, []);

  return (
    <ReduxProvider store={store}>
      <AuthContext.Provider 
        value={{ 
          isAuthenticated, 
          userType, 
          userId, 
          userName,
          setIsAuthenticated, 
          setUserType, 
          setUserId,
          setUserName
        }}
      >
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <RootNavigator />
          <NetworkStatusIndicator />
          <FlashMessage position="top" />
        </SafeAreaProvider>
      </AuthContext.Provider>
    </ReduxProvider>
  );
};

export default App;
