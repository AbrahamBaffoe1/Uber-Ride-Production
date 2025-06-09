// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for C++ exceptions in RCTJSThreadManager
config.transformer = {
  ...config.transformer,
  // Force Hermes as the transform engine to prevent C++ exceptions
  unstable_transformProfile: 'hermes-canary',
  minifierPath: 'metro-minify-terser',
};

// Configure resolver to support platform-specific extensions
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'web.jsx', 'web.js', 'web.ts', 'web.tsx'],
  platforms: ['ios', 'android', 'web'],
};

// Add CORS headers and specific port
config.server = {
  port: 8082, // Consistent port for rider app
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for better connectivity
      res.setHeader('Access-Control-Allow-Origin', '*');
      return middleware(req, res, next);
    };
  }
};

module.exports = config;
