import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';
import { authService } from '../../api/services/authService';
import { otpService } from '../../api/services/otpService';
import RegistrationSuccessModal from '../../components/modals/RegistrationSuccessModal';
import RegistrationErrorModal from '../../components/modals/RegistrationErrorModal';

// Screen dimensions
const { width } = Dimensions.get('window');

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

// Type for navigation
type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

// Validation utilities
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => {
  const strongRegex = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})');
  return strongRegex.test(password);
};
const validatePhone = (phone: string) => /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone);

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  
  // Country options
  const countryOptions = useMemo(() => [
    { label: '🇳🇬 Nigeria (₦)', value: 'nigeria', currency: 'NGN', symbol: '₦' },
    { label: '🇬🇭 Ghana (₵)', value: 'ghana', currency: 'GHS', symbol: '₵' },
    { label: '🇰🇪 Kenya (KSh)', value: 'kenya', currency: 'KES', symbol: 'KSh' },
    { label: '🇺🇬 Uganda (USh)', value: 'uganda', currency: 'UGX', symbol: 'USh' },
    { label: '🇸🇳 Senegal (CFA)', value: 'senegal', currency: 'XOF', symbol: 'CFA' },
    { label: '🇿🇦 South Africa (R)', value: 'southAfrica', currency: 'ZAR', symbol: 'R' },
  ], []);

  // State management
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'nigeria', // Default to Nigeria
  });
  
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  const [formValidation, setFormValidation] = useState({
    fullName: { isValid: false, message: '' },
    phone: { isValid: false, message: '' },
    email: { isValid: false, message: '' },
    password: { isValid: false, message: '' },
    confirmPassword: { isValid: false, message: '' },
    country: { isValid: true, message: '' }, // Country is always valid
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({ 
    password: false, 
    confirmPassword: false,
    fullName: false,
    phone: false,
    email: false,
    country: false
  });
  const [focusedInput, setFocusedInput] = useState<keyof typeof formData | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [registrationError, setRegistrationError] = useState<string>('');
  const [registeredUserId, setRegisteredUserId] = useState<string>('');
  
  // Input validation
  const validateInput = useCallback((field: keyof typeof formData, value: string) => {
    switch(field) {
      case 'fullName':
        return {
          isValid: value.trim().length >= 2,
          message: value.trim().length < 2 ? 'Name is too short' : ''
        };
      case 'phone':
        return {
          isValid: validatePhone(value),
          message: !validatePhone(value) ? 'Invalid phone number' : ''
        };
      case 'email':
        return {
          isValid: validateEmail(value),
          message: !validateEmail(value) ? 'Invalid email format' : ''
        };
      case 'password':
        return {
          isValid: validatePassword(value),
          message: !validatePassword(value) 
            ? 'Must include uppercase, lowercase, number, and special character' 
            : ''
        };
      case 'confirmPassword':
        return {
          isValid: value === formData.password,
          message: value !== formData.password ? 'Passwords do not match' : ''
        };
      default:
        return { isValid: true, message: '' };
    }
  }, [formData.password]);

  // Handle input changes with validation
  const handleChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    const validation = validateInput(field, value);
    setFormValidation(prev => ({
      ...prev,
      [field]: validation
    }));
  }, [validateInput]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback((field: 'password' | 'confirmPassword') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  // Form validation before submission
  const validateForm = useCallback(() => {
    const formKeys = Object.keys(formData) as Array<keyof typeof formData>;
    const newValidation = formKeys.reduce((acc, field) => {
      const validation = validateInput(field, formData[field]);
      acc[field] = validation;
      return acc;
    }, {} as typeof formValidation);

    setFormValidation(newValidation);

    return Object.values(newValidation).every(field => field.isValid);
  }, [formData, validateInput]);


  // Registration handler
  const handleRegister = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    try {
      setIsLoading(true);
      setRegistrationError('');

      // Format user data for MongoDB backend
      const userData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' ') || '',
        phoneNumber: formData.phone,
        country: formData.country,
        role: 'rider',  // Ensure role is set correctly
        userType: 'rider' // Add userType for clarity
      };

      console.log('Registering user with MongoDB backend');
      
      // Register the user with MongoDB backend
      const user = await authService.signup(userData);
      
      // Validate user creation - check if we have an ID
      if (!user || !user._id) {
        throw new Error('User account could not be created. Please try again.');
      }
      
      console.log('User created successfully with ID:', user._id);
      
      // Store the user ID for later use
      setRegisteredUserId(user._id);

      try {
        console.log('Requesting OTP for verification');
        
        // Request OTP for phone verification
        const otpResponse = await otpService.requestSMSOTP({
          type: 'verification',
          phoneNumber: formData.phone,
          userId: user._id
        });

        if (!otpResponse.success) {
          // If OTP sending fails, we still created the user account
          // but we'll show an error about the OTP delivery
          setIsLoading(false);
          
          console.warn('OTP sending failed:', otpResponse.message);
          
          // Show success modal anyway, then handle verification separately
          setShowSuccessModal(true);
          return;
        }
        
        console.log('OTP sent successfully, messageId:', otpResponse.messageId);
        
        // OTP was sent successfully
        setIsLoading(false);
        
        // Show success modal instead of navigating directly
        setShowSuccessModal(true);
      } catch (otpError: any) {
        // Handle OTP delivery failure as a non-fatal error
        setIsLoading(false);
        
        console.error('OTP error:', otpError);
        
        // Still show success modal since user was created
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      setIsLoading(false);
      
      console.error('Registration failed:', error);
      
      // Set error message and show error modal
      setRegistrationError(error.message || 'An unexpected error occurred. Please try again.');
      setShowErrorModal(true);
    }
  }, [formData, navigation, validateForm]);

  // Handle input focus
  const handleFocus = useCallback((field: keyof typeof formData) => {
    setFocusedInput(field);
  }, []);

  // Handle input blur
  const handleBlur = useCallback(() => {
    setFocusedInput(null);
  }, []);

  // Define valid icon names to satisfy TypeScript
  type IconName = 'person-outline' | 'call-outline' | 'mail-outline' | 'lock-closed-outline' | 
                 'earth-outline' | 'arrow-back' | 'eye-outline' | 'eye-off-outline' | 
                 'chevron-down-outline' | 'checkmark-circle' | 'arrow-forward';

  // Render input fields
  const renderInputField = useCallback((
    field: keyof typeof formData, 
    icon: IconName, 
    placeholder: string, 
    isSecure?: boolean,
    keyboardType: 'default' | 'email-address' | 'numeric' | 'phone-pad' = 'default'
  ) => {
    const validation = formValidation[field];
    const inputValue = formData[field];
    const hasValue = inputValue.length > 0;
    const isActive = focusedInput === field;
    
    // Input status
    let iconColor = COLORS.TEXT_SECONDARY;
    let borderColor = COLORS.INPUT_BORDER;
    let backgroundColor = COLORS.INPUT_BG;
    
    if (isActive) {
      iconColor = COLORS.PRIMARY;
      borderColor = COLORS.PRIMARY;
      backgroundColor = COLORS.INPUT_ACTIVE;
    } else if (hasValue) {
      if (validation.isValid) {
        iconColor = COLORS.SUCCESS;
        borderColor = COLORS.SUCCESS;
      } else {
        iconColor = COLORS.ERROR;
        borderColor = COLORS.ERROR;
      }
    }
    
    return (
      <View style={styles.inputWrapper}>
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
            name={icon} 
            size={18} 
            color={iconColor} 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={COLORS.TEXT_SECONDARY}
            value={inputValue}
            onChangeText={(value) => handleChange(field, value)}
            secureTextEntry={isSecure ? !showPassword[field] : false}
            autoCapitalize={field === 'email' || field === 'password' || field === 'confirmPassword' ? 'none' : 'words'}
            keyboardType={keyboardType}
            onFocus={() => handleFocus(field)}
            onBlur={handleBlur}
          />
          {isSecure && (
            <TouchableOpacity 
              style={styles.passwordToggle} 
              onPress={() => togglePasswordVisibility(field as 'password' | 'confirmPassword')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={showPassword[field] ? "eye-outline" : "eye-off-outline"} 
                size={18} 
                color={iconColor} 
              />
            </TouchableOpacity>
          )}
          
          {hasValue && validation.isValid && (
            <View style={styles.validIndicator}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
            </View>
          )}
        </View>
        {!validation.isValid && validation.message && hasValue ? (
          <Text style={styles.validationMessage}>
            {validation.message}
          </Text>
        ) : null}
      </View>
    );
  }, [
    formData, 
    formValidation, 
    handleChange, 
    showPassword, 
    togglePasswordVisibility,
    focusedInput,
    handleFocus,
    handleBlur
  ]);

  // Handle retry from error modal
  const handleRetry = useCallback(() => {
    setShowErrorModal(false);
    // Slight delay to reset form state
    setTimeout(() => {
      // Focus on the first field with an error, or the first field
      const errorField = Object.keys(formValidation).find(
        key => !formValidation[key as keyof typeof formData].isValid
      ) as keyof typeof formData;
      
      if (errorField) {
        handleFocus(errorField);
      }
    }, 500);
  }, [formValidation, handleFocus]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardContainer}>
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

              <View style={styles.headerContainer}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Please fill the details to sign up</Text>
              </View>

              <View style={styles.formContainer}>
                {renderInputField(
                  'fullName', 
                  'person-outline', 
                  'Full Name'
                )}

                {renderInputField(
                  'phone', 
                  'call-outline', 
                  'Phone Number',
                  false,
                  'phone-pad'
                )}

                {renderInputField(
                  'email', 
                  'mail-outline', 
                  'Email Address',
                  false,
                  'email-address'
                )}
                
                {/* Country Selector */}
                <View style={styles.inputWrapper}>
                  <TouchableOpacity 
                    style={[styles.inputContainer, { backgroundColor: COLORS.INPUT_BG }]}
                    onPress={() => setShowCountryPicker(true)}
                  >
                    <Ionicons 
                      name="earth-outline"
                      size={18} 
                      color={COLORS.PRIMARY}
                      style={styles.inputIcon}
                    />
                    <Text style={styles.input}>{selectedCountry.label}</Text>
                    <Ionicons 
                      name="chevron-down-outline"
                      size={18} 
                      color={COLORS.TEXT_SECONDARY}
                    />
                  </TouchableOpacity>
                  <Text style={styles.helperText}>
                    Select your country to see earnings in your local currency
                  </Text>
                </View>

                {renderInputField(
                  'password', 
                  'lock-closed-outline', 
                  'Password',
                  true
                )}

                {renderInputField(
                  'confirmPassword', 
                  'lock-closed-outline', 
                  'Confirm Password',
                  true
                )}

                <TouchableOpacity
                  style={[
                    styles.button, 
                    isLoading && styles.buttonDisabled
                  ]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.BACKGROUND} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>SIGN UP</Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.BACKGROUND} style={styles.buttonIcon} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Login')}
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
                    style={styles.loginLinkContainer}
                  >
                    <Text style={styles.loginLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
        
        {/* Registration Success Modal */}
        <RegistrationSuccessModal
          visible={showSuccessModal}
          email={formData.email}
          onClose={() => setShowSuccessModal(false)}
          onVerifyNow={() => {
            setShowSuccessModal(false);
            // Navigate to verification screen
            navigation.navigate('PhoneVerification', {
              phone: formData.phone,
              userId: registeredUserId
            } as any);
          }}
        />
        
        {/* Registration Error Modal */}
        <RegistrationErrorModal
          visible={showErrorModal}
          errorMessage={registrationError}
          onClose={() => setShowErrorModal(false)}
          onRetry={handleRetry}
        />
      
      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Your Country</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
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
                    handleChange('country', item.value);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryText}>
                    {item.label}
                  </Text>
                  {selectedCountry.value === item.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  cardContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 30,
    padding: 24,
    width: '100%',
    position: 'relative',
    minHeight: 540,
    overflow: 'hidden',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
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
    top: 24,
    left: 16,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'flex-start',
    marginTop: 60,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    height: 56,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    paddingVertical: 12,
  },
  passwordToggle: {
    padding: 8,
  },
  validIndicator: {
    marginLeft: 5,
  },
  validationMessage: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 10,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexDirection: 'row',
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    marginRight: 4,
  },
  loginLinkContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  loginLink: {
    color: COLORS.PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 6,
    marginLeft: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.INPUT_BORDER,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.INPUT_BORDER,
  },
  selectedCountryItem: {
    backgroundColor: COLORS.INPUT_ACTIVE,
  },
  countryText: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
});

export default RegisterScreen;
