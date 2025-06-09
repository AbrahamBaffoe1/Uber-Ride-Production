import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Platform,
  KeyboardAvoidingView
} from 'react-native';

const HelpSupportScreen = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const faqs = [
    {
      question: 'How do I create an account?',
      answer: 'To create an account, tap on the "Sign Up" button on the home screen. Fill in your details including name, email, and password. Verify your email address through the link we send you, and your account will be ready to use.'
    },
    {
      question: 'I forgot my password. What should I do?',
      answer: 'If you forgot your password, go to the login screen and tap on "Forgot Password". Enter your email address, and we will send you instructions to reset your password. Follow the link in the email to create a new password.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'To update your profile, navigate to the Profile tab and tap on "Edit Profile". You can update your name, profile picture, and other information from there. Tap "Save" to confirm your changes.'
    },
    {
      question: 'How can I change notification settings?',
      answer: 'To change notification settings, go to your Profile, then tap on "Settings" and select "Notifications". Here you can toggle different types of notifications on or off according to your preferences.'
    },
    {
      question: 'How do I delete my account?',
      answer: 'To delete your account, go to Profile > Settings > Account Management > Delete Account. Please note that this action is permanent and all your data will be permanently removed from our servers after 30 days.'
    },
    {
      question: 'Is my personal information secure?',
      answer: 'Yes, we take security very seriously. We use industry-standard encryption to protect your personal information. We do not share your data with third parties without your explicit consent. For more information, please review our Privacy Policy.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFaqPress = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const updateContactForm = (field, value) => {
    setContactForm({
      ...contactForm,
      [field]: value
    });
  };

  const submitContactForm = () => {
    // Here you would implement the actual submission logic
    console.log('Submitting form:', contactForm);
    alert('Thank you for your message! We will get back to you soon.');
    setContactForm({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>We're here to help you</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Help Buttons */}
        <View style={styles.quickHelpContainer}>
          <TouchableOpacity style={styles.quickHelpButton}>
            <Text style={styles.quickHelpIcon}>📋</Text>
            <Text style={styles.quickHelpText}>User Guide</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickHelpButton}>
            <Text style={styles.quickHelpIcon}>📱</Text>
            <Text style={styles.quickHelpText}>App Tutorial</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickHelpButton}>
            <Text style={styles.quickHelpIcon}>🎥</Text>
            <Text style={styles.quickHelpText}>Video Help</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity 
                  style={styles.faqQuestion}
                  onPress={() => handleFaqPress(index)}
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <Text style={styles.faqToggle}>{expandedFaq === index ? '−' : '+'}</Text>
                </TouchableOpacity>
                
                {expandedFaq === index && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noResultsText}>No results found. Try a different search term.</Text>
          )}
        </View>

        {/* Contact Form Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.sectionSubtitle}>
            Can't find what you're looking for? Send us a message and we'll get back to you as soon as possible.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Your name"
              value={contactForm.name}
              onChangeText={(text) => updateContactForm('name', text)}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              value={contactForm.email}
              onChangeText={(text) => updateContactForm('email', text)}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput
              style={styles.formInput}
              placeholder="What is this regarding?"
              value={contactForm.subject}
              onChangeText={(text) => updateContactForm('subject', text)}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Message</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              multiline
              numberOfLines={5}
              placeholder="Describe your issue or question"
              value={contactForm.message}
              onChangeText={(text) => updateContactForm('message', text)}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={submitContactForm}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>

        {/* Support Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Ways to Get Help</Text>
          
          <View style={styles.supportOption}>
            <Text style={styles.supportOptionIcon}>📞</Text>
            <View style={styles.supportOptionContent}>
              <Text style={styles.supportOptionTitle}>Phone Support</Text>
              <Text style={styles.supportOptionDetails}>Call us at (123) 456-7890</Text>
              <Text style={styles.supportOptionSubdetails}>Monday-Friday, 9am-5pm EST</Text>
            </View>
          </View>
          
          <View style={styles.supportOption}>
            <Text style={styles.supportOptionIcon}>💬</Text>
            <View style={styles.supportOptionContent}>
              <Text style={styles.supportOptionTitle}>Live Chat</Text>
              <Text style={styles.supportOptionDetails}>Chat with our support team in real-time</Text>
              <Text style={styles.supportOptionSubdetails}>Available 24/7</Text>
            </View>
          </View>
          
          <View style={styles.supportOption}>
            <Text style={styles.supportOptionIcon}>📱</Text>
            <View style={styles.supportOptionContent}>
              <Text style={styles.supportOptionTitle}>Community Forum</Text>
              <Text style={styles.supportOptionDetails}>Join our community to get help from other users</Text>
              <Text style={styles.supportOptionSubdetails}>community.ourapp.com</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Your Company. All rights reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerSection: {
    padding: 30,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#ecf0f1',
    fontStyle: 'italic',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f9f9f9',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    fontSize: 16,
  },
  quickHelpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#ecf0f1',
  },
  quickHelpButton: {
    alignItems: 'center',
    padding: 10,
  },
  quickHelpIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickHelpText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  faqItem: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  faqToggle: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  faqAnswer: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  faqAnswerText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#34495e',
  },
  noResultsText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 5,
    fontWeight: '600',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ecf0f1',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  supportOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  supportOptionContent: {
    flex: 1,
  },
  supportOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  supportOptionDetails: {
    fontSize: 16,
    color: '#34495e',
  },
  supportOptionSubdetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#ecf0f1',
  },
});

export default HelpSupportScreen;