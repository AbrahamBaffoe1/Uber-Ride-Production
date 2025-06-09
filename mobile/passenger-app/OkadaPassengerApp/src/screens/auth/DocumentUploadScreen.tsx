import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type DocumentUploadScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DocumentUpload'>;

interface DocumentType {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isUploaded: boolean;
  documentUri?: string;
}

const DocumentUploadScreen: React.FC = () => {
  const navigation = useNavigation<DocumentUploadScreenNavigationProp>();
  
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentType[]>([
    {
      id: '1',
      name: 'Identity Verification',
      description: 'Upload your ID card, passport, or driver\'s license',
      iconName: 'person-circle-outline',
      isUploaded: false,
    },
    {
      id: '2',
      name: 'Proof of Address',
      description: 'Upload a utility bill or bank statement',
      iconName: 'home-outline',
      isUploaded: false,
    }
  ]);
  
  const handleSelectDocument = (documentId: string) => {
    // This would open a document picker in a real app
    // For demo purposes, we'll simulate document selection
    
    // Find and update the document
    const updatedDocuments = documents.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          isUploaded: true,
          documentUri: 'https://i.ibb.co/5GkNwM6/document-placeholder.png'
        };
      }
      return doc;
    });
    
    setDocuments(updatedDocuments);
  };
  
  const handleRemoveDocument = (documentId: string) => {
    // Find and update the document
    const updatedDocuments = documents.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          isUploaded: false,
          documentUri: undefined
        };
      }
      return doc;
    });
    
    setDocuments(updatedDocuments);
  };
  
  const handleContinue = () => {
    // Check if all documents are uploaded
    const allDocumentsUploaded = documents.every(doc => doc.isUploaded);
    
    if (!allDocumentsUploaded) {
      // Show an error message in a real app
      return;
    }
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('RegistrationComplete');
    }, 1500);
  };
  
  const areAllDocumentsUploaded = documents.every(doc => doc.isUploaded);
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#13171D" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Verification</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '67%' }]} />
          </View>
          <Text style={styles.progressText}>Step 2 of 3</Text>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Upload Your Documents</Text>
        <Text style={styles.subtitle}>
          Please upload the following documents for verification. This helps maintain security within our community.
        </Text>
        
        <View style={styles.documentsContainer}>
          {documents.map(document => (
            <View key={document.id} style={styles.documentCard}>
              <View style={styles.documentIcon}>
                <Ionicons name={document.iconName as any} size={32} color="#7AC231" />
              </View>
              
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{document.name}</Text>
                <Text style={styles.documentDescription}>{document.description}</Text>
              </View>
              
              {document.isUploaded ? (
                <View style={styles.uploadedContainer}>
                  <Image 
                    source={{ uri: document.documentUri }}
                    style={styles.documentThumbnail}
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => handleRemoveDocument(document.id)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => handleSelectDocument(document.id)}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Your documents are securely stored and will only be used for verification purposes.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.continueButton, !areAllDocumentsUploaded && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isLoading || !areAllDocumentsUploaded}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#13171D',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1C2128',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7AC231',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 30,
    lineHeight: 22,
  },
  documentsContainer: {
    marginBottom: 24,
  },
  documentCard: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(122, 194, 49, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentInfo: {
    flex: 1,
    marginRight: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  documentDescription: {
    fontSize: 14,
    color: '#999999',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7AC231',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  uploadedContainer: {
    position: 'relative',
  },
  documentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#13171D',
    borderRadius: 12,
  },
  infoBox: {
    backgroundColor: '#1C2128',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#7AC231',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(122, 194, 49, 0.5)',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default DocumentUploadScreen;