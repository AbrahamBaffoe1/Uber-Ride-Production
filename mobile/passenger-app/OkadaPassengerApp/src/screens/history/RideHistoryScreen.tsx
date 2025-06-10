import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import CurvyFooter from '../../components/common/CurvyFooter';

// Mock data for ride history
const MOCK_RIDES = [
  {
    id: '1',
    date: 'Today, 3:30 PM',
    from: 'Home',
    fromAddress: '21 Broad Street, Victoria Island',
    to: 'Work',
    toAddress: '15 Admiralty Way, Lekki Phase 1',
    amount: '₦1,200',
    status: 'completed',
    driver: {
      name: 'James Wilson',
      rating: 4.8,
      avatar: null, // Will use placeholder
    },
    rideType: 'Standard',
  },
  {
    id: '2',
    date: 'Yesterday, 5:45 PM',
    from: 'Work',
    fromAddress: '15 Admiralty Way, Lekki Phase 1',
    to: 'Home',
    toAddress: '21 Broad Street, Victoria Island',
    amount: '₦1,300',
    status: 'completed',
    driver: {
      name: 'Michael Thomas',
      rating: 4.7,
      avatar: null, // Will use placeholder
    },
    rideType: 'Express',
  },
  {
    id: '3',
    date: 'March 17, 2025, 9:15 AM',
    from: 'Home',
    fromAddress: '21 Broad Street, Victoria Island',
    to: 'Lagos State University',
    toAddress: 'Ojo, Lagos',
    amount: '₦1,800',
    status: 'completed',
    driver: {
      name: 'Robert Brown',
      rating: 4.9,
      avatar: null, // Will use placeholder
    },
    rideType: 'Comfort',
  },
  {
    id: '4',
    date: 'March 15, 2025, 2:20 PM',
    from: 'Ikeja City Mall',
    fromAddress: 'Ikeja, Lagos',
    to: 'Gym',
    toAddress: '7 Kofo Abayomi Street, Victoria Island',
    amount: '₦2,100',
    status: 'completed',
    driver: {
      name: 'Richard Davis',
      rating: 4.6,
      avatar: null, // Will use placeholder
    },
    rideType: 'Express',
  },
  {
    id: '5',
    date: 'March 12, 2025, 8:30 AM',
    from: 'Home',
    fromAddress: '21 Broad Street, Victoria Island',
    to: 'Work',
    toAddress: '15 Admiralty Way, Lekki Phase 1',
    amount: '₦1,200',
    status: 'cancelled',
    driver: {
      name: 'N/A',
      rating: 0,
      avatar: null,
    },
    rideType: 'Standard',
  },
];

// Filter options
const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

type RideHistoryScreenNavigationProp = StackNavigationProp<
  RootStackParamList
>;

export const RideHistoryScreen: React.FC = () => {
  const navigation = useNavigation<RideHistoryScreenNavigationProp>();
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Filter rides based on active filter
  const filteredRides = MOCK_RIDES.filter(ride => {
    if (activeFilter === 'all') return true;
    return ride.status === activeFilter;
  });
  
  // Render a ride card
  const renderRideItem = ({ item }: { item: (typeof MOCK_RIDES)[0] }) => {
    const isCompleted = item.status === 'completed';
    
    return (
      <TouchableOpacity 
        style={styles.rideCard}
        onPress={() => {
          // In a real app, navigate to ride details
          console.log('View ride details:', item.id);
        }}
        activeOpacity={0.8}
      >
        {/* Ride date and status */}
        <View style={styles.rideHeader}>
          <Text style={styles.rideDate}>{item.date}</Text>
          <View style={[
            styles.rideStatusBadge,
            { backgroundColor: isCompleted ? '#ECFDF5' : '#FEF2F2' }
          ]}>
            <Text style={[
              styles.rideStatusText,
              { color: isCompleted ? '#10B981' : '#EF4444' }
            ]}>
              {isCompleted ? 'Completed' : 'Cancelled'}
            </Text>
          </View>
        </View>
        
        {/* Route information */}
        <View style={styles.routeContainer}>
          <View style={styles.routeIcons}>
            <View style={[styles.routeDot, { backgroundColor: '#7AC231' }]} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: '#3B82F6' }]} />
          </View>
          
          <View style={styles.routeDetails}>
            <View style={styles.routePoint}>
              <Text style={styles.routePointName}>{item.from}</Text>
              <Text style={styles.routePointAddress}>{item.fromAddress}</Text>
            </View>
            
            <View style={styles.routeDivider} />
            
            <View style={styles.routePoint}>
              <Text style={styles.routePointName}>{item.to}</Text>
              <Text style={styles.routePointAddress}>{item.toAddress}</Text>
            </View>
          </View>
        </View>
        
        {/* Ride info */}
        <View style={styles.rideInfoContainer}>
          {isCompleted && (
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <FontAwesome5 name="user" size={16} color="#9CA3AF" />
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{item.driver.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text style={styles.ratingText}>{item.driver.rating}</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.rideTypeAndFare}>
            <View style={styles.rideType}>
              <MaterialIcons name="motorcycle" size={16} color="#6B7280" />
              <Text style={styles.rideTypeText}>{item.rideType}</Text>
            </View>
            <Text style={styles.fareAmount}>{item.amount}</Text>
          </View>
        </View>
        
        {/* Ride actions */}
        {isCompleted && (
          <View style={styles.rideActions}>
            <TouchableOpacity style={styles.rideAction}>
              <Ionicons name="repeat" size={18} color="#7AC231" />
              <Text style={styles.rideActionText}>Book Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.rideAction}>
              <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              <Text style={styles.rideActionText}>Receipt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.rideAction}>
              <Ionicons name="help-circle-outline" size={18} color="#6B7280" />
              <Text style={styles.rideActionText}>Help</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Render filter options
  const renderFilterOptions = () => (
    <View style={styles.filterContainer}>
      {FILTER_OPTIONS.map(option => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.filterOption,
            activeFilter === option.id && styles.filterOptionActive
          ]}
          onPress={() => setActiveFilter(option.id)}
        >
          <Text
            style={[
              styles.filterOptionText,
              activeFilter === option.id && styles.filterOptionTextActive
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  
  // Footer tab icons
  const renderFooterTabs = () => (
    <>
      <TouchableOpacity 
        style={styles.footerTab}
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons name="home-outline" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.footerTab}
        onPress={() => navigation.navigate('ScheduleRide')}
      >
        <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.footerTab, styles.footerTabActive]}>
        <Ionicons name="time" size={24} color="#7AC231" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.footerTab}
        onPress={() => navigation.navigate('Profile')}
      >
        <Ionicons name="person-outline" size={24} color="#9CA3AF" />
      </TouchableOpacity>
    </>
  );
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Screen header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride History</Text>
      </View>
      
      {/* Filter options */}
      {renderFilterOptions()}
      
      {/* Ride list */}
      {filteredRides.length > 0 ? (
        <FlatList
          data={filteredRides}
          renderItem={renderRideItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ridesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="car-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No rides found</Text>
          <Text style={styles.emptyStateDescription}>
            You don't have any {activeFilter !== 'all' ? activeFilter : ''} rides yet.
          </Text>
        </View>
      )}
      
      {/* Curvy Footer */}
      <CurvyFooter
        backgroundColor="#18181B"
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },
  filterOptionActive: {
    backgroundColor: '#7AC231',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  ridesList: {
    padding: 20,
    paddingBottom: 100, // Extra space for footer
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  rideDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  rideStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rideStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
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
    height: 30,
    backgroundColor: '#D1D5DB',
    marginVertical: 5,
  },
  routeDetails: {
    flex: 1,
  },
  routePoint: {
    marginBottom: 10,
  },
  routePointName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  routePointAddress: {
    fontSize: 13,
    color: '#6B7280',
  },
  routeDivider: {
    height: 0,
    marginVertical: 5,
  },
  rideInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 15,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  driverDetails: {},
  driverName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 2,
  },
  rideTypeAndFare: {
    alignItems: 'flex-end',
  },
  rideType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  rideTypeText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rideActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rideAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  rideActionText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerTab: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  footerTabActive: {
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    borderRadius: 20,
  },
});

export default RideHistoryScreen;
