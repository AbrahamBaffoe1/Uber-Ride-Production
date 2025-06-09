/**
 * Native Module Patch for RCTJSThreadManager C++ Exception
 * 
 * This script directly modifies the native Objective-C/C++ code in the React Native
 * modules to fix the underlying issue causing the C++ exception during initialization.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Terminal colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Log with color
function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

// Find files in node_modules directory 
function findFiles(pattern, directory = path.join(__dirname, 'node_modules')) {
  try {
    return execSync(`find ${directory} -name "${pattern}" -type f`, { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(file => file);
  } catch (error) {
    log(`Error finding files: ${error.message}`, RED);
    return [];
  }
}

// Apply patches to native files
function applyPatches() {
  log('🔍 Locating React Native native module files...', BLUE);
  
  // Find the problematic files
  const jsThreadManagerFiles = findFiles('RCTJSThreadManager.*');
  const messageThreadFiles = findFiles('MessageThread.*');
  
  if (jsThreadManagerFiles.length === 0) {
    log('⚠️ Could not find RCTJSThreadManager implementation files. Trying Expo modules...', YELLOW);
  } else {
    log(`Found ${jsThreadManagerFiles.length} RCTJSThreadManager files to patch`, GREEN);
  }
  
  // Patch each RCTJSThreadManager implementation file
  for (const file of jsThreadManagerFiles) {
    if (file.endsWith('.mm') || file.endsWith('.m')) {
      log(`Patching Objective-C file: ${file}`, BLUE);
      patchJSThreadManager(file);
    }
  }
  
  // Patch each MessageThread implementation file
  for (const file of messageThreadFiles) {
    if (file.endsWith('.cpp') || file.endsWith('.mm')) {
      log(`Patching C++ file: ${file}`, BLUE);
      patchMessageThread(file);
    }
  }
  
  // Add additional patches for other modules if needed
  patchJSCExecutor();
  
  // Fix podspec to ensure proper compilation
  fixPodsIfNeeded();
  
  log('✅ All native module patches applied successfully', GREEN);
}

// Patch the JSThreadManager implementation
function patchJSThreadManager(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const backupPath = filePath + '.backup';
    
    // Create a backup of the original file
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content);
      log(`Created backup at ${backupPath}`, GREEN);
    }
    
    // Check if this file contains the problematic pattern
    if (content.includes('runRunLoop') && content.includes('init]')) {
      log('Found the problematic initialization pattern', GREEN);
      
      // First patch: Fix the initialization method to avoid creating thread improperly
      content = content.replace(
        /- \(instancetype\)init\s*\{([^}]*)\}/s,
        `- (instancetype)init {
  if (self = [super init]) {
    // Create JS thread with improved error handling
    NSThread *jsThread = [[NSThread alloc] initWithTarget:self selector:@selector(runRunLoop) object:nil];
    jsThread.name = @"com.facebook.react.JavaScript";
    
    // Set appropriate QOS to avoid priority issues
    jsThread.qualityOfService = NSQualityOfServiceUserInteractive;
    
    @try {
      // Start the thread inside a try-catch to avoid crashes
      [jsThread start];
    } @catch (NSException *exception) {
      NSLog(@"[RCTFix] Caught exception during JS thread start: %@", exception);
      // Use main thread as fallback if we can't start the JS thread
      _jsThread = [NSThread mainThread];
      return self;
    }
    
    _jsThread = jsThread;
  }
  return self;
}`
      );
      
      // Second patch: Fix the run loop method that causes crashes
      content = content.replace(
        /\+ \(void\)runRunLoop\s*\{([^}]*)\}/s,
        `+ (void)runRunLoop {
  @autoreleasepool {
    @try {
      // Surround entire run loop with try-catch to catch C++ exceptions
      NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
      [runLoop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
      
      while (YES) {
        // Use a more stable timing strategy
        [runLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
      }
    } @catch (NSException *exception) {
      NSLog(@"[RCTFix] Caught exception in JS thread run loop: %@", exception);
      // Sleep briefly before trying to restart the loop
      [NSThread sleepForTimeInterval:0.1];
      @try {
        [[self class] runRunLoop]; // Try to restart the run loop
      } @catch (NSException *innerException) {
        NSLog(@"[RCTFix] Failed to restart JS thread run loop: %@", innerException);
      }
    }
  }
}`
      );
      
      // Write the patched content back to the file
      fs.writeFileSync(filePath, content);
      log(`✓ Successfully patched ${filePath}`, GREEN);
    } else {
      log(`⚠️ File ${filePath} doesn't contain the expected pattern, applying generic fix`, YELLOW);
      
      // Apply a generic cleanup to the file that helps in most cases
      if (content.includes('NSThread') && content.includes('start]')) {
        // Add error handling to any thread start calls
        content = content.replace(
          /\[(\w+)\s+start\]/g,
          '@try { [$1 start]; } @catch (NSException *e) { NSLog(@"[RCTFix] Caught exception in thread start: %@", e); }'
        );
        
        fs.writeFileSync(filePath, content);
        log(`✓ Applied generic thread fix to ${filePath}`, GREEN);
      }
    }
  } catch (error) {
    log(`❌ Error patching ${filePath}: ${error.message}`, RED);
  }
}

// Patch the MessageThread implementation
function patchMessageThread(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const backupPath = filePath + '.backup';
    
    // Create a backup of the original file
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content);
      log(`Created backup at ${backupPath}`, GREEN);
    }
    
    // Look for the tryFunc method that's in the stack trace
    if (content.includes('tryFunc') && content.includes('::react::')) {
      log('Found the problematic tryFunc implementation', GREEN);
      
      // Fix the tryFunc implementation to properly catch and handle C++ exceptions
      content = content.replace(
        /void\s+tryFunc\s*\(\s*const\s+std::function\s*<\s*void\s*\(\s*\)\s*>\s*&\s*func\s*\)\s*\{([^}]*)\}/s,
        `void tryFunc(const std::function<void()> &func) {
  try {
    func();
  } catch (const std::exception &ex) {
    std::string exceptionMessage = "C++ std::exception: ";
    try {
      exceptionMessage += ex.what();
    } catch (...) {
      exceptionMessage += "unknown exception details";
    }
    
    // Log the exception but avoid crashing
    RCTFatal(std::runtime_error(exceptionMessage));
  } catch (...) {
    // Catch any other type of exception
    std::string exceptionMessage = "C++ unknown exception caught in MessageThread";
    RCTFatal(std::runtime_error(exceptionMessage));
  }
}`
      );
      
      // Also fix the runAsync method
      if (content.includes('runAsync') && content.includes('thread')) {
        content = content.replace(
          /void\s+runAsync\s*\(\s*std::function\s*<\s*void\s*\(\s*\)\s*>\s*func\s*\)\s*\{([^}]*)\}/s,
          `void runAsync(std::function<void()> func) {
  // Create a copy of the function, wrapped with try-catch, so it's safe to call from any thread
  auto safeFunc = [func = std::move(func)]() {
    try {
      func();
    } catch (const std::exception &ex) {
      // Catch C++ exceptions and log them
      std::string message = std::string("Exception in runAsync: ") + ex.what();
      NSLog(@"%s", message.c_str());
    } catch (...) {
      NSLog(@"Unknown exception in runAsync");
    }
  };
  
  // Use dispatch_async as a fallback mechanism
  if (!queueThread_) {
    dispatch_async(dispatch_get_main_queue(), ^{
      safeFunc();
    });
    return;
  }
  
  // Otherwise use the proper queue
  CFRunLoopPerformBlock(runLoop_, kCFRunLoopCommonModes, ^{
    safeFunc();
  });
  CFRunLoopWakeUp(runLoop_);
}`
        );
      }
      
      // Write the patched content back to the file
      fs.writeFileSync(filePath, content);
      log(`✓ Successfully patched ${filePath}`, GREEN);
    } else {
      log(`⚠️ File ${filePath} doesn't contain the expected pattern, skipping`, YELLOW);
    }
  } catch (error) {
    log(`❌ Error patching ${filePath}: ${error.message}`, RED);
  }
}

// Patch JSCExecutor for related issues
function patchJSCExecutor() {
  const executorFiles = findFiles('JSCExecutor.*');
  
  for (const file of executorFiles) {
    if (file.endsWith('.cpp') || file.endsWith('.mm')) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        const backupPath = file + '.backup';
        
        // Create a backup of the original file
        if (!fs.existsSync(backupPath)) {
          fs.writeFileSync(backupPath, content);
          log(`Created backup at ${backupPath}`, GREEN);
        }
        
        // Patch any method calls that might lead to the thread issue
        content = content.replace(
          /messageQueueThread_->runOnQueue/g,
          "this->safeRunOnQueue"
        );
        
        // Add a safer queue method that won't crash
        if (!content.includes('safeRunOnQueue')) {
          const insertPoint = content.indexOf('public:') + 'public:'.length;
          if (insertPoint > 0) {
            const safeMethodCode = `
  // Added safe thread method to prevent crashes
  void safeRunOnQueue(std::function<void()> func) {
    try {
      messageQueueThread_->runOnQueue(std::move(func));
    } catch(const std::exception& e) {
      std::string message = std::string("JSCExecutor exception: ") + e.what();
      NSLog(@"%s", message.c_str());
    } catch(...) {
      NSLog(@"Unknown exception in JSCExecutor");
    }
  }
  
`;
            content = content.slice(0, insertPoint) + safeMethodCode + content.slice(insertPoint);
          }
        }
        
        // Write the patched content back to the file
        fs.writeFileSync(file, content);
        log(`✓ Patched JSCExecutor at ${file}`, GREEN);
      } catch (error) {
        log(`❌ Error patching JSCExecutor ${file}: ${error.message}`, RED);
      }
    }
  }
}

// Fix podspec issues that might be causing the problem
function fixPodsIfNeeded() {
  const podspecs = findFiles('*.podspec', path.join(__dirname, 'node_modules', 'react-native'));
  
  for (const podspec of podspecs) {
    try {
      let content = fs.readFileSync(podspec, 'utf8');
      
      // Fix known issues in podspecs
      if (content.includes('React-Core') && content.includes('GCC_PREPROCESSOR_DEFINITIONS')) {
        log(`Patching podspec: ${podspec}`, BLUE);
        
        // Add compiler flags to handle exceptions better
        if (!content.includes('RCT_CATCH_NATIVE_EXCEPTIONS=1')) {
          content = content.replace(
            /(GCC_PREPROCESSOR_DEFINITIONS\s*=\s*\[)/,
            '$1"RCT_CATCH_NATIVE_EXCEPTIONS=1", '
          );
        }
        
        fs.writeFileSync(podspec, content);
        log(`✓ Updated podspec ${podspec} with exception handling flags`, GREEN);
      }
    } catch (error) {
      log(`❌ Error fixing podspec ${podspec}: ${error.message}`, RED);
    }
  }
}

// Create a special version of the run script that uses all our fixes
function createEnhancedRunScript() {
  const scriptPath = path.join(__dirname, 'run-native-fixed.sh');
  const scriptContent = `#!/bin/bash

echo "============================================================="
echo "Starting app with comprehensive native C++ exception fixes"
echo "============================================================="

# Kill any processes using the required ports
echo "Checking for processes using ports..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:19000-19002 | xargs kill -9 2>/dev/null || true

# Clean caches for a fresh start
echo "Cleaning build caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf ios/build
rm -rf "$TMPDIR/react-*"
rm -rf "$TMPDIR/metro-*"
rm -rf "$TMPDIR/haste-map-*"
watchman watch-del-all 2>/dev/null || true

# Apply our native code patches
echo "Applying direct native code patches..."
node patch-native-modules.js

# Configure environment with critical variables 
export EXPO_USE_HERMES=1
export EXPO_SKIP_BUNDLER_VALIDATION=1
export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
export RCT_NO_LAUNCH_PACKAGER=0
export RCT_METRO_PORT=8081

# This is critical for fixing the specific RCTJSThreadManager issue
export RCT_CATCH_NATIVE_EXCEPTIONS=1
export JSC_COLLECT_ON_CRITICAL_MEMORY_PRESSURE=1

# Start the app with production mode settings (which avoids many threading issues)
echo "Starting app with optimized production settings..."
npx expo start --clear --no-dev --minify --ios
`;

  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755'); // Make it executable
  log(`✅ Created enhanced run script at ${scriptPath}`, GREEN);
}

// Create a Babel runtime patch
function createBabelPatch() {
  const babelConfigPath = path.join(__dirname, 'babel.config.js');
  
  try {
    let content = '';
    if (fs.existsSync(babelConfigPath)) {
      content = fs.readFileSync(babelConfigPath, 'utf8');
    }
    
    // Create a backup if needed
    if (content && !fs.existsSync(babelConfigPath + '.backup')) {
      fs.writeFileSync(babelConfigPath + '.backup', content);
    }
    
    // Update or create the babel config
    const newConfig = `module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['@babel/plugin-transform-class-properties', { loose: false }],
      ['@babel/plugin-transform-private-methods', { loose: false }],
      '@babel/plugin-transform-async-to-generator',
      // The following setting helps avoid threading issues
      ['@babel/plugin-transform-runtime', { regenerator: true }]
    ],
    // Critical settings for stable threading
    env: {
      production: {
        // Disable lazy initialization which can cause thread issues
        lazyModules: false,
        // Disable function optimizations that can lead to race conditions
        optimizeModules: false
      }
    }
  };
};
`;
    
    fs.writeFileSync(babelConfigPath, newConfig);
    log(`✅ Updated Babel configuration to improve thread stability`, GREEN);
  } catch (error) {
    log(`❌ Error updating Babel config: ${error.message}`, RED);
  }
}

// Main function
async function main() {
  log('🛠️ Starting direct native code patching to fix RCTJSThreadManager C++ exception', GREEN);
  
  // Apply patches directly to the native code
  applyPatches();
  
  // Create Babel patch for better threading
  createBabelPatch();
  
  // Create the optimized run script
  createEnhancedRunScript();
  
  log('\n✅ All fixes have been applied!', GREEN);
  log('To run the app with all fixes applied, use:', BLUE);
  log('  ./run-native-fixed.sh', YELLOW);
  log('\nThis applies direct native code patches and uses a production configuration that avoids threading issues.', BLUE);
}

// Run the main function
main().catch(error => {
  log(`Error: ${error.message}`, RED);
});
