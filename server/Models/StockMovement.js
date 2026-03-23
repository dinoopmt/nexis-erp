import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddProduct',
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryBatch',
      required: false,  // Optional for non-batch products
      index: true,
    },
    movementType: {
      type: String,
      enum: ['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'RETURN'],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    stockBefore: {
      type: Number,
      min: 0,
      default: null,
    },
    newStock: {
      type: Number,
      min: 0,
      default: null,
    },
    currentStock: {
      type: Number,
      min: 0,
      default: null,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      computed: true,
    },
    reference: {
      // Could be Sales Order, Purchase Order, Invoice, etc.
      type: String,
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceType: {
      type: String,
      enum: ['SALES_INVOICE', 'PURCHASE_ORDER', 'STOCK_ADJUSTMENT', 'RETURN'],
      required: true,
    },
    costingMethodUsed: {
      type: String,
      enum: ['FIFO', 'LIFO', 'WAC'],
      required: true,
    },
    documentDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
    },
    reasonCode: {
      // For adjustments/returns only
      type: String,
      enum: ['DAMAGE', 'LOSS', 'EXPIRY', 'QUALITY', 'OTHER'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: 'stock_movements' }
);

// Virtual for total amount
StockMovementSchema.virtual('total').get(function() {
  return this.quantity * this.unitCost;
});

// Index for quick lookups by movement type and date
StockMovementSchema.index({ movementType: 1, documentDate: 1 });
StockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export default mongoose.model('StockMovement', StockMovementSchema);
