import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  FlatList,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, AuthStackParamList } from '../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { authService } from '../../api/services/authService';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive scaling functions
const scale = (size: number): number => (width / 375) * size;
const verticalScale = (size: number): number => (height / 812) * size;
const moderateScale = (size: number, factor: number = 0.5): number => size + (scale(size) - size) * factor;

// Refined color palette with sophisticated gradient options
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
  GRADIENT: {
    PRIMARY: ['#0BE37D', '#00A55A'],
    DARK: ['#050B12', '#0A1727'],
    CARD: ['#162230', '#0E1820'],
    INPUT_FOCUS: ['rgba(11, 227, 125, 0.1)', 'rgba(11, 227, 125, 0.05)'],
    BUTTON_PRESSED: ['#00A55A', '#008B4B'],
  }
};

// Type for navigation
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const scrollViewRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(30)).current;
  
  // Country options
  const countryOptions = useMemo(() => [
    { label: 'Nigeria', flag: '🇳🇬', value: 'nigeria', currency: 'NGN', symbol: '₦' },
    { label: 'Ghana', flag: '🇬🇭', value: 'ghana', currency: 'GHS', symbol: '₵' },
    { label: 'Kenya', flag: '🇰🇪', value: 'kenya', currency: 'KES', symbol: 'KSh' },
    { label: 'Uganda', flag: '🇺🇬', value: 'uganda', currency: 'UGX', symbol: 'USh' },
    { label: 'Senegal', flag: '🇸🇳', value: 'senegal', currency: 'XOF', symbol: 'CFA' },
    { label: 'South Africa', flag: '🇿🇦', value: 'southAfrica', currency: 'ZAR', symbol: 'R' },
  ], []);
  
  // State management
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [useBiometrics, setUseBiometrics] = useState<boolean>(false);
  
  // Entry animations
  useEffect(() => {
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
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(formSlide, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          })
        ])
      ])
    ]).start();
  }, []);
  
  // Login handler
  const handleLogin = useCallback(async () => {
    const identifier = loginMethod === 'email' ? email : phone;
    
    if (!identifier.trim()) {
      Alert.alert('Error', `Please enter your ${loginMethod}`);
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('Login attempt with:', {
        loginMethod,
        email: loginMethod === 'email' ? email : 'N/A',
        phone: loginMethod === 'phone' ? phone : 'N/A',
        passwordLength: password.length
      });
      
      // Use real authentication with MongoDB
      if (loginMethod === 'email') {
        console.log('Calling authService.login with email:', email);
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        
        console.log('Trimmed credentials:', {
          email: trimmedEmail,
          passwordLength: trimmedPassword.length
        });
        
        await authService.login(trimmedEmail, trimmedPassword);
      } else {
        // For phone login, we would need to first request OTP and verify it
        // Here we assume phone login requires email format for the MongoDB implementation
        Alert.alert('Phone Login', 'Please use email login for now as phone login requires OTP verification');
        setIsLoading(false);
        return;
      }
      
      // Check if user is verified
      const user = await authService.getCurrentUser();
      setIsLoading(false);
      
      if (user && (!user.isEmailVerified && !user.isPhoneVerified)) {
        // User is not verified, show verification prompt
        Alert.alert(
          'Account Not Verified',
          'Your account needs to be verified before you can continue.',
          [
            {
              text: 'Verify Now',
              onPress: () => {
                // Navigate to verification screen with user ID
                navigation.navigate('Auth', { 
                  screen: 'Verification',
                  params: { userId: user._id, email: user.email, phoneNumber: user.phoneNumber }
                });
              },
            },
            {
              text: 'Later',
              style: 'cancel',
            },
          ]
        );
      } else {
        // User is verified, proceed to main screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      }
    } catch (error: any) {
      setIsLoading(false);
      
      // Check if error is about verification
      if (error.message && error.message.includes('verified')) {
        Alert.alert(
          'Verification Required',
          'Your account needs to be verified. Would you like to verify now?',
          [
            {
              text: 'Verify Now',
              onPress: async () => {
                try {
                  // Since we don't have userId in the error, we'll use the email to identify the user
                  const userEmail = email;
                  const userPhone = phone;
                  
                  // First, try to get the current user to get the userId
                  let userId = '';
                  try {
                    const currentUser = await authService.getCurrentUser();
                    if (currentUser) {
                      userId = currentUser._id;
                    }
                  } catch (userError) {
                    console.error('Error getting current user:', userError);
                  }
                  
                  // Navigate to verification screen
                  navigation.navigate('Auth', { 
                    screen: 'Verification',
                    params: { userId, email: userEmail, phoneNumber: userPhone }
                  });
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              },
            },
            {
              text: 'Later',
              style: 'cancel',
            },
          ]
        );
      } else {
        // Regular login error
        Alert.alert(
          'Login Failed', 
          error?.message || 'Invalid credentials or network error. Please try again.'
        );
      }
    }
  }, [email, phone, password, navigation, loginMethod]);

  // Handle input focus
  const handleFocus = useCallback((field: string) => {
    setFocusedInput(field);
  }, []);

  // Handle input blur
  const handleBlur = useCallback(() => {
    setFocusedInput(null);
  }, []);

  // Toggle login method
  const toggleLoginMethod = useCallback(() => {
    setLoginMethod(prev => prev === 'email' ? 'phone' : 'email');
  }, []);

  // Render input for email or phone
  const renderIdentifierInput = useCallback(() => {
    const isActive = focusedInput === 'identifier';
    let iconColor = isActive ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY;
    let borderColor = isActive ? COLORS.PRIMARY : COLORS.INPUT_BORDER;
    let backgroundColor = isActive ? 'rgba(11, 227, 125, 0.05)' : COLORS.INPUT_BG;

    if (loginMethod === 'email') {
      return (
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View 
            style={[
              styles.inputContainer, 
              { 
                borderColor,
                backgroundColor
              }
            ]}
          >
            <Ionicons 
              name="mail-outline" 
              size={moderateScale(20)} 
              color={iconColor} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              placeholderTextColor={COLORS.TEXT_MUTED}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => handleFocus('identifier')}
              onBlur={handleBlur}
            />
            {email.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setEmail('')}
              >
                <View style={styles.clearButtonInner}>
                  <Ionicons name="close" size={16} color={COLORS.TEXT_SECONDARY} />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View 
            style={[
              styles.inputContainer, 
              { 
                borderColor,
                backgroundColor
              }
            ]}
          >
            <Ionicons 
              name="call-outline" 
              size={moderateScale(20)} 
              color={iconColor} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="+234 000 000 0000"
              placeholderTextColor={COLORS.TEXT_MUTED}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              onFocus={() => handleFocus('identifier')}
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
        </View>
      );
    }
  }, [loginMethod, email, phone, focusedInput, handleFocus, handleBlur]);

  // Render password input
  const renderPasswordInput = useCallback(() => {
    const isActive = focusedInput === 'password';
    let iconColor = isActive ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY;
    let borderColor = isActive ? COLORS.PRIMARY : COLORS.INPUT_BORDER;
    let backgroundColor = isActive ? 'rgba(11, 227, 125, 0.05)' : COLORS.INPUT_BG;

    return (
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>Password</Text>
        <View 
          style={[
            styles.inputContainer, 
            { 
              borderColor,
              backgroundColor
            }
          ]}
        >
          <Ionicons 
            name="lock-closed-outline" 
            size={moderateScale(20)} 
            color={iconColor} 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={COLORS.TEXT_MUTED}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            onFocus={() => handleFocus('password')}
            onBlur={handleBlur}
          />
          <TouchableOpacity 
            style={styles.passwordToggle} 
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={moderateScale(20)} 
              color={iconColor} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [password, showPassword, focusedInput, handleFocus, handleBlur]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.BACKGROUND} />
      
              <LinearGradient
                colors={['#050B12', '#0A1727']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.backgroundGradient}
              >
        {/* Background Decorative Elements */}
        <View style={styles.decorativeContainer}>
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeLine1} />
          <View style={styles.decorativeLine2} />
        </View>
        
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidView}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Header */}
              <Animated.View 
                style={[
                  styles.headerContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <View style={styles.logoContainer}>
                  <LinearGradient
                    colors={['#0BE37D', '#00A55A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoBackground}
                  >
                    <View style={styles.logoInner}>
                      <Image
                        source={{ uri: 'https://placekitten.com/200/200' }}
                        style={styles.logo}
                        resizeMode="cover"
                      />
                    </View>
                  </LinearGradient>
                </View>
                <Text style={styles.welcomeText}>Welcome to Invezto</Text>
                <Text style={styles.subtitleText}>The smart way to grow your money</Text>
              </Animated.View>

              {/* Login Form Card */}
              <Animated.View 
                style={[
                  styles.formCard,
                  {
                    opacity: formOpacity,
                    transform: [{ translateY: formSlide }]
                  }
                ]}
              >
                {/* Country & Language Selection */}
                <View style={styles.topControls}>
                  <TouchableOpacity 
                    style={styles.countryButton}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={styles.countryName}>{selectedCountry.label}</Text>
                    <Ionicons name="chevron-down" size={16} color={COLORS.TEXT_SECONDARY} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.languageButton}>
                    <Ionicons name="language-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                    <Text style={styles.languageText}>EN</Text>
                  </TouchableOpacity>
                </View>

                {/* Form Title */}
                <View style={styles.formTitleContainer}>
                  <Text style={styles.formTitle}>Sign In</Text>
                  <Text style={styles.formSubtitle}>Please enter your details to continue</Text>
                </View>

                {/* Toggle between email and phone */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton, 
                      loginMethod === 'email' && styles.toggleButtonActive
                    ]}
                    onPress={() => setLoginMethod('email')}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={[
                        styles.toggleText,
                        loginMethod === 'email' && styles.toggleTextActive
                      ]}
                    >
                      Email
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.toggleButton, 
                      loginMethod === 'phone' && styles.toggleButtonActive
                    ]}
                    onPress={() => setLoginMethod('phone')}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={[
                        styles.toggleText,
                        loginMethod === 'phone' && styles.toggleTextActive
                      ]}
                    >
                      Phone
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Email/Phone Input */}
                {renderIdentifierInput()}

                {/* Password Input */}
                {renderPasswordInput()}

                <View style={styles.actionsRow}>
                  {/* Remember Me Checkbox */}
                  <TouchableOpacity 
                    style={styles.rememberContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkboxContainer, rememberMe && styles.checkboxActive]}>
                      {rememberMe && <Ionicons name="checkmark" size={16} color={COLORS.BACKGROUND} />}
                    </View>
                    <Text style={styles.rememberText}>Remember me</Text>
                  </TouchableOpacity>

                  {/* Forgot Password */}
                  <TouchableOpacity
                    style={styles.forgotPasswordContainer}
                    onPress={() => navigation.navigate('Auth', { screen: 'ForgotPassword' })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton, 
                    isLoading && styles.loginButtonDisabled
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#0BE37D', '#00A55A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color={COLORS.BACKGROUND} size="small" />
                        <Text style={styles.loadingText}>Signing in...</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Sign In</Text>
                        <View style={styles.loginButtonIconContainer}>
                          <Ionicons name="arrow-forward" size={moderateScale(16)} color={COLORS.BACKGROUND} />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Biometric Login Option */}
                <TouchableOpacity 
                  style={styles.biometricButton}
                  onPress={() => setUseBiometrics(!useBiometrics)}
                >
                  <View style={styles.biometricIconContainer}>
                    <Ionicons name="finger-print-outline" size={24} color={COLORS.PRIMARY} />
                  </View>
                  <Text style={styles.biometricText}>Sign in with Touch ID</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Sign Up Link */}
              <Animated.View 
                style={[
                  styles.signupContainer,
                  { opacity: formOpacity }
                ]}
              >
                <Text style={styles.signupText}>Don't have an account?</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
                  hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
                  style={styles.signupLinkContainer}
                >
                  <Text style={styles.signupLink}>Sign up</Text>
                </TouchableOpacity>
              </Animated.View>
              
              {/* Alternative Design Options Section */}
              <View style={styles.designOptionsSection}>
                <Text style={styles.designOptionsTitle}>Design Options</Text>
                <Text style={styles.designOptionsSubtitle}>Scroll to explore more styles</Text>
                
                {/* Design Option 1: Minimalist */}
                <View style={styles.designOptionCard}>
                  <Text style={styles.designOptionName}>Minimalist</Text>
                  <View style={styles.designPreview}>
                    <View style={styles.minimalistPreview}>
                      <View style={styles.minimalistHeader}>
                        <View style={styles.minimalistLogo} />
                      </View>
                      <View style={styles.minimalistForm}>
                        <View style={styles.minimalistInput} />
                        <View style={styles.minimalistInput} />
                        <View style={styles.minimalistButton} />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.designDescription}>
                    Clean, simple design with minimal elements and plenty of white space.
                  </Text>
                </View>
                
                {/* Design Option 2: Glassmorphism */}
                <View style={styles.designOptionCard}>
                  <Text style={styles.designOptionName}>Glassmorphism</Text>
                  <View style={styles.designPreview}>
                    <LinearGradient
                      colors={['#0A2442', '#051428']}
                      style={styles.glassmorphismPreview}
                    >
                      <View style={styles.glassmorphismBlur}>
                        <View style={styles.glassmorphismContent}>
                          <View style={styles.glassmorphismHeader} />
                          <View style={styles.glassmorphismInput} />
                          <View style={styles.glassmorphismInput} />
                          <View style={styles.glassmorphismButton} />
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                  <Text style={styles.designDescription}>
                    Modern translucent effect with subtle blur and gradient backgrounds.
                  </Text>
                </View>
                
                {/* Design Option 3: Neumorphic */}
                <View style={styles.designOptionCard}>
                  <Text style={styles.designOptionName}>Neumorphic</Text>
                  <View style={styles.designPreview}>
                    <View style={styles.neumorphicPreview}>
                      <View style={styles.neumorphicLogo} />
                      <View style={styles.neumorphicForm}>
                        <View style={styles.neumorphicInput} />
                        <View style={styles.neumorphicInput} />
                        <View style={styles.neumorphicButton} />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.designDescription}>
                    Soft UI with shadow effects that give a raised, tactile appearance.
                  </Text>
                </View>
                
                {/* Design Option 4: Animated */}
                <View style={styles.designOptionCard}>
                  <Text style={styles.designOptionName}>Animated Transitions</Text>
                  <View style={styles.designPreview}>
                    <View style={styles.animatedPreview}>
                      <View style={styles.animatedContent}>
                        <View style={styles.animationIndicator1} />
                        <View style={styles.animationIndicator2} />
                        <View style={styles.animationIndicator3} />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.designDescription}>
                    Smooth animations between screen elements for a dynamic experience.
                  </Text>
                </View>
                
                {/* Bottom Spacing */}
                <View style={styles.bottomSpacing} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
        
        {/* Country Picker Modal */}
        <Modal
          visible={showCountryPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <BlurView intensity={50} style={styles.modalOverlay} tint="dark">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your Country</Text>
                <TouchableOpacity 
                  onPress={() => setShowCountryPicker(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={countryOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryItem,
                      selectedCountry.value === item.value && styles.selectedCountryItem
                    ]}
                    onPress={() => {
                      setSelectedCountry(item);
                      setShowCountryPicker(false);
                    }}
                  >
                    <View style={styles.countryItemContent}>
                      <Text style={styles.countryItemFlag}>{item.flag}</Text>
                      <Text style={styles.countryItemName}>{item.label}</Text>
                    </View>
                    {selectedCountry.value === item.value && (
                      <View style={styles.countryItemCheckmark}>
                        <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.countryListContent}
              />
            </View>
          </BlurView>
        </Modal>
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
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  // Decorative Elements
  decorativeCircle1: {
    position: 'absolute',
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.03,
    top: -scale(60),
    right: -scale(60),
  },
  decorativeCircle2: {
    position: 'absolute',
    width: scale(400),
    height: scale(400),
    borderRadius: scale(200),
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.02,
    bottom: -scale(150),
    left: -scale(100),
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
  safeArea: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(40),
    paddingHorizontal: scale(24),
  },
  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(30),
  },
  logoContainer: {
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: verticalScale(20),
  },
  logoBackground: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(24),
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: scale(22),
    backgroundColor: COLORS.CARD_BG,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '85%',
    height: '85%',
    borderRadius: scale(18),
  },
  welcomeText: {
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(8),
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: moderateScale(16),
    color: COLORS.TEXT_SECONDARY,
    letterSpacing: 0.3,
  },
  // Form Card
  formCard: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: scale(24),
    padding: scale(24),
    paddingTop: scale(20),
    marginBottom: verticalScale(24),
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Top Controls (Country & Language)
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(7),
  },
  countryFlag: {
    fontSize: moderateScale(16),
    marginRight: scale(6),
  },
  countryName: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    marginRight: scale(4),
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: scale(7),
  },
  languageText: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    marginLeft: scale(4),
  },
  // Form Title
  formTitleContainer: {
    marginBottom: verticalScale(20),
  },
  formTitle: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(4),
  },
  formSubtitle: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
  },
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: verticalScale(20),
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: scale(12),
    padding: scale(4),
    height: verticalScale(48),
  },
  toggleButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: scale(8),
  },
  toggleButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  toggleText: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    fontSize: moderateScale(15),
  },
  toggleTextActive: {
    color: COLORS.BACKGROUND,
    fontWeight: '700',
  },
  // Input fields
  inputWrapper: {
    marginBottom: verticalScale(16),
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
  passwordToggle: {
    padding: scale(4),
  },
  // Actions Row (Remember Me & Forgot Password)
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(24),
    marginTop: verticalScale(4),
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(6),
    borderWidth: 1.5,
    borderColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(8),
  },
  checkboxActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  rememberText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: moderateScale(14),
  },
  // Forgot password
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: COLORS.PRIMARY,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  // Login button
  loginButton: {
    borderRadius: scale(14),
    height: verticalScale(54),
    overflow: 'hidden',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: verticalScale(16),
  },
  loginButtonGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: moderateScale(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginButtonIconContainer: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(10),
  },
  // Biometric login
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
  },
  biometricIconContainer: {
    marginRight: scale(10),
  },
  biometricText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: moderateScale(15),
  },
  // Sign up link
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(40),
  },
  signupText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: moderateScale(15),
  },
  signupLinkContainer: {
    marginLeft: scale(6),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(8),
  },
  signupLink: {
    color: COLORS.PRIMARY,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.CARD_BG,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.INPUT_BORDER,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  modalCloseButton: {
    padding: scale(4),
  },
  countryListContent: {
    paddingBottom: verticalScale(30),
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.INPUT_BORDER,
  },
  countryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryItemFlag: {
    fontSize: moderateScale(20),
    marginRight: scale(12),
  },
  countryItemName: {
    fontSize: moderateScale(16),
    color: COLORS.TEXT_PRIMARY,
  },
  countryItemCheckmark: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: 'rgba(11, 227, 125, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCountryItem: {
    backgroundColor: 'rgba(11, 227, 125, 0.05)',
  },
  // Design Options Section
  designOptionsSection: {
    marginTop: verticalScale(20),
  },
  designOptionsTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  designOptionsSubtitle: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    marginBottom: verticalScale(24),
    textAlign: 'center',
  },
  designOptionCard: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: scale(16),
    padding: scale(20),
    marginBottom: verticalScale(20),
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  designOptionName: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: verticalScale(12),
  },
  designPreview: {
    height: verticalScale(180),
    marginBottom: verticalScale(12),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  designDescription: {
    fontSize: moderateScale(14),
    color: COLORS.TEXT_SECONDARY,
    lineHeight: moderateScale(20),
  },
  // Design Preview Styles - Minimalist
  minimalistPreview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: scale(16),
    justifyContent: 'center',
  },
  minimalistHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  minimalistLogo: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: COLORS.PRIMARY,
  },
  minimalistForm: {
    width: '100%',
  },
  minimalistInput: {
    height: verticalScale(40),
    backgroundColor: '#F5F5F5',
    borderRadius: scale(8),
    marginBottom: verticalScale(12),
  },
  minimalistButton: {
    height: verticalScale(40),
    backgroundColor: COLORS.PRIMARY,
    borderRadius: scale(8),
    marginTop: verticalScale(10),
  },
  // Design Preview Styles - Glassmorphism
  glassmorphismPreview: {
    flex: 1,
    padding: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassmorphismBlur: {
    width: '90%',
    height: '80%',
    borderRadius: scale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    padding: scale(16),
    justifyContent: 'center',
  },
  glassmorphismContent: {
    width: '100%',
  },
  glassmorphismHeader: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: verticalScale(16),
  },
  glassmorphismInput: {
    height: verticalScale(36),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: scale(8),
    marginBottom: verticalScale(10),
  },
  glassmorphismButton: {
    height: verticalScale(36),
    backgroundColor: COLORS.PRIMARY,
    borderRadius: scale(8),
    marginTop: verticalScale(8),
  },
  // Design Preview Styles - Neumorphic
  neumorphicPreview: {
    flex: 1,
    backgroundColor: '#E0E5EC',
    padding: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  neumorphicLogo: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: COLORS.PRIMARY,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: verticalScale(20),
  },
  neumorphicForm: {
    width: '90%',
  },
  neumorphicInput: {
    height: verticalScale(40),
    backgroundColor: '#E0E5EC',
    borderRadius: scale(8),
    marginBottom: verticalScale(12),
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  neumorphicButton: {
    height: verticalScale(40),
    backgroundColor: COLORS.PRIMARY,
    borderRadius: scale(8),
    marginTop: verticalScale(8),
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Design Preview Styles - Animated
  animatedPreview: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedContent: {
    position: 'relative',
    width: scale(100),
    height: scale(100),
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationIndicator1: {
    position: 'absolute',
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    opacity: 0.3,
  },
  animationIndicator2: {
    position: 'absolute',
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    borderWidth: 2,
    borderColor: COLORS.PRIMARY,
    opacity: 0.6,
  },
  animationIndicator3: {
    position: 'absolute',
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.9,
  },
  bottomSpacing: {
    height: verticalScale(40),
  },
});

export default LoginScreen;
