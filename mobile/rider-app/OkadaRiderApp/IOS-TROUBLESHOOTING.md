# iOS Simulator Troubleshooting Guide for Okada Rider App

This guide addresses common issues with running the Okada Rider App on iOS simulators and devices.

## Common Issues and Solutions

### 1. C++ Exception or Thread Manager Errors

**Symptoms:**
- App crashes on startup with "RCTJSThreadManager" error
- Non-std C++ exception messages in logs
- White screen after splash screen

**Solution:**
```bash
# Run the optimized iOS simulator script
yarn ios-simulator
```

This script:
- Clears caches and temporary files
- Sets up proper environment variables
- Uses optimized Hermes engine settings
- Avoids development mode for better performance

### 2. Metro Bundler Connection Issues

**Symptoms:**
- "Unable to connect to Metro Bundler" message
- App stays on splash screen
- Red error screen in development mode

**Solution:**
```bash
# Kill existing Metro processes first
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true

# Clear the cache
yarn clear-cache

# Start with a fresh Metro instance
yarn ios-simulator
```

### 3. Socket Connection Issues

**Symptoms:**
- "Socket connection error" in console logs
- Real-time features not working
- WebSocket connection failures

**Solution:**
1. Ensure backend server is running: `cd backend && PORT=3001 node src/index.js`
2. Make sure iOS simulator can access localhost (this is usually automatic)
3. In development, you might need to set the IP manually in the config file

### 4. Missing Native Modules

**Symptoms:**
- Errors about missing native modules
- "Native module cannot be null" errors
- Features like maps or location not working

**Solution:**
```bash
# Reinstall node modules and pods
yarn install --check-files
cd ios && pod install && cd ..

# Clear React Native caches
rm -rf "$TMPDIR/react-*"

# Start with the optimized script
yarn ios-simulator
```

### 5. Build and Compilation Errors

**Symptoms:**
- Errors about incompatible types or missing files
- Build fails with red errors
- Xcode compiler errors

**Solution:**
```bash
# Clean the build
rm -rf ios/build

# Reinstall dependencies
yarn install --check-files

# Update pods
cd ios && pod update && cd ..

# Start with a fresh build
yarn ios-simulator
```

## iOS-Specific Performance Tips

1. **Use Production Mode**: When testing performance, use `--no-dev` flag to disable development features.

2. **Disable Hot Reloading**: For better performance, disable hot reloading if you're testing, not developing.

3. **Use Hermes Engine**: Our script sets this up automatically, but ensure EXPO_USE_HERMES=1 environment variable is set.

4. **Minimize Logging**: Excessive console logging can slow down the app significantly.

5. **Limit Animations**: Complex animations can cause performance issues, especially on older devices.

## Advanced Debugging Techniques

### Using Xcode Console for Debugging

1. Open the `.xcworkspace` file in `ios/` folder with Xcode
2. Run the app through Xcode
3. Check the console output for detailed error messages

### Using Safari Web Inspector (for WebView debugging)

1. Enable Web Inspector in your iOS simulator
2. Open Safari > Develop > Simulator > [Your WebView]
3. Use the Safari Developer Tools to debug web content

### Using Instruments for Performance Analysis

1. Open Xcode > Open Developer Tool > Instruments
2. Select the Time Profiler template
3. Attach to your running app process
4. Analyze CPU and memory usage

## Still Having Issues?

If you continue to experience problems with the iOS simulator:

1. Check that your Xcode is up to date
2. Verify that your iOS simulator is using a compatible iOS version
3. Try using a different iOS simulator device
4. Check that all native dependencies are properly linked
5. Review any recent changes that might have affected iOS compatibility

For persistent issues, you can always fallback to running the app in web mode until the iOS issues are resolved:
```bash
yarn web
