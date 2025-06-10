/**
 * Safety Routes for MongoDB
 * Handles safety and emergency-related API endpoints
 */
import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import mongoose from 'mongoose';
const { ObjectId } = mongoose.Types;
import User from '../models/User.js';

const router = express.Router();

/**
 * @route POST /api/v1/mongo/safety/sos
 * @desc Trigger an SOS alert
 * @access Private
 */
router.post('/sos', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { location, situation, rideId } = req.body;
    
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Location is required for SOS alerts'
      });
    }
    
    // Create SOS alert in database
    const sosCollection = mongoose.connection.collection('sos_alerts');
    
    const sosAlert = {
      _id: new ObjectId(),
      userId: ObjectId(userId),
      userRole: req.user.role,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      situation: situation || 'Emergency assistance needed',
      rideId: rideId ? ObjectId(rideId) : null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await sosCollection.insertOne(sosAlert);
    
    // Retrieve user details for notification purposes
    const user = await User.findById(userId).select('firstName lastName phoneNumber email role');
    
    // Simulate sending notifications to emergency contacts and support team
    console.log(`🚨 SOS ALERT: User ${user.firstName} ${user.lastName} (${user.role}) has triggered an emergency alert.`);
    
    // Get user's emergency contacts
    const emergencyContactsCollection = mongoose.connection.collection('emergency_contacts');
    const emergencyContacts = await emergencyContactsCollection.find({
      userId: ObjectId(userId)
    }).toArray();
    
    // Log notification (in production, actually send SMS/notifications)
    emergencyContacts.forEach(contact => {
      console.log(`Notifying emergency contact: ${contact.name} at ${contact.phoneNumber}`);
    });
    
    // Return success with SOS ID for tracking
    return res.status(200).json({
      status: 'success',
      message: 'SOS alert triggered successfully. Help is on the way.',
      data: {
        sosId: sosAlert._id.toString(),
        createdAt: sosAlert.createdAt
      }
    });
  } catch (error) {
    console.error('Error triggering SOS alert:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to trigger SOS alert',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/safety/sos/active
 * @desc Get user's active SOS alerts
 * @access Private
 */
router.get('/sos/active', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Retrieve active SOS alerts for the user
    const sosCollection = mongoose.connection.collection('sos_alerts');
    const activeAlerts = await sosCollection.find({
      userId: ObjectId(userId),
      status: 'active'
    }).toArray();
    
    return res.status(200).json({
      status: 'success',
      data: {
        alerts: activeAlerts.map(alert => ({
          id: alert._id.toString(),
          situation: alert.situation,
          location: {
            latitude: alert.location.coordinates[1],
            longitude: alert.location.coordinates[0]
          },
          rideId: alert.rideId ? alert.rideId.toString() : null,
          createdAt: alert.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching active SOS alerts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch active SOS alerts',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/safety/sos/:sosId/cancel
 * @desc Cancel an active SOS alert
 * @access Private
 */
router.put('/sos/:sosId/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { sosId } = req.params;
    const { reason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(sosId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid SOS alert ID'
      });
    }
    
    // Update SOS alert status
    const sosCollection = mongoose.connection.collection('sos_alerts');
    const result = await sosCollection.updateOne(
      {
        _id: ObjectId(sosId),
        userId: ObjectId(userId),
        status: 'active'
      },
      {
        $set: {
          status: 'cancelled',
          cancelReason: reason || 'Cancelled by user',
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Active SOS alert not found or not authorized to cancel'
      });
    }
    
    // Log notification (in production, actually send SMS/notifications)
    console.log(`SOS alert ${sosId} has been cancelled by user ${userId}`);
    
    return res.status(200).json({
      status: 'success',
      message: 'SOS alert cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling SOS alert:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to cancel SOS alert',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/safety/emergency-contacts
 * @desc Get user's emergency contacts
 * @access Private
 */
router.get('/emergency-contacts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Retrieve emergency contacts
    const emergencyContactsCollection = mongoose.connection.collection('emergency_contacts');
    const contacts = await emergencyContactsCollection.find({
      userId: ObjectId(userId)
    }).toArray();
    
    return res.status(200).json({
      status: 'success',
      data: {
        contacts: contacts.map(contact => ({
          id: contact._id.toString(),
          name: contact.name,
          relationship: contact.relationship,
          phoneNumber: contact.phoneNumber,
          email: contact.email || null,
          isPrimary: contact.isPrimary || false,
          createdAt: contact.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch emergency contacts',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/safety/emergency-contacts
 * @desc Add a new emergency contact
 * @access Private
 */
router.post('/emergency-contacts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { name, relationship, phoneNumber, email, isPrimary } = req.body;
    
    // Validate required fields
    if (!name || !relationship || !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, relationship, and phone number are required'
      });
    }
    
    // Check if we already have a contact with this phone number
    const emergencyContactsCollection = mongoose.connection.collection('emergency_contacts');
    const existingContact = await emergencyContactsCollection.findOne({
      userId: ObjectId(userId),
      phoneNumber
    });
    
    if (existingContact) {
      return res.status(409).json({
        status: 'error',
        message: 'A contact with this phone number already exists'
      });
    }
    
    // If this is marked as primary, update other contacts to not be primary
    if (isPrimary) {
      await emergencyContactsCollection.updateMany(
        { userId: ObjectId(userId) },
        { $set: { isPrimary: false } }
      );
    }
    
    // Create new emergency contact
    const newContact = {
      _id: new ObjectId(),
      userId: ObjectId(userId),
      name,
      relationship,
      phoneNumber,
      email: email || null,
      isPrimary: isPrimary || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await emergencyContactsCollection.insertOne(newContact);
    
    return res.status(201).json({
      status: 'success',
      message: 'Emergency contact added successfully',
      data: {
        contact: {
          id: newContact._id.toString(),
          name: newContact.name,
          relationship: newContact.relationship,
          phoneNumber: newContact.phoneNumber,
          email: newContact.email,
          isPrimary: newContact.isPrimary,
          createdAt: newContact.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Error adding emergency contact:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to add emergency contact',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/v1/mongo/safety/emergency-contacts/:contactId
 * @desc Update an emergency contact
 * @access Private
 */
router.put('/emergency-contacts/:contactId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { contactId } = req.params;
    const { name, relationship, phoneNumber, email, isPrimary } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid contact ID'
      });
    }
    
    // Check if contact exists and belongs to user
    const emergencyContactsCollection = mongoose.connection.collection('emergency_contacts');
    const existingContact = await emergencyContactsCollection.findOne({
      _id: ObjectId(contactId),
      userId: ObjectId(userId)
    });
    
    if (!existingContact) {
      return res.status(404).json({
        status: 'error',
        message: 'Emergency contact not found or not authorized to update'
      });
    }
    
    // Check if phone number is already used by another contact
    if (phoneNumber && phoneNumber !== existingContact.phoneNumber) {
      const duplicateContact = await emergencyContactsCollection.findOne({
        userId: ObjectId(userId),
        phoneNumber,
        _id: { $ne: ObjectId(contactId) }
      });
      
      if (duplicateContact) {
        return res.status(409).json({
          status: 'error',
          message: 'Another contact with this phone number already exists'
        });
      }
    }
    
    // If this is marked as primary, update other contacts to not be primary
    if (isPrimary) {
      await emergencyContactsCollection.updateMany(
        { 
          userId: ObjectId(userId),
          _id: { $ne: ObjectId(contactId) }
        },
        { $set: { isPrimary: false } }
      );
    }
    
    // Update contact
    const updateData = {
      ...(name && { name }),
      ...(relationship && { relationship }),
      ...(phoneNumber && { phoneNumber }),
      ...(email !== undefined && { email }),
      ...(isPrimary !== undefined && { isPrimary }),
      updatedAt: new Date()
    };
    
    await emergencyContactsCollection.updateOne(
      { _id: ObjectId(contactId) },
      { $set: updateData }
    );
    
    // Fetch updated contact
    const updatedContact = await emergencyContactsCollection.findOne({
      _id: ObjectId(contactId)
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Emergency contact updated successfully',
      data: {
        contact: {
          id: updatedContact._id.toString(),
          name: updatedContact.name,
          relationship: updatedContact.relationship,
          phoneNumber: updatedContact.phoneNumber,
          email: updatedContact.email,
          isPrimary: updatedContact.isPrimary,
          updatedAt: updatedContact.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update emergency contact',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/v1/mongo/safety/emergency-contacts/:contactId
 * @desc Delete an emergency contact
 * @access Private
 */
router.delete('/emergency-contacts/:contactId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { contactId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid contact ID'
      });
    }
    
    // Delete contact
    const emergencyContactsCollection = mongoose.connection.collection('emergency_contacts');
    const result = await emergencyContactsCollection.deleteOne({
      _id: ObjectId(contactId),
      userId: ObjectId(userId)
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Emergency contact not found or not authorized to delete'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete emergency contact',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/mongo/safety/report-incident
 * @desc Report a safety incident
 * @access Private
 */
router.post('/report-incident', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { type, description, location, rideId, media } = req.body;
    
    if (!type || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Incident type and description are required'
      });
    }
    
    // Create incident report
    const incidentsCollection = mongoose.connection.collection('safety_incidents');
    
    const incident = {
      _id: new ObjectId(),
      userId: ObjectId(userId),
      userRole: req.user.role,
      type,
      description,
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      } : null,
      rideId: rideId ? ObjectId(rideId) : null,
      media: media || [],
      status: 'reported',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await incidentsCollection.insertOne(incident);
    
    // Log notification (in production, notify safety team)
    console.log(`Safety incident reported by user ${userId}: ${type}`);
    
    return res.status(201).json({
      status: 'success',
      message: 'Incident reported successfully. Our safety team will review it shortly.',
      data: {
        incidentId: incident._id.toString(),
        createdAt: incident.createdAt
      }
    });
  } catch (error) {
    console.error('Error reporting safety incident:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to report safety incident',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/mongo/safety/incidents
 * @desc Get user's safety incidents
 * @access Private
 */
router.get('/incidents', authenticate, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Retrieve user's incidents
    const incidentsCollection = mongoose.connection.collection('safety_incidents');
    
    const incidents = await incidentsCollection.find({
      userId: ObjectId(userId)
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Count total incidents for pagination
    const totalIncidents = await incidentsCollection.countDocuments({
      userId: ObjectId(userId)
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(totalIncidents / limit);
    
    return res.status(200).json({
      status: 'success',
      data: {
        incidents: incidents.map(incident => ({
          id: incident._id.toString(),
          type: incident.type,
          description: incident.description,
          location: incident.location ? {
            latitude: incident.location.coordinates[1],
            longitude: incident.location.coordinates[0]
          } : null,
          status: incident.status,
          createdAt: incident.createdAt
        })),
        pagination: {
          totalItems: totalIncidents,
          totalPages,
          currentPage: page
        }
      }
    });
  } catch (error) {
    console.error('Error fetching safety incidents:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch safety incidents',
      error: error.message
    });
  }
});

export default router;
