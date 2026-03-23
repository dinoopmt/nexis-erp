import mongoose from "mongoose";

/**
 * FailedEdit Schema
 * Records GRN edit failures for debugging and manual recovery
 * 
 * Used when:
 * - MongoDB transaction fails
 * - Phase 0 (reversal) completes but Phase 1 (application) fails
 * - Phase 2 (payments) fails mid-way
 * - Partial success scenarios that leave inconsistent state
 */
const failedEditSchema = new mongoose.Schema(
  {
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grn",
      required: true,
      index: true,
    },
    grnNumber: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    failedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // ✅ Which phase failed: "validation", "reversal", "application", "payment", "currentstock", "transaction"
    phase: {
      type: String,
      enum: ["validation", "reversal", "application", "payment", "currentstock", "transaction"],
      required: true,
    },
    // ✅ Error message for debugging
    error: {
      type: String,
      required: true,
    },
    // ✅ Stack trace for technical analysis
    stack: {
      type: String,
      default: "",
    },
    // ✅ Snapshot of original state BEFORE changes (for rollback)
    originalState: {
      grn: mongoose.Schema.Types.Mixed,
      batches: [mongoose.Schema.Types.Mixed],
      movements: [mongoose.Schema.Types.Mixed],
      payments: [mongoose.Schema.Types.Mixed],
    },
    // ✅ What the user was trying to change
    proposedChanges: {
      items: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    // ✅ Recovery status
    recovered: {
      type: Boolean,
      default: false,
      index: true,
    },
    recoveryAttempts: {
      type: Number,
      default: 0,
    },
    // ✅ Recovery history (retry, rollback attempts)
    recoveryLog: [
      {
        timestamp: Date,
        action: {
          type: String,
          enum: ["retry", "rollback", "manual_fix"],
        },
        result: {
          type: String,
          enum: ["success", "failed"],
        },
        error: String,
        notes: String,
      },
    ],
    // ✅ Admin notes for investigation
    investigationNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "failed_edits",
  }
);

// ✅ INDEX: Find all unrecovered failures
failedEditSchema.index({ recovered: 1, failedAt: -1 });

// ✅ INDEX: Find failures for a specific GRN
failedEditSchema.index({ grnId: 1, failedAt: -1 });

// ✅ INDEX: Find recent failures
failedEditSchema.index({ failedAt: -1 });

const FailedEdit = mongoose.model("FailedEdit", failedEditSchema);
export default FailedEdit;
