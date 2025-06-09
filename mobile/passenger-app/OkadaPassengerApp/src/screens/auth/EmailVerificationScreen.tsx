import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView,
  Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { verifyService } from '../../api/services/verify.service';

type EmailVerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EmailVerification'
>;

type EmailVerificationScreenRouteProp = RouteProp<
  RootStackParamList,
  'EmailVerification'
>;

interface Props {
  navigation: EmailVerificationScreenNavigationProp;
  route: EmailVerificationScreenRouteProp;
}

const { width, height } = Dimensions.get('window');

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email, verificationToken } = route.params;
  
  // State
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [inputFocused, setInputFocused] = useState<number | null>(0);
  
  // Refs for input fields
  const inputRefs = useRef<Array<TextInput | null>>(Array(6).fill(null));
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  
  // Start entrance animations when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  // Countdown timer for resend code button
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeft]);

  // Handle code input change
  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    if (!/^[0-9]*$/.test(text)) return;
    
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    
    // Auto focus next input
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setInputFocused(index + 1);
    }
    
    // Handle paste of full code
    if (text.length > 1) {
      // Distribute characters across inputs
      const textArray = text.slice(0, 6).split('');
      const newCode = [...code];
      
      textArray.forEach((char, i) => {
        if (i + index < 6) {
          newCode[i + index] = char;
        }
      });
      
      setCode(newCode);
      
      // Focus last field if we filled all inputs
      if (index + textArray.length >= 6) {
        inputRefs.current[5]?.focus();
        setInputFocused(5);
      } else {
        inputRefs.current[index + textArray.length]?.focus();
        setInputFocused(index + textArray.length);
      }
    }
  };

  // Handle key press for backspace
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && code[index] === '') {
      inputRefs.current[index - 1]?.focus();
      setInputFocused(index - 1);
      
      // Clear previous input too
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    if (timeLeft > 0) return;
    
    setIsResending(true);
    try {
      const response = await verifyService.sendVerificationCode(email);
      if (response.status === 'success') {
        setTimeLeft(60);
        Alert.alert(
          'Code Sent!',
          `A new verification code has been sent to ${email}.`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter all 6 digits of your verification code.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await verifyService.verifyEmail(email, verificationCode);
      
      if (response.status === 'success') {
        // Show success animation and navigate to login
        Alert.alert(
          'Verification Successful!',
          'Your email has been verified successfully. You can now log in to your account.',
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('Verification Failed', 'The code you entered is incorrect. Please try again.');
      }
    } catch (error) {
      Alert.alert(
        'Verification Error',
        'There was a problem verifying your email. Please try again or request a new code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#13171D', '#262F3D']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <BlurView intensity={30} style={styles.backButtonBlur}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>
          
          {/* Main content */}
          <Animated.View 
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateY }]
              }
            ]}
          >
            <BlurView intensity={10} style={styles.blurBackground}>
              <View style={styles.content}>
                {/* Header */}
                <View style={styles.headerContainer}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={36} color="#7AC231" />
                  </View>
                  <Text style={styles.title}>Verify your email</Text>
                  <Text style={styles.subtitle}>
                    We've sent a 6-digit verification code to{'\n'}
                    <Text style={styles.emailText}>{email}</Text>
                  </Text>
                </View>
                
                {/* Code input fields */}
                <View style={styles.codeContainer}>
                  {code.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      style={[
                        styles.codeInput,
                        inputFocused === index && styles.codeInputFocused
                      ]}
                      value={digit}
                      onChangeText={text => handleCodeChange(text, index)}
                      onKeyPress={e => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      autoFocus={index === 0}
                      onFocus={() => setInputFocused(index)}
                      onBlur={() => setInputFocused(null)}
                    />
                  ))}
                </View>
                
                {/* Verify button */}
                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={handleVerifyCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify Email</Text>
                  )}
                </TouchableOpacity>
                
                {/* Resend code */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    Didn't receive the code? 
                  </Text>
                  {timeLeft > 0 ? (
                    <Text style={styles.timerText}>
                      Resend code in {timeLeft}s
                    </Text>
                  ) : (
                    <TouchableOpacity 
                      onPress={handleResendCode}
                      disabled={isResending}
                    >
                      {isResending ? (
                        <ActivityIndicator size="small" color="#7AC231" />
                      ) : (
                        <Text style={styles.resendButton}>Resend Code</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13171D',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentContainer: {
    width: width * 0.9,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 100,
  },
  blurBackground: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(28, 33, 40, 0.7)',
  },
  content: {
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(122, 194, 49, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#999999',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  codeInputFocused: {
    borderColor: '#7AC231',
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
  },
  verifyButton: {
    backgroundColor: '#7AC231',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 8,
  },
  resendButton: {
    fontSize: 15,
    color: '#7AC231',
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default EmailVerificationScreen;
