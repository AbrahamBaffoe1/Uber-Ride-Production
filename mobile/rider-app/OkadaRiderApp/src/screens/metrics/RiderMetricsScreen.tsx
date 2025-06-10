import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { EarningsStackParamList } from '../navigation/types';
import { riderStatsService } from '../../api/services/rider-stats.service';
import { dailyEarningsService } from '../../api/services/daily-earnings.service';
import RiderMetricsCard from '../../components/metrics/RiderMetricsCard';

type RiderMetricsScreenNavigationProp = StackNavigationProp<EarningsStackParamList, 'RiderMetrics'>;
type RiderMetricsScreenRouteProp = RouteProp<EarningsStackParamList, 'RiderMetrics'>;

const { width } = Dimensions.get('window');

const RiderMetricsScreen = () => {
  const navigation = useNavigation<RiderMetricsScreenNavigationProp>();
  const route = useRoute<RiderMetricsScreenRouteProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [metrics, setMetrics] = useState({
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    acceptanceRate: 0,
    completionRate: 0,
    averageRating: 0,
    totalRatings: 0,
    onlineHours: 0,
    peakHours: 0
  });

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch both daily earnings and rider stats
      const dateString = selectedDate.toISOString().split('T')[0];
      const [earningsData, statsData] = await Promise.all([
        dailyEarningsService.getDailyEarnings(dateString),
        riderStatsService.getRiderStats()
      ]);

      setMetrics({
        todayEarnings: earningsData.amount || 0,
        weeklyEarnings: statsData.weeklyEarnings || 0,
        monthlyEarnings: statsData.monthlyEarnings || 0,
        totalRides: earningsData.ridesCount || 0,
        completedRides: statsData.completedRides || 0,
        cancelledRides: statsData.cancelledRides || 0,
        acceptanceRate: statsData.acceptanceRate || 0,
        completionRate: statsData.completionRate || 0,
        averageRating: statsData.averageRating || 0,
        totalRatings: statsData.totalRatings || 0,
        onlineHours: earningsData.hoursWorked || 0,
        peakHours: statsData.peakHours || 0
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (route.params?.date) {
      setSelectedDate(new Date(route.params.date));
    }
    fetchMetrics();
  }, [route.params?.date]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchMetrics();
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading your metrics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
      
      <LinearGradient
        colors={['#1E3A5F', '#2C5282']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Performance Metrics</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Icon name="calendar-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerDate}>
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Overview</Text>
          <View style={styles.earningsCard}>
            <LinearGradient
              colors={['#4CAF50', '#45A049']}
              style={styles.primaryEarningsCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.earningsContent}>
                <Icon name="cash-outline" size={32} color="#FFFFFF" />
                <Text style={styles.earningsLabel}>Today's Earnings</Text>
                <Text style={styles.earningsAmount}>{formatCurrency(metrics.todayEarnings)}</Text>
              </View>
            </LinearGradient>
            
            <View style={styles.earningsRow}>
              <View style={[styles.secondaryEarningsCard, { marginRight: 8 }]}>
                <Icon name="trending-up" size={24} color="#4A90E2" />
                <Text style={styles.secondaryLabel}>Weekly</Text>
                <Text style={styles.secondaryAmount}>{formatCurrency(metrics.weeklyEarnings)}</Text>
              </View>
              <View style={styles.secondaryEarningsCard}>
                <Icon name="calendar" size={24} color="#4A90E2" />
                <Text style={styles.secondaryLabel}>Monthly</Text>
                <Text style={styles.secondaryAmount}>{formatCurrency(metrics.monthlyEarnings)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <RiderMetricsCard
              icon="speedometer"
              title="Acceptance Rate"
              value={formatPercentage(metrics.acceptanceRate)}
              color="#4CAF50"
              trend={metrics.acceptanceRate > 80 ? 'up' : 'down'}
            />
            <RiderMetricsCard
              icon="checkmark-circle"
              title="Completion Rate"
              value={formatPercentage(metrics.completionRate)}
              color="#2196F3"
              trend={metrics.completionRate > 90 ? 'up' : 'down'}
            />
            <RiderMetricsCard
              icon="star"
              title="Average Rating"
              value={metrics.averageRating.toFixed(1)}
              subtitle={`${metrics.totalRatings} ratings`}
              color="#FF9800"
              trend={metrics.averageRating > 4.5 ? 'up' : 'down'}
            />
            <RiderMetricsCard
              icon="time"
              title="Online Hours"
              value={formatHours(metrics.onlineHours)}
              subtitle={`Peak: ${formatHours(metrics.peakHours)}`}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Ride Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Statistics</Text>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="car" size={24} color="#4A90E2" />
              </View>
              <Text style={styles.statValue}>{metrics.totalRides}</Text>
              <Text style={styles.statLabel}>Total Rides</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="checkmark-done" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>{metrics.completedRides}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
                <Icon name="close-circle" size={24} color="#F44336" />
              </View>
              <Text style={styles.statValue}>{metrics.cancelledRides}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
          </View>
        </View>

        {/* Pro Tips */}
        <View style={[styles.section, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Pro Tips</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <Icon name="bulb-outline" size={20} color="#FF9800" />
              <Text style={styles.tipText}>
                Maintain an acceptance rate above 85% to get more ride requests
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="star-outline" size={20} color="#FF9800" />
              <Text style={styles.tipText}>
                Keep your rating above 4.7 to qualify for bonus programs
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="time-outline" size={20} color="#FF9800" />
              <Text style={styles.tipText}>
                Work during peak hours (7-9 AM, 5-8 PM) to maximize earnings
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterButton: {
    padding: 8,
  },
  headerDate: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 16,
  },
  earningsCard: {
    marginBottom: 8,
  },
  primaryEarningsCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsContent: {
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.9,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  earningsRow: {
    flexDirection: 'row',
  },
  secondaryEarningsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  secondaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  secondaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A5F',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  tipsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default RiderMetricsScreen;
