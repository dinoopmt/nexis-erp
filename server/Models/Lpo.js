import mongoose from "mongoose";

const lpoItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  itemCode: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
    min: 0,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  taxPercent: {
    type: Number,
    default: 0,
  },
  taxType: {
    type: String,
    enum: ["exclusive", "inclusive", "notax"],
    default: "exclusive",
  },
  hsn: {
    type: String,
    default: "",
  },
  unit: {
    type: String,
    default: "PC",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const lpoSchema = new mongoose.Schema(
  {
    lpoNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lpoDate: {
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
    // ✅ Branch/Organization Association (Multi-Store Support)
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
      description: "Organization/Branch where LPO is created",
    },
    branchName: {
      type: String,
      default: "",
      description: "Cached branch name",
    },
    items: [lpoItemSchema],
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Draft", "Requested", "Confirmed", "Received", "Cancelled"],
      default: "Draft",
    },
    // ✅ LPO Level Totals
    totalAmount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    netTotal: {
      type: Number,
      default: 0,
    },
    // ✅ Audit Fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Indexes for performance
lpoSchema.index({ lpoNumber: 1 });
lpoSchema.index({ vendorId: 1 });
lpoSchema.index({ lpoDate: -1 });
lpoSchema.index({ status: 1 });
lpoSchema.index({ branchId: 1 });

// ✅ Explicitly set collection name to "lpos"
const Lpo = mongoose.model("Lpo", lpoSchema, "lpos");

export default Lpo;
