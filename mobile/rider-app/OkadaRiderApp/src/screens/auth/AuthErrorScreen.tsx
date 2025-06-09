import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

// Using any type for navigation to avoid complex typing issues 
// with nested navigators in React Navigation

type AuthErrorScreenRouteProp = RouteProp<
  AuthStackParamList,
  'AuthError'
>;

interface Props {
  route: AuthErrorScreenRouteProp;
}

// Refined color palette for rider app
const COLORS = {
  PRIMARY: '#0BE37D',      // Vibrant Green
  PRIMARY_LIGHT: '#58FFB8', // Lighter Green
  PRIMARY_DARK: '#00A55A', // Dark Green
  SECONDARY: '#0A1118',    // Very Dark Blue-Gray
  BACKGROUND: '#050B12',   // Nearly Black
  CARD_BG: '#111C26',      // Dark Blue-Gray
  INPUT_BG: '#162230',     // Slightly lighter Dark Blue-Gray
  INPUT_BORDER: '#253241', // Border color
  TEXT_PRIMARY: '#FFFFFF', // White
  TEXT_SECONDARY: '#A7B5C4', // Light Gray
  TEXT_MUTED: '#5F7082',   // Muted Gray
  ACCENT: '#0BE37D',       // Same as PRIMARY for consistency
  ERROR: '#FF4E6C',        // Error Red
  ERROR_DARK: '#D32F2F',   // Dark Red
  SUCCESS: '#00E096',      // Success Green
  SHADOW: 'rgba(0, 0, 0, 0.25)', // Shadow color
};

const { width, height } = Dimensions.get('window');

export default function AuthErrorScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Get data from route params
  const { error, action, retryDestination } = route.params || {};
  const isLogin = action === 'login';
  const isLogout = action === 'logout';
  const isSignup = action === 'signup';
  const isPasswordReset = action === 'passwordReset';

  // Determine appropriate title based on action
  const getTitle = () => {
    if (isLogin) return 'Login Failed';
    if (isLogout) return 'Logout Error';
    if (isSignup) return 'Sign Up Failed';
    if (isPasswordReset) return 'Reset Failed';
    return 'Authentication Error';
  };

  // Get the error message to display
  const getErrorMessage = () => {
    // If an error was passed in the navigation params, use it
    if (error) return error;
    
    // Otherwise, provide generic error message based on action
    if (isLogin) return 'Unable to login. Please check your credentials and try again.';
    if (isLogout) return 'Unable to log you out. Please try again later.';
    if (isSignup) return 'Unable to create your account. Please try again later.';
    if (isPasswordReset) return 'Unable to reset your password. Please try again later.';
    
    return 'An error occurred during authentication. Please try again later.';
  };

  // Create a shake animation
  const createShakeAnimation = () => {
    return Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true })
    ]);
  };

  // Run entry animations
  useEffect(() => {
    // Trigger haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Animation sequence
    Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      // Error animation
      Animated.timing(errorAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Text slide up
      Animated.spring(textSlideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      // Button fade in
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Shake the error icon
      createShakeAnimation()
    ]).start();
  }, []);

  // Handle retry button press
  const handleRetry = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (retryDestination) {
      // Auth stack screens
      navigation.navigate('Auth', { 
        screen: retryDestination 
      });
    } else {
      // If no specific retry destination, just go back
      navigation.goBack();
    }
  };

  // Handle go home button press
  const handleGoHome = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Check if we're already logged in to determine where to navigate
    const isUserLoggedIn = navigation.canGoBack(); // Simple check - adjust based on your auth system
    
    if (isUserLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: 'Login' } }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.BACKGROUND, COLORS.SECONDARY]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Error Animation */}
          <Animated.View 
            style={[
              styles.errorIconContainer,
              {
                opacity: errorAnim,
                transform: [
                  { scale: errorAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.2, 1]
                  }) },
                  { translateX: shakeAnim }
                ]
              }
            ]}
          >
            <View style={styles.errorIcon}>
              <LottieView
                source={require('../../../assets/animations/error.json')}
                autoPlay
                loop={false}
                style={styles.lottieAnimation}
                speed={0.7}
              />
            </View>
          </Animated.View>
          
          {/* Error Title and Message */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: errorAnim,
                transform: [{ translateY: textSlideAnim }]
              }
            ]}
          >
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.message}>{getErrorMessage()}</Text>
          </Animated.View>
          
          {/* Action Buttons */}
          <Animated.View 
            style={[
              styles.buttonContainer,
              {
                opacity: buttonFadeAnim,
                transform: [
                  { translateY: buttonFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  }) }
                ]
              }
            ]}
          >
            {/* Retry Button */}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.ERROR, COLORS.ERROR_DARK]}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.buttonInner}>
                  <Ionicons 
                    name="refresh" 
                    size={18} 
                    color={COLORS.TEXT_PRIMARY} 
                    style={styles.buttonIcon} 
                  />
                  <Text style={styles.buttonText}>TRY AGAIN</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Go Home Button */}
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleGoHome}
              activeOpacity={0.85}
            >
              <View style={styles.homeButtonInner}>
                <Text style={styles.homeButtonText}>GO TO HOME</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Support Info */}
          <Animated.View
            style={[
              styles.supportContainer,
              { opacity: buttonFadeAnim }
            ]}
          >
            <Text style={styles.supportText}>
              Need help? Contact our support team
            </Text>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => navigation.navigate('Main', { screen: 'Support' })}
            >
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  errorIconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 78, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 78, 108, 0.3)',
  },
  lottieAnimation: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  retryButton: {
    borderRadius: 16,
    height: 55,
    shadowColor: COLORS.ERROR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  homeButton: {
    borderRadius: 16,
    height: 55,
    borderWidth: 1.5,
    borderColor: COLORS.INPUT_BORDER,
    backgroundColor: COLORS.CARD_BG,
    overflow: 'hidden',
  },
  homeButtonInner: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  supportContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  supportText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginBottom: 10,
  },
  supportButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  supportButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
});
