/**
 * Document Controller
 * Handles document uploads and management for rider verification
 */
const { v4: uuidv4 } = require('uuid');
const { RiderDocument, User, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const { emitNotification } = require('../../../services/socket.service');
const aws = require('aws-sdk');

// Configure AWS S3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'okada-documents';

/**
 * Generate a pre-signed URL for document upload
 * @route GET /api/v1/documents/upload-url
 * @access Private (Authenticated)
 */
exports.getUploadUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileName, documentType } = req.query;

    if (!fileName || !documentType) {
      return res.status(400).json({
        status: 'error',
        message: 'File name and document type are required'
      });
    }

    // Generate a unique key for the file
    const documentId = uuidv4();
    const fileKey = `documents/${userId}/${documentType}/${documentId}/${fileName}`;

    // Generate pre-signed URL for S3 upload
    const signedUrlExpireSeconds = 60 * 15; // URL expires in 15 minutes
    
    const url = s3.getSignedUrl('putObject', {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: signedUrlExpireSeconds,
      ContentType: 'image/jpeg', // Can be overridden by the client
      ACL: 'public-read',
    });

    // Return the URL and document ID
    return res.status(200).json({
      status: 'success',
      data: {
        uploadUrl: url,
        documentId,
        expires: new Date(Date.now() + signedUrlExpireSeconds * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return next(error);
  }
};

/**
 * Upload or update a document
 * @route POST /api/v1/documents
 * @access Private (Authenticated)
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id, type, name, documentUrl, expiryDate } = req.body;

    if (!type || !name || !documentUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Document type, name, and URL are required'
      });
    }

    // Create or update document record
    let document;
    
    if (id) {
      // Find existing document
      document = await RiderDocument.findOne({
        where: {
          id,
          userId
        }
      });

      if (!document) {
        return res.status(404).json({
          status: 'error',
          message: 'Document not found'
        });
      }

      // Update document
      await document.update({
        type,
        name,
        documentUrl,
        expiryDate: expiryDate || null,
        status: 'pending', // Reset status to pending for review
        dateSubmitted: new Date(),
        rejectionReason: null // Clear any previous rejection reason
      });
    } else {
      // Create new document
      document = await RiderDocument.create({
        id: uuidv4(),
        userId,
        type,
        name,
        documentUrl,
        expiryDate: expiryDate || null,
        status: 'pending',
        dateSubmitted: new Date()
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('document:updated', { document });
    }

    // Create notification for document submission
    await createDocumentNotification(userId, document, 'submitted');

    // Return the document
    return res.status(200).json({
      status: 'success',
      data: document
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return next(error);
  }
};

/**
 * Get all user documents
 * @route GET /api/v1/documents
 * @access Private (Authenticated)
 */
exports.getDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const documents = await RiderDocument.findAll({
      where: { userId },
      order: [['dateSubmitted', 'DESC']]
    });

    return res.status(200).json({
      status: 'success',
      data: documents
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    return next(error);
  }
};

/**
 * Get a specific document
 * @route GET /api/v1/documents/:id
 * @access Private (Authenticated)
 */
exports.getDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const document = await RiderDocument.findOne({
      where: {
        id,
        userId
      }
    });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: document
    });
  } catch (error) {
    console.error('Error getting document:', error);
    return next(error);
  }
};

/**
 * Delete a document
 * @route DELETE /api/v1/documents/:id
 * @access Private (Authenticated)
 */
exports.deleteDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const document = await RiderDocument.findOne({
      where: {
        id,
        userId
      }
    });

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Delete the document
    await document.destroy();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('document:deleted', { documentId: id });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return next(error);
  }
};

/**
 * Review a document (Admin only)
 * @route PUT /api/v1/documents/:id/review
 * @access Private (Admin)
 */
exports.reviewDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid status (approved/rejected) is required'
      });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required when rejecting a document'
      });
    }

    // Find the document
    const document = await RiderDocument.findByPk(id);

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Update document status
    await document.update({
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null
    });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${document.userId}`).emit('document:status_updated', {
        documentId: id,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null
      });
    }

    // Create notification for document review
    await createDocumentNotification(document.userId, document, status);

    return res.status(200).json({
      status: 'success',
      data: document
    });
  } catch (error) {
    console.error('Error reviewing document:', error);
    return next(error);
  }
};

/**
 * Create a notification for document events
 * @param {string} userId User ID
 * @param {Object} document Document object
 * @param {string} event Event type (submitted, approved, rejected)
 */
const createDocumentNotification = async (userId, document, event) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;

    let title, message, priority;

    switch (event) {
      case 'submitted':
        title = 'Document Submitted';
        message = `Your ${document.name} has been submitted for review.`;
        priority = 'medium';
        break;
      case 'approved':
        title = 'Document Approved';
        message = `Your ${document.name} has been approved.`;
        priority = 'medium';
        break;
      case 'rejected':
        title = 'Document Rejected';
        message = `Your ${document.name} has been rejected${document.rejectionReason ? `: ${document.rejectionReason}` : ''}.`;
        priority = 'high';
        break;
      default:
        return; // Unknown event type
    }

    // Create notification
    const notification = {
      type: `document_${event}`,
      title,
      message,
      data: {
        documentId: document.id,
        documentType: document.type,
        documentName: document.name
      },
      priority
    };

    // Emit notification
    await emitNotification(userId, notification);
  } catch (error) {
    console.error('Error creating document notification:', error);
  }
};

/**
 * Check for expired documents
 * @route GET /api/v1/documents/check-expiration
 * @access Private (Admin)
 */
exports.checkDocumentExpiration = async (req, res, next) => {
  try {
    const today = new Date();
    
    // Find documents that expire in 30 days or have already expired
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const expiringDocuments = await RiderDocument.findAll({
      where: {
        expiryDate: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.lte]: thirtyDaysFromNow }
          ]
        },
        status: 'approved'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber']
        }
      ]
    });
    
    // Update status of expired documents
    const expiredDocuments = expiringDocuments.filter(doc => 
      new Date(doc.expiryDate) <= today
    );
    
    const expiringSoonDocuments = expiringDocuments.filter(doc => 
      new Date(doc.expiryDate) > today && new Date(doc.expiryDate) <= thirtyDaysFromNow
    );
    
    // Mark expired documents as expired
    for (const doc of expiredDocuments) {
      await doc.update({ status: 'expired' });
      
      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${doc.userId}`).emit('document:status_updated', {
          documentId: doc.id,
          status: 'expired'
        });
      }
      
      // Create notification
      await createDocumentNotification(doc.userId, doc, 'expired');
    }
    
    // Notify users of soon-to-expire documents
    for (const doc of expiringSoonDocuments) {
      // Create notification for soon-to-expire document
      const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate) - today) / (1000 * 60 * 60 * 24));
      
      const notification = {
        type: 'document_expiring_soon',
        title: 'Document Expiring Soon',
        message: `Your ${doc.name} will expire in ${daysUntilExpiry} days. Please update it soon.`,
        data: {
          documentId: doc.id,
          documentType: doc.type,
          documentName: doc.name,
          expiryDate: doc.expiryDate,
          daysUntilExpiry
        },
        priority: daysUntilExpiry <= 7 ? 'high' : 'medium'
      };
      
      // Emit notification
      await emitNotification(doc.userId, notification);
    }
    
    return res.status(200).json({
      status: 'success',
      data: {
        expired: expiredDocuments.length,
        expiringSoon: expiringSoonDocuments.length
      }
    });
  } catch (error) {
    console.error('Error checking document expiration:', error);
    return next(error);
  }
};
