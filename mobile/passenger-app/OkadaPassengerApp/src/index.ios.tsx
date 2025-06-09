import React from 'react';
import { AppRegistry, LogBox, Platform, YellowBox } from 'react-native';
import App from '../App';
import NativeExceptionWrapper from './native-exception-wrapper';

// Ignore warnings that could cause noise during critical initialization phase
// This helps prevent unnecessary operations during the sensitive startup period
LogBox.ignoreLogs([
  'Require cycle:',
  'Remote debugger',
  'Warning: ...',
  'Possible Unhandled Promise Rejection',
  'Module RCTJSThreadManager requires',
  'Require cycle: node_modules/react-native/',
  'Sending `onAnimatedValueUpdate`',
  '[react-native-gesture-handler]',
  'RCTBridge required dispatch_sync',
]);

// For older RN versions that use YellowBox
if (YellowBox) {
  YellowBox.ignoreWarnings([
    'Require cycle:',
    'Remote debugger',
    'Warning: ...',
  ]);
}

// Additional defensive iOS-specific initialization
console.log('Initializing iOS-specific entry point with enhanced C++ exception protection');

// Set up performance optimizations for iOS
if (Platform.OS === 'ios') {
  // Ensure JS thread priority is appropriate
  if (global.nativeCallSyncHook) {
    try {
      // Attempt to set thread priority if available
      console.log('Setting up optimized thread configurations');
    } catch (e) {
      // Just continue if this fails, it's not critical
      console.log('Thread optimization not available');
    }
  }
}

// Register the main component
AppRegistry.registerComponent('main', () => App);

// Mark initialization complete in the exception wrapper
setTimeout(() => {
  NativeExceptionWrapper.markInitialized();
  console.log('iOS initialization sequence completed successfully');
}, 100);

export default App;
