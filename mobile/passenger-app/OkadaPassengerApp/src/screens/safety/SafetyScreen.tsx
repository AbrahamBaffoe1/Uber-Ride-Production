import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CurvyFooter from '../../components/common/CurvyFooter';

export const SafetyScreen: React.FC = () => {
  const navigation = useNavigation();
  const [shareLocation, setShareLocation] = useState(false);
  
  // Mock emergency contacts
  const emergencyContacts = [
    { id: '1', name: 'Police', phone: '112', icon: 'shield' },
    { id: '2', name: 'Ambulance', phone: '112', icon: 'medkit' },
    { id: '3', name: 'Okada Support', phone: '+234 700 111 2222', icon: 'headset' },
    { id: '4', name: 'Adebola Johnson', phone: '+234 801 234 5678', icon: 'person', relation: 'Brother' },
  ];
  
  // Handle emergency call
  const handleEmergencyCall = (contact: { name: string; phone: string }) => {
    Alert.alert(
      'Emergency Call',
      `Call ${contact.name} at ${contact.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call', 
          onPress: () => {
            // In a real app, this would initiate a phone call
            console.log(`Calling ${contact.name} at ${contact.phone}`);
          },
          style: 'destructive' 
        },
      ]
    );
  };
  
  // Handle SOS button press
  const handleSOSPress = () => {
    Alert.alert(
      'Emergency SOS',
      'This will alert emergency services and your emergency contacts with your current location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send SOS', 
          onPress: () => {
            // In a real app, this would send emergency alerts
            console.log('Sending SOS alert');
          },
          style: 'destructive' 
        },
      ]
    );
  };
  
  // Render safety feature item
  const renderSafetyFeature = (
    icon: any, 
    title: string, 
    description: string,
    onPress?: () => void,
    iconColor: string = '#1F2937',
    iconComponent: any = Ionicons
  ) => {
    const IconComponent = iconComponent;
    
    return (
      <TouchableOpacity 
        style={styles.featureItem}
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.featureIconContainer}>
          <IconComponent name={icon} size={24} color={iconColor} />
        </View>
        
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };
  
  // Render emergency contact item
  const renderEmergencyContact = (
    contact: {
      id: string;
      name: string;
      phone: string;
      icon: any;
      relation?: string;
    }
  ) => (
    <TouchableOpacity 
      key={contact.id}
      style={styles.contactItem}
      onPress={() => handleEmergencyCall(contact)}
    >
      <View style={styles.contactIconContainer}>
        <Ionicons name={contact.icon as any} size={24} color="#1F2937" />
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
        {contact.relation && (
          <Text style={styles.contactRelation}>{contact.relation}</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.callButton}
        onPress={() => handleEmergencyCall(contact)}
      >
        <Ionicons name="call" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
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
      
      <TouchableOpacity style={styles.footerTabCenter}>
        <View style={styles.sosButton}>
          <Text style={styles.sosButtonText}>SOS</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="time-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>History</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="person-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>Profile</Text>
      </TouchableOpacity>
    </>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Safety Center</Text>
        
        <View style={styles.spacer} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* SOS Button */}
        <TouchableOpacity 
          style={styles.sosButtonLarge}
          onPress={handleSOSPress}
        >
          <Text style={styles.sosButtonLargeText}>Emergency SOS</Text>
        </TouchableOpacity>
        
        <Text style={styles.sosDescription}>
          Tap the Emergency SOS button to alert emergency services and your emergency contacts with your current location.
        </Text>
        
        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.contactsList}>
            {emergencyContacts.map(contact => renderEmergencyContact(contact))}
          </View>
          
          <TouchableOpacity style={styles.addContactButton}>
            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.addContactText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        </View>
        
        {/* Safety Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Features</Text>
          
          <View style={styles.featuresList}>
            {renderSafetyFeature(
              'shield-checkmark-outline',
              'Ride Check',
              'Automatic detection of unexpected stops or route deviations.'
            )}
            
            {renderSafetyFeature(
              'share-social-outline',
              'Share Trip Status',
              'Share your trip details and real-time location with trusted contacts.'
            )}
            
            {renderSafetyFeature(
              'recording-outline',
              'Audio Recording',
              'Record audio during trips for safety. Recordings are encrypted and only accessible in emergencies.',
              () => {
                // Toggle audio recording permission
              }
            )}
            
            {renderSafetyFeature(
              'location-outline',
              'Location Sharing',
              'Share your location with emergency services when you send an SOS.',
              () => setShareLocation(!shareLocation)
            )}
          </View>
        </View>
        
        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <MaterialIcons name="verified-user" size={20} color="#10B981" style={styles.tipIcon} />
              <Text style={styles.tipText}>
                Verify your driver's identity, license number, and vehicle details before entering the vehicle.
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <MaterialIcons name="location-on" size={20} color="#10B981" style={styles.tipIcon} />
              <Text style={styles.tipText}>
                Share your trip status with friends or family for longer journeys.
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <MaterialIcons name="star" size={20} color="#10B981" style={styles.tipIcon} />
              <Text style={styles.tipText}>
                Rate your trips and provide feedback to help maintain service quality.
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <MaterialIcons name="report-problem" size={20} color="#10B981" style={styles.tipIcon} />
              <Text style={styles.tipText}>
                Report any safety concerns or incidents immediately through the app.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Curvy Footer with SOS*/}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra space for footer
  },
  sosButtonLarge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sosButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sosDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  contactsList: {
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactRelation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  addContactText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginLeft: 8,
  },
  featuresList: {},
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  tipsList: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 15,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  tipIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  footerTab: {
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  footerTabCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerTabText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default SafetyScreen;
