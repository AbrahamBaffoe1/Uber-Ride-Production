import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';

// Define constants for cache settings
const CACHE_CONFIG = {
  // Maximum age of cached tiles (in milliseconds)
  MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Maximum size of tile cache (in bytes)
  MAX_SIZE: 50 * 1024 * 1024, // 50 MB
  // Minimum free device storage required to use caching (in bytes)
  MIN_FREE_SPACE: 500 * 1024 * 1024, // 500 MB
  // Prefetch zoom levels
  PREFETCH_ZOOM_LEVELS: [13, 14, 15], // Zoom levels for pre-caching
  // Cache directory
  CACHE_DIR: `${FileSystem.cacheDirectory}map_tiles/`,
};

// Regions for common cities (can be expanded with more cities)
export const COMMON_REGIONS = {
  LAGOS: {
    latitude: 6.5244,
    longitude: 3.3792,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: 'Lagos',
  },
  ABUJA: {
    latitude: 9.0765,
    longitude: 7.3986,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: 'Abuja',
  },
  IBADAN: {
    latitude: 7.3775,
    longitude: 3.9470,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
    name: 'Ibadan',
  },
};

// Interface for tile URL parameters
interface TileParams {
  x: number;
  y: number;
  z: number;
  // Additional provider-specific parameters
  [key: string]: any;
}

/**
 * Convert latitude, longitude, and zoom level to tile coordinates
 */
const latLonToTile = (lat: number, lon: number, zoom: number): { x: number; y: number } => {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  return { x, y };
};

/**
 * Generate a tile URL from tile coordinates using Google Maps or OpenStreetMap
 */
const getTileUrl = (params: TileParams, useGoogleMaps: boolean = false): string => {
  const { x, y, z } = params;
  
  // Use OpenStreetMap as a fallback (free and open source)
  if (!useGoogleMaps) {
    // OpenStreetMap tile server
    return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
  
  // Google Maps requires an API key - ensure it's available in your configuration
  // This is a placeholder URL - you need to replace API_KEY with your actual key
  return `https://maps.googleapis.com/maps/api/staticmap?center=${y},${x}&zoom=${z}&size=256x256&key=API_KEY`;
};

/**
 * Generate a cache key for a tile
 */
const getTileCacheKey = (params: TileParams): string => {
  const { x, y, z } = params;
  return `${z}_${x}_${y}`;
};

/**
 * Get the local file path for a cached tile
 */
const getTileFilePath = (key: string): string => {
  return `${CACHE_CONFIG.CACHE_DIR}${key}.png`;
};

/**
 * Check if a tile exists in the cache
 */
const tileExistsInCache = async (key: string): Promise<boolean> => {
  try {
    const filePath = getTileFilePath(key);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    if (fileInfo.exists) {
      // Check if the tile is still valid (not expired)
      const metadata = await getTileMetadata(key);
      if (metadata && Date.now() - metadata.timestamp < CACHE_CONFIG.MAX_AGE) {
        return true;
      }
      
      // File exists but is expired, delete it
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      await removeTileMetadata(key);
    }
    
    return false;
  } catch (error) {
    console.warn('Error checking tile cache:', error);
    return false;
  }
};

/**
 * Get metadata for a cached tile
 */
const getTileMetadata = async (key: string): Promise<{ timestamp: number; size: number } | null> => {
  try {
    const metadataStr = await AsyncStorage.getItem(`map_tile_metadata_${key}`);
    return metadataStr ? JSON.parse(metadataStr) : null;
  } catch (error) {
    console.warn('Error getting tile metadata:', error);
    return null;
  }
};

/**
 * Save metadata for a cached tile
 */
const saveTileMetadata = async (key: string, size: number): Promise<void> => {
  try {
    const metadata = {
      timestamp: Date.now(),
      size,
    };
    await AsyncStorage.setItem(`map_tile_metadata_${key}`, JSON.stringify(metadata));
  } catch (error) {
    console.warn('Error saving tile metadata:', error);
  }
};

/**
 * Remove metadata for a cached tile
 */
const removeTileMetadata = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`map_tile_metadata_${key}`);
  } catch (error) {
    console.warn('Error removing tile metadata:', error);
  }
};

/**
 * Download and cache a map tile
 */
const downloadTile = async (params: TileParams, useGoogleMaps: boolean = false): Promise<string | null> => {
  try {
    const key = getTileCacheKey(params);
    const filePath = getTileFilePath(key);
    const url = getTileUrl(params, useGoogleMaps);
    
    // Ensure the cache directory exists
    await ensureCacheDirectoryExists();
    
    // Download the tile
    const downloadResult = await FileSystem.downloadAsync(url, filePath);
    
    if (downloadResult.status === 200) {
      // Save metadata
      await saveTileMetadata(key, downloadResult.headers['content-length'] ? 
        parseInt(downloadResult.headers['content-length'], 10) : 0);
      return filePath;
    }
    
    return null;
  } catch (error) {
    console.warn('Error downloading tile:', error);
    return null;
  }
};

/**
 * Ensure the cache directory exists
 */
const ensureCacheDirectoryExists = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_CONFIG.CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_CONFIG.CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating cache directory:', error);
  }
};

/**
 * Get a map tile (from cache or download if needed)
 */
export const getMapTile = async (
  params: TileParams, 
  useGoogleMaps: boolean = false
): Promise<string | null> => {
  try {
    const key = getTileCacheKey(params);
    
    // Check if tile exists in cache
    const existsInCache = await tileExistsInCache(key);
    if (existsInCache) {
      return getTileFilePath(key);
    }
    
    // Not in cache, download it
    return await downloadTile(params, useGoogleMaps);
  } catch (error) {
    console.warn('Error getting map tile:', error);
    return null;
  }
};

/**
 * Pre-cache map tiles for a region
 */
export const preCacheRegion = async (
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  zoomLevels: number[] = CACHE_CONFIG.PREFETCH_ZOOM_LEVELS,
  useGoogleMaps: boolean = false
): Promise<void> => {
  try {
    // Skip pre-caching if app is in background
    if (AppState.currentState !== 'active') {
      console.log('Skipping pre-cache: app in background');
      return;
    }
    
    // Check available disk space
    if (Platform.OS !== 'web') {
      try {
        // Use FileSystem API to check available space
        const documentDir = FileSystem.documentDirectory || '';
        const fileInfo = await FileSystem.getInfoAsync(documentDir);
        if (fileInfo.isDirectory && fileInfo.size) {
          // If we can get directory size, estimate available space
          // This is a rough estimate - in real implementation you'd need a better approach
          const availableSpace = Number.MAX_SAFE_INTEGER - fileInfo.size;
          if (availableSpace < CACHE_CONFIG.MIN_FREE_SPACE) {
            console.log('Skipping pre-cache: low disk space (estimated)');
            return;
          }
        }
      } catch (error) {
        console.warn('Could not check disk space:', error);
        // Continue anyway if we can't check space
      }
    }
    
    // Calculate tile boundaries for the region
    const tilesToDownload: TileParams[] = [];
    
    for (const zoom of zoomLevels) {
      // Calculate corners of the region
      const nwTile = latLonToTile(
        region.latitude + region.latitudeDelta / 2,
        region.longitude - region.longitudeDelta / 2,
        zoom
      );
      const seTile = latLonToTile(
        region.latitude - region.latitudeDelta / 2,
        region.longitude + region.longitudeDelta / 2,
        zoom
      );
      
      // Add all tiles in the region to the download list
      for (let x = Math.min(nwTile.x, seTile.x); x <= Math.max(nwTile.x, seTile.x); x++) {
        for (let y = Math.min(nwTile.y, seTile.y); y <= Math.max(nwTile.y, seTile.y); y++) {
          tilesToDownload.push({ x, y, z: zoom });
        }
      }
    }
    
    // Download tiles in batches to avoid overwhelming the device
    const BATCH_SIZE = 5;
    for (let i = 0; i < tilesToDownload.length; i += BATCH_SIZE) {
      const batch = tilesToDownload.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(params => getMapTile(params, useGoogleMaps)));
      
      // Short pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Pre-cached ${tilesToDownload.length} tiles for region`);
  } catch (error) {
    console.error('Error pre-caching region:', error);
  }
};

/**
 * Pre-cache common regions based on user location or frequently visited areas
 */
export const preCacheCommonRegions = async (useGoogleMaps: boolean = false): Promise<void> => {
  try {
    // Get user's city preference or most frequent region if available
    const userPreferredRegion = await AsyncStorage.getItem('userPreferredRegion');
    
    // If user has a preferred region, cache it first
    if (userPreferredRegion) {
      const preferredRegion = JSON.parse(userPreferredRegion);
      await preCacheRegion(preferredRegion, [13, 14], useGoogleMaps); // Lower zoom levels for preferred region
    }
    
    // Cache common regions (with reduced zoom levels to save space)
    for (const region of Object.values(COMMON_REGIONS)) {
      await preCacheRegion(region, [12, 13], useGoogleMaps); // Only cache overview zoom levels
    }
  } catch (error) {
    console.error('Error pre-caching common regions:', error);
  }
};

/**
 * Clean up old tiles from the cache
 */
export const cleanupMapTileCache = async (): Promise<void> => {
  try {
    // Get all keys from AsyncStorage that match our metadata pattern
    const allKeys = await AsyncStorage.getAllKeys();
    const tileKeys = allKeys.filter(key => key.startsWith('map_tile_metadata_'));
    
    // Calculate total cache size and find expired tiles
    let totalCacheSize = 0;
    const tilesInfo: { key: string; timestamp: number; size: number }[] = [];
    
    for (const key of tileKeys) {
      const tileKey = key.replace('map_tile_metadata_', '');
      const metadata = await getTileMetadata(tileKey);
      
      if (metadata) {
        totalCacheSize += metadata.size;
        tilesInfo.push({
          key: tileKey,
          timestamp: metadata.timestamp,
          size: metadata.size,
        });
      }
    }
    
    // If cache size exceeds limit, remove oldest tiles first
    if (totalCacheSize > CACHE_CONFIG.MAX_SIZE) {
      // Sort by timestamp (oldest first)
      tilesInfo.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove tiles until we're under the size limit
      let removedSize = 0;
      for (const tile of tilesInfo) {
        if (totalCacheSize - removedSize <= CACHE_CONFIG.MAX_SIZE) {
          break;
        }
        
        // Delete the file and metadata
        const filePath = getTileFilePath(tile.key);
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        await removeTileMetadata(tile.key);
        
        removedSize += tile.size;
      }
      
      console.log(`Cleaned up ${tilesInfo.length} tiles, freed ${removedSize / 1024 / 1024} MB`);
    }
    
    // Also remove expired tiles
    const now = Date.now();
    for (const tile of tilesInfo) {
      if (now - tile.timestamp > CACHE_CONFIG.MAX_AGE) {
        const filePath = getTileFilePath(tile.key);
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        await removeTileMetadata(tile.key);
      }
    }
  } catch (error) {
    console.error('Error cleaning up map tile cache:', error);
  }
};

// Initialize map cache on import
(async () => {
  try {
    await ensureCacheDirectoryExists();
    // Clean up expired tiles on startup
    await cleanupMapTileCache();
  } catch (e) {
    console.warn('Error initializing map cache:', e);
  }
})();

export default {
  getMapTile,
  preCacheRegion,
  preCacheCommonRegions,
  cleanupMapTileCache,
  COMMON_REGIONS,
};
