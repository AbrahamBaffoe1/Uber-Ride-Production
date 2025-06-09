// src/screens/auth/PhoneVerificationScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';
import { otpService } from '../../api/services/otpService';
import VerificationCompleteModal from '../../components/modals/VerificationCompleteModal';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Enhanced color palette
const COLORS = {
  PRIMARY: '#F9A826',      // Orange/Yellow
  PRIMARY_LIGHT: '#FFCB66', // Light Orange/Yellow
  PRIMARY_DARK: '#E08D12', // Darker Orange for pressed states
  BACKGROUND: '#FFFFFF',   // White
  TEXT_PRIMARY: '#333333', // Dark Gray
  TEXT_SECONDARY: '#999999', // Medium Gray
  INPUT_BORDER: '#EEEEEE', // Light Gray
  INPUT_BG: '#F9F9F9',     // Off-White background
  INPUT_ACTIVE: '#FCF5E8', // Light yellow when active
  ERROR: '#FF5252',        // Error Red
  SUCCESS: '#4CAF50',      // Success Green
  SHADOW: 'rgba(249, 168, 38, 0.15)', // Shadow color with primary color tint
};

type PhoneVerificationScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'PhoneVerification'
>;

type PhoneVerificationScreenRouteProp = RouteProp<
  AuthStackParamList,
  'PhoneVerification'
>;

const PhoneVerificationScreen = () => {
  const navigation = useNavigation<PhoneVerificationScreenNavigationProp>();
  const route = useRoute<PhoneVerificationScreenRouteProp>();
  const { phone, userId } = route.params as { phone: string; userId: string };

  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [activeInput, setActiveInput] = useState(-1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [otpDeliveryStatus, setOtpDeliveryStatus] = useState<'delivered' | 'pending' | 'failed'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerAnimation = useRef(new Animated.Value(1)).current;
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Check delivery status when component mounts - assumes OTP was already sent from registration
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        // Log the user ID for debugging
        console.log('Checking initial OTP status for user:', userId);
          
        // Check if there's an OTP available
        try {
          const otpStatus = await otpService.getOTPStatus(userId, 'verification');
          
          if (otpStatus) {
            console.log('Found OTP status:', otpStatus);
            // If we found an OTP and it has a message ID, track it
            if (otpStatus.messageId) {
              setMessageId(otpStatus.messageId);
              startDeliveryStatusCheck(otpStatus.messageId);
            } else {
              // Without a message ID, we can only assume it was sent
              setOtpDeliveryStatus('delivered');
            }
          } else {
            // If no OTP found in system for regular users, set status to failed
            setOtpDeliveryStatus('failed');
            setErrorMessage("No verification code found. Please request a new one.");
          }
        } catch (dbError) {
          console.error('Database error checking OTP status:', dbError);
          
          // Production environment - we must not proceed with verification if database has errors
          setOtpDeliveryStatus('failed');
          setErrorMessage("Database connection error. Please try again later or contact support.");
        }
      } catch (error) {
        console.error('Error in verification flow:', error);
        
        // Production environment - treat all errors as failures that need addressing
        setOtpDeliveryStatus('failed');
        setErrorMessage("Verification system error. Please try again or contact support.");
      }
    };
      
    // Run the status check
    checkInitialStatus();
    
    // Clean up interval on component unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [userId]);
  
  // Function to start checking delivery status periodically
  const startDeliveryStatusCheck = (msgId: string) => {
    // First do an immediate check
    checkDeliveryStatus(msgId);
    
    // Then set up periodic checks
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }
    
    statusCheckInterval.current = setInterval(() => {
      checkDeliveryStatus(msgId);
    }, 3000); // Check every 3 seconds
    
    // Stop checking after 30 seconds regardless
    setTimeout(() => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        
        // If still pending after 30 seconds, mark as likely failed
        setOtpDeliveryStatus(currentStatus => {
          if (currentStatus === 'pending') {
            setErrorMessage("The verification code may not have been delivered. Try requesting a new one.");
            return 'failed';
          }
          return currentStatus;
        });
      }
    }, 30000);
  };
  
  // Function to check the delivery status of an OTP
  const checkDeliveryStatus = async (msgId: string) => {
    try {
      const statusResponse = await otpService.checkMessageDeliveryStatus(msgId);
      
      if (statusResponse.success) {
        if (statusResponse.status === 'delivered') {
          setOtpDeliveryStatus('delivered');
          // Once confirmed delivered, stop checking
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }
        } else if (statusResponse.status === 'failed' || statusResponse.status === 'undelivered') {
          setOtpDeliveryStatus('failed');
          setErrorMessage(`Delivery failed: ${statusResponse.message || 'SMS could not be delivered'}`);
          
          // Stop checking if definitively failed
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }
        }
        // For 'pending' or 'sent' status, keep checking
      } else {
        // If check fails but no clear indication, keep trying
        console.log('Failed to check delivery status:', statusResponse.message);
      }
    } catch (error) {
      console.error('Error checking delivery status:', error);
      // Don't update UI on check error - keep trying
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      
      // Animate the countdown progress
      Animated.timing(timerAnimation, {
        toValue: countdown / 60,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, timerAnimation]);

  const handleOtpChange = (text: string, index: number) => {
    const newOtpCode = [...otpCode];
    newOtpCode[index] = text;
    setOtpCode(newOtpCode);

    // Auto-focus to next input after entering a digit
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsLoading(true);
      setOtpDeliveryStatus('pending');
      setErrorMessage(null);
      
      // Clear any existing status check
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
      
      // Log information for debugging
      console.log('Resending OTP with params:', {
        type: 'verification',
        channel: 'sms',
        phoneNumber: phone,
        userId: userId
      });
      
      // Request a new OTP
      const otpResponse = await otpService.resendOTP({
        type: 'verification',
        channel: 'sms',
        phoneNumber: phone,
        userId: userId
      });

      if (!otpResponse.success) {
        console.error('Failed to resend OTP:', otpResponse.message);
        setOtpDeliveryStatus('failed');
        throw new Error(otpResponse.message);
      }
      
      console.log('OTP resend successful:', otpResponse);
      
      // If we got a messageId, store it and start checking status
      if (otpResponse.messageId) {
        setMessageId(otpResponse.messageId);
        startDeliveryStatusCheck(otpResponse.messageId);
      } else {
        // If no messageId but success response, assume it's delivered
        setOtpDeliveryStatus('delivered');
      }
      
      // Reset the countdown and verification state
      setCountdown(60);
      timerAnimation.setValue(1);
      setVerificationAttempts(0);
      setOtpCode(['', '', '', '', '', '']);
      
      setIsLoading(false);
      Alert.alert('OTP Sent', `A new verification code has been sent to ${phone}`);
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error.message || 'Failed to resend verification code');
      Alert.alert(
        'Resend Failed', 
        error.message || 'Failed to resend verification code'
      );
    }
  };

  const handleVerify = async () => {
    const otpString = otpCode.join('');
    
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Increment verification attempts
      setVerificationAttempts(prev => prev + 1);
      
      console.log('Verifying OTP with params:', {
        userId: userId,
        code: otpString,
        type: 'verification'
      });
      
      // Verify the OTP with the backend
      const verifyResponse = await otpService.verifyOTP({
        userId: userId,
        code: otpString,
        type: 'verification'
      });
      
      console.log('OTP verification response:', verifyResponse);
      
      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || 'Invalid verification code');
      }
      
      setIsLoading(false);
      
      // Show success modal instead of navigating immediately
      setShowSuccessModal(true);
    } catch (error: any) {
      setIsLoading(false);
      
      console.error('OTP verification error:', error);
      
      // Set error message for display in the UI
      setErrorMessage(error.message || 'Invalid code or network error');
      
      // Different message based on attempts
      let alertMessage = error.message || 'Invalid code or network error. Please try again.';
      
      if (verificationAttempts >= 3) {
        alertMessage += ' You may want to request a new code if you keep having issues.';
      }
      
      Alert.alert(
        'Verification Failed', 
        alertMessage
      );
      
      // For persistent issues, suggest resending a new code
      if (verificationAttempts >= 2 && countdown <= 0) {
        setTimeout(() => {
          Alert.alert(
            'Verification Problems',
            'Would you like to request a new verification code?',
            [
              {
                text: 'No, try again',
                style: 'cancel'
              },
              {
                text: 'Yes, send new code',
                onPress: handleResendOtp
              }
            ]
          );
        }, 1000);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidView}
        >
          <View style={styles.content}>
            {/* Top Blob */}
            <View style={styles.topBlobContainer}>
              <View style={styles.topBlob} />
            </View>
            
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>

            <View style={styles.cardContainer}>
              {/* Verification illustration */}
              <View style={styles.illustrationContainer}>
                <Image
                  source={{ uri: 'https://placekitten.com/300/300' }} // Replace with actual verification illustration
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.headerContainer}>
                <Text style={styles.title}>Verification</Text>
                <Text style={styles.subtitle}>
                  We've sent a verification code to{'\n'}
                  <Text style={styles.phoneText}>{phone}</Text>
                </Text>
                
                {/* OTP Delivery Status Indicator */}
                <View style={styles.deliveryStatusContainer}>
                  <Text style={[
                    styles.deliveryStatusText,
                    otpDeliveryStatus === 'failed' && styles.errorText
                  ]}>
                    {otpDeliveryStatus === 'delivered' ? 
                      'Verification code sent successfully' : 
                      otpDeliveryStatus === 'pending' ? 
                        'Sending verification code...' : 
                        'Failed to send verification code'}
                  </Text>
                  
                  {otpDeliveryStatus === 'delivered' && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} style={styles.deliveryStatusIcon} />
                  )}
                  
                  {otpDeliveryStatus === 'pending' && (
                    <ActivityIndicator size="small" color={COLORS.PRIMARY} style={styles.deliveryStatusIcon} />
                  )}
                  
                  {otpDeliveryStatus === 'failed' && (
                    <Ionicons name="alert-circle" size={16} color={COLORS.ERROR} style={styles.deliveryStatusIcon} />
                  )}
                </View>
                
                {/* Error message display */}
                {errorMessage && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                )}
              </View>

              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.otpInputWrapper,
                      activeInput === index && styles.otpInputWrapperActive,
                      otpCode[index] && styles.otpInputWrapperFilled
                    ]}
                  >
                    <TextInput
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={styles.otpInput}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={otpCode[index]}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      onFocus={() => setActiveInput(index)}
                      onBlur={() => setActiveInput(-1)}
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.BACKGROUND} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>VERIFY CODE</Text>
                    <Ionicons name="shield-checkmark" size={18} color={COLORS.BACKGROUND} style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>

              {countdown > 0 ? (
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>Resend code in</Text>
                  <View style={styles.countdownContainer}>
                    <Text style={styles.countdownText}>{countdown}s</Text>
                    <View style={styles.progressContainer}>
                      <Animated.View 
                        style={[
                          styles.progressBar,
                          {
                            width: timerAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            })
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code?</Text>
                  <TouchableOpacity 
                    onPress={handleResendOtp}
                    style={styles.resendButton}
                    disabled={isLoading}
                  >
                    <Text style={styles.resendLink}>Resend</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.helpContainer}>
                <TouchableOpacity style={styles.helpButton}>
                  <Ionicons name="help-circle-outline" size={20} color={COLORS.TEXT_SECONDARY} />
                  <Text style={styles.helpText}>Need help?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Verification Success Modal */}
      <VerificationCompleteModal
        visible={showSuccessModal}
        onContinue={() => {
          setShowSuccessModal(false);
          // Navigate to RiderInfo screen after successful verification
          navigation.navigate('RiderInfo');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  topBlobContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    overflow: 'hidden',
    zIndex: 1,
  },
  topBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 30,
    padding: 24,
    marginTop: 60,
    width: '100%',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  illustration: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 22,
    textAlign: 'center',
  },
  phoneText: {
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  deliveryStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(249, 249, 249, 0.5)',
    borderRadius: 12,
  },
  deliveryStatusText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginRight: 5,
  },
  deliveryStatusIcon: {
    marginLeft: 4,
  },
  errorText: {
    marginTop: 8,
    color: COLORS.ERROR,
    fontSize: 12,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    width: '100%',
    paddingHorizontal: 10,
  },
  otpInputWrapper: {
    width: 45,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.INPUT_BG,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.INPUT_BORDER,
  },
  otpInputWrapperActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.INPUT_ACTIVE,
  },
  otpInputWrapperFilled: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.INPUT_ACTIVE,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    height: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: COLORS.PRIMARY_LIGHT,
    opacity: 0.7,
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
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 8,
  },
  countdownContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  countdownText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  progressContainer: {
    width: 100,
    height: 4,
    backgroundColor: COLORS.INPUT_BORDER,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 5,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
  },
  resendLink: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: 'bold',
  },
  helpContainer: {
    marginTop: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  helpText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    marginLeft: 5,
  },
});

export default PhoneVerificationScreen;
