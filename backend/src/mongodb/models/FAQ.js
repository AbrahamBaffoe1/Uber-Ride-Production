import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'payment', 'safety', 'rides', 'account', 'technical'],
    required: true
  },
  tags: [{
    type: String
  }],
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpful: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 }
  },
  relatedFAQs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FAQ'
  }]
}, {
  timestamps: true
});

// Indexes
faqSchema.index({ category: 1, active: 1 });
faqSchema.index({ tags: 1 });
faqSchema.index({ question: 'text', answer: 'text' });

export default faqSchema;
