// src/screens/history/HistoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../../api/config';

type HistoryScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'History'>;

interface RideHistory { 
  id: string;
  date: string;
  passengerName: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: string;
  duration: string;
  status: 'completed' | 'cancelled';
  rating?: number;
}

const HistoryScreen = () => {
  const navigation = useNavigation<HistoryScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [rides, setRides] = useState<RideHistory[]>([]);
  const [filteredRides, setFilteredRides] = useState<RideHistory[]>([]);

  const fetchRideHistory = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${API_BASE_URL}/rides/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch ride history');
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        // Transform API response to match our interface
        const formattedRides = data.data.map((ride: any) => ({
          id: ride._id || ride.id,
          date: ride.createdAt || ride.date,
          passengerName: ride.passenger?.name || 'Passenger',
          pickupLocation: ride.pickupLocation?.address || 'Pickup location',
          dropoffLocation: ride.dropoffLocation?.address || 'Dropoff location',
          fare: ride.fare || 0,
          distance: ride.distance ? `${ride.distance} km` : 'N/A',
          duration: ride.duration ? `${ride.duration} mins` : 'N/A',
          status: ride.status === 'cancelled' ? 'cancelled' : 'completed',
          rating: ride.rating,
        }));
        
        setRides(formattedRides);
        setFilteredRides(formattedRides);
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
      Alert.alert('Error', 'Failed to load ride history. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRideHistory();
  }, []);

  useEffect(() => {
    // Filter rides based on active tab
    if (activeTab === 'all') {
      setFilteredRides(rides);
    } else {
      setFilteredRides(rides.filter(ride => ride.status === activeTab));
    }
  }, [activeTab, rides]);

  const handleTabChange = (tab: 'all' | 'completed' | 'cancelled') => {
    setActiveTab(tab);
  };

  const onRefresh = () => {
    fetchRideHistory(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const renderRatingStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Image
            key={star}
            source={
              star <= rating
                ? require('../../../assets/images/star-filled.png')
                : require('../../../assets/images/star-outline.png')
            }
            style={styles.starIcon}
          />
        ))}
      </View>
    );
  };

  const renderRideItem = ({ item }: { item: RideHistory }) => (
    <TouchableOpacity
      style={styles.rideItem}
      onPress={() => navigation.navigate('RideDetails', { rideId: item.id })}
    >
      <View style={styles.rideHeader}>
        <Text style={styles.rideDate}>{formatDate(item.date)}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === 'completed'
              ? styles.completedBadge
              : styles.cancelledBadge,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === 'completed'
                ? styles.completedText
                : styles.cancelledText,
            ]}
          >
            {item.status === 'completed' ? 'Completed' : 'Cancelled'}
          </Text>
        </View>
      </View>
      
      <View style={styles.passengerInfo}>
        <Image
          source={require('../../../assets/images/user-avatar.png')}
          style={styles.passengerAvatar}
        />
        <Text style={styles.passengerName}>{item.passengerName}</Text>
      </View>
      
      <View style={styles.routeContainer}>
        <View style={styles.locationContainer}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText} numberOfLines={1}>{item.pickupLocation}</Text>
        </View>
        
        <View style={styles.routeLine} />
        
        <View style={styles.locationContainer}>
          <View style={[styles.locationDot, styles.destinationDot]} />
          <Text style={styles.locationText} numberOfLines={1}>{item.dropoffLocation}</Text>
        </View>
      </View>
      
      <View style={styles.rideDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Distance</Text>
          <Text style={styles.detailValue}>{item.distance}</Text>
        </View>
        
        <View style={styles.detailDivider} />
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{item.duration}</Text>
        </View>
        
        <View style={styles.detailDivider} />
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Fare</Text>
          <Text style={styles.detailValue}>{formatCurrency(item.fare)}</Text>
        </View>
      </View>
      
      {item.status === 'completed' && renderRatingStars(item.rating)}
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../../../assets/images/empty-history.png')}
        style={styles.emptyImage}
      />
      <Text style={styles.emptyTitle}>No Rides Found</Text>
      <Text style={styles.emptyMessage}>
        You don't have any {activeTab !== 'all' ? activeTab : ''} rides in your history yet.
      </Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Ride History</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'all' && styles.activeTab,
          ]}
          onPress={() => handleTabChange('all')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'all' && styles.activeTabText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'completed' && styles.activeTab,
          ]}
          onPress={() => handleTabChange('completed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'cancelled' && styles.activeTab,
          ]}
          onPress={() => handleTabChange('cancelled')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'cancelled' && styles.activeTabText,
            ]}
          >
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E86DE" />
          <Text style={styles.loadingText}>Loading ride history...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#2E86DE']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E86DE',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#2E86DE',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
  },
  rideItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    color: '#27AE60',
  },
  cancelledText: {
    color: '#E74C3C',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  routeContainer: {
    marginBottom: 12,
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
    height: 20,
    backgroundColor: '#DDDDDD',
    marginLeft: 4,
    marginBottom: 8,
  },
  rideDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
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
    height: '100%',
    backgroundColor: '#F0F0F0',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  starIcon: {
    width: 16,
    height: 16,
    marginLeft: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default HistoryScreen;
