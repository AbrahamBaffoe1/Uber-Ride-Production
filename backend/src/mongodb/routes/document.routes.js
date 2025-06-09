/**
 * MongoDB Document Routes
 * Defines API endpoints for rider document management (licenses, permits, etc.)
 */
const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { mongoose } = require('../../config/mongodb');
// Define a mongoose model for document if it doesn't exist already
const RiderDocument = mongoose.models.RiderDocument || mongoose.model('RiderDocument', new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['driver_license', 'vehicle_registration', 'insurance', 'permit', 'profile_photo', 'other']
  },
  documentName: {
    type: String,
    required: true
  },
  documentNumber: String,
  expiryDate: Date,
  issuedDate: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: String,
  fileUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  mimeType: String,
  fileSize: Number,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: Date,
  verifiedBy: String,
  notes: String
}, { timestamps: true }));

const router = express.Router();

/**
 * @route GET /api/v1/mongo/documents
 * @desc Get all documents (admin only, with optional filters)
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    // Ensure user has admin role - in a real app, verify admin access here
    
    const { status, documentType, userId, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query with provided filters
    const query = {};
    if (status) query.status = status;
    if (documentType) query.documentType = documentType;
    if (userId) query.userId = userId;
    
    // Find documents with pagination
    const documents = await RiderDocument.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalDocuments = await RiderDocument.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: documents,
      pagination: {
        total: totalDocuments,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalDocuments / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch documents'
    });
  }
});

/**
 * @route GET /api/v1/mongo/documents/user/:userId
 * @desc Get documents for a specific user
 * @access Private
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, documentType } = req.query;
    
    // Ensure user can only access their own documents unless admin
    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access these documents'
      });
    }
    
    // Build query
    const query = { userId };
    if (status) query.status = status;
    if (documentType) query.documentType = documentType;
    
    // Find documents
    const documents = await RiderDocument.find(query).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user documents'
    });
  }
});

/**
 * @route GET /api/v1/mongo/documents/:id
 * @desc Get a single document by ID
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find document by ID
    const document = await RiderDocument.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Ensure user can only access their own documents unless admin
    if (req.user.id !== document.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this document'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch document'
    });
  }
});

/**
 * @route POST /api/v1/mongo/documents
 * @desc Upload a new document
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      userId,
      documentType,
      documentName,
      documentNumber,
      expiryDate,
      issuedDate,
      fileUrl,
      thumbnailUrl,
      mimeType,
      fileSize,
      notes
    } = req.body;
    
    // Validate required fields
    if (!userId || !documentType || !documentName || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'User ID, document type, document name, and file URL are required'
      });
    }
    
    // Ensure user can only upload their own documents unless admin
    if (req.user.id !== userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to upload documents for this user'
      });
    }
    
    // Create new document
    const document = new RiderDocument({
      userId,
      documentType,
      documentName,
      documentNumber,
      expiryDate,
      issuedDate,
      fileUrl,
      thumbnailUrl,
      mimeType,
      fileSize,
      notes
    });
    
    // Save document to database
    await document.save();
    
    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload document'
    });
  }
});

/**
 * @route PUT /api/v1/mongo/documents/:id
 * @desc Update a document
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Find document first to check permissions
    const document = await RiderDocument.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Ensure user can only update their own documents unless admin
    if (req.user.id !== document.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this document'
      });
    }
    
    // Prevent changing the owner of a document
    if (updates.userId && updates.userId !== document.userId) {
      return res.status(400).json({
        success: false,
        message: 'Changing document ownership is not allowed'
      });
    }
    
    // Update document
    const updatedDocument = await RiderDocument.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    return res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDocument
    });
  } catch (error) {
    console.error('Error updating document:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update document'
    });
  }
});

/**
 * @route PATCH /api/v1/mongo/documents/:id/verify
 * @desc Verify or reject a document (admin only)
 * @access Private
 */
router.patch('/:id/verify', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    // Ensure user has admin role - in a real app, verify admin access here
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status (approved or rejected) is required'
      });
    }
    
    // If rejecting, require a reason
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    // Update document verification status
    const updates = {
      status,
      isVerified: status === 'approved',
      verifiedAt: new Date(),
      verifiedBy: req.user.id
    };
    
    if (status === 'rejected') {
      updates.rejectionReason = rejectionReason;
    }
    
    const document = await RiderDocument.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: `Document ${status === 'approved' ? 'verified' : 'rejected'} successfully`,
      data: document
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify document'
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/documents/:id
 * @desc Delete a document
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find document first to check permissions
    const document = await RiderDocument.findById(id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Ensure user can only delete their own documents unless admin
    if (req.user.id !== document.userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this document'
      });
    }
    
    // Delete document
    await RiderDocument.findByIdAndDelete(id);
    
    // In a production app, you'd also delete the associated file from storage
    
    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete document'
    });
  }
});

module.exports = router;
