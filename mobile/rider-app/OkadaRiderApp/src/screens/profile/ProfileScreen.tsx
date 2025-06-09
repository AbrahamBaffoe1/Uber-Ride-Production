// src/screens/profile/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { userService, UserProfile } from '../../api/services/user.service';
import { authService } from '../../api/services/authService';

// Needed for navigation beyond just the Home stack
type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList & HomeStackParamList,
  'Profile'
>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Fetch profile data from the API
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        // Fetch the user profile from the backend
        const userProfile = await userService.getProfile();
        
        if (!userProfile) {
          throw new Error('Failed to fetch profile data');
        }
        
        setProfile(userProfile);
        setEditedProfile(userProfile);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleEditPress = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset edited profile to original
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    // Basic validation
    if (!editedProfile.firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }
    if (!editedProfile.lastName.trim()) {
      Alert.alert('Error', 'Last name is required');
      return;
    }
    if (!editedProfile.phoneNumber.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (editedProfile.email && !/\S+@\S+\.\S+/.test(editedProfile.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      // Call the real API to update the profile
      const updatedProfile = await userService.updateProfile(editedProfile);
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        setEditedProfile(updatedProfile);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
      
      setIsSaving(false);
      setIsEditing(false);
    } catch (error) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    if (!editedProfile) return;
    
    setEditedProfile({
      ...editedProfile,
      [field]: value,
    });
  };

  const handleChangeProfileImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    Alert.alert(
      'Change Profile Photo',
      'Choose a new profile photo',
      [
        { 
          text: 'Take Photo', 
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
              return;
            }
            
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              
              if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadProfileImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Error taking photo:', error);
              Alert.alert('Error', 'Failed to take photo. Please try again.');
            }
          } 
        },
        { 
          text: 'Choose from Gallery', 
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              
              if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadProfileImage(result.assets[0].uri);
              }
            } catch (error) {
              console.error('Error picking image:', error);
              Alert.alert('Error', 'Failed to select image. Please try again.');
            }
          } 
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };
  
  const uploadProfileImage = async (imageUri: string) => {
    try {
      setIsSaving(true);
      
      // Upload the image using the API
      const imageUrl = await userService.updateProfileImage(imageUri);
      
      // Update the profile with the new image URL
      if (profile && editedProfile && imageUrl) {
        const updatedProfile = {
          ...profile,
          profilePicture: imageUrl
        };
        
        setProfile(updatedProfile);
        setEditedProfile(updatedProfile);
      }
      
      setIsSaving(false);
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      setIsSaving(false);
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile || !editedProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.errorText}>Failed to load profile data</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setIsLoading(true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={isEditing ? handleCancelEdit : handleEditPress}
          disabled={isSaving}
        >
          <Text style={styles.actionButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileImageContainer}>
            {profile.profilePicture ? (
              <Image
                source={{ uri: profile.profilePicture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageInitial}>
                  {editedProfile.firstName.charAt(0)}
                </Text>
              </View>
            )}
            
            {isEditing && (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handleChangeProfileImage}
              >
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>First Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editedProfile.firstName}
                    onChangeText={(value) => handleChange('firstName', value)}
                    placeholder="Enter your first name"
                    placeholderTextColor="#A0A0A0"
                    editable={!isSaving}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.firstName}</Text>
                )}
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Last Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editedProfile.lastName}
                    onChangeText={(value) => handleChange('lastName', value)}
                    placeholder="Enter your last name"
                    placeholderTextColor="#A0A0A0"
                    editable={!isSaving}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.lastName}</Text>
                )}
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Gender</Text>
                {isEditing ? (
                  <View style={styles.radioContainer}>
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => handleChange('gender', 'Male')}
                    >
                      <View
                        style={[
                          styles.radioButton,
                          editedProfile.gender === 'Male' && styles.radioButtonSelected,
                        ]}
                      >
                        {editedProfile.gender === 'Male' && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Male</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.radioOption}
                      onPress={() => handleChange('gender', 'Female')}
                    >
                      <View
                        style={[
                          styles.radioButton,
                          editedProfile.gender === 'Female' && styles.radioButtonSelected,
                        ]}
                      >
                        {editedProfile.gender === 'Female' && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <Text style={styles.radioLabel}>Female</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.fieldValue}>{profile.gender || 'Not specified'}</Text>
                )}
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editedProfile.birthDate}
                    onChangeText={(value) => handleChange('birthDate', value)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#A0A0A0"
                    editable={!isSaving}
                  />
                ) : (
                  <Text style={styles.fieldValue}>
                    {profile.birthDate ? formatDate(profile.birthDate) : 'Not set'}
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editedProfile.phoneNumber}
                    onChangeText={(value) => handleChange('phoneNumber', value)}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="phone-pad"
                    editable={!isSaving}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.phoneNumber}</Text>
                )}
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.fieldInput}
                    value={editedProfile.email}
                    onChangeText={(value) => handleChange('email', value)}
                    placeholder="Enter your email address"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isSaving}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.email}</Text>
                )}
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Home Address</Text>
                {isEditing ? (
                  <TextInput
                    style={[styles.fieldInput, styles.textAreaInput]}
                    value={editedProfile.address}
                    onChangeText={(value) => handleChange('address', value)}
                    placeholder="Enter your home address"
                    placeholderTextColor="#A0A0A0"
                    multiline
                    numberOfLines={3}
                    editable={!isSaving}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile.address || 'No address set'}</Text>
                )}
              </View>
            </View>
            
            {isEditing && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                )}
              </TouchableOpacity>
            )}
            
            {!isEditing && (
              <>
                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={() => Alert.alert('Change Password', 'Change password functionality will be implemented in a future update.')}
                >
                  <Text style={styles.changePasswordText}>Change Password</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={async () => {
                    try {
                      // Show loading state
                      setIsLoading(true);
                      
                      // Attempt to logout
                      await authService.logout();
                      
                      // Reset navigation stack to Auth stack with AuthSuccess screen
                      navigation.reset({
                        index: 0,
                        routes: [{ 
                          name: 'Auth', 
                          params: { 
                            screen: 'AuthSuccess',
                            params: {
                              action: 'logout',
                              destination: 'Login'
                            } 
                          }
                        }],
                      });
                    } catch (error) {
                      console.error('Logout error:', error);
                      setIsLoading(false);
                      
                      // Show error message
                      Alert.alert('Error', 'Failed to log out. Please try again.');
                    }
                  }}
                >
                  <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2E86DE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  actionButton: {
    padding: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2E86DE',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2E86DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  changeImageButton: {
    marginTop: 8,
    padding: 8,
  },
  changeImageText: {
    fontSize: 14,
    color: '#2E86DE',
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333333',
  },
  fieldInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioContainer: {
    flexDirection: 'row',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2E86DE',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E86DE',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333333',
  },
  saveButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  changePasswordButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2E86DE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  changePasswordText: {
    color: '#2E86DE',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
