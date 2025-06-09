import { Platform } from 'react-native';

/**
 * Web-specific styles for responsive design
 * These styles will only be applied when running on the web platform
 */

export const isWeb = Platform.OS === 'web';

export const webStyles = {
  // Container adaptations for web
  container: isWeb ? {
    maxWidth: '100%',
    margin: '0 auto',
    padding: 0,
  } : {},

  // Responsive container variants for different screen sizes
  containerLg: isWeb ? {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 20,
  } : {},

  containerMd: isWeb ? {
    maxWidth: '960px',
    margin: '0 auto',
    padding: 16,
  } : {},

  containerSm: isWeb ? {
    maxWidth: '720px',
    margin: '0 auto',
    padding: 12,
  } : {},

  // Content adaptations for web
  content: isWeb ? {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px',
    boxSizing: 'border-box' as 'border-box',
  } : {},

  // Grid layouts for web
  row: isWeb ? {
    display: 'flex' as 'flex',
    flexDirection: 'row' as 'row',
    flexWrap: 'wrap' as 'wrap',
    margin: 0,
    marginHorizontal: -10,
  } : {},

  col: isWeb ? {
    padding: '0 10px',
    boxSizing: 'border-box' as 'border-box',
  } : {},

  col2: isWeb ? {
    width: '50%',
    padding: '0 10px',
    boxSizing: 'border-box' as 'border-box',
  } : {},

  col3: isWeb ? {
    width: '33.333%',
    padding: '0 10px',
    boxSizing: 'border-box' as 'border-box',
  } : {},

  col4: isWeb ? {
    width: '25%',
    padding: '0 10px',
    boxSizing: 'border-box' as 'border-box',
  } : {},

  // Custom scrollbar for web
  scrollbar: isWeb ? {
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: '#555',
    },
  } : {},

  // Media query-like adaptations for different screen sizes
  // These will be applied conditionally based on the window size
  // in the useResponsiveStyles hook
  responsiveMdDown: isWeb ? {
    display: window.innerWidth < 768 ? 'none' as 'none' : 'flex' as 'flex',
  } : {},

  responsiveSmOnly: isWeb ? {
    display: window.innerWidth < 576 ? 'flex' as 'flex' : 'none' as 'none',
  } : {},

  // Card adaptations for web
  card: isWeb ? {
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  } : {},

  // Button adaptations for web 
  button: isWeb ? {
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    userSelect: 'none' as 'none',
    outline: 'none',
  } : {},

  // Form element adaptations for web
  input: isWeb ? {
    height: 40,
    padding: '8px 12px',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ddd',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    ':focus': {
      borderColor: '#2E86DE',
    },
  } : {},

  // Navigation adaptations for web
  header: isWeb ? {
    position: 'sticky' as 'sticky',
    top: 0,
    zIndex: 100,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #eee',
    padding: '12px 20px',
  } : {},

  // Responsive typography
  h1: isWeb ? {
    fontSize: 28,
    fontWeight: '700' as '700',
    marginBottom: 16,
  } : {},

  h2: isWeb ? {
    fontSize: 24,
    fontWeight: '600' as '600',
    marginBottom: 12,
  } : {},

  h3: isWeb ? {
    fontSize: 20,
    fontWeight: '600' as '600',
    marginBottom: 8,
  } : {},

  body: isWeb ? {
    fontSize: 16,
    lineHeight: 1.5,
  } : {},

  small: isWeb ? {
    fontSize: 14,
    lineHeight: 1.4,
  } : {},

  // Utility classes
  flexRow: isWeb ? {
    display: 'flex' as 'flex',
    flexDirection: 'row' as 'row',
    alignItems: 'center',
  } : {},

  flexColumn: isWeb ? {
    display: 'flex' as 'flex',
    flexDirection: 'column' as 'column',
  } : {},

  spaceBetween: isWeb ? {
    justifyContent: 'space-between',
  } : {},

  // Animations and transitions
  fadeIn: isWeb ? {
    animationName: 'fadeIn',
    animationDuration: '0.3s',
    animationFillMode: 'both',
  } : {},

  slideIn: isWeb ? {
    animationName: 'slideIn',
    animationDuration: '0.3s',
    animationFillMode: 'both',
  } : {},
};

/**
 * Hook to get responsive styles based on window size
 * This will re-calculate styles when window is resized
 */
export function useResponsiveStyles() {
  if (!isWeb) return {};

  // These would normally use React's useState and useEffect to be responsive
  // but for simplicity in this demo, we'll just calculate them once
  const width = window.innerWidth;
  
  return {
    isMobile: width < 576,
    isTablet: width >= 576 && width < 992,
    isDesktop: width >= 992,
    
    // Responsive style overrides
    container: {
      ...webStyles.container,
      padding: width < 576 ? 12 : 20,
    },
    
    // Column adaptations for smaller screens
    col2: {
      ...webStyles.col2,
      width: width < 768 ? '100%' : '50%',
    },
    
    col3: {
      ...webStyles.col3,
      width: width < 992 ? (width < 576 ? '100%' : '50%') : '33.333%',
    },
    
    col4: {
      ...webStyles.col4,
      width: width < 992 ? (width < 576 ? '100%' : '50%') : '25%',
    },
  };
}
