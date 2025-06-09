// src/screens/safety/SafetyScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';

type SafetyScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Safety'>;
type SafetyScreenRouteProp = RouteProp<HomeStackParamList, 'Safety'>;

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

const SafetyScreen = () => {
  const navigation = useNavigation<SafetyScreenNavigationProp>();
  const route = useRoute<SafetyScreenRouteProp>();
  const { rideId } = route.params;
  
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  const [isPoliceLoading, setIsPoliceLoading] = useState(false);
  const [isMedicalLoading, setIsMedicalLoading] = useState(false);
  const [isRoadAssistanceLoading, setIsRoadAssistanceLoading] = useState(false);
  
  // Mocked emergency contacts - in a real app, these would come from the API
  const emergencyContacts: EmergencyContact[] = [
    {
      id: '1',
      name: 'James Smith',
      phone: '+234 812 345 6789',
      relationship: 'Brother',
    },
    {
      id: '2',
      name: 'Mary Johnson',
      phone: '+234 809 876 5432',
      relationship: 'Sister',
    },
  ];

  const handleEmergencyAlert = async () => {
    setIsEmergencyLoading(true);
    
    try {
      // In a real app, this would call the API to trigger emergency alert
      // const response = await safetyService.triggerEmergencyAlert(rideId);
      
      // Simulate API call
      setTimeout(() => {
        setIsEmergencyLoading(false);
        Alert.alert(
          'Emergency Alert Sent',
          'Emergency services and your emergency contacts have been notified.',
          [{ text: 'OK' }]
        );
      }, 1500);
    } catch (error) {
      setIsEmergencyLoading(false);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    }
  };

  const handleCallPolice = () => {
    setIsPoliceLoading(true);
    // In a real app, this would trigger a phone call
    setTimeout(() => {
      setIsPoliceLoading(false);
      Alert.alert('Calling Police', 'Connecting to emergency services (999)...');
    }, 1000);
  };

  const handleCallMedical = () => {
    setIsMedicalLoading(true);
    // In a real app, this would trigger a phone call
    setTimeout(() => {
      setIsMedicalLoading(false);
      Alert.alert('Calling Medical Services', 'Connecting to medical emergency (112)...');
    }, 1000);
  };

  const handleCallRoadAssistance = () => {
    setIsRoadAssistanceLoading(true);
    // In a real app, this would trigger a phone call
    setTimeout(() => {
      setIsRoadAssistanceLoading(false);
      Alert.alert('Calling Road Assistance', 'Connecting to road assistance...');
    }, 1000);
  };

  const handleCallContact = (contact: EmergencyContact) => {
    // In a real app, this would trigger a phone call
    Alert.alert(
      'Call Emergency Contact',
      `Calling ${contact.name} at ${contact.phone}...`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E74C3C" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../../assets/images/back-arrow-white.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency & Safety</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.emergencySection}>
          <TouchableOpacity
            style={[
              styles.emergencyButton,
              isEmergencyLoading && styles.buttonDisabled,
            ]}
            onPress={handleEmergencyAlert}
            disabled={isEmergencyLoading}
          >
            {isEmergencyLoading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Image
                  source={require('../../../assets/images/warning-icon.png')}
                  style={styles.emergencyIcon}
                />
                <Text style={styles.emergencyButtonText}>
                  EMERGENCY ALERT
                </Text>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.emergencyDescription}>
            Tap the button above to alert emergency services and your emergency contacts.
            Your current location will be shared automatically.
          </Text>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Emergency Services</Text>
        </View>

        <View style={styles.emergencyServicesContainer}>
          <TouchableOpacity
            style={styles.serviceCard}
            onPress={handleCallPolice}
            disabled={isPoliceLoading}
          >
            <View style={[styles.serviceIconContainer, styles.policeColor]}>
              {isPoliceLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Image
                  source={require('../../../assets/images/police-icon.png')}
                  style={styles.serviceIcon}
                />
              )}
            </View>
            <Text style={styles.serviceTitle}>Police</Text>
            <Text style={styles.servicePhone}>999</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={handleCallMedical}
            disabled={isMedicalLoading}
          >
            <View style={[styles.serviceIconContainer, styles.medicalColor]}>
              {isMedicalLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Image
                  source={require('../../../assets/images/medical-icon.png')}
                  style={styles.serviceIcon}
                />
              )}
            </View>
            <Text style={styles.serviceTitle}>Medical</Text>
            <Text style={styles.servicePhone}>112</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            onPress={handleCallRoadAssistance}
            disabled={isRoadAssistanceLoading}
          >
            <View style={[styles.serviceIconContainer, styles.roadAssistanceColor]}>
              {isRoadAssistanceLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Image
                  source={require('../../../assets/images/assistance-icon.png')}
                  style={styles.serviceIcon}
                />
              )}
            </View>
            <Text style={styles.serviceTitle}>Road Assistance</Text>
            <Text style={styles.servicePhone}>0800 123 456</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Emergency Contacts</Text>
        </View>

        <View style={styles.contactsContainer}>
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.contactCard}
                onPress={() => handleCallContact(contact)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <View style={styles.callIconContainer}>
                  <Image
                    source={require('../../../assets/images/phone-icon.png')}
                    style={styles.callIcon}
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noContactsContainer}>
              <Text style={styles.noContactsText}>
                No emergency contacts added yet.
              </Text>
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.addContactButtonText}>Add Contacts</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.safetyTipsContainer}>
          <Text style={styles.safetyTipsTitle}>Safety Tips</Text>
          
          <View style={styles.safetyTipItem}>
            <Text style={styles.safetyTipNumber}>1</Text>
            <Text style={styles.safetyTipText}>
              Always wear appropriate safety gear, including a helmet.
            </Text>
          </View>
          
          <View style={styles.safetyTipItem}>
            <Text style={styles.safetyTipNumber}>2</Text>
            <Text style={styles.safetyTipText}>
              Obey traffic laws and avoid speeding.
            </Text>
          </View>
          
          <View style={styles.safetyTipItem}>
            <Text style={styles.safetyTipNumber}>3</Text>
            <Text style={styles.safetyTipText}>
              Maintain a safe distance from other vehicles.
            </Text>
          </View>
          
          <View style={styles.safetyTipItem}>
            <Text style={styles.safetyTipNumber}>4</Text>
            <Text style={styles.safetyTipText}>
              Do not use your phone while riding.
            </Text>
          </View>
          
          <View style={styles.safetyTipItem}>
            <Text style={styles.safetyTipNumber}>5</Text>
            <Text style={styles.safetyTipText}>
              Ensure your vehicle is in good condition before starting your ride.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#E74C3C',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  emergencySection: {
    padding: 24,
    backgroundColor: '#FFF5F5',
  },
  emergencyButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row',
  },
  emergencyIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
    tintColor: '#FFFFFF',
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  sectionTitle: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F9F9F9',
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  emergencyServicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  serviceCard: {
    alignItems: 'center',
    width: '30%',
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  policeColor: {
    backgroundColor: '#3498DB',
  },
  medicalColor: {
    backgroundColor: '#E74C3C',
  },
  roadAssistanceColor: {
    backgroundColor: '#F39C12',
  },
  serviceIcon: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  servicePhone: {
    fontSize: 12,
    color: '#666666',
  },
  contactsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#333333',
  },
  callIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E86DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  noContactsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noContactsText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  addContactButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addContactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  safetyTipsContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 24,
  },
  safetyTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  safetyTipItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  safetyTipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F2',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginRight: 12,
  },
  safetyTipText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
});

export default SafetyScreen;