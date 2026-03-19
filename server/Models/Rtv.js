/**
 * RTV (Return to Vendor/Supplier) Model
 * Records goods returned to supplier
 * Reverses stock, accounting, and batch entries from GRN
 * Links to source GRN for traceability
 */

import mongoose from "mongoose";

const rtvItemSchema = new mongoose.Schema({
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
  // ✅ RETURN: Quantity being returned (inverse of GRN)
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unitType: {
    type: String,
    default: "PC",
  },
  // ✅ REVERSAL: Original cost per unit
  unitCost: {
    type: Number,
    required: true,
    min: 0,
  },
  // ✅ REVERSAL: Return reason (damage, defective, excess, wrong item, etc.)
  returnReason: {
    type: String,
    enum: ["DAMAGE", "DEFECTIVE", "EXCESS", "WRONG_ITEM", "NOT_REQUIRED", "QUALITY_ISSUE", "OTHER"],
    default: "OTHER",
  },
  returnReasonNotes: {
    type: String,
    default: "",
  },
  // ✅ REVERSAL: Credit to be issued (if not full amount)
  creditAmount: {
    type: Number,
    default: 0,
  },
  // ✅ REVERSAL: Link to original batch for traceability
  originalBatchNumber: {
    type: String,
    default: "",
  },
  // ✅ REVERSAL: Net cost (after discount)
  netCost: {
    type: Number,
    default: 0,
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
    default: "",
  },
});

const rtvSchema = new mongoose.Schema(
  {
    // ✅ RTV Reference
    rtvNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    rtvDate: {
      type: Date,
      required: true,
    },

    // ✅ LINK TO SOURCE GRN (for traceability)
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grn",
      default: null,
    },
    grnNumber: {
      type: String,
      default: "",
    },

    // ✅ VENDOR & SHIPPER
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    vendorName: {
      type: String,
      required: true,
    },

    // ✅ RETURN DETAILS
    referenceNumber: {
      type: String,
      default: "",
    },
    invoiceNo: {
      type: String,
      default: "",
    },
    creditNoteNo: {
      type: String,
      default: "",
    },

    // ✅ RETURN AUTHORIZATION
    returnAuthorizationNumber: {
      type: String,
      default: "",
    },
    authorizedBy: {
      type: String,
      default: "",
    },
    authorizationDate: {
      type: Date,
      default: null,
    },

    // ✅ TOTALS
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

    // ✅ REVERSAL / CREDIT
    creditNoteAmount: {
      type: Number,
      default: 0,
    },
    creditNoteStatus: {
      type: String,
      enum: ["PENDING", "ISSUED", "ADJUSTED", "CANCELLED"],
      default: "PENDING",
    },

    // ✅ STATUS
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Posted", "Cancelled"],
      default: "Draft",
      index: true,
    },

    // ✅ ITEMS
    items: [rtvItemSchema],

    // ✅ REVERSAL TRACKING
    reversalNotes: {
      type: String,
      default: "",
    },

    // ✅ ACCOUNTING INTEGRATION
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },
    creditNoteJournalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },
    accountingDate: {
      type: Date,
      default: null,
    },

    // ✅ STOCK REVERSAL TRACKING
    stockReversalDate: {
      type: Date,
      default: null,
    },
    stockReversalBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    submittedDate: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedDate: {
      type: Date,
      default: null,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    postedDate: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledDate: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Index for efficient queries
rtvSchema.index({ grnNumber: 1 });
rtvSchema.index({ vendorId: 1, rtvDate: -1 });
rtvSchema.index({ creditNoteStatus: 1 });

const Rtv = mongoose.model("Rtv", rtvSchema, "return_to_vendor");
export default Rtv;
