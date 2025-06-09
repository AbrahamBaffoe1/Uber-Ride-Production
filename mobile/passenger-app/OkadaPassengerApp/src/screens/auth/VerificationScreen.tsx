import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
  Dimensions,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { verifyService } from '../../api/services/verify.service';
import { authService } from '../../api/services/auth.service';
import { useAppDispatch } from '../../redux/store';
import { login } from '../../redux/slices/authSlice';

type VerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Verification'
>;

type VerificationScreenRouteProp = RouteProp<
  RootStackParamList,
  'Verification'
>;

interface Props {
  navigation: VerificationScreenNavigationProp;
  route: VerificationScreenRouteProp;
}

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Color palette (matching LoginScreen)
const COLORS = {
  PRIMARY: '#00E676',
  PRIMARY_DARK: '#00C853',
  PRIMARY_LIGHT: '#69F0AE',
  SECONDARY: '#0A3B3B',
  SECONDARY_LIGHT: '#134F4F',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_LIGHT: 'rgba(255, 255, 255, 0.8)',
  GRAY: 'rgba(255, 255, 255, 0.6)',
  GRAY_DARK: 'rgba(255, 255, 255, 0.4)',
  TRANSPARENT: 'transparent',
  OVERLAY_LIGHT: 'rgba(0, 0, 0, 0.2)',
  OVERLAY_DARK: 'rgba(0, 0, 0, 0.3)',
  SUCCESS: '#28a745',
  ERROR: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#17a2b8',
  SHADOW: 'rgba(0, 0, 0, 0.2)'
};

const VerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  // Get params from navigation
  const { email, phone, verificationMethod } = route.params;

  // State for verification code
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Format the contact information for display
  const maskedContact = verificationMethod === 'email'
    ? maskEmail(email)
    : maskPhone(phone);

  // Start countdown for resend code
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Start entrance animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load saved registration data
    loadRegistrationData();
  }, []);

  // Load registration data from AsyncStorage
  const loadRegistrationData = async () => {
    try {
      const data = await AsyncStorage.getItem('@pending_registration');
      if (data) {
        setRegistrationData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading registration data:', error);
    }
  };

  // Handle code input change
  const handleCodeChange = (text: string, index: number) => {
    // Force text to be numeric and only one character
    const sanitizedText = text.replace(/[^0-9]/g, '').substring(0, 1);
    
    // Update the code array
    const newCode = [...code];
    newCode[index] = sanitizedText;
    setCode(newCode);
    
    // If we have input and it's not the last input, move to next field
    if (sanitizedText.length === 1 && index < 5) {
      inputs.current[index + 1]?.focus();
    }
    
    // If all fields are filled, check if auto-submit should happen
    if (newCode.every(digit => digit !== '') && index === 5) {
      Keyboard.dismiss();
      // You could trigger verification automatically here if desired
    }
  };

  // Handle backspace key press
  const handleKeyPress = (e: any, index: number) => {
    // If backspace is pressed and current field is empty, move to previous field
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // Verify code
  const verifyCode = async () => {
    // Check if code is complete
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Incomplete Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      let response;
      
      if (verificationMethod === 'email') {
        response = await verifyService.verifyEmailCode({
          code: fullCode,
          email: email
        });
      } else {
        response = await verifyService.verifySMSCode({
          code: fullCode,
          phoneNumber: phone
        });
      }
      
      if (response.status === 'success') {
        // Get registration data from AsyncStorage
        if (registrationData && registrationData.verificationToken) {
          // Complete registration
          const userData = {
            ...registrationData,
            verificationCode: fullCode
          };
          
          const registerResponse = await verifyService.completeRegistration(userData);
          
          if (registerResponse.status === 'success') {
            // Clear stored registration data
            await AsyncStorage.removeItem('@pending_registration');
            
            // Show success message
            Alert.alert(
              'Verification Successful',
              'Your account has been verified successfully.',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    // Auto-login the user
                    if (userData.email && userData.password) {
                      handleLogin(userData.email, userData.password);
                    } else {
                      // Navigate to login if we don't have credentials
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    }
                  }
                }
              ]
            );
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            throw new Error('Failed to complete registration');
          }
        } else {
          // Navigate to success screen or login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert(
        'Verification Failed',
        error instanceof Error ? error.message : 'Please check your verification code and try again.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-login after successful verification
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      if (response.status === 'success') {
        // Navigate to Home screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // If auto-login fails, navigate to login screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Auto-login error:', error);
      // Navigate to login on error
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  // Resend verification code
  const resendCode = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      let response;
      
      if (verificationMethod === 'email') {
        response = await verifyService.resendVerificationCode(email);
      } else {
        response = await verifyService.resendVerificationSMS(phone);
      }
      
      if (response.status === 'success') {
        // Reset the timer
        setTimeLeft(60);
        setCanResend(false);
        
        // Update stored registration data with new token if needed
        if (registrationData) {
          const updatedData = {
            ...registrationData,
            verificationToken: response.data?.verificationToken
          };
          await AsyncStorage.setItem('@pending_registration', JSON.stringify(updatedData));
          setRegistrationData(updatedData);
        }
        
        Alert.alert('Code Sent', `A new verification code has been sent to your ${verificationMethod}.`);
        
        // Reset code input fields
        setCode(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(response.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert(
        'Resend Failed',
        error instanceof Error ? error.message : 'Unable to resend verification code. Please try again later.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mask email for privacy
  function maskEmail(email: string): string {
    if (!email) return '';
    
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const name = parts[0];
    const domain = parts[1];
    
    let maskedName = '';
    if (name.length <= 2) {
      maskedName = name[0] + '*';
    } else {
      maskedName = name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    }
    
    return `${maskedName}@${domain}`;
  }

  // Mask phone for privacy
  function maskPhone(phone: string): string {
    if (!phone) return '';
    
    // Keep the country code and last 2 digits visible
    const phoneDigits = phone.replace(/\D/g, '');
    const visiblePart = phoneDigits.substring(phoneDigits.length - 2);
    const countryCodeEnd = Math.min(phoneDigits.length - 6, 3); // Show up to first 3 digits (country code)
    const countryCode = phoneDigits.substring(0, countryCodeEnd);
    
    const maskedPart = '*'.repeat(phoneDigits.length - countryCodeEnd - 2);
    
    return `${countryCode}${maskedPart}${visiblePart}`;
  }

  // Dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <ImageBackground
      style={styles.backgroundImage}
      source={require('../../../assets/images/auth-background.webp')}
      resizeMode="cover"
    >
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      <LinearGradient
        colors={['rgba(10, 59, 59, 0.7)', 'rgba(10, 59, 59, 0.9)']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <Animated.View 
              style={[
                styles.container,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY }]
                }
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Feather name="arrow-left" size={24} color={COLORS.WHITE} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verification</Text>
                <View style={{ width: 24 }} />
              </View>
              
              {/* Content */}
              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={[COLORS.PRIMARY_LIGHT, COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
                    style={styles.iconBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Feather 
                      name={verificationMethod === 'email' ? 'mail' : 'smartphone'} 
                      size={30} 
                      color={COLORS.WHITE} 
                    />
                  </LinearGradient>
                </View>
                
                <Text style={styles.title}>Verify Your {verificationMethod === 'email' ? 'Email' : 'Phone'}</Text>
                
                <Text style={styles.message}>
                  We've sent a 6-digit verification code to{'\n'}
                  <Text style={styles.highlight}>{maskedContact}</Text>
                </Text>
                
                {/* Verification code input */}
                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <View key={index} style={styles.codeInputWrapper}>
                      <TextInput
                        ref={(input) => { inputs.current[index] = input; }}
                        style={styles.codeInput}
                        value={digit}
                        onChangeText={(text) => handleCodeChange(text, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        selectionColor={COLORS.PRIMARY}
                        accessible={true}
                        accessibilityLabel={`Digit ${index + 1} of verification code`}
                      />
                    </View>
                  ))}
                </View>
                
                {/* Timer and resend option */}
                <View style={styles.timerContainer}>
                  {!canResend ? (
                    <Text style={styles.timerText}>
                      Resend code in <Text style={styles.timerDigits}>{formatTime(timeLeft)}</Text>
                    </Text>
                  ) : (
                    <TouchableOpacity 
                      onPress={resendCode}
                      disabled={isLoading}
                      style={styles.resendButton}
                    >
                      <Text style={styles.resendText}>Resend Code</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Verify button */}
                <TouchableOpacity
                  style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
                  onPress={verifyCode}
                  disabled={isLoading || code.some(digit => digit === '')}
                >
                  <LinearGradient
                    colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientButton}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={COLORS.WHITE} size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Verify</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                
                {/* Help text */}
                <TouchableOpacity 
                  style={styles.helpContainer}
                  onPress={() => {
                    Alert.alert(
                      'Need Help?',
                      'If you did not receive a verification code, please check your spam folder or try resending the code.',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Text style={styles.helpText}>
                    Didn't receive the code? <Text style={styles.helpLink}>Need help?</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: COLORS.SECONDARY, // Dark teal fallback
  },
  safeArea: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.OVERLAY_LIGHT,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconBackground: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.GRAY_LIGHT,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  highlight: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  codeInputWrapper: {
    width: 46,
    height: 60,
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  codeInput: {
    width: '100%',
    height: '100%',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  timerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  timerText: {
    color: COLORS.GRAY_LIGHT,
    fontSize: 14,
  },
  timerDigits: {
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  resendButton: {
    padding: 10,
  },
  resendText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontSize: 16,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: COLORS.PRIMARY_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.BLACK,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  helpContainer: {
    marginTop: 20,
  },
  helpText: {
    color: COLORS.GRAY,
    fontSize: 14,
  },
  helpLink: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});

export default VerificationScreen;
