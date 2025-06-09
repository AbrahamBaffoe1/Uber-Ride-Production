// src/screens/home/LocationSearchScreen.tsx (Passenger App)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';

type LocationSearchScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'LocationSearch'>;

interface LocationResult {
  id: string;
  name: string;
  address: string;
  distance?: string;
  isSaved?: boolean;
}

const LocationSearchScreen = () => {
  const navigation = useNavigation<LocationSearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<LocationResult[]>([]);

  useEffect(() => {
    // Load recent searches on mount
    // In a real app, this would fetch from local storage or API
    setRecentSearches([
      {
        id: '1',
        name: 'Ikeja City Mall',
        address: 'Obafemi Awolowo Way, Ikeja, Lagos',
        isSaved: false,
      },
      {
        id: '2',
        name: 'Victoria Island',
        address: 'Victoria Island, Lagos',
        isSaved: false,
      },
      {
        id: '3',
        name: 'Shoprite Lekki',
        address: 'Lekki-Epe Expressway, Lekki Phase 1, Lagos',
        isSaved: true,
      },
    ]);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      handleSearch();
    } else if (searchQuery.length === 0) {
      setResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    setIsSearching(true);
    
    // In a real app, this would call a location search API
    // Simulate API call with timeout
    setTimeout(() => {
      if (searchQuery.length > 2) {
        // Mock search results based on query
        const mockResults: LocationResult[] = [
          {
            id: '101',
            name: 'Ikeja City Mall',
            address: 'Obafemi Awolowo Way, Ikeja, Lagos',
            distance: '2.3 km',
            isSaved: false,
          },
          {
            id: '102',
            name: 'Ikeja Golf Club',
            address: 'Lagos State Secretariat Rd, Ikeja, Lagos',
            distance: '3.1 km',
            isSaved: false,
          },
          {
            id: '103',
            name: 'Ikeja Computer Village',
            address: 'Pepple Street, Ikeja, Lagos',
            distance: '1.8 km',
            isSaved: true,
          },
        ].filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          item.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setResults(mockResults);
      } else {
        setResults([]);
      }
      
      setIsSearching(false);
    }, 1000);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
  };

  const handleLocationSelect = (location: LocationResult) => {
    // Add to recent searches (would store in real app)
    const newRecentSearches = [
      location,
      ...recentSearches.filter(item => item.id !== location.id),
    ].slice(0, 5); // Keep only most recent 5
    
    setRecentSearches(newRecentSearches);
    
    // Navigate to ride booking with selected location
    navigation.navigate('RideBooking', { 
      destination: location.address,
      destinationName: location.name,
    });
  };

  const handleSaveLocation = (location: LocationResult) => {
    // In a real app, this would save to user's saved places
    setResults(results.map(item => 
      item.id === location.id ? { ...item, isSaved: !item.isSaved } : item
    ));
    
    setRecentSearches(recentSearches.map(item => 
      item.id === location.id ? { ...item, isSaved: !item.isSaved } : item
    ));
  };

  const renderLocationItem = ({ item }: { item: LocationResult }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleLocationSelect(item)}
    >
      <View style={styles.locationInfo}>
        <View style={styles.locationIconContainer}>
          <Image
            source={require('../../assets/images/location-pin.png')}
            style={styles.locationIcon}
          />
        </View>
        <View style={styles.locationDetails}>
          <Text style={styles.locationName}>{item.name}</Text>
          <Text style={styles.locationAddress} numberOfLines={1}>{item.address}</Text>
          {item.distance && <Text style={styles.locationDistance}>{item.distance}</Text>}
        </View>
      </View>
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => handleSaveLocation(item)}
      >
        <Image
          source={
            item.isSaved
              ? require('../../assets/images/bookmark-filled.png')
              : require('../../assets/images/bookmark-outline.png')
          }
          style={styles.saveIcon}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderRecentSearchesHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recent Searches</Text>
    </View>
  );

  const renderSearchResultsHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Search Results</Text>
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
          <Image
            source={require('../../assets/images/back-arrow.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Image
            source={require('../../assets/images/search-icon.png')}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearSearch}
            >
              <Image
                source={require('../../assets/images/clear-icon.png')}
                style={styles.clearIcon}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E86DE" />
          <Text style={styles.loadingText}>Searching locations...</Text>
        </View>
      ) : (
        <FlatList
          data={results.length > 0 ? results : recentSearches}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            results.length > 0 ? renderSearchResultsHeader : renderRecentSearchesHeader
          }
          contentContainerStyle={styles.listContent}
        />
      )}
      
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={() => {
            // In a real app, this would get current location
            navigation.navigate('RideBooking', { 
              useCurrentLocation: true,
            });
          }}
        >
          <Image
            source={require('../../assets/images/current-location-icon.png')}
            style={styles.currentLocationIcon}
          />
          <Text style={styles.currentLocationText}>Use Current Location</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#333333',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    width: 16,
    height: 16,
    tintColor: '#666666',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333333',
  },
  clearButton: {
    padding: 8,
  },
  clearIcon: {
    width: 16,
    height: 16,
    tintColor: '#999999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 80, // Space for bottom bar
  },
  sectionHeader: {
    padding: 16,
    backgroundColor: '#F9F9F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationIcon: {
    width: 20,
    height: 20,
    tintColor: '#2E86DE',
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  locationDistance: {
    fontSize: 12,
    color: '#999999',
  },
  saveButton: {
    padding: 8,
  },
  saveIcon: {
    width: 20,
    height: 20,
    tintColor: '#2E86DE',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    justifyContent: 'center',
  },
  currentLocationIcon: {
    width: 20,
    height: 20,
    tintColor: '#2E86DE',
    marginRight: 8,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E86DE',
  },
});

export default LocationSearchScreen;