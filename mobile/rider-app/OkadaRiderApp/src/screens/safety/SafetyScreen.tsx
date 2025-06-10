import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import safetyService, { EmergencyContact } from '../../api/services/safety.service';
import { colors } from '../../styles/theme';

const SafetyScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [activeSOSId, setActiveSOSId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Fetch emergency contacts and active SOS alerts on mount
  useEffect(() => {
    fetchEmergencyContacts();
    fetchActiveSOS();
    getLocation();
  }, []);

  // Get current location
  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Safety features require location access to send your position during emergencies.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Some safety features may be limited.'
      );
    }
  };

  // Fetch emergency contacts
  const fetchEmergencyContacts = async () => {
    try {
      setLoading(true);
      const contacts = await safetyService.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active SOS alerts
  const fetchActiveSOS = async () => {
    try {
      const activeAlerts = await safetyService.getActiveSOS();
      if (activeAlerts.length > 0) {
        setActiveSOSId(activeAlerts[0].id || null);
      }
    } catch (error) {
      console.error('Error fetching active SOS alerts:', error);
    }
  };

  // Trigger SOS alert
  const triggerSOS = async () => {
    if (!location) {
      Alert.alert(
        'Location Required',
        'We need your location to send an SOS alert. Please enable location services.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirm Emergency',
      'Are you in an emergency situation? This will alert emergency contacts and support.',
      [
        { 
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'YES, SEND SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await safetyService.triggerSOS(
                location,
                'Emergency assistance needed'
              );
              
              if (result && result.sosId) {
                setActiveSOSId(result.sosId);
                Alert.alert(
                  'SOS Alert Sent',
                  'Emergency contacts and support have been notified. Help is on the way.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('Error triggering SOS:', error);
              Alert.alert(
                'SOS Alert Failed',
                'Unable to send SOS alert. Please try calling emergency services directly.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Cancel SOS alert
  const cancelSOS = async () => {
    if (!activeSOSId) return;

    Alert.alert(
      'Cancel SOS Alert',
      'Are you sure you want to cancel the active SOS alert? Only do this if you are safe.',
      [
        { 
          text: 'No, Keep Active',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel Alert',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await safetyService.cancelSOS(activeSOSId, 'Cancelled by user');
              
              if (success) {
                setActiveSOSId(null);
                Alert.alert('SOS Alert Cancelled', 'Your SOS alert has been cancelled.');
              }
            } catch (error) {
              console.error('Error cancelling SOS:', error);
              Alert.alert('Error', 'Failed to cancel SOS alert. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Call emergency services
  const callEmergencyServices = () => {
    Alert.alert(
      'Call Emergency Services',
      'This will call the local emergency number (911/112/999).',
      [
        { 
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            // Use appropriate emergency number based on region
            const emergencyNumber = '911'; // Default to US
            Linking.openURL(`tel:${emergencyNumber}`);
          }
        }
      ]
    );
  };

  // Navigate to add emergency contact screen
  const navigateToAddContact = () => {
    // This would be implemented separately
    Alert.alert('Add Contact', 'Navigate to add emergency contact screen');
  };

  // Report safety incident
  const reportIncident = () => {
    // This would be implemented separately
    Alert.alert('Report Incident', 'Navigate to report safety incident screen');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Center</Text>
      </View>

      {/* SOS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Assistance</Text>
        
        {activeSOSId ? (
          <View style={styles.activeSOSContainer}>
            <Text style={styles.activeSOSText}>
              SOS ALERT ACTIVE
            </Text>
            <Text style={styles.activeSOSSubtext}>
              Emergency contacts and support have been notified
            </Text>
            <TouchableOpacity 
              style={styles.cancelSOSButton}
              onPress={cancelSOS}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cancelSOSButtonText}>CANCEL SOS ALERT</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sosButtonsContainer}>
            <TouchableOpacity 
              style={styles.sosButton}
              onPress={triggerSOS}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="warning" size={24} color="#fff" />
                  <Text style={styles.sosButtonText}>SOS ALERT</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.callButton}
              onPress={callEmergencyServices}
            >
              <Ionicons name="call" size={24} color="#fff" />
              <Text style={styles.callButtonText}>CALL EMERGENCY</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Emergency Contacts Section */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={navigateToAddContact}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <>
            {emergencyContacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No emergency contacts added. Add contacts who should be notified in case of emergency.
                </Text>
              </View>
            ) : (
              emergencyContacts.map((contact, index) => (
                <View key={contact.id || index} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                    <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity style={styles.contactActionButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}
      </View>

      {/* Safety Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Features</Text>
        
        <TouchableOpacity style={styles.featureCard} onPress={reportIncident}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.primary} />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Report Safety Concern</Text>
            <Text style={styles.featureDescription}>
              Report unsafe conditions, harassment, or other incidents
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.featureCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Safety Checklist</Text>
            <Text style={styles.featureDescription}>
              Review safety tips and best practices
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.featureCard}>
          <Ionicons name="location-outline" size={24} color={colors.primary} />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Share Live Location</Text>
            <Text style={styles.featureDescription}>
              Share your location with trusted contacts
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    borderRadius: 8,
    marginHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sosButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sosButton: {
    flex: 1,
    backgroundColor: 'red',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sosButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  callButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  activeSOSContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'red',
    alignItems: 'center',
  },
  activeSOSText: {
    color: 'red',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
  },
  activeSOSSubtext: {
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  cancelSOSButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  cancelSOSButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  contactCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactRelationship: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  contactActionButton: {
    padding: 8,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginVertical: 20,
  },
});

export default SafetyScreen;
