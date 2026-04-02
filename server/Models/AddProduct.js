import mongoose from "mongoose";

const packingUnitSchema = new mongoose.Schema({
  name: { type: String, required: true }, // "Single", "Outer", "Carton", etc.
  barcode: { type: String, required: true, unique: true, sparse: true, trim: true, uppercase: true },
  additionalBarcodes: [{ type: String, trim: true, uppercase: true }], // ✅ Additional barcodes for this unit (multiple barcodes support)
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'UnitType' }, // ✅ Store unit type reference
  factor: { type: Number, default: 1 }, // ✅ Conversion factor for this unit
  cost: { type: Number, default: 0 }, // ✅ Cost for this unit variant
  costIncludeVat: { type: Number, default: 0 }, // ✅ Cost with tax included (cost+vat)
  margin: { type: Number, default: 0 }, // ✅ Margin percentage for this unit (margin%)
  marginAmount: { type: Number, default: 0 }, // ✅ Margin amount for this unit
  price: { 
    type: Number, 
    required: true
  },
  finalPrice: { 
    type: Number,
    description: "Final price including tax (pre-calculated for performance)"
  },
  taxAmount: { type: Number, default: 0 }, // ✅ Tax amount for this unit
  taxInPrice: { type: Boolean, default: false }, // ✅ Whether price includes tax (price include/exclude)
  conversionFactor: { type: Number, required: true, min: 1 }, // How many of previous unit
  _id: false
}, { _id: false });

const productSchema = new mongoose.Schema({
  itemcode: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    description: "Product name"
  },
  hsn: { 
    type: String,
    trim: true,
    uppercase: true
  },
  hsnReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HSNMaster',
    default: null
  },
  gstRate: {
    type: Number,
    default: null
  },
  shortName: { type: String, trim: true },
  localName: { type: String, trim: true },
  // Country isolation: Link product to specific country (NOT international product)
  country: {
    type: String,
    enum: ['AE', 'OM', 'IN'],
    required: false,
    index: true,
    description: "Country where product is sold - enforces individual country operations (ISO country codes: AE=UAE, OM=Oman, IN=India)"
  },
  minStock: {
    type: Number,
    default: 0,
    description: "Minimum stock level - alert when below this"
  },
  maxStock: {
    type: Number,
    default: 1000,
    description: "Maximum stock to maintain"
  },
  reorderQuantity: {
    type: Number,
    default: 100,
    description: "Standard quantity to order when stock is low"
  },
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Grouping',
    required: true
  },
  groupingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Grouping',
    required: false
  },
  vendor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor',
    required: true 
  },
  unitType: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UnitType',
    required: true,
    description: "Reference to UnitType master"
  },
  unitSymbol: {
    type: String,
    trim: true,
    description: "Unit symbol (e.g., KG, PC) - cached from UnitType"
  },
  unitDecimal: {
    type: Number,
    default: 2,
    description: "Decimal places for this unit - cached from UnitType"
  },
  factor: { type: Number, required: true }, // Conversion factor or quantity
  cost: { 
    type: Number, 
    required: true
  },
  costIncludeVat: { 
    type: Number
  },
  marginPercent: { type: Number, default: 0 },
  marginAmount: { 
    type: Number
  },
  taxType: { type: String, trim: true }, // e.g., "VAT", "GST", "Sales Tax", etc.
  taxPercent: { type: Number, default: 0 }, // Tax percentage
  taxAmount: { 
    type: Number,
    default: 0
  },
  taxInPrice: {
    type: Boolean,
    default: false,
    description: "Whether price includes tax (true) or excludes tax (false)"
  },
  price: { 
    type: Number, 
    required: true
  },
  finalPrice: { 
    type: Number,
    description: "Final price including tax (pre-calculated for performance)"
  },
  barcode: { 
    type: String,
    unique: true, 
    required: true,
    trim: true,
    uppercase: true
  },
  stock: { type: Number, required: true },
  category: { type: String, default: null },
  
  // Packing units (multiple prices and barcodes for different packaging levels)
  packingUnits: [packingUnitSchema],

  // Pricing Levels (5-tier pricing: Level 1=Retail, 2=Wholesale A, 3=Wholesale B, 4=Corporate, 5=Distributor)
  // Structure: { 0: {level1, level2, level3, level4, level5}, 1: {...}, ... }
  // Key = pricing line index, Value = {level1, level2, level3, level4, level5} prices
  pricingLevels: {
    type: Map,
    of: new mongoose.Schema({
      level1: {
        type: Number,
        default: null,
        description: "Retail pricing level"
      },
      level2: {
        type: Number,
        default: null,
        description: "Wholesale A pricing level"
      },
      level3: {
        type: Number,
        default: null,
        description: "Wholesale B pricing level"
      },
      level4: {
        type: Number,
        default: null,
        description: "Corporate pricing level"
      },
      level5: {
        type: Number,
        default: null,
        description: "Distributor pricing level"
      }
    }, { _id: false }),
    default: new Map(),
    description: "Pricing tiers per unit type for different customer segments"
  },

  // Expiry Tracking
  trackExpiry: {
    type: Boolean,
    default: false,
    description: "Enable product expiry tracking"
  },
  manufacturingDate: {
    type: Date,
    default: null,
    description: "Product manufacturing/production date"
  },
  expiryDate: {
    type: Date,
    default: null,
    description: "Product expiration date"
  },
  shelfLifeDays: {
    type: Number,
    default: null,
    description: "Shelf life in days (calculated from mfg to expiry)"
  },
  expiryAlertDays: {
    type: Number,
    default: 30,
    description: "Alert when product expires within X days"
  },

  // ✅ Additional Product Features
  openingPrice: {
    type: Number,
    default: 0,
    description: "Opening/starting price for negotiations"
  },
  allowOpenPrice: {
    type: Boolean,
    default: false,
    description: "Allow flexible/open pricing at POS"
  },
  enablePromotion: {
    type: Boolean,
    default: false,
    description: "Allow promotional discounts for this product"
  },
  fastMovingItem: {
    type: Boolean,
    default: false,
    description: "Mark product as fast-moving for inventory management"
  },
  isScaleItem: {
    type: Boolean,
    default: false,
    description: "Product weight tracked by scale (for POS)"
  },
  scaleUnitType: {
    type: String,
    enum: ['Weight', 'Quantity', ''],
    default: '',
    description: "Unit of measure for scale item (Weight or Quantity) - required when isScaleItem is true"
  },
  itemHold: {
    type: Boolean,
    default: false,
    description: "Hold/suspend purchase of this product"
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grouping',
    default: null,
    description: "Reference to brand (if using brand hierarchy)"
  },
  
  image: {
    type: String,
    default: null,
    description: "Product image stored as base64 (auto-resized to max 2048x2048)"
  },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  
  createdBy: { 
    type: String, 
    default: "System",
    description: "Username of user who created the product"
  },
  updatedBy: { 
    type: String, 
    default: "System",
    description: "Username of user who last updated the product"
  },

  updateDate: { type: Date, default: Date.now },
  createdate: { type: Date, default: Date.now },

}, {
  toJSON: { getters: true },
  toObject: { getters: true },
  collection: 'products'
});
productSchema.index({ isDeleted: 1 });  // Index for soft delete queries
productSchema.index({ isDeleted: 1, barcode: 1 });  // Composite index for existence checks
productSchema.index({ categoryId: 1 });  // Index for category queries
productSchema.index({ groupingId: 1 });  // Index for grouping queries
productSchema.index({ hsnReference: 1 });  // Index for HSN lookup

// Middleware to attach GST rate from HSN when hsnReference is set
productSchema.post('findOne', async function(doc) {
  if (doc && doc.hsnReference) {
    try {
      const hsnDoc = await mongoose.model('HSNMaster').findById(doc.hsnReference);
      if (hsnDoc && !doc.gstRate) {
        doc.gstRate = hsnDoc.gstRate;
      }
    } catch (err) {
      // Silent fail - don't break the query
      console.error('Error fetching HSN details:', err.message);
    }
  }
});

productSchema.post('find', async function(docs) {
  if (Array.isArray(docs)) {
    try {
      const HSNMaster = mongoose.model('HSNMaster');
      await Promise.all(
        docs.map(async (doc) => {
          if (doc && doc.hsnReference) {
            const hsnDoc = await HSNMaster.findById(doc.hsnReference);
            if (hsnDoc && !doc.gstRate) {
              doc.gstRate = hsnDoc.gstRate;
            }
          }
        })
      );
    } catch (err) {
      console.error('Error fetching HSN details for multiple documents:', err.message);
    }
  }
});

export default mongoose.model("Product", productSchema);
