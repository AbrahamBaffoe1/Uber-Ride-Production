// Development server configuration
// This file is used to configure development server settings
// for both Metro bundler and the development environment

import { Platform } from 'react-native';

interface DevConfig {
  serverHost: string;
  serverPort: number;
  serverUrl: string;
}

// Load from environment variables if available, otherwise use defaults
const DEV_SERVER_PORT = process.env.DEV_SERVER_PORT ? parseInt(process.env.DEV_SERVER_PORT, 10) : 8082;
const DEV_SERVER_HOST = process.env.DEV_SERVER_HOST || 'localhost';

// Create different configurations for iOS and Android
const devConfig: DevConfig = {
  serverHost: DEV_SERVER_HOST,
  serverPort: DEV_SERVER_PORT,
  // For iOS simulator, always use localhost regardless of what's in the ENV
  // For Android, use the host defined in environment or default to localhost
  serverUrl: Platform.select({
    ios: `http://localhost:${DEV_SERVER_PORT}`,
    android: `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`,
    default: `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`
  })
};

console.log(`[Dev Config] Using development server at: ${devConfig.serverUrl}`);

export default devConfig;
