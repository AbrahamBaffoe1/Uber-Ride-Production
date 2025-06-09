/**
 * Custom Expo server configuration for Okada Passenger App
 * This script helps configure the Expo development server to work properly
 * with the backend and ensures consistent network settings.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PORT = 8081;
const SIMULATOR_NAME = 'iPhone 14'; // Change this to match your preferred simulator

// Get local IP address for LAN access
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost
}

// Check if running on Android emulator
function isAndroidEmulator() {
  // Check if ANDROID_EMULATOR environment variable is set
  if (process.env.ANDROID_EMULATOR === 'true') {
    return true;
  }
  
  // Check for common Android emulator environment indicators
  const isAndroid = process.env.REACT_NATIVE_APP_PLATFORM === 'android';
  const isEmulator = process.env.REACT_NATIVE_APP_IS_EMULATOR === 'true';
  
  return isAndroid && isEmulator;
}

// Clear Metro bundler cache
function clearMetroCache() {
  const cachePath = path.join(__dirname, 'node_modules', '.cache', 'metro');
  if (fs.existsSync(cachePath)) {
    console.log('🧹 Clearing Metro bundler cache...');
    fs.rmSync(cachePath, { recursive: true, force: true });
  }
}

// Kill any processes using the Expo port
function killPortProcess() {
  console.log(`🔄 Ensuring port ${PORT} is available...`);
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows
    spawn('cmd.exe', ['/c', `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a`]);
  } else {
    // macOS/Linux
    spawn('bash', ['-c', `lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`]);
  }
}

// Start the Expo server
function startExpoServer() {
  console.log('🚀 Starting Okada Passenger App development server...');
  
  // Check if we're running on Android emulator
  const androidEmulator = isAndroidEmulator();
  if (androidEmulator) {
    console.log('🤖 Android emulator detected - using special configuration');
  }
  
  // Set environment variables
  const env = {
    ...process.env,
    EXPO_PACKAGER_PROXY_URL: `http://localhost:${PORT}`,
    EXPO_DEBUG: 'true',
    NODE_ENV: 'development',
    // Set Android emulator flag for other processes to detect
    ANDROID_EMULATOR: androidEmulator ? 'true' : 'false',
  };
  
  // Determine platform-specific arguments
  const platformArgs = androidEmulator 
    ? ['--android'] 
    : ['--ios', '--simulator'];
  
  // Start Expo with appropriate simulator
  const expoProcess = spawn('npx', [
    'expo', 
    'start', 
    ...platformArgs,
    '--clear',
    '--port', 
    PORT.toString()
  ], {
    env,
    stdio: 'inherit',
    shell: true
  });
  
  // Handle process events
  expoProcess.on('error', (error) => {
    console.error('❌ Failed to start Expo server:', error);
    process.exit(1);
  });
  
  return expoProcess;
}

// Main function
function main() {
  try {
    // Get local IP address
    const localIp = getLocalIpAddress();
    console.log(`📡 Local IP address: ${localIp}`);
    
    // Check if we're running on Android emulator
    const androidEmulator = isAndroidEmulator();
    
    // Prepare environment
    killPortProcess();
    clearMetroCache();
    
    // Start Expo server
    const expoProcess = startExpoServer();
    
    // Handle termination signals
    process.on('SIGINT', () => {
      console.log('👋 Shutting down server...');
      expoProcess.kill();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('👋 Shutting down server...');
      expoProcess.kill();
      process.exit(0);
    });
    
    console.log(`✅ Server started. Connect to Expo at http://localhost:${PORT}`);
    
    // Platform-specific messages
    if (androidEmulator) {
      console.log('🤖 Android emulator detected - using 10.0.2.2 for localhost connections');
      console.log('📱 The Android emulator should launch automatically');
    } else {
      console.log('📱 The iOS simulator should launch automatically');
    }
    
    // Display connection information
    console.log('\n📋 Connection Information:');
    console.log('- Local: http://localhost:' + PORT);
    console.log('- LAN: http://' + localIp + ':' + PORT);
    console.log('- Android Emulator: http://10.0.2.2:' + PORT);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Run the main function
main();
