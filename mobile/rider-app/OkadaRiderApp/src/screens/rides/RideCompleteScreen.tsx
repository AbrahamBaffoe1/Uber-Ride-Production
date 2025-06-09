// src/screens/rides/RideCompleteScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';
import { rideService, RideSummary } from '../../api/services/rideService';

type RideCompleteScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'RideComplete'>;
type RideCompleteScreenRouteProp = RouteProp<HomeStackParamList, 'RideComplete'>;

const RideCompleteScreen = () => {
  const navigation = useNavigation<RideCompleteScreenNavigationProp>();
  const route = useRoute<RideCompleteScreenRouteProp>();
  const { rideId } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [rideSummary, setRideSummary] = useState<RideSummary | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    // Fetch ride summary from the API
    const fetchRideSummary = async () => {
      try {
        setIsLoading(true);
        // Use our real ride service to get ride details
        const summary = await rideService.getRideById(rideId);
        setRideSummary(summary);
      } catch (error: any) {
        console.error('Error fetching ride summary:', error);
        Alert.alert('Error', 'Failed to load ride summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRideSummary();
  }, [rideId]);

  const handleConfirmPayment = async () => {
    if (!rideSummary) return;

    setIsProcessingPayment(true);
    
    try {
      // Use our ride service to confirm cash payment
      await rideService.confirmCashPayment(rideSummary.id);
      
      // Update UI to reflect completed payment
      setRideSummary({
        ...rideSummary,
        paymentStatus: 'completed',
      });
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', 'Failed to confirm payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleNewRide = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Dashboard' }],
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading ride summary...</Text>
      </SafeAreaView>
    );
  }

  if (!rideSummary) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.errorText}>Failed to load ride summary</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ride Completed</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.successContainer}>
          <Image
            source={require('../../../assets/images/check-circle-large.png')}
            style={styles.successIcon}
          />
          <Text style={styles.successTitle}>Ride Successfully Completed!</Text>
          <Text style={styles.successMessage}>
            Thank you for using Okada Transportation
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Ride Summary</Text>
            <Text style={styles.summaryTime}>{formatDate(rideSummary.timestamp)}</Text>
          </View>

          <View style={styles.passengerContainer}>
            <Image
              source={require('../../../assets/images/user-avatar.png')}
              style={styles.passengerAvatar}
            />
            <Text style={styles.passengerName}>{rideSummary.passengerName}</Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.locationContainer}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText}>{rideSummary.pickupLocation}</Text>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.locationContainer}>
              <View style={[styles.locationDot, styles.destinationDot]} />
              <Text style={styles.locationText}>{rideSummary.dropoffLocation}</Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>{rideSummary.distance}</Text>
            </View>
            
            <View style={styles.detailDivider} />
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{rideSummary.duration}</Text>
            </View>
          </View>

          <View style={styles.paymentContainer}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>Payment</Text>
              <View style={[
                styles.paymentStatusBadge,
                rideSummary.paymentStatus === 'completed'
                  ? styles.paymentCompletedBadge
                  : styles.paymentPendingBadge,
              ]}>
                <Text style={[
                  styles.paymentStatusText,
                  rideSummary.paymentStatus === 'completed'
                    ? styles.paymentCompletedText
                    : styles.paymentPendingText,
                ]}>
                  {rideSummary.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={styles.paymentDetails}>
              <View style={styles.paymentMethod}>
                <Text style={styles.paymentMethodLabel}>Method</Text>
                <Text style={styles.paymentMethodValue}>{rideSummary.paymentMethod}</Text>
              </View>
              
              <View style={styles.fareAmount}>
                <Text style={styles.fareLabel}>Total Fare</Text>
                <Text style={styles.fareValue}>{rideSummary.fare}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {rideSummary.paymentStatus === 'pending' && rideSummary.paymentMethod === 'Cash' ? (
          <TouchableOpacity
            style={[
              styles.confirmButton,
              isProcessingPayment && styles.buttonDisabled,
            ]}
            onPress={handleConfirmPayment}
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Cash Payment</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleNewRide}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
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
  errorButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryTime: {
    fontSize: 12,
    color: '#666666',
  },
  passengerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
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
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#DDDDDD',
    marginLeft: 4,
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  paymentContainer: {
    
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  paymentStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  paymentPendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  paymentCompletedBadge: {
    backgroundColor: '#E8F5E9',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paymentPendingText: {
    color: '#F57C00',
  },
  paymentCompletedText: {
    color: '#27AE60',
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  paymentMethodValue: {
    fontSize: 14,
    color: '#333333',
  },
  fareAmount: {
    alignItems: 'flex-end',
  },
  fareLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#2E86DE',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default RideCompleteScreen;
