import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  ScrollView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, DestinationData } from '../../navigation/types';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type RideDetailsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Booking'
>;

type RideDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  'Booking'
>;

interface Props {
  navigation: RideDetailsScreenNavigationProp;
  route: RideDetailsScreenRouteProp;
}

const MuneefRideDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const destination = route.params?.destination;
  const isFocused = useIsFocused();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 25.2048,
    longitude: 55.2708, // Dubai coordinates as default
    latitudeDelta: 0.0222,
    longitudeDelta: 0.0121,
  });
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [selectedRideType, setSelectedRideType] = useState('comfort');
  const [pickupPoint, setPickupPoint] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showDiscount, setShowDiscount] = useState(false);
  
  const mapRef = useRef<MapView>(null);

  // Get current location and create route
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        setCurrentLocation({ latitude, longitude });
        setPickupPoint('Union Coop Al-St. 78');
        
        // If destination is provided, create a mock route
        if (destination) {
          const destCoords = destination.coordinates;
          
          // Create mock route coordinates (straight line for simplicity)
          const routePoints = [
            { latitude, longitude },
            { 
              latitude: latitude + (destCoords.latitude - latitude) * 0.33, 
              longitude: longitude + (destCoords.longitude - longitude) * 0.33 
            },
            { 
              latitude: latitude + (destCoords.latitude - latitude) * 0.66, 
              longitude: longitude + (destCoords.longitude - longitude) * 0.66 
            },
            destCoords
          ];
          
          setRouteCoordinates(routePoints);
          
          // Set map region to fit both points
          const midLat = (latitude + destCoords.latitude) / 2;
          const midLng = (longitude + destCoords.longitude) / 2;
          
          // Calculate delta to fit both points
          const latDelta = Math.abs(latitude - destCoords.latitude) * 1.5;
          const lngDelta = Math.abs(longitude - destCoords.longitude) * 1.5;
          
          setMapRegion({
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: Math.max(0.0222, latDelta),
            longitudeDelta: Math.max(0.0121, lngDelta),
          });
          
          // Animate map to fit the route
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(
              [{ latitude, longitude }, destCoords],
              {
                edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                animated: true,
              }
            );
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    if (isFocused) {
      getLocation();
    }
  }, [isFocused, destination]);

  // Handle booking confirmation
  const handleBookRide = () => {
    navigation.navigate('RideConfirmation');
  };

  // Handle payment method change
  const handleChangePayment = () => {
    const methods = ['cash', 'card', 'wallet'];
    const currentIndex = methods.indexOf(paymentMethod);
    const nextIndex = (currentIndex + 1) % methods.length;
    setPaymentMethod(methods[nextIndex]);
  };

  // Handle discount toggle
  const handleToggleDiscount = () => {
    setShowDiscount(!showDiscount);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {/* Origin Marker - Green dot */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
          >
            <View style={styles.originMarker}>
              <View style={styles.originDot} />
            </View>
          </Marker>
        )}
        
        {/* Destination Marker - Red pin */}
        {destination && (
          <Marker
            coordinate={destination.coordinates}
            title={destination.address}
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={30} color="#FF3B30" />
            </View>
          </Marker>
        )}
        
        {/* Route Line */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#10B981"
            lineDashPattern={[0]}
          />
        )}
      </MapView>
      
      {/* Back Button */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={{uri: 'https://cdn-icons-png.flaticon.com/512/5087/5087579.png'}} 
            style={styles.logo}
          />
          <Text style={styles.logoText}>MUNEEF</Text>
        </View>
        
        {/* Hamburger Menu */}
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="black" />
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Destination Info Header */}
      <View style={styles.destinationHeader}>
        <View style={styles.destinationCard}>
          <Text style={styles.destinationTitle}>Destination</Text>
          <Text style={styles.destinationAddress}>
            {destination?.address || 'Emaar Dubai Hills Estate'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>
      
      {/* Route Details */}
      <View style={styles.routeDetails}>
        <View style={styles.pickupInfo}>
          <View style={styles.routeIcon}>
            <Ionicons name="ellipse" size={14} color="#10B981" />
          </View>
          <Text style={styles.pickupText}>Pick up point - 2 minutes</Text>
        </View>
        
        <View style={styles.pickupLocation}>
          <Text style={styles.pickupName}>{pickupPoint}</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </View>
      
      {/* Ride Details Card */}
      <View style={styles.rideDetailsCard}>
        <View style={styles.rideDetailRow}>
          <View style={styles.rideTypeContainer}>
            <Image
              source={{uri: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png'}}
              style={styles.rideTypeImage}
            />
            
            <View style={styles.rideTypeInfo}>
              <Text style={styles.rideTypeName}>Comfort</Text>
              <View style={styles.rideStats}>
                <Text style={styles.rideStat}>2 mins</Text>
                <Text style={styles.rideStat}> • </Text>
                <Text style={styles.rideStat}>4</Text>
              </View>
              <Text style={styles.rideTypeDescription}>
                Awesome rides with trusted Captains.
              </Text>
            </View>
          </View>
          
          <Text style={styles.priceText}>AED 88-107</Text>
        </View>
        
        {/* Payment Method */}
        <View style={styles.paymentRow}>
          <TouchableOpacity 
            style={styles.paymentMethod}
            onPress={handleChangePayment}
          >
            <Ionicons 
              name={
                paymentMethod === 'cash' 
                  ? 'cash-outline' 
                  : paymentMethod === 'card' 
                    ? 'card-outline' 
                    : 'wallet-outline'
              } 
              size={18} 
              color="black" 
            />
            <Text style={styles.paymentText}>
              {paymentMethod === 'cash' 
                ? 'Payment Method' 
                : paymentMethod === 'card' 
                  ? 'Card' 
                  : 'Wallet'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.discountButton}
            onPress={handleToggleDiscount}
          >
            <MaterialIcons name="local-offer" size={18} color="#10B981" />
            <Text style={styles.discountText}>Discount</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>
        
        {/* Book Now Button */}
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleBookRide}
        >
          <Text style={styles.bookButtonText}>Yalla!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationHeader: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  destinationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationTitle: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  destinationAddress: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  originMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  destinationMarker: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeDetails: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeIcon: {
    marginRight: 10,
  },
  pickupText: {
    fontSize: 12,
    color: '#666',
  },
  pickupLocation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  rideDetailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  rideDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideTypeImage: {
    width: 50,
    height: 30,
    marginRight: 12,
  },
  rideTypeInfo: {
    flex: 1,
  },
  rideTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  rideStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  rideStat: {
    fontSize: 12,
    color: '#666',
  },
  rideTypeDescription: {
    fontSize: 12,
    color: '#666',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  paymentText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  discountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  discountText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    marginRight: 4,
  },
  bookButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default MuneefRideDetailsScreen;
