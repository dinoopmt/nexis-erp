import mongoose from 'mongoose';

const QuotationSchema = new mongoose.Schema(
  {
    // Quotation Metadata
    quotationNumber: { 
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
    expiryDate: {
      type: Date
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

    // ✅ REMOVED: Profitability Analysis (not required for quotation)
    // totalCost, grossProfit, grossProfitMargin, netProfit, netProfitMargin removed

    // Notes
    notes: { 
      type: String 
    },
    terms: {
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
        // ✅ REMOVED: grossProfit, grossProfitMargin, netProfit, netProfitMargin (not required for quotation items)
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
        image: {
          type: String,
          default: null,
          description: "Product image path - cached for template rendering"
        },
        unit: {
          type: String,
          default: 'Pcs',
          description: "Unit of measure (e.g., Pcs, Box, Pack, Dozen)"
        }
      }
    ],

    // Quotation Status
    status: { 
      type: String, 
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'], 
      default: 'Draft' 
    },

    // Conversion Tracking
    convertedToOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesOrder',
      sparse: true
    },
    convertedToInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      sparse: true
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
QuotationSchema.index({ customerId: 1, quotationNumber: 1 });
QuotationSchema.index({ customerName: 1 });
QuotationSchema.index({ date: 1 });
QuotationSchema.index({ status: 1 });

const Quotation = mongoose.model('Quotation', QuotationSchema, 'quotations');
export default Quotation;
