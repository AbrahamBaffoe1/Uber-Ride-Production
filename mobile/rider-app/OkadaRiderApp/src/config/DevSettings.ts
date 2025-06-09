// DevSettings.ts - Configures React Native development settings
// This file is specifically for configuring React Native development mode settings
// such as the Metro bundler URL, dev tools, etc.

import { Platform, NativeModules } from 'react-native';
import devConfig from './dev.ts';

/**
 * Configure development settings for React Native
 * This function should be called as early as possible in the app lifecycle,
 * typically in index.ts or App.tsx
 */
export const configureDevSettings = (): void => {
  if (__DEV__) {
    console.log('Setting up development environment...');
    
    // Set the Metro bundler URL
    // This ensures React Native uses the correct URL for loading JavaScript bundles
    setDevServerUrl();
    
    // Additional development configuration can be added here
    enableDevTools();
  }
};

/**
 * Set the development server URL for Metro bundler
 * This is critical for the app to connect to the correct Metro development server
 */
const setDevServerUrl = (): void => {
  try {
    // Get the DevSettings module for the current platform
    const { DevSettings } = NativeModules;
    
    if (DevSettings) {
      const newUrl = devConfig.serverUrl;
      console.log(`[DevSettings] Setting Metro bundler URL to: ${newUrl}`);
      
      if (Platform.OS === 'ios') {
        // iOS-specific settings
        DevSettings.setJSBundleURL(newUrl);
      } else {
        // Android-specific settings
        DevSettings.setDevServerUrl(newUrl);
      }
    } else {
      console.warn('[DevSettings] DevSettings module not available');
    }
  } catch (error) {
    console.error('[DevSettings] Failed to set development server URL:', error);
  }
};

/**
 * Enable additional development tools
 * This function can be expanded to configure more development tools as needed
 */
const enableDevTools = (): void => {
  if (Platform.OS === 'android') {
    // Additional Android-specific dev settings
    // Example: DevSettings.setHotModuleReplacementEnabled(true);
  } else if (Platform.OS === 'ios') {
    // Additional iOS-specific dev settings
    // Example: enable additional development features
  }
  
  // Configure common dev tools settings
  console.log('[DevSettings] Developer tools enabled');
};

export default { configureDevSettings };
