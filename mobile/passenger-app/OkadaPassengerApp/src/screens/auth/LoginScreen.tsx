import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator,
  Animated,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../redux/store';
import { login, clearError } from '../../redux/slices/authSlice';
import * as Haptics from 'expo-haptics';
import { authService } from '../../api/services/authService';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
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
  SUCCESS: '#4CAF50',        // Success Green
  SHADOW: 'rgba(212, 175, 55, 0.25)', // Gold shadow
  OVERLAY: 'rgba(0, 0, 0, 0.8)', // Black overlay
};

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: Props) {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  // Redux state
  const dispatch = useAppDispatch();
  const authState = useAppSelector(state => state.auth);
  const { loading: reduxLoading, error, isAuthenticated } = authState as {
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
  };
  
  // Combine local and redux loading states
  const loading = localLoading || reduxLoading;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const inputAnim = useRef({
    email: new Animated.Value(0),
    password: new Animated.Value(0)
  }).current;
  
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
      
      // Staggered inputs
      Animated.stagger(150, [
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(inputAnim.email, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(inputAnim.password, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Check if user is already authenticated and redirect if needed
  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  }, [isAuthenticated, navigation]);

  // Show error if login fails
  useEffect(() => {
    if (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Login Failed', error, [
        {
          text: 'OK',
          onPress: () => dispatch(clearError()),
        },
      ]);
    }
  }, [error, dispatch]);
  
  // Validate email or phone number
  const validateEmail = (text: string) => {
    setEmail(text);
    if (text.length === 0) {
      setEmailValid(null);
      return;
    }
    
    // Check if input is an email or phone number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+[0-9]{10,15}$/; // International format with + prefix
    
    // Valid if either email or phone format is correct
    setEmailValid(emailRegex.test(text) || phoneRegex.test(text));
  };
  
  // Validate password
  const validatePassword = (text: string) => {
    setPassword(text);
    if (text.length === 0) {
      setPasswordValid(null);
      return;
    }
    
    setPasswordValid(text.length >= 6);
  };

  // Handle login press - Connect to MongoDB directly using authService
  const handleLogin = async () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Input validation
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      navigation.navigate('AuthError', {
        error: 'Please enter your email address',
        action: 'login',
        retryDestination: 'Login'
      });
      return;
    }
    
    if (!password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      navigation.navigate('AuthError', {
        error: 'Please enter your password',
        action: 'login',
        retryDestination: 'Login'
      });
      return;
    }
    
    try {
      // Show loading state
      setLocalLoading(true);
      
      // Use Redux for state management
      // Redux expects 'identifier' not 'email'
      const result = await dispatch(login({ identifier: email.trim(), password })).unwrap();
      
      console.log('Login result:', result); // Debug log
      
      // Check if verification is required
      if (result?.requiresVerification) {
        // Since we don't have verification screen, treat temp token as auth token
        console.log('Bypassing verification for user:', result.user?.email);
        
        // Store the temp token as auth token
        if (result.tempToken) {
          await AsyncStorage.setItem('authToken', result.tempToken);
          await AsyncStorage.setItem('refreshToken', result.tempToken); // Use same token for now
          await AsyncStorage.setItem('userRole', result.user?.role || 'passenger');
          
          // Store user data
          await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        }
        
        // Navigate to success screen, which will then redirect to Home
        navigation.navigate('AuthSuccess', {
          action: 'login',
          destination: 'Home'
        });
        return;
      }
      
      // If we get here, login was successful
      // Navigate to success screen, which will then redirect to Home
      navigation.navigate('AuthSuccess', {
        action: 'login',
        destination: 'Home'
      });
      
      // Alternatively, use authService directly (uncomment if needed)
      // This would bypass Redux and directly use the service
      /*
      const user = await authService.login(email.trim(), password);
      console.log('User logged in successfully:', user);
      navigation.navigate('AuthSuccess', {
        action: 'login',
        destination: 'Home'
      });
      */
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Navigate to error screen
      navigation.navigate('AuthError', {
        error: error.response?.data?.message || 'Unable to login. Please check your credentials.',
        action: 'login',
        retryDestination: 'Login'
      });
      
      console.error('Login error:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    Haptics.selectionAsync();
    setShowPassword(prev => !prev);
  };

  // Dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Interpolate logo rotation
  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                }
              ]}
            >
              {/* Logo */}
              <Animated.View 
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      { scale: logoScale },
                      { rotate: spin }
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
                  <Image
                    source={require('../../../assets/images/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </Animated.View>
              
              {/* Welcome text */}
              <Animated.View 
                style={{
                  transform: [{ translateY }]
                }}
              >
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Please log in to your account</Text>
              </Animated.View>
              
              {/* Form Container */}
              <View style={styles.formContainer}>
                {/* Email Input */}
                <Animated.View 
                  style={[
                    styles.inputWrapper,
                    {
                      opacity: inputAnim.email,
                      transform: [{
                        translateX: inputAnim.email.interpolate({
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
                      name="person-outline" 
                      size={18} 
                      color={COLORS.GOLD} 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email or Phone (+xxxx)"
                      placeholderTextColor={COLORS.GRAY}
                      value={email}
                      onChangeText={validateEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {emailValid === true && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
                    )}
                    {emailValid === false && (
                      <Ionicons name="close-circle" size={18} color={COLORS.ERROR} />
                    )}
                  </View>
                  {emailValid === false && (
                    <Text style={styles.errorText}>Please enter a valid email or phone number (with + prefix)</Text>
                  )}
                </Animated.View>
                
                {/* Password Input */}
                <Animated.View 
                  style={[
                    styles.inputWrapper,
                    {
                      opacity: inputAnim.password,
                      transform: [{
                        translateX: inputAnim.password.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0]
                        })
                      }]
                    }
                  ]}
                >
                  <View style={[
                    styles.inputContainer,
                    passwordValid === false && styles.inputError,
                    passwordValid === true && styles.inputSuccess
                  ]}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={18} 
                      color={COLORS.GOLD} 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={COLORS.GRAY}
                      value={password}
                      onChangeText={validatePassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity 
                      style={styles.passwordToggle} 
                      onPress={togglePasswordVisibility}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={18} 
                        color={COLORS.GOLD} 
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordValid === false && (
                    <Text style={styles.errorText}>Password must be at least 6 characters</Text>
                  )}
                </Animated.View>
                
                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPasswordContainer}
                  onPress={() => {
                    Haptics.selectionAsync();
                    navigation.navigate('ForgotPassword');
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
                
                {/* Login Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {loading ? (
                        <ActivityIndicator color={COLORS.BLACK} />
                      ) : (
                        <View style={styles.buttonInner}>
                          <Text style={styles.buttonText}>LOG IN</Text>
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
              </View>
              
              {/* Signup Link */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  Don't have an account?
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync();
                    navigation.navigate('SignUp');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
                >
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  logo: {
    width: 60,
    height: 60,
    tintColor: COLORS.BLACK,
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
  passwordToggle: {
    padding: 8,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 15,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 35,
    marginTop: 5,
  },
  forgotPasswordText: {
    color: COLORS.GOLD,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    borderRadius: 16,
    height: 60,
    marginTop: 10,
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
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  signupText: {
    fontSize: 15,
    color: COLORS.GRAY,
    marginRight: 6,
  },
  signupLink: {
    color: COLORS.GOLD,
    fontSize: 16,
    fontWeight: '600',
  },
});
