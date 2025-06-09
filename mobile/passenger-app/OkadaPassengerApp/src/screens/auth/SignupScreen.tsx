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
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Image
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NavigationProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../../api/services/authService';

// Enhanced Premium Color Palette - Gold, Black and White
const COLORS = {
  GOLD: '#E0B34D',           // Enhanced Gold
  GOLD_LIGHT: '#F9E7AF',     // Light Gold
  GOLD_DARK: '#C49A3D',      // Dark Gold
  BLACK: '#000000',          // Pure Black
  BLACK_LIGHT: '#1A1A1A',    // Light Black for backgrounds
  BLACK_DARK: '#0D0D0D',     // Darker Black
  WHITE: '#FFFFFF',          // Pure White
  WHITE_OFF: '#F9F9F9',      // Slight off-white
  GRAY_LIGHT: '#E0E0E0',     // Light Gray
  GRAY: '#999999',           // Medium Gray
  GRAY_DARK: '#666666',      // Dark Gray
  BACKGROUND: '#0A0A0A',     // Almost Black background
  ERROR: '#FF5252',          // Error Red
  SUCCESS: '#4CAF50',        // Success Green
  SHADOW: 'rgba(224, 179, 77, 0.35)', // Gold shadow with more opacity
  OVERLAY: 'rgba(0, 0, 0, 0.85)', // Black overlay
  INPUT_ACTIVE: '#282417',   // Dark gold-tinted background when active
};

// Step data with updated icons
const stepData: Array<{icon: React.ComponentProps<typeof FontAwesome5>['name'], title: string}> = [
  { icon: 'envelope', title: 'Contact' },
  { icon: 'user-alt', title: 'Personal' },
  { icon: 'lock', title: 'Security' },
  { icon: 'check-circle', title: 'Finish' },
];

const { width, height } = Dimensions.get('window');

// Define props for SignupScreen
interface SignupScreenProps {
  navigation: NavigationProp<any>;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  // Refs for the inputs
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(40)).current;
  const stepTransition = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Form state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
  const [firstNameValid, setFirstNameValid] = useState<boolean | null>(null);
  const [lastNameValid, setLastNameValid] = useState<boolean | null>(null);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const [confirmPasswordValid, setConfirmPasswordValid] = useState<boolean | null>(null);
  
  // Start entrance animations
  useEffect(() => {
    // Sequence of animations
    Animated.sequence([
      // Fade in and rise up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      
      // Logo animation
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Set initial progress
    animateProgress(1);
  }, []);
  
  // Update progress when step changes
  useEffect(() => {
    animateProgress(currentStep);
    
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [currentStep]);
  
  // Animate progress bar
  const animateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: step / totalSteps,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };
  
  // Validate email
  const validateEmail = (text: string) => {
    setEmail(text);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailValid(text.length === 0 ? null : emailRegex.test(text));
  };
  
  // Validate phone
  const validatePhone = (text: string) => {
    setPhone(text);
    const cleanedPhone = text.replace(/\D/g, '');
    setPhoneValid(text.length === 0 ? null : cleanedPhone.length >= 10);
  };
  
  // Validate names
  const validateName = (text: string, type: 'first' | 'last') => {
    if (type === 'first') {
      setFirstName(text);
      setFirstNameValid(text.length === 0 ? null : text.trim().length >= 2);
    } else {
      setLastName(text);
      setLastNameValid(text.length === 0 ? null : text.trim().length >= 2);
    }
  };
  
  // Validate password
  const validatePassword = (text: string) => {
    setPassword(text);
    
    if (text.length === 0) {
      setPasswordValid(null);
      return;
    }
    
    const hasLength = text.length >= 8;
    const hasUpper = /[A-Z]/.test(text);
    const hasLower = /[a-z]/.test(text);
    const hasNumber = /\d/.test(text);
    
    setPasswordValid(hasLength && hasUpper && hasLower && hasNumber);
    
    // Validate confirm password also if it has a value
    if (confirmPassword) {
      setConfirmPasswordValid(confirmPassword === text);
    }
  };
  
  // Validate confirm password
  const validateConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    setConfirmPasswordValid(text.length === 0 ? null : text === password);
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
    if (field === 'password') {
      setShowPassword(prev => !prev);
    } else {
      setShowConfirmPassword(prev => !prev);
    }
  };
  
  // Validate current step
  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1: {
        // Contact info validation
        const isEmailValid = email.length > 0 && (emailValid === true);
        const isPhoneValid = phone.length > 0 && (phoneValid === true);
        
        // Highlight errors
        if (!isEmailValid) setEmailValid(email.length > 0 ? false : null);
        if (!isPhoneValid) setPhoneValid(phone.length > 0 ? false : null);
        
        return isEmailValid && isPhoneValid;
      }
      case 2: {
        // Personal info validation
        const isFirstNameValid = firstName.length > 0 && (firstNameValid === true);
        const isLastNameValid = lastName.length > 0 && (lastNameValid === true);
        
        // Highlight errors
        if (!isFirstNameValid) setFirstNameValid(firstName.length > 0 ? false : null);
        if (!isLastNameValid) setLastNameValid(lastName.length > 0 ? false : null);
        
        return isFirstNameValid && isLastNameValid;
      }
      case 3: {
        // Security validation
        const isPasswordValid = password.length > 0 && (passwordValid === true);
        const isConfirmPasswordValid = confirmPassword.length > 0 && (confirmPasswordValid === true);
        
        // Highlight errors
        if (!isPasswordValid) setPasswordValid(password.length > 0 ? false : null);
        if (!isConfirmPasswordValid) setConfirmPasswordValid(confirmPassword.length > 0 ? false : null);
        
        return isPasswordValid && isConfirmPasswordValid;
      }
      case 4: {
        // Terms acceptance is automatically valid for this example
        return true;
      }
      default:
        return false;
    }
  };
  
  // Handle next step
  const handleNextStep = () => {
    if (!validateStep()) {
      // Validation failed - shake animation
      Animated.sequence([
        Animated.timing(stepTransition, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(stepTransition, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(stepTransition, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(stepTransition, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      return;
    }
    
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
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (currentStep < totalSteps) {
      // Animate transition to next step
      Animated.timing(stepTransition, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Reset animation value after updating step
        stepTransition.setValue(width);
        setCurrentStep(prev => prev + 1);
        
        // Animate back to center
        Animated.timing(stepTransition, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Final step - submit form
      handleSubmit();
    }
  };
  
  // Handle previous step
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Animate transition to previous step
      Animated.timing(stepTransition, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Reset animation value after updating step
        stepTransition.setValue(-width);
        setCurrentStep(prev => prev - 1);
        
        // Animate back to center
        Animated.timing(stepTransition, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      navigation.goBack();
    }
  };
  
  // Handle form submission - Connect to MongoDB
  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      // Create user object matching MongoDB schema requirements
      const userData = {
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone
      };
      
      // Register user in MongoDB
      const user = await authService.signup(userData);
      
      // Show success screen on successful registration
      setIsLoading(false);
      setShowSuccess(true);
      
      console.log('User created successfully:', user);
      
      // Redirect to login after short delay
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error: any) { // Type the error as any to access response properties
      // Handle registration errors
      setIsLoading(false);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      // Check if it's an API error with response
      if (error.response) {
        if (error.response.status === 409) {
          errorMessage = 'This email or phone number is already registered.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      // Show error alert
      Alert.alert('Registration Error', errorMessage);
      console.error('Signup error:', error);
    }
  };
  
  // Dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  // Render success screen
  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.BLACK} />
        
        <LinearGradient
          colors={[COLORS.BLACK_DARK, COLORS.BLACK]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[COLORS.GOLD, COLORS.GOLD_DARK]}
              style={styles.successIconBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="checkmark-sharp" size={60} color={COLORS.BLACK} />
            </LinearGradient>
          </View>
          <Text style={styles.successTitle}>Registration Complete!</Text>
          <Text style={styles.successMessage}>
            Your account has been successfully created. You can now log in to access all features.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
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
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handlePreviousStep} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.GOLD} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Account</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              })
            }
          ]}
        />
        <View style={styles.stepsContainer}>
          {stepData.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index + 1 < currentStep && styles.stepCompleted,
                  index + 1 === currentStep && styles.stepActive
                ]}
              >
                {index + 1 < currentStep ? (
                  <FontAwesome5 name="check" size={14} color={COLORS.BLACK} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      index + 1 === currentStep && styles.stepNumberActive
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  index + 1 === currentStep && styles.stepLabelActive
                ]}
              >
                {step.title}
              </Text>
            </View>
          ))}
        </View>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY },
                    { translateX: stepTransition }
                  ]
                }
              ]}
            >
              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Contact Information</Text>
                  <Text style={styles.stepDescription}>
                    Please provide your email and phone number
                  </Text>
                  
                  {/* Email input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        emailValid === false && styles.inputError,
                        emailValid === true && styles.inputSuccess
                      ]}
                    >
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
                        returnKeyType="next"
                        onSubmitEditing={() => phoneInputRef.current?.focus()}
                      />
                      {emailValid === true && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
                      )}
                      {emailValid === false && (
                        <Ionicons name="close-circle" size={18} color={COLORS.ERROR} />
                      )}
                    </View>
                    {emailValid === false && (
                      <Text style={styles.errorText}>
                        Please enter a valid email address
                      </Text>
                    )}
                  </View>
                  
                  {/* Phone input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        phoneValid === false && styles.inputError,
                        phoneValid === true && styles.inputSuccess
                      ]}
                    >
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={COLORS.GOLD}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={phoneInputRef}
                        style={styles.input}
                        placeholder="Phone Number"
                        placeholderTextColor={COLORS.GRAY}
                        value={phone}
                        onChangeText={validatePhone}
                        keyboardType="phone-pad"
                        returnKeyType="done"
                      />
                      {phoneValid === true && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
                      )}
                      {phoneValid === false && (
                        <Ionicons name="close-circle" size={18} color={COLORS.ERROR} />
                      )}
                    </View>
                    {phoneValid === false && (
                      <Text style={styles.errorText}>
                        Please enter a valid phone number
                      </Text>
                    )}
                  </View>
                </View>
              )}
              
              {/* Step 2: Personal Information */}
              {currentStep === 2 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Personal Information</Text>
                  <Text style={styles.stepDescription}>
                    Tell us a bit about yourself
                  </Text>
                  
                  {/* First name input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        firstNameValid === false && styles.inputError,
                        firstNameValid === true && styles.inputSuccess
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={COLORS.GOLD}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={firstNameInputRef}
                        style={styles.input}
                        placeholder="First Name"
                        placeholderTextColor={COLORS.GRAY}
                        value={firstName}
                        onChangeText={(text) => validateName(text, 'first')}
                        autoCapitalize="words"
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameInputRef.current?.focus()}
                      />
                      {firstNameValid === true && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
                      )}
                      {firstNameValid === false && (
                        <Ionicons name="close-circle" size={18} color={COLORS.ERROR} />
                      )}
                    </View>
                    {firstNameValid === false && (
                      <Text style={styles.errorText}>
                        First name should be at least 2 characters
                      </Text>
                    )}
                  </View>
                  
                  {/* Last name input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        lastNameValid === false && styles.inputError,
                        lastNameValid === true && styles.inputSuccess
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={COLORS.GOLD}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={lastNameInputRef}
                        style={styles.input}
                        placeholder="Last Name"
                        placeholderTextColor={COLORS.GRAY}
                        value={lastName}
                        onChangeText={(text) => validateName(text, 'last')}
                        autoCapitalize="words"
                        returnKeyType="done"
                      />
                      {lastNameValid === true && (
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.SUCCESS} />
                      )}
                      {lastNameValid === false && (
                        <Ionicons name="close-circle" size={18} color={COLORS.ERROR} />
                      )}
                    </View>
                    {lastNameValid === false && (
                      <Text style={styles.errorText}>
                        Last name should be at least 2 characters
                      </Text>
                    )}
                  </View>
                </View>
              )}
              
              {/* Step 3: Security Information */}
              {currentStep === 3 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Set Your Password</Text>
                  <Text style={styles.stepDescription}>
                    Create a strong, secure password
                  </Text>
                  
                  {/* Password input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        passwordValid === false && styles.inputError,
                        passwordValid === true && styles.inputSuccess
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color={COLORS.GOLD}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={passwordInputRef}
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={COLORS.GRAY}
                        value={password}
                        onChangeText={validatePassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => togglePasswordVisibility('password')}
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
                      <Text style={styles.errorText}>
                        Password must be 8+ chars with uppercase, lowercase & number
                      </Text>
                    )}
                  </View>
                  
                  {/* Confirm password input */}
                  <View style={styles.inputWrapper}>
                    <View
                      style={[
                        styles.inputContainer,
                        confirmPasswordValid === false && styles.inputError,
                        confirmPasswordValid === true && styles.inputSuccess
                      ]}
                    >
                      <Ionicons
                        name="shield-outline"
                        size={18}
                        color={COLORS.GOLD}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={confirmPasswordInputRef}
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor={COLORS.GRAY}
                        value={confirmPassword}
                        onChangeText={validateConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => togglePasswordVisibility('confirmPassword')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color={COLORS.GOLD}
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPasswordValid === false && (
                      <Text style={styles.errorText}>
                        Passwords do not match
                      </Text>
                    )}
                  </View>
                </View>
              )}
              
              {/* Step 4: Finish (Terms) */}
              {currentStep === 4 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Almost There!</Text>
                  <Text style={styles.stepDescription}>
                    Review and accept the terms to complete your registration
                  </Text>
                  
                  <View style={styles.termsContainer}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={70}
                      color={COLORS.GOLD}
                      style={styles.termsIcon}
                    />
                    
                    <Text style={styles.termsTitle}>Terms & Conditions</Text>
                    
                    <Text style={styles.termsText}>
                      By creating an account, you agree to our Terms of Service and Privacy Policy. 
                      We're committed to protecting your data and providing you with the best experience.
                    </Text>
                    
                    <View style={styles.checkboxContainer}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={COLORS.GOLD}
                      />
                      <Text style={styles.checkboxLabel}>
                        I accept the Terms and Conditions
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Next/Submit Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleNextStep}
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
                        <Text style={styles.buttonText}>
                          {currentStep < totalSteps ? 'NEXT' : 'SIGN UP'}
                        </Text>
                        <Ionicons
                          name={currentStep < totalSteps ? "arrow-forward" : "checkmark"}
                          size={18}
                          color={COLORS.BLACK}
                          style={styles.buttonIcon}
                        />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
              
              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                  <Text 
                    style={styles.loginLink}
                    onPress={() => navigation.navigate('Login')}
                  >
                    Login here
                  </Text>
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BLACK_LIGHT,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.GOLD,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.GOLD,
    borderRadius: 3,
    marginBottom: 10,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  stepItem: {
    alignItems: 'center',
    width: width / 4 - 10,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.BLACK_LIGHT,
    borderWidth: 1.5,
    borderColor: COLORS.GRAY_DARK,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  stepCompleted: {
    backgroundColor: COLORS.GOLD,
    borderColor: COLORS.GOLD_DARK,
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  stepActive: {
    backgroundColor: COLORS.BLACK_LIGHT,
    borderColor: COLORS.GOLD,
    borderWidth: 2.5,
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.GRAY,
  },
  stepNumberActive: {
    color: COLORS.GOLD,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.GRAY,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  formContainer: {
    flex: 1,
    paddingTop: 20,
  },
  stepContent: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.GOLD,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: COLORS.GRAY_LIGHT,
    marginBottom: 30,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    backgroundColor: COLORS.BLACK_LIGHT,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.GRAY_DARK,
    paddingHorizontal: 16,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.WHITE,
    fontSize: 16,
  },
  inputError: {
    borderColor: COLORS.ERROR,
    borderWidth: 1.5,
  },
  inputSuccess: {
    borderColor: COLORS.SUCCESS,
    borderWidth: 1.5,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  passwordToggle: {
    padding: 5,
  },
  button: {
    height: 58,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 16,
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.BLACK,
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 5,
  },
  termsContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.BLACK_LIGHT,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.GRAY_DARK,
  },
  termsIcon: {
    marginBottom: 15,
  },
  termsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.GOLD,
    marginBottom: 15,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.GRAY_LIGHT,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.WHITE,
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  loginText: {
    fontSize: 15,
    color: COLORS.GRAY_LIGHT,
  },
  loginLink: {
    color: COLORS.GOLD,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  successIconContainer: {
    marginBottom: 30,
  },
  successIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.GOLD,
    marginBottom: 15,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.GRAY_LIGHT,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SignupScreen;
