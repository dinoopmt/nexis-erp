import mongoose from "mongoose";

const grnItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  itemCode: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: "",
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitType: {
    type: String,
    default: "PC",
  },
  foc: {
    type: Boolean,
    default: false,
  },
  focQty: {
    type: Number,
    default: 0,
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0,
  },
  itemDiscount: {
    type: Number,
    default: 0,
  },
  itemDiscountPercent: {
    type: Number,
    default: 0,
  },
  netCost: {
    type: Number,
    default: 0,
  },
  taxType: {
    type: String,
    enum: ["exclusive", "inclusive", "notax"],
    default: "exclusive",
  },
  taxPercent: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  batchNumber: {
    type: String,
    default: "",
  },
  expiryDate: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: "",
  },
  // ✅ RTV TRACKING: Qty returned to vendor (independent of sales)
  rtvReturnedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    grnDate: {
      type: Date,
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    // ✅ NEW: Branch/Organization Association (Multi-Store Support)
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
      description: "Organization/Branch where GRN is received"
    },
    branchName: {
      type: String,
      default: '',
      description: "Cached branch name"
    },
    // ✅ ADDED: Shipper tracking for separate payables
    shipperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    shipperName: {
      type: String,
      default: "",
    },
    referenceNumber: {
      type: String,
      default: "",
    },
    invoiceNo: {
      type: String,
      default: "",
    },
    lpoNo: {
      type: String,
      default: "",
    },
    paymentTerms: {
      type: String,
      default: "due_on_receipt",
    },
    taxType: {
      type: String,
      enum: ["exclusive", "inclusive", "notax"],
      default: "exclusive",
    },
    deliveryDate: {
      type: Date,
      default: null,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    // ✅ ADDED: GRN Level Totals
    totalQty: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    totalExTax: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    netTotal: {
      type: Number,
      default: 0,
    },
    finalTotal: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Draft", "Received", "Verified", "Rejected"],
      default: "Draft",
    },
    items: [grnItemSchema],
    notes: {
      type: String,
      default: "",
    },
    // ✅ AUDIT TRAIL
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
    // ✅ CONCURRENCY CONTROL: Edit locking
    editLock: {
      lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      lockedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    // ✅ OPTIMISTIC LOCKING: Version field for detecting concurrent edits
    __v: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Grn = mongoose.model("Grn", grnSchema, 'goods_receipt_notes');
export default Grn;
