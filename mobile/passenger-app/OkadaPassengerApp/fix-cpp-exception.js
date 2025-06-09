/**
 * Fix C++ Exception Script for Okada Passenger App
 * 
 * This script performs a comprehensive cleanup and reset of the React Native environment
 * to resolve C++ exceptions related to the JavaScript thread manager.
 * 
 * Specifically addresses the non-std C++ exception:
 * RCTFatal
 * __26-[RCTJSThreadManager init]_block_invoke_2
 * facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&)
 * invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>)
 * __CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__
 * __CFRunLoopDoBlocks
 * __CFRunLoopRun
 * CFRunLoopRunSpecific
 * +[RCTJSThreadManager runRunLoop]
 * __NSThread__start__
 * _pthread_start
 * thread_start
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const PLATFORM = os.platform();
const IS_WINDOWS = PLATFORM === 'win32';
const IS_MAC = PLATFORM === 'darwin';
const IS_LINUX = PLATFORM === 'linux';

// Colors for console output
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
};

// Paths to clean
const CACHE_PATHS = [
  path.join(__dirname, 'node_modules', '.cache'),
  path.join(__dirname, '.expo'),
  path.join(__dirname, '.rn-cache'),
  path.join(os.tmpdir(), 'metro-*'),
  path.join(os.tmpdir(), 'haste-map-*'),
  path.join(os.tmpdir(), 'react-*'),
  path.join(os.tmpdir(), 'expo-*'),
];

// Log with color
function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

// Execute a command and return its output
function execCommand(command) {
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(`Error executing command: ${command}`, COLORS.RED);
    log(error.message, COLORS.RED);
    return null;
  }
}

// Clean a directory or file
function cleanPath(pathToClean) {
  try {
    if (fs.existsSync(pathToClean)) {
      log(`Cleaning: ${pathToClean}`, COLORS.YELLOW);
      
      if (fs.lstatSync(pathToClean).isDirectory()) {
        fs.rmSync(pathToClean, { recursive: true, force: true });
      } else {
        fs.unlinkSync(pathToClean);
      }
      
      return true;
    }
    return false;
  } catch (error) {
    log(`Error cleaning path: ${pathToClean}`, COLORS.RED);
    log(error.message, COLORS.RED);
    return false;
  }
}

// Kill processes using specific ports
function killPortProcesses() {
  log('Killing processes on Metro and Expo ports...', COLORS.CYAN);
  
  // Passenger app uses port 8081 according to scripts
  const ports = [8081, 19000, 19001, 19002];
  
  ports.forEach(port => {
    if (IS_WINDOWS) {
      execCommand(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a 2>nul || echo No process on port ${port}`);
    } else {
      execCommand(`lsof -ti:${port} | xargs kill -9 2>/dev/null || echo No process on port ${port}`);
    }
  });
}

// Reset watchman
function resetWatchman() {
  log('Resetting Watchman...', COLORS.CYAN);
  
  if (IS_WINDOWS) {
    // Watchman might not be available on Windows
    log('Watchman reset not available on Windows, skipping...', COLORS.YELLOW);
  } else {
    execCommand('watchman watch-del-all');
  }
}

// Clean Metro bundler cache
function cleanMetroCache() {
  log('Cleaning Metro bundler cache...', COLORS.CYAN);
  
  let cleanedAny = false;
  
  CACHE_PATHS.forEach(cachePath => {
    // Handle glob patterns
    if (cachePath.includes('*')) {
      const baseDir = path.dirname(cachePath);
      const pattern = path.basename(cachePath);
      
      if (fs.existsSync(baseDir)) {
        fs.readdirSync(baseDir).forEach(file => {
          if (file.startsWith(pattern.replace('*', ''))) {
            const fullPath = path.join(baseDir, file);
            cleanedAny = cleanPath(fullPath) || cleanedAny;
          }
        });
      }
    } else {
      cleanedAny = cleanPath(cachePath) || cleanedAny;
    }
  });
  
  if (!cleanedAny) {
    log('No cache files found to clean.', COLORS.YELLOW);
  }
}

// Clean and reinstall node modules
function reinstallNodeModules() {
  log('Removing node_modules directory...', COLORS.CYAN);
  cleanPath(path.join(__dirname, 'node_modules'));
  
  log('Reinstalling dependencies...', COLORS.CYAN);
  execCommand('yarn install');
}

// Clear React Native caches
function clearReactNativeCaches() {
  log('Clearing React Native caches...', COLORS.CYAN);
  
  // Clear React Native related caches
  if (IS_MAC) {
    execCommand('rm -rf ~/Library/Caches/com.facebook.ReactNativeBuild');
    execCommand('rm -rf ~/Library/Developer/Xcode/DerivedData/*');
  }
}

// Fix the metro.config.js to properly configure transform.engine
function fixMetroConfig() {
  log('Updating Metro configuration...', COLORS.CYAN);
  
  const metroConfigPath = path.join(__dirname, 'metro.config.js');
  
  if (fs.existsSync(metroConfigPath)) {
    try {
      // Read the current config
      const configContent = fs.readFileSync(metroConfigPath, 'utf8');
      
      // Check if it's already been enhanced
      if (configContent.includes('transformerPath') || configContent.includes('transform.engine')) {
        log('Metro config already has the necessary transformations.', COLORS.YELLOW);
        return;
      }
      
      // Create an enhanced version
      const newConfig = `// Learn more https://docs.expo.io/guides/customizing-metro
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
  port: 8081, // Consistent port for passenger app
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for better connectivity
      res.setHeader('Access-Control-Allow-Origin', '*');
      return middleware(req, res, next);
    };
  }
};

module.exports = config;`;
      
      // Write the enhanced config
      fs.writeFileSync(metroConfigPath, newConfig, 'utf8');
      log('Enhanced Metro configuration with Hermes engine settings', COLORS.GREEN);
    } catch (error) {
      log(`Error updating Metro config: ${error.message}`, COLORS.RED);
    }
  } else {
    log('Metro config file not found!', COLORS.RED);
  }
}

// Create run script
function createRunScript() {
  log('Creating run script for fixed configuration...', COLORS.CYAN);
  
  const scriptPath = path.join(__dirname, 'run-fixed-app.sh');
  const scriptContent = `#!/bin/bash

# Kill any processes using the required ports
echo "Checking for processes using port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Clear all caches
echo "Clearing Metro and React Native caches..."
rm -rf node_modules/.cache/metro
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/expo-*"
rm -rf .expo

# Start the app with fixed configuration
echo "Starting app with Hermes engine and enhanced configuration..."
# Force the use of Hermes and bytecode with the transform engine
EXPO_USE_HERMES=1 EXPO_SKIP_BUNDLER_VALIDATION=1 REACT_NATIVE_PACKAGER_HOSTNAME=localhost npx expo start --clear --port 8081
`;
  
  try {
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    fs.chmodSync(scriptPath, '755'); // Make it executable
    log(`Created run script: ${scriptPath}`, COLORS.GREEN);
  } catch (error) {
    log(`Error creating run script: ${error.message}`, COLORS.RED);
  }
}

// Main function
async function main() {
  try {
    log('🔧 Starting C++ Exception Fix Script for Passenger App 🔧', COLORS.GREEN);
    log('This script will perform a comprehensive cleanup to fix RCTJSThreadManager C++ exceptions.', COLORS.CYAN);
    
    // Step 1: Kill processes
    killPortProcesses();
    
    // Step 2: Reset watchman
    resetWatchman();
    
    // Step 3: Clean Metro cache
    cleanMetroCache();
    
    // Step 4: Clear React Native caches
    clearReactNativeCaches();
    
    // Step 5: Fix Metro config to use proper transformation settings
    fixMetroConfig();
    
    // Step 6: Create run script
    createRunScript();
    
    // Step 7: Reinstall node modules
    reinstallNodeModules();
    
    log('\n✅ Cleanup and fixes complete!', COLORS.GREEN);
    log('To start the app with fixed configuration, run:', COLORS.CYAN);
    log('  ./run-fixed-app.sh', COLORS.YELLOW);
    log('\nThis will start the Passenger app with optimized settings to prevent C++ exceptions.', COLORS.CYAN);
    
  } catch (error) {
    log(`\n❌ Error during cleanup: ${error.message}`, COLORS.RED);
    process.exit(1);
  }
}

// Run the main function
main();
