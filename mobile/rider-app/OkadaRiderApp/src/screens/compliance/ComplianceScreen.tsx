// src/screens/compliance/ComplianceScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/types';
import { documentService, Document, DocumentType, DocumentStatus } from '../../api/services/document.service';
import { socketService } from '../../api/services/socket.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';

type ComplianceScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Compliance'>;

interface UploadModalProps {
  isVisible: boolean;
  documentType: DocumentType | null;
  documentName: string;
  onClose: () => void;
  onSubmit: (type: DocumentType, name: string, expiryDate?: string, useCamera?: boolean) => void;
}

// Date picker modal component
const UploadModal: React.FC<UploadModalProps> = ({ 
  isVisible, 
  documentType, 
  documentName, 
  onClose, 
  onSubmit 
}) => {
  const [name] = useState(documentName);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  const handleUploadWithCamera = () => {
    if (documentType) {
      onSubmit(documentType, name, expiryDate?.toISOString(), true);
    }
  };

  const handleUploadFromGallery = () => {
    if (documentType) {
      onSubmit(documentType, name, expiryDate?.toISOString(), false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Upload {documentName}</Text>
        
        {documentType !== 'profile_photo' && (
          <View style={styles.expirySection}>
            <Text style={styles.expiryLabel}>Document Expiry Date:</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {expiryDate ? expiryDate.toLocaleDateString() : 'Select Date'}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={expiryDate || new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>
        )}
        
        <View style={styles.uploadOptions}>
          <TouchableOpacity 
            style={[styles.uploadOption, styles.cameraOption]}
            onPress={handleUploadWithCamera}
          >
            <Text style={styles.uploadOptionText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.uploadOption, styles.galleryOption]}
            onPress={handleUploadFromGallery}
          >
            <Text style={styles.uploadOptionText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={onClose}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// Progress bar component
interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = '#2E86DE', 
  height = 8,
  animated = true
}) => {
  const animation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (animated) {
      Animated.timing(animation, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false
      }).start();
    } else {
      animation.setValue(progress);
    }
  }, [progress, animation, animated]);
  
  const width = animation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp'
  });
  
  return (
    <View style={[styles.progressBarContainer, { height }]}>
      <Animated.View 
        style={[
          styles.progressBar,
          { 
            width,
            backgroundColor: color,
            height
          }
        ]} 
      />
    </View>
  );
};

const ComplianceScreen = () => {
  const navigation = useNavigation<ComplianceScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | null>(null);
  const [selectedDocumentName, setSelectedDocumentName] = useState('');
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<DocumentType, number>>({} as Record<DocumentType, number>);

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const docs = await documentService.fetchDocuments();
      setDocuments(docs);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load documents. Please try again.');
    }
  }, []);

  // Set up socket event listeners and progress tracking
  const setupSocketListeners = useCallback(() => {
    // Subscribe to document updates
    const unsubscribeStatusUpdate = documentService.subscribe((updatedDocs) => {
      setDocuments(updatedDocs);
    });
    
    // Subscribe to upload progress updates
    const unsubscribeProgress = documentService.subscribeToProgress((docType, progress) => {
      setUploadProgress(prev => ({
        ...prev,
        [docType]: progress
      }));
      
      // Update uploadInProgress based on progress
      if (progress > 0 && progress < 100) {
        setUploadInProgress(true);
      } else if (progress === 100) {
        // Keep the progress bar visible briefly after completion
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[docType];
            
            // Check if any other uploads are in progress
            const hasActiveUploads = Object.keys(newProgress).length > 0;
            if (!hasActiveUploads) {
              setUploadInProgress(false);
            }
            
            return newProgress;
          });
        }, 1500);
      }
    });
    
    return () => {
      unsubscribeStatusUpdate();
      unsubscribeProgress();
    };
  }, []);

  // Load documents when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
      const cleanup = setupSocketListeners();
      
      return () => {
        cleanup();
      };
    }, [fetchDocuments, setupSocketListeners])
  );

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDocuments();
    setIsRefreshing(false);
  };

  // Handle document upload
  const handleUploadDocument = (documentType: DocumentType) => {
    const documentNames: Record<DocumentType, string> = {
      'license': 'Driver\'s License',
      'vehicle_registration': 'Vehicle Registration',
      'insurance': 'Insurance Certificate',
      'profile_photo': 'Profile Photo',
      'road_worthiness': 'Road Worthiness Certificate',
      'background_check': 'Background Check',
    };
    
    // Notify server that user is starting document upload process
    socketService.emit('document:upload_initiated', {
      documentType,
      timestamp: new Date().toISOString()
    });
    
    setSelectedDocumentType(documentType);
    setSelectedDocumentName(documentNames[documentType]);
    setModalVisible(true);
  };

  // Submit document upload
  const handleSubmitDocument = async (
    documentType: DocumentType, 
    name: string, 
    expiryDate?: string,
    useCamera = false
  ) => {
    setModalVisible(false);
    setUploadInProgress(true);
    
    try {
      const uploadedDoc = await documentService.uploadDocument(
        documentType,
        name,
        expiryDate,
        useCamera
      );
      
      if (uploadedDoc) {
        Alert.alert(
          'Success',
          'Document submitted successfully and is pending review.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to upload document. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert(
        'Error',
        'Failed to upload document. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUploadInProgress(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return '#27AE60';
      case 'pending':
        return '#F39C12';
      case 'rejected':
        return '#E74C3C';
      case 'expired':
        return '#E74C3C';
      case 'not_submitted':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      case 'not_submitted':
        return 'Not Submitted';
      default:
        return 'Unknown';
    }
  };

  const isDocumentExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 && diffDays <= 30;
  };

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#2E86DE" />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </SafeAreaView>
    );
  }

  // Count documents by status
  const statusCounts = documents.reduce((acc: Record<string, number>, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {});

  const totalDocuments = documents.length;
  const approvedDocuments = statusCounts['approved'] || 0;
  const pendingDocuments = statusCounts['pending'] || 0;
  const rejectedDocuments = statusCounts['rejected'] || 0;
  const expiredDocuments = statusCounts['expired'] || 0;
  const notSubmittedDocuments = statusCounts['not_submitted'] || 0;

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
        <Text style={styles.headerTitle}>Documents & Compliance</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2E86DE']}
            tintColor="#2E86DE"
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{approvedDocuments}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pendingDocuments}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{expiredDocuments}</Text>
            <Text style={styles.summaryLabel}>Expired</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{notSubmittedDocuments}</Text>
            <Text style={styles.summaryLabel}>Missing</Text>
          </View>
        </View>
        
        {expiredDocuments > 0 && (
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Action Required</Text>
              <Text style={styles.alertText}>
                You have {expiredDocuments} expired document(s) that need to be updated.
                Please update them to continue using the platform.
              </Text>
            </View>
          </View>
        )}
        
        {rejectedDocuments > 0 && (
          <View style={[styles.alertCard, { backgroundColor: '#FFECEC' }]}>
            <View style={[styles.alertIcon, { backgroundColor: '#E74C3C' }]}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Documents Rejected</Text>
              <Text style={styles.alertText}>
                You have {rejectedDocuments} rejected document(s) that need to be re-uploaded.
                Please check the rejection reason and upload valid documents.
              </Text>
            </View>
          </View>
        )}
        
        <Text style={styles.sectionTitle}>Your Documents</Text>
        
        {/* Display upload progress for documents */}
        {Object.keys(uploadProgress).length > 0 && (
          <View style={styles.uploadingCard}>
            {Object.entries(uploadProgress).map(([docType, progress]) => (
              <View key={docType} style={styles.uploadProgressItem}>
                <View style={styles.uploadProgressHeader}>
                  <Text style={styles.uploadingText}>
                    Uploading {docType.replace('_', ' ')}...
                  </Text>
                  <Text style={styles.uploadPercentText}>
                    {Math.round(progress)}%
                  </Text>
                </View>
                <ProgressBar progress={progress} height={6} />
              </View>
            ))}
          </View>
        )}
        
        {documents.map((document) => (
          <View key={document.id || document.type} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentName}>{document.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(document.status) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(document.status) },
                  ]}
                >
                  {getStatusText(document.status)}
                </Text>
              </View>
            </View>
            
            {document.documentUrl && document.status !== 'not_submitted' && (
              <View style={styles.documentImage}>
                <Image
                  source={{ uri: document.documentUrl }}
                  style={styles.documentImagePlaceholder}
                  resizeMode="cover"
                />
              </View>
            )}
            
            <View style={styles.documentDetails}>
              {document.dateSubmitted && document.status !== 'not_submitted' && (
                <View style={styles.documentDetail}>
                  <Text style={styles.documentDetailLabel}>Submitted:</Text>
                  <Text style={styles.documentDetailValue}>
                    {formatDate(document.dateSubmitted)}
                  </Text>
                </View>
              )}
              
              {document.expiryDate && (
                <View style={styles.documentDetail}>
                  <Text style={styles.documentDetailLabel}>Expires:</Text>
                  <Text
                    style={[
                      styles.documentDetailValue,
                      isDocumentExpiringSoon(document.expiryDate) && styles.expiringText,
                      document.status === 'expired' && styles.expiredText,
                    ]}
                  >
                    {formatDate(document.expiryDate)}
                    {isDocumentExpiringSoon(document.expiryDate) && (
                      <Text style={styles.expiringText}> (Expiring Soon)</Text>
                    )}
                  </Text>
                </View>
              )}
              
              {document.rejectionReason && document.status === 'rejected' && (
                <View style={styles.documentDetail}>
                  <Text style={styles.documentDetailLabel}>Reason:</Text>
                  <Text style={[styles.documentDetailValue, styles.rejectionText]}>
                    {document.rejectionReason}
                  </Text>
                </View>
              )}
            </View>
            
            {(document.status === 'expired' || 
              document.status === 'rejected' || 
              document.status === 'not_submitted') && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleUploadDocument(document.type as DocumentType)}
                disabled={uploadInProgress}
              >
                <Text style={styles.uploadButtonText}>
                  {document.status === 'not_submitted' ? 'Upload Document' : 'Update Document'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        <Text style={styles.noticeText}>
          All documents must be clear, legible, and up-to-date.
          Document verification may take up to 48 hours.
        </Text>
      </ScrollView>
      
      <UploadModal
        isVisible={modalVisible}
        documentType={selectedDocumentType}
        documentName={selectedDocumentName}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitDocument}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
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
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 8,
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    marginBottom: 16,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F39C12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  documentImage: {
    marginBottom: 16,
  },
  documentImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  documentDetails: {
    marginBottom: 16,
  },
  documentDetail: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  documentDetailLabel: {
    fontSize: 14,
    color: '#666666',
    width: 80,
  },
  documentDetailValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  expiringText: {
    color: '#F39C12',
  },
  expiredText: {
    color: '#E74C3C',
  },
  rejectionText: {
    color: '#E74C3C',
  },
  uploadButton: {
    backgroundColor: '#2E86DE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noticeText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  uploadingCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'column',
  },
  uploadProgressItem: {
    marginBottom: 12,
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  uploadingText: {
    fontSize: 14,
    color: '#2E86DE',
    fontWeight: '500',
  },
  uploadPercentText: {
    fontSize: 14,
    color: '#2E86DE',
    fontWeight: 'bold',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  expirySection: {
    marginBottom: 20,
  },
  expiryLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333333',
  },
  uploadOptions: {
    marginBottom: 20,
  },
  uploadOption: {
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  cameraOption: {
    backgroundColor: '#2E86DE',
  },
  galleryOption: {
    backgroundColor: '#3498DB',
  },
  uploadOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666666',
  },
});

export default ComplianceScreen;
