import { apiClient, ApiResponse } from '../client';
import { socketService, SocketEvent } from './socket.service';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_ENDPOINTS } from '../config';
import { Platform } from 'react-native';

// Define document types
export type DocumentType = 
  | 'license'
  | 'vehicle_registration'
  | 'insurance'
  | 'profile_photo'
  | 'road_worthiness'
  | 'background_check';

// Define document status types
export type DocumentStatus = 
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'expired'
  | 'not_submitted';

// Document interface
export interface Document {
  id: string | null;
  userId?: string;
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  expiryDate?: string;
  dateSubmitted?: string;
  documentUrl?: string;
  rejectionReason?: string;
}

// Document status update event payload
export interface DocumentStatusUpdatePayload {
  documentId: string;
  status: DocumentStatus;
  rejectionReason?: string;
}

class DocumentService {
  private documents: Document[] = [];
  private listeners: ((documents: Document[]) => void)[] = [];

  constructor() {
    this.setupSocketListeners();
  }

  /**
   * Set up socket event listeners for document updates
   */
  private setupSocketListeners(): void {
    // Listen for document status updates
    socketService.on('document:status_updated', (payload: DocumentStatusUpdatePayload) => {
      this.updateDocumentStatus(payload.documentId, payload.status, payload.rejectionReason);
    });

    // Listen for new document created
    socketService.on('document:created', (payload: { document: Document }) => {
      this.addDocument(payload.document);
    });

    // Listen for document updated
    socketService.on('document:updated', (payload: { document: Document }) => {
      this.updateDocument(payload.document);
    });

    // Listen for document deleted
    socketService.on('document:deleted', (payload: { documentId: string }) => {
      this.removeDocument(payload.documentId);
    });
  }

  /**
   * Fetch all documents for the current user
   * @returns Promise with array of documents
   */
  async fetchDocuments(): Promise<Document[]> {
    try {
      const response = await apiClient.get<ApiResponse<Document[]>>(
        '/documents'
      );

      if (response.status === 'success' && response.data) {
        this.documents = response.data;
        this.notifyListeners();
        return this.documents;
      }

      return [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  }

  /**
   * Get a specific document by ID
   * @param documentId Document ID to fetch
   * @returns Promise with document
   */
  async getDocument(documentId: string): Promise<Document | null> {
    try {
      const response = await apiClient.get<ApiResponse<Document>>(
        `/documents/${documentId}`
      );

      if (response.status === 'success' && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Upload a document using the camera or image picker
   * @param documentType Type of document to upload
   * @param name Name of the document
   * @param expiryDate Optional expiry date for the document
   * @param useCamera Whether to use camera or image picker
   * @returns Promise with uploaded document
   */
  // Upload progress callbacks
  private progressListeners: ((documentType: DocumentType, progress: number) => void)[] = [];
  private activeUploads: Map<string, number> = new Map(); // documentType -> progress %

  /**
   * Subscribe to upload progress updates
   * @param listener Function to call with progress updates
   * @returns Unsubscribe function
   */
  subscribeToProgress(listener: (documentType: DocumentType, progress: number) => void): () => void {
    this.progressListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify progress listeners of upload progress
   * @param documentType Document type being uploaded
   * @param progress Upload progress (0-100)
   */
  private notifyProgressListeners(documentType: DocumentType, progress: number): void {
    this.activeUploads.set(documentType, progress);
    this.progressListeners.forEach(listener => listener(documentType, progress));
  }

  /**
   * Get current upload progress for a document type
   * @param documentType Document type
   * @returns Current progress (0-100) or null if no active upload
   */
  getUploadProgress(documentType: DocumentType): number | null {
    return this.activeUploads.has(documentType) ? this.activeUploads.get(documentType)! : null;
  }

  /**
   * Upload a document using the camera or image picker with real-time progress tracking
   * @param documentType Type of document to upload
   * @param name Name of the document
   * @param expiryDate Optional expiry date for the document
   * @param useCamera Whether to use camera or image picker
   * @returns Promise with uploaded document
   */
  async uploadDocument(
    documentType: DocumentType,
    name: string,
    expiryDate?: string,
    useCamera = false
  ): Promise<Document | null> {
    try {
      // Reset progress for this document type
      this.notifyProgressListeners(documentType, 0);

      // Request permissions first
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Camera permission is required to take pictures');
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Media library permission is required to select images');
        }
      }

      // Update progress - permissions granted
      this.notifyProgressListeners(documentType, 5);

      // Launch camera or image picker
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (result.canceled) {
        this.activeUploads.delete(documentType);
        return null;
      }

      // Update progress - image selected
      this.notifyProgressListeners(documentType, 10);

      const imageUri = result.assets?.[0]?.uri;
      if (!imageUri) {
        throw new Error('No image selected');
      }

      // Get the file extension
      const uriParts = imageUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      // Generate a unique filename with timestamp
      const fileName = `${documentType}_${Date.now()}.${fileExtension}`;
      
      // Update progress - preparing upload
      this.notifyProgressListeners(documentType, 15);
      
      // Emit socket event to notify upload started
      socketService.emit('document:upload_started', {
        documentType,
        fileName
      });

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        name: fileName,
        type: `image/${fileExtension}`,
      } as any);
      
      formData.append('type', documentType);
      formData.append('name', name);
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }

      // First, get a pre-signed upload URL from the server
      console.log('Getting upload URL for document...');
      this.notifyProgressListeners(documentType, 20);
      
      const uploadUrlResponse = await apiClient.get<ApiResponse<{ uploadUrl: string, documentId: string }>>(
        `/documents/upload-url?fileName=${encodeURIComponent(fileName)}&documentType=${documentType}`
      );

      if (uploadUrlResponse.status !== 'success' || !uploadUrlResponse.data) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, documentId } = uploadUrlResponse.data;
      
      // Update progress - upload URL received
      this.notifyProgressListeners(documentType, 30);

      // Prepare the file for upload
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Get file size for progress calculation
      const fileSize = fileInfo.size || 0;
      const fileBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Update progress - file read complete
      this.notifyProgressListeners(documentType, 40);
      
      // Emit socket event for upload progress
      socketService.emit('document:upload_progress', {
        documentType,
        fileName,
        progress: 40
      });

      // Upload the file directly to cloud storage using the pre-signed URL with progress tracking
      console.log('Uploading document to cloud storage...');
      
      // Upload with XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();
      
      // Create a promise to await the upload
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          }
        };
        
        // Track progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Calculate overall progress (40-90% range for upload)
            const uploadProgress = Math.round((event.loaded / event.total) * 50) + 40;
            
            // Update progress
            this.notifyProgressListeners(documentType, uploadProgress);
            
            // Emit socket event for progress updates
            socketService.emit('document:upload_progress', {
              documentType,
              fileName,
              progress: uploadProgress
            });
          }
        };
        
        xhr.onerror = () => {
          reject(new Error('Network error occurred during upload'));
        };
      });
      
      // Set up request
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', 'image/jpeg'); // Adjust based on file type
      
      // Send the file
      xhr.send(fileBase64);
      
      // Wait for upload to complete
      await uploadPromise;

      // Update progress - upload complete, finalizing
      this.notifyProgressListeners(documentType, 90);
      
      // Emit socket event for upload progress
      socketService.emit('document:upload_progress', {
        documentType,
        fileName,
        progress: 90
      });

      // Extract the cloud storage URL from the upload response
      const documentUrl = uploadUrl.split('?')[0];

      // Now finalize the document creation/update with the server
      console.log('Finalizing document upload with server...');
      const response = await apiClient.post<ApiResponse<Document>>('/documents', {
        id: documentId,
        type: documentType,
        name,
        documentUrl,
        expiryDate,
      });

      // Update progress - finalized
      this.notifyProgressListeners(documentType, 100);
      
      // Emit socket event for upload completion
      socketService.emit('document:upload_completed', {
        documentType,
        documentId: documentId,
        fileName,
        documentUrl
      });

      if (response.status === 'success' && response.data) {
        // Update local cache
        this.addOrUpdateDocument(response.data);
        
        // Emit a socket event to notify other devices/sessions
        socketService.emit('document:uploaded', {
          documentId: response.data.id,
          userId: response.data.userId,
          type: documentType
        });
        
        // Clear from active uploads
        setTimeout(() => {
          this.activeUploads.delete(documentType);
        }, 1000); // Keep progress visible briefly even after completion
        
        return response.data;
      }

      this.activeUploads.delete(documentType);
      return null;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param documentId ID of document to delete
   * @returns Promise with success status
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<ApiResponse<any>>(
        `/documents/${documentId}`
      );

      if (response.status === 'success') {
        // Remove from local cache
        this.removeDocument(documentId);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Add a document to the local cache
   * @param document Document to add
   */
  private addDocument(document: Document): void {
    if (!document.id) return;
    
    const exists = this.documents.some(doc => doc.id === document.id);
    if (!exists) {
      this.documents = [...this.documents, document];
      this.notifyListeners();
    }
  }

  /**
   * Update a document in the local cache
   * @param document Document data to update
   */
  private updateDocument(document: Document): void {
    if (!document.id) return;
    
    this.documents = this.documents.map(doc => 
      doc.id === document.id ? { ...doc, ...document } : doc
    );
    this.notifyListeners();
  }

  /**
   * Add or update a document in the local cache
   * @param document Document to add or update
   */
  private addOrUpdateDocument(document: Document): void {
    if (!document.id) return;
    
    const exists = this.documents.some(doc => doc.id === document.id);
    if (exists) {
      this.updateDocument(document);
    } else {
      this.addDocument(document);
    }
  }

  /**
   * Remove a document from the local cache
   * @param documentId ID of document to remove
   */
  private removeDocument(documentId: string): void {
    this.documents = this.documents.filter(doc => doc.id !== documentId);
    this.notifyListeners();
  }

  /**
   * Update a document's status in the local cache
   * @param documentId ID of document to update
   * @param status New status
   * @param rejectionReason Optional rejection reason
   */
  private updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    rejectionReason?: string
  ): void {
    this.documents = this.documents.map(doc => {
      if (doc.id === documentId) {
        return {
          ...doc,
          status,
          ...(rejectionReason && { rejectionReason }),
        };
      }
      return doc;
    });
    this.notifyListeners();
  }

  /**
   * Subscribe to document updates
   * @param listener Function to call when documents change
   * @returns Unsubscribe function
   */
  subscribe(listener: (documents: Document[]) => void): () => void {
    this.listeners.push(listener);
    // Immediately notify with current data
    listener([...this.documents]);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of document changes
   */
  private notifyListeners(): void {
    const documentsCopy = [...this.documents];
    this.listeners.forEach(listener => listener(documentsCopy));
  }

  /**
   * Get all documents from local cache
   * @returns Array of documents
   */
  getDocuments(): Document[] {
    return [...this.documents];
  }
}

// Create and export a singleton instance
export const documentService = new DocumentService();
