import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type PassengerInfoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RiderInfo'>;

const PassengerInfoScreen: React.FC = () => {
  const navigation = useNavigation<PassengerInfoScreenNavigationProp>();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    emergencyContact: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  const updateFormData = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
    
    // Clear error when typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors({
        ...formErrors,
        [field]: ''
      });
    }
  };
  
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors = { ...formErrors };
    
    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    
    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
      isValid = false;
    }
    
    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!/^\+?[0-9]{8,15}$/.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Enter a valid phone number';
      isValid = false;
    }
    
    setFormErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = () => {
    Keyboard.dismiss();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('DocumentUpload');
    }, 1500);
  };
  
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#13171D" />
        
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Personal Information</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '33%' }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 3</Text>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: 'https://i.ibb.co/2KvP5z3/user-profile-placeholder.png' }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editPhotoButton}>
              <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your first name"
                  placeholderTextColor="#666666"
                  value={formData.firstName}
                  onChangeText={(text) => updateFormData('firstName', text)}
                />
              </View>
              {formErrors.firstName ? <Text style={styles.errorText}>{formErrors.firstName}</Text> : null}
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your last name"
                  placeholderTextColor="#666666"
                  value={formData.lastName}
                  onChangeText={(text) => updateFormData('lastName', text)}
                />
              </View>
              {formErrors.lastName ? <Text style={styles.errorText}>{formErrors.lastName}</Text> : null}
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#666666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                />
              </View>
              {formErrors.email ? <Text style={styles.errorText}>{formErrors.email}</Text> : null}
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#666666"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                />
              </View>
              {formErrors.phone ? <Text style={styles.errorText}>{formErrors.phone}</Text> : null}
            </View>
            
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Home Address</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your home address"
                  placeholderTextColor="#666666"
                  value={formData.address}
                  onChangeText={(text) => updateFormData('address', text)}
                />
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>City</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your city"
                  placeholderTextColor="#666666"
                  value={formData.city}
                  onChangeText={(text) => updateFormData('city', text)}
                />
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Emergency Contact</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Emergency contact number"
                  placeholderTextColor="#666666"
                  keyboardType="phone-pad"
                  value={formData.emergencyContact}
                  onChangeText={(text) => updateFormData('emergencyContact', text)}
                />
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1C2128',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7AC231',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1C2128',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7AC231',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#13171D',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 8,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    height: '100%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  continueButton: {
    backgroundColor: '#7AC231',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(122, 194, 49, 0.5)',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PassengerInfoScreen;