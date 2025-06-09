import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';

const PrivacyPolicyScreen = () => {
  const [expandedSection, setExpandedSection] = useState('introduction');

  const handleSectionToggle = (section) => {
    setExpandedSection(section === expandedSection ? null : section);
  };

  const renderSection = (id, title, content) => {
    const isExpanded = expandedSection === id;
    
    return (
      <View style={styles.policySection}>
        <TouchableOpacity 
          style={[
            styles.policySectionHeader,
            isExpanded && styles.policySectionHeaderActive
          ]}
          onPress={() => handleSectionToggle(id)}
        >
          <Text style={styles.policySectionTitle}>{title}</Text>
          <Text style={styles.policySectionToggle}>{isExpanded ? '−' : '+'}</Text>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.policySectionContent}>
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <Text style={styles.headerSubtitle}>Last updated: March 25, 2025</Text>
      </View>

      {/* Introduction */}
      <View style={styles.introSection}>
        <Text style={styles.paragraph}>
          Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </Text>
        <Text style={styles.paragraph}>
          Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the application.
        </Text>
      </View>

      {/* Table of Contents */}
      <View style={styles.tocContainer}>
        <Text style={styles.tocTitle}>Contents</Text>
        <TouchableOpacity onPress={() => setExpandedSection('introduction')}>
          <Text style={styles.tocItem}>1. Information We Collect</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('usage')}>
          <Text style={styles.tocItem}>2. How We Use Your Information</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('disclosure')}>
          <Text style={styles.tocItem}>3. Disclosure of Your Information</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('security')}>
          <Text style={styles.tocItem}>4. Security of Your Information</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('choices')}>
          <Text style={styles.tocItem}>5. Your Privacy Choices</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('children')}>
          <Text style={styles.tocItem}>6. Children's Privacy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('analytics')}>
          <Text style={styles.tocItem}>7. Analytics and Tracking</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('international')}>
          <Text style={styles.tocItem}>8. International Data Transfers</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('updates')}>
          <Text style={styles.tocItem}>9. Updates to This Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setExpandedSection('contact')}>
          <Text style={styles.tocItem}>10. Contact Us</Text>
        </TouchableOpacity>
      </View>

      {/* Detailed Sections */}
      {renderSection('introduction', '1. Information We Collect', (
        <>
          <Text style={styles.subSectionTitle}>1.1 Personal Information</Text>
          <Text style={styles.policyParagraph}>
            We may collect personal information that you provide to us, including but not limited to:
          </Text>
          <Text style={styles.policyListItem}>• Name</Text>
          <Text style={styles.policyListItem}>• Email address</Text>
          <Text style={styles.policyListItem}>• Phone number</Text>
          <Text style={styles.policyListItem}>• Date of birth</Text>
          <Text style={styles.policyListItem}>• Mailing address</Text>
          <Text style={styles.policyListItem}>• Username and password</Text>
          <Text style={styles.policyListItem}>• Profile information</Text>
          <Text style={styles.policyListItem}>• Payment and billing information</Text>
          
          <Text style={styles.subSectionTitle}>1.2 Device Information</Text>
          <Text style={styles.policyParagraph}>
            When you access our Service, we may automatically collect certain information about your device, including:
          </Text>
          <Text style={styles.policyListItem}>• Device type and model</Text>
          <Text style={styles.policyListItem}>• Operating system</Text>
          <Text style={styles.policyListItem}>• Unique device identifiers</Text>
          <Text style={styles.policyListItem}>• Mobile network information</Text>
          <Text style={styles.policyListItem}>• IP address</Text>
          
          <Text style={styles.subSectionTitle}>1.3 Usage Information</Text>
          <Text style={styles.policyParagraph}>
            We collect information about how you use our Service, including:
          </Text>
          <Text style={styles.policyListItem}>• Access times and dates</Text>
          <Text style={styles.policyListItem}>• App features you use</Text>
          <Text style={styles.policyListItem}>• User content you upload or create</Text>
          <Text style={styles.policyListItem}>• User preferences and settings</Text>
          <Text style={styles.policyListItem}>• Other actions within the application</Text>
        </>
      ))}

      {renderSection('usage', '2. How We Use Your Information', (
        <>
          <Text style={styles.policyParagraph}>
            We use the information we collect for various purposes, including:
          </Text>
          <Text style={styles.policyListItem}>• To provide and maintain our Service</Text>
          <Text style={styles.policyListItem}>• To notify you about changes to our Service</Text>
          <Text style={styles.policyListItem}>• To allow you to participate in interactive features</Text>
          <Text style={styles.policyListItem}>• To provide customer support</Text>
          <Text style={styles.policyListItem}>• To gather analysis or valuable information to improve our Service</Text>
          <Text style={styles.policyListItem}>• To monitor the usage of our Service</Text>
          <Text style={styles.policyListItem}>• To detect, prevent and address technical issues</Text>
          <Text style={styles.policyListItem}>• To personalize your experience</Text>
          <Text style={styles.policyListItem}>• To process transactions</Text>
          <Text style={styles.policyListItem}>• To send you marketing and promotional communications (with your consent)</Text>
          <Text style={styles.policyListItem}>• To respond to your inquiries and fulfill your requests</Text>
          <Text style={styles.policyParagraph}>
            We will only use your personal information for the purposes for which we collected it, unless we reasonably consider that we need to use it for another reason compatible with the original purpose.
          </Text>
        </>
      ))}

      {renderSection('disclosure', '3. Disclosure of Your Information', (
        <>
          <Text style={styles.policyParagraph}>
            We may share your information in the following situations:
          </Text>
          
          <Text style={styles.subSectionTitle}>3.1 With Service Providers</Text>
          <Text style={styles.policyParagraph}>
            We may share your information with third-party vendors, service providers, contractors or agents who perform services for us or on our behalf and require access to such information to do that work.
          </Text>
          
          <Text style={styles.subSectionTitle}>3.2 For Business Transfers</Text>
          <Text style={styles.policyParagraph}>
            We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
          </Text>
          
          <Text style={styles.subSectionTitle}>3.3 With Your Consent</Text>
          <Text style={styles.policyParagraph}>
            We may disclose your personal information for any purpose with your consent.
          </Text>
          
          <Text style={styles.subSectionTitle}>3.4 With Affiliates</Text>
          <Text style={styles.policyParagraph}>
            We may share your information with our affiliates, in which case we will require those affiliates to honor this Privacy Policy.
          </Text>
          
          <Text style={styles.subSectionTitle}>3.5 With Business Partners</Text>
          <Text style={styles.policyParagraph}>
            We may share your information with our business partners to offer you certain products, services or promotions.
          </Text>
          
          <Text style={styles.subSectionTitle}>3.6 Legal Requirements</Text>
          <Text style={styles.policyParagraph}>
            We may disclose your information where we are legally required to do so in order to comply with applicable law, governmental requests, a judicial proceeding, court order, or legal process, such as in response to a court order or a subpoena.
          </Text>
          
          <Text style={styles.subSectionTitle}>3.7 To Protect Rights</Text>
          <Text style={styles.policyParagraph}>
            We may disclose your information where we believe it is necessary to investigate, prevent, or take action regarding potential violations of our policies, suspected fraud, situations involving potential threats to the safety of any person and illegal activities, or as evidence in litigation in which we are involved.
          </Text>
        </>
      ))}

      {renderSection('security', '4. Security of Your Information', (
        <>
          <Text style={styles.policyParagraph}>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </Text>
          <Text style={styles.policyParagraph}>
            Any information disclosed online is vulnerable to interception and misuse by unauthorized parties. Therefore, we cannot guarantee complete security if you provide personal information.
          </Text>
          <Text style={styles.policyParagraph}>
            We retain personal information only for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements, to resolve disputes, and to enforce our agreements.
          </Text>
        </>
      ))}

      {renderSection('choices', '5. Your Privacy Choices', (
        <>
          <Text style={styles.subSectionTitle}>5.1 Account Information</Text>
          <Text style={styles.policyParagraph}>
            You can review and change your personal information by logging into the Application and visiting your account profile page.
          </Text>
          
          <Text style={styles.subSectionTitle}>5.2 Marketing Communications</Text>
          <Text style={styles.policyParagraph}>
            You can opt out of receiving promotional emails from us by following the instructions in those emails. If you opt out, we may still send you non-promotional emails, such as those about your account or our ongoing business relations.
          </Text>
          
          <Text style={styles.subSectionTitle}>5.3 Mobile Devices</Text>
          <Text style={styles.policyParagraph}>
            You can stop all collection of information by the Application by uninstalling the Application. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.
          </Text>
          
          <Text style={styles.subSectionTitle}>5.4 Do Not Track Features</Text>
          <Text style={styles.policyParagraph}>
            Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. No uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.
          </Text>
          
          <Text style={styles.subSectionTitle}>5.5 Data Access and Portability</Text>
          <Text style={styles.policyParagraph}>
            Depending on your location, you may have the right to request access to the personal information we collect from you, change that information, or delete it. To request to review, update, or delete your personal information, please submit a request by contacting us using the information provided below.
          </Text>
        </>
      ))}

      {renderSection('children', '6. Children\'s Privacy', (
        <>
          <Text style={styles.policyParagraph}>
            Our Service is not directed to anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact us. If we become aware that we have collected personal information from anyone under the age of 13 without verification of parental consent, we take steps to remove that information from our servers.
          </Text>
          <Text style={styles.policyParagraph}>
            If we need to rely on consent as a legal basis for processing your information and your country requires consent from a parent, we may require your parent's consent before we collect and use that information.
          </Text>
        </>
      ))}

      {renderSection('analytics', '7. Analytics and Tracking', (
        <>
          <Text style={styles.policyParagraph}>
            We may use third-party Service Providers to monitor and analyze the use of our Service.
          </Text>
          
          <Text style={styles.subSectionTitle}>7.1 Google Analytics</Text>
          <Text style={styles.policyParagraph}>
            Google Analytics is a web analytics service offered by Google that tracks and reports website traffic. Google uses the data collected to track and monitor the use of our Service. This data is shared with other Google services. Google may use the collected data to contextualize and personalize the ads of its own advertising network.
          </Text>
          
          <Text style={styles.subSectionTitle}>7.2 Firebase</Text>
          <Text style={styles.policyParagraph}>
            Firebase is an analytics service provided by Google Inc. You may opt-out of certain Firebase features through your mobile device settings, such as your device advertising settings or by following the instructions provided by Google in their Privacy Policy.
          </Text>
          
          <Text style={styles.subSectionTitle}>7.3 Cookies and Similar Technologies</Text>
          <Text style={styles.policyParagraph}>
            We may use cookies, pixel tags, web beacons, and other tracking technologies to collect information about your browsing activities and to distinguish you from other users of our Application. This helps us to provide you with a good experience when you browse our Application and also allows us to improve our Service.
          </Text>
        </>
      ))}

      {renderSection('international', '8. International Data Transfers', (
        <>
          <Text style={styles.policyParagraph}>
            Your information may be transferred to — and maintained on — computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction.
          </Text>
          <Text style={styles.policyParagraph}>
            If you are located outside United States and choose to provide information to us, please note that we transfer the information, including personal information, to United States and process it there. Your consent to this Privacy Policy followed by your submission of such information represents your agreement to that transfer.
          </Text>
          <Text style={styles.policyParagraph}>
            We will take all steps reasonably necessary to ensure that your data is treated securely and in accordance with this Privacy Policy and no transfer of your personal information will take place to an organization or a country unless there are adequate controls in place including the security of your data and other personal information.
          </Text>
        </>
      ))}

      {renderSection('updates', '9. Updates to This Policy', (
        <>
          <Text style={styles.policyParagraph}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
          </Text>
          <Text style={styles.policyParagraph}>
            You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </Text>
          <Text style={styles.policyParagraph}>
            Your continued use of our Service after we post any modifications to the Privacy Policy on this page will constitute your acknowledgment of the modifications and your consent to abide and be bound by the modified Privacy Policy.
          </Text>
        </>
      ))}

      {renderSection('contact', '10. Contact Us', (
        <>
          <Text style={styles.policyParagraph}>
            If you have any questions about this Privacy Policy, please contact us:
          </Text>
          <Text style={styles.policyListItem}>• By email: privacy@yourcompany.com</Text>
          <Text style={styles.policyListItem}>• By phone: (123) 456-7890</Text>
          <Text style={styles.policyListItem}>• By mail: 123 Privacy Avenue, Suite 200, Anytown, USA 12345</Text>
        </>
      ))}

      {/* Consent Section */}
      <View style={styles.consentSection}>
        <Text style={styles.consentText}>
          By using our Service, you acknowledge that you have read and understand our Privacy Policy and consent to the collection, use, and disclosure of your information as described.
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
  policySection: {
    marginBottom: 2,
    backgroundColor: '#ffffff',
  },
  policySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  policySectionHeaderActive: {
    backgroundColor: '#ecf0f1',
  },
  policySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  policySectionToggle: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: 'bold',
  },
  policySectionContent: {
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  policyParagraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 10,
    marginBottom: 10,
  },
  policyListItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 8,
    paddingLeft: 10,
  },
  consentSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    marginTop: 15,
  },
  consentText: {
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

export default PrivacyPolicyScreen;