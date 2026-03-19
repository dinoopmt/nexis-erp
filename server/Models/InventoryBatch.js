import mongoose from 'mongoose';

const InventoryBatchSchema = new mongoose.Schema(
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
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    quantityRemaining: {
      type: Number,
      default: function() {
        return this.quantity;
      },
      min: 0,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CreateVendor',
    },
    expiryDate: {
      type: Date,
    },
    lotNumber: {
      type: String,
    },
    description: {
      type: String,
    },
    batchStatus: {
      type: String,
      enum: ['ACTIVE', 'CLOSED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true,
    },
    costValue: {
      // Total cost = purchasePrice * quantity
      type: Number,
      computed: true,
    },
    invoiceNumber: {
      type: String,
    },
    costMovements: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockMovement',
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: 'inventory_batches' }
);

// Compound index for unique batches per product
InventoryBatchSchema.index({ productId: 1, batchNumber: 1, purchaseDate: 1 }, { unique: true });

// Virtual for total cost value
InventoryBatchSchema.virtual('totalCost').get(function() {
  return this.purchasePrice * this.quantity;
});

// Update quantityRemaining when quantity changes
InventoryBatchSchema.pre('save', function(next) {
  if (this.isModified('quantity') && !this.isModified('quantityRemaining')) {
    this.quantityRemaining = this.quantity;
  }
  next();
});

export default mongoose.model('InventoryBatch', InventoryBatchSchema);
