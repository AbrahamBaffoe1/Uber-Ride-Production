import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../api/apiClient';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
  SafeAreaView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { authService } from '../../api/services/authService';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

// Production mode - connects to the real backend API
const DEV_MODE = false;

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
  SUCCESS: '#4CAF50',        // Success Green
  SHADOW: 'rgba(212, 175, 55, 0.25)', // Gold shadow
  OVERLAY: 'rgba(0, 0, 0, 0.8)', // Black overlay
};

const { width, height } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }: Props) {
  // Form state
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [resetSent, setResetSent] = useState(false);
  
  // Refs
  const emailInputRef = useRef<TextInput>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const successAnimValue = useRef(new Animated.Value(0)).current;
  const loadingSpinnerRotate = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  
  // Rotate interpolation for loading spinner and logo
  const spin = loadingSpinnerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const logoSpin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Validate email format
  const validateEmail = (text: string) => {
    setEmail(text);
    if (text.length === 0) {
      setEmailValid(null);
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(emailRegex.test(text));
  };
  
  // Start entrance animations when component mounts
  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      
      // Logo animation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      
      // Staggered inputs and content
      Animated.stagger(150, [
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(inputAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);
  
  // Start loading spinner animation
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(loadingSpinnerRotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ).start();
    } else {
      loadingSpinnerRotate.setValue(0);
    }
  }, [isLoading]);
  
  // Animate success screen when reset is sent
  useEffect(() => {
    if (resetSent) {
      Animated.spring(successAnimValue, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      }).start();
    }
  }, [resetSent]);

  // Button press animation
  const animateButton = () => {
    // Use haptic feedback if available
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease)
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.ease)
      })
    ]).start();
  };

  // Handle reset password press
  const handleResetPassword = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Animate button press
    animateButton();
    
    // Validate email
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    if (emailValid === false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Error', 'Please enter a valid email address');
      emailInputRef.current?.focus();
      return;
    }
    
    // Show loading indicator and make API call
    setIsLoading(true);
    
    try {
      if (DEV_MODE) {
        // Simulate API call in development mode
        console.log(`[DEV MODE] Simulating password reset request for: ${email}`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate successful response
        setResetSent(true);
        
        // Use haptic feedback for success if available
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        // Call actual API endpoint for password reset
        await authService.requestPasswordReset(email);
        
        setResetSent(true);
        
        // Use haptic feedback for success if available
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      // Handle different error types
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (error.response.status === 404) {
            console.log(`API endpoint not found: ${API_BASE_URL}/otp/public/request`);
            errorMessage = 'This feature is not available in the demo. In a production environment, a password reset email would be sent.';
          } else {
            errorMessage = error.response.data?.message || 
                           error.response.data?.error || 
                           `Error ${error.response.status}: ${error.response.statusText}`;
          }
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response from server. Please check your connection.';
        } else {
          // Something happened in setting up the request
          errorMessage = error.message || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (DEV_MODE) {
        // In development mode, show the error but don't block the flow
        console.warn(`[DEV MODE] Error would normally show: ${errorMessage}`);
        Alert.alert('Development Mode', 'Continuing with simulated successful password reset request.');
        
        // Proceed with simulated success flow
        setResetSent(true);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  // Reset back to form
  const handleReset = () => {
    setEmail('');
    setResetSent(false);
    setEmailValid(null);
    
    successAnimValue.setValue(0);
    
    // Use haptic feedback if available
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  
  // Return to login screen
  const goToLogin = () => {
    Haptics.selectionAsync().catch(() => {});
    
    // Animate transition out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(translateY, {
        toValue: 30,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      })
    ]).start(() => {
      navigation.navigate('Login');
    });
  };

  // Render success state
  const renderSuccessState = () => {
    const scale = successAnimValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.1, 1]
    });
    
    return (
      <Animated.View 
        style={[
          styles.successContainer,
          {
            transform: [{ scale }],
            opacity: successAnimValue
          }
        ]}
      >
        <View style={styles.successIconContainer}>
          <View style={styles.successIconOuter}>
            <LinearGradient
              colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
              style={styles.successIconBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.successIconStack}>
                <MaterialIcons name="check" size={36} color={COLORS.BLACK} />
                <View style={styles.miniLogoContainer}>
                  <MaterialCommunityIcons name="motorbike" size={16} color={COLORS.BLACK} />
                  <MaterialCommunityIcons 
                    name="human-greeting" 
                    size={10} 
                    color={COLORS.BLACK} 
                    style={styles.miniPassengerIcon}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
          <View style={styles.successPulse}></View>
        </View>
        
        <Text style={styles.successTitle}>Email Sent!</Text>
        <Text style={styles.successMessage}>
          We've sent an email to <Text style={styles.emailHighlight}>{email}</Text> with instructions to reset your password.
        </Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <FontAwesome name="info-circle" size={20} color={COLORS.GOLD} />
          </View>
          <Text style={styles.infoText}>
            Please check your inbox and spam folder. The reset link is valid for 30 minutes.
          </Text>
        </View>
        
        <View style={styles.successButtons}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={goToLogin}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.buttonInner}>
                <Text style={styles.primaryButtonText}>RETURN TO LOGIN</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.BLACK} style={styles.buttonIcon} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Try Different Email</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
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
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              {/* Header with back button */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  // Animate and navigate back
                  Animated.parallel([
                    Animated.timing(fadeAnim, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                      easing: Easing.out(Easing.cubic)
                    }),
                    Animated.timing(translateY, {
                      toValue: 30,
                      duration: 300,
                      useNativeDriver: true,
                      easing: Easing.out(Easing.cubic)
                    })
                  ]).start(() => {
                    navigation.goBack();
                  });
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.GOLD} />
              </TouchableOpacity>
              
              {!resetSent ? (
                <>
                  {/* Logo */}
                  <Animated.View 
                    style={[
                      styles.logoContainer,
                      {
                        transform: [
                          { scale: logoScale },
                          { rotate: logoSpin }
                        ]
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
                      style={styles.logoBackground}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.logoIconContainer}>
                        <MaterialCommunityIcons name="motorbike" size={40} color={COLORS.BLACK} />
                        <MaterialCommunityIcons 
                          name="human-greeting" 
                          size={22} 
                          color={COLORS.BLACK} 
                          style={styles.passengerIcon}
                        />
                      </View>
                    </LinearGradient>
                  </Animated.View>
                  
                  {/* Welcome text */}
                  <Animated.View 
                    style={{
                      transform: [{ translateY }]
                    }}
                  >
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>Enter your email address below and we'll send you instructions to reset your password</Text>
                  </Animated.View>
                  
                  {/* Form Container */}
                  <View style={styles.formContainer}>
                    {/* Email Input */}
                    <Animated.View 
                      style={[
                        styles.inputWrapper,
                        {
                          opacity: inputAnim,
                          transform: [{
                            translateX: inputAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-20, 0]
                            })
                          }]
                        }
                      ]}
                    >
                      <View style={[
                        styles.inputContainer,
                        emailValid === false && styles.inputError,
                        emailValid === true && styles.inputSuccess
                      ]}>
                        <Ionicons 
                          name="mail-outline" 
                          size={18} 
                          color={COLORS.GOLD} 
                          style={styles.inputIcon} 
                        />
                        <TextInput
                          ref={emailInputRef}
                          style={styles.input}
                          placeholder="Email Address"
                          placeholderTextColor={COLORS.GRAY}
                          value={email}
                          onChangeText={validateEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          selectionColor={COLORS.GOLD_LIGHT}
                        />
                        {emailValid === true && (
                          <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
                        )}
                        {emailValid === false && (
                          <Ionicons name="close-circle" size={18} color={COLORS.ERROR} />
                        )}
                      </View>
                      {emailValid === false && (
                        <Text style={styles.errorText}>Please enter a valid email address</Text>
                      )}
                    </Animated.View>
                    
                    {/* Reset Button */}
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                      <TouchableOpacity
                        style={styles.button}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
                          style={styles.buttonGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          {isLoading ? (
                            <ActivityIndicator color={COLORS.BLACK} />
                          ) : (
                            <View style={styles.buttonInner}>
                              <Text style={styles.buttonText}>SEND RESET LINK</Text>
                              <Ionicons 
                                name="arrow-forward" 
                                size={18} 
                                color={COLORS.BLACK} 
                                style={styles.buttonIcon} 
                              />
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                    
                    {/* Back to Login Link */}
                    <View style={styles.loginContainer}>
                      <Text style={styles.loginText}>
                        Remember your password?
                      </Text>
                      <TouchableOpacity 
                        onPress={goToLogin}
                        hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
                      >
                        <Text style={styles.loginLink}>Log In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : (
                renderSuccessState()
              )}
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      {/* Terms of Service - Fixed at bottom */}
      <View style={styles.termsContainer}>
        <TouchableOpacity style={styles.termsButton} activeOpacity={0.7}>
          <Text style={styles.termsText}>Terms of Service</Text>
        </TouchableOpacity>
        <View style={styles.termsDivider} />
        <TouchableOpacity style={styles.termsButton} activeOpacity={0.7}>
          <Text style={styles.termsText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 0 : 10,
    left: 0,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoBackground: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 15,
  },
  logoIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  passengerIcon: {
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.GRAY,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.GOLD,
    height: 60,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
  },
  inputError: {
    borderColor: COLORS.ERROR,
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
  },
  inputSuccess: {
    borderColor: COLORS.SUCCESS,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 15,
  },
  button: {
    borderRadius: 16,
    height: 60,
    marginTop: 30,
    marginBottom: 20,
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
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginText: {
    fontSize: 15,
    color: COLORS.GRAY,
    marginRight: 6,
  },
  loginLink: {
    color: COLORS.GOLD,
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.15)',
  },
  termsButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  termsDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.GRAY_DARK,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.GRAY,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIconContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconOuter: {
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  successIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconStack: {
    position: 'relative',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  miniLogoContainer: {
    position: 'absolute',
    bottom: -8,
    right: -10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  miniPassengerIcon: {
    marginLeft: -5,
    marginBottom: -2,
  },
  successPulse: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    zIndex: -1,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.GRAY_LIGHT,
    textAlign: 'center',
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: 'bold',
    color: COLORS.GOLD,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.GOLD,
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.GRAY_LIGHT,
  },
  successButtons: {
    width: '100%',
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  primaryButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.BLACK,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  secondaryButtonText: {
    color: COLORS.GOLD,
    fontSize: 16,
    fontWeight: '500',
  }
});
