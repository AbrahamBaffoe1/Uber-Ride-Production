import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
  Animated,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../api/services/authService';
import { rideService } from '../../api/services/rideService';
import { earningsService } from '../../api/services/earningsService';

// Define ride request interface
interface RideRequest {
  id: string;
  passengerName: string;
  passengerRating: number;
  pickupLocation: string;
  dropoffLocation: string;
  distance: string;
  estimatedFare: string;
  estimatedTime: string;
}

const { width } = Dimensions.get('window');

// Create a simple hook to get the current user's name
const useCurrentUser = () => {
  const [name, setName] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // Set the rider's full name
          const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
          setName(fullName || 'Rider');
          setUserId(currentUser._id);
          console.log(`🏍️ Rider logged in: ${fullName}`);
        }
      } catch (error) {
        console.error('Error loading user info:', error);
        setName('Rider');
      }
    };
    
    loadUserInfo();
  }, []);

  return { name, userId };
};

const Dashboard = () => {
  const navigation = useNavigation();
  const { name: userName } = useCurrentUser();
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(40))[0];

  // Load user data and stats with retry capability
  const loadUserData = useCallback(async (isRetry = false) => {
    try {
      if (isRetry) {
        setRetrying(true);
      } else {
        setIsLoading(true);
      }
      
      setLoadingError(null);
      
      // Get earnings data
      const earningsData = await earningsService.getTodayEarnings();
      if (earningsData) {
        setTodayEarnings(earningsData.amount || 0);
        setTodayTrips(earningsData.totalTrips || 0);
      }
      
      try {
        // Get rating - this might fail if server data is not available
        const userProfile = await earningsService.getRiderStats();
        if (userProfile) {
          setRatingAverage(userProfile.averageRating || 0);
        }
      } catch (ratingError: any) {
        console.warn('Error loading rating data:', ratingError);
        // Just log the error but don't fail the whole dashboard
      }
      
      setRetrying(false);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      setLoadingError(error.message || 'Failed to load rider data');
      setRetrying(false);
      setIsLoading(false);
    }
  }, []);
  
  // Initial data load
  useEffect(() => {
    loadUserData();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Load ride requests when going online
  useEffect(() => {
    const fetchRideRequests = async () => {
      if (isOnline) {
        try {
          const requests = await rideService.getAvailableRideRequests();
          setRideRequests(requests || []);
        } catch (error) {
          console.error('Error fetching ride requests:', error);
          setRideRequests([]);
        }
      }
    };
    
    fetchRideRequests();
    
    // Set up polling for ride requests when online
    let requestInterval: NodeJS.Timeout;
    
    if (isOnline) {
      requestInterval = setInterval(fetchRideRequests, 30000); // Poll every 30 seconds
    }
    
    return () => {
      if (requestInterval) {
        clearInterval(requestInterval);
      }
    };
  }, [isOnline]);

  const handleToggleOnline = async () => {
    try {
      // In a real implementation, we would update the rider's online status on the server
      const newStatus = !isOnline;
      await rideService.updateRiderStatus(newStatus);
      setIsOnline(newStatus);
      
      // If going online, fetch available ride requests
      if (newStatus) {
        const requests = await rideService.getAvailableRideRequests();
        setRideRequests(requests || []);
      }
    } catch (error) {
      console.error('Error updating rider status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const handleAcceptRide = async (id: string) => {
    try {
      // Call API to accept ride
      const result = await rideService.acceptRideRequest(id);
      
      if (result && result.success) {
        // Remove from available requests
        const updatedRequests = rideRequests.filter(request => request.id !== id);
        setRideRequests(updatedRequests);
        
        // Get ride details
        const selectedRide = rideRequests.find(r => r.id === id);
        
        // Navigate to ride details using the correct navigation path for nested navigators
        // @ts-ignore - TypeScript doesn't understand the nested navigation well, but this is correct
        navigation.navigate('Home', {
          screen: 'RideDetails',
          params: {
            rideId: id,
            passengerName: selectedRide?.passengerName,
            pickupLocation: selectedRide?.pickupLocation,
            dropoffLocation: selectedRide?.dropoffLocation,
            status: 'accepted'
          }
        });
      } else {
        Alert.alert('Error', result?.message || 'Failed to accept ride. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      Alert.alert('Error', 'Failed to accept ride. Please try again.');
    }
  };

  const handleDeclineRide = async (id: string) => {
    try {
      // Call API to decline ride
      await rideService.declineRideRequest(id);
      
      // Remove from available requests
      const updatedRequests = rideRequests.filter(request => request.id !== id);
      setRideRequests(updatedRequests);
    } catch (error) {
      console.error('Error declining ride:', error);
      Alert.alert('Error', 'Failed to decline ride. Please try again.');
    }
  };

  // Render a ride request card
  const renderRideRequest = (request: RideRequest) => {
    return (
      <Animated.View 
        key={request.id} 
        style={[
          styles.requestCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        {/* Passenger info section */}
        <View style={styles.requestHeader}>
          <View style={styles.passengerInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {request.passengerName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.passengerName}>{request.passengerName}</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>{request.passengerRating}</Text>
                <Text style={styles.starIcon}>★</Text>
              </View>
            </View>
          </View>
          <View style={styles.fareContainer}>
            <Text style={styles.estimatedFare}>{request.estimatedFare}</Text>
            <Text style={styles.estimatedTime}>{request.estimatedTime}</Text>
          </View>
        </View>
        
        {/* Route info section */}
        <View style={styles.routeContainer}>
          <View style={styles.routeIcons}>
            <View style={styles.pickupDot} />
            <View style={styles.routeLine} />
            <View style={styles.dropoffDot} />
          </View>
          <View style={styles.routeDetails}>
            <View style={styles.locationContainer}>
              <Text style={styles.locationText}>{request.pickupLocation}</Text>
              <Text style={styles.locationLabel}>Pickup</Text>
            </View>
            <View style={styles.locationContainer}>
              <Text style={styles.locationText}>{request.dropoffLocation}</Text>
              <Text style={styles.locationLabel}>Dropoff</Text>
            </View>
          </View>
        </View>
        
        {/* Action buttons */}
        <View style={styles.requestFooter}>
          <View style={styles.distanceContainer}>
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>{request.distance}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDeclineRide(request.id)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptRide(request.id)}
            >
              <LinearGradient
                colors={['#3a7bd5', '#00d2ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptButtonGradient}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName || 'Rider'}!</Text>
          <Text style={styles.statusText}>
            You are currently <Text style={isOnline ? styles.onlineText : styles.offlineText}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </Text>
        </View>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#e0e0e0', true: '#b3e6cc' }}
            thumbColor={isOnline ? '#28b463' : '#fff'}
            ios_backgroundColor="#e0e0e0"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3a7bd5" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : loadingError ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>{loadingError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadUserData(true)}
              disabled={retrying}
            >
              <LinearGradient
                colors={['#3a7bd5', '#00d2ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.retryButtonGradient}
              >
                {retrying ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.retryButtonText}>Retry</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
        <>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
          <Animated.View 
            style={[
              styles.statCard, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.statIconContainer}>
              <View style={[styles.statIcon, styles.earningsIcon]}>
                <Text style={styles.iconText}>₦</Text>
              </View>
            </View>
            <Text style={styles.statValue}>₦{todayEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.statCard, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.statIconContainer}>
              <View style={[styles.statIcon, styles.tripsIcon]}>
                <Text style={styles.iconText}>🚗</Text>
              </View>
            </View>
            <Text style={styles.statValue}>{todayTrips}</Text>
            <Text style={styles.statLabel}>Today's Trips</Text>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.statCard, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.statIconContainer}>
              <View style={[styles.statIcon, styles.ratingIcon]}>
                <Text style={styles.iconText}>★</Text>
              </View>
            </View>
            <View style={styles.ratingContainerMain}>
              {ratingAverage > 0 ? (
                <Text style={styles.statValue}>{ratingAverage.toFixed(1)}</Text>
              ) : (
                <Text style={styles.statNewRating}>New</Text>
              )}
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </Animated.View>
        </View>

          {/* Section Title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isOnline ? 'Available Ride Requests' : 'Go Online to See Requests'}
            </Text>
          </View>

        {/* Ride Requests or Empty State */}
        {isOnline ? (
          rideRequests.length > 0 ? (
            <View style={styles.requestsContainer}>
              {rideRequests.map(renderRideRequest)}
            </View>
          ) : (
            <Animated.View 
              style={[
                styles.emptyStateContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.emptyStateIconContainer}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
              </View>
              <Text style={styles.emptyStateTitle}>No Ride Requests</Text>
              <Text style={styles.emptyStateMessage}>
                No ride requests available at the moment. Pull down to refresh or check back later.
              </Text>
            </Animated.View>
          )
        ) : (
          <Animated.View 
            style={[
              styles.offlineStateContainer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.offlineStateIconContainer}>
              <Text style={styles.offlineStateIcon}>🔌</Text>
            </View>
            <Text style={styles.offlineStateTitle}>You're Offline</Text>
            <Text style={styles.offlineStateMessage}>
              Toggle the switch above to go online and start receiving ride requests.
            </Text>
            <TouchableOpacity
              style={styles.goOnlineButton}
              onPress={handleToggleOnline}
            >
              <LinearGradient
                colors={['#3a7bd5', '#00d2ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.goOnlineButtonGradient}
              >
                <Text style={styles.goOnlineButtonText}>Go Online</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
        </>
        )}
      </ScrollView>

      {/* Quick Links Footer */}
      <BlurView intensity={80} style={styles.quickLinksContainer}>
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickLinkItem}>
            <View style={styles.quickLinkIcon}>
              <Text style={styles.quickLinkIconText}>₦</Text>
            </View>
            <Text style={styles.quickLinkText}>Earnings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickLinkItem}>
            <View style={styles.quickLinkIcon}>
              <Text style={styles.quickLinkIconText}>🕒</Text>
            </View>
            <Text style={styles.quickLinkText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickLinkItem}>
            <View style={styles.quickLinkIcon}>
              <Text style={styles.quickLinkIconText}>👤</Text>
            </View>
            <Text style={styles.quickLinkText}>Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickLinkItem}>
            <View style={styles.quickLinkIcon}>
              <Text style={styles.quickLinkIconText}>❓</Text>
            </View>
            <Text style={styles.quickLinkText}>Support</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  onlineText: {
    color: '#28b463',
    fontWeight: '600',
  },
  offlineText: {
    color: '#7f8c8d',
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  
  // Stats section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: width / 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsIcon: {
    backgroundColor: '#d4f5e2',
  },
  tripsIcon: {
    backgroundColor: '#d4e6f5',
  },
  ratingIcon: {
    backgroundColor: '#f9f0d3',
  },
  iconText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statNewRating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3a7bd5',
    backgroundColor: '#e6f2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ratingContainerMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Section header
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  
  // Ride requests
  requestsContainer: {
    paddingHorizontal: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3a7bd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
  },
  starIcon: {
    fontSize: 13,
    color: '#f1c40f',
    marginLeft: 2,
  },
  fareContainer: {
    alignItems: 'flex-end',
  },
  estimatedFare: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28b463',
    marginBottom: 2,
  },
  estimatedTime: {
    fontSize: 12,
    color: '#666',
  },
  
  // Route information
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  routeIcons: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3a7bd5',
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: '#ddd',
    marginVertical: 4,
    marginLeft: 5,
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
  },
  routeDetails: {
    flex: 1,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
  },
  
  // Footer actions
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceContainer: {
    flex: 1,
  },
  distancePill: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  acceptButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Empty states
  emptyStateContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateIcon: {
    fontSize: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Offline state
  offlineStateContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    marginHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  offlineStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  offlineStateIcon: {
    fontSize: 32,
  },
  offlineStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  offlineStateMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  goOnlineButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  goOnlineButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  goOnlineButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Error state
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff3f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  retryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Quick links footer
  quickLinksContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  quickLinkItem: {
    alignItems: 'center',
  },
  quickLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickLinkIconText: {
    fontSize: 18,
  },
  quickLinkText: {
    fontSize: 12,
    color: '#666',
  },
});

export default Dashboard;
