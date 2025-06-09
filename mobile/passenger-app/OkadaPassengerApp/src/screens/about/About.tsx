import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

const AboutUsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>About Us</Text>
        <Text style={styles.headerSubtitle}>Our Mission & Vision</Text>
      </View>

      {/* Company Story Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Story</Text>
        <Text style={styles.paragraph}>
          Founded in 2020, our company began with a simple idea: to create beautiful and functional 
          solutions that solve real-world problems. What started as a small team of three passionate 
          individuals has grown into a thriving company dedicated to excellence and innovation.
        </Text>
        <View style={styles.imageContainer}>
          <Image 
            source={require('../assets/team-photo.jpg')} 
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Our Mission Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.paragraph}>
          We're on a mission to make technology accessible to everyone. We believe in creating
          products that are intuitive, reliable, and help our customers achieve their goals.
          Our team works tirelessly to ensure that every solution we deliver exceeds expectations.
        </Text>
      </View>

      {/* Values Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Values</Text>
        
        <View style={styles.valueItem}>
          <View style={styles.valueIconContainer}>
            <Text style={styles.valueIcon}>★</Text>
          </View>
          <View style={styles.valueContent}>
            <Text style={styles.valueTitle}>Innovation</Text>
            <Text style={styles.valueDescription}>
              We push boundaries and explore new ideas to solve complex problems.
            </Text>
          </View>
        </View>

        <View style={styles.valueItem}>
          <View style={styles.valueIconContainer}>
            <Text style={styles.valueIcon}>♥</Text>
          </View>
          <View style={styles.valueContent}>
            <Text style={styles.valueTitle}>Integrity</Text>
            <Text style={styles.valueDescription}>
              We operate with honesty, transparency, and ethical responsibility.
            </Text>
          </View>
        </View>

        <View style={styles.valueItem}>
          <View style={styles.valueIconContainer}>
            <Text style={styles.valueIcon}>◆</Text>
          </View>
          <View style={styles.valueContent}>
            <Text style={styles.valueTitle}>Excellence</Text>
            <Text style={styles.valueDescription}>
              We are committed to delivering the highest quality in everything we do.
            </Text>
          </View>
        </View>
      </View>

      {/* Team Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Team</Text>
        <Text style={styles.paragraph}>
          Our diverse team brings together expertise from various backgrounds. We value 
          collaboration, creativity, and continuous learning.
        </Text>
        
        <View style={styles.teamContainer}>
          <View style={styles.teamMember}>
            <View style={styles.teamPhotoContainer}>
              <View style={styles.teamPhoto} />
            </View>
            <Text style={styles.teamName}>Jane Doe</Text>
            <Text style={styles.teamRole}>CEO & Founder</Text>
          </View>

          <View style={styles.teamMember}>
            <View style={styles.teamPhotoContainer}>
              <View style={styles.teamPhoto} />
            </View>
            <Text style={styles.teamName}>John Smith</Text>
            <Text style={styles.teamRole}>CTO</Text>
          </View>

          <View style={styles.teamMember}>
            <View style={styles.teamPhotoContainer}>
              <View style={styles.teamPhoto} />
            </View>
            <Text style={styles.teamName}>Anna Johnson</Text>
            <Text style={styles.teamRole}>Design Director</Text>
          </View>
        </View>
      </View>

      {/* Contact Section */}
      <View style={[styles.section, styles.contactSection]}>
        <Text style={styles.sectionTitle}>Get In Touch</Text>
        <Text style={styles.paragraph}>
          We'd love to hear from you! Reach out to discuss how we can work together.
        </Text>
        <Text style={styles.contactInfo}>Email: hello@company.com</Text>
        <Text style={styles.contactInfo}>Phone: (123) 456-7890</Text>
        <Text style={styles.contactInfo}>Address: 123 Business Avenue, Tech City</Text>
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
    fontSize: 18,
    color: '#ecf0f1',
    fontStyle: 'italic',
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
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#34495e',
    marginBottom: 15,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#ecf0f1',
    marginVertical: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  valueItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  valueIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  valueIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  valueDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  teamContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  teamMember: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  teamPhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecf0f1',
    marginBottom: 10,
    overflow: 'hidden',
  },
  teamPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#bdc3c7',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  teamRole: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  contactSection: {
    backgroundColor: '#f9f9f9',
  },
  contactInfo: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 8,
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

export default AboutUsScreen;