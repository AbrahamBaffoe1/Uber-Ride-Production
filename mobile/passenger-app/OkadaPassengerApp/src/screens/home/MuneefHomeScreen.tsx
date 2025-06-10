import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  FlatList,
  Dimensions,
  ScrollView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Ride option type definition
interface RideOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const MuneefHomeScreen: React.FC<Props> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [destination, setDestination] = useState<string>('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 25.2048,
    longitude: 55.2708, // Dubai coordinates as default
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const mapRef = useRef<MapView>(null);

  // Get current location
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
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    if (isFocused) {
      getLocation();
    }
  }, [isFocused]);

  // Handle destination input
  const handleDestinationPress = () => {
    navigation.navigate('Map', {
      initialLocation: currentLocation || undefined,
      onSelectLocation: (location) => {
        setDestination(location.address);
      }
    });
  };

  // Handle ride selection
  const handleRideSelect = (rideId: string) => {
    if (!destination) {
      // If no destination is set, prompt user to enter destination first
      return;
    }
    
    // Navigate to booking screen with ride type
    navigation.navigate('Booking', {
      destination: {
        address: destination,
        coordinates: {
          latitude: mapRegion.latitude + 0.01, // Just a placeholder
          longitude: mapRegion.longitude + 0.01
        }
      }
    });
  };

  // Ride options data
  const rideOptions: RideOption[] = [
    {
      id: 'rides',
      name: 'Rides',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/744/744465.png'}} style={styles.optionIcon} />,
      description: 'Rides'
    },
    {
      id: 'rides-plus',
      name: 'Rides Plus',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2115/2115955.png'}} style={styles.optionIcon} />,
      description: 'Rides Plus'
    },
    {
      id: 'e-bike',
      name: 'E-Bike',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png'}} style={styles.optionIcon} />,
      description: 'E-Bike'
    },
    {
      id: 'city-to-city',
      name: 'City to City',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2942/2942076.png'}} style={styles.optionIcon} />,
      description: 'City to City'
    }
  ];

  const secondRowOptions = [
    {
      id: 'right-click',
      name: 'Right Click',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/126/126474.png'}} style={styles.optionIcon} />,
      description: 'Right Click'
    },
    {
      id: 'send',
      name: 'Send',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2989/2989907.png'}} style={styles.optionIcon} />,
      description: 'Send'
    },
    {
      id: 'food',
      name: 'Food',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/2921/2921822.png'}} style={styles.optionIcon} />,
      description: 'Food'
    },
    {
      id: 'request',
      name: 'Request',
      icon: <Image source={{uri: 'https://cdn-icons-png.flaticon.com/512/3488/3488426.png'}} style={styles.optionIcon} />,
      description: 'Request'
    }
  ];

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
      />
      
      {/* Header with Logo and Pay Button */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Image 
              source={{uri: 'https://cdn-icons-png.flaticon.com/512/5087/5087579.png'}} 
              style={styles.logo}
            />
            <Text style={styles.logoText}>MUNEEF</Text>
          </View>
          
          <TouchableOpacity style={styles.payButton}>
            <Text style={styles.payButtonText}>Pay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      {/* Main Content */}
      <View style={styles.content}>
        {/* Destination Input */}
        <View style={styles.destinationContainer}>
          <Text style={styles.destinationTitle}>City Destination</Text>
          <Text style={styles.destinationSubtitle}>For those of you who want to go somewhere</Text>
          
          <TouchableOpacity 
            style={styles.destinationInput}
            onPress={handleDestinationPress}
          >
            <Text style={styles.whereTo}>Where to?</Text>
            <View style={styles.whereToIcon}>
              <Ionicons name="location" size={20} color="#FF3B30" />
            </View>
          </TouchableOpacity>
          
          {/* Discount Banner */}
          <TouchableOpacity style={styles.discountBanner}>
            <Text style={styles.discountText}>Discount up to 20% use code : كيف</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Ride Options */}
        <View style={styles.rideOptionsContainer}>
          <Text style={styles.rideOptionsTitle}>Choose What You Need</Text>
          <Text style={styles.rideOptionsSubtitle}>For you who know what you want to ride.</Text>
          
          {/* First Row Options */}
          <View style={styles.optionsRow}>
            {rideOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={() => handleRideSelect(option.id)}
              >
                <View style={styles.optionIconContainer}>
                  {option.icon}
                </View>
                <Text style={styles.optionName}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Second Row Options */}
          <View style={styles.optionsRow}>
            {secondRowOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={() => handleRideSelect(option.id)}
              >
                <View style={styles.optionIconContainer}>
                  {option.icon}
                </View>
                <Text style={styles.optionName}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#10B981" />
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="headset" size={24} color="#999" />
          <Text style={styles.navText}>Help</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time" size={24} color="#999" />
          <Text style={styles.navText}>Activity</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#999" />
          <Text style={styles.navText}>Profile</Text>
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  payButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 100, // Give space for the header
    justifyContent: 'center',
  },
  destinationContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  destinationTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  destinationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  destinationInput: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  whereTo: {
    fontSize: 16,
    color: '#333',
  },
  whereToIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  discountBanner: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  discountText: {
    color: '#fff',
    fontWeight: '600',
  },
  rideOptionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 16,
    marginTop: 0,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  rideOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  rideOptionsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionItem: {
    alignItems: 'center',
    width: (width - 32 - 40) / 4, // Distribute evenly in the row
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionIcon: {
    width: 30,
    height: 30,
  },
  optionName: {
    fontSize: 12,
    textAlign: 'center',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  activeNavText: {
    color: '#10B981',
  },
});

export default MuneefHomeScreen;
