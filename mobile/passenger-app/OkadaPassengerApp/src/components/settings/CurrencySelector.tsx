import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../contexts/AuthContext';
import { getAvailableCurrencies } from '../../api/services/currency.service';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const CurrencySelector: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, updatePreferredCurrency } = useContext(AuthContext);

  // Load available currencies
  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setLoading(true);
        const availableCurrencies = await getAvailableCurrencies();
        setCurrencies(availableCurrencies);
        
        // Set initial selected currency based on user preference
        if (user?.preferredCurrency) {
          const userCurrency = availableCurrencies.find(
            (c) => c.code === user.preferredCurrency
          );
          if (userCurrency) {
            setSelectedCurrency(userCurrency);
          } else {
            // Default to the first currency (likely NGN)
            setSelectedCurrency(availableCurrencies[0]);
          }
        } else {
          // Default to the first currency (likely NGN)
          setSelectedCurrency(availableCurrencies[0]);
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrencies();
  }, [user?.preferredCurrency]);

  const handleCurrencySelect = async (currency: Currency) => {
    setSelectedCurrency(currency);
    setModalVisible(false);
    
    // Update user preference
    try {
      setLoading(true);
      const success = await updatePreferredCurrency(currency.code);
      if (!success) {
        console.error('Failed to update currency preference');
      }
    } catch (error) {
      console.error('Error updating currency preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={styles.currencyItem}
      onPress={() => handleCurrencySelect(item)}
    >
      <View style={styles.currencyInfo}>
        <Text style={styles.currencySymbol}>{item.symbol}</Text>
        <View>
          <Text style={styles.currencyCode}>{item.code}</Text>
          <Text style={styles.currencyName}>{item.name}</Text>
        </View>
      </View>
      
      {selectedCurrency?.code === item.code && (
        <Ionicons name="checkmark-circle" size={24} color="#007bff" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Currency</Text>
          {loading && <ActivityIndicator size="small" color="#007bff" style={styles.loader} />}
        </View>
        
        <View style={styles.valueContainer}>
          {selectedCurrency ? (
            <Text style={styles.value}>
              {selectedCurrency.symbol} {selectedCurrency.code}
            </Text>
          ) : (
            <Text style={styles.placeholder}>Select currency</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color="#888" />
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={currencies}
              renderItem={renderCurrencyItem}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.currencyList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  loader: {
    marginLeft: 10,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    color: '#007bff',
    marginRight: 8,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  currencyList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 16,
    width: 30,
    textAlign: 'center',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '500',
  },
  currencyName: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
});

export default CurrencySelector;
