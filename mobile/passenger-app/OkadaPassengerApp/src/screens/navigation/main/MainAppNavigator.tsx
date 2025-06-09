import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainAppStackParamList } from '../../../navigation/types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import actual screens
import HomeScreen from '../../home/HomeScreen';
import RideTrackingScreen from '../../tracking/RideTrackingScreen';
import PaymentScreen from '../../payment/PaymentScreen';
import ProfileScreen from '../../profile/ProfileScreen';
import SafetyScreen from '../../safety/SafetyScreen';

// Use direct import syntax to fix the module problem
import { BookingScreen } from '../../booking/BookingScreen';

// Create a custom tab bar component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  
  // Tab bar colors
  const activeColor = '#7AC231';
  const inactiveColor = '#999999';
  const tabBarBgColor = '#1C2128';
  const glassEffect = 'dark';
  
  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {/* Background blur effect */}
      <BlurView intensity={20} tint={glassEffect} style={StyleSheet.absoluteFill} />
      
      {/* Curved background */}
      <View style={styles.tabBarBackground}>
        <Svg
          height="100%"
          width="100%"
          style={StyleSheet.absoluteFill}
        >
          <Path
            d={`
              M0,0
              H${width}
              V${22}
              C${width * 0.7},${-10} ${width * 0.3},${-10} 0,${22}
              Z
            `}
            fill={tabBarBgColor}
          />
        </Svg>
      </View>
      
      {/* Tab buttons */}
      <View style={styles.tabButtonsContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          
          // Get icon based on route name
          let iconName = '';
          switch (route.name) {
            case 'Home':
              iconName = isFocused ? 'home' : 'home-outline';
              break;
            case 'Booking':
              iconName = isFocused ? 'calendar' : 'calendar-outline';
              break;
            case 'Tracking':
              iconName = isFocused ? 'location' : 'location-outline';
              break;
            case 'Payment':
              iconName = isFocused ? 'wallet' : 'wallet-outline';
              break;
            case 'Profile':
              iconName = isFocused ? 'person' : 'person-outline';
              break;
            case 'Safety':
              iconName = isFocused ? 'shield-checkmark' : 'shield-checkmark-outline';
              break;
            default:
              iconName = 'home-outline';
          }
          
          // Return tab button
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={onPress}
              style={[
                styles.tabButton,
                isFocused && styles.tabButtonActive
              ]}
            >
              {isFocused ? (
                // Active tab with background
                <View style={styles.activeTabBackground}>
                  <Ionicons 
                    name={iconName as any} 
                    size={26} 
                    color={activeColor} 
                  />
                </View>
              ) : (
                // Inactive tab
                <Ionicons 
                  name={iconName as any} 
                  size={24} 
                  color={inactiveColor} 
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Center floating action button */}
      <TouchableOpacity
        style={styles.centerButton}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Booking')}
      >
        <View style={styles.centerButtonInner}>
          <MaterialCommunityIcons name="bike-fast" size={28} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const Tab = createBottomTabNavigator<MainAppStackParamList>();

const MainAppNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Booking" component={BookingScreen} />
      <Tab.Screen name="Tracking" component={RideTrackingScreen} />
      <Tab.Screen name="Payment" component={PaymentScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Safety" component={SafetyScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: 'transparent',
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '100%',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonActive: {
    transform: [{ translateY: -10 }],
  },
  activeTabBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  centerButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 15,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7AC231',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  centerButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#7AC231',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13171D',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MainAppNavigator;
