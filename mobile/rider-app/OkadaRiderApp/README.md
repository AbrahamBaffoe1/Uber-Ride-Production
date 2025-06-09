er# Okada Rider App

## Connection Troubleshooting

If you're encountering the "Could not connect to development server" error, please follow these steps to resolve the issue:

### Connection Issues Solution

We've added a custom Metro bundler server that helps solve network connectivity issues between your React Native app and the Metro bundler.

### Setup Instructions

1. Make sure you have the latest dependencies:

```bash
npm install
# or
yarn install
```

2. Start the development server with our custom script:

```bash
npm run dev
# or 
yarn dev
```

This script will:
- Clear the Metro cache
- Find your local network IP address automatically
- Configure Metro to use your IP address instead of localhost
- Start the development server on all network interfaces

### Alternative Starting Methods

You can also use these approaches:

#### 1. Using the custom server alone:

```bash
npm run server
# or
yarn server
```

#### 2. Manually clearing the cache and starting:

```bash
npm run clear-cache && npm start
# or
yarn clear-cache && yarn start
```

### Troubleshooting Connection Errors

If you're still experiencing the "Could not connect to development server" error:

1. Make sure your device is on the same WiFi network as your development machine
2. Check that no firewalls are blocking the connection on port 8081
3. For physical devices, shake the device to open the developer menu and update the IP address to the one shown in the terminal
4. For iOS devices, verify that the development server is properly configured in the AppDelegate

### Additional Debugging

Check that the Metro server shows in the terminal output:
```
🚀 Metro Bundler running at http://your-ip-address:8081
```

You can also check the status server at:
```
http://your-ip-address:8082/status
```

This endpoint returns information about the running server that can help with debugging.

### Advanced Configuration

If you need to specify a particular IP address or port, you can set these environment variables:

```bash
IP_ADDRESS=192.168.0.100 PORT=8088 npm run server
