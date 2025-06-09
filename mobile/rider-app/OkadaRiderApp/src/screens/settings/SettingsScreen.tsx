// src/screens/settings/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';

type SettingsScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Settings'>;

interface SettingsState {
  notifications: {
    rideRequests: boolean;
    earnings: boolean;
    promotions: boolean;
    systemUpdates: boolean;
  };
  privacy: {
    locationSharing: boolean;
    dataCollection: boolean;
  };
  appearance: {
    darkMode: boolean;
    language: string;
  };
}

const SettingsScreen = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      rideRequests: true,
      earnings: true,
      promotions: false,
      systemUpdates: true,
    },
    privacy: {
      locationSharing: true,
      dataCollection: true,
    },
    appearance: {
      darkMode: false,
      language: 'English',
    },
  });

  useEffect(() => {
    // In a real app, this would fetch settings from API or local storage
    const fetchSettings = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          // Already initialized with default values above
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleToggleNotification = (key: keyof typeof settings.notifications) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      notifications: {
        ...prevSettings.notifications,
        [key]: !prevSettings.notifications[key],
      },
    }));
  };

  const handleTogglePrivacy = (key: keyof typeof settings.privacy) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      privacy: {
        ...prevSettings.privacy,
        [key]: !prevSettings.privacy[key],
      },
    }));
  };

  const handleToggleDarkMode = () => {
    setSettings(prevSettings => ({
      ...prevSettings,
      appearance: {
        ...prevSettings.appearance,
        darkMode: !prevSettings.appearance.darkMode,
      },
    }));
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Select Language',
      'Choose your preferred language',
      [
        { text: 'English', onPress: () => setLanguage('English') },
        { text: 'Français', onPress: () => setLanguage('Français') },
        { text: 'Yoruba', onPress: () => setLanguage('Yoruba') },
        { text: 'Hausa', onPress: () => setLanguage('Hausa') },
        { text: 'Igbo', onPress: () => setLanguage('Igbo') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const setLanguage = (language: string) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      appearance: {
        ...prevSettings.appearance,
        language,
      },
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would save settings to API or local storage
      // await settingsService.saveSettings(settings);
      
      // Simulate API call
      setTimeout(() => {
        setIsSaving(false);
        Alert.alert('Success', 'Settings saved successfully');
      }, 1000);
    } catch (error) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Ride Requests</Text>
              <Text style={styles.settingDescription}>Get notified about new ride requests</Text>
            </View>
            <Switch
              value={settings.notifications.rideRequests}
              onValueChange={() => handleToggleNotification('rideRequests')}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.notifications.rideRequests ? '#27AE60' : '#F4F4F4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Earnings</Text>
              <Text style={styles.settingDescription}>Get notified about earnings and payments</Text>
            </View>
            <Switch
              value={settings.notifications.earnings}
              onValueChange={() => handleToggleNotification('earnings')}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.notifications.earnings ? '#27AE60' : '#F4F4F4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Promotions</Text>
              <Text style={styles.settingDescription}>Get notified about promotions and offers</Text>
            </View>
            <Switch
              value={settings.notifications.promotions}
              onValueChange={() => handleToggleNotification('promotions')}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.notifications.promotions ? '#27AE60' : '#F4F4F4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>System Updates</Text>
              <Text style={styles.settingDescription}>Get notified about app updates and maintenance</Text>
            </View>
            <Switch
              value={settings.notifications.systemUpdates}
              onValueChange={() => handleToggleNotification('systemUpdates')}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.notifications.systemUpdates ? '#27AE60' : '#F4F4F4'}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location Sharing</Text>
              <Text style={styles.settingDescription}>Share your location with passengers</Text>
            </View>
            <Switch
              value={settings.privacy.locationSharing}
              onValueChange={() => handleTogglePrivacy('locationSharing')}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.privacy.locationSharing ? '#27AE60' : '#F4F4F4'}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Data Collection</Text>
              <Text style={styles.settingDescription}>Allow anonymous usage data collection for app improvement</Text>
            </View>
            <Switch
              value={settings.privacy.dataCollection}
              onValueChange={() => handleTogglePrivacy('dataCollection')}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.privacy.dataCollection ? '#27AE60' : '#F4F4F4'}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Use dark theme for the app</Text>
            </View>
            <Switch
              value={settings.appearance.darkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: '#D1D1D6', true: '#BDE3C9' }}
              thumbColor={settings.appearance.darkMode ? '#27AE60' : '#F4F4F4'}
            />
          </View>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLanguageChange}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingDescription}>Set your preferred language</Text>
            </View>
            <View style={styles.valueContainer}>
              <Text style={styles.valueText}>{settings.appearance.language}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Edit Profile</Text>
              <Text style={styles.settingDescription}>Update your personal information</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Alert.alert('Change Password', 'Would you like to change your password?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Change Password', onPress: () => {/* Handle password change */} },
            ])}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingDescription}>Update your account password</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {/* Navigate to Terms of Service */}}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {/* Navigate to Privacy Policy */}}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {/* Navigate to About */}}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>About Okada</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: '#2E86DE',
    marginRight: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#CCCCCC',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#999999',
  },
  saveButton: {
    backgroundColor: '#2E86DE',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#92C5EB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;