import mongoose from 'mongoose';

const posShiftSchema = new mongoose.Schema(
  {
    shiftNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Unique shift identifier (e.g., SHIFT-20260305-001)',
    },
    terminal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POSTerminal',
      required: true,
      description: 'Reference to POS terminal',
    },
    terminalId: {
      type: String,
      required: true,
      trim: true,
      description: 'Terminal ID for quick lookup',
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      description: 'Reference to operator/user',
    },
    operatorId: {
      type: String,
      required: true,
      trim: true,
      description: 'Operator ID for quick lookup',
    },
    operatorName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'paused'],
      default: 'open',
    },
    // Opening information
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0,
      description: 'Cash/balance declared at shift start',
    },
    expectedOpening: {
      type: Number,
      default: null,
      description: 'Previous shift\'s closing balance for reconciliation',
    },
    openingVariance: {
      type: Number,
      default: 0,
      description: 'Difference between expected and actual opening balance',
    },
    openingVarianceAcknowledged: {
      type: Boolean,
      default: false,
      description: 'Operator acknowledged the opening variance',
    },
    // Shift activity
    transactionCount: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
      description: 'Total revenue from sales',
    },
    totalReturns: {
      type: Number,
      default: 0,
      description: 'Total refunded from returns',
    },
    totalPaymentsMade: {
      type: Number,
      default: 0,
      description: 'Total payments processed',
    },
    netSales: {
      type: Number,
      default: 0,
      description: 'Total sales minus returns',
    },
    // Closing information
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closingBalance: {
      type: Number,
      default: null,
      description: 'Cash/balance declared at shift close',
    },
    expectedClosing: {
      type: Number,
      default: null,
      description: 'Calculated closing balance (opening + net)',
    },
    closingVariance: {
      type: Number,
      default: 0,
      description: 'Difference between expected and actual closing balance',
    },
    closingVarianceAcknowledged: {
      type: Boolean,
      default: false,
      description: 'Operator acknowledged the closing variance',
    },
    reconcilationNotes: {
      type: String,
      trim: true,
      description: 'Notes from reconciliation process',
    },
    // Payment method breakdown
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
      other: {
        type: Number,
        default: 0,
      },
    },
    // Transactions reference
    transactions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'POSSale',
      description: 'References to all transactions in this shift',
    }],
    // Metadata
    notes: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
  { timestamps: true, collection: 'pos_shifts' }
);

// Index for quick lookups
posShiftSchema.index({ terminalId: 1, status: 1 });
posShiftSchema.index({ operatorId: 1, status: 1 });
posShiftSchema.index({ openedAt: 1 });
// Note: shiftNumber index already created by unique: true constraint

export default mongoose.model('POSShift', posShiftSchema);
