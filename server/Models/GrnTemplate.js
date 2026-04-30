import mongoose from 'mongoose';

const GrnTemplateSchema = new mongoose.Schema(
  {
    // Template Identification
    templateName: {
      type: String,
      required: true,
      unique: true,
      example: 'GRN_Standard_EN'
    },
    
    // Language & Type
    language: {
      type: String,
      enum: ['EN', 'AR'],
      required: true
    },
    
    templateType: {
      type: String,
      default: 'GRN'
    },
    
    includeLogo: {
      type: Boolean,
      default: true
    },
    
    // Custom Design Properties
    customDesign: {
      headerColor: {
        type: String,
        default: '#059669'
      },
      bodyFont: {
        type: String,
        default: 'Arial'
      },
      showSerialNumbers: {
        type: Boolean,
        default: true
      },
      showBatchInfo: {
        type: Boolean,
        default: true
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
    
    // Template CSS
    cssContent: {
      type: String,
      default: ''
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Metadata
    createdBy: {
      type: String,
      default: 'admin'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('GrnTemplate', GrnTemplateSchema);
