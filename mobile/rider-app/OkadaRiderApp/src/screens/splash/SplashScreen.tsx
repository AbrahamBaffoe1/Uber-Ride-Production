import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Platform,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Svg, Path, Circle, Defs, LinearGradient, Stop, G, Ellipse, Rect } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Navigation prop type
type NavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

// Color palette
const COLORS = {
  PRIMARY: '#FF5B2D',        // Vibrant Orange
  PRIMARY_LIGHT: '#FF8D6B',  // Light Orange
  PRIMARY_DARK: '#D63E12',   // Dark Orange
  
  SECONDARY: '#6C63FF',      // Purple
  SECONDARY_LIGHT: '#9590FF',// Light Purple
  
  ACCENT: '#FFCB11',         // Yellow
  ACCENT_LIGHT: '#FFE56B',   // Light Yellow
  
  TEXT_PRIMARY: '#1A1B1F',   // Deep Black
  TEXT_SECONDARY: '#555770', // Medium Gray
  TEXT_TERTIARY: '#8F90A6',  // Light Gray
  
  BACKGROUND: '#FFFFFF',     // White
  SURFACE: '#F7F9FC',        // Light Gray
  GRADIENT_START: '#FFFFFF', // White
  GRADIENT_END: '#F5F8FF',   // Very Light Blue
  
  SHADOW: 'rgba(0, 0, 0, 0.08)',
  LOADER_BG: 'rgba(0, 0, 0, 0.05)',
  LOADER_FILL: '#FF5B2D',
};

// Motorcycle illustration
const BikeIllustration = () => (
  <Svg width={180} height={140} viewBox="0 0 180 140">
    <Defs>
      <LinearGradient id="bikeBodyGradient" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={COLORS.PRIMARY} />
        <Stop offset="1" stopColor={COLORS.PRIMARY_DARK} />
      </LinearGradient>
      <LinearGradient id="wheelGradient" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#333333" />
        <Stop offset="1" stopColor="#181818" />
      </LinearGradient>
    </Defs>
    
    {/* Shadow */}
    <Ellipse cx="90" cy="120" rx="70" ry="10" opacity="0.1" fill="#000000" />
    
    {/* Wheels */}
    <G transform="translate(40, 90)">
      <Circle cx="0" cy="0" r="25" fill="url(#wheelGradient)" />
      <Circle cx="0" cy="0" r="15" fill="#1A1A1A" />
      <Circle cx="0" cy="0" r="5" fill="#444444" />
    </G>
    
    <G transform="translate(140, 90)">
      <Circle cx="0" cy="0" r="25" fill="url(#wheelGradient)" />
      <Circle cx="0" cy="0" r="15" fill="#1A1A1A" />
      <Circle cx="0" cy="0" r="5" fill="#444444" />
    </G>
    
    {/* Bike Body */}
    <Path
      d="M40,60 C40,60 60,40 90,40 C120,40 140,60 140,60 L125,90 L55,90 Z"
      fill="url(#bikeBodyGradient)"
    />
    
    {/* Handlebars */}
    <Path
      d="M125,70 L145,50"
      stroke="#555555"
      strokeWidth="4"
      strokeLinecap="round"
    />
    
    <Path
      d="M55,70 L35,50"
      stroke="#555555"
      strokeWidth="4"
      strokeLinecap="round"
    />
    
    {/* Seat */}
    <Ellipse cx="90" cy="45" rx="20" ry="8" fill="#333333" />
    
    {/* Headlight */}
    <Circle cx="140" cy="55" r="5" fill="#FFFF99" />
    
    {/* Taillight */}
    <Circle cx="40" cy="55" r="4" fill="#FF3333" />
  </Svg>
);

// Background elements
const BackgroundElements = () => (
  <Svg width={width} height={height} style={styles.backgroundElements}>
    {/* Top Right Circle */}
    <Circle cx={width - 30} cy={50} r={80} fill={COLORS.PRIMARY_LIGHT} opacity={0.07} />
    
    {/* Bottom Left Circle */}
    <Circle cx={40} cy={height - 80} r={100} fill={COLORS.SECONDARY_LIGHT} opacity={0.05} />
    
    {/* Center Decorative Path */}
    <Path
      d={`M0,${height/2} C${width/4},${height/2-50} ${width*3/4},${height/2+50} ${width},${height/2}`}
      stroke={COLORS.ACCENT_LIGHT}
      strokeWidth={2}
      strokeDasharray="5,15"
      opacity={0.2}
    />
  </Svg>
);

// Main Splash Screen Component
const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // Basic animation values - avoiding complex animations that might cause issues
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const loaderWidth = useRef(new Animated.Value(0)).current;
  
  // Prevent multiple navigation attempts
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Clear the onboarding flag for testing
    const clearOnboardingFlag = async () => {
      try {
        await AsyncStorage.removeItem('hasSeenOnboarding');
        console.log('Onboarding flag cleared for testing');
      } catch (error) {
        console.error('Error clearing onboarding flag:', error);
      }
    };
    
    clearOnboardingFlag();
    
    // Simple animation sequence
    Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      
      // Logo animation
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      
      // Text animation
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
    
    // Loader animation
    Animated.timing(loaderWidth, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    }).start();
    
    // Navigate after a short delay
    const navigationTimer = setTimeout(() => {
      if (!hasNavigated.current) {
        checkAndNavigate();
      }
    }, 3300);

    return () => clearTimeout(navigationTimer);
  }, []);

  // Skip button handler
  const handleSkip = () => {
    checkAndNavigate();
  };

  // Navigation logic
  const checkAndNavigate = async () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    
    try {
      // Get onboarding status
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      console.log('hasSeenOnboarding value:', hasSeenOnboarding);
      
      // Exit animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start(() => {
        console.log('Navigating to Onboarding screen');
        navigation.replace('Onboarding');
      });
    } catch (error) {
      console.error('Navigation error:', error);
      navigation.replace('Onboarding');
    }
  };
  
  // Loader width interpolation
  const loaderInterpolation = loaderWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent 
      />

      {/* Gradient background */}
      <ExpoLinearGradient
        colors={[COLORS.GRADIENT_START, COLORS.GRADIENT_END]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Background elements */}
      <BackgroundElements />

      {/* Skip button */}
      <TouchableOpacity 
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>

      {/* Main content */}
      <Animated.View 
        style={[
          styles.mainContainer, 
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.contentContainer}>
          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <BikeIllustration />
          </View>
          
          {/* Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: logoScale }]
              }
            ]}
          >
            <ExpoLinearGradient
              colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="bike-fast" size={36} color="white" />
            </ExpoLinearGradient>
          </Animated.View>

          {/* App Title and Description */}
          <Animated.View 
            style={[
              styles.textBlock,
              { opacity: textOpacity }
            ]}
          >
            <Text style={styles.appName}>Okada Rider</Text>
            <View style={styles.taglineContainer}>
              <Text style={styles.tagline}>Ride. Earn. Succeed.</Text>
            </View>
            
            {/* Feature Bullets */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: COLORS.PRIMARY }]} />
                <Text style={styles.featureText}>Fast deliveries</Text>
              </View>
              
              <View style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: COLORS.SECONDARY }]} />
                <Text style={styles.featureText}>Track earnings</Text>
              </View>
              
              <View style={styles.featureRow}>
                <View style={[styles.featureDot, { backgroundColor: COLORS.ACCENT }]} />
                <Text style={styles.featureText}>Flexible schedule</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Loading Bar */}
        <View style={styles.loaderContainer}>
          <View style={styles.loaderBg}>
            <Animated.View 
              style={[
                styles.loaderFill, 
                { width: loaderInterpolation }
              ]} 
            />
          </View>
          <Text style={styles.loadingText}>Starting your journey...</Text>
        </View>

        {/* Version Display */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2025 Okada Transportation</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    padding: 20,
    marginTop: -20,
  },
  illustrationContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textBlock: {
    alignItems: 'center',
    width: '100%',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 10,
    textAlign: 'center',
  },
  taglineContainer: {
    marginBottom: 25,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 91, 45, 0.08)',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 30,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 100,
    width: '75%',
    alignItems: 'center',
  },
  loaderBg: {
    height: 6,
    width: '100%',
    backgroundColor: COLORS.LOADER_BG,
    borderRadius: 3,
    overflow: 'hidden',
  },
  loaderFill: {
    height: '100%',
    backgroundColor: COLORS.LOADER_FILL,
    borderRadius: 3,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.TEXT_TERTIARY,
    fontWeight: '500',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: COLORS.TEXT_TERTIARY,
    marginBottom: 2,
  },
  versionSubtext: {
    fontSize: 11,
    color: COLORS.TEXT_TERTIARY,
    opacity: 0.8,
  },
});

export default SplashScreen;