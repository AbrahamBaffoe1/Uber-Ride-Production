import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Alert,
  Image,
  StatusBar
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../../api/services/authService';

// Type definitions
type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
type SignupScreenRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignupScreenNavigationProp;
  route: SignupScreenRouteProp;
}

const MuneefSignUpScreen: React.FC<Props> = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);

  // Handle phone number signup
  const handlePhoneSignup = () => {
    navigation.navigate('Verification', {
      email: '',
      phone: '',
      verificationMethod: 'phone'
    });
  };

  // Handle Google signup
  const handleGoogleSignup = () => {
    Alert.alert('Google Sign Up', 'Google sign up will be implemented');
  };

  // Handle other signup method
  const handleOtherSignup = () => {
    Alert.alert('Other Sign Up', 'Additional sign up options will be implemented');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C1B3A" />
      
      {/* Background Image - Motorcycle dashboard with night road */}
      <ImageBackground 
        source={{uri: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?ixlib=rb-4.0.2&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80'}} 
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(12, 27, 58, 0.4)', 'rgba(12, 27, 58, 0.9)']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={{uri: 'https://cdn-icons-png.flaticon.com/512/5087/5087579.png'}} 
                style={styles.logo} 
                resizeMode="contain"
              />
              <Text style={styles.logoText}>MUNEEF</Text>
            </View>
            
            {/* Spacer */}
            <View style={styles.spacer} />
            
            {/* Bottom Card */}
            <View style={styles.card}>
              <Text style={styles.title}>Let's Sign Up to Continue</Text>
              <Text style={styles.subtitle}>
                To continue, you need to create an account. Select a login method below
              </Text>
              
              {/* Phone Button */}
              <TouchableOpacity 
                style={styles.phoneButton} 
                onPress={handlePhoneSignup}
                activeOpacity={0.8}
              >
                <Text style={styles.phoneButtonText}>Continue with Phone Number</Text>
              </TouchableOpacity>
              
              {/* Social Login Options */}
              <View style={styles.socialContainer}>
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={handleGoogleSignup}
                >
                  <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png'}} 
                    style={styles.socialIcon}
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton} 
                  onPress={handleOtherSignup}
                >
                  <Image 
                    source={{uri: 'https://cdn-icons-png.flaticon.com/512/5968/5968764.png'}} 
                    style={styles.socialIcon}
                  />
                </TouchableOpacity>
              </View>
              
              {/* Login Link */}
              <View style={styles.loginLinkContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1B3A'
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%'
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between'
  },
  content: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 24
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2
  },
  spacer: {
    flex: 1
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 36
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8
  },
  phoneButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 24
  },
  phoneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12
  },
  socialIcon: {
    width: 24,
    height: 24
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 4
  },
  loginLink: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600'
  }
});

export default MuneefSignUpScreen;
