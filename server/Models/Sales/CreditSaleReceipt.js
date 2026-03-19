import mongoose from 'mongoose';

const CreditSaleReceiptSchema = new mongoose.Schema(
  {
    // Receipt Metadata
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
    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
    },

    // Receipt Type: "Full", "Partial", "OnAccount"
    receiptType: {
      type: String,
      enum: ['Full', 'Partial', 'OnAccount'],
      required: true,
    },

    // Invoice Reference (for Full and Partial)
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      sparse: true, // Not required for OnAccount receipts
    },
    invoiceNumber: {
      type: String,
      sparse: true,
    },
    invoiceDate: {
      type: Date,
      sparse: true,
    },

    // Amount Information
    invoiceAmount: {
      type: Number,
      default: 0,
    },
    previouslyReceivedAmount: {
      type: Number,
      default: 0, // For partial receipts - track cumulative payments
    },
    receiptAmount: {
      type: Number,
      required: true,
    },
    remainingAmount: {
      type: Number,
      default: 0, // For partial receipts
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
      type: String, // For online/card payments
    },

    // Ledger Entries Created
    debitEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },
    creditEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
    },

    // Notes
    notes: {
      type: String,
    },

    // Status
    status: {
      type: String,
      enum: ['Pending', 'Cleared', 'Bounced', 'Cancelled'],
      default: 'Pending',
    },

    // Reconciliation
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledDate: {
      type: Date,
    },

    // Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
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
  { timestamps: true, collection: 'credit_sale_receipts' }
);

export default mongoose.model('CreditSaleReceipt', CreditSaleReceiptSchema);
