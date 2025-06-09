// src/screens/earnings/EarningsHistoryScreen.tsx
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
import { apiClient } from '../../api/client';

type EarningsHistoryScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'EarningsHistory'>;

interface EarningItem {
  id: string;
  date: string;
  amount: number;
  rides: number;
  hours: number;
}

interface Month {
  month: string;
  year: number;
  totalAmount: number;
  totalRides: number;
  items: EarningItem[];
}

const EarningsHistoryScreen = () => {
  const navigation = useNavigation<EarningsHistoryScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [months, setMonths] = useState<Month[]>([]);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchEarningsHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`${API_BASE_URL}/payments/earnings/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings history');
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        // Process the API response into our Month[] format
        const monthsMap = new Map<string, Month>();
        
        // Group earnings by month and year
        data.data.forEach((earning: any) => {
          const date = new Date(earning.date);
          const month = date.toLocaleString('en-US', { month: 'long' });
          const year = date.getFullYear();
          const key = `${month}-${year}`;
          
          if (!monthsMap.has(key)) {
            monthsMap.set(key, {
              month,
              year,
              totalAmount: 0,
              totalRides: 0,
              items: []
            });
          }
          
          const monthData = monthsMap.get(key)!;
          
          // Add earnings data to the month
          monthData.totalAmount += earning.amount || 0;
          monthData.totalRides += earning.rides || 0;
          
          // Add individual earning to items
          monthData.items.push({
            id: earning._id || earning.id,
            date: earning.date,
            amount: earning.amount || 0,
            rides: earning.rides || 0,
            hours: earning.hours || 0
          });
        });
        
        // Convert the map to an array and sort by date (newest first)
        const processedMonths = Array.from(monthsMap.values())
          .sort((a, b) => {
            const dateA = new Date(`${a.month} 1, ${a.year}`);
            const dateB = new Date(`${b.month} 1, ${b.year}`);
            return dateB.getTime() - dateA.getTime();
          });
        
        setMonths(processedMonths);
        
        // Set the current month as expanded by default if we have any data
        if (processedMonths.length > 0) {
          setExpandedMonth(`${processedMonths[0].month}-${processedMonths[0].year}`);
        }
      }
      
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      console.error('Error fetching earnings history:', error);
      setIsLoading(false);
      setIsRefreshing(false);
      Alert.alert('Error', 'Failed to load earnings history');
    }
  };

  useEffect(() => {
    fetchEarningsHistory();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    fetchEarningsHistory();
  };

  const toggleMonth = (monthKey: string) => {
    if (expandedMonth === monthKey) {
      setExpandedMonth(null);
    } else {
      setExpandedMonth(monthKey);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading earnings history...</Text>
      </SafeAreaView>
    );
  }

  const renderMonthItem = ({ item }: { item: Month }) => {
    const monthKey = `${item.month}-${item.year}`;
    const isExpanded = expandedMonth === monthKey;
    
    return (
      <View style={styles.monthContainer}>
        <TouchableOpacity
          style={styles.monthHeader}
          onPress={() => toggleMonth(monthKey)}
        >
          <View style={styles.monthTitleContainer}>
            <Text style={styles.monthTitle}>{item.month} {item.year}</Text>
            <View style={styles.monthStats}>
              <Text style={styles.monthRides}>{item.totalRides} rides</Text>
              <View style={styles.monthDivider} />
              <Text style={styles.monthAmount}>{formatCurrency(item.totalAmount)}</Text>
            </View>
          </View>
          <Image
            source={require('../../../assets/images/chevron-down.png')}
            style={[
              styles.chevronIcon,
              isExpanded && styles.chevronExpanded,
            ]}
          />
        </TouchableOpacity>
        
        {isExpanded && (
          <FlatList
            data={item.items}
            renderItem={renderEarningItem}
            keyExtractor={(earningItem) => earningItem.id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  const renderEarningItem = ({ item }: { item: EarningItem }) => (
    <View style={styles.earningItem}>
      <View style={styles.earningItemLeft}>
        <Text style={styles.earningDate}>{formatDate(item.date)}</Text>
        <Text style={styles.earningDetails}>
          {item.rides} rides · {item.hours} hours
        </Text>
      </View>
      <Text style={styles.earningAmount}>{formatCurrency(item.amount)}</Text>
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
        <Text style={styles.headerTitle}>Earnings History</Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={months}
        renderItem={renderMonthItem}
        keyExtractor={(month) => `${month.month}-${month.year}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2E86DE']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No earnings history found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
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
  listContent: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  monthContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  monthTitleContainer: {
    flex: 1,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  monthStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthRides: {
    fontSize: 14,
    color: '#666666',
  },
  monthDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 8,
  },
  monthAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  chevronIcon: {
    width: 20,
    height: 20,
    tintColor: '#666666',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  earningItemLeft: {
    flex: 1,
  },
  earningDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  earningDetails: {
    fontSize: 14,
    color: '#666666',
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default EarningsHistoryScreen;
