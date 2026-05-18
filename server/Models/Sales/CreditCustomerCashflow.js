import mongoose from 'mongoose';

const CreditCustomerCashflowSchema = new mongoose.Schema(
  {
    // Financial Year Reference
    financialYear: {
      type: String,
      required: true
    },

    // Customer Information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    customerCode: {
      type: String,
      required: true
    },
    customerName: {
      type: String,
      required: true
    },
    customerPhone: {
      type: String
    },
    customerAddress: {
      type: String
    },

    // Invoice Information (Debit Entry)
    salesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      sparse: true
    },
    invoiceNumber: {
      type: String,
      sparse: true
    },
    invoiceDate: {
      type: Date,
      sparse: true
    },

    // Payment Terms & Due Date
    paymentTerms: {
      type: String,
      default: 'NET 30'
    },
    dueDate: {
      type: Date,
      sparse: true
    },

    // Transaction Type & Details (Each document = One transaction)
    transactionType: {
      type: String,
      enum: ['Invoice', 'Payment', 'AdvanceReceived', 'AdvanceApplied', 'Reversal', 'WriteOff'],
      default: 'Invoice',
      required: true
    },
    transactionDate: {
      type: Date,
      required: true
    },

    // Transaction Amounts
    drAmount: {
      type: Number,
      default: 0,
      description: 'Debit amount (invoice or reversal)'
    },
    crAmount: {
      type: Number,
      default: 0,
      description: 'Credit amount (payment or advance received)'
    },
    balance: {
      type: Number,
      required: true,
      description: 'Running balance after this transaction'
    },

    // Transaction Status & Mode
    status: {
      type: String,
      enum: ['Pending', 'Settled', 'Partial', 'Overdue', 'Reversed', 'Cancelled'],
      default: 'Pending'
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'Bank', 'Cheque', 'Online', 'Card'],
      sparse: true
    },

    // References
    reference: {
      type: String,
      description: 'Invoice/Receipt number or transaction reference'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      description: 'Reference to CustomerReceipt or CreditSaleReceipt'
    },
    receiptNumber: {
      type: String,
      sparse: true,
      description: 'Receipt number if payment transaction'
    },

    // Narration/Description
    narration: {
      type: String,
      description: 'Transaction description/notes'
    },

    // Linked Records
    ledgerAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccounts',
      description: 'Customer debtor ledger account'
    },

    // Audit Fields
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    createdDate: {
      type: Date,
      default: Date.now
    },
    updatedDate: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }
  },
  {
    collection: 'credit_customer_cashflows',
    timestamps: true
  }
);

// Indexes for Performance - Optimized for flat structure
CreditCustomerCashflowSchema.index({ customerId: 1, financialYear: 1, transactionDate: 1 });
CreditCustomerCashflowSchema.index({ customerCode: 1, financialYear: 1 });
CreditCustomerCashflowSchema.index({ invoiceNumber: 1 });
CreditCustomerCashflowSchema.index({ dueDate: 1, status: 1 });
CreditCustomerCashflowSchema.index({ transactionDate: 1 });
CreditCustomerCashflowSchema.index({ isDeleted: 1, customerId: 1 });

// Export Model
export default mongoose.model('CreditCustomerCashflow', CreditCustomerCashflowSchema);
