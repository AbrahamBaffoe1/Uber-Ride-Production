import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['payment', 'ride', 'safety', 'technical', 'account', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  attachments: [{
    url: String,
    type: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    senderType: {
      type: String,
      enum: ['user', 'support'],
      required: true
    },
    message: String,
    attachments: [{
      url: String,
      type: String
    }],
    sentAt: { type: Date, default: Date.now }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },
  resolvedAt: Date,
  closedAt: Date,
  satisfaction: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String
  }
}, {
  timestamps: true
});

// Generate unique ticket number
supportTicketSchema.pre('save', async function(next) {
  if (!this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TKT-${Date.now()}-${count + 1}`;
  }
  next();
});

// Indexes
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ category: 1, status: 1 });

export default supportTicketSchema;
