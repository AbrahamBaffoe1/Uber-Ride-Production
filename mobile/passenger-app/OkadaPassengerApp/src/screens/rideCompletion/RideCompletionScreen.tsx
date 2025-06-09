import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type RideCompletionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RideCompletion'
>;
type RideCompletionScreenRouteProp = RouteProp<
  RootStackParamList,
  'RideCompletion'
>;

const { width } = Dimensions.get('window');

const RideCompletionScreen = () => {
  const navigation = useNavigation<RideCompletionScreenNavigationProp>();
  const route = useRoute<RideCompletionScreenRouteProp>();
  const { rideId, riderName, pickupName, dropoffName, fare, paymentMethod } = route.params;
  
  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  
  const handleViewReceipt = () => {
    // This would navigate to a receipt screen in a real app
    console.log('View receipt for ride:', rideId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={50} color="#FFFFFF" />
          </View>
        </View>
        
        {/* Completion Message */}
        <Text style={styles.title}>Ride Completed!</Text>
        <Text style={styles.subtitle}>Thank you for riding with Okada</Text>
        
        {/* Ride Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Ride Summary</Text>
            <Text style={styles.summaryId}>ID: {rideId.substring(0, 8)}</Text>
          </View>
          
          {/* Ride Info */}
          <View style={styles.locationInfo}>
            <View style={styles.locationItem}>
              <View style={styles.locationDot} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationName}>{pickupName}</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.locationItem}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationName}>{dropoffName}</Text>
              </View>
            </View>
          </View>
          
          {/* Driver Info */}
          <View style={styles.driverInfo}>
            <Text style={styles.driverInfoLabel}>Driver</Text>
            <Text style={styles.driverName}>{riderName}</Text>
          </View>
          
          {/* Payment Info */}
          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Fare</Text>
              <Text style={styles.paymentValue}>{fare}</Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>{paymentMethod}</Text>
            </View>
          </View>
        </View>
        
        {/* Receipt Button */}
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={handleViewReceipt}
        >
          <Ionicons name="receipt-outline" size={20} color="#0066cc" style={styles.receiptIcon} />
          <Text style={styles.receiptButtonText}>View Receipt</Text>
        </TouchableOpacity>
        
        {/* Home Button */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={handleGoHome}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  summaryCard: {
    width: width - 40,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  summaryId: {
    fontSize: 12,
    color: '#666666',
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#E74C3C',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  locationName: {
    fontSize: 16,
    color: '#333333',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DDDDDD',
    marginLeft: 5,
    marginBottom: 8,
  },
  driverInfo: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
    paddingVertical: 15,
    marginBottom: 15,
  },
  driverInfoLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  paymentInfo: {
    paddingTop: 5,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666666',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  receiptIcon: {
    marginRight: 8,
  },
  receiptButtonText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '500',
  },
  homeButton: {
    backgroundColor: '#0066cc',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: width - 40,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default RideCompletionScreen;
