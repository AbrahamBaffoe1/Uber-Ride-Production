import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type PhoneVerificationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PhoneVerification'>;
type PhoneVerificationScreenRouteProp = RouteProp<RootStackParamList, 'PhoneVerification'>;

const { width } = Dimensions.get('window');

const PhoneVerificationScreen: React.FC = () => {
  const navigation = useNavigation<PhoneVerificationScreenNavigationProp>();
  const route = useRoute<PhoneVerificationScreenRouteProp>();
  const { phone } = route.params || { phone: '' };
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start countdown timer
    const countdown = setInterval(() => {
      setTimeLeft(time => {
        if (time <= 1) {
          clearInterval(countdown);
          setCanResend(true);
          return 0;
        }
        return time - 1;
      });
    }, 1000);
    
    return () => clearInterval(countdown);
  }, []);
  
  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste event
      const otpArray = text.split('').slice(0, 4);
      const newOtp = [...otp];
      
      for (let i = 0; i < otpArray.length; i++) {
        if (index + i < 4) {
          newOtp[index + i] = otpArray[i];
        }
      }
      
      setOtp(newOtp);
      
      // Focus the next input or last input
      const nextEmptyIndex = newOtp.findIndex((val, i) => i > index && !val);
      if (nextEmptyIndex !== -1) {
        inputRefs.current[nextEmptyIndex]?.focus();
      } else {
        Keyboard.dismiss();
      }
      
      return;
    }
    
    // Single character input
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
    // Move to next input if filled
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handleResendCode = () => {
    if (!canResend) return;
    
    // Reset timer and otp
    setTimeLeft(60);
    setCanResend(false);
    setOtp(['', '', '', '']);
    
    // Focus first input
    inputRefs.current[0]?.focus();
  };
  
  const handleVerify = () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) return;
    
    setIsLoading(true);
    
    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      
      // For demo, any code works except "1111"
      if (otpCode === '1111') {
        // Shake animation for invalid code
        Animated.sequence([
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
        
        // Clear inputs
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        navigation.navigate('RiderInfo');
      }
    }, 1500);
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#13171D" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <View style={styles.shieldContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#7AC231" />
          </View>
          
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            Please enter your email address to reset your password.
          </Text>
          
          <Animated.View 
            style={[
              styles.otpContainer,
              { transform: [{ translateX: shakeAnimation }] }
            ]}
          >
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.otpInputContainer}>
                <TextInput
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={styles.otpInput}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={otp[index]}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                />
              </View>
            ))}
          </Animated.View>
          
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {canResend ? "Didn't receive your email?" : `Resend code in ${formatTimeLeft(timeLeft)}`}
            </Text>
            <TouchableOpacity 
              onPress={handleResendCode} 
              disabled={!canResend}
              style={styles.resendButton}
            >
              <Text style={[
                styles.resendText,
                !canResend && styles.resendTextDisabled
              ]}>
                Resend
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.verifyButton,
              otp.join('').length !== 4 && styles.buttonDisabled
            ]}
            onPress={handleVerify}
            disabled={isLoading || otp.join('').length !== 4}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            Don't remember your email?
            <Text style={styles.helpLink}> Contact us at help@finpal.ai</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13171D',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  shieldContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: '80%',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  otpInputContainer: {
    width: 65,
    height: 65,
    backgroundColor: '#1C2128',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    width: '100%',
    height: '100%',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 14,
    color: '#999999',
  },
  resendButton: {
    marginLeft: 8,
    padding: 4,
  },
  resendText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7AC231',
  },
  resendTextDisabled: {
    color: 'rgba(122, 194, 49, 0.5)',
  },
  verifyButton: {
    backgroundColor: '#7AC231',
    borderRadius: 12,
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(122, 194, 49, 0.5)',
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  helpText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  helpLink: {
    color: '#7AC231',
  },
});

export default PhoneVerificationScreen;