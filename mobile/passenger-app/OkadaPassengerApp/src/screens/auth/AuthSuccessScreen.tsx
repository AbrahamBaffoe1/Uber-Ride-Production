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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';

type AuthSuccessScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AuthSuccess'
>;

type AuthSuccessScreenRouteProp = RouteProp<
  RootStackParamList,
  'AuthSuccess'
>;

interface Props {
  navigation: AuthSuccessScreenNavigationProp;
  route: AuthSuccessScreenRouteProp;
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
  SUCCESS: '#4CAF50',        // Success Green
  SUCCESS_DARK: '#388E3C',   // Dark Green
};

const { width, height } = Dimensions.get('window');

export default function AuthSuccessScreen({ navigation, route }: Props) {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;

  // Get data from route params
  const { action, destination } = route.params || {};
  const isLogin = action === 'login';
  const isLogout = action === 'logout';

  // Determine appropriate title and message
  const getTitle = () => {
    if (isLogin) return 'Welcome Back!';
    if (isLogout) return 'See You Soon!';
    return 'Success!';
  };

  const getMessage = () => {
    if (isLogin) return 'You have successfully logged into your account';
    if (isLogout) return 'You have been successfully logged out';
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
        // Use a different approach for type safety with dynamic navigation
        switch (destination) {
          case 'Home':
            navigation.navigate('Home');
            break;
          case 'Login':
            navigation.navigate('Login');
            break;
          case 'Profile':
            navigation.navigate('Profile');
            break;
          default:
            // Default to Home if somehow an invalid destination is provided
            navigation.navigate('Home');
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
      // Use a switch statement for type-safe navigation
      switch (destination) {
        case 'Home':
          navigation.navigate('Home');
          break;
        case 'Login':
          navigation.navigate('Login');
          break;
        case 'Profile':
          navigation.navigate('Profile');
          break;
        default:
          // Default to Home if somehow an invalid destination is provided
          navigation.navigate('Home');
      }
    } else if (isLogin) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } else if (isLogout) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } else {
      navigation.goBack();
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
          <Animatable.View 
            style={styles.successIcon}
            animation="bounceIn"
            duration={1000}
            delay={300}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={80} 
              color={COLORS.GOLD} 
            />
          </Animatable.View>
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
              colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>CONTINUE</Text>
                <Ionicons 
                  name="arrow-forward" 
                  size={18} 
                  color={COLORS.BLACK} 
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
    backgroundColor: COLORS.BLACK,
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
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
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
  },
  button: {
    borderRadius: 16,
    height: 60,
    shadowColor: COLORS.GOLD,
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
    color: COLORS.BLACK,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
