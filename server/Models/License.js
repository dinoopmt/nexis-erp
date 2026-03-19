import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  licenseKey: {
    type: String,
    required: true,
    unique: true,
  },
  companyId: {
    type: Number,
    required: true,
  },
  licensePlan: {
    type: String,
    enum: ['Starter', 'Professional', 'Enterprise'],
    default: 'Professional',
  },
  companyName: {
    type: String,
  },
  issuedDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  maxUsers: {
    type: Number,
    default: 50,
  },
  maxProducts: {
    type: Number,
    default: 10000,
  },
  maxInvoices: {
    type: String,
    default: 'Unlimited',
  },
  maxReports: {
    type: String,
    default: 'Unlimited',
  },
  features: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      invoicing: true,
      inventory: true,
      accounting: true,
      sales: true,
      multiCurrency: true,
      advancedReports: true,
      customization: true,
      support: true,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  collection: 'licenses',
});

// Auto-update timestamp is handled by timestamps: true in schema options

const License = mongoose.model('License', licenseSchema);

export default License;
