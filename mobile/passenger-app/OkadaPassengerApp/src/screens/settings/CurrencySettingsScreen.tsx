import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CurrencySelector from '../../components/settings/CurrencySelector';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';

interface CurrencySettingsScreenProps {
  navigation: any;
}

const CurrencySettingsScreen: React.FC<CurrencySettingsScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Currency Settings</Text>
        <View style={styles.placeholderRight} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Currency Preferences</Text>
        <Text style={styles.description}>
          Choose your preferred currency for fare estimates and payments.
          Prices will be displayed in this currency throughout the app.
        </Text>
        
        <CurrencySelector />
        
        <View style={styles.exampleContainer}>
          <Text style={styles.exampleTitle}>Example Fare Displays</Text>
          
          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Standard Fare:</Text>
            <CurrencyDisplay amount={1500} style={styles.exampleValue} />
          </View>
          
          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>Fare Range:</Text>
            <CurrencyDisplay amount="1200-1800" isRange={true} style={styles.exampleValue} />
          </View>
          
          <View style={styles.exampleCard}>
            <Text style={styles.exampleLabel}>With Surge:</Text>
            <CurrencyDisplay amount={2250} style={[styles.exampleValue, styles.surgePrice]} />
          </View>
        </View>
        
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.noteText}>
            Currency conversion rates are updated regularly. The actual
            fare may vary slightly based on the exchange rate at the time of payment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholderRight: {
    width: 32,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  exampleContainer: {
    marginTop: 30,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  exampleCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exampleLabel: {
    fontSize: 14,
    color: '#666',
  },
  exampleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  surgePrice: {
    color: '#e74c3c',
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  noteText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default CurrencySettingsScreen;
