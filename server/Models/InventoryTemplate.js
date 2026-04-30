/**
 * InventoryTemplate Model
 * Unified template for LPO, GRN, RTV documents
 * Replaces separate LpoTemplate, GrnTemplate, RtvTemplate collections
 */
import mongoose from 'mongoose';

const InventoryTemplateSchema = new mongoose.Schema(
  {
    // Template Identification
    templateName: {
      type: String,
      required: true,
      example: 'GRN_Standard_EN'
    },
    
    // Document Type: LPO | GRN | RTV
    documentType: {
      type: String,
      enum: ['LPO', 'GRN', 'RTV'],
      required: true,
      index: true
    },
    
    // Language & Region
    language: {
      type: String,
      enum: ['EN', 'AR'],
      default: 'EN',
      required: true
    },
    
    // Description
    description: {
      type: String,
      default: ''
    },
    
    includeLogo: {
      type: Boolean,
      default: true
    },
    
    // ✅ Custom Design Properties (merged from all types)
    customDesign: {
      // Colors
      headerColor: {
        type: String,
        default: function() {
          // Set default color based on document type
          const colorMap = { 'LPO': '#1e40af', 'GRN': '#059669', 'RTV': '#dc2626' };
          return colorMap[this.documentType] || '#1e40af';
        }
      },
      
      // Typography
      bodyFont: {
        type: String,
        enum: ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'],
        default: 'Arial'
      },
      
      // Page Settings
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
      },
      
      // ✅ Display Options (all document types)
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
      
      // GRN-specific
      showBatchInfo: {
        type: Boolean,
        default: true
      },
      showExpiryDates: {
        type: Boolean,
        default: true
      },
      
      // RTV-specific
      showReturnReason: {
        type: Boolean,
        default: true
      },
      showCreditNoteRef: {
        type: Boolean,
        default: true
      }
    },
    
    // ✅ HTML Template Content (Handlebars)
    htmlContent: {
      type: String,
      required: true,
      default: ''
    },
    
    // ✅ CSS Styling
    cssContent: {
      type: String,
      default: ''
    },
    
    // Status & Defaults
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    isDefault: {
      type: Boolean,
      default: false
    },
    
    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    // Company/Store scoping (optional)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null
    },
    
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// ✅ Index for finding default template by type + language
InventoryTemplateSchema.index({ documentType: 1, language: 1, isDefault: 1, isActive: 1 });

// ✅ Index for finding all active templates by type
InventoryTemplateSchema.index({ documentType: 1, isActive: 1, language: 1 });

// Pre-save: Ensure only one default per type/language
InventoryTemplateSchema.pre('save', async function(next) {
  if (this.isDefault && this.isActive) {
    try {
      await mongoose.model('InventoryTemplate').updateMany(
        {
          _id: { $ne: this._id },
          documentType: this.documentType,
          language: this.language,
          isDefault: true
        },
        { isDefault: false }
      );
    } catch (error) {
      console.error('Error updating default templates:', error);
    }
  }
  next();
});

const InventoryTemplate = mongoose.model('InventoryTemplate', InventoryTemplateSchema);

export default InventoryTemplate;
