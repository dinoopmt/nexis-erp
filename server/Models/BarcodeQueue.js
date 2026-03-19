import mongoose from "mongoose";

/**
 * BarcodeQueue Model
 * Tracks barcode generation queue for FIFO and multi-system data entry
 * Prevents duplicate barcodes with atomic operations
 */

const barcodeQueueSchema = new mongoose.Schema(
  {
    systemId: {
      type: String,
      required: true,
      description: "System/terminal identifier for multi-system support"
    },
    baseBarcode: {
      type: String,
      required: true,
      description: "Base barcode pattern (e.g., item code + dept code)"
    },
    generatedBarcode: {
      type: String,
      unique: true,
      sparse: true,
      description: "Final generated barcode"
    },
    suffix: {
      type: Number,
      default: 0,
      description: "Suffix counter for uniqueness (00-99)"
    },
    status: {
      type: String,
      enum: ["pending", "generated", "assigned", "failed"],
      default: "pending",
      description: "Queue status"
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AddProduct",
      default: null,
      description: "Product assigned to this barcode"
    },
    itemCode: {
      type: String,
      description: "Item code for reference"
    },
    departmentId: {
      type: String,
      description: "Department ID used in barcode generation"
    },
    retryCount: {
      type: Number,
      default: 0,
      max: 100,
      description: "Number of retry attempts for uniqueness"
    },
    error: {
      type: String,
      default: null,
      description: "Error message if generation failed"
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      description: "Queue entry expires after 5 minutes if not assigned"
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for FIFO retrieval
barcodeQueueSchema.index({ status: 1, createdAt: 1 });
// Index for finding by base barcode
barcodeQueueSchema.index({ baseBarcode: 1, status: 1 });
// Note: generatedBarcode has unique: true in field definition, no need for explicit index
// Index for cleanup of expired entries
barcodeQueueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BarcodeQueue = mongoose.model("BarcodeQueue", barcodeQueueSchema);

export default BarcodeQueue;
