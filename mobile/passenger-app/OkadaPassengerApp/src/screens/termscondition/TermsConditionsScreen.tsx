import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';

const TermsConditionsScreen = () => {
  const [expandedSection, setExpandedSection] = useState('introduction');

  const handleSectionToggle = (section) => {
    setExpandedSection(section === expandedSection ? null : section);
  };

  const renderSection = (id, title, content) => {
    const isExpanded = expandedSection === id;
    
    return (
      <View style={styles.termsSection}>
        <TouchableOpacity 
          style={[
            styles.termsSectionHeader,
            isExpanded && styles.termsSectionHeaderActive
          ]}
          onPress={() => handleSectionToggle(id)}
        >
          <Text style={styles.termsSectionTitle}>{title}</Text>
          <Text style={styles.termsSectionToggle}>{isExpanded ? '−' : '+'}</Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.termsSectionContent}>
            {content}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <Text style={styles.headerSubtitle}>Last updated: March 25, 2025</Text>
      </View>

      {/* Introduction */}
      <View style={styles.introSection}>
        <Text style={styles.paragraph}>
          Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using our mobile application (the "Service") operated by Our Company ("us", "we", or "our").
        </Text>
        <Text style={styles.paragraph}>
          Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.
        </Text>
        <Text style={styles.paragraph}>
          By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
        </Text>
      </View>

      {/* Table of Contents */}
      <View style={styles.tocContainer}>
        <Text style={styles.tocTitle}>Contents</Text>
        <TouchableOpacity onPress={() => setExpandedSection('introduction')}>
          <Text style={styles.tocItem}>1. Introduction</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('accounts')}>
          <Text style={styles.tocItem}>2. Accounts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('content')}>
          <Text style={styles.tocItem}>3. Content</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('intellectual')}>
          <Text style={styles.tocItem}>4. Intellectual Property</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('termination')}>
          <Text style={styles.tocItem}>5. Termination</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('liability')}>
          <Text style={styles.tocItem}>6. Limitation of Liability</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('privacy')}>
          <Text style={styles.tocItem}>7. Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('governing')}>
          <Text style={styles.tocItem}>8. Governing Law</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('changes')}>
          <Text style={styles.tocItem}>9. Changes to Terms</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('contact')}>
          <Text style={styles.tocItem}>10. Contact Us</Text>
        </TouchableOpacity>
      </View>

      {/* Detailed Sections */}
      {renderSection('introduction', '1. Introduction', (
        <>
          <Text style={styles.termsParagraph}>
            These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Our Company ("we," "us" or "our"), concerning your access to and use of our mobile application and website (the "Service").
          </Text>
          <Text style={styles.termsParagraph}>
            You agree that by accessing the Service, you have read, understood, and agree to be bound by all of these Terms and Conditions. If you do not agree with all of these Terms and Conditions, then you are expressly prohibited from using the Service and you must discontinue use immediately.
          </Text>
          <Text style={styles.termsParagraph}>
            We reserve the right, in our sole discretion, to make changes or modifications to these Terms and Conditions at any time and for any reason. We will alert you about any changes by updating the "Last updated" date of these Terms and Conditions, and you waive any right to receive specific notice of each such change.
          </Text>
        </>
      ))}

      {renderSection('accounts', '2. Accounts', (
        <>
          <Text style={styles.termsParagraph}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
          </Text>
          <Text style={styles.termsParagraph}>
            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.
          </Text>
          <Text style={styles.termsParagraph}>
            You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </Text>
          <Text style={styles.termsParagraph}>
            You may not use as a username the name of another person or entity or that is not lawfully available for use, a name or trademark that is subject to any rights of another person or entity other than you without appropriate authorization, or a name that is otherwise offensive, vulgar or obscene.
          </Text>
        </>
      ))}

      {renderSection('content', '3. Content', (
        <>
          <Text style={styles.termsParagraph}>
            Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post on or through the Service, including its legality, reliability, and appropriateness.
          </Text>
          <Text style={styles.termsParagraph}>
            By posting Content on or through the Service, You represent and warrant that: (i) the Content is yours (you own it) or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the Service does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
          </Text>
          <Text style={styles.termsParagraph}>
            We reserve the right to terminate the account of any user found to be infringing on a copyright.
          </Text>
          <Text style={styles.termsParagraph}>
            You retain any and all of your rights to any Content you submit, post or display on or through the Service and you are responsible for protecting those rights. We take no responsibility and assume no liability for Content you or any third party posts on or through the Service.
          </Text>
        </>
      ))}

      {renderSection('intellectual', '4. Intellectual Property', (
        <>
          <Text style={styles.termsParagraph}>
            The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of Our Company and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Our Company.
          </Text>
          <Text style={styles.termsParagraph}>
            You acknowledge and agree that any questions, comments, suggestions, ideas, feedback, or other information regarding the Service ("Submissions") provided by you to us are non-confidential and shall become our sole property. We shall own exclusive rights, including all intellectual property rights, and shall be entitled to the unrestricted use and dissemination of these Submissions for any lawful purpose, commercial or otherwise, without acknowledgment or compensation to you.
          </Text>
        </>
      ))}

      {renderSection('termination', '5. Termination', (
        <>
          <Text style={styles.termsParagraph}>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </Text>
          <Text style={styles.termsParagraph}>
            Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.
          </Text>
          <Text style={styles.termsParagraph}>
            All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity and limitations of liability.
          </Text>
        </>
      ))}

      {renderSection('liability', '6. Limitation Of Liability', (
        <>
          <Text style={styles.termsParagraph}>
            In no event shall Our Company, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.
          </Text>
          <Text style={styles.termsParagraph}>
            Some jurisdictions do not allow the exclusion of certain warranties or the limitation or exclusion of liability for incidental or consequential damages. Accordingly, some of the above limitations may not apply to you.
          </Text>
        </>
      ))}

      {renderSection('privacy', '7. Privacy Policy', (
        <>
          <Text style={styles.termsParagraph}>
            Our Privacy Policy describes our policies and procedures on the collection, use and disclosure of your personal information when you use the Service and tells you about your privacy rights and how the law protects you. Please read our Privacy Policy carefully before using our Service.
          </Text>
        </>
      ))}

      {renderSection('governing', '8. Governing Law', (
        <>
          <Text style={styles.termsParagraph}>
            These Terms shall be governed and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
          </Text>
          <Text style={styles.termsParagraph}>
            Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions of these Terms will remain in effect.
          </Text>
          <Text style={styles.termsParagraph}>
            These Terms constitute the entire agreement between us regarding our Service, and supersede and replace any prior agreements we might have between us regarding the Service.
          </Text>
        </>
      ))}

      {renderSection('changes', '9. Changes To Terms', (
        <>
          <Text style={styles.termsParagraph}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </Text>
          <Text style={styles.termsParagraph}>
            By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Service.
          </Text>
        </>
      ))}

      {renderSection('contact', '10. Contact Us', (
        <>
          <Text style={styles.termsParagraph}>
            If you have any questions about these Terms, please contact us:
          </Text>
          <Text style={styles.contactItem}>
            • By email: legal@yourcompany.com
          </Text>
          <Text style={styles.contactItem}>
            • By phone: (123) 456-7890
          </Text>
          <Text style={styles.contactItem}>
            • By mail: 123 Legal Street, Suite 100, Anytown, USA 12345
          </Text>
        </>
      ))}

      {/* Agreement Section */}
      <View style={styles.agreementSection}>
        <Text style={styles.agreementText}>
          By using our Service, you acknowledge that you have read and understand our Terms & Conditions and agree to be bound by them.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 Your Company. All rights reserved.</Text>
      </View>
    </ScrollView>
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
    fontSize: 16,
    color: '#ecf0f1',
  },
  introSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 15,
  },
  tocContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  tocItem: {
    fontSize: 16,
    color: '#3498db',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  termsSection: {
    marginBottom: 2,
    backgroundColor: '#ffffff',
  },
  termsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  termsSectionHeaderActive: {
    backgroundColor: '#ecf0f1',
  },
  termsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  termsSectionToggle: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  termsSectionContent: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  termsParagraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 15,
  },
  contactItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 8,
    paddingLeft: 10,
  },
  agreementSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 15,
  },
  agreementText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#34495e',
    textAlign: 'center',
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

export default TermsConditionsScreen;