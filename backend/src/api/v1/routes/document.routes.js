const express = require('express');
const { authenticate, hasRole } = require('../middlewares/auth.middleware');
const {
  getUploadUrl,
  uploadDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  reviewDocument,
  checkDocumentExpiration
} = require('../controllers/document.controller');

const router = express.Router();

// Public upload URL endpoint - for generating pre-signed S3 URLs
router.get('/upload-url', authenticate, getUploadUrl);

// Document management endpoints
router.get('/', authenticate, getDocuments);
router.post('/', authenticate, uploadDocument);
router.get('/:id', authenticate, getDocument);
router.delete('/:id', authenticate, deleteDocument);

// Admin routes - require admin authentication
router.put('/:id/review', authenticate, hasRole(['admin']), reviewDocument);
router.get('/check-expiration', authenticate, hasRole(['admin']), checkDocumentExpiration);

module.exports = router;
