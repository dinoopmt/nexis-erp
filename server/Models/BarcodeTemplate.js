import mongoose from 'mongoose';

const BarcodeTemplateSchema = new mongoose.Schema(
  {
    // Template Identification
    templateName: {
      type: String,
      required: true,
      unique: true,
      example: 'BARCODE_DEFAULT_WITHOUT_PRICE'
    },
    
    // Legacy compatibility
    name: {
      type: String,
      example: 'BARCODE_DEFAULT_WITHOUT_PRICE'
    },
    
    legends: {
      type: String,
      example: 'BARCODE_DEFAULT_WITHOUT_PRICE'
    },
    
    // Barcode Configuration - ZPLII/CPCL printer commands
    configTxt: {
      type: String,
      required: true,
      example: `SIZE 38 mm, 25 mm
DIRECTION 1
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET TEAR ON
CLS
CODEBARCODE 50,120,"128",50,2,0,2,2,"{BARCODE}"
PRINT 1,{LABEL_QUANTITY}`
    },
    
    // Description
    description: {
      type: String,
      default: ''
    },
    
    // Company & Metadata
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanySettings'
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    
    isDefault: {
      type: Boolean,
      default: false
    },
    
    // Soft Delete
    deleted: {
      type: Boolean,
      default: false
    },
    
    // Tracking - User references
    createdBy: {
      type: String,
      example: 'dinu'
    },
    
    updatedBy: {
      type: String,
      example: 'dinu'
    },
    
    // Timestamps
    createdDate: {
      type: Date,
      default: Date.now
    },
    
    updateDate: {
      type: Date,
      default: Date.now
    },
    
    // System metadata (for MongoDB compatibility)
    intVersion: {
      type: Number,
      default: 0
    },
    
    classVersion: {
      type: Number,
      default: 0
    },
    
    hash: {
      type: String
    }
  },
  { 
    timestamps: false,
    collection: 'barcode_templates'
  }
);

// Index for quick lookups
BarcodeTemplateSchema.index({ templateName: 1 });
BarcodeTemplateSchema.index({ companyId: 1, deleted: 1 });
BarcodeTemplateSchema.index({ isDefault: 1, companyId: 1 });

// Create model
const BarcodeTemplate = mongoose.model('BarcodeTemplate', BarcodeTemplateSchema);

export default BarcodeTemplate;
