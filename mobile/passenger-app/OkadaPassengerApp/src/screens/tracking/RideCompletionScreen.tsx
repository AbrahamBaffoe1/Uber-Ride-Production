// src/screens/tracking/RideCompletionScreen.tsx (Passenger App)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';

type RideCompletionScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'RideCompletion'>;
type RideCompletionScreenRouteProp = RouteProp<HomeStackParamList, 'RideCompletion'>;

interface RideCompletionParams {
  rideId: string;
  riderName: string;
  pickupName: string;
  dropoffName: string;
  fare: string;
  paymentMethod: string;
}

const RideCompletionScreen = () => {
  const navigation = useNavigation<RideCompletionScreenNavigationProp>();
  const route = useRoute<RideCompletionScreenRouteProp>();
  const params = route.params as RideCompletionParams;
  
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPaid, setIsPaid] = useState(params.paymentMethod !== 'Cash');

  const handlePaymentConfirmation = async () => {
    if (params.paymentMethod !== 'Cash') {
      // Payment already processed
      return;
    }
    
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsPaid(true);
      Alert.alert('Payment Confirmed', 'Thank you for your payment!');
    }, 1500);
  };

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: `I just completed a ride with Okada! From ${params.pickupName} to ${params.dropoffName}. Total fare: ${params.fare}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handleBookAnother = () => {
    // Navigate back to home screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const handleViewHistory = () => {
    navigation.navigate('RideHistory');
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Completed</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Image
              source={require('../../assets/images/check-circle.png')}
              style={styles.successIcon}
            />
          </View>
          <Text style={styles.successTitle}>Your ride is complete!</Text>
          <Text style={styles.successMessage}>
            Thank you for riding with Okada Transportation
          </Text>
        </View>
        
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Ride Summary</Text>
            <Text style={styles.receiptDate}>{formatDate()}</Text>
          </View>
          
          <View style={styles.riderInfo}>
            <Text style={styles.riderInfoLabel}>Rider</Text>
            <Text style={styles.riderInfoValue}>{params.riderName}</Text>
          </View>
          
          <View style={styles.routeContainer}>
            <View style={styles.locationContainer}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>{params.pickupName}</Text>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.locationContainer}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <Text style={styles.locationText}>{params.dropoffName}</Text>
            </View>
          </View>
          
          <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Payment Details</Text>
              <View style={[
                styles.paymentStatus,
                isPaid ? styles.paidStatus : styles.pendingStatus,
              ]}>
                <Text style={[
                  styles.paymentStatusText,
                  isPaid ? styles.paidStatusText : styles.pendingStatusText,
                ]}>
                  {isPaid ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
            
            <View style={styles.paymentItem}>
              <Text style={styles.paymentItemLabel}>Fare</Text>
              <Text style={styles.paymentItemValue}>{params.fare}</Text>
            </View>
            
            <View style={styles.paymentItem}>
              <Text style={styles.paymentItemLabel}>Payment Method</Text>
              <Text style={styles.paymentItemValue}>{params.paymentMethod}</Text>
            </View>
            
            <View style={styles.paymentItem}>
              <Text style={styles.paymentItemLabel}>Ride ID</Text>
              <Text style={styles.paymentItemValue}>{params.rideId}</Text>
            </View>
          </View>
          
          {!isPaid && params.paymentMethod === 'Cash' && (
            <TouchableOpacity
              style={[
                styles.confirmPaymentButton,
                isProcessingPayment && styles.buttonDisabled,
              ]}
              onPress={handlePaymentConfirmation}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmPaymentButtonText}>Confirm Cash Payment</Text>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareReceipt}
          >
            <Image
              source={require('../../assets/images/share-icon.png')}
              style={styles.shareIcon}
            />
            <Text style={styles.shareButtonText}>Share Receipt</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleBookAnother}
          >
            <Text style={styles.primaryButtonText}>Book Another Ride</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewHistory}
          >
            <Text style={styles.secondaryButtonText}>View Ride History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    width: 32,
    height: 32,
    tintColor: '#27AE60',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  receiptDate: {
    fontSize: 12,
    color: '#666666',
  },
  riderInfo: {
    marginBottom: 16,
  },
  riderInfoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  riderInfoValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  routeContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2E86DE',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#E74C3C',
  },
  locationText: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#DDDDDD',
    marginLeft: 4,
    marginBottom: 8,
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  paymentStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  paidStatus: {
    backgroundColor: '#E8F5E9',
  },
  pendingStatus: {
    backgroundColor: '#FFF3E0',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paidStatusText: {
    color: '#27AE60',
  },
  pendingStatusText: {
    color: '#F57C00',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  paymentItemLabel: {
    fontSize: 14,
    color: '#666666',
  },
  paymentItemValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  confirmPaymentButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  confirmPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  shareButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E86DE',
    borderRadius: 8,
    padding: 12,
  },
  shareIcon: {
    width: 16,
    height: 16,
    tintColor: '#2E86DE',
    marginRight: 8,
  },
  shareButtonText: {
    color: '#2E86DE',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonsContainer: {
    margin: 16,
  },
  primaryButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideCompletionScreen;