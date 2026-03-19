import mongoose from 'mongoose';

/**
 * Vendor Payment Tracking Schema
 * Tracks payment obligations per GRN with balance management
 * Creates separate entries for items and shipping for granular tracking
 */

const vendorPaymentSchema = new mongoose.Schema(
  {
    // GRN Reference
    grnId: {
      type: String,
      required: true,
      index: true,
      comment: 'GRN number (GRN-2025-26-00001)',
    },
    grnDate: {
      type: Date,
      required: true,
    },

    // Vendor Details
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    vendorName: {
      type: String,
      required: true,
      index: true,
    },

    // Payment Type (Items or Shipping)
    type: {
      type: String,
      enum: ['ITEMS', 'SHIPPING'],
      default: 'ITEMS',
      comment: 'ITEMS = line items total, SHIPPING = shipping cost',
    },

    // Amount Tracking
    initialAmount: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Original invoice/shipping amount',
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Total amount paid so far',
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Outstanding balance = initialAmount - amountPaid',
    },

    // Payment Terms
    paymentTerms: {
      type: String,
      enum: ['IMMEDIATE', 'NET_7', 'NET_14', 'NET_30', 'NET_60', 'NET_90', 'CUSTOM'],
      default: 'NET_30',
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
      comment: 'Payment due date calculated from payment terms',
    },
    creditDays: {
      type: Number,
      default: 30,
      comment: 'Number of days allowed for payment',
    },

    // Payment Status
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    // Payment History
    payments: [
      {
        paymentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Payment',
        },
        amountPaid: {
          type: Number,
          required: true,
        },
        paymentDate: {
          type: Date,
          required: true,
        },
        paymentMethod: {
          type: String,
          enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE', 'CREDIT_NOTE'],
        },
        paymentReference: String,
        notes: String,
      },
    ],

    // Invoice Reference (if invoiced against this GRN)
    invoices: [
      {
        invoiceNumber: String,
        invoiceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
        },
        invoiceDate: Date,
        invoiceAmount: Number,
      },
    ],

    // Metadata
    remarks: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'vendor_payments',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Index for efficient queries
vendorPaymentSchema.index({ grnId: 1, vendorId: 1 });
vendorPaymentSchema.index({ vendorId: 1, paymentStatus: 1 });
vendorPaymentSchema.index({ dueDate: 1, paymentStatus: 1 });

// ✅ Virtuals
vendorPaymentSchema.virtual('isOverdue').get(function () {
  return this.paymentStatus !== 'PAID' && new Date() > this.dueDate;
});

vendorPaymentSchema.virtual('daysOverdue').get(function () {
  if (!this.isOverdue) return 0;
  return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
});

vendorPaymentSchema.virtual('percentPaid').get(function () {
  return this.initialAmount > 0 ? (this.amountPaid / this.initialAmount) * 100 : 0;
});

// ✅ Methods

/**
 * Calculate and update balance
 */
vendorPaymentSchema.methods.calculateBalance = function () {
  this.balance = this.initialAmount - this.amountPaid;
  if (this.balance <= 0) {
    this.paymentStatus = 'PAID';
    this.balance = 0;
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'PARTIAL';
  }
  return this.balance;
};

/**
 * Record a payment
 */
vendorPaymentSchema.methods.recordPayment = function (paymentData) {
  const {
    paymentId,
    amountPaid,
    paymentDate,
    paymentMethod,
    paymentReference,
    notes,
  } = paymentData;

  // Add to payments history
  this.payments.push({
    paymentId,
    amountPaid,
    paymentDate,
    paymentMethod,
    paymentReference,
    notes,
  });

  // Update totals
  this.amountPaid += amountPaid;
  this.calculateBalance();
  this.updatedDate = new Date();

  return this;
};

/**
 * Get all outstanding payments
 */
vendorPaymentSchema.statics.getOutstanding = function (vendorId) {
  return this.find({
    vendorId,
    paymentStatus: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    balance: { $gt: 0 },
  });
};

/**
 * Get GRN total payable
 */
vendorPaymentSchema.statics.getGrnTotalPayable = function (grnId) {
  return this.find({ grnId });
};

export default mongoose.model('VendorPayment', vendorPaymentSchema);
