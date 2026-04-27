import mongoose from 'mongoose';

const SalesInvoiceSchema = new mongoose.Schema(
  {
    // Invoice Metadata
    invoiceNumber: { 
      type: String, 
      required: true, 
      unique: true 
    },
    financialYear: { 
      type: String, 
      required: true 
    },
    date: { 
      type: Date, 
      required: true 
    },
    paymentType: {
      type: String,
      enum: ['Cash', 'Credit', 'Bank'],
      default: null
    },
    paymentTerms: {
      type: String,
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

    // Customer Information
    customerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Customer',
      sparse: true 
    },
    customerName: { 
      type: String, 
      required: true 
    },
    customerPhone: { 
      type: String 
    },
    customerTRN: { 
      type: String 
    },
    customerAddress: { 
      type: String 
    },
    customerContact: { 
      type: String 
    },

    // Quantity Metrics
    totalItems: { 
      type: Number, 
      default: 0 
    },
    totalItemQty: { 
      type: Number, 
      default: 0 
    },

    // Financial Summary
    subtotal: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    discountPercentage: { 
      type: Number, 
      default: 0 
    },
    discountAmount: { 
      type: Number, 
      default: 0 
    },
    totalAfterDiscount: { 
      type: Number, 
      default: 0 
    },
    vatPercentage: { 
      type: Number, 
      default: 0 
    },
    vatAmount: { 
      type: Number, 
      default: 0 
    },
    totalIncludeVat: { 
      type: Number, 
      default: 0 
    },

    // Profitability Analysis (Invoice Level)
    totalCost: { 
      type: Number, 
      default: 0 
    },
    grossProfit: { 
      type: Number, 
      default: 0 
    },
    grossProfitMargin: { 
      type: Number, 
      default: 0 
    },
    netProfit: { 
      type: Number, 
      default: 0 
    },
    netProfitMargin: { 
      type: Number, 
      default: 0 
    },

    // Notes
    notes: { 
      type: String 
    },

    // Line Items with Full Details
    items: [
      {
        itemName: { 
          type: String, 
          required: true 
        },
        itemcode: { 
          type: String 
        },
        productId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'Product',
          required: true 
        },
        quantity: { 
          type: Number, 
          required: true 
        },
        unitPrice: { 
          type: Number, 
          required: true 
        },
        lineAmount: { 
          type: Number, 
          default: 0 
        },
        unitCost: { 
          type: Number, 
          default: 0 
        },
        lineCost: { 
          type: Number, 
          default: 0 
        },
        discountPercentage: { 
          type: Number, 
          default: 0 
        },
        discountAmount: { 
          type: Number, 
          default: 0 
        },
        amountAfterDiscount: { 
          type: Number, 
          default: 0 
        },
        grossProfit: { 
          type: Number, 
          default: 0 
        },
        grossProfitMargin: { 
          type: Number, 
          default: 0 
        },
        netProfit: { 
          type: Number, 
          default: 0 
        },
        netProfitMargin: { 
          type: Number, 
          default: 0 
        },
        vatPercentage: { 
          type: Number, 
          default: 0 
        },
        vatAmount: { 
          type: Number, 
          default: 0 
        },
        total: { 
          type: Number, 
          default: 0 
        },
        // ✅ Unit of Measure (e.g., 'Pcs', 'Pack', 'Dozen')
        unit: {
          type: String,
          default: 'Pcs'
        },
        serialNumbers: [
          { 
            type: String 
          }
        ],
        note: { 
          type: String 
        }
      }
    ],

    // Payment Tracking
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partial', 'Paid', 'Overdue'],
      default: 'Unpaid'
    },
    totalReceived: {
      type: Number,
      default: 0
    },
    lastPaymentDate: {
      type: Date
    },

    // Status
    status: { 
      type: String, 
      enum: ['Draft', 'Saved', 'Paid', 'Unpaid', 'Cancelled'], 
      default: 'Saved' 
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { 
    timestamps: false 
  }
);

// Index for faster queries
SalesInvoiceSchema.index({ customerId: 1, invoiceNumber: 1 });
SalesInvoiceSchema.index({ customerName: 1 });
SalesInvoiceSchema.index({ date: 1 });

const SalesInvoice = mongoose.model('SalesInvoice', SalesInvoiceSchema, 'sales_invoices');
export default SalesInvoice;
