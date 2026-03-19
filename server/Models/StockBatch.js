import mongoose from 'mongoose';

const StockBatchSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddProduct',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    manufacturingDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    shelfLifeDays: {
      type: Number,
      default: null, // calculated from mfg to expiry date
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    usedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    batchStatus: {
      type: String,
      enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'CLOSED'],
      default: 'ACTIVE',
    },
    daysToExpiry: {
      type: Number,
      default: null, // calculated field
    },
    supplier: String,
    referenceNumber: String, // purchase invoice/order reference
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for quick expiry queries
StockBatchSchema.index({ productId: 1, expiryDate: 1 });
StockBatchSchema.index({ expiryDate: 1, batchStatus: 1 });

// Calculate days to expiry before saving
StockBatchSchema.pre('save', function (next) {
  if (this.manufacturingDate && this.expiryDate) {
    const mfgDate = new Date(this.manufacturingDate);
    const expDate = new Date(this.expiryDate);
    this.shelfLifeDays = Math.floor((expDate - mfgDate) / (1000 * 60 * 60 * 24));
  }

  const today = new Date();
  const expDate = new Date(this.expiryDate);
  this.daysToExpiry = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));

  // Update batch status based on expiry
  if (this.daysToExpiry < 0) {
    this.batchStatus = 'EXPIRED';
  } else if (this.daysToExpiry <= 30) {
    this.batchStatus = 'EXPIRING_SOON';
  } else if (this.quantity - this.usedQuantity <= 0) {
    this.batchStatus = 'CLOSED';
  } else {
    this.batchStatus = 'ACTIVE';
  }

  next();
});

// Virtual field for available quantity
StockBatchSchema.virtual('availableQuantity').get(function () {
  return this.quantity - this.usedQuantity;
});

// Virtual field for total batch cost
StockBatchSchema.virtual('totalBatchCost').get(function () {
  return this.quantity * this.costPerUnit;
});

StockBatchSchema.set('toJSON', { virtuals: true });

const StockBatch = mongoose.model('StockBatch', StockBatchSchema);
export default StockBatch;
