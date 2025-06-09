// src/screens/auth/DocumentUploadScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../navigation/types';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// Enhanced color palette
const COLORS = {
  PRIMARY: '#F9A826',      // Orange/Yellow
  PRIMARY_LIGHT: '#FFCB66', // Light Orange/Yellow
  PRIMARY_DARK: '#E08D12', // Darker Orange for pressed states
  BACKGROUND: '#FFFFFF',   // White
  TEXT_PRIMARY: '#333333', // Dark Gray
  TEXT_SECONDARY: '#999999', // Medium Gray
  INPUT_BORDER: '#EEEEEE', // Light Gray
  INPUT_BG: '#F9F9F9',     // Off-White background
  INPUT_ACTIVE: '#FCF5E8', // Light yellow when active
  ERROR: '#FF5252',        // Error Red
  SUCCESS: '#4CAF50',      // Success Green
  SHADOW: 'rgba(249, 168, 38, 0.15)', // Shadow color with primary color tint
  CARD_BG: '#FFFFFF',      // Card background
  SECTION_BG: '#FAFAFA',   // Section background
};

type DocumentUploadScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'DocumentUpload'>;

interface DocumentItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  uri: string | null;
  icon: string; // Ionicons name
}

// Progress stepper component
const ProgressStepper = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, title: 'Account' },
    { id: 2, title: 'Verify' },
    { id: 3, title: 'Details' },
    { id: 4, title: 'Documents' }
  ];

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <View style={styles.stepItem}>
            <View 
              style={[
                styles.stepCircle,
                step.id < currentStep && styles.completedStepCircle,
                step.id === currentStep && styles.currentStepCircle
              ]}
            >
              {step.id < currentStep ? (
                <Ionicons name="checkmark" size={16} color={COLORS.BACKGROUND} />
              ) : (
                <Text 
                  style={[
                    styles.stepNumber,
                    step.id === currentStep && styles.currentStepNumber
                  ]}
                >
                  {step.id}
                </Text>
              )}
            </View>
            <Text 
              style={[
                styles.stepTitle,
                step.id === currentStep && styles.currentStepTitle
              ]}
            >
              {step.title}
            </Text>
          </View>
          
          {index < steps.length - 1 && (
            <View 
              style={[
                styles.stepConnector,
                index < currentStep - 1 && styles.completedStepConnector
              ]} 
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// Document Card Component
const DocumentCard = ({
  document,
  onUpload,
  onRemove,
}: {
  document: DocumentItem;
  onUpload: (id: string) => void;
  onRemove: (id: string) => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.documentCard,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={styles.documentIconContainer}>
        <View style={[
          styles.iconCircle,
          document.uploaded && styles.uploadedIconCircle
        ]}>
          <Ionicons 
            name={document.uploaded ? "checkmark-circle" : document.icon} 
            size={24} 
            color={document.uploaded ? COLORS.BACKGROUND : COLORS.PRIMARY} 
          />
        </View>
      </View>
      
      <View style={styles.documentContent}>
        <View style={styles.documentHeader}>
          <Text style={styles.documentTitle}>
            {document.title}
            {document.required && (
              <Text style={styles.requiredTag}> *</Text>
            )}
          </Text>
          
          {document.uploaded ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Uploaded</Text>
            </View>
          ) : (
            document.required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            )
          )}
        </View>
        
        <Text style={styles.documentDescription}>
          {document.description}
        </Text>
        
        {document.uploaded ? (
          <View style={styles.uploadedActions}>
            <TouchableOpacity 
              style={styles.previewButton}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={16} color={COLORS.PRIMARY} />
              <Text style={styles.previewText}>Preview</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(document.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => onUpload(document.id)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={COLORS.BACKGROUND} />
            <Text style={styles.uploadButtonText}>Upload Document</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// Upload progress indicator
const UploadProgressIndicator = ({ completed, total }: { completed: number, total: number }) => {
  const percentage = (completed / total) * 100;
  
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressText}>
          Uploaded <Text style={styles.progressBold}>{completed}</Text> of <Text style={styles.progressBold}>{total}</Text> required documents
        </Text>
        <Text style={styles.progressPercentage}>{percentage.toFixed(0)}%</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
};

const DocumentUploadScreen = () => {
  const navigation = useNavigation<DocumentUploadScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: 'license',
      title: 'Driver\'s License',
      description: 'Front and back of your valid driver\'s license',
      required: true,
      uploaded: false,
      uri: null,
      icon: 'card-outline',
    },
    {
      id: 'vehicle_registration',
      title: 'Vehicle Registration',
      description: 'Valid vehicle registration document',
      required: true,
      uploaded: false,
      uri: null,
      icon: 'document-text-outline',
    },
    {
      id: 'insurance',
      title: 'Insurance Certificate',
      description: 'Proof of valid insurance coverage',
      required: true,
      uploaded: false,
      uri: null,
      icon: 'shield-checkmark-outline',
    },
    {
      id: 'profile_photo',
      title: 'Profile Photo',
      description: 'Clear photo of your face against a plain background',
      required: true,
      uploaded: false,
      uri: null,
      icon: 'person-circle-outline',
    },
    {
      id: 'road_worthiness',
      title: 'Road Worthiness Certificate',
      description: 'Certificate showing your vehicle is roadworthy',
      required: false,
      uploaded: false,
      uri: null,
      icon: 'ribbon-outline',
    },
  ]);

  const handleSelectDocument = async (id: string) => {
    // Simulate document upload
    try {
      const updatedDocuments = documents.map(doc => {
        if (doc.id === id) {
          return {
            ...doc,
            uploaded: true,
            uri: 'https://example.com/document.jpg', // Placeholder URI
          };
        }
        return doc;
      });
      
      setDocuments(updatedDocuments);
    } catch (error) {
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const handleRemoveDocument = (id: string) => {
    const updatedDocuments = documents.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          uploaded: false,
          uri: null,
        };
      }
      return doc;
    });
    
    setDocuments(updatedDocuments);
  };

  const requiredDocuments = documents.filter(doc => doc.required);
  const uploadedRequiredDocuments = requiredDocuments.filter(doc => doc.uploaded);
  const canSubmit = requiredDocuments.every(doc => doc.uploaded);

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Required Documents', 'Please upload all required documents before submitting.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('RegistrationComplete');
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Submission Failed', 'An error occurred. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.BACKGROUND} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidView}
        >
          {/* Top Blob */}
          <View style={styles.topBlobContainer}>
            <View style={styles.topBlob} />
          </View>
          
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Document Upload</Text>
              <Text style={styles.subtitle}>
                Please upload clear photos of the following documents
              </Text>
            </View>

            {/* Progress Stepper */}
            <ProgressStepper currentStep={4} />

            {/* Upload Progress Indicator */}
            <UploadProgressIndicator 
              completed={uploadedRequiredDocuments.length} 
              total={requiredDocuments.length} 
            />

            <View style={styles.documentsContainer}>
              {documents.map(document => (
                <DocumentCard 
                  key={document.id}
                  document={document}
                  onUpload={handleSelectDocument}
                  onRemove={handleRemoveDocument}
                />
              ))}
            </View>

            <View style={styles.footerContainer}>
              <View style={styles.noteContainer}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.noteText}>
                  Documents marked with <Text style={styles.requiredTag}>*</Text> are required
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (!canSubmit || isLoading) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.BACKGROUND} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>
                      {canSubmit ? 'SUBMIT DOCUMENTS' : `UPLOAD ${requiredDocuments.length - uploadedRequiredDocuments.length} MORE REQUIRED`}
                    </Text>
                    {canSubmit && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.BACKGROUND} style={styles.buttonIcon} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  topBlobContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 100,
    overflow: 'hidden',
    zIndex: 1,
  },
  topBlob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.PRIMARY_LIGHT,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    marginTop: 60,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.INPUT_BG,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.INPUT_BORDER,
  },
  currentStepCircle: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  completedStepCircle: {
    backgroundColor: COLORS.SUCCESS,
    borderColor: COLORS.SUCCESS,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.TEXT_SECONDARY,
  },
  currentStepNumber: {
    color: COLORS.BACKGROUND,
  },
  stepTitle: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  currentStepTitle: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  stepConnector: {
    height: 2,
    backgroundColor: COLORS.INPUT_BORDER,
    flex: 1,
    marginTop: -14,
  },
  completedStepConnector: {
    backgroundColor: COLORS.SUCCESS,
  },
  progressContainer: {
    marginBottom: 24,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  progressBold: {
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 4,
  },
  documentsContainer: {
    marginBottom: 24,
  },
  documentCard: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  documentIconContainer: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 168, 38, 0.05)',
    paddingVertical: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedIconCircle: {
    backgroundColor: COLORS.SUCCESS,
  },
  documentContent: {
    flex: 1,
    padding: 16,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  requiredTag: {
    color: COLORS.ERROR,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: COLORS.SUCCESS,
    fontSize: 12,
    fontWeight: '600',
  },
  requiredBadge: {
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  requiredBadgeText: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  documentDescription: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  uploadButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 168, 38, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  previewText: {
    color: COLORS.PRIMARY,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  removeText: {
    color: COLORS.ERROR,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  footerContainer: {
    marginTop: 8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'center',
  },
  noteText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginLeft: 6,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.PRIMARY_LIGHT,
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.BACKGROUND,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});

export default DocumentUploadScreen;