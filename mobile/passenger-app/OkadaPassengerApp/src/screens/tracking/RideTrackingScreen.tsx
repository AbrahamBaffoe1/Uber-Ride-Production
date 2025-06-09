import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import CurvyFooter from '../../components/common/CurvyFooter';
import { socketService } from '../../api/services/socket.service';
import { geocodingService } from '../../api/services/geocoding.service';
import { SocketEvent } from '../../api/services/socket.service';

type RideTrackingScreenRouteProp = RouteProp<RootStackParamList, 'Tracking'>;

export const RideTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RideTrackingScreenRouteProp>();
  
  // Extract ride details from route params
  const {
    rideId,
    riderId,
    riderName,
    riderRating,
    riderPhoto,
    riderVehicleInfo,
    pickupLocation,
    pickupName,
    dropoffLocation,
    dropoffName,
    fare,
    distance,
    duration,
    paymentMethod,
  } = route.params;
  
  // Verify we have required parameters
  if (!rideId) {
    // Navigate back and show error if ride ID is missing
    useEffect(() => {
      Alert.alert(
        'Error',
        'Invalid ride information. Please try booking again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, []);
    return null;
  }
  
  // Track ride status
  const [rideStatus, setRideStatus] = useState<
    'finding' | 'confirmed' | 'arriving' | 'arrived' | 'inProgress' | 'completed'
  >('finding');
  
  const [estimatedArrival, setEstimatedArrival] = useState('8 mins');
  const [riderProgress, setRiderProgress] = useState(0.1); // 0-1 progress along route
  
  // Initialize socket and setup event listeners
  useEffect(() => {
    // Set initial status
    setRideStatus('confirmed');
    
    const initializeSocket = async () => {
      try {
        await socketService.initialize();
        setupSocketListeners();
      } catch (error) {
        console.error('Failed to initialize socket:', error);
        Alert.alert('Connection Error', 'Failed to connect to real-time tracking. Some features may be limited.');
      }
    };
    
    initializeSocket();
    
    // Cleanup socket listeners on unmount
    return () => {
      socketService.off('rider:location_update', handleRiderLocationUpdate);
      socketService.off('ride:status_updated', handleRideStatusUpdate);
      socketService.off('ride:cancelled', handleRideCancelled);
    };
  }, []);
  
  // Setup socket event listeners
  const setupSocketListeners = () => {
    // Listen for rider location updates
    socketService.on('rider:location_update', handleRiderLocationUpdate);
    
    // Listen for ride status updates
    socketService.on('ride:status_updated', handleRideStatusUpdate);
    
    // Listen for ride cancellations
    socketService.on('ride:cancelled', handleRideCancelled);
  };
  
  // Handle rider location updates
  const handleRiderLocationUpdate = (data: { 
    rideId: string; 
    location: { 
      latitude: number; 
      longitude: number; 
      heading?: number; 
      speed?: number; 
    }; 
    rideStatus: string; 
    timestamp: string; 
  }) => {
    console.log('Rider location update:', data);
    
    // Verify this update is for our ride
    if (data.rideId !== rideId) return;
    
    // Update rider position on map
    const progress = calculateProgress(data.location);
    setRiderProgress(progress);
    
    // Update estimated arrival time if the rider is still on the way
    if (rideStatus === 'confirmed' || rideStatus === 'arriving') {
      // Calculate ETA based on remaining distance and average speed
      const pickupCoords = {
        latitude: 6.4550,
        longitude: 3.3841
      };
      
      const dropoffCoords = {
        latitude: 6.5244,
        longitude: 3.3792
      };
      
      // Calculate remaining distance in km
      const remainingDistance = calculateDistance(
        data.location.latitude,
        data.location.longitude,
        dropoffCoords.latitude,
        dropoffCoords.longitude
      );
      
      // Estimate time based on average speed of 30 km/h in city traffic
      const averageSpeedKmh = 30;
      const estimatedTimeHours = remainingDistance / averageSpeedKmh;
      const estimatedTimeMinutes = Math.ceil(estimatedTimeHours * 60);
      
      // Ensure minimum ETA of 1 minute
      const eta = Math.max(1, estimatedTimeMinutes);
      setEstimatedArrival(`${eta} mins`);
      
      // Update status to 'arriving' if the rider is close (less than 1 km)
      if (remainingDistance < 1 && rideStatus === 'confirmed') {
        setRideStatus('arriving');
      }
    }
  };
  
  // Handle ride status updates
  const handleRideStatusUpdate = (data: {
    rideId: string;
    status: 'accepted' | 'arrived' | 'started' | 'completed';
    timestamp: string;
    fare?: number;
    distance?: number;
    duration?: number;
  }) => {
    console.log('Ride status update:', data);
    
    // Verify this update is for our ride
    if (data.rideId !== rideId) return;
    
    // Update ride status
    switch (data.status) {
      case 'arrived':
        setRideStatus('arrived');
        setEstimatedArrival('0 mins');
        setRiderProgress(0.45);
        break;
      case 'started':
        setRideStatus('inProgress');
        setRiderProgress(0.6);
        break;
      case 'completed':
        setRideStatus('completed');
        setRiderProgress(1.0);
        // Handle ride completion
        handleRideCompletion({
          ...data,
          status: 'completed' // Ensure status is 'completed' for type safety
        });
        break;
    }
  };
  
  // Handle ride cancellations
  const handleRideCancelled = (data: { 
    rideId: string; 
    reason?: string; 
    timestamp: string; 
  }) => {
    console.log('Ride cancelled:', data);
    
    // Verify this update is for our ride
    if (data.rideId !== rideId) return;
    
    Alert.alert(
      'Ride Cancelled',
      `Your ride has been cancelled. Reason: ${data.reason || 'Not specified'}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };
  
  // State for storing coordinates
  const [pickupCoords, setPickupCoords] = useState({
    latitude: 6.4550,
    longitude: 3.3841
  });
  const [dropoffCoords, setDropoffCoords] = useState({
    latitude: 6.5244,
    longitude: 3.3792
  });
  
  // Initialize coordinates from addresses using geocoding service
  useEffect(() => {
    const initializeCoordinates = async () => {
      try {
        // Get coordinates from pickup address if needed
        if (pickupLocation && pickupLocation !== 'Current Location') {
          const pickupGeocode = await geocodingService.geocode(pickupLocation);
          setPickupCoords({
            latitude: pickupGeocode.latitude,
            longitude: pickupGeocode.longitude
          });
        }
        
        // Get coordinates from dropoff address
        if (dropoffLocation) {
          const dropoffGeocode = await geocodingService.geocode(dropoffLocation);
          setDropoffCoords({
            latitude: dropoffGeocode.latitude,
            longitude: dropoffGeocode.longitude
          });
        }
      } catch (error) {
        console.error('Error initializing coordinates:', error);
        // Fallback coordinates are already set in the state
      }
    };
    
    initializeCoordinates();
  }, [pickupLocation, dropoffLocation]);

  // Calculate rider progress along the route based on location
  const calculateProgress = (location: { 
    latitude: number; 
    longitude: number; 
    heading?: number; 
    speed?: number; 
  }) => {
    // Calculate actual progress based on rider's current location
    
    // Calculate total distance of the route
    const totalDistance = calculateDistance(
      pickupCoords.latitude,
      pickupCoords.longitude,
      dropoffCoords.latitude,
      dropoffCoords.longitude
    );
    
    // Calculate distance from pickup to rider's current position
    const distanceTraveled = calculateDistance(
      pickupCoords.latitude,
      pickupCoords.longitude,
      location.latitude,
      location.longitude
    );
    
    // Calculate progress as a fraction of the total route
    const progress = distanceTraveled / totalDistance;
    
    // Ensure progress stays within bounds
    return Math.min(Math.max(progress, 0), 0.95);
  };
  
  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  // Convert degrees to radians
  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };
  
  // Handle ride completion
  const handleRideCompletion = (data: {
    rideId: string;
    status: 'completed';
    timestamp: string;
    fare?: number;
    distance?: number;
    duration?: number;
  }) => {
    // Show completion alert and navigate back
    Alert.alert(
      'Ride Completed',
      'Your ride has been completed. Thank you for using Okada Transportation!',
      [{ 
        text: 'OK', 
        onPress: () => {
          // Use a callback to navigate to home screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } 
      }]
    );
  };
  
  // Cancel ride
  const cancelRide = () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => {
            socketService.cancelRide(rideId, 'Cancelled by passenger');
            navigation.goBack();
          }
        }
      ]
    );
  };
  
  // Get UI elements based on ride status
  const getStatusInfo = () => {
    switch (rideStatus) {
      case 'finding':
        return {
          title: 'Finding your driver',
          subtitle: 'This may take a few moments...',
          icon: <ActivityIndicator size="large" color="#7AC231" style={styles.statusIcon} />,
          color: '#7AC231',
        };
      case 'confirmed':
        return {
          title: 'Driver Confirmed',
          subtitle: `${riderName} is on the way`,
          icon: <Ionicons name="checkmark-circle" size={50} color="#7AC231" style={styles.statusIcon} />,
          color: '#7AC231',
        };
      case 'arriving':
        return {
          title: 'Driver is on the way',
          subtitle: `${estimatedArrival} away`,
          icon: <MaterialIcons name="motorcycle" size={50} color="#7AC231" style={styles.statusIcon} />,
          color: '#7AC231',
        };
      case 'arrived':
        return {
          title: 'Driver has arrived',
          subtitle: 'Meet at your pickup location',
          icon: <Ionicons name="location" size={50} color="#3B82F6" style={styles.statusIcon} />,
          color: '#3B82F6',
        };
      case 'inProgress':
        return {
          title: 'On your way',
          subtitle: `Heading to ${dropoffName}`,
          icon: <MaterialIcons name="navigation" size={50} color="#3B82F6" style={styles.statusIcon} />,
          color: '#3B82F6',
        };
      default:
        return {
          title: 'Finding your driver',
          subtitle: 'This may take a few moments...',
          icon: <ActivityIndicator size="large" color="#7AC231" style={styles.statusIcon} />,
          color: '#7AC231',
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  // Simplified map with rider position
  const MapView = () => (
    <View style={styles.mapContainer}>
      <Svg height="100%" width="100%" viewBox="0 0 375 300">
        <Defs>
          <SvgLinearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7AC231" />
            <Stop offset="1" stopColor="#3B82F6" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Map background */}
        <Path 
          d="M0,0 H375 V300 H0 Z" 
          fill="#ECFDF5" 
        />
        
        {/* Stylized roads */}
        <Path d="M50,150 L325,150" stroke="#D1D5DB" strokeWidth="12" />
        <Path d="M50,100 L325,100" stroke="#D1D5DB" strokeWidth="8" />
        <Path d="M50,200 L325,200" stroke="#D1D5DB" strokeWidth="8" />
        <Path d="M150,50 L150,250" stroke="#D1D5DB" strokeWidth="10" />
        <Path d="M225,50 L225,250" stroke="#D1D5DB" strokeWidth="10" />
        
        {/* Route line */}
        <Path 
          d="M75,150 Q150,50 225,150 T325,175" 
          stroke="url(#routeGradient)" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none" 
          strokeDasharray={rideStatus === 'inProgress' ? "0" : "5,5"}
        />
        
        {/* Pickup location */}
        <Circle cx="75" cy="150" r="10" fill="#7AC231" />
        <Circle cx="75" cy="150" r="5" fill="#FFFFFF" />
        
        {/* Dropoff location */}
        <Circle cx="325" cy="175" r="10" fill="#3B82F6" />
        <Circle cx="325" cy="175" r="5" fill="#FFFFFF" />
        
        {/* Rider position (dynamic) */}
        {rideStatus !== 'finding' && (
          <>
            {/* Calculate rider position along the route */}
            <Circle 
              cx={75 + (325 - 75) * riderProgress} 
              cy={150 + 25 * Math.sin(riderProgress * Math.PI)} 
              r="15" 
              fill="#FCD34D" 
            />
            <Circle 
              cx={75 + (325 - 75) * riderProgress} 
              cy={150 + 25 * Math.sin(riderProgress * Math.PI)} 
              r="8" 
              fill="#FFFFFF" 
            />
          </>
        )}
      </Svg>
    </View>
  );
  
  // Render ride information card
  const RideInfoCard = () => (
    <View style={styles.rideInfoCard}>
      <View style={styles.rideInfoHeader}>
        <Text style={styles.rideInfoTitle}>{statusInfo.title}</Text>
        <Text style={styles.rideInfoSubtitle}>{statusInfo.subtitle}</Text>
      </View>
      
      {/* Rider information - shown after confirmation */}
      {rideStatus !== 'finding' && (
        <View style={styles.riderContainer}>
          <View style={styles.riderInfo}>
            <View style={styles.riderAvatar}>
              {riderPhoto ? (
                <Image source={{ uri: riderPhoto }} style={styles.riderPhoto} />
              ) : (
                <FontAwesome5 name="user" size={20} color="#9CA3AF" />
              )}
            </View>
            
            <View style={styles.riderDetails}>
              <Text style={styles.riderName}>{riderName}</Text>
              <View style={styles.riderRatingContainer}>
                <Ionicons name="star" size={16} color="#FFC107" />
                <Text style={styles.riderRating}>{riderRating}</Text>
                <Text style={styles.riderId}>• ID: {riderId}</Text>
              </View>
              <Text style={styles.vehicleInfo}>{riderVehicleInfo}</Text>
            </View>
          </View>
          
          {/* Contact options */}
          <View style={styles.contactOptions}>
            <TouchableOpacity style={styles.contactButton}>
              <View style={[styles.contactIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="call" size={20} color="#10B981" />
              </View>
              <Text style={styles.contactLabel}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.contactButton}>
              <View style={[styles.contactIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="chatbubble" size={20} color="#6366F1" />
              </View>
              <Text style={styles.contactLabel}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Route information */}
      <View style={styles.routeContainer}>
        <View style={styles.routeIcons}>
          <View style={[styles.routeDot, { backgroundColor: '#7AC231' }]} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, { backgroundColor: '#3B82F6' }]} />
        </View>
        
        <View style={styles.routeDetails}>
          <View style={styles.routePoint}>
            <Text style={styles.routePointName}>{pickupName}</Text>
            <Text style={styles.routePointAddress}>{pickupLocation}</Text>
          </View>
          
          <View style={styles.routeDivider} />
          
          <View style={styles.routePoint}>
            <Text style={styles.routePointName}>{dropoffName}</Text>
            <Text style={styles.routePointAddress}>{dropoffLocation}</Text>
          </View>
        </View>
      </View>
      
      {/* Ride metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Fare</Text>
          <Text style={styles.metricValue}>{fare}</Text>
        </View>
        
        <View style={styles.metricDivider} />
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>{distance}</Text>
        </View>
        
        <View style={styles.metricDivider} />
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Duration</Text>
          <Text style={styles.metricValue}>{duration}</Text>
        </View>
        
        <View style={styles.metricDivider} />
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Payment</Text>
          <Text style={styles.metricValue}>{paymentMethod}</Text>
        </View>
      </View>
      
      {/* Action buttons */}
      <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={cancelRide}
            >
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Cancel Ride</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Safety Options</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Footer tab icons
  const renderFooterTabs = () => (
    <>
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="share-social" size={24} color="#FFFFFF" />
        <Text style={styles.footerTabText}>Share Trip</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="shield" size={24} color="#FFFFFF" />
        <Text style={styles.footerTabText}>Emergency</Text>
      </TouchableOpacity>
    </>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Track Ride</Text>
        
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map view */}
        <MapView />
        
        {/* Status indicator */}
        <View style={styles.statusContainer}>
          {statusInfo.icon}
        </View>
        
        {/* Ride information card */}
        <RideInfoCard />
      </ScrollView>
      
      {/* Curvy Footer */}
      <CurvyFooter
        backgroundColor="#1F2937"
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
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for footer
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#E5E7EB',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 15,
  },
  statusIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    textAlign: 'center',
    lineHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  rideInfoCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rideInfoHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rideInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 5,
  },
  rideInfoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  riderContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  riderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  riderPhoto: { 
    width: 60,
    height: 60,
    borderRadius: 30, 
  },
  riderDetails: {
    flex: 1,
  },
  riderName: {
    fontSize: 18,
    fontWeight: '600', 
    color: '#1F2937',
    marginBottom: 4,
  },
  riderRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  riderRating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginLeft: 4,
  },
  riderId: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  contactButton: {
    alignItems: 'center',
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  routeIcons: {
    width: 20,
    alignItems: 'center',
    marginRight: 15,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: '#D1D5DB',
    marginVertical: 5,
  },
  routeDetails: {
    flex: 1,
  },
  routePoint: {
    marginBottom: 15,
  },
  routePointName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  routePointAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  routeDivider: {
    height: 10,
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#7AC231',
    flex: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginRight: 10,
    flex: 2,
  },
  secondaryButtonText: {
    color: '#EF4444',
  },
  footerTab: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  footerTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 5,
  },
});

export default RideTrackingScreen;
