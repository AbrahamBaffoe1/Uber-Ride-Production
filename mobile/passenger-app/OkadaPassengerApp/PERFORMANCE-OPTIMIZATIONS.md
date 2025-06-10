# Performance Optimizations

This document outlines the performance optimizations implemented in the Okada Passenger App to improve responsiveness, reduce resource usage, and keep the app size below 50MB.

## 1. Background Location Updates Optimization

We've implemented an adaptive location tracking system that adjusts update frequency based on:

- **App state**: More frequent updates when app is in foreground, less frequent in background
- **User movement**: Less frequent updates when user is stationary
- **Battery level**: Reduced updates on low battery to preserve power
- **Distance filter**: Only triggers updates when user moves a significant distance

The implementation is in `src/utils/performanceOptimizer.ts` with the following key features:

- Adaptive update intervals (3s foreground, 15s background, 30s when idle)
- Adjustable distance filters (10m foreground, 50m background)
- Battery-aware processing (disables updates below 15% battery)
- Movement pattern detection to identify when user is stationary

## 2. Map Tile Pre-caching

A map tile caching system has been implemented in `src/services/mapCachingService.ts` to:

- Pre-download map tiles for commonly visited areas
- Cache map tiles for the user's current region
- Automatically clean up old cached tiles
- Prioritize caching based on zoom levels and usage patterns

Benefits:
- Significantly faster map loading
- Reduced data usage
- Improved offline capabilities
- Smoother map navigation experience

## 3. Image Lazy Loading

A sophisticated LazyImage component in `src/components/common/LazyImage.tsx` implements:

- Progressive image loading with low-res thumbnails
- Blur effects during image transitions
- Placeholder display during loading
- Intelligent error handling
- Animation for smooth transitions

The component offers significant performance improvements by:
- Reducing initial load time
- Decreasing memory usage
- Optimizing network bandwidth
- Improving perceived performance

## 4. App Size Reduction

Multiple strategies implemented in `src/utils/appSizeOptimizer.ts` to keep the app under 50MB:

- **Image optimization**: Auto-resizing images based on device screen density
- **Dynamic feature loading**: Conditionally loading features based on device capabilities
- **Cache management**: Intelligent cleaning of cached data
- **Resource optimization**: URL-based image optimization for different providers
- **Feature toggling**: Ability to disable non-essential features in basic app versions

## Integration

All optimizations are centrally managed in the performance optimizer that initializes at app startup:

```typescript
// In App.tsx
useEffect(() => {
  // Start performance optimizations
  const initializeOptimizations = async () => {
    try {
      await performanceOptimizer.initializePerformanceOptimizations();
      console.log('Performance optimizations initialized');
    } catch (error) {
      console.error('Failed to initialize performance optimizations:', error);
    }
  };

  initializeOptimizations();

  // Clean up when component unmounts
  return () => {
    performanceOptimizer.cleanupPerformanceOptimizations();
  };
}, []);
```

## Usage Guidelines

### LazyImage Component

Replace standard `Image` components with `LazyImage` for better performance:

```jsx
import LazyImage from '../components/common/LazyImage';

// Instead of:
<Image source={{uri: imageUrl}} style={styles.image} />

// Use:
<LazyImage 
  source={{uri: imageUrl}} 
  thumbnailSource={thumbnailUrl}
  style={styles.image}
  showPlaceholder={true}
  placeholderColor="#e1e2e3"
/>
```

### Optimized URL Generation

Use the image URL optimizer to reduce image sizes:

```typescript
import { getOptimizedImageUrl } from '../utils/appSizeOptimizer';

const optimizedUrl = getOptimizedImageUrl(
  originalUrl, 
  200, // width
  150, // height
  'thumbnail' // type
);
```

## Monitoring and Debugging

You can monitor the performance optimizations through console logs. Key initialization messages include:
- "Performance optimizations initialized successfully"
- "Map cache optimizer initialized"
- "Location tracking started: interval=Xms, distance=Ym"

To debug issues, check the logs for warnings like:
- "Error initializing performance optimizations:"
- "Error cleaning image cache:"
- "Error handling location update:"
