import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList, RootStackParamList } from '../navigation/types';
import { authService } from '../../api/services/authService';
import { otpService } from '../../api/services/otpService';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size: number): number => (width / 375) * size;
const verticalScale = (size: number): number => (height / 812) * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

// Color palette
const COLORS = {
  PRIMARY: '#0BE37D',
  PRIMARY_DARK: '#00A55A',
  BACKGROUND: '#050B12',
  CARD_BG: '#111C26',
  INPUT_BG: '#162230',
  INPUT_BORDER: '#253241',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A7B5C4',
  TEXT_MUTED: '#5F7082',
  ERROR: '#FF4E6C',
};

type VerificationScreenRouteProp = RouteProp<AuthStackParamList, 'Verification'>;
type VerificationScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const VerificationScreen: React.FC = () => {
  const navigation = useNavigation<VerificationScreenNavigationProp>();
  const route = useRoute<VerificationScreenRouteProp>();
  const { userId, email, phoneNumber } = route.params;
  
  // State
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>(email ? 'email' : 'phone');
  const [maskedContact, setMaskedContact] = useState<string>('');
  
  // Refs for OTP inputs
  const inputRefs = useRef<Array<TextInput | null>>(Array(6).fill(null));
  
  // Format and mask contact information
  useEffect(() => {
    if (contactMethod === 'email' && email) {
      setMaskedContact(maskEmail(email));
    } else if (contactMethod === 'phone' && phoneNumber) {
      setMaskedContact(maskPhoneNumber(phoneNumber));
    }
  }, [contactMethod, email, phoneNumber]);
  
  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);
  
  // Mask email for display
  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return email;
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.length <= 3
      ? username.charAt(0) + '***'
      : username.charAt(0) + '***' + username.charAt(username.length - 1);
    
    return `${maskedUsername}@${domain}`;
  };
  
  // Mask phone number for display
  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return phone;
    
    // Remove non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Mask middle digits
    if (cleaned.length > 4) {
      const start = cleaned.slice(0, 3);
      const end = cleaned.slice(-2);
      const masked = '*'.repeat(cleaned.length - 5);
      return `${start}${masked}${end}`;
    }
    
    return phone;
  };
  
  // Handle OTP input change
  const handleOtpChange = (text: string, index: number) => {
    // Only allow digits
    if (!/^\d*$/.test(text)) return;
    
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all digits are entered
    if (text && index === 5 && newOtp.every(digit => digit)) {
      handleVerify();
    }
  };
  
  // Handle backspace key press
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      // Focus previous input on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  // Request a new OTP
  const handleResendOtp = async () => {
    if (resendLoading || countdown > 0) return;
    
    try {
      setResendLoading(true);
      
      if (contactMethod === 'email' && email) {
        await otpService.requestEmailOTP({ 
          type: 'verification',
          email
        });
      } else if (contactMethod === 'phone' && phoneNumber) {
        await otpService.requestSMSOTP({ 
          type: 'verification',
          phoneNumber
        });
      } else {
        throw new Error('No valid contact method available');
      }
      
      // Reset countdown
      setCountdown(60);
      
      Alert.alert(
        'OTP Sent',
        `A new verification code has been sent to your ${contactMethod === 'email' ? 'email' : 'phone'}.`
      );
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      Alert.alert(
        'Error',
        error.message || `Failed to send verification code. Please try again.`
      );
    } finally {
      setResendLoading(false);
    }
  };
  
  // Verify OTP
  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Call verification API
      await authService.verifyOTP(userId, otpCode, 'verification');
      
      // Verification successful
      setIsLoading(false);
      
      Alert.alert(
        'Verification Successful',
        'Your account has been verified successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to main screen or login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      setIsLoading(false);
      console.error('Verification error:', error);
      
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid verification code. Please try again.'
      );
    }
  };
  
  // Toggle contact method
  const toggleContactMethod = () => {
    if ((contactMethod === 'email' && phoneNumber) || (contactMethod === 'phone' && email)) {
      setContactMethod(prev => prev === 'email' ? 'phone' : 'email');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify Your Account</Text>
          </View>
          
          {/* Main Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
                style={styles.iconBackground}
              >
                <Ionicons name="shield-checkmark" size={40} color={COLORS.BACKGROUND} />
              </LinearGradient>
            </View>
            
            <Text style={styles.title}>Verification Code</Text>
            
            <Text style={styles.description}>
              We've sent a verification code to your {contactMethod}:
            </Text>
            
            <View style={styles.contactContainer}>
              <Text style={styles.contactText}>{maskedContact}</Text>
              {email && phoneNumber && (
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={toggleContactMethod}
                >
                  <Text style={styles.toggleText}>
                    Use {contactMethod === 'email' ? 'Phone' : 'Email'} Instead
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                  ]}
                  value={digit}
                  onChangeText={text => handleOtpChange(text, index)}
                  onKeyPress={e => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            
            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!otp.every(digit => digit) || isLoading) && styles.verifyButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!otp.every(digit => digit) || isLoading}
            >
              <LinearGradient
                colors={[COLORS.PRIMARY, COLORS.PRIMARY_DARK]}
                style={styles.verifyButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.BACKGROUND} size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  Resend in {countdown}s
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendLoading}
                  style={styles.resendButton}
                >
                  {resendLoading ? (
                    <ActivityIndicator color={COLORS.PRIMARY} size="small" />
                  ) : (
                    <Text style={styles.resendButtonText}>Resend Code</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(10),
  },
  backButton: {
    padding: scale(8),
    marginRight: scale(10),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(20),
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: verticalScale(24),
  },
  iconBackground: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  description: {
    fontSize: moderateScale(16),
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  contactContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  contactText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: COLORS.PRIMARY,
    marginBottom: verticalScale(8),
  },
  toggleButton: {
    padding: scale(8),
  },
  toggleText: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    textDecorationLine: 'underline',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: verticalScale(32),
  },
  otpInput: {
    width: scale(48),
    height: scale(56),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: COLORS.INPUT_BORDER,
    backgroundColor: COLORS.INPUT_BG,
    color: COLORS.TEXT_PRIMARY,
    fontSize: moderateScale(20),
    fontWeight: '700',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(11, 227, 125, 0.1)',
  },
  verifyButton: {
    width: '100%',
    height: verticalScale(56),
    borderRadius: scale(12),
    overflow: 'hidden',
    marginBottom: verticalScale(24),
  },
  verifyButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: COLORS.BACKGROUND,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    marginBottom: verticalScale(8),
  },
  countdownText: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_MUTED,
  },
  resendButton: {
    padding: scale(8),
  },
  resendButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
});

export default VerificationScreen;
