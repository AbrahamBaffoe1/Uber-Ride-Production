import React, { useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import SuccessScreen from '../../components/common/SuccessScreen';

type RideCompletionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'RideCompletion'
>;

type RideCompletionScreenRouteProp = RouteProp<
  RootStackParamList,
  'RideCompletion'
>;

interface Props {
  navigation: RideCompletionScreenNavigationProp;
  route: RideCompletionScreenRouteProp;
}

const RideCompletionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { rideId, riderName, pickupName, dropoffName, fare, paymentMethod } = route.params;
  
  // After animation completes
  const handleAnimationComplete = () => {
    // Auto-navigate to home after delay
    setTimeout(() => {
      navigation.navigate('Home');
    }, 2000);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <SuccessScreen 
        title="Ride Completed!"
        message={`Your ride from ${pickupName} to ${dropoffName} has been completed.`}
        onAnimationComplete={handleAnimationComplete}
      />
      
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Rider</Text>
          <Text style={styles.detailValue}>{riderName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fare</Text>
          <Text style={styles.detailValue}>{fare}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Payment Method</Text>
          <Text style={styles.detailValue}>{paymentMethod}</Text>
        </View>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.rateButton}
          onPress={() => 
            navigation.navigate('RateRider', { 
              rideId,
              riderName
            })
          }
        >
          <Text style={styles.rateButtonText}>Rate Rider</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  detailsContainer: {
    padding: 24,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    margin: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  buttonsContainer: {
    padding: 16,
    marginTop: 'auto',
  },
  rateButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideCompletionScreen;
