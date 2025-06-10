import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import { LogBox, Platform } from 'react-native';
import './src/utils/uuidPolyfill'; // Import the UUID polyfill
import AppNavigator from './src/navigation/AppNavigator';
import performanceOptimizer from './src/utils/performanceOptimizer';

// Import native exception wrapper without causing type errors
const NativeExceptionWrapper = Platform.OS === 'ios'
  ? require('./src/native-exception-wrapper').default
  : { markInitialized: () => {} };

// Ignore specific warnings
LogBox.ignoreLogs([
  'Require cycle:',
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
  'AsyncStorage has been extracted from react-native',
]);

export default function App() {
  // Initialize the exception wrapper for iOS
  if (Platform.OS === 'ios') {
    setTimeout(() => {
      NativeExceptionWrapper.markInitialized();
    }, 100);
  }

  // Initialize performance optimizations
  useEffect(() => {
    // Start performance optimizations
    const initializeOptimizations = async () => {
      try {
        await performanceOptimizer.initializePerformanceOptimizations();
        console.log('Performance optimizations initialized');
      } catch (error) {
        console.error('Failed to initialize performance optimizations:', error);
      }
    };

    initializeOptimizations();

    // Clean up when component unmounts
    return () => {
      performanceOptimizer.cleanupPerformanceOptimizations();
    };
  }, []);

  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <AppNavigator />
    </Provider>
  );
}
