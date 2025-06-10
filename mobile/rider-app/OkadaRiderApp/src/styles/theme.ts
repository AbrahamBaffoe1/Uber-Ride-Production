/**
 * App Theme Configuration
 * This file defines colors, fonts, and other design tokens used throughout the app
 */

// Color palette
export const colors = {
  primary: '#007bff',        // Primary brand color
  primaryDark: '#0056b3',    // Darker shade of primary color
  primaryLight: '#cce5ff',   // Lighter shade of primary color
  
  secondary: '#6c757d',      // Secondary color for UI elements
  secondaryDark: '#495057',  // Darker shade of secondary
  secondaryLight: '#e9ecef', // Lighter shade of secondary
  
  success: '#28a745',        // Success state color (green)
  danger: '#dc3545',         // Danger/error state color (red)
  warning: '#ffc107',        // Warning state color (yellow/amber)
  info: '#17a2b8',           // Info state color (teal/cyan)
  
  // Neutral colors
  black: '#000000',
  gray900: '#212529',        // Very dark gray
  gray800: '#343a40',
  gray700: '#495057',
  gray600: '#6c757d',
  gray500: '#adb5bd',
  gray400: '#ced4da',
  gray300: '#dee2e6',
  gray200: '#e9ecef',
  gray100: '#f8f9fa',        // Very light gray
  white: '#ffffff',
  
  // Background colors
  background: '#f8f9fa',     // Main background color
  cardBackground: '#ffffff', // Card/component background
  
  // Text colors
  textPrimary: '#212529',    // Primary text color
  textSecondary: '#6c757d',  // Secondary/muted text color
  textLight: '#ffffff',      // Light text color (for dark backgrounds)
  
  // Border colors
  border: '#dee2e6',
  
  // Status colors
  active: '#007bff',
  inactive: '#6c757d',
  online: '#28a745',
  offline: '#dc3545',
  
  // Ride status colors
  rideAccepted: '#28a745',
  rideInProgress: '#007bff',
  rideCompleted: '#6f42c1',
  rideCancelled: '#dc3545',
  
  // Social media colors
  facebook: '#3b5998',
  twitter: '#1da1f2',
  google: '#ea4335'
};

// Typography
export const typography = {
  fontSizeBase: 16,        // Base font size
  
  fontSizeXs: 12,          // Extra small text
  fontSizeSm: 14,          // Small text
  fontSizeMd: 16,          // Regular text
  fontSizeLg: 18,          // Large text
  fontSizeXl: 20,          // Extra large text
  fontSize2xl: 24,         // Heading level 4
  fontSize3xl: 30,         // Heading level 3
  fontSize4xl: 36,         // Heading level 2
  fontSize5xl: 48,         // Heading level 1
  
  fontWeightLight: '300',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  
  lineHeightTight: 1.2,    // Headings
  lineHeightBase: 1.5,     // Body text
  lineHeightLoose: 1.8,    // For better readability in larger text blocks
  
  // For future use with custom fonts
  fontFamilyBase: undefined,
  fontFamilyHeading: undefined,
  fontFamilyMono: 'monospace'
};

// Spacing scale (for margins, paddings, etc.)
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64
};

// Border radiuses
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 500,
  circle: 9999
};

// Shadows
export const shadows = {
  none: 'none',
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8
  }
};

// Z-index values
export const zIndex = {
  base: 0,
  elevated: 1,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070
};

// Animation timing
export const animation = {
  durationFast: 150,
  durationNormal: 300,
  durationSlow: 500,
  easing: 'ease-in-out'
};

// Combined theme object
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  animation
};

export default theme;
