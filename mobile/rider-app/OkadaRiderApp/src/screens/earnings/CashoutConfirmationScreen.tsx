// src/screens/earnings/CashoutConfirmationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { updateAvailableBalance } from '../../redux/slices/earningsSlice';
import { requestCashout } from '../../redux/thunks/earningsThunks';
import { earningsService, CashoutRequest } from '../../api/services/earnings.service';
import { RootState } from '../../redux/store';
import { socketService } from '../../api/services/socket.service';

type CashoutConfirmationScreenNavigationProp = StackNavigationProp<
  HomeStackParamList,
  'CashoutConfirmation'
>;

type CashoutConfirmationScreenRouteProp = RouteProp<
  HomeStackParamList,
  'CashoutConfirmation'
>;

interface PaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money';
  name: string;
  accountNumber: string;
  isDefault: boolean;
}

const CashoutConfirmationScreen = () => {
  const navigation = useNavigation<CashoutConfirmationScreenNavigationProp>();
  const route = useRoute<CashoutConfirmationScreenRouteProp>();
  const { amount } = route.params;

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [cashoutStatus, setCashoutStatus] = useState<'pending' | 'success' | 'failed' | null>(null);
  
  // Mock payment methods
  const paymentMethods: PaymentMethod[] = [
    {
      id: '1',
      type: 'bank',
      name: 'First Bank',
      accountNumber: '****1234',
      isDefault: true,
    },
    {
      id: '2',
      type: 'mobile_money',
      name: 'MTN Mobile Money',
      accountNumber: '+234 *** *** 5678',
      isDefault: false,
    },
    {
      id: '3',
      type: 'bank',
      name: 'Access Bank',
      accountNumber: '****9876',
      isDefault: false,
    },
  ];

  // Set default payment method
  React.useEffect(() => {
    const defaultMethod = paymentMethods.find((method) => method.isDefault);
    if (defaultMethod) {
      setSelectedMethodId(defaultMethod.id);
    } else if (paymentMethods.length > 0) {
      setSelectedMethodId(paymentMethods[0].id);
    }
  }, []);

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethodId(methodId);
  };

  const dispatch = useDispatch<any>();
  const [transactionId, setTransactionId] = useState<string>('');
  const [cashoutDate, setCashoutDate] = useState<Date>(new Date());
  
  // Get available balance from redux (fallback to route param if not available)
  const earnings = useSelector((state: RootState) => state.earnings);
  const availableBalance = earnings && 'availableBalance' in earnings ? 
    earnings.availableBalance : amount;

  // Subscribe to cashout status events
  useEffect(() => {
    // Define a custom event handler for cashout updates
    const handleCashoutUpdate = (data: any) => {
      if (data.status === 'completed') {
        setCashoutStatus('success');
        setTransactionId(data.transactionId || '');
        setCashoutDate(new Date(data.timestamp || Date.now()));
        dispatch(updateAvailableBalance(0));
      } else if (data.status === 'failed') {
        setCashoutStatus('failed');
        Alert.alert('Cashout Failed', data.message || 'An error occurred while processing your request.');
      }
    };

    // Set up real socket listeners for cashout status updates using generic event handlers
    socketService.on('cashout:status_update', handleCashoutUpdate);
    
    // Cleanup function to remove socket listeners
    return () => {
      socketService.off('cashout:status_update', handleCashoutUpdate);
    };
  }, [dispatch, isProcessing]);

  const handleCashout = async () => {
    if (!selectedMethodId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setIsProcessing(true);
    
    try {
      const selectedMethod = paymentMethods.find(method => method.id === selectedMethodId);
      
      if (!selectedMethod) {
        throw new Error('Payment method not found');
      }
      
      // Prepare cashout request
      const cashoutRequest: CashoutRequest = {
        amount,
        payoutMethod: selectedMethod.type === 'bank' ? 'bank_transfer' : 'mobile_money',
        accountDetails: {
          id: selectedMethod.id,
          name: selectedMethod.name,
          accountNumber: selectedMethod.accountNumber
        }
      };
      
      // Call the API using Redux thunk
      const resultAction = await dispatch(requestCashout(cashoutRequest));
      
      // Check if the cashout was successful
      if (requestCashout.fulfilled.match(resultAction)) {
        // The cashout was initiated successfully, but we may still need to wait for the final status
        const response = resultAction.payload;
        setTransactionId(response.id);
        
        // If the response has an immediate success status, update UI accordingly
        if (response.status === 'completed') {
          setIsProcessing(false);
          setCashoutStatus('success');
          dispatch(updateAvailableBalance(0));
        }
        // Otherwise, the socket event listener will update the UI when the status changes
      } else {
        // The cashout failed
        setIsProcessing(false);
        setCashoutStatus('failed');
        Alert.alert('Cashout Failed', 'An error occurred while processing your request. Please try again.');
      }
    } catch (error: any) {
      setIsProcessing(false);
      setCashoutStatus('failed');
      Alert.alert('Cashout Failed', error.message || 'An error occurred while processing your request.');
    }
  };

  const handleAddPaymentMethod = () => {
    // In a real app, this would navigate to a screen to add a payment method
    Alert.alert('Add Payment Method', 'This feature is not implemented in this demo.');
  };

  const handleDone = () => {
    // Navigate back to earnings screen
    navigation.navigate('Earnings');
  };

  const formatCurrency = (value: number) => {
    return `₦${value.toLocaleString()}`;
  };

  // Render cashout success screen
  if (cashoutStatus === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Image
              source={require('../../../assets/images/success-icon.png')}
              style={styles.successIcon}
            />
          </View>
          
          <Text style={styles.successTitle}>Cashout Successful!</Text>
          
          <Text style={styles.successAmount}>{formatCurrency(amount)}</Text>
          
          <Text style={styles.successMessage}>
            Your funds have been successfully transferred to your account.
            The transaction may take up to 24 hours to reflect in your account.
          </Text>
          
          <View style={styles.transactionDetails}>
            <View style={styles.transactionItem}>
              <Text style={styles.transactionLabel}>Transaction ID</Text>
              <Text style={styles.transactionValue}>OKD6283917463</Text>
            </View>
            
            <View style={styles.transactionItem}>
              <Text style={styles.transactionLabel}>Date & Time</Text>
              <Text style={styles.transactionValue}>
                {new Date().toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </Text>
            </View>
            
            <View style={styles.transactionItem}>
              <Text style={styles.transactionLabel}>Payment Method</Text>
              <Text style={styles.transactionValue}>
                {paymentMethods.find((method) => method.id === selectedMethodId)?.name || ''}
              </Text>
            </View>
            
            <View style={styles.transactionItem}>
              <Text style={styles.transactionLabel}>Account</Text>
              <Text style={styles.transactionValue}>
                {paymentMethods.find((method) => method.id === selectedMethodId)?.accountNumber || ''}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
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
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cashout</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        
        <View style={styles.paymentMethodsContainer}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethodItem,
                selectedMethodId === method.id && styles.selectedPaymentMethod,
              ]}
              onPress={() => handleMethodSelect(method.id)}
            >
              <View style={styles.paymentMethodInfo}>
                <Image
                  source={
                    method.type === 'bank'
                      ? require('../../../assets/images/bank-icon.png')
                      : require('../../../assets/images/mobile-money-icon.png')
                  }
                  style={styles.paymentMethodIcon}
                />
                <View style={styles.paymentMethodDetails}>
                  <Text style={styles.paymentMethodName}>{method.name}</Text>
                  <Text style={styles.paymentMethodNumber}>{method.accountNumber}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radioButton,
                  selectedMethodId === method.id && styles.radioButtonSelected,
                ]}
              >
                {selectedMethodId === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.addPaymentMethodButton}
            onPress={handleAddPaymentMethod}
          >
            <Image
              source={require('../../../assets/images/add-icon.png')}
              style={styles.addIcon}
            />
            <Text style={styles.addPaymentMethodText}>Add Payment Method</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.infoText}>
          Funds will be transferred to your selected payment method.
          The process may take up to 24 hours depending on your bank or mobile money provider.
        </Text>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.cashoutButton,
            (!selectedMethodId || isProcessing) && styles.buttonDisabled,
          ]}
          onPress={handleCashout}
          disabled={!selectedMethodId || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.cashoutButtonText}>
              Cashout {formatCurrency(amount)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  amountContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  paymentMethodsContainer: {
    marginBottom: 24,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderWidth: 2,
    borderColor: '#2E86DE',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  paymentMethodNumber: {
    fontSize: 14,
    color: '#666666',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#2E86DE',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2E86DE',
  },
  addPaymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: '#2E86DE',
  },
  addPaymentMethodText: {
    fontSize: 16,
    color: '#2E86DE',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cashoutButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cashoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 40,
    height: 40,
    tintColor: '#27AE60',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27AE60',
    marginBottom: 16,
    textAlign: 'center',
  },
  successAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  transactionDetails: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionLabel: {
    fontSize: 14,
    color: '#666666',
  },
  transactionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  doneButton: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CashoutConfirmationScreen;
