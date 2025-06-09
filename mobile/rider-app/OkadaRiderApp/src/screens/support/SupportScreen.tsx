// src/screens/support/SupportScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';

type SupportScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Support'>;

interface SupportCategory {
  id: string;
  title: string;
  icon: any;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  expanded: boolean;
}

const SupportScreen = () => {
  const navigation = useNavigation<SupportScreenNavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([
    {
      id: '1',
      question: 'How do I update my profile information?',
      answer: 'You can update your profile information by going to Profile > Edit. Make your changes and tap Save to update your information.',
      expanded: false,
    },
    {
      id: '2',
      question: 'How do I update my documents?',
      answer: 'To update your documents, go to Profile > Documents & Compliance. Find the document you need to update and tap on "Update Document".',
      expanded: false,
    },
    {
      id: '3',
      question: 'Why was my document rejected?',
      answer: 'Documents may be rejected if they are unclear, expired, or don\'t meet our requirements. Check the rejection reason and upload a new document that meets the criteria.',
      expanded: false,
    },
    {
      id: '4',
      question: 'How do I cash out my earnings?',
      answer: 'To cash out your earnings, go to Earnings and tap on "Cash Out". Select your preferred payment method and confirm the transaction.',
      expanded: false,
    },
    {
      id: '5',
      question: 'How do I report an issue with a passenger?',
      answer: 'After completing a ride, you can rate the passenger and provide feedback. For serious issues, you can submit a report through the Support section.',
      expanded: false,
    },
  ]);

  const supportCategories: SupportCategory[] = [
    {
      id: 'account',
      title: 'Account Issues',
      icon: require('../../../assets/images/account-icon.png'),
    },
    {
      id: 'payment',
      title: 'Payment Issues',
      icon: require('../../../assets/images/payment-icon.png'),
    },
    {
      id: 'ride',
      title: 'Ride Problems',
      icon: require('../../../assets/images/ride-icon.png'),
    },
    {
      id: 'documents',
      title: 'Document Verification',
      icon: require('../../../assets/images/document-icon.png'),
    },
    {
      id: 'other',
      title: 'Other Issues',
      icon: require('../../../assets/images/other-icon.png'),
    },
  ];

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleSubmitRequest = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a support category');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real app, this would call the API to submit the support request
      // const response = await supportService.submitRequest(selectedCategory, message);
      
      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false);
        setSelectedCategory(null);
        setMessage('');
        Alert.alert(
          'Request Submitted',
          'Your support request has been submitted. Our team will get back to you shortly.',
          [{ text: 'OK' }]
        );
      }, 1500);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to submit your request. Please try again.');
    }
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+2348001234567');
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@okadasolution.com');
  };

  const toggleFAQ = (id: string) => {
    setFaqs(faqs.map(faq => 
      faq.id === id ? { ...faq, expanded: !faq.expanded } : faq
    ));
  };

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>How can we help you?</Text>
          <Text style={styles.supportText}>
            Select a category below to get help with your issue or contact our support team directly.
          </Text>
        </View>
        
        <View style={styles.categoriesContainer}>
          {supportCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                selectedCategory === category.id && styles.selectedCategory,
              ]}
              onPress={() => handleCategorySelect(category.id)}
            >
              <Image source={category.icon} style={styles.categoryIcon} />
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Describe your issue</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Please provide details about your issue..."
            placeholderTextColor="#A0A0A0"
            multiline
            numberOfLines={6}
            value={message}
            onChangeText={setMessage}
            editable={!isSubmitting}
          />
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedCategory || !message.trim() || isSubmitting) && styles.buttonDisabled,
            ]}
            onPress={handleSubmitRequest}
            disabled={!selectedCategory || !message.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        
        <View style={styles.faqContainer}>
          {faqs.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(faq.id)}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Image
                  source={require('../../../assets/images/chevron-down.png')}
                  style={[
                    styles.faqIcon,
                    faq.expanded && styles.faqIconExpanded,
                  ]}
                />
              </TouchableOpacity>
              
              {faq.expanded && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </View>
          ))}
        </View>
        
        <Text style={styles.sectionTitle}>Contact Support</Text>
        
        <View style={styles.contactContainer}>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleCallSupport}
          >
            <Image
              source={require('../../../assets/images/phone-icon.png')}
              style={styles.contactIcon}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Call Support</Text>
              <Text style={styles.contactValue}>+234 800 123 4567</Text>
              <Text style={styles.contactNote}>Available 8 AM - 8 PM, Monday to Sunday</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.contactItem}
            onPress={handleEmailSupport}
          >
            <Image
              source={require('../../../assets/images/email-icon.png')}
              style={styles.contactIcon}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactValue}>support@okadasolution.com</Text>
              <Text style={styles.contactNote}>We aim to respond within 24 hours</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: 16,
    paddingBottom: 32,
  },
  supportCard: {
    backgroundColor: '#2E86DE',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 22,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 24,
  },
  categoryItem: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedCategory: {
    borderWidth: 2,
    borderColor: '#2E86DE',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  messageContainer: {
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
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    height: 120,
    fontSize: 16,
    color: '#333333',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  faqContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 16,
  },
  faqIcon: {
    width: 16,
    height: 16,
    tintColor: '#666666',
  },
  faqIconExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactIcon: {
    width: 32,
    height: 32,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#2E86DE',
    fontWeight: '500',
    marginBottom: 4,
  },
  contactNote: {
    fontSize: 12,
    color: '#666666',
  },
});

export default SupportScreen;