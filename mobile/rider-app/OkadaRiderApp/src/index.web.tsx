import React from 'react';
import { AppRegistry, View, Text, StyleSheet, Platform } from 'react-native';
import App from '../App';
import { webStyles, isWeb } from './styles/web.styles';

// Set up responsive viewport meta tag and CSS for web
if (isWeb) {
  // Add viewport meta tag
  const viewportMeta = document.createElement('meta');
  viewportMeta.name = 'viewport';
  viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.head.appendChild(viewportMeta);
  
  // Add theme-color meta tag for browser UI
  const themeColorMeta = document.createElement('meta');
  themeColorMeta.name = 'theme-color';
  themeColorMeta.content = '#2E86DE'; // Okada brand color
  document.head.appendChild(themeColorMeta);
  
  // Add link to external CSS file
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = '../assets/css/web-responsive.css';
  document.head.appendChild(cssLink);
  
  // Add app title
  document.title = 'Okada Rider App';
}

// Root component with web-specific wrappers
function Root() {
  return (
    <View style={styles.container}>
      <App />
      {isWeb && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Okada Transportation © {new Date().getFullYear()} • Web Version
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  footer: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});

// Register the app
AppRegistry.registerComponent('main', () => Root);

// Web-specific setup
if (isWeb) {
  const rootTag = document.getElementById('root') || document.getElementById('main');
  AppRegistry.runApplication('main', { rootTag });
}
