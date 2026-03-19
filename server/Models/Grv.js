/**
 * GRV (Goods Receipt Voucher) Model
 * Separate immutable collection for verified receipts
 * Links to source GRN and accounting records
 */

import mongoose from "mongoose";

const grvItemSchema = new mongoose.Schema({
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
});

const grvSchema = new mongoose.Schema(
  {
    grvNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    grvDate: {
      type: Date,
      required: true,
    },
    // ✅ REFERENCE: Link to source GRN
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grn",
      required: true,
      index: true,
    },
    grnNumber: {
      type: String,
      required: true,
    },
    // VENDOR & SHIPPER
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
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
    // TOTALS
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
    // VERIFICATION
    status: {
      type: String,
      enum: ["Posted", "Cancelled"],
      default: "Posted",
      index: true,
    },
    items: [grvItemSchema],
    verificationNotes: {
      type: String,
      default: "",
    },
    // ✅ ACCOUNTING INTEGRATION
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },
    accountingDate: {
      type: Date,
      default: null,
    },
    costCenter: {
      type: String,
      default: "",
    },
    // ✅ IMMUTABILITY (Once created, never modified)
    isLocked: {
      type: Boolean,
      default: true,
      immutable: true,
    },
    // ✅ AUDIT TRAIL
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    // updatedBy intentionally omitted - GRV is immutable
    // For cancelled GRVs, use cancellationBy instead
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

// ✅ Index for quick lookups
grvSchema.index({ grnId: 1 });
grvSchema.index({ vendorId: 1, grvDate: -1 });
grvSchema.index({ status: 1 });

const Grv = mongoose.model("Grv", grvSchema, 'goods_receipt_vouchers');
export default Grv;
