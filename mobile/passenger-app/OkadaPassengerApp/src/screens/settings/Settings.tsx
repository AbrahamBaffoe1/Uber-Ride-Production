import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  Switch,
  TextInput,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';

const SettingsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  // State for settings
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [dataUsage, setDataUsage] = useState('Standard');
  const [language, setLanguage] = useState('English');
  const [downloadOverWifi, setDownloadOverWifi] = useState(true);
  const [fontSize, setFontSize] = useState('Medium');
  
  // State for controlling section visibility
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Toggle section visibility
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  // Render a toggle setting
  const renderToggleSetting = (title, description, value, onValueChange) => (
    <View style={styles.settingItem}>
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        trackColor={{ false: "#767577", true: "#81b0ff" }}
        thumbColor={value ? "#3498db" : "#f4f3f4"}
        ios_backgroundColor="#3e3e3e"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
  
  // Render a dropdown setting (simplified with modal)
  const renderDropdownSetting = (title, description, value, options) => (
    <TouchableOpacity 
      style={styles.settingItem}
      onPress={() => {
        // In a full implementation, this would open a modal with options
        Alert.alert(
          `Select ${title}`,
          'This would show a picker in a complete implementation',
          options.map(option => ({
            text: option,
            onPress: () => {}
          }))
        );
      }}
    >
      <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <View style={styles.dropdownValueContainer}>
        <Text style={styles.dropdownValue}>{value}</Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </View>
    </TouchableOpacity>
  );
  
  // Sign out function
  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Sign Out", 
          onPress: () => console.log("User signed out") 
        }
      ]
    );
  };
  
  // Delete account function
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently removed. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => console.log("Account deletion requested"),
          style: "destructive" 
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </View>
      
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>John Doe</Text>
          <Text style={styles.profileEmail}>john.doe@example.com</Text>
          <TouchableOpacity style={styles.editProfileButton}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Settings Sections */}
      {/* Notifications Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('notifications')}
      >
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'notifications' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'notifications' && (
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'Push Notifications',
            'Receive notifications even when you\'re not using the app',
            pushNotifications,
            setPushNotifications
          )}
          
          {renderToggleSetting(
            'Email Notifications',
            'Receive updates and alerts via email',
            emailNotifications,
            setEmailNotifications
          )}
          
          <TouchableOpacity style={styles.advancedButton}>
            <Text style={styles.advancedButtonText}>Advanced Notification Settings</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Appearance Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('appearance')}
      >
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'appearance' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'appearance' && (
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'Dark Mode',
            'Use dark theme for the application',
            darkMode,
            setDarkMode
          )}
          
          {renderDropdownSetting(
            'Font Size',
            'Adjust the text size throughout the app',
            fontSize,
            ['Small', 'Medium', 'Large', 'Extra Large']
          )}
        </View>
      )}
      
      {/* Privacy Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('privacy')}
      >
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'privacy' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'privacy' && (
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'Location Services',
            'Allow app to access your location',
            locationServices,
            setLocationServices
          )}
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingDescription}>Review our Privacy Policy</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Data & Permissions</Text>
              <Text style={styles.settingDescription}>Manage app permissions and data usage</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Content & Media Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('content')}
      >
        <Text style={styles.sectionTitle}>Content & Media</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'content' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'content' && (
        <View style={styles.sectionContent}>
          {renderToggleSetting(
            'Autoplay Media',
            'Automatically play videos and audio',
            autoplay,
            setAutoplay
          )}
          
          {renderToggleSetting(
            'Download Over Wi-Fi Only',
            'Only download content when connected to Wi-Fi',
            downloadOverWifi,
            setDownloadOverWifi
          )}
          
          {renderDropdownSetting(
            'Data Usage',
            'Control how much data the app uses',
            dataUsage,
            ['Low', 'Standard', 'High', 'Unlimited']
          )}
        </View>
      )}
      
      {/* Language & Region Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('language')}
      >
        <Text style={styles.sectionTitle}>Language & Region</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'language' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'language' && (
        <View style={styles.sectionContent}>
          {renderDropdownSetting(
            'Language',
            'Select your preferred language',
            language,
            ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese']
          )}
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('CurrencySettings')}
          >
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Currency</Text>
              <Text style={styles.settingDescription}>Change your preferred currency for payments and fares</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Region Settings</Text>
              <Text style={styles.settingDescription}>Change your region and related preferences</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Help & Support Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('help')}
      >
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'help' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'help' && (
        <View style={styles.sectionContent}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>FAQ</Text>
              <Text style={styles.settingDescription}>Frequently asked questions</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Contact Support</Text>
              <Text style={styles.settingDescription}>Get help from our support team</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Report a Problem</Text>
              <Text style={styles.settingDescription}>Let us know if something isn't working</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* About Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('about')}
      >
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.sectionToggle}>{expandedSection === 'about' ? '−' : '+'}</Text>
      </TouchableOpacity>
      
      {expandedSection === 'about' && (
        <View style={styles.sectionContent}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>About Us</Text>
              <Text style={styles.settingDescription}>Learn more about our company</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
              <Text style={styles.settingDescription}>Review our Terms of Service</Text>
            </View>
            <Text style={styles.navigateIcon}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingDescription}>Current version installed</Text>
            </View>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>
        </View>
      )}
      
      {/* Account Actions */}
      <View style={styles.accountActionsSection}>
        <TouchableOpacity 
          style={styles.accountActionButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 Your Company. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerSection: {
    padding: 30,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#ecf0f1',
    fontStyle: 'italic',
  },
  profileSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  editProfileButton: {
    backgroundColor: '#3498db',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  sectionToggle: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  sectionContent: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  navigateIcon: {
    fontSize: 20,
    color: '#bdc3c7',
  },
  dropdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownValue: {
    fontSize: 16,
    color: '#3498db',
    marginRight: 5,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#3498db',
  },
  versionText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  advancedButton: {
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  advancedButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  accountActionsSection: {
    padding: 20,
    marginTop: 10,
  },
  accountActionButton: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498db',
  },
  deleteAccountButton: {
    backgroundColor: '#fff0f0',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  footer: {
    padding: 20,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#ecf0f1',
  },
});

export default SettingsScreen;
