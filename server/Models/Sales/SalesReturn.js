import mongoose from 'mongoose';

const SalesReturnSchema = new mongoose.Schema(
  {
    // Return Metadata
    returnNumber: { 
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

    // Profitability Analysis (Return Level)
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
        serialNumbers: [
          { 
            type: String 
          }
        ],
        note: { 
          type: String 
        },
        // Track returns: how much of this item was already returned in previous returns
        originalInvoiceQty: {
          type: Number,
          description: "Original quantity sold in the invoice"
        },
        alreadyReturnedQty: {
          type: Number,
          default: 0,
          description: "Total quantity already returned in previous return documents"
        },
        invoiceSalesLineItemId: {
          type: String,
          description: "Reference to the specific line item in the original invoice"
        }
      }
    ],

    // Invoice Reference (MANDATORY)
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      required: true,
      description: "Reference to the original sales invoice - MANDATORY"
    },
    invoiceNumber: {
      type: String,
      required: true,
      description: "Invoice number for quick reference"
    },
    invoiceDate: {
      type: Date,
      required: true,
      description: "Original invoice date - used for return window validation"
    },

    // Return Reason (MANDATORY)
    returnReason: {
      type: String,
      required: true,
      minlength: 5,
      description: "Reason for the return (minimum 5 characters)"
    },

    // Return Window Tracking
    returnWindowValidation: {
      allowedReturnDays: {
        type: Number,
        description: "Configured allowed days from store settings at time of return"
      },
      isWithinReturnWindow: {
        type: Boolean,
        description: "Is this return within the allowed window?"
      },
      daysAfterInvoice: {
        type: Number,
        description: "Number of days after invoice was created"
      },
      requiresApproval: {
        type: Boolean,
        default: false,
        description: "Does this return require manager approval (outside window)?"
      },
      approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'na'],
        default: 'na',
        description: "Approval status if outside return window"
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        description: "Manager who approved the return"
      },
      approvalDate: {
        type: Date,
        description: "Date of approval"
      }
    },

    // Accounting & Journal Entry Tracking (Double-Entry System)
    journalEntryIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      description: "Journal entries created for this sales return"
    }],
    mainJournalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      description: "Main journal entry for this sales return"
    },
    accountingStatus: {
      type: String,
      enum: ['pending', 'posted', 'reversed', 'cancelled'],
      default: 'pending',
      description: "Status of accounting entries"
    },
    postedDate: {
      type: Date,
      description: "Date when journal entries were posted"
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: "User who posted the entries"
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
SalesReturnSchema.index({ customerId: 1, returnNumber: 1 });
SalesReturnSchema.index({ customerName: 1 });
SalesReturnSchema.index({ date: 1 });
SalesReturnSchema.index({ invoiceId: 1 }); // For tracking returns per invoice

const SalesReturn = mongoose.model('SalesReturn', SalesReturnSchema, 'sales_returns');
export default SalesReturn;
