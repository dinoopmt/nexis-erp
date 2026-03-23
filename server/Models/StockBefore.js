import mongoose from 'mongoose';

const StockBeforeSchema = new mongoose.Schema(
  {
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grn',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AddProduct',
      required: true,
      index: true,
    },
    stockBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    newStock: {
      type: Number,
      required: true,
      min: 0,
    },
    difference: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  },
  { timestamps: true, collection: 'stock_before_logs' }
);

export default mongoose.model('StockBefore', StockBeforeSchema);
