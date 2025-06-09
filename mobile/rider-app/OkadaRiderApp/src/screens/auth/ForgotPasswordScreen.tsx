// src/screens/auth/ForgotPasswordScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Easing,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';
import authService from '../../api/services/auth.service';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// Production mode - connects to the real backend API
const DEV_MODE = false;

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive scaling functions
const scale = size => (width / 375) * size;
const verticalScale = size => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Modern color palette with green and black theme
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
  ERROR: '#FF4E6C',        // Error Red
  SUCCESS: '#0BE37D',      // Success Green using PRIMARY color
  SHADOW: 'rgba(0, 0, 0, 0.25)', // Shadow color
  GRADIENT: {
    PRIMARY: ['#0BE37D', '#00A55A'],
    DARK: ['#050B12', '#0A1727'],
    CARD: ['#162230', '#0E1820'],
    INPUT_FOCUS: ['rgba(11, 227, 125, 0.1)', 'rgba(11, 227, 125, 0.05)'],
    BUTTON_PRESSED: ['#00A55A', '#008B4B'],
  }
};

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

// Animated decorative elements
const DecorativeElements = () => {
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const circle3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animate decorative circles
    Animated.stagger(150, [
      Animated.spring(circle1, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(circle2, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(circle3, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  return (
    <View style={styles.decorativeContainer}>
      <Animated.View 
        style={[
          styles.decorCircle, 
          styles.decorCircle1,
          {
            opacity: circle1,
            transform: [{ scale: circle1 }]
          }
        ]}
      />
      <Animated.View 
        style={[
          styles.decorCircle, 
          styles.decorCircle2,
          {
            opacity: circle2,
            transform: [{ scale: circle2 }]
          }
        ]}
      />
      <Animated.View 
        style={[
          styles.decorCircle, 
          styles.decorCircle3,
          {
            opacity: circle3,
            transform: [{ scale: circle3 }]
          }
        ]}
      />
      <View style={styles.decorativeLine1} />
      <View style={styles.decorativeLine2} />
    </View>
  );
};

// Forgot password icon component with motorcycle and driver theme
const ForgotPasswordIcon = () => {
  const iconAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(iconAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);
  
  return (
    <Animated.View 
      style={[
        styles.forgotIconContainer,
        {
          opacity: iconAnim,
          transform: [{ scale: iconAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={COLORS.GRADIENT.PRIMARY}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.forgotIconGradient}
      >
        <View style={styles.forgotIconInner}>
          <View style={styles.logoIconContainer}>
            <MaterialCommunityIcons name="lock-reset" size={28} color={COLORS.BACKGROUND} />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Animated success checkmark component
const AnimatedSuccess = ({ onComplete }: { onComplete: () => void }) => {
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const successTextOpacity = useRef(new Animated.Value(0)).current;
  const successTextY = useRef(new Animated.Value(20)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in sequence
    Animated.sequence([
      // First animate ring
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1.2,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Then animate checkmark
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Then animate success text
      Animated.parallel([
        Animated.timing(successTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(successTextY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]),
      // Finally show loader with delay
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // After animation completes, trigger the onComplete callback
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        {/* Animated ring */}
        <Animated.View 
          style={[
            styles.successRing,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }]
            }
          ]}
        />
        
        {/* Animated checkmark circle */}
        <Animated.View 
          style={[
            styles.successIconContainer,
            {
              opacity: checkmarkOpacity,
              transform: [
                { scale: checkmarkScale }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={COLORS.GRADIENT.PRIMARY}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successIconGradient}
          >
            <View style={styles.successIconInner}>
              <Ionicons name="checkmark-sharp" size={32} color={COLORS.BACKGROUND} />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
      
      <Animated.Text 
        style={[
          styles.successTitle,
          {
            opacity: successTextOpacity,
            transform: [{ translateY: successTextY }]
          }
        ]}
      >
        Reset Code Sent
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.successText,
          {
            opacity: successTextOpacity,
            transform: [{ translateY: successTextY }]
          }
        ]}
      >
        A password reset code has been sent to your phone number.
        You will be redirected to the reset password screen shortly.
      </Animated.Text>
      
      <Animated.View style={{ opacity: loaderOpacity }}>
        <ActivityIndicator color={COLORS.PRIMARY} size="small" style={styles.redirectLoader} />
      </Animated.View>
    </View>
  );
};

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
    
    // Sequential animations for screen elements
    Animated.sequence([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Handle transition to success state
  const transitionToSuccess = () => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle input focus
  const handleFocus = (field: string) => {
    setFocusedInput(field);
  };

  // Handle input blur
  const handleBlur = () => {
    setFocusedInput(null);
  };

  // Get input status styling
  const getInputStyles = () => {
    const isActive = focusedInput === 'phone';
    let iconColor = isActive ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY;
    let borderColor = isActive ? COLORS.PRIMARY : COLORS.INPUT_BORDER;
    let backgroundColor = isActive ? 'rgba(11, 227, 125, 0.05)' : COLORS.INPUT_BG;
    
    return {
      borderColor,
      backgroundColor,
      iconColor
    };
  };

  const validateForm = () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    setIsLoading(true);
    
    try {
      if (DEV_MODE) {
        // Simulate API call in development mode
        console.log(`[DEV MODE] Simulating password reset request for: ${phone}`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate successful response
        setIsLoading(false);
        setResetSent(true);
        transitionToSuccess();
      } else {
        // Make a real API call to request password reset
        const response = await authService.resetPasswordRequest({
          identifier: phone
        });
        
        setIsLoading(false);
        setResetSent(true);
        transitionToSuccess();
      }
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to process your request. Please try again.';
      
      // Handle different error types
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          if (error.response.status === 404) {
            console.log(`API endpoint not found. This is likely because the backend server is not running.`);
            errorMessage = 'This feature is not available in the demo. In a production environment, a password reset code would be sent.';
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
      }
      
      setIsLoading(false);
      
      if (DEV_MODE) {
        // In development mode, show the error but don't block the flow
        console.warn(`[DEV MODE] Error would normally show: ${errorMessage}`);
        Alert.alert('Development Mode', 'Continuing with simulated successful password reset request.');
        
        // Proceed with simulated success flow
        setResetSent(true);
        transitionToSuccess();
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  // Handle completion of success animation
  const handleSuccessComplete = () => {
    navigation.navigate('ResetPassword', { token: 'mock-token-123456' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />
      
      <LinearGradient
        colors={COLORS.GRADIENT.DARK}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundGradient}
      >
        {/* Decorative background elements */}
        <DecorativeElements />
        
        <SafeAreaView style={styles.safeArea}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <ScrollView 
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View 
                style={[
                  styles.headerContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <ForgotPasswordIcon />
                <Text style={styles.logoText}>Invezto</Text>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.cardContainer,
                  {
                    opacity: cardAnim,
                    transform: [
                      { translateY: cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        })
                      },
                      { scale: cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1]
                        })
                      }
                    ]
                  }
                ]}
              >
                {/* Form content */}
                <Animated.View 
                  style={[
                    styles.formContent,
                    { opacity: contentOpacity }
                  ]}
                  pointerEvents={resetSent ? 'none' : 'auto'}
                >
                  <View style={styles.formTitleContainer}>
                    <Animated.Text 
                      style={[
                        styles.title,
                        {
                          opacity: titleAnim,
                          transform: [
                            { translateY: titleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                              })
                            }
                          ]
                        }
                      ]}
                    >
                      Forgot Password
                    </Animated.Text>
                    
                    <Animated.Text 
                      style={[
                        styles.subtitle,
                        {
                          opacity: subtitleAnim,
                          transform: [
                            { translateY: subtitleAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                              })
                            }
                          ]
                        }
                      ]}
                    >
                      Enter your phone number and we'll send you a code to reset your password
                    </Animated.Text>
                  </View>
                  
                  <Animated.View 
                    style={[
                      styles.formContainer,
                      {
                        opacity: formAnim,
                        transform: [
                          { translateY: formAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0]
                            })
                          }
                        ]
                      }
                    ]}
                  >
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        { 
                          borderColor: getInputStyles().borderColor,
                          backgroundColor: getInputStyles().backgroundColor
                        }
                      ]}
                    >
                      <Ionicons 
                        name="call-outline" 
                        size={moderateScale(20)} 
                        color={getInputStyles().iconColor} 
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="+234 000 000 0000"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        placeholderTextColor={COLORS.TEXT_MUTED}
                        editable={!isLoading}
                        onFocus={() => handleFocus('phone')}
                        onBlur={handleBlur}
                      />
                      {phone.length > 0 && (
                        <TouchableOpacity 
                          style={styles.clearButton}
                          onPress={() => setPhone('')}
                        >
                          <View style={styles.clearButtonInner}>
                            <Ionicons name="close" size={16} color={COLORS.TEXT_SECONDARY} />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <Animated.View
                      style={[
                        styles.buttonContainer,
                        {
                          opacity: buttonAnim,
                          transform: [
                            { translateY: buttonAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                              })
                            },
                            { scale: buttonScale }
                          ]
                        }
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.resetButton,
                          isLoading && styles.buttonDisabled
                        ]}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={COLORS.GRADIENT.PRIMARY}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.resetButtonGradient}
                        >
                          {isLoading ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator color={COLORS.BACKGROUND} size="small" />
                              <Text style={styles.loadingText}>Sending...</Text>
                            </View>
                          ) : (
                            <>
                              <Text style={styles.resetButtonText}>SEND RESET CODE</Text>
                              <View style={styles.buttonIconContainer}>
                                <Ionicons name="paper-plane" size={18} color={COLORS.BACKGROUND} />
                              </View>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>
                  </Animated.View>
                </Animated.View>
                
                {/* Success state */}
                <Animated.View 
                  style={[
                    styles.successWrapper,
                    { opacity: successOpacity }
                  ]}
                  pointerEvents={resetSent ? 'auto' : 'none'}
                >
                  {resetSent && (
                    <AnimatedSuccess onComplete={handleSuccessComplete} />
                  )}
                </Animated.View>
              </Animated.View>
              
              <View style={styles.footer}>
                <Text style={styles.footerText}>Remember your password?</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginLinkContainer}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
              
              {/* Bottom spacing to ensure content is not cut off */}
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  backgroundGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(40),
    paddingHorizontal: scale(24),
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  logoText: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginTop: verticalScale(12),
    letterSpacing: 0.5,
  },
  cardContainer: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: scale(24),
    padding: scale(24),
    width: '100%',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  formContent: {
    alignItems: 'center',
  },
  successWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Form title
  formTitleContainer: {
    marginBottom: verticalScale(24),
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    lineHeight: moderateScale(20),
    textAlign: 'center',
    marginHorizontal: scale(10),
  },
  // Decorative elements
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: scale(200),
    backgroundColor: COLORS.PRIMARY,
  },
  decorCircle1: {
    width: scale(180),
    height: scale(180),
    top: -scale(60),
    left: -scale(60),
    opacity: 0.03,
  },
  decorCircle2: {
    width: scale(140),
    height: scale(140),
    bottom: '30%',
    right: -scale(40),
    opacity: 0.04,
  },
  decorCircle3: {
    width: scale(220),
    height: scale(220),
    bottom: -scale(100),
    left: -scale(80),
    opacity: 0.02,
  },
  decorativeLine1: {
    position: 'absolute',
    width: width * 1.5,
    height: 1,
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.03,
    top: height * 0.3,
    transform: [{ rotate: '15deg' }],
  },
  decorativeLine2: {
    position: 'absolute',
    width: width * 1.5,
    height: 1,
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.03,
    top: height * 0.6,
    transform: [{ rotate: '-15deg' }],
  },
  // Forgot password icon
  forgotIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(24),
    overflow: 'hidden',
    marginBottom: verticalScale(24),
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  forgotIconGradient: {
    width: '100%',
    height: '100%',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotIconInner: {
    width: '100%',
    height: '100%',
    borderRadius: scale(22),
    backgroundColor: COLORS.CARD_BG,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(11, 227, 125, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Form container
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(12),
    borderWidth: 1.5,
    height: verticalScale(54),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(24),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: moderateScale(16),
    paddingVertical: 0,
  },
  clearButton: {
    padding: scale(4),
  },
  clearButtonInner: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Button styles
  buttonContainer: {
    marginBottom: verticalScale(8),
  },
  resetButton: {
    borderRadius: scale(14),
    height: verticalScale(54),
    overflow: 'hidden',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  resetButtonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: moderateScale(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(10),
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.BACKGROUND,
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginLeft: scale(8),
  },
  // Footer styles
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  footerText: {
    fontSize: moderateScale(15),
    color: COLORS.TEXT_SECONDARY,
  },
  loginLinkContainer: {
    marginLeft: scale(6),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(8),
  },
  loginLink: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  bottomSpacing: {
    height: verticalScale(30),
  },
  // Success styles
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: scale(10),
  },
  successIconWrapper: {
    position: 'relative',
    marginBottom: verticalScale(24),
    width: scale(80),
    height: scale(80),
    alignItems: 'center',
    justifyContent: 'center',
  },
  successRing: {
    position: 'absolute',
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 3,
    borderColor: COLORS.SUCCESS,
  },
  successIconContainer: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    overflow: 'hidden',
    shadowColor: COLORS.SUCCESS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  successText: {
    fontSize: moderateScale(15),
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: verticalScale(24),
  },
  redirectLoader: {
    marginTop: verticalScale(16),
  }
});

export default ForgotPasswordScreen;