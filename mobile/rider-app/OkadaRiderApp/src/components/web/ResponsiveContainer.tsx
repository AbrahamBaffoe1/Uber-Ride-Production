import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { webStyles, isWeb, useResponsiveStyles } from '../../styles/web.styles';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  type?: 'sm' | 'md' | 'lg' | 'full';
  center?: boolean;
  padding?: boolean | number;
  fluid?: boolean;
}

/**
 * A responsive container component for web and mobile
 * Automatically applies responsive styles on web platform
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  type = 'md',
  center = false,
  padding = true,
  fluid = false,
}) => {
  // Get responsive styles (will be empty object on mobile)
  const responsiveStyles = isWeb ? useResponsiveStyles() : {};
  
  // Determine container style based on type
  let containerStyle = webStyles.container;
  
  if (isWeb && !fluid) {
    switch (type) {
      case 'sm':
        containerStyle = webStyles.containerSm;
        break;
      case 'md':
        containerStyle = webStyles.containerMd;
        break;
      case 'lg':
        containerStyle = webStyles.containerLg;
        break;
      case 'full':
      default:
        containerStyle = webStyles.container;
    }
  }
  
  // Apply padding if specified
  let paddingStyle = {};
  if (padding !== false) {
    if (typeof padding === 'number') {
      paddingStyle = { padding };
    } else if (isWeb) {
      paddingStyle = { padding: responsiveStyles.isMobile ? 12 : 20 };
    }
  }
  
  // Apply center alignment if specified
  const centerStyle = center ? { alignItems: 'center', justifyContent: 'center' } : {};
  
  return (
    <View 
      style={[
        styles.baseContainer, 
        containerStyle,
        paddingStyle,
        centerStyle,
        style
      ]}
    >
      {children}
    </View>
  );
};

// Row component for grid layout
interface RowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  wrap?: boolean;
  spaceBetween?: boolean;
}

export const Row: React.FC<RowProps> = ({
  children,
  style,
  wrap = true,
  spaceBetween = false,
}) => {
  return (
    <View 
      style={[
        styles.row, 
        isWeb && webStyles.row,
        wrap && { flexWrap: 'wrap' },
        spaceBetween && { justifyContent: 'space-between' },
        style
      ]}
    >
      {children}
    </View>
  );
};

// Column component for grid layout
interface ColProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: number; // 1-12 for 12-column grid
  width?: string | number;
}

export const Col: React.FC<ColProps> = ({
  children,
  style,
  size = 0,
  width,
}) => {
  // Get responsive styles
  const responsiveStyles = isWeb ? useResponsiveStyles() : {};
  
  // Calculate column width based on size (12-column grid)
  let colWidth = {};
  
  if (width) {
    colWidth = { width };
  } else if (size > 0 && isWeb) {
    const percentage = (size / 12) * 100;
    
    // Make columns full width on mobile if they're more than half width
    if (responsiveStyles.isMobile && size > 6) {
      colWidth = { width: '100%' };
    } else {
      colWidth = { width: `${percentage}%` };
    }
  }
  
  return (
    <View 
      style={[
        styles.col,
        isWeb && webStyles.col,
        colWidth,
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flexDirection: 'column',
  },
});
