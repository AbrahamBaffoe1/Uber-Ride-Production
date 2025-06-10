import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { hasAnyRole } from '../../middlewares/role.middleware.js';

export default function(connection) {
  const router = express.Router();
  
  const SupportTicket = connection.model('SupportTicket');
  const FAQ = connection.model('FAQ');

  /**
   * @route POST /api/v1/passenger/support/ticket
   * @desc Create a support ticket
   * @access Private - Passengers only
   */
  router.post('/ticket', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const { subject, category, description, attachments } = req.body;
      
      const ticket = new SupportTicket({
        userId: req.user.id,
        subject,
        category, // 'payment', 'ride', 'safety', 'technical', 'other'
        description,
        attachments,
        status: 'open',
        priority: 'normal'
      });
      
      await ticket.save();
      
      res.status(201).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route GET /api/v1/passenger/support/tickets
   * @desc Get user's support tickets
   * @access Private - Passengers only
   */
  router.get('/tickets', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const tickets = await SupportTicket.find({ userId: req.user.id })
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: tickets
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route GET /api/v1/passenger/support/faq
   * @desc Get FAQ list
   * @access Public
   */
  router.get('/faq', async (req, res) => {
    try {
      const faqs = await FAQ.find({ active: true })
        .sort({ order: 1 });
      
      res.json({
        success: true,
        data: faqs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * @route POST /api/v1/passenger/support/feedback
   * @desc Submit app feedback
   * @access Private - Passengers only
   */
  router.post('/feedback', authenticate, hasAnyRole(['passenger']), async (req, res) => {
    try {
      const { rating, category, message } = req.body;
      
      const feedback = {
        userId: req.user.id,
        rating,
        category, // 'bug', 'feature', 'complaint', 'compliment'
        message,
        platform: req.headers['user-agent']
      };
      
      // Store feedback in database
      // Could integrate with external feedback system
      
      res.json({
        success: true,
        message: 'Feedback submitted successfully'
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
