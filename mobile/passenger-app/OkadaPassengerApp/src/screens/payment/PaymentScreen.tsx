import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import CurvyFooter from '../../components/common/CurvyFooter';

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedMethodId, setSelectedMethodId] = useState('card1');
  
  // Mock payment methods
  const paymentMethods = [
    { 
      id: 'card1', 
      type: 'credit', 
      name: 'Mastercard', 
      last4: '3456', 
      expiryDate: '12/27',
      icon: 'credit-card', 
      iconProvider: FontAwesome5,
      iconColor: '#EB001B',
      isDefault: true,
    },
    { 
      id: 'card2', 
      type: 'credit', 
      name: 'Visa', 
      last4: '8765', 
      expiryDate: '05/26',
      icon: 'credit-card', 
      iconProvider: FontAwesome5,
      iconColor: '#1434CB',
      isDefault: false,
    },
    { 
      id: 'bank1', 
      type: 'bank', 
      name: 'First Bank', 
      accountLast4: '9012',
      icon: 'university', 
      iconProvider: FontAwesome5,
      iconColor: '#10B981',
      isDefault: false,
    },
    { 
      id: 'cash', 
      type: 'cash', 
      name: 'Cash', 
      icon: 'money-bill-wave', 
      iconProvider: FontAwesome5,
      iconColor: '#65A30D',
      isDefault: false,
    },
  ];
  
  // Handle payment method selection
  const handleSelectPaymentMethod = (id: string) => {
    setSelectedMethodId(id);
  };
  
  // Handle add payment method
  const handleAddPaymentMethod = () => {
    Alert.alert(
      'Add Payment Method',
      'Choose payment method type',
      [
        {
          text: 'Credit/Debit Card',
          onPress: () => console.log('Add card'),
        },
        {
          text: 'Bank Account',
          onPress: () => console.log('Add bank account'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };
  
  // Handle delete payment method
  const handleDeletePaymentMethod = (id: string) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => console.log('Delete payment method', id),
          style: 'destructive',
        },
      ]
    );
  };
  
  // Handle set default payment method
  const handleSetDefaultMethod = (id: string) => {
    // In a real app, this would update the default payment method
    console.log('Setting default payment method:', id);
    
    // For demonstration purposes, show a success message
    Alert.alert(
      'Default Payment Method',
      'Your default payment method has been updated.',
      [{ text: 'OK' }]
    );
  };
  
  // Render a payment method item
  const renderPaymentMethod = (method: any) => {
    const IconProvider = method.iconProvider;
    const isSelected = method.id === selectedMethodId;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethodItem,
          isSelected && styles.paymentMethodItemSelected,
        ]}
        onPress={() => handleSelectPaymentMethod(method.id)}
      >
        <View style={styles.paymentMethodIcon}>
          <IconProvider 
            name={method.icon} 
            size={24} 
            color={method.iconColor} 
          />
        </View>
        
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          
          {method.type === 'credit' && (
            <Text style={styles.paymentMethodDetails}>
              •••• {method.last4} | Expires {method.expiryDate}
            </Text>
          )}
          
          {method.type === 'bank' && (
            <Text style={styles.paymentMethodDetails}>
              Account ending in {method.accountLast4}
            </Text>
          )}
          
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        
        <View style={styles.paymentMethodActions}>
          <TouchableOpacity
            style={styles.paymentMethodAction}
            onPress={() => handleSetDefaultMethod(method.id)}
          >
            <Ionicons 
              name={method.isDefault ? "checkmark-circle" : "ellipsis-horizontal"} 
              size={22} 
              color={method.isDefault ? "#10B981" : "#6B7280"} 
            />
          </TouchableOpacity>
          
          {method.type !== 'cash' && (
            <TouchableOpacity
              style={styles.paymentMethodAction}
              onPress={() => handleDeletePaymentMethod(method.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render payment history item
  const renderPaymentHistoryItem = (
    item: {
      id: string;
      date: string;
      amount: string;
      description: string;
      status: 'completed' | 'pending' | 'failed';
    }
  ) => {
    const statusColors = {
      completed: '#10B981',
      pending: '#F59E0B',
      failed: '#EF4444',
    };
    
    const statusIcons: Record<string, any> = {
      completed: 'checkmark-circle',
      pending: 'time-outline',
      failed: 'close-circle',
    };
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.historyItem}
        onPress={() => console.log('View transaction details', item.id)}
      >
        <View style={styles.historyItemLeft}>
          <View style={[
            styles.historyItemIcon,
            { backgroundColor: `${statusColors[item.status]}20` }
          ]}>
            <Ionicons
              name={statusIcons[item.status]}
              size={18}
              color={statusColors[item.status]}
            />
          </View>
          
          <View style={styles.historyItemInfo}>
            <Text style={styles.historyItemDescription}>{item.description}</Text>
            <Text style={styles.historyItemDate}>{item.date}</Text>
          </View>
        </View>
        
        <Text style={[
          styles.historyItemAmount,
          { color: statusColors[item.status] }
        ]}>
          {item.amount}
        </Text>
      </TouchableOpacity>
    );
  };
  
  // Render footer tabs
  const renderFooterTabs = () => (
    <>
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="home-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>Bookings</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.footerTab}>
        <Ionicons name="time-outline" size={24} color="#9CA3AF" />
        <Text style={styles.footerTabText}>History</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.footerTab, styles.footerTabActive]}>
        <Ionicons name="card" size={24} color="#7AC231" />
        <Text style={[styles.footerTabText, styles.footerTabTextActive]}>Payment</Text>
      </TouchableOpacity>
    </>
  );
  
  // Transaction history data
  const transactionHistory = [
    {
      id: 'tx1',
      date: 'Today, 3:30 PM',
      amount: '₦1,200',
      description: 'Ride to Victoria Island',
      status: 'completed' as const,
    },
    {
      id: 'tx2',
      date: 'Yesterday, 8:15 AM',
      amount: '₦2,000',
      description: 'Ride to Lekki Phase 1',
      status: 'completed' as const,
    },
    {
      id: 'tx3',
      date: 'Mar 15, 2025',
      amount: '₦1,500',
      description: 'Ride to Ikeja',
      status: 'failed' as const,
    },
    {
      id: 'tx4',
      date: 'Mar 12, 2025',
      amount: '₦1,800',
      description: 'Ride to Lagos State University',
      status: 'completed' as const,
    }
  ];
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Payment Methods</Text>
        
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Payment Methods</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddPaymentMethod}
            >
              <Text style={styles.addButtonText}>Add New</Text>
              <Ionicons name="add-circle-outline" size={18} color="#7AC231" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentMethodsList}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        </View>
        
        {/* Payment Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Preferences</Text>
          
          <View style={styles.preferencesContainer}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Auto-Pay</Text>
                <Text style={styles.preferenceDescription}>
                  Automatically pay for rides using your default payment method
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={(value) => console.log('Toggle auto-pay', value)}
                trackColor={{ false: '#D1D5DB', true: '#7AC231' }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Ride Receipts</Text>
                <Text style={styles.preferenceDescription}>
                  Receive email receipts for all rides
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={(value) => console.log('Toggle receipts', value)}
                trackColor={{ false: '#D1D5DB', true: '#7AC231' }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceInfo}>
                <Text style={styles.preferenceLabel}>Split Fare</Text>
                <Text style={styles.preferenceDescription}>
                  Allow splitting fare with other passengers
                </Text>
              </View>
              <Switch
                value={false}
                onValueChange={(value) => console.log('Toggle split fare', value)}
                trackColor={{ false: '#D1D5DB', true: '#7AC231' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
        
        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionsList}>
            {transactionHistory.map(renderPaymentHistoryItem)}
          </View>
        </View>
        
        {/* Add Balance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Balance</Text>
          
          <View style={styles.balanceCard}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>₦5,000</Text>
              <Text style={styles.balanceDescription}>
                Use your balance for future rides
              </Text>
            </View>
            
            <TouchableOpacity style={styles.addBalanceButton}>
              <Text style={styles.addBalanceButtonText}>Add Funds</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra space for footer
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    padding: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7AC231',
    marginRight: 4,
  },
  paymentMethodsList: {
    padding: 10,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  paymentMethodItemSelected: {
    borderColor: '#7AC231',
    backgroundColor: '#F0FDF4',
  },
  paymentMethodIcon: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentMethodDetails: {
    fontSize: 13,
    color: '#6B7280',
  },
  defaultBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#10B981',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodAction: {
    padding: 8,
  },
  preferencesContainer: {
    padding: 5,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 10,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  transactionsList: {
    padding: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyItemAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  balanceCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  balanceInfo: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 5,
  },
  balanceDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  addBalanceButton: {
    backgroundColor: '#7AC231',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  addBalanceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerTab: {
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  footerTabActive: {
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  footerTabText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footerTabTextActive: {
    color: '#7AC231',
    fontWeight: '500',
  },
});

export default PaymentScreen;
