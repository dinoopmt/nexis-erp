import mongoose from 'mongoose';

const CustomerReceiptSchema = new mongoose.Schema(
  {
    // Receipt Identification
    receiptNumber: {
      type: String,
      unique: true,
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
    receiptDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Customer Information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerCode: {
      type: String,
    },

    // Ledger Account Reference
    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
    },

    // Receipt Type
    receiptType: {
      type: String,
      enum: ['Against Invoice', 'On Account', 'Advance'],
      required: true,
    },

    // Invoice References (for "Against Invoice" type)
    // Single invoice (for backward compatibility)
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      sparse: true,
    },
    invoiceNumber: {
      type: String,
      sparse: true,
    },
    invoiceDate: {
      type: Date,
      sparse: true,
    },
    invoiceNetAmount: {
      type: Number,
      default: 0,
    },

    // Multiple Invoices Support (for Against Invoice type with multiple selections)
    invoiceAllocations: [
      {
        invoiceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SalesInvoice'
        },
        invoiceNumber: String,
        invoiceDate: Date,
        invoiceAmount: Number,
        allocatedAmount: Number,
      }
    ],

    // Advance Application (when an advance is applied to this receipt)
    appliedAdvanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerReceipt',
      sparse: true,
    },
    advanceAmountApplied: {
      type: Number,
      default: 0,
    },

    // Amount Information
    amountPaid: {
      type: Number,
      required: true,
    },
    previousPaidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },

    // Payment Mode
    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank', 'Cheque', 'Online', 'Card'],
      required: true,
    },

    // Bank Details (if applicable)
    bankName: {
      type: String,
    },
    chequeNumber: {
      type: String,
    },
    chequeDate: {
      type: Date,
    },
    referenceNumber: {
      type: String,
    },

    // Status
    status: {
      type: String,
      enum: ['Advance', 'Partial', 'Full', 'Paid', 'Reversed'],
      required: true,
    },

    // Ledger Entry References
    debitEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    creditEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },

    // Reversal Information
    reversalDate: {
      type: Date,
    },
    reversalReason: {
      type: String,
    },
    reversalDebitEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    reversalCreditEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },

    // Notes & Description
    narration: {
      type: String,
    },

    // Reconciliation Status
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledDate: {
      type: Date,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Audit Fields
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Soft Delete
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true, collection: 'customer_receipts' }
);

// Indexes for faster queries
CustomerReceiptSchema.index({ customerId: 1, receiptDate: -1 });
CustomerReceiptSchema.index({ financialYear: 1 });

export default mongoose.model('CustomerReceipt', CustomerReceiptSchema);
