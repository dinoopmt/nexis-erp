import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  companyId: {
    type: Number,
    required: true,
    default: 1,
  },
  // System Settings
  dateFormat: {
    type: String,
    default: 'DD-MM-YYYY',
  },
  timeFormat: {
    type: String,
    enum: ['24', '12'],
    default: '24',
  },
  currency: {
    type: String,
    default: 'AED',
  },
  defaultLanguage: {
    type: String,
    default: 'English',
  },
  timezone: {
    type: String,
    default: 'Asia/Dubai',
  },
  // Features
  enableMultiCurrency: {
    type: Boolean,
    default: true,
  },
  enableMultipleWarehouses: {
    type: Boolean,
    default: true,
  },
  enableDiscounts: {
    type: Boolean,
    default: true,
  },
  enableTaxes: {
    type: Boolean,
    default: true,
  },
  enableNegativeStock: {
    type: Boolean,
    default: false,
  },
  // Email Settings
  emailProvider: {
    type: String,
    default: 'smtp',
  },
  smtpHost: {
    type: String,
  },
  smtpPort: {
    type: Number,
    default: 587,
  },
  smtpUsername: {
    type: String,
  },
  smtpPassword: {
    type: String,
  },
  smtpFromEmail: {
    type: String,
  },
  // Invoice Settings
  invoicePrefix: {
    type: String,
    default: 'INV',
  },
  invoiceStartNumber: {
    type: Number,
    default: 1000,
  },
  enableInvoiceSignature: {
    type: Boolean,
    default: true,
  },
  enableInvoiceTerms: {
    type: Boolean,
    default: true,
  },
  // Backup Settings
  enableAutoBackup: {
    type: Boolean,
    default: true,
  },
  backupFrequency: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily',
  },
  backupTime: {
    type: String,
    default: '02:00',
  },
  // Localization
  companyNameDisplay: {
    type: Boolean,
    default: true,
  },
  showTaxId: {
    type: Boolean,
    default: true,
  },
  showRegistrationNumber: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  collection: 'system_settings',
});

// Auto-update timestamp is handled by timestamps: true in schema options

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
