import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type ResetPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

const { width } = Dimensions.get('window');

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const { token } = route.params || { token: '' };
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(30);
  
  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    // Check for password complexity
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strengthScore = 
      (password.length >= 8 ? 1 : 0) +
      (hasLowerCase ? 1 : 0) +
      (hasUpperCase ? 1 : 0) +
      (hasNumber ? 1 : 0) +
      (hasSpecialChar ? 1 : 0);
    
    if (strengthScore < 2) {
      return { strength: 0.2, label: 'Weak', color: '#FF3B30' };
    } else if (strengthScore < 3) {
      return { strength: 0.4, label: 'Fair', color: '#FF9500' };
    } else if (strengthScore < 4) {
      return { strength: 0.6, label: 'Good', color: '#FFCC00' };
    } else if (strengthScore < 5) {
      return { strength: 0.8, label: 'Strong', color: '#34C759' };
    } else {
      return { strength: 1, label: 'Great! 🔥', color: '#7AC231' };
    }
  };
  
  const passwordStrength = getPasswordStrength();
  
  const validatePassword = (text: string): boolean => {
    if (!text) {
      setPasswordError('Password is required');
      return false;
    } else if (text.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    } else if (!/[A-Z]/.test(text)) {
      setPasswordError('Password must include an uppercase letter');
      return false;
    } else if (!/[0-9]/.test(text)) {
      setPasswordError('Password must include a number');
      return false;
    } else {
      setPasswordError('');
      return true;
    }
  };
  
  const validateConfirmPassword = (text: string): boolean => {
    if (!text) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    } else if (text !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    } else {
      setConfirmPasswordError('');
      return true;
    }
  };
  
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) validatePassword(text);
    if (confirmPassword) validateConfirmPassword(confirmPassword);
  };
  
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) validateConfirmPassword(text);
  };
  
  const handleResetPassword = () => {
    Keyboard.dismiss();
    
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    
    if (!isPasswordValid || !isConfirmPasswordValid) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Success',
        'Your password has been reset successfully!',
        [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]
      );
    }, 1500);
  };
  
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="#13171D" translucent />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Animated.View 
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={64} color="#7AC231" />
            </View>
            
            <Text style={styles.title}>Password Reset</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account. Choose a strong password that you don't use elsewhere.
            </Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>New Password</Text>
                <View style={[
                  styles.inputContainer,
                  passwordError ? styles.inputError : null
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#666666"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    onBlur={() => validatePassword(password)}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.visibilityToggle}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                
                {password && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.passwordStrengthBar}>
                      <View style={[
                        styles.passwordStrengthFill, 
                        { 
                          width: `${passwordStrength.strength * 100}%`,
                          backgroundColor: passwordStrength.color 
                        }
                      ]} />
                    </View>
                    <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
                
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementText}>Password must:</Text>
                  <View style={styles.requirementItem}>
                    <View 
                      style={[
                        styles.requirementDot, 
                        password.length >= 8 && styles.requirementMet
                      ]} 
                    />
                    <Text style={styles.requirementItemText}>Be at least 8 characters</Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <View 
                      style={[
                        styles.requirementDot, 
                        /[A-Z]/.test(password) && styles.requirementMet
                      ]} 
                    />
                    <Text style={styles.requirementItemText}>Include uppercase letter</Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <View 
                      style={[
                        styles.requirementDot, 
                        /[0-9]/.test(password) && styles.requirementMet
                      ]} 
                    />
                    <Text style={styles.requirementItemText}>Include a number</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  confirmPasswordError ? styles.inputError : null
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#666666"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    onBlur={() => validateConfirmPassword(confirmPassword)}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.visibilityToggle}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#666666" 
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.resetButton, 
                  (!password || !confirmPassword || passwordError || confirmPasswordError) && styles.buttonDisabled
                ]}
                onPress={handleResetPassword}
                disabled={isLoading || !password || !confirmPassword || !!passwordError || !!confirmPasswordError}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.resetButtonText}>Reset Password</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  </View>
                )}
              </TouchableOpacity>
              
              <Text style={styles.securityNote}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#999999" /> Your password is securely encrypted and never shared with third parties.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  iconContainer: {
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
    maxWidth: '90%',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2128',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#1C2128',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  visibilityToggle: {
    padding: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 16,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1C2128',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 10,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRequirements: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginRight: 8,
  },
  requirementMet: {
    backgroundColor: '#7AC231',
  },
  requirementItemText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  resetButton: {
    backgroundColor: '#7AC231',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(122, 194, 49, 0.5)',
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  securityNote: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});

export default ResetPasswordScreen;