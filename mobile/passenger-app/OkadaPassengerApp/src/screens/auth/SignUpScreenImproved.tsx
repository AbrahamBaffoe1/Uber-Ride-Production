import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import CountryPicker, { Country } from '@perttu/react-native-country-picker-modal';
import { authService } from '../../api/services/auth.service';

// Type definitions
type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
type SignupScreenRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignupScreenNavigationProp;
  route: SignupScreenRouteProp;
}

// Form data type
interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

const SignupScreenImproved: React.FC<Props> = ({ navigation, route }) => {
  // Form data
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Update form fields
  const handleChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Submit form
  const handleSubmit = () => {
    // Simple validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    // Show success
    Alert.alert('Success', 'Account created successfully');
    
    // Navigate to login
    navigation.navigate('Login');
  };

  // Render form
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={formData.email}
        onChangeText={(value) => handleChange('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={formData.password}
        onChangeText={(value) => handleChange('password', value)}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => handleChange('confirmPassword', value)}
        secureTextEntry
      />
      
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f9fafb'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff'
  },
  button: {
    height: 50,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  link: {
    color: '#6366F1',
    textAlign: 'center',
    marginTop: 8
  }
});

export default SignupScreenImproved;
