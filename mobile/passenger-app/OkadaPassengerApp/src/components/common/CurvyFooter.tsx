import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface CurvyFooterProps {
  children: ReactNode;
  backgroundColor: string;
  height: number;
  curveHeight?: number;
  blurIntensity?: number;
}

const CurvyFooter: React.FC<CurvyFooterProps> = ({
  children,
  backgroundColor,
  height,
  curveHeight = 20,
  blurIntensity = 10,
}) => {
  // Determine if we can use BlurView (iOS) or fallback to normal View (Android)
  const useBlur = Platform.OS === 'ios';
  
  // Create SVG path for the curved top edge
  const createCurvePath = () => {
    const width = 100; // percentage
    
    // Curve calculations (percentages)
    const leftCurveStart = 0;
    const leftCurveEnd = 40;
    const rightCurveStart = 60;
    const rightCurveEnd = 100;
    
    // Control points for the cubic bezier curves (in percentages)
    const cpA1 = leftCurveStart + (leftCurveEnd - leftCurveStart) * 0.4;
    const cpA2 = leftCurveStart + (leftCurveEnd - leftCurveStart) * 0.6;
    const cpB1 = rightCurveStart + (rightCurveEnd - rightCurveStart) * 0.4;
    const cpB2 = rightCurveStart + (rightCurveEnd - rightCurveStart) * 0.6;
    
    // Create the path
    return `
      M0,${curveHeight}
      L${leftCurveStart},${curveHeight}
      C${cpA1},${curveHeight} ${cpA2},0 ${leftCurveEnd},0
      L${rightCurveStart},0
      C${cpB1},0 ${cpB2},${curveHeight} ${rightCurveEnd},${curveHeight}
      L${width},${curveHeight}
      L${width},${height + curveHeight}
      L0,${height + curveHeight}
      Z
    `;
  };
  
  const wrapperStyles = [
    styles.wrapper,
    {
      height: height + curveHeight,
      backgroundColor: useBlur ? 'transparent' : backgroundColor,
    },
  ];
  
  const footerContainerStyles = [
    styles.footerContainer,
    {
      paddingTop: curveHeight,
      height: height + curveHeight,
    },
  ];
  
  const curveStyles = [
    styles.curve,
    {
      height: curveHeight,
      backgroundColor: backgroundColor,
    },
  ];
  
  // Use different implementation for iOS and Android due to blur support
  if (useBlur) {
    return (
      <View style={wrapperStyles}>
        <View style={curveStyles} />
        <BlurView
          intensity={blurIntensity}
          tint="dark"
          style={footerContainerStyles}
        >
          <View style={styles.contentContainer}>{children}</View>
        </BlurView>
      </View>
    );
  }
  
  // Android fallback (no blur effect)
  return (
    <View style={wrapperStyles}>
      <View style={curveStyles} />
      <View style={footerContainerStyles}>
        <View style={styles.contentContainer}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  curve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});

export default CurvyFooter;
