import mongoose from 'mongoose';

const SalesOrderSchema = new mongoose.Schema(
  {
    // Order Metadata
    orderNumber: { 
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
    deliveryDate: {
      type: Date
    },
    paymentType: {
      type: String,
      enum: ['', 'Cash', 'Bank', 'Cheque', 'Online', 'Credit'],
      default: ''
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

    // Profitability Analysis (Order Level)
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

    // Notes & Terms
    notes: { 
      type: String 
    },
    terms: {
      type: String
    },

    // Status Management
    status: { 
      type: String, 
      enum: ['Draft', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], 
      default: 'Draft' 
    },

    // Reference Fields
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      sparse: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesInvoice',
      sparse: true
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
          required: true 
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
          required: true 
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
          required: true 
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
        serialNumbers: [{ type: String }],
        note: { type: String },
        unit: {
          type: String,
          default: 'Pcs',
          description: "Unit of measure (e.g., Pcs, Box, Pack, Dozen)"
        }
      }
    ]
  },
  { timestamps: true, collection: 'sales_orders' }
);

const SalesOrder = mongoose.model('SalesOrder', SalesOrderSchema, 'sales_orders');
export default SalesOrder;
