// src/screens/earnings/EarningsOverviewScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList } from '../navigation/types';

type EarningsOverviewScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Earnings'>;

interface EarningData {
  period: string;
  amount: number;
  rides: number;
  hours: number;
}

const EarningsOverviewScreen = () => {
  const navigation = useNavigation<EarningsOverviewScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [earningsData, setEarningsData] = useState<EarningData[]>([]);

  useEffect(() => {
    // In a real app, this would fetch from the API
    const fetchEarningsData = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setAvailableBalance(15800);
          setEarningsData([
            { period: 'Today', amount: 3500, rides: 7, hours: 8.5 },
            { period: 'This Week', amount: 22450, rides: 32, hours: 42.5 },
            { period: 'This Month', amount: 86750, rides: 124, hours: 165 },
          ]);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching earnings data:', error);
        setIsLoading(false);
      }
    };

    fetchEarningsData();
  }, []);

  const handleViewDetailed = () => {
    navigation.navigate('Earnings');
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
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>
      
      <ScrollView>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Available Balance</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
          <TouchableOpacity
            style={styles.cashoutButton}
            onPress={() => navigation.navigate('Earnings')}
          >
            <Text style={styles.cashoutButtonText}>Cash Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.earningsContainer}>
          {earningsData.map((item, index) => (
            <View key={index} style={styles.earningCard}>
              <View style={styles.earningHeader}>
                <Text style={styles.earningPeriod}>{item.period}</Text>
              </View>
              <Text style={styles.earningAmount}>{formatCurrency(item.amount)}</Text>
              <View style={styles.earningDetails}>
                <Text style={styles.earningDetail}>{item.rides} rides</Text>
                <Text style={styles.earningDetail}>{item.hours} hours</Text>
              </View>
            </View>
          ))}
        </View>
        
        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleViewDetailed}
        >
          <Text style={styles.viewButtonText}>View Detailed Earnings</Text>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  balanceCard: {
    backgroundColor: '#2E86DE',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
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
  earningsContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  earningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  earningHeader: {
    marginBottom: 8,
  },
  earningPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  earningAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  earningDetails: {
    flexDirection: 'row',
  },
  earningDetail: {
    fontSize: 14,
    color: '#666666',
    marginRight: 16,
  },
  viewButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E86DE',
  },
  viewButtonText: {
    color: '#2E86DE',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EarningsOverviewScreen;