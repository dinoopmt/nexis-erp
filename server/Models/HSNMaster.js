import mongoose from 'mongoose';

const hsnMasterSchema = new mongoose.Schema(
  {
    // HSN Code (Primary identifier)
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v) {
          return /^\d{6}$/.test(v);
        },
        message: 'HSN code must be exactly 6 digits'
      }
    },

    // HSN Structure
    chapter: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      description: 'Chapter number (first 2 digits)'
    },

    heading: {
      type: Number,
      required: true,
      min: 0,
      max: 99,
      description: 'Heading number (3rd & 4th digits)'
    },

    subHeading: {
      type: Number,
      required: true,
      min: 0,
      max: 99,
      description: 'Sub-heading number (5th & 6th digits)'
    },

    // Description
    description: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true,
      enum: [
        'Animal Products',
        'Vegetable Products',
        'Foodstuffs',
        'Mineral Products',
        'Chemicals',
        'Plastics & Rubber',
        'Hides & Skins',
        'Wood & Wood Products',
        'Textiles',
        'Footwear',
        'Stone & Glass',
        'Metals',
        'Machinery',
        'Electrical',
        'Vehicles',
        'Optical Instruments',
        'Miscellaneous'
      ]
    },

    // Tax Information
    gstRate: {
      type: Number,
      required: true,
      enum: [0, 5, 12, 18, 28],
      description: 'GST rate percentage (India)'
    },

    hsnChapterDescription: {
      type: String,
      description: 'Official chapter name from GST schedule'
    },

    // Status & Validity
    isActive: {
      type: Boolean,
      default: true,
      description: 'Whether HSN is currently valid'
    },

    applicableFrom: {
      type: Date,
      default: new Date('2017-07-01'),
      description: 'Date when this HSN became effective'
    },

    repealed: {
      type: Boolean,
      default: false,
      description: 'Whether HSN has been repealed/superseded'
    },

    repealedDate: {
      type: Date,
      description: 'Date when HSN was repealed'
    },

    replacementHSN: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{6}$/.test(v);
        },
        message: 'Replacement HSN must be 6 digits'
      },
      description: 'If repealed, which HSN replaces it'
    },

    // Additional Info
    applicableTo: {
      type: [String],
      default: ['IN'],
      enum: ['IN', 'AE', 'OM'],
      description: 'Countries where this HSN applies'
    },

    remarks: {
      type: String,
      trim: true,
      description: 'Additional notes about this HSN'
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
  },
  {
    timestamps: true,
    collection: 'hsn_master',
    indexes: [
      { code: 1 },              // Quick lookup by code
      { category: 1 },          // Filter by category
      { gstRate: 1 },          // Filter by tax rate
      { isActive: 1 },         // Get active codes
      { chapter: 1 }           // Filter by chapter
    ]
  }
);

// Index for text search on description
hsnMasterSchema.index({ description: 'text' });

// Virtual: Full HSN structure display
hsnMasterSchema.virtual('hsnStructure').get(function() {
  return {
    code: this.code,
    chapter: this.chapter.toString().padStart(2, '0'),
    heading: this.heading.toString().padStart(2, '0'),
    subHeading: this.subHeading.toString().padStart(2, '0')
  };
});

// Pre-save: Validate chapter, heading, subheading match code
hsnMasterSchema.pre('save', function(next) {
  if (this.code) {
    const ch = parseInt(this.code.substring(0, 2));
    const hd = parseInt(this.code.substring(2, 4));
    const sh = parseInt(this.code.substring(4, 6));
    
    if (this.chapter !== ch || this.heading !== hd || this.subHeading !== sh) {
      return next(new Error('HSN code digits must match chapter/heading/sub-heading'));
    }
  }
  next();
});

// Method: Check if HSN is valid for use
hsnMasterSchema.methods.isValidForUse = function() {
  if (!this.isActive) return false;
  if (this.repealed) return false;
  return true;
};

// Method: Get replacement if repealed
hsnMasterSchema.methods.getActiveReplacement = function() {
  if (!this.repealed || !this.replacementHSN) {
    return null;
  }
  return this.constructor.findOne({ code: this.replacementHSN });
};

// Static: Find by code
hsnMasterSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toString().padStart(6, '0').toUpperCase() });
};

// Static: Find by category
hsnMasterSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Static: Search by description
hsnMasterSchema.statics.searchByDescription = function(query) {
  return this.find({ $text: { $search: query }, isActive: true });
};

// Static: Get all active HSN codes
hsnMasterSchema.statics.getActiveHSN = function() {
  return this.find({ isActive: true, repealed: false });
};

// Prevent direct instantiation of stale records
hsnMasterSchema.query.active = function() {
  return this.where({ isActive: true, repealed: false });
};

const HSNMaster = mongoose.models.HSNMaster || mongoose.model('HSNMaster', hsnMasterSchema);

export default HSNMaster;
