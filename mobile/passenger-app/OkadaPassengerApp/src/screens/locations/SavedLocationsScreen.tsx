import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { locationService, SavedLocation } from '../../api/services/location.service';
import { RootStackParamList } from '../../navigation/types';

interface NewLocationForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  icon: string;
}

const SavedLocationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLocation, setNewLocation] = useState<NewLocationForm>({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    icon: 'pin'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load saved locations from the API
  useEffect(() => {
    fetchSavedLocations();
  }, []);

  const fetchSavedLocations = async () => {
    try {
      setIsLoading(true);
      const locationsData = await locationService.getSavedLocations();
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      Alert.alert(
        'Error',
        'Failed to load your saved locations. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      setDeleteLoading(locationId);
      
      // Confirm deletion
      Alert.alert(
        'Delete Location',
        'Are you sure you want to delete this saved location?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setDeleteLoading(null)
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await locationService.deleteSavedLocation(locationId);
                // Update local state after successful deletion
                setLocations(prevLocations => 
                  prevLocations.filter(location => location.id !== locationId)
                );
                setDeleteLoading(null);
              } catch (error) {
                console.error('Error deleting location:', error);
                Alert.alert('Error', 'Failed to delete location. Please try again.');
                setDeleteLoading(null);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in delete flow:', error);
      setDeleteLoading(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newLocation.name) {
      errors.name = 'Name is required';
    }
    
    if (!newLocation.address) {
      errors.address = 'Address is required';
    }
    
    if (!newLocation.latitude || isNaN(Number(newLocation.latitude))) {
      errors.latitude = 'Valid latitude is required';
    } else {
      const lat = Number(newLocation.latitude);
      if (lat < -90 || lat > 90) {
        errors.latitude = 'Latitude must be between -90 and 90';
      }
    }
    
    if (!newLocation.longitude || isNaN(Number(newLocation.longitude))) {
      errors.longitude = 'Valid longitude is required';
    } else {
      const lng = Number(newLocation.longitude);
      if (lng < -180 || lng > 180) {
        errors.longitude = 'Longitude must be between -180 and 180';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddLocation = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const newLocationData = {
        name: newLocation.name,
        address: newLocation.address,
        coordinates: {
          latitude: Number(newLocation.latitude),
          longitude: Number(newLocation.longitude)
        },
        icon: newLocation.icon || 'pin'
      };
      
      const addedLocation = await locationService.addSavedLocation(newLocationData);
      
      // Update the locations list with the new location
      setLocations(prevLocations => [...prevLocations, addedLocation]);
      
      // Reset form and close modal
      setNewLocation({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        icon: 'pin'
      });
      setIsAddModalVisible(false);
      
    } catch (error) {
      console.error('Error adding location:', error);
      Alert.alert(
        'Error',
        'Failed to add new location. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconForLocation = (location: SavedLocation) => {
    const icon = location.icon || 'pin';
    
    switch (icon) {
      case 'home': return 'home-outline';
      case 'work': return 'briefcase-outline';
      case 'favorite': return 'heart-outline';
      case 'pin': return 'location-outline';
      default: return 'location-outline';
    }
  };

  const renderLocationItem = ({ item }: { item: SavedLocation }) => (
    <TouchableOpacity 
      style={styles.locationItem}
      onPress={() => {
        // Handle location selection
        Alert.alert(
          'Location Selected',
          `Selected "${item.name}" at ${item.address}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to previous screen where this might be used
                navigation.goBack();
              }
            }
          ]
        );
      }}
    >
      <View style={styles.locationIcon}>
        <Ionicons name={getIconForLocation(item)} size={24} color="#7AC231" />
      </View>
      <View style={styles.locationDetails}>
        <Text style={styles.locationName}>{item.name}</Text>
        <Text style={styles.locationAddress}>{item.address}</Text>
      </View>
      
      <View style={styles.itemActions}>
        {deleteLoading === item.id ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteLocation(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  // Render the Add Location Modal
  const renderAddLocationModal = () => (
    <Modal
      visible={isAddModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsAddModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Location</Text>
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(false)}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              style={[styles.formInput, formErrors.name && styles.inputError]}
              placeholder="e.g. Home, Work, Gym"
              value={newLocation.name}
              onChangeText={(text) => setNewLocation({ ...newLocation, name: text })}
              editable={!isSubmitting}
            />
            {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Address</Text>
            <TextInput
              style={[styles.formInput, formErrors.address && styles.inputError]}
              placeholder="Full address"
              value={newLocation.address}
              onChangeText={(text) => setNewLocation({ ...newLocation, address: text })}
              editable={!isSubmitting}
              multiline
            />
            {formErrors.address && <Text style={styles.errorText}>{formErrors.address}</Text>}
          </View>
          
          <View style={styles.coordsContainer}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.formLabel}>Latitude</Text>
              <TextInput
                style={[styles.formInput, formErrors.latitude && styles.inputError]}
                placeholder="e.g. 6.5244"
                value={newLocation.latitude}
                onChangeText={(text) => setNewLocation({ ...newLocation, latitude: text })}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
              {formErrors.latitude && <Text style={styles.errorText}>{formErrors.latitude}</Text>}
            </View>
            
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Longitude</Text>
              <TextInput
                style={[styles.formInput, formErrors.longitude && styles.inputError]}
                placeholder="e.g. 3.3792"
                value={newLocation.longitude}
                onChangeText={(text) => setNewLocation({ ...newLocation, longitude: text })}
                keyboardType="numeric"
                editable={!isSubmitting}
              />
              {formErrors.longitude && <Text style={styles.errorText}>{formErrors.longitude}</Text>}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Icon Type</Text>
            <View style={styles.iconSelector}>
              {['home', 'work', 'favorite', 'pin'].map((iconType) => (
                <TouchableOpacity
                  key={iconType}
                  style={[
                    styles.iconOption,
                    newLocation.icon === iconType && styles.selectedIconOption
                  ]}
                  onPress={() => setNewLocation({ ...newLocation, icon: iconType })}
                  disabled={isSubmitting}
                >
                  <Ionicons 
                    name={
                      iconType === 'home' ? 'home-outline' :
                      iconType === 'work' ? 'briefcase-outline' :
                      iconType === 'favorite' ? 'heart-outline' :
                      'location-outline'
                    } 
                    size={20} 
                    color={newLocation.icon === iconType ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.iconText,
                    newLocation.icon === iconType && styles.selectedIconText
                  ]}>
                    {iconType.charAt(0).toUpperCase() + iconType.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleAddLocation}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Save Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Locations</Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7AC231" />
          <Text style={styles.loadingText}>Loading your saved locations...</Text>
        </View>
      ) : locations.length > 0 ? (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderLocationItem}
          contentContainerStyle={styles.listContainer}
          refreshing={isLoading}
          onRefresh={fetchSavedLocations}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No saved locations</Text>
          <Text style={styles.emptySubtitle}>
            Save your frequently visited places to make booking rides easier.
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add New Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {locations.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingAddButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {renderAddLocationModal()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40, // Balance the back button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 5,
    marginRight: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 300,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7AC231',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7AC231',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  coordsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  selectedIconOption: {
    backgroundColor: '#7AC231',
  },
  iconText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  selectedIconText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7AC231',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#A1A1AA',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  }
});

export default SavedLocationsScreen;
