import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageProps,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface LazyImageProps extends Omit<ImageProps, 'onLoad'> {
  thumbnailSource?: string | null;
  placeholderColor?: string;
  showPlaceholder?: boolean;
  showActivityIndicator?: boolean;
  activityIndicatorColor?: string;
  blurRadius?: number;
  onLoadComplete?: () => void;
  renderError?: () => React.ReactNode;
}

/**
 * LazyImage component for optimized image loading
 * Features:
 * - Progressive loading with thumbnails
 * - Animated loading transitions
 * - Placeholder or activity indicator while loading
 * - Blur effect for smooth transitions
 * - Error handling
 */
const LazyImage: React.FC<LazyImageProps> = ({
  source,
  thumbnailSource,
  placeholderColor = '#E1E2E3',
  showPlaceholder = true,
  showActivityIndicator = false,
  activityIndicatorColor = '#999',
  blurRadius = 5,
  style,
  resizeMode = 'cover',
  onLoadComplete,
  renderError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Handle image loading
  const onLoad = () => {
    setIsLoading(false);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      if (onLoadComplete) {
        onLoadComplete();
      }
    });
  };

  // Handle thumbnail loading
  const onThumbnailLoad = () => {
    setThumbnailLoaded(true);
  };

  // Handle loading errors
  const onError = () => {
    setIsLoading(false);
    setIsError(true);
  };

  // Reset state if source changes
  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    fadeAnim.setValue(0);
  }, [source]);

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder */}
      {showPlaceholder && isLoading && (
        <View
          style={[
            styles.placeholder,
            { backgroundColor: placeholderColor },
          ]}
        />
      )}

      {/* Activity Indicator */}
      {showActivityIndicator && isLoading && (
        <View style={styles.activityIndicator}>
          <ActivityIndicator color={activityIndicatorColor} size="small" />
        </View>
      )}

      {/* Thumbnail image (low-res, loads first) */}
      {thumbnailSource && !isError && (
        <Animated.Image
          source={{ uri: thumbnailSource as string }}
          style={[styles.image, { opacity: thumbnailLoaded ? 1 : 0 }]}
          onLoad={onThumbnailLoad}
          blurRadius={blurRadius}
          resizeMode={resizeMode}
        />
      )}

      {/* Main image */}
      {!isError && (
        <Animated.Image
          source={source}
          style={[
            styles.image,
            {
              opacity: fadeAnim,
              zIndex: 1,
            },
          ]}
          onLoad={onLoad}
          onError={onError}
          resizeMode={resizeMode}
          {...props}
        />
      )}

      {/* Blur overlay while loading for smooth transition */}
      {thumbnailLoaded && isLoading && Platform.OS !== 'web' && (
        <BlurView
          intensity={15}
          style={styles.blurOverlay}
          tint="light"
        />
      )}

      {/* Error fallback */}
      {isError && renderError && (
        <View style={styles.errorContainer}>
          {renderError()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  activityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});

export default LazyImage;
