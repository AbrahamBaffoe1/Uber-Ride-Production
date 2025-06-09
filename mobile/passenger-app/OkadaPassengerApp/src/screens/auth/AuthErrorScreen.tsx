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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';

type AuthErrorScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AuthError'
>;

type AuthErrorScreenRouteProp = RouteProp<
  RootStackParamList,
  'AuthError'
>;

interface Props {
  navigation: AuthErrorScreenNavigationProp;
  route: AuthErrorScreenRouteProp;
}

// Premium Color Palette - Gold, Black and White
const COLORS = {
  GOLD: '#D4AF37',           // Main Gold
  GOLD_LIGHT: '#F5E7A3',     // Light Gold
  GOLD_DARK: '#996515',      // Dark Gold
  BLACK: '#000000',          // Pure Black
  BLACK_LIGHT: '#222222',    // Light Black for backgrounds
  BLACK_DARK: '#111111',     // Darker Black
  WHITE: '#FFFFFF',          // Pure White
  WHITE_OFF: '#F7F7F7',      // Slight off-white
  GRAY_LIGHT: '#E0E0E0',     // Light Gray
  GRAY: '#AAAAAA',           // Medium Gray
  GRAY_DARK: '#666666',      // Dark Gray
  BACKGROUND: '#0A0A0A',     // Almost Black background
  ERROR: '#FF5252',          // Error Red
  ERROR_DARK: '#D32F2F',     // Dark Red
};

const { width, height } = Dimensions.get('window');

export default function AuthErrorScreen({ navigation, route }: Props) {
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
      // Use a switch statement for type-safe navigation
      switch (retryDestination) {
        case 'Login':
          navigation.navigate('Login');
          break;
        case 'SignUp':
          navigation.navigate('SignUp');
          break;
        case 'ForgotPassword':
          navigation.navigate('ForgotPassword');
          break;
        default:
          // Default fallback
          navigation.goBack();
          break;
      }
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
    
    // If logged in, go to home, otherwise go to login
    const isLoggedIn = true; // This should be determined by your auth state manager
    
    if (isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BLACK} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.BLACK_DARK, COLORS.BLACK]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
            <Animatable.View 
              style={styles.errorIcon}
              animation="shake"
              duration={1000}
              delay={300}
            >
              <Ionicons 
                name="close-circle" 
                size={80} 
                color={COLORS.ERROR} 
              />
            </Animatable.View>
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
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.buttonInner}>
                  <Ionicons 
                    name="refresh" 
                    size={18} 
                    color={COLORS.WHITE} 
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
              onPress={() => navigation.navigate('Support')}
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
    backgroundColor: COLORS.BLACK,
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
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: COLORS.GRAY,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  retryButton: {
    borderRadius: 16,
    height: 60,
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
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  homeButton: {
    borderRadius: 16,
    height: 60,
    borderWidth: 1.5,
    borderColor: COLORS.GRAY_DARK,
    overflow: 'hidden',
  },
  homeButtonInner: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonText: {
    color: COLORS.GRAY_LIGHT,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  supportContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  supportText: {
    color: COLORS.GRAY,
    fontSize: 14,
    marginBottom: 10,
  },
  supportButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  supportButtonText: {
    color: COLORS.GOLD,
    fontSize: 14,
    fontWeight: '600',
  },
});
