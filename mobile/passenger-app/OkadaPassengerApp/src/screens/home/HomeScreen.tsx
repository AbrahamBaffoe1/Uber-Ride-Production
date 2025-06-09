import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
  ImageBackground,
  Easing,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Rect, Defs, LinearGradient as SvgGradient, Stop, ClipPath } from 'react-native-svg';
import { locationService, SavedLocation } from '../../api/services/location.service';
import { rideService, RideEstimate as ApiRideEstimate, RideHistory } from '../../api/services/rideService';

// Extended RideEstimate for UI display
interface RideEstimate extends ApiRideEstimate {
  id: string;
  type: string;
  icon: string;
  price: string;
  time: string;
  rating: string;
  distance: string;
  selected: boolean;
}
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Location from 'expo-location';
import { authService, User } from '../../api/services/authService';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Animated Map Marker Component
const AnimatedMapMarker = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        }),
      ])
    ).start();
  }, []);
  
  return (
    <Animated.View style={[styles.mapMarkerContainer, {
      transform: [{ scale: pulseAnim }]
    }]}>
      <View style={styles.mapMarkerInner}>
        <View style={styles.mapMarkerCore}></View>
      </View>
    </Animated.View>
  );
};

// CustomMapView Component
const CustomMapView = ({ navigation }: { navigation: HomeScreenNavigationProp }) => {
  return (
    <View style={styles.mapContainer}>
      <TouchableOpacity 
        activeOpacity={0.9}
        style={{width: '100%', height: '100%', position: 'relative'}}
        onPress={() => navigation.navigate('Map', {})}
      >
        <Image 
          source={{ uri: 'https://via.placeholder.com/600/DDEEFF/0066cc?text=' }}
          style={styles.mapBackground}
          resizeMode="cover"
        />
        <AnimatedMapMarker />
        
        <View style={styles.mapOpenButtonContainer}>
          <Text style={styles.mapOpenButtonText}>View Real Map</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.mapLocationButton}>
        <View style={styles.mapLocationButtonInner}>
          <Text style={styles.mapLocationIcon}>📍</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Navigation Menu Modal
interface NavigationMenuModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: HomeScreenNavigationProp;
  user: User | null;
}

const NavigationMenuModal = ({ visible, onClose, navigation, user }: NavigationMenuModalProps) => {
  const menuItems = [
    { icon: "🏠", title: "Home", screen: "Home" },
    { icon: "🗺️", title: "Book a Ride", screen: "Booking" },
    { icon: "🕒", title: "Ride History", screen: "RideHistory" },
    { icon: "📍", title: "Saved Locations", screen: "SavedLocations" },
    { icon: "🔔", title: "Notifications", screen: "Notifications" },
    { icon: "💳", title: "Payment Methods", screen: "Payment" },
    { icon: "🎁", title: "Promo Codes", screen: "PromoCodes" },
    { icon: "⚙️", title: "Settings", screen: "Settings" },
    { icon: "🛡️", title: "Safety", screen: "Safety" },
    { icon: "❓", title: "Support", screen: "Support" },
  ];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.navigationModalOverlay}>
        <View style={styles.navigationMenuContainer}>
          <View style={styles.navigationMenuHeader}>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.navigationMenuCloseButton}
            >
              <Text style={styles.navigationMenuCloseIcon}>✕</Text>
            </TouchableOpacity>
            
            {user ? (
              <View style={styles.navigationMenuUserInfo}>
                <View style={styles.navigationMenuAvatar}>
                  <Text style={styles.navigationMenuAvatarText}>
                    {user.firstName ? 
                      user.firstName.charAt(0) + (user.lastName ? user.lastName.charAt(0) : '') 
                      : 'OK'}
                  </Text>
                </View>
                <View style={styles.navigationMenuUserDetails}>
                  <Text style={styles.navigationMenuUserName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={styles.navigationMenuUserEmail}>
                    {user.email || 'No email provided'}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.navigationMenuLoginButton}
                onPress={() => {
                  onClose();
                  navigation.navigate('Login');
                }}
              >
                <Text style={styles.navigationMenuLoginText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.navigationMenuContent}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.navigationMenuItem}
                onPress={() => {
                  onClose();
                  // Navigate to screen using type checking from RootStackParamList
                  if (item.screen === 'Home') {
                    navigation.navigate('Home');
                  } else if (item.screen === 'Booking') {
                    navigation.navigate('Booking');
                  } else if (item.screen === 'RideHistory') {
                    navigation.navigate('RideHistory');
                  } else if (item.screen === 'SavedLocations') {
                    navigation.navigate('SavedLocations');
                  } else if (item.screen === 'Notifications') {
                    navigation.navigate('Notifications');
                  } else if (item.screen === 'Payment') {
                    navigation.navigate('Payment');
                  } else if (item.screen === 'PromoCodes') {
                    navigation.navigate('PromoCodes');
                  } else if (item.screen === 'Settings') {
                    navigation.navigate('Settings');
                  } else if (item.screen === 'Safety') {
                    navigation.navigate('Safety');
                  } else if (item.screen === 'Support') {
                    navigation.navigate('Support');
                  } else {
                    // For any unhandled routes
                    Alert.alert('Coming Soon', 'This feature will be available soon!');
                  }
                }}
              >
                <View style={styles.navigationMenuItemIcon}>
                  <Text style={styles.navigationMenuItemIconText}>{item.icon}</Text>
                </View>
                <Text style={styles.navigationMenuItemTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {user && (
            <TouchableOpacity 
              style={styles.navigationMenuLogoutButton}
              onPress={async () => {
                try {
                  await authService.logout();
                  onClose();
                  Alert.alert("Success", "You have been logged out successfully");
                } catch (error) {
                  console.error("Logout error:", error);
                  Alert.alert("Error", "Could not log out. Please try again.");
                }
              }}
            >
              <Text style={styles.navigationMenuLogoutText}>Log Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Type definitions for component props
interface TabViewProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

interface RideOptionCardProps {
  type: string;
  icon: string;
  price: string;
  time: string;
  rating: string;
  distance: string;
  selected: boolean;
  onSelect: () => void;
  luxury?: boolean;
}

interface RecentTripProps {
  destination: string;
  date: string;
  price: string;
  status: 'completed' | 'cancelled' | 'scheduled' | string;
  driver?: {
    name: string;
    avatar: string;
  } | null;
}

interface PromotionCardProps {
  title: string;
  description: string;
  code?: string;
  expiryDate?: string;
  colors: [string, string, ...string[]]; // Ensuring at least two colors for LinearGradient
  image?: string;
}

interface PlaceCardProps {
  title: string;
  address: string;
  icon: string;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
}

interface DestinationSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

interface RecentSearch {
  id: string;
  title: string;
  address: string;
}

interface CurrentLocation {
  latitude: number;
  longitude: number;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  code?: string;
  expiryDate?: string;
  colors: [string, string, ...string[]];
  image?: string;
}

// Custom types for app-specific data that might not match the service types
interface AppRideHistory {
  id: string;
  destination: string;
  date: string;
  price: string;
  status: string;
  driver?: {
    name: string;
    avatar: string;
  } | null;
}

// Custom Tab View Component
const TabView = ({ tabs, activeTab, onTabChange }: TabViewProps) => {
  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.tabButton,
            activeTab === index && styles.activeTabButton
          ]}
          onPress={() => onTabChange(index)}
        >
          <Text style={[
            styles.tabText,
            activeTab === index && styles.activeTabText
          ]}>
            {tab}
          </Text>
          {activeTab === index && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Premium RideOption Card
const RideOption = ({ type, icon, price, time, rating, distance, selected, onSelect, luxury = false }: RideOptionCardProps) => {
  return (
    <TouchableOpacity 
      style={[
        styles.rideOptionCard, 
        selected && styles.selectedRideOptionCard,
        luxury && styles.luxuryRideOptionCard
      ]} 
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {luxury && (
        <LinearGradient
          colors={['#E9B64B', '#CE9830']}
          style={styles.luxuryBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.luxuryBadgeText}>PREMIUM</Text>
        </LinearGradient>
      )}
      
      <View style={[
        styles.rideOptionIconContainer, 
        selected && styles.selectedRideOptionIconContainer,
        luxury && styles.luxuryRideOptionIconContainer
      ]}>
        <Text style={styles.rideOptionIcon}>{icon}</Text>
      </View>
      
      <Text style={[
        styles.rideOptionType,
        selected && styles.selectedRideOptionType,
        luxury && styles.luxuryRideOptionType
      ]}>
        {type}
      </Text>
      
      <View style={styles.rideOptionDetails}>
        <Text style={[
          styles.rideOptionPrice,
          luxury && styles.luxuryRideOptionPrice
        ]}>
          {price}
        </Text>
        <Text style={styles.rideOptionTime}>{time}</Text>
      </View>
      
      <View style={styles.rideOptionRating}>
        <Text style={styles.rideOptionRatingText}>★ {rating}</Text>
        <Text style={styles.rideOptionDistance}>{distance}</Text>
      </View>
      
      {selected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIndicatorText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// RecentTrip Component
const RecentTrip = ({ destination, date, price, status, driver = null }: RecentTripProps) => {
  return (
    <Pressable style={({ pressed }) => [
      styles.recentTripCard,
      pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
    ]}>
      <View style={styles.recentTripContent}>
        <View style={styles.recentTripHeader}>
          <View style={[
            styles.recentTripStatusDot,
            status === 'completed' && styles.completedStatusDot,
            status === 'cancelled' && styles.cancelledStatusDot,
            status === 'scheduled' && styles.scheduledStatusDot
          ]} />
          <Text style={styles.recentTripDestination}>{destination}</Text>
          <Text style={styles.recentTripPrice}>{price}</Text>
        </View>
        
        <View style={styles.recentTripDetails}>
          <View style={styles.recentTripDateContainer}>
            <Text style={styles.recentTripDateIcon}>🕒</Text>
            <Text style={styles.recentTripDate}>{date}</Text>
          </View>
          
          {driver && (
            <View style={styles.recentTripDriverContainer}>
              <Image 
                source={{ uri: driver.avatar }} 
                style={styles.recentTripDriverAvatar} 
              />
              <Text style={styles.recentTripDriverName}>{driver.name}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.recentTripActions}>
        <TouchableOpacity style={styles.recentTripActionButton}>
          <Text style={styles.recentTripActionText}>Repeat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recentTripActionButton}>
          <Text style={styles.recentTripActionText}>Details</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

// Promotion Card
const PromotionCard = ({ title, description, code, expiryDate, colors, image }: PromotionCardProps) => {
  return (
    <View style={styles.promotionCardContainer}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promotionCard}
      >
        {image && (
          <Image 
            source={{ uri: image }}
            style={styles.promotionImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.promotionContent}>
          <Text style={styles.promotionTitle}>{title}</Text>
          <Text style={styles.promotionDescription}>{description}</Text>
          
          {code && (
            <View style={styles.promotionCodeContainer}>
              <Text style={styles.promotionCode}>{code}</Text>
            </View>
          )}
          
          {expiryDate && (
            <Text style={styles.promotionExpiry}>Valid until {expiryDate}</Text>
          )}
          
          <TouchableOpacity style={styles.promotionButton}>
            <Text style={styles.promotionButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

// Activity Chart Component
const RideActivityChart = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [0, 0, 0, 0, 0, 0, 0]; // Reset to all zeros
  const maxValue = Math.max(...data);
  
  return (
    <View style={styles.activityChartContainer}>
      <View style={styles.activityChartHeader}>
        <Text style={styles.activityChartTitle}>Your Activity</Text>
        <TouchableOpacity style={styles.activityChartMoreButton}>
          <Text style={styles.activityChartMoreText}>See Details</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.activityChart}>
        {data.map((value, index) => (
          <View key={index} style={styles.activityChartBarContainer}>
            <View style={styles.activityChartBarWrapper}>
              <LinearGradient
                colors={['#0066cc', '#1E90FF']}
                style={[
                  styles.activityChartBar,
                  { height: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%' }
                ]}
              />
            </View>
            <Text style={styles.activityChartLabel}>{days[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Place Card Component
const PlaceCard = ({ title, address, icon, onPress }: PlaceCardProps) => {
  return (
    <TouchableOpacity 
      style={styles.placeCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.placeIconContainer}>
        <Text style={styles.placeIcon}>{icon}</Text>
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeTitle}>{title}</Text>
        <Text style={styles.placeAddress}>{address}</Text>
      </View>
      <View style={styles.placeArrow}>
        <Text style={styles.placeArrowIcon}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

// Floating Action Button
const FloatingActionButton = ({ icon, onPress }: FloatingActionButtonProps) => {
  return (
    <TouchableOpacity 
      style={styles.floatingButton}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#0066cc', '#0052a3']}
        style={styles.floatingButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.floatingButtonIcon}>{icon}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Destination Search Modal
const DestinationSearchModal = ({ visible, onClose }: DestinationSearchModalProps) => {
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Load recent searches - would come from API in real app
  useEffect(() => {
    const loadRecentSearches = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        setRecentSearches([]);
      } catch (error) {
        console.error('Error loading recent searches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (visible) {
      loadRecentSearches();
    }
  }, [visible]);
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.searchModalCloseButton}>
              <Text style={styles.searchModalCloseIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.searchModalTitle}>Where to?</Text>
          </View>
          
          <View style={styles.searchModalInputContainer}>
            <View style={styles.searchModalIcon}>
              <Text style={styles.searchModalIconText}>🔍</Text>
            </View>
            <TextInput
              style={styles.searchModalInput}
              placeholder="Search destination"
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                style={styles.searchModalClearButton}
                onPress={() => setSearchText('')}
              >
                <Text style={styles.searchModalClearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.searchModalContent}>
            <Text style={styles.searchModalSectionTitle}>Recent Searches</Text>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0066cc" />
              </View>
            ) : (
              <>
                {recentSearches.length > 0 ? (
                  recentSearches.map((place) => (
                    <TouchableOpacity 
                      key={place.id}
                      style={styles.searchModalItem}
                      onPress={onClose}
                    >
                      <View style={styles.searchModalItemIconContainer}>
                        <Text style={styles.searchModalItemIcon}>🕒</Text>
                      </View>
                      <View style={styles.searchModalItemInfo}>
                        <Text style={styles.searchModalItemTitle}>{place.title}</Text>
                        <Text style={styles.searchModalItemAddress}>{place.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No recent searches yet</Text>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    width: '100%',
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 24,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationSelectorIcon: {
    marginRight: 6,
    fontSize: 16,
  },
  locationSelectorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: width * 0.4,
  },
  locationSelectorArrow: {
    color: '#ffffff',
    fontSize: 10,
    marginLeft: 5,
  },
  welcomeContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  welcomeSubtext: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchIconText: {
    fontSize: 16,
  },
  searchPlaceholder: {
    color: '#666',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mapPreviewContainer: {
    height: 200,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#d8e8f7',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    width: '100%',
    height: '100%',
  },
  mapLocationButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLocationButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLocationIcon: {
    fontSize: 16,
  },
  mapMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 102, 204, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066cc',
    borderWidth: 2,
    borderColor: '#fff',
  },
  mapOpenButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapOpenButtonText: {
    backgroundColor: 'rgba(0, 102, 204, 0.8)',
    color: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  tabSectionContainer: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0066cc',
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#0066cc',
    borderRadius: 1.5,
  },
  savedPlacesContainer: {
    padding: 16,
  },
  rideOptionsContainer: {
    padding: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    padding: 20,
  },
  addPlaceButton: {
    marginTop: 16,
    backgroundColor: '#0066cc',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPlaceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  placeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeIcon: {
    fontSize: 20,
  },
  placeInfo: {
    flex: 1,
  },
  placeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
  },
  placeArrow: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  placeArrowIcon: {
    fontSize: 24,
    color: '#999',
  },
  rideOptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  selectedRideOptionCard: {
    backgroundColor: '#e6f2ff',
    borderColor: '#0066cc',
    borderWidth: 1,
  },
  luxuryRideOptionCard: {
    backgroundColor: '#fcf7ee',
  },
  rideOptionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedRideOptionIconContainer: {
    backgroundColor: '#0066cc',
  },
  luxuryRideOptionIconContainer: {
    backgroundColor: '#faebd0',
  },
  rideOptionIcon: {
    fontSize: 24,
  },
  rideOptionType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectedRideOptionType: {
    color: '#0066cc',
  },
  luxuryRideOptionType: {
    color: '#9c7a2c',
  },
  rideOptionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideOptionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  luxuryRideOptionPrice: {
    color: '#9c7a2c',
  },
  rideOptionTime: {
    fontSize: 15,
    color: '#888',
  },
  rideOptionRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rideOptionRatingText: {
    fontSize: 14,
    color: '#555',
  },
  rideOptionDistance: {
    fontSize: 14,
    color: '#888',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  luxuryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  luxuryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recentTripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recentTripContent: {
    padding: 16,
  },
  recentTripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTripStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#888',
  },
  completedStatusDot: {
    backgroundColor: '#4CAF50',
  },
  cancelledStatusDot: {
    backgroundColor: '#F44336',
  },
  scheduledStatusDot: {
    backgroundColor: '#2196F3',
  },
  recentTripDestination: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recentTripPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  recentTripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTripDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTripDateIcon: {
    marginRight: 6,
    fontSize: 14,
    color: '#888',
  },
  recentTripDate: {
    fontSize: 14,
    color: '#888',
  },
  recentTripDriverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTripDriverAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  recentTripDriverName: {
    fontSize: 14,
    color: '#555',
  },
  recentTripActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  recentTripActionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTripActionText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '500',
  },
  promotionCardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  promotionCard: {
    height: 160,
    flexDirection: 'row',
  },
  promotionImage: {
    width: '40%',
    height: '100%',
  },
  promotionContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 12,
  },
  promotionCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  promotionCode: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  promotionExpiry: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 12,
  },
  promotionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  promotionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  activityChartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activityChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activityChartMoreButton: {
    padding: 4,
  },
  activityChartMoreText: {
    color: '#0066cc',
    fontSize: 14,
  },
  activityChart: {
    height: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 20,
  },
  activityChartBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  activityChartBarWrapper: {
    width: '50%',
    height: 100,
    justifyContent: 'flex-end',
  },
  activityChartBar: {
    width: '100%',
    borderRadius: 3,
  },
  activityChartLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonIcon: {
    fontSize: 24,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  searchModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.8,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchModalCloseButton: {
    padding: 8,
    marginRight: 8,
  },
  searchModalCloseIcon: {
    fontSize: 18,
    color: '#999',
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  searchModalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchModalIcon: {
    marginRight: 8,
  },
  searchModalIconText: {
    fontSize: 16,
    color: '#999',
  },
  searchModalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchModalClearButton: {
    padding: 8,
  },
  searchModalClearIcon: {
    fontSize: 16,
    color: '#999',
  },
  searchModalContent: {
    flex: 1,
    padding: 16,
  },
  searchModalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  searchModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchModalItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchModalItemIcon: {
    fontSize: 20,
    color: '#666',
  },
  searchModalItemInfo: {
    flex: 1,
  },
  searchModalItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  searchModalItemAddress: {
    fontSize: 14,
    color: '#666',
  },
  // Navigation menu styles
  navigationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  navigationMenuContainer: {
    backgroundColor: '#fff',
    width: '80%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  navigationMenuHeader: {
    backgroundColor: '#0066cc',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  navigationMenuCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  navigationMenuCloseIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navigationMenuUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  navigationMenuAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  navigationMenuAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  navigationMenuUserDetails: {
    flex: 1,
  },
  navigationMenuUserName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  navigationMenuUserEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  navigationMenuLoginButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  navigationMenuLoginText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationMenuContent: {
    flex: 1,
    paddingTop: 15,
  },
  navigationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navigationMenuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  navigationMenuItemIconText: {
    fontSize: 20,
  },
  navigationMenuItemTitle: {
    fontSize: 16,
    color: '#333',
  },
  navigationMenuLogoutButton: {
    margin: 20,
    backgroundColor: '#f0f2f5',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  navigationMenuLogoutText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default function HomeScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState<boolean>(true);
  const isFocused = useIsFocused();
  const [navigationMenuVisible, setNavigationMenuVisible] = useState(false);
  
  // Effect to fetch the current user
  useEffect(() => {
    let isMounted = true;
    
    const fetchCurrentUser = async () => {
      if (!isFocused) return;
      
      setUserLoading(true);
      try {
        const currentUser = await authService.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      } finally {
        if (isMounted) {
          setUserLoading(false);
        }
      }
    };
    
    fetchCurrentUser();
    
    // Set up auth state change listener
    const unsubscribe = authService.onAuthStateChanged((updatedUser) => {
      if (isMounted) {
        setUser(updatedUser);
        setUserLoading(false);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isFocused]);
  const [selectedRideType, setSelectedRideType] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [locationName, setLocationName] = useState('Current Location');
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // State for API data - initialize with empty arrays
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([]);
  const [rideOptions, setRideOptions] = useState<RideEstimate[]>([]);
  const [recentTrips, setRecentTrips] = useState<RideHistory[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  
  // Loading states
  const [isLoadingSavedPlaces, setIsLoadingSavedPlaces] = useState(false);
  const [isLoadingRideOptions, setIsLoadingRideOptions] = useState(false);
  const [isLoadingRecentTrips, setIsLoadingRecentTrips] = useState(false);
  
  // Track API request count to prevent infinite loop
  const rideHistoryApiRequestCount = useRef(0);
  
  // Initial animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);
  
  // Get current location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('Location permission denied');
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        // Reverse geocode to get location name
        try {
          const response = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          
          if (response.length > 0) {
            const address = response[0];
            const name = address.street 
              ? `${address.street}, ${address.city || ''}`
              : address.name || 'Current Location';
            
            setLocationName(name);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
        }
      } catch (error) {
        console.error('Error getting current location:', error);
      }
    };
    
    if (isFocused) {
      getCurrentLocation();
    }
  }, [isFocused]);
  
  // Fetch saved places from API - only once when focused
  useEffect(() => {
    let isMounted = true;
    
    const fetchSavedPlaces = async () => {
      if (!user?.id) return;
      
      setIsLoadingSavedPlaces(true);
      try {
        // Check if user is authenticated by getting token first
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          console.log('Not authenticated, skipping saved places fetch');
          if (isMounted) {
            setSavedPlaces([]);
            setIsLoadingSavedPlaces(false);
          }
          return;
        }
        
        const places = await locationService.getSavedLocations();
        if (isMounted) {
          setSavedPlaces(places);
        }
      } catch (error) {
        // Handle error quietly - don't show error in console
        if (isMounted) {
          setSavedPlaces([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSavedPlaces(false);
        }
      }
    };
    
    if (isFocused) {
      fetchSavedPlaces();
    }
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, isFocused]);
  
  // Fetch ride options from API - only when location changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchRideOptions = async () => {
      if (!currentLocation) return;
      
      setIsLoadingRideOptions(true);
      try {
        // Use current position as starting point
        const startLat = currentLocation.latitude;
        const startLng = currentLocation.longitude;
        
        // Get a popular destination from the saved locations or use city center
        let destLat = 0, destLng = 0;
        
        // Try to fetch a popular destination if available
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          try {
            // Get popular destinations (or saved locations as fallback)
            const popularDestinations = await locationService.getPopularDestinations();
            if (popularDestinations && popularDestinations.length > 0) {
              // Use the first popular destination
              destLat = popularDestinations[0].coordinates.latitude;
              destLng = popularDestinations[0].coordinates.longitude;
            } else if (savedPlaces && savedPlaces.length > 0) {
              // Fall back to first saved place if available
              destLat = savedPlaces[0].coordinates.latitude;
              destLng = savedPlaces[0].coordinates.longitude;
            }
          } catch (error) {
            console.error('Error fetching popular destinations:', error);
          }
        }
        
        // If we couldn't get a destination, use a default city center point
        if (destLat === 0 || destLng === 0) {
          // Get nearest city center based on current coordinates
          try {
            const cityCenterResponse = await locationService.getNearestCityCenter(
              currentLocation.latitude,
              currentLocation.longitude
            );
            
            if (cityCenterResponse) {
              destLat = cityCenterResponse.latitude;
              destLng = cityCenterResponse.longitude;
            } else {
              // Last resort fallback if all else fails
              destLat = currentLocation.latitude + 0.05; // ~5km away
              destLng = currentLocation.longitude + 0.05;
            }
          } catch (error) {
            console.error('Error getting nearest city center:', error);
            // Last resort fallback if all else fails
            destLat = currentLocation.latitude + 0.05;
            destLng = currentLocation.longitude + 0.05;
          }
        }
        
        // Get ride estimates with real start and destination
        const apiOptions = await rideService.getRideEstimates(
          startLat,
          startLng,
          destLat,
          destLng
        );
        
        // Map of ride types to appropriate icons
        const rideIconMap: Record<string, string> = {
          'Economy': '🚗',
          'Standard': '🚕',
          'Premium': '🏎️',
          'SUV': '🚙',
          'Luxury': '🚘',
          'XL': '🚐',
          'Bike': '🏍️',
          'Tuk-Tuk': '🛺',
          'Okada': '🏍️'
        };
        
        // Transform API response to match UI components' expected format
        const transformedOptions: RideEstimate[] = apiOptions.map((option, index) => {
          const rideType = option.rideType || 'Standard';
          const iconEmoji = rideIconMap[rideType] || '🚕'; // Default to taxi icon
          
          return {
            ...option,
            id: option.id || `ride-${index}`,
            type: rideType,
            icon: iconEmoji,
            price: option.estimatedPrice || `$${(5 + Math.random() * 15).toFixed(2)}`,
            time: option.estimatedTime || `${Math.floor(5 + Math.random() * 10)} mins`,
            rating: option.rating || '4.8',
            distance: option.distance || `${(2 + Math.random() * 8).toFixed(1)} km`,
            selected: index === 0
          };
        });
        
        if (isMounted) {
          setRideOptions(transformedOptions);
        }
      } catch (error) {
        // Handle error quietly
        if (isMounted) {
          setRideOptions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRideOptions(false);
        }
      }
    };
    
    // Only fetch when focused and location is available and not already loading
    if (isFocused && currentLocation && !isLoadingRideOptions) {
      fetchRideOptions();
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentLocation, isFocused, isLoadingRideOptions]);
  
  // Fetch recent trips from API - using real API data only
  useEffect(() => {
    let isMounted = true;
    
    const fetchRecentTrips = async () => {
      if (!user?.id) return;
      
      setIsLoadingRecentTrips(true);
      try {
        // Get authentication token
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
          console.error('Authentication token not found');
          if (isMounted) {
            setRecentTrips([]);
            setIsLoadingRecentTrips(false);
          }
          return;
        }
        
        // Configure axios with auth header
        const axiosConfig = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        // Set timeout and retry configurations
        const maxRetries = 3;
        let retryCount = 0;
        let retryDelay = 1000;
        
        // Make API request with retry logic
        const makeRequest = async (): Promise<RideHistory[]> => {
          try {
            // Use the rideService directly
            const rideHistory = await rideService.getRideHistory();
            return rideHistory;
          } catch (error) {
            if (axios.isAxiosError(error)) {
              // Handle rate limiting (429)
              if (error.response?.status === 429 && retryCount < maxRetries) {
                console.log(`Rate limited (429), retrying in ${retryDelay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                retryCount++;
                retryDelay *= 2; // Exponential backoff
                
                return makeRequest();
              }
              
              // Handle authentication errors (401)
              if (error.response?.status === 401) {
                // Token is invalid, clear it from storage
                await AsyncStorage.removeItem('authToken');
                throw new Error('Authentication expired, please log in again');
              }
              
              // Handle server errors (500)
              if (error.response?.status && error.response.status >= 500) {
                throw new Error(`Server error: ${error.response.status}`);
              }
            }
            
            // Re-throw all other errors
            throw error;
          }
        };
        
        // Make the API call
        const rideHistory = await makeRequest();
        
        if (isMounted) {
          setRecentTrips(rideHistory);
        }
      } catch (error) {
        console.error('Error fetching ride history:', error);
        if (isMounted) {
          // Set empty array on error, no mock data
          setRecentTrips([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRecentTrips(false);
        }
      }
    };
    
    if (isFocused) {
      fetchRecentTrips();
    }
    
    return () => {
      isMounted = false;
      
      // Reset the counter when component unmounts
      if (!isFocused) {
        rideHistoryApiRequestCount.current = 0;
      }
    };
  }, [user?.id, isFocused]);
  
  // Animation values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [150, 60],
    extrapolate: 'clamp'
  });
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0.6, 0],
    extrapolate: 'clamp'
  });
  
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0066cc" />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={['#0066cc', '#004C99']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <SafeAreaView style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => setNavigationMenuVisible(true)}
              >
                <View style={styles.menuButtonIcon}>
                  <View style={styles.menuLine}></View>
                  <View style={styles.menuLine}></View>
                  <View style={styles.menuLine}></View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.locationSelector}
                onPress={() => setSearchModalVisible(true)}
              >
                <Text style={styles.locationSelectorIcon}>📍</Text>
                <Text style={styles.locationSelectorText}>{locationName}</Text>
                <Text style={styles.locationSelectorArrow}>▼</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <LinearGradient
                  colors={['#e6f2ff', '#ffffff']}
                  style={styles.profileButtonGradient}
                >
                  <Text style={styles.profileButtonText}>
                    {user && user.firstName ? 
                      user.firstName.charAt(0) + (user.lastName ? user.lastName.charAt(0) : '') 
                      : 'OK'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            <Animated.View style={[styles.welcomeContainer, { opacity: headerOpacity }]}>
              <Text style={styles.welcomeText}>Welcome!</Text>
              <Text style={styles.welcomeSubtext}>Where are you going today?</Text>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>
      
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => navigation.navigate('Booking')}
          activeOpacity={0.8}
        >
          <View style={styles.searchIcon}>
            <Text style={styles.searchIconText}>🔍</Text>
          </View>
          <Text style={styles.searchPlaceholder}>Where to?</Text>
        </TouchableOpacity>
      </View>
      
      {/* Main Content */}
      {/* Navigation Menu Modal */}
      <NavigationMenuModal
        visible={navigationMenuVisible}
        onClose={() => setNavigationMenuVisible(false)}
        navigation={navigation}
        user={user}
      />
      
      {/* Destination Search Modal */}
      <DestinationSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Map Preview */}
        <View style={styles.mapPreviewContainer}>
          <CustomMapView navigation={navigation} />
        </View>
        
        {/* Places & Rides Tabs */}
        <View style={styles.tabSectionContainer}>
          <TabView 
            tabs={['Places', 'Rides']} 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          />
          
          {activeTab === 0 ? (
            <View style={styles.savedPlacesContainer}>
              {isLoadingSavedPlaces ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#0066cc" />
                </View>
              ) : (
                <>
                  {savedPlaces.length > 0 ? (
                    savedPlaces.map(place => (
                      <PlaceCard
                        key={place.id}
                        title={place.name}
                        address={place.address}
                        icon={place.icon || "🏠"}
                        onPress={() => {
                          navigation.navigate('Booking', {
                            destination: {
                              address: place.address,
                              coordinates: place.coordinates
                            }
                          });
                        }}
                      />
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No saved places yet</Text>
                  )}
                  <TouchableOpacity style={styles.addPlaceButton} onPress={() => navigation.navigate('SavedLocations')}>
                    <Text style={styles.addPlaceButtonText}>Add Place</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.rideOptionsContainer}>
              {isLoadingRideOptions ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#0066cc" />
                </View>
              ) : (
                <>
                  {rideOptions.length > 0 ? (
                    rideOptions.map(option => (
                      <RideOption
                        key={option.id}
                        type={option.type}
                        icon={option.icon}
                        price={option.price}
                        time={option.time}
                        rating={option.rating}
                        distance={option.distance}
                        selected={option.selected}
                        onSelect={() => {
                          // Convert ride option to destination format since that's what Booking screen expects
                          navigation.navigate('Booking', {
                            destination: {
                              address: `Ride: ${option.type}`,
                              coordinates: {
                                latitude: currentLocation?.latitude || 0,
                                longitude: currentLocation?.longitude || 0
                              }
                            }
                          });
                        }}
                      />
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No ride options available</Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Quick Access Floating Action Button */}
      <FloatingActionButton 
        icon="+" 
        onPress={() => {
          // Show quick actions menu or direct navigate to booking
          navigation.navigate('Booking');
        }}
      />
    </Animated.View>
  );
};
