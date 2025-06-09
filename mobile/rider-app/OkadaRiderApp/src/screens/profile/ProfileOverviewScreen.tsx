
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { authService } from '../../api/services/authService';
import { userService } from '../../api/services/user.service';

// Create a composite navigation type that includes both MainTabParamList (for 'Profile')
// and RootStackParamList (which includes 'Auth').
type ProfileOverviewScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<MainTabParamList, 'Profile'>,
  StackNavigationProp<RootStackParamList>
>;

interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  totalRides: number;
  profileImage: string | null;
  isOnline: boolean;
  isVerified: boolean;
  joinedDate: string;
}

const ProfileOverviewScreen = () => {
  const navigation = useNavigation<ProfileOverviewScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<RiderProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get the current authenticated user
        const currentUser = await authService.getCurrentUser();
        
        if (!currentUser) {
          throw new Error('User not authenticated');
        }
        
        // Get additional user profile data if needed
        const userProfile = await userService.getProfile();
        
        // Determine join date
        const joinDate = currentUser.createdAt ? 
          new Date(currentUser.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          }) : 
          'Recent member';
        
        // Set profile data from real user data
        setProfile({
          id: currentUser._id,
          name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
          phone: currentUser.phoneNumber || '',
          email: currentUser.email || '',
          rating: userProfile?.riderProfile?.averageRating || 0,
          totalRides: userProfile?.riderProfile?.completedRides || 0,
          profileImage: currentUser.profilePicture || null,
          isOnline: true,
          isVerified: currentUser.isEmailVerified || currentUser.isPhoneVerified || false,
          joinedDate: joinDate,
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => {
            // Call the actual logout API
            authService.logout().then(() => {
              // Use correct type casting for navigation to RootStackParamList
              (navigation as unknown as StackNavigationProp<RootStackParamList>).reset({
                index: 0,
                routes: [{ 
                  name: 'Auth',
                  params: { screen: 'AuthSuccess', params: { action: 'logout', destination: 'Login' } }
                }],
              });
            }).catch(error => {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            });
          },
        },
      ]
    );
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

  if (!profile) {
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
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <ScrollView>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {profile.profileImage ? (
              <Image 
                source={{ uri: profile.profileImage }} 
                style={styles.profileImage} 
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageInitial}>
                  {profile.name.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.profileName}>{profile.name}</Text>
          
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{profile.rating}</Text>
            <Image
              source={require('../../../assets/images/star.png')}
              style={styles.starIcon}
            />
            <Text style={styles.ridesText}>({profile.totalRides} rides)</Text>
          </View>
          
          <Text style={styles.joinedText}>Joined {profile.joinedDate}</Text>
          
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('History')}
          >
            <Image
              source={require('../../../assets/images/history-icon.png')}
              style={styles.menuIcon}
            />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Ride History</Text>
              <Text style={styles.menuDescription}>View your past rides</Text>
            </View>
            <Image
              source={require('../../../assets/images/arrow-right.png')}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Image
              source={require('../../../assets/images/earnings-icon.png')}
              style={styles.menuIcon}
            />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Earnings</Text>
              <Text style={styles.menuDescription}>Manage your earnings</Text>
            </View>
            <Image
              source={require('../../../assets/images/arrow-right.png')}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Compliance')}
          >
            <Image
              source={require('../../../assets/images/document-icon.png')}
              style={styles.menuIcon}
            />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Documents & Compliance</Text>
              <Text style={styles.menuDescription}>View and update your documents</Text>
            </View>
            <Image
              source={require('../../../assets/images/arrow-right.png')}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Image
              source={require('../../../assets/images/settings-icon.png')}
              style={styles.menuIcon}
            />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Settings</Text>
              <Text style={styles.menuDescription}>App preferences and account settings</Text>
            </View>
            <Image
              source={require('../../../assets/images/arrow-right.png')}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Support')}
          >
            <Image
              source={require('../../../assets/images/support-icon.png')}
              style={styles.menuIcon}
            />
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuDescription}>Get assistance and support</Text>
            </View>
            <Image
              source={require('../../../assets/images/arrow-right.png')}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E86DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 4,
  },
  starIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  ridesText: {
    fontSize: 14,
    color: '#666666',
  },
  joinedText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2E86DE',
    borderRadius: 8,
  },
  editProfileButtonText: {
    fontSize: 14,
    color: '#2E86DE',
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#666666',
  },
  arrowIcon: {
    width: 16,
    height: 16,
    tintColor: '#666666',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999999',
    marginBottom: 24,
  },
});

export default ProfileOverviewScreen;
