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
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

// We're using any type for navigation to avoid complex typing issues
// with nested navigators in React Navigation

type AuthSuccessScreenRouteProp = RouteProp<
  AuthStackParamList,
  'AuthSuccess'
>;

interface Props {
  route: AuthSuccessScreenRouteProp;
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
  SUCCESS: '#00E096',      // Success Green
  SHADOW: 'rgba(0, 0, 0, 0.25)', // Shadow color
};

const { width, height } = Dimensions.get('window');

export default function AuthSuccessScreen({ route }: Props) {
  const navigation = useNavigation<any>();
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  // Get data from route params
  const { action, destination, message } = route.params || {};
  const isLogin = action === 'login';
  const isLogout = action === 'logout';
  const isSignup = action === 'signup';
  const isPasswordReset = action === 'passwordReset';

  // Determine appropriate title and message
  const getTitle = () => {
    if (isLogin) return 'Login Successful!';
    if (isLogout) return 'Logged Out';
    if (isSignup) return 'Registration Complete';
    if (isPasswordReset) return 'Password Reset';
    return 'Success!';
  };

  const getMessage = () => {
    if (message) return message;
    
    if (isLogin) return 'You are now logged into your account';
    if (isLogout) return 'You have been successfully logged out';
    if (isSignup) return 'Your account has been successfully created';
    if (isPasswordReset) return 'Your password has been successfully reset';
    return 'Operation completed successfully';
  };

  // Run entry animations
  useEffect(() => {
    // Trigger haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      // Success animation
      Animated.timing(successAnim, {
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
    ]).start();

    // Auto-navigate after delay if destination provided
    if (destination) {
      const timer = setTimeout(() => {
        // Handle navigation based on destination
        if (destination === 'Login' || destination === 'Register' || 
            destination === 'ForgotPassword' || destination === 'ResetPassword' ||
            destination === 'AuthSuccess' || destination === 'AuthError') {
          // Auth stack screens
          navigation.navigate('Auth', { screen: destination });
        } else {
          // For main app screens, go to main navigator
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, []);

  // Handle continue button press
  const handleContinue = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (destination) {
      // Handle navigation based on destination
      if (destination === 'Login' || destination === 'Register' || 
          destination === 'ForgotPassword' || destination === 'ResetPassword' ||
          destination === 'AuthSuccess' || destination === 'AuthError') {
        // Auth stack screens
        navigation.navigate('Auth', { screen: destination });
      } else {
        // For main app screens, go to main navigator
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } else if (isLogin) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else if (isLogout) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth', params: { screen: 'Login' } }],
      });
    } else {
      navigation.goBack();
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
      
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Success Animation */}
        <Animated.View 
          style={[
            styles.successIconContainer,
            {
              opacity: successAnim,
              transform: [
                { scale: successAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.2, 1]
                }) }
              ]
            }
          ]}
        >
          <View style={styles.successIcon}>
            <LottieView
              source={require('../../../assets/animations/success.json')}
              autoPlay
              loop={false}
              style={styles.lottieAnimation}
              speed={0.7}
            />
          </View>
        </Animated.View>
        
        {/* Success Title and Message */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: successAnim,
              transform: [{ translateY: textSlideAnim }]
            }
          ]}
        >
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.message}>{getMessage()}</Text>
        </Animated.View>
        
        {/* Continue Button */}
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
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>CONTINUE</Text>
                <Ionicons 
                  name="arrow-forward" 
                  size={18} 
                  color={COLORS.BACKGROUND} 
                  style={styles.buttonIcon} 
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  successIconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(11, 227, 125, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 227, 125, 0.3)',
  },
  lottieAnimation: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
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
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    borderRadius: 16,
    height: 55,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
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
  buttonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
