import mongoose from 'mongoose';

const InvoiceTemplateSchema = new mongoose.Schema(
  {
    // Template Identification
    templateName: {
      type: String,
      required: true,
      unique: true,
      example: 'Invoice_EN_with_Logo'
    },
    
    // Language & Customization
    language: {
      type: String,
      enum: ['EN', 'AR'],
      required: true
    },
    
    templateType: {
      type: String,
      enum: ['INVOICE', 'GRN', 'RTV', 'DELIVERY_NOTE', 'QUOTATION', 'SALES_ORDER', 'SALES_RETURN'],
      default: 'INVOICE'
    },
    
    includeLogo: {
      type: Boolean,
      default: true
    },
    
    // Custom Design Properties
    customDesign: {
      headerColor: {
        type: String,
        default: '#1e40af'
      },
      bodyFont: {
        type: String,
        default: 'Arial'
      },
      showSerialNumbers: {
        type: Boolean,
        default: true
      },
      showQrCode: {
        type: Boolean,
        default: false
      },
      showBarcode: {
        type: Boolean,
        default: false
      },
      currency: {
        type: String,
        default: 'AED'
      },
      pageSize: {
        type: String,
        enum: ['A4', 'A5', 'LETTER'],
        default: 'A4'
      },
      margins: {
        top: { type: Number, default: 10 },
        bottom: { type: Number, default: 10 },
        left: { type: Number, default: 10 },
        right: { type: Number, default: 10 }
      }
    },
    
    // HTML Template Content (with Handlebars syntax)
    htmlContent: {
      type: String,
      required: true
    },
    
    // Template CSS (optional styling)
    cssContent: {
      type: String,
      default: `
        body { 
          font-family: Arial, sans-serif; 
          margin: 0;
          padding: 20px;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { max-width: 150px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; }
      `
    },
    
    // Company & Metadata
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanySettings'
    },
    
    description: {
      type: String,
      default: ''
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    isDefault: {
      type: Boolean,
      default: false
    },
    
    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    createdAt: {
      type: Date,
      default: Date.now
    },
    
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for quick lookups
InvoiceTemplateSchema.index({ language: 1, templateType: 1, includeLogo: 1 });
InvoiceTemplateSchema.index({ isActive: 1, isDefault: 1 });

export default mongoose.model('InvoiceTemplate', InvoiceTemplateSchema);
