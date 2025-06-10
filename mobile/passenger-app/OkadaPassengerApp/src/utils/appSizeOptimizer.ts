/**
 * App Size Optimizer
 * Provides utilities and strategies to reduce app size and optimize assets
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Configuration for asset optimization
export const OPTIMIZATION_CONFIG = {
  // Maximum resolution for images based on device density
  MAX_IMAGE_DIMENSIONS: {
    ldpi: { width: 320, height: 240 },    // ~120dpi (0.75x)
    mdpi: { width: 480, height: 320 },    // ~160dpi (1x baseline)
    hdpi: { width: 720, height: 480 },    // ~240dpi (1.5x)
    xhdpi: { width: 960, height: 640 },   // ~320dpi (2x)
    xxhdpi: { width: 1440, height: 960 }, // ~480dpi (3x)
    xxxhdpi: { width: 1920, height: 1280 } // ~640dpi (4x)
  },
  
  // Target file sizes for different asset types (in bytes)
  TARGET_FILE_SIZES: {
    avatar: 15 * 1024,        // 15KB
    thumbnail: 25 * 1024,     // 25KB
    cardImage: 50 * 1024,     // 50KB
    fullScreenImage: 100 * 1024, // 100KB
    mapTile: 10 * 1024        // 10KB
  },
  
  // Cache limits
  CACHE_LIMITS: {
    // Maximum size of the image cache (in bytes)
    imageCache: 20 * 1024 * 1024, // 20MB
    // Maximum age of cached items (in milliseconds)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // Clean cache when app exceeds this percentage of target size
    cleanThreshold: 0.8 // 80%
  },
  
  // App download size optimization - features to disable in basic version
  OPTIONAL_FEATURES: {
    highResolutionMaps: false,
    offlineMapSupport: false,
    videoTutorials: false,
    animatedOnboarding: true,
    voiceNavigation: false,
    analyticsTracking: true
  }
};

/**
 * Determine the appropriate image size based on the device's pixel density
 */
export const getOptimalImageDimensions = (width: number, height: number) => {
  const pixelDensity = PixelRatio.get();
  let densityCategory: keyof typeof OPTIMIZATION_CONFIG.MAX_IMAGE_DIMENSIONS;
  
  // Determine device density category
  if (pixelDensity <= 0.75) densityCategory = 'ldpi';
  else if (pixelDensity <= 1) densityCategory = 'mdpi';
  else if (pixelDensity <= 1.5) densityCategory = 'hdpi';
  else if (pixelDensity <= 2) densityCategory = 'xhdpi';
  else if (pixelDensity <= 3) densityCategory = 'xxhdpi';
  else densityCategory = 'xxxhdpi';
  
  const maxDimensions = OPTIMIZATION_CONFIG.MAX_IMAGE_DIMENSIONS[densityCategory];
  
  // Calculate aspect ratio
  const aspectRatio = width / height;
  
  // Determine the limiting dimension
  let optimalWidth, optimalHeight;
  
  if (width / maxDimensions.width > height / maxDimensions.height) {
    // Width is the limiting dimension
    optimalWidth = Math.min(width, maxDimensions.width);
    optimalHeight = Math.round(optimalWidth / aspectRatio);
  } else {
    // Height is the limiting dimension
    optimalHeight = Math.min(height, maxDimensions.height);
    optimalWidth = Math.round(optimalHeight * aspectRatio);
  }
  
  return { width: optimalWidth, height: optimalHeight };
};

/**
 * Optimize a remote image URL based on provider
 * @param url Original image URL
 * @param width Desired width
 * @param height Desired height
 * @param type Type of image (e.g., avatar, thumbnail)
 * @returns Optimized URL
 */
export const getOptimizedImageUrl = (
  url: string, 
  width?: number, 
  height?: number,
  type: keyof typeof OPTIMIZATION_CONFIG.TARGET_FILE_SIZES = 'thumbnail'
): string => {
  if (!url) return url;
  
  // Determine optimal dimensions if not provided
  if (!width || !height) {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    
    const dims = getOptimalImageDimensions(
      width || screenWidth, 
      height || screenHeight
    );
    
    width = dims.width;
    height = dims.height;
  }
  
  // Handle different image providers
  if (url.includes('cloudinary.com')) {
    // Cloudinary image optimization
    return url.replace('/upload/', `/upload/c_fill,w_${width},h_${height},q_auto:good/`);
  } else if (url.includes('googleapis.com/maps')) {
    // Google Maps image optimization
    return `${url}&size=${width}x${height}`;
  } else if (url.includes('firebasestorage.googleapis.com')) {
    // Firebase storage doesn't support on-the-fly resizing
    // We could implement our own resize proxy here
    return url;
  } else if (url.includes('static.okadatransport.com')) {
    // Custom domain - assuming we control this and have implemented resizing
    return `${url}?w=${width}&h=${height}&q=80`;
  }
  
  // No optimization available for unknown sources
  return url;
};

/**
 * Clean image cache when it exceeds the limit
 */
export const cleanImageCache = async (): Promise<void> => {
  try {
    if (!FileSystem.cacheDirectory) return;
    
    // Calculate cache directory size
    const imageDir = `${FileSystem.cacheDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(imageDir);
    
    if (!dirInfo.exists) return;
    
    // If cache exceeds limit, clean it
    // Use default size for type checking
    const cacheSize = dirInfo.exists && 'size' in dirInfo ? dirInfo.size as number : 0;
    if (cacheSize > OPTIMIZATION_CONFIG.CACHE_LIMITS.imageCache) {
      console.log(`Cleaning image cache (${Math.round(cacheSize / 1024 / 1024)}MB)`);
      
      // Get all files in the directory
      const files = await FileSystem.readDirectoryAsync(imageDir);
      
      // Get file stats and sort by modification date
      const fileStats = await Promise.all(
        files.map(async filename => {
          const filePath = `${imageDir}${filename}`;
          const info = await FileSystem.getInfoAsync(filePath);
          const fileSize = info.exists && 'size' in info ? info.size as number : 0;
          const modTime = info.exists && 'modificationTime' in info ? 
            info.modificationTime as number : 
            Date.now();
            
          return { 
            path: filePath, 
            size: fileSize,
            modTime: modTime
          };
        })
      );
      
      // Sort by modification date (oldest first)
      fileStats.sort((a, b) => a.modTime - b.modTime);
      
      // Delete oldest files until we're under the threshold
      let deletedSize = 0;
      const targetSize = OPTIMIZATION_CONFIG.CACHE_LIMITS.imageCache * 
        OPTIMIZATION_CONFIG.CACHE_LIMITS.cleanThreshold;
      
      for (const file of fileStats) {
        if (cacheSize - deletedSize <= targetSize) break;
        
        await FileSystem.deleteAsync(file.path, { idempotent: true });
        deletedSize += file.size;
      }
      
      console.log(`Cleaned ${Math.round(deletedSize / 1024 / 1024)}MB from image cache`);
    }
  } catch (error) {
    console.warn('Error cleaning image cache:', error);
  }
};

/**
 * Get feature configuration for current app version
 * Allows dynamic enabling/disabling of features based on app size constraints
 */
export const getFeatureConfig = async (): Promise<typeof OPTIMIZATION_CONFIG.OPTIONAL_FEATURES> => {
  try {
    // Check if we have a stored feature configuration
    const storedConfig = await AsyncStorage.getItem('featureConfig');
    if (storedConfig) {
      return JSON.parse(storedConfig);
    }
    
    // Use default configuration
    return OPTIMIZATION_CONFIG.OPTIONAL_FEATURES;
  } catch (error) {
    console.warn('Error loading feature configuration:', error);
    return OPTIMIZATION_CONFIG.OPTIONAL_FEATURES;
  }
};

/**
 * Initialize the app size optimizer
 * This should be called during app startup
 */
export const initializeAppSizeOptimizer = async (): Promise<void> => {
  try {
    // Clean image cache on startup
    await cleanImageCache();
    
    // Initialize feature configuration
    const featureConfig = await getFeatureConfig();
    
    // Save feature configuration if not already saved
    const storedConfig = await AsyncStorage.getItem('featureConfig');
    if (!storedConfig) {
      await AsyncStorage.setItem('featureConfig', JSON.stringify(featureConfig));
    }
    
    console.log('App size optimizer initialized');
  } catch (error) {
    console.warn('Error initializing app size optimizer:', error);
  }
};

export default {
  OPTIMIZATION_CONFIG,
  getOptimalImageDimensions,
  getOptimizedImageUrl,
  cleanImageCache,
  getFeatureConfig,
  initializeAppSizeOptimizer
};
