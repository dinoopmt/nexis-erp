import mongoose from 'mongoose';

const posSaleSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique transaction identifier (e.g., TXN-20260305-001)',
    },
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POSShift',
      required: true,
    },
    shiftNumber: {
      type: String,
      required: true,
      trim: true,
    },
    terminal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POSTerminal',
      required: true,
    },
    terminalId: {
      type: String,
      required: true,
      trim: true,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    operatorId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['sale', 'return'],
      required: true,
    },
    customer: {
      name: {
        type: String,
        trim: true,
        default: 'Walk-in',
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
    },
    items: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      productCode: {
        type: String,
        required: true,
        trim: true,
      },
      productName: {
        type: String,
        required: true,
        trim: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 0.001,
      },
      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      discountType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'fixed',
      },
      tax: {
        type: Number,
        default: 0,
      },
      lineTotal: {
        type: Number,
        required: true,
      },
    }],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'check', 'digital', 'mixed'],
      required: true,
    },
    paymentBreakdown: {
      cash: {
        type: Number,
        default: 0,
      },
      card: {
        type: Number,
        default: 0,
      },
      check: {
        type: Number,
        default: 0,
      },
      digital: {
        type: Number,
        default: 0,
      },
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    change: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'voided', 'returned'],
      default: 'completed',
    },
    notes: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: 'pos_sales' }
);

// Indexes
posSaleSchema.index({ shiftNumber: 1 });
posSaleSchema.index({ terminalId: 1, createdAt: -1 });
posSaleSchema.index({ operatorId: 1, createdAt: -1 });

export default mongoose.model('POSSale', posSaleSchema);
