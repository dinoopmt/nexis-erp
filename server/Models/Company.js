import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  id: {
    type: Number,
    default: 1,
  },
  companyName: {
    type: String,
    required: true,
  },
  registrationNumber: {
    type: String,
  },
  taxId: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email address'
    },
  },
  phone: {
    type: String,
    required: true,
  },
  website: {
    type: String,
  },
  logoUrl: {
    type: String,
  },
  industry: {
    type: String,
  },
  fiscalYearEnd: {
    type: String,
    default: '12-31',
  },
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
  },
  postalCode: {
    type: String,
  },
  country: {
    type: String,
    enum: ['AE', 'OM', 'IN'],
    default: 'AE',
    required: true,
  },
  taxType: {
    type: String,
    enum: ['VAT', 'GST', 'None'],
    default: 'VAT',
  },
  taxRate: {
    type: Number,
    default: 5.00,
    min: 0,
    max: 100,
  },
  currency: {
    type: String,
    enum: ['AED', 'OMR', 'INR', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'BHD'],
    default: 'AED',
  },
  decimalPlaces: {
    type: Number,
    enum: [0, 1, 2, 3, 4],
    default: 2,
    min: 0,
    max: 4,
  },
  costingMethod: {
    type: String,
    enum: ['FIFO', 'LIFO', 'WAC'],
    default: 'FIFO',
  },
}, {
  timestamps: true,
  collection: 'companies',
  toJSON: { getters: true },
  toObject: { getters: true },
});

// Auto-update timestamp is handled by timestamps: true in schema options
// No need for manual pre-hooks

const Company = mongoose.model('Company', companySchema);

export default Company;
