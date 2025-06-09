import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const { width, height } = Dimensions.get('window');

// Define a type for MaterialCommunityIcons names
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PasswordStrength {
  strength: string;
  color: string;
  width: number;
}

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  
  // Animation refs
  const formAnimatedValue = useRef(new Animated.Value(0)).current;
  const headerAnimatedValue = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  // Animations and effects
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    Animated.parallel([
      Animated.timing(headerAnimatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(formAnimatedValue, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      })
    ]).start();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };
  
  const validateStep = (step: number) => {
    let isValid = true;
    const newErrors = { ...formErrors };
    
    if (step === 1) {
      // First Name validation
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'Required';
        isValid = false;
      }
      
      // Last Name validation
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Required';
        isValid = false;
      }
      
      // Email validation
      if (!formData.email.trim()) {
        newErrors.email = 'Required';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email';
        isValid = false;
      }
      
      // Phone validation
      if (!formData.phone.trim()) {
        newErrors.phone = 'Required';
        isValid = false;
      } else if (!/^\+?[0-9]{8,15}$/.test(formData.phone.replace(/\s+/g, ''))) {
        newErrors.phone = 'Invalid format';
        isValid = false;
      }
    } else if (step === 2) {
      // Password validation
      if (!formData.password) {
        newErrors.password = 'Required';
        isValid = false;
      } else if (formData.password.length < 8) {
        newErrors.password = 'Min 8 characters';
        isValid = false;
      }
      
      // Confirm Password validation
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Required';
        isValid = false;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords don\'t match';
        isValid = false;
      }
      
      // Terms validation
      if (!acceptTerms) {
        Alert.alert('Terms & Conditions', 'Please accept the Terms & Conditions to continue');
        isValid = false;
      }
    }
    
    setFormErrors(newErrors);
    return isValid;
  };
  
  const handleNextStep = () => {
    if (validateStep(1)) {
      Animated.sequence([
        Animated.timing(formAnimatedValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(formAnimatedValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
      setCurrentStep(2);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };
  
  const handlePrevStep = () => {
    Animated.sequence([
      Animated.timing(formAnimatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(formAnimatedValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
    setCurrentStep(1);
  };
  
  const handleSignUp = () => {
    Keyboard.dismiss();
    
    if (validateStep(2)) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('PhoneVerification', { phone: formData.phone });
      }, 1500);
    }
  };
  
  const getPasswordStrength = (): PasswordStrength => {
    const { password } = formData;
    if (!password) return { strength: 'Empty', color: '#CCCCCC', width: 0 };
    
    if (password.length < 6) {
      return { strength: 'Weak', color: '#FF6B6B', width: 25 };
    } else if (password.length < 8) {
      return { strength: 'Fair', color: '#FFD166', width: 50 };
    } else if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { strength: 'Good', color: '#06D6A0', width: 75 };
    } else {
      return { strength: 'Strong', color: '#118AB2', width: 100 };
    }
  };
  
  const passwordStrength = getPasswordStrength();
  
  const headerTranslateY = headerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });
  
  const headerOpacity = headerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  const formTranslateY = formAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });
  
  const formOpacity = formAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  const renderInputWithIcon = (
    placeholder: string,
    icon: IconName,
    field: keyof typeof formData,
    keyboardType: any = 'default',
    secureTextEntry = false,
    showPasswordToggle = false,
    showPasswordState = false,
    setShowPasswordState = (val: boolean) => {}
  ) => (
    <View style={styles.inputWrapper}>
      <View style={[
        styles.inputContainer,
        formErrors[field as keyof typeof formErrors] ? styles.inputError : null
      ]}>
        <MaterialCommunityIcons name={icon} size={22} color="#777" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !showPasswordState}
          value={formData[field]}
          onChangeText={(text) => updateFormData(field, text)}
          autoCapitalize={field === 'email' ? 'none' : 'words'}
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            onPress={() => setShowPasswordState(!showPasswordState)}
            style={styles.visibilityToggle}
          >
            <MaterialCommunityIcons
              name={showPasswordState ? "eye-off" : "eye"} 
              size={22} 
              color="#777" 
            />
          </TouchableOpacity>
        )}
      </View>
      {formErrors[field as keyof typeof formErrors] ? (
        <Text style={styles.errorText}>
          <MaterialCommunityIcons name="alert-circle" size={12} color="#FF6B6B" /> {formErrors[field as keyof typeof formErrors]}
        </Text>
      ) : null}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Header */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}
      >
        <LinearGradient
          colors={['#7F5AF3', '#4361EE']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Create Your Account</Text>
              <Text style={styles.headerSubtitle}>
                {currentStep === 1 ? 'Step 1: Personal Information' : 'Step 2: Security Setup'}
              </Text>
            </View>
            
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepActive]}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepLine}>
                <View style={[styles.stepLineFill, currentStep > 1 && styles.stepLineActive]} />
              </View>
              <View style={[styles.stepDot, currentStep > 1 && styles.stepActive]}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
      
      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }]
              }
            ]}
          >
            {currentStep === 1 ? (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Personal Details</Text>
                  <Text style={styles.formSubtitle}>
                    Let's get to know you better
                  </Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      {renderInputWithIcon('First Name', 'account', 'firstName')}
                    </View>
                    <View style={styles.nameField}>
                      {renderInputWithIcon('Last Name', 'account', 'lastName')}
                    </View>
                  </View>
                  
                  {renderInputWithIcon('Email Address', 'email', 'email', 'email-address')}
                  {renderInputWithIcon('Phone Number', 'phone', 'phone', 'phone-pad')}
                  
                  <TouchableOpacity 
                    style={styles.nextButton}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.nextButtonText}>Continue</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Security Setup</Text>
                  <Text style={styles.formSubtitle}>
                    Create a strong, secure password
                  </Text>
                </View>
                
                <View style={styles.inputGroup}>
                  {renderInputWithIcon(
                    'Create Password', 
                    'lock', 
                    'password', 
                    'default', 
                    true, 
                    true, 
                    showPassword, 
                    setShowPassword
                  )}
                  
                  {/* Password Strength Indicator */}
                  {formData.password ? (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View 
                          style={[
                            styles.passwordStrengthFill, 
                            { 
                              width: `${passwordStrength.width}%`, 
                              backgroundColor: passwordStrength.color 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[
                        styles.passwordStrengthText, 
                        { color: passwordStrength.color }
                      ]}>
                        {passwordStrength.strength}
                      </Text>
                    </View>
                  ) : null}
                  
                  {/* Password Requirements */}
                  <View style={styles.passwordRequirements}>
                    <View style={styles.requirementRow}>
                      <View style={styles.requirementItem}>
                        <MaterialCommunityIcons 
                          name={formData.password.length >= 8 ? "check-circle" : "circle-outline"}
                          size={18} 
                          color={formData.password.length >= 8 ? "#06D6A0" : "#BBBBBB"}
                          style={styles.requirementIcon}
                        />
                        <Text style={styles.requirementText}>8+ characters</Text>
                      </View>
                      
                      <View style={styles.requirementItem}>
                        <MaterialCommunityIcons 
                          name={/[A-Z]/.test(formData.password) ? "check-circle" : "circle-outline"}
                          size={18} 
                          color={/[A-Z]/.test(formData.password) ? "#06D6A0" : "#BBBBBB"}
                          style={styles.requirementIcon}
                        />
                        <Text style={styles.requirementText}>Uppercase</Text>
                      </View>
                    </View>
                    
                    <View style={styles.requirementRow}>
                      <View style={styles.requirementItem}>
                        <MaterialCommunityIcons 
                          name={/[0-9]/.test(formData.password) ? "check-circle" : "circle-outline"}
                          size={18} 
                          color={/[0-9]/.test(formData.password) ? "#06D6A0" : "#BBBBBB"}
                          style={styles.requirementIcon}
                        />
                        <Text style={styles.requirementText}>Number</Text>
                      </View>
                      
                      <View style={styles.requirementItem}>
                        <MaterialCommunityIcons 
                          name={/[$&+,:;=?@#|'<>.^*()%!-]/.test(formData.password) ? "check-circle" : "circle-outline"}
                          size={18} 
                          color={/[$&+,:;=?@#|'<>.^*()%!-]/.test(formData.password) ? "#06D6A0" : "#BBBBBB"}
                          style={styles.requirementIcon}
                        />
                        <Text style={styles.requirementText}>Special char</Text>
                      </View>
                    </View>
                  </View>
                  
                  {renderInputWithIcon(
                    'Confirm Password', 
                    'lock-check', 
                    'confirmPassword', 
                    'default', 
                    true, 
                    true, 
                    showConfirmPassword, 
                    setShowConfirmPassword
                  )}
                  
                  {/* Terms and Conditions */}
                  <TouchableOpacity 
                    style={styles.termsContainer}
                    onPress={() => setAcceptTerms(!acceptTerms)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      acceptTerms && styles.checkboxActive
                    ]}>
                      {acceptTerms && (
                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
                      <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                  </TouchableOpacity>
                  
                  <View style={styles.buttonRow}>
                    <TouchableOpacity 
                      style={styles.backStepButton}
                      onPress={handlePrevStep}
                    >
                      <MaterialCommunityIcons name="arrow-left" size={20} color="#666" />
                      <Text style={styles.backStepButtonText}>Back</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.signUpButton, 
                        isLoading && styles.signUpButtonDisabled
                      ]}
                      onPress={handleSignUp}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={styles.signUpButtonText}>Create Account</Text>
                          <MaterialCommunityIcons name="account-check" size={20} color="#fff" />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            
            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  headerContainer: {
    width: '100%',
    zIndex: 10,
  },
  headerGradient: {
    width: '100%',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 15 : 15,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  headerTextContainer: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#fff',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4361EE',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 10,
    position: 'relative',
  },
  stepLineFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '0%',
    backgroundColor: '#fff',
  },
  stepLineActive: {
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  formContainer: {
    flex: 1,
    marginTop: -20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#7F5AF3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  formHeader: {
    marginBottom: 25,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: '#777',
  },
  inputGroup: {
    marginBottom: 15,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  nameField: {
    width: '48%',
  },
  inputWrapper: {
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAECF5',
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  visibilityToggle: {
    padding: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#EAECF5',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  passwordStrengthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRequirements: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#7F5AF3',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7F5AF3',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4361EE',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  nextButton: {
    backgroundColor: '#4361EE',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F0F2F5',
  },
  backStepButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  signUpButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#4361EE',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpButtonDisabled: {
    backgroundColor: '#BBC1F7',
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  loginText: {
    fontSize: 15,
    color: '#666',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4361EE',
  }
});

export default RegisterScreen;
