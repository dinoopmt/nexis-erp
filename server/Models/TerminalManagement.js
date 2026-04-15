import mongoose from "mongoose";



const terminalManagementSchema = new mongoose.Schema(
  {
    // ========================================
    // TERMINAL IDENTIFICATION
    // ========================================
    terminalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: "Unique terminal identifier (e.g., POS-001, TERMINAL-001)",
    },
    terminalName: {
      type: String,
      required: true,
      trim: true,
      description: "Friendly name for terminal (e.g., 'Main Counter', 'Billing Point 1')",
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      description: "Reference to store this terminal belongs to",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      description: "Reference to organizational unit (branch, company)",
    },
    terminalStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"],
      default: "ACTIVE",
      description: "Current operational status of terminal",
    },

    // ========================================
    // INVOICE CONTROLS
    // ========================================
    invoiceControls: {
      invoiceNumberPrefix: {
        type: String,
        default: "",
        description: "Prefix for invoice numbering",
      },
      invoiceFormat: {
        type: String,
        enum: ["STANDARD", "THERMAL", "THERMAL80", "A4"],
        default: "STANDARD",
        description: "Invoice printing format",
      },
    },

    // ========================================
    // PRINTING FORMATS
    // ========================================
    printingFormats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ========================================
    // AUDIT
    // ========================================
    createdBy: {
      type: String,
      default: "SYSTEM",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: String,
    },
    updatedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
      description: "Additional notes or setup notes for terminal",
    },
  },
  {
    timestamps: true,
    collection: "terminal_management",
    strict: true,  // Reject any fields not defined in schema
  }
);

// ========================================
// INDEXES
// ========================================
terminalManagementSchema.index({ terminalId: 1 });
terminalManagementSchema.index({ storeId: 1 });
terminalManagementSchema.index({ organizationId: 1 });
terminalManagementSchema.index({ terminalStatus: 1 });
terminalManagementSchema.index({ storeId: 1, terminalStatus: 1 });

// ========================================
// VIRTUAL FIELDS
// ========================================
// Reserved for future connectivity tracking when integrated with printer system

export default mongoose.model("TerminalManagement", terminalManagementSchema);
