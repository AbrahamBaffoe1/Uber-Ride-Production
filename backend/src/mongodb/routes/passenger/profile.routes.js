import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { hasAnyRole } from '../../middlewares/role.middleware.js';
import multer from 'multer';
import path from 'path';

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/profiles/',
    filename: (req, file, cb) => {
      cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export default function(connection) {
  const router = express.Router();
  
  const User = connection.model('User');

  /**
   * @route PUT /api/v1/passenger/profile/update
   * @desc Update passenger profile
   * @access Private - Passengers only
   */
  router.put('/update', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const allowedUpdates = [
        'name',
        'email',
        'dateOfBirth',
        'gender',
        'emergencyContact',
        'preferredLanguage',
        'accessibility'
      ];
      
      const updates = {};
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });
      
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route POST /api/v1/passenger/profile/photo
   * @desc Upload profile photo
   * @access Private - Passengers only
   */
  router.post('/photo', authenticate, hasAnyRole(['passenger']), upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No photo uploaded'
        });
      }
      
      const photoUrl = `/uploads/profiles/${req.file.filename}`;
      
      await User.findByIdAndUpdate(req.user.id, {
        profilePicture: photoUrl
      });
      
      res.json({
        success: true,
        data: { photoUrl }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route PUT /api/v1/passenger/profile/preferences
   * @desc Update passenger preferences
   * @access Private - Passengers only
   */
  router.put('/preferences', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const {
        notifications,
        accessibility,
        privacy,
        ridePreferences
      } = req.body;
      
      const updates = {
        'passengerProfile.preferences': {
          notifications: {
            push: notifications?.push ?? true,
            email: notifications?.email ?? true,
            sms: notifications?.sms ?? true,
            promotions: notifications?.promotions ?? false
          },
          accessibility: {
            wheelchairAccess: accessibility?.wheelchairAccess ?? false,
            visualAids: accessibility?.visualAids ?? false,
            hearingAids: accessibility?.hearingAids ?? false
          },
          privacy: {
            shareLocation: privacy?.shareLocation ?? true,
            shareTripsWithContacts: privacy?.shareTripsWithContacts ?? false
          },
          ridePreferences: {
            musicPreference: ridePreferences?.musicPreference ?? 'no_preference',
            temperaturePreference: ridePreferences?.temperaturePreference ?? 'moderate',
            conversationPreference: ridePreferences?.conversationPreference ?? 'no_preference'
          }
        }
      };
      
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updates },
        { new: true }
      );
      
      res.json({
        success: true,
        data: user.passengerProfile.preferences
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route DELETE /api/v1/passenger/profile/delete
   * @desc Delete passenger account
   * @access Private - Passengers only
   */
  router.delete('/delete', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const { password, reason } = req.body;
      
      // Verify password
      const user = await User.findById(req.user.id);
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }
      
      // Soft delete - mark as deleted but keep data for records
      await User.findByIdAndUpdate(req.user.id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletionReason: reason
      });
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  return router;
}
