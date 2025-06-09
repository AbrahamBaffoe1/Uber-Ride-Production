import React from 'react';
import { AppRegistry, LogBox, Platform } from 'react-native';
import App from '../App';

// Ignore non-critical warnings that might appear on iOS
LogBox.ignoreLogs([
  'Require cycle:', // Ignore require cycle warnings
  'Remote debugger', // Ignore remote debugger warnings
  'Animated:', // Ignore warnings about Animated module
  'NativeEventEmitter', // Ignore event emitter warnings
  '[react-native-gesture-handler]', // Ignore gesture handler warnings
]);

// Register the main component
AppRegistry.registerComponent('main', () => App);

// Export the app as the default export
export default App;
