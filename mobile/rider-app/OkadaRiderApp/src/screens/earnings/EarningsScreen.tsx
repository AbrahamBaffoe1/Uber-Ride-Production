// src/screens/earnings/EarningsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeStackParamList } from '../navigation/types';
import { API_BASE_URL } from '../../api/config';

type EarningsScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Earnings'>;

interface EarningsSummary {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  availableBalance: number;
  totalRides: number;
  totalHours: number;
  averageRating: number;
}

interface EarningsDay {
  date: string;
  dayName: string;
  amount: number;
  rides: number;
}

const EarningsScreen = () => {
  const navigation = useNavigation<EarningsScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState<EarningsDay[]>([]);
  const [isCashoutLoading, setIsCashoutLoading] = useState(false);

  const fetchEarningsData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Fetch earnings summary from API
      const summaryResponse = await fetch(`${API_BASE_URL}/payments/earnings/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch earnings summary');
      }
      
      const summaryData = await summaryResponse.json();
      
      if (summaryData && summaryData.data) {
        setEarningsSummary({
          todayEarnings: summaryData.data.todayEarnings || 0,
          weeklyEarnings: summaryData.data.weeklyEarnings || 0,
          monthlyEarnings: summaryData.data.monthlyEarnings || 0,
          availableBalance: summaryData.data.availableBalance || 0,
          totalRides: summaryData.data.totalRides || 0,
          totalHours: summaryData.data.totalHours || 0,
          averageRating: summaryData.data.averageRating || 0,
        });
      }
      
      // Fetch daily earnings breakdown from API
      const dailyResponse = await fetch(`${API_BASE_URL}/payments/earnings/daily`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!dailyResponse.ok) {
        throw new Error('Failed to fetch daily earnings');
      }
      
      const dailyData = await dailyResponse.json();
      
      if (dailyData && dailyData.data) {
        // Format the data for our UI
        const formattedDailyData = dailyData.data.map((day: any) => {
          const date = new Date(day.date);
          return {
            date: `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
            amount: day.earnings || 0,
            rides: day.rides || 0,
          };
        });
        
        setDailyEarnings(formattedDailyData);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      Alert.alert('Error', 'Failed to load earnings data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const onRefresh = () => {
    fetchEarningsData(true);
  };

  const handleTabChange = (tab: 'day' | 'week' | 'month') => {
    setActiveTab(tab);
  };

  const handleCashout = async () => {
    if (!earningsSummary || earningsSummary.availableBalance <= 0) return;
    
    setIsCashoutLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Make API call to initiate cashout
      const response = await fetch(`${API_BASE_URL}/payments/withdrawals/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: earningsSummary.availableBalance
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process cashout');
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        // Navigate to the cashout confirmation screen
        navigation.navigate('CashoutConfirmation', {
          amount: earningsSummary.availableBalance,
        });
      }
    } catch (error) {
      console.error('Error processing cashout:', error);
      Alert.alert('Error', 'Failed to process cashout. Please try again.');
    } finally {
      setIsCashoutLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#2E86DE']}
          />
        }
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Available Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(earningsSummary?.availableBalance || 0)}
          </Text>
          <TouchableOpacity
            style={[
              styles.cashoutButton,
              isCashoutLoading && styles.buttonDisabled,
              (!earningsSummary || earningsSummary.availableBalance <= 0) && styles.buttonDisabled,
            ]}
            onPress={handleCashout}
            disabled={isCashoutLoading || !earningsSummary || earningsSummary.availableBalance <= 0}
          >
            {isCashoutLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.cashoutButtonText}>Cash Out</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.periodTabsContainer}>
          <TouchableOpacity
            style={[
              styles.periodTab,
              activeTab === 'day' && styles.activeTab,
            ]}
            onPress={() => handleTabChange('day')}
          >
            <Text
              style={[
                styles.periodTabText,
                activeTab === 'day' && styles.activeTabText,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.periodTab,
              activeTab === 'week' && styles.activeTab,
            ]}
            onPress={() => handleTabChange('week')}
          >
            <Text
              style={[
                styles.periodTabText,
                activeTab === 'week' && styles.activeTabText,
              ]}
            >
              This Week
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.periodTab,
              activeTab === 'month' && styles.activeTab,
            ]}
            onPress={() => handleTabChange('month')}
          >
            <Text
              style={[
                styles.periodTabText,
                activeTab === 'month' && styles.activeTabText,
              ]}
            >
              This Month
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.earningsSummaryCard}>
          <Text style={styles.earningsSummaryTitle}>
            {activeTab === 'day' ? 'Today\'s' : activeTab === 'week' ? 'This Week\'s' : 'This Month\'s'} Summary
          </Text>
          
          <Text style={styles.earningsSummaryAmount}>
            {formatCurrency(
              activeTab === 'day'
                ? earningsSummary?.todayEarnings || 0
                : activeTab === 'week'
                ? earningsSummary?.weeklyEarnings || 0
                : earningsSummary?.monthlyEarnings || 0
            )}
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earningsSummary?.totalRides || 0}</Text>
              <Text style={styles.statLabel}>Total Rides</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earningsSummary?.totalHours.toFixed(1) || 0}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{earningsSummary?.averageRating.toFixed(1) || 0}</Text>
              <Text style={styles.statLabel}>Avg. Rating</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>Daily Breakdown</Text>
        </View>

        <View style={styles.dailyBreakdownContainer}>
          {dailyEarnings.length > 0 ? (
            dailyEarnings.map((day, index) => (
              <View key={index} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{day.dayName}</Text>
                  <Text style={styles.dayDate}>{day.date}</Text>
                </View>
                <View style={styles.dayBody}>
                  <Text style={styles.dayAmount}>{formatCurrency(day.amount)}</Text>
                  <Text style={styles.dayRides}>{day.rides} rides</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No earnings data available for this period</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewHistoryButton}
          onPress={() => navigation.navigate('EarningsHistory')}
        >
          <Text style={styles.viewHistoryButtonText}>View Full History</Text>
        </TouchableOpacity>
      </ScrollView>
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
  backText: {
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
  balanceCard: {
    backgroundColor: '#2E86DE',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  cashoutButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cashoutButtonText: {
    color: '#2E86DE',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  periodTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#F5F9FF',
    borderBottomWidth: 2,
    borderBottomColor: '#2E86DE',
  },
  periodTabText: {
    fontSize: 14,
    color: '#666666',
  },
  activeTabText: {
    color: '#2E86DE',
    fontWeight: '600',
  },
  earningsSummaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  earningsSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  earningsSummaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  dailyBreakdownContainer: {
    paddingHorizontal: 16,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dayHeader: {
    
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 12,
    color: '#666666',
  },
  dayBody: {
    alignItems: 'flex-end',
  },
  dayAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  dayRides: {
    fontSize: 12,
    color: '#666666',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  viewHistoryButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E86DE',
  },
  viewHistoryButtonText: {
    color: '#2E86DE',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EarningsScreen;
