import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useDispatch } from 'react-redux';
import authService from '../../api/services/auth.service';

// Define the props for ResetPasswordScreen
type ResetPasswordScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Auth'>;
  route: RouteProp<{
    params: {
      token: string;
    };
  }, 'params'>;
};

// Enhanced color palette
const COLORS = {
  PRIMARY: '#F9A826',
  PRIMARY_LIGHT: '#FFCB66',
  PRIMARY_DARK: '#E08D12',
  BACKGROUND: '#FFFFFF',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#999999',
  INPUT_BORDER: '#EEEEEE',
  INPUT_BG: '#F9F9F9',
  INPUT_ACTIVE: '#FCF5E8',
  ERROR: '#FF5252',
  SUCCESS: '#4CAF50',
  SHADOW: 'rgba(249, 168, 38, 0.15)',
};

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation, route }) => {
  const { token } = route.params;
  const dispatch = useDispatch();
  
  // State for password input
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  
  // Check password strength
  const checkPasswordStrength = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    };
    
    setPasswordRequirements(requirements);
    
    // Calculate strength (1-5)
    const strength = Object.values(requirements).filter(Boolean).length;
    setPasswordStrength(strength);
  };
  
  // Handle password reset
  const handleResetPassword = async () => {
    try {
      // Validate password
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (passwordStrength < 3) {
        setError('Password is too weak. Please follow the requirements.');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Use the API service to reset the password
        const response = await authService.resetPassword({
          userId: 'user_id', // This should be stored or retrieved from state management
          code: token, // The OTP code is passed as the token
          newPassword: password
        });
        
        setIsLoading(false);
        
        Alert.alert(
          'Success',
          'Your password has been reset successfully. You can now log in with your new password.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Auth', { screen: 'Login' })
            }
          ]
        );
      } catch (error: any) {
        setIsLoading(false);
        
        // Handle API error
        if (error.response && error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to reset password. Please try again.');
        }
        console.error('Password reset error:', error);
      }
      
    } catch (error) {
      setIsLoading(false);
      setError('Failed to reset password. Please try again.');
      console.error('Password reset error:', error);
    }
  };
  
  // Handle input focus for styling
  const handleFocus = (input: string) => {
    setFocusedInput(input);
  };
  
  // Handle input blur
  const handleBlur = () => {
    setFocusedInput(null);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account
            </Text>
          </View>
          
          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View 
              style={[
                styles.inputContainer, 
                { 
                  borderColor: focusedInput === 'password' ? COLORS.PRIMARY : COLORS.INPUT_BORDER,
                  backgroundColor: focusedInput === 'password' ? COLORS.INPUT_ACTIVE : COLORS.INPUT_BG 
                }
              ]}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={18} 
                color={focusedInput === 'password' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  checkPasswordStrength(text);
                }}
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
                  size={18} 
                  color={focusedInput === 'password' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Password Strength Indicator */}
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4, 5].map((strength) => (
                <View 
                  key={`strength-${strength}`}
                  style={[
                    styles.strengthBar,
                    passwordStrength >= strength && getStrengthColor(passwordStrength)
                  ]}
                />
              ))}
            </View>
            <Text style={styles.strengthLabel}>
              {getStrengthLabel(passwordStrength)}
            </Text>
          </View>
          
          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <RequirementItem 
              label="At least 8 characters" 
              isMet={passwordRequirements.length}
            />
            <RequirementItem 
              label="At least one uppercase letter" 
              isMet={passwordRequirements.uppercase}
            />
            <RequirementItem 
              label="At least one lowercase letter" 
              isMet={passwordRequirements.lowercase}
            />
            <RequirementItem 
              label="At least one number" 
              isMet={passwordRequirements.number}
            />
            <RequirementItem 
              label="At least one special character" 
              isMet={passwordRequirements.special}
            />
          </View>
          
          {/* Confirm Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View 
              style={[
                styles.inputContainer, 
                { 
                  borderColor: focusedInput === 'confirm' ? COLORS.PRIMARY : COLORS.INPUT_BORDER,
                  backgroundColor: focusedInput === 'confirm' ? COLORS.INPUT_ACTIVE : COLORS.INPUT_BG 
                }
              ]}
            >
              <Ionicons 
                name="lock-closed-outline" 
                size={18} 
                color={focusedInput === 'confirm' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                onFocus={() => handleFocus('confirm')}
                onBlur={handleBlur}
              />
              <TouchableOpacity 
                style={styles.passwordToggle} 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={18} 
                  color={focusedInput === 'confirm' ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Error message */}
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              (isLoading || passwordStrength < 3 || password !== confirmPassword || !password) && 
                styles.buttonDisabled
            ]}
            onPress={handleResetPassword}
            disabled={isLoading || passwordStrength < 3 || password !== confirmPassword || !password}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.BACKGROUND} />
            ) : (
              <Text style={styles.resetButtonText}>RESET PASSWORD</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Helper component for password requirements
interface RequirementItemProps {
  label: string;
  isMet: boolean;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ label, isMet }) => (
  <View style={styles.requirementItem}>
    <Ionicons
      name={isMet ? "checkmark-circle" : "ellipse-outline"}
      size={16}
      color={isMet ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY}
    />
    <Text style={[
      styles.requirementText,
      isMet && { color: COLORS.TEXT_PRIMARY }
    ]}>
      {label}
    </Text>
  </View>
);

// Helper functions for password strength
const getStrengthColor = (strength: number) => {
  if (strength <= 2) {
    return { backgroundColor: COLORS.ERROR };
  } else if (strength <= 3) {
    return { backgroundColor: COLORS.PRIMARY };
  } else {
    return { backgroundColor: COLORS.SUCCESS };
  }
};

const getStrengthLabel = (strength: number) => {
  if (strength === 0) return 'Enter password';
  if (strength <= 2) return 'Weak';
  if (strength <= 3) return 'Medium';
  if (strength <= 4) return 'Strong';
  return 'Very strong';
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
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    fontWeight: '500',
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
  errorText: {
    color: COLORS.ERROR,
    marginBottom: 16,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: COLORS.PRIMARY_LIGHT,
    opacity: 0.7,
  },
  resetButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  strengthContainer: {
    marginBottom: 20,
  },
  strengthBars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.INPUT_BORDER,
    marginRight: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  requirementsContainer: {
    marginBottom: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 8,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default ResetPasswordScreen;
