# App Registration Fix Summary

## Problem Identified
The passenger app was experiencing an "Invariant Violation: 'main' has not been registered" error due to inconsistent app registration configuration.

## Root Causes Found

1. **Main Entry Point Mismatch**: 
   - `package.json` had `"main": "App.tsx"` but the actual entry should be `index.js`
   - This caused Metro bundler to look for the wrong entry point

2. **Inconsistent Registration Names**:
   - iOS path was registering as `'OkadaPassengerApp'` 
   - Non-iOS path was trying to use Expo's `registerRootComponent`
   - The error indicated `'main'` was expected but not found

3. **Conflicting Registration Methods**:
   - Mixed usage of `AppRegistry.registerComponent` and `expo.registerRootComponent`
   - This created conflicts in the app initialization process

## Fixes Applied

### 1. Fixed package.json Entry Point
```json
// Before
"main": "App.tsx"

// After  
"main": "index.js"
```

### 2. Standardized App Registration Name
Both iOS and non-iOS paths now register the app as `'main'`:

**iOS path** (`src/index.ios.js`):
```javascript
AppRegistry.registerComponent('main', () => SafeApp);
```

**Non-iOS path** (`index.js`):
```javascript
AppRegistry.registerComponent('main', () => SafeApp);
```

### 3. Unified Registration Method
- Removed conflicting `expo.registerRootComponent` usage
- Used consistent `AppRegistry.registerComponent` across all platforms
- Applied the same native exception wrapper for consistency

## Key Changes Made

### File: `package.json`
- Changed main entry point from `"App.tsx"` to `"index.js"`

### File: `index.js`
- Fixed non-iOS registration to use `AppRegistry.registerComponent('main', ...)`
- Removed conflicting `expo.registerRootComponent` call
- Added consistent native exception wrapper application

### File: `src/index.ios.js`
- Changed registration name from `'OkadaPassengerApp'` to `'main'`
- Maintained all C++ exception prevention mechanisms

## Cache Clearing
- Cleared Metro cache with `npm run clear-cache`
- Performed deep clean with `npm run deep-clean`
- Removed all cached bundler data

## Expected Result
The "Invariant Violation: 'main' has not been registered" error should now be resolved because:

1. ✅ Metro bundler will correctly find `index.js` as the entry point
2. ✅ Both iOS and non-iOS paths register the app as `'main'`
3. ✅ No conflicting registration methods are used
4. ✅ All cached data has been cleared

## Testing
To verify the fix works:
```bash
cd mobile/passenger-app/OkadaPassengerApp
npm run ios
# or
npm run start-fixed
```

The app should now start without the registration error while maintaining all C++ exception prevention mechanisms.
