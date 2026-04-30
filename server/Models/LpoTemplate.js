import mongoose from 'mongoose';

const LpoTemplateSchema = new mongoose.Schema(
  {
    // Template Identification
    templateName: {
      type: String,
      required: true,
      unique: true,
      example: 'LPO_Standard_EN'
    },
    
    // Language & Type
    language: {
      type: String,
      enum: ['EN', 'AR'],
      required: true
    },
    
    templateType: {
      type: String,
      default: 'LPO'
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

export default mongoose.model('LpoTemplate', LpoTemplateSchema);
