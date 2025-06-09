import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import CurvyFooter from '../../components/common/CurvyFooter';
import { userService, UserProfile } from '../../api/services/user.service';
import { authService } from '../../api/services/authService';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User data that will be populated from API
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    createdAt: new Date().toISOString(), // Default to current date
    rating: 0,
    profilePicture: null as string | null, // Will use placeholder if null
  });
  
  // Fetch user profile on component mount
  useEffect(() => {
    let isMounted = true;
    let authUnsubscribe: (() => void) | null = null;
    
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Set up auth state listener to get real-time user updates
        authUnsubscribe = authService.onAuthStateChanged((currentUser) => {
          if (!isMounted) return;
          
          if (!currentUser) {
            setError('User not authenticated');
            setIsLoading(false);
            return;
          }
          
          // Use basic user info from auth service immediately
          setUser({
            firstName: currentUser.firstName || '',
            lastName: currentUser.lastName || '',
            email: currentUser.email || '',
            phoneNumber: currentUser.phoneNumber || '',
            createdAt: currentUser.createdAt ? new Date(currentUser.createdAt).toISOString() : new Date().toISOString(),
            rating: 4.8, // Default rating until we get it from API
            profilePicture: null,
          });
          
          // Then fetch complete profile data in background
          userService.getProfile()
            .then((profileResponse) => {
              if (!isMounted) return;
              
              if (profileResponse && profileResponse.data) {
                const profile = profileResponse.data;
                
                // Update with complete profile data
                setUser(prevUser => ({
                  ...prevUser,
                  firstName: profile.firstName || prevUser.firstName || '',
                  lastName: profile.lastName || prevUser.lastName || '',
                  email: profile.email || prevUser.email || '',
                  phoneNumber: profile.phoneNumber || prevUser.phoneNumber || '',
                  createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : prevUser.createdAt,
                  profilePicture: profile.profilePicture || prevUser.profilePicture,
                  // Add any other profile-specific fields
                }));
              }
              setIsLoading(false);
            })
            .catch((err) => {
              if (!isMounted) return;
              
              console.error('Error fetching detailed profile:', err);
              // We already have basic user info, so just mark loading as complete
              setIsLoading(false);
            });
        });
        
        // Also explicitly try to get current user to trigger auth state
        await authService.getCurrentUser();
      } catch (err) {
        if (!isMounted) return;
        
        console.error('Error in profile loading process:', err);
        setError('Failed to load profile. Please try again.');
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (authUnsubscribe) authUnsubscribe();
    };
  }, []);
  
  // Section renderer
  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
  
  // Menu item renderer
  const renderMenuItem = (
    icon: any, // Changed from string to any to accept any icon name
    label: string, 
    value?: string,
    showChevron: boolean = true,
    onPress?: () => void,
    iconColor: string = '#6B7280',
    iconComponent: any = Ionicons
  ) => {
    const IconComponent = iconComponent;
    
    return (
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.menuItemIcon}>
          <IconComponent name={icon} size={20} color={iconColor} />
        </View>
        
        <Text style={styles.menuItemLabel}>{label}</Text>
        
        <View style={styles.menuItemRight}>
          {value && <Text style={styles.menuItemValue}>{value}</Text>}
          {showChevron && (
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Toggle menu item renderer
  const renderToggleItem = (
    icon: any, // Changed from string to any to accept any icon name
    label: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    iconColor: string = '#6B7280'
  ) => (
    <View style={styles.menuItem}>
      <View style={styles.menuItemIcon}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      
      <Text style={styles.menuItemLabel}>{label}</Text>
      
      <View style={styles.menuItemRight}>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: '#7AC231' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
  
  // Render footer tabs
  const renderFooterTabs = () => (
    <>
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="home-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>Bookings</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="time-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>History</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.footerTab, styles.footerTabActive]}>
        <Ionicons name="person" size={24} color="#7AC231" />
        <Text style={[styles.footerTabText, styles.footerTabTextActive]}>Profile</Text>
      </TouchableOpacity>
    </>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="settings-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#7AC231" style={styles.avatar} />
            ) : user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.firstName && user.lastName 
                    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() 
                    : '?'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : "Complete Your Profile"}
            </Text>
            {user.rating > 0 ? (
              <View style={styles.userRating}>
                <Ionicons name="star" size={16} color="#FFC107" />
                <Text style={styles.userRatingText}>{user.rating}</Text>
              </View>
            ) : null}
            {user.createdAt ? (
              <Text style={styles.userSince}>Member since {new Date(user.createdAt).toLocaleDateString()}</Text>
            ) : (
              <Text style={styles.userSince}>New User</Text>
            )}
          </View>
        </View>
        
        {/* Personal Info */}
        {renderSection('Personal Information', (
          <>
            {renderMenuItem('mail-outline', 'Email', user.email || 'Not set', false)}
            {renderMenuItem('call-outline', 'Phone', user.phoneNumber || 'Not set', false)}
            {renderMenuItem('create-outline', 'Edit Profile', undefined, true, () => {})}
          </>
        ))}
        
        {/* Account Settings */}
        {renderSection('Account Settings', (
          <>
            {renderMenuItem('card-outline', 'Payment Methods', undefined, true, () => {})}
            {renderMenuItem('location-outline', 'Saved Addresses', undefined, true, () => {
              navigation.navigate('SavedLocations');
            })}
            {renderMenuItem('language-outline', 'Language', 'English', true, () => {})}
            {renderToggleItem(
              'notifications-outline',
              'Notifications',
              notificationsEnabled,
              setNotificationsEnabled
            )}
            {renderToggleItem(
              'moon-outline',
              'Dark Mode',
              darkModeEnabled,
              setDarkModeEnabled
            )}
          </>
        ))}
        
        {/* Safety & Security */}
        {renderSection('Safety & Security', (
          <>
            {renderMenuItem('shield-checkmark-outline', 'Emergency Contacts', undefined, true, () => {})}
            {renderMenuItem('finger-print', 'Biometric Authentication', 'Off', true, () => {})}
            {renderMenuItem('lock-closed-outline', 'Change Password', undefined, true, () => {})}
          </>
        ))}
        
        {/* Support & About */}
        {renderSection('Support & About', (
          <>
            {renderMenuItem('help-circle-outline', 'Help & Support', undefined, true, () => {})}
            {renderMenuItem('document-text-outline', 'Terms of Service', undefined, true, () => {})}
            {renderMenuItem('shield-outline', 'Privacy Policy', undefined, true, () => {})}
            {renderMenuItem('information-circle-outline', 'About Okada', undefined, true, () => {})}
          </>
        ))}
        
        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            try {
              // Display loading indicator
              setIsLoading(true);
              
              // Attempt to logout
              await authService.logout();
              
              // Navigate to success screen
              navigation.navigate('AuthSuccess', {
                action: 'logout',
                destination: 'Login',
                message: 'You have been logged out successfully.'
              });
            } catch (err) {
              console.error('Logout error:', err);
              
              // Navigate to error screen
              navigation.navigate('AuthError', {
                error: 'Failed to log out. Please try again.',
                action: 'logout',
                retryDestination: 'Profile'
              });
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
      
      {/* Curvy Footer */}
      <CurvyFooter
        backgroundColor="#18181B"
        height={60}
        blurIntensity={15}
      >
        {renderFooterTabs()}
      </CurvyFooter>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100, // Extra space for footer
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7AC231',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  userRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userRatingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginLeft: 4,
  },
  userSince: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginHorizontal: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  footerTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  footerTabActive: {
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    borderRadius: 20,
  },
  footerTabText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footerTabTextActive: {
    color: '#7AC231',
    fontWeight: '500',
  },
});

export default ProfileScreen;
