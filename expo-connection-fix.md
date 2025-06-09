# Expo Connection Fix

This document explains the fixes implemented to resolve the connection issues between the Expo development server and the mobile applications.

## Problem

The error message indicated a connection issue with the Expo development server:

```
Could not connect to development server.

Ensure the following:
- Node server is running and available on the same network - run 'npm start' from react-native root
- Node server URL is correctly set in AppDelegate
- WiFi is enabled and connected to the same network as the Node Server

URL: http://192.168.0.130:8082/index.bundle?platform=ios&dev=true&hot=false&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&unstable_transformProfile=hermes-stable
```

## Root Causes

1. **Port Configuration**: The Metro bundler needed specific port assignments
2. **CORS Headers**: Missing CORS headers for better connectivity
3. **Cache Issues**: Stale Metro cache affecting connections

## Implemented Fixes

### 1. Metro Configuration Updates

Updated both the passenger and rider app Metro configurations:

```javascript
// Improve connection settings with port assignment and CORS headers
config.server = {
  port: 8082, // Using different port than passenger app to avoid conflicts
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for better connectivity
      res.setHeader('Access-Control-Allow-Origin', '*');
      return middleware(req, res, next);
    };
  }
};
```

This ensures that:
- The Metro server uses a specific port (8081 for passenger app, 8082 for rider app)
- CORS headers are properly set for cross-origin requests

### 2. Start Script Simplification

Updated the start scripts for both apps to:

1. Automatically clear any potential port conflicts
2. Clear Metro cache before starting
3. Use default network settings instead of custom IP configuration

Key improvements:
```bash
# Kill any processes using the required ports
lsof -ti:8081 | xargs kill -9 2>/dev/null || true  # For passenger app

# Clear cache and use default settings
npx expo start --clear --port 8081
```

### 3. Port Conflict Management

Enhanced both scripts to ensure no conflicts with other processes:
```bash
# Kill any processes using the required ports
lsof -ti:8081 | xargs kill -9 2>/dev/null || true  # For passenger app
lsof -ti:8082 | xargs kill -9 2>/dev/null || true  # For rider app
```

## How to Use

The changes have been integrated into the existing startup scripts. To use them:

1. Start the backend server:
   ```bash
   ./scripts/start-with-mongodb-init.sh
   ```

2. Start the passenger app:
   ```bash
   ./scripts/start-passenger-app.sh
   ```

3. Start the rider app:
   ```bash
   ./scripts/start-rider-app.sh
   ```

## Troubleshooting

If you still encounter connection issues:

1. Ensure your mobile device is on the same WiFi network as your development machine
2. Check for firewall or network restrictions that might be blocking the Metro server ports
3. Try completely resetting the cache:
   ```bash
   cd mobile/rider-app/OkadaRiderApp
   npx expo start --clear
   ```
4. Make sure no other process is using ports 8081 or 8082
