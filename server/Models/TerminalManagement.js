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
    terminalType: {
      type: String,
      enum: ["SALES", "BACKOFFICE"],
      default: "SALES",
      description: "Terminal type - SALES for point-of-sale, BACKOFFICE for administrative",
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
    // ✅ NEW: FORMAT MAPPING (Document Type Configurations)
    // ========================================
    formatMapping: {
      invoice: {
        enabled: {
          type: Boolean,
          default: true,
          description: "Enable invoice generation at this terminal"
        },
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          description: "Default invoice template for this terminal"
        },
        printOnSale: {
          type: Boolean,
          default: true,
          description: "Auto-print invoice after sale"
        },
        copies: {
          type: Number,
          default: 1,
          description: "Number of invoice copies to print"
        }
      },
      deliveryNote: {
        enabled: {
          type: Boolean,
          default: false,
          description: "Enable delivery note generation"
        },
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          description: "Delivery note template"
        },
        requiresSignature: {
          type: Boolean,
          default: false,
          description: "Require customer/driver signature"
        }
      },
      quotation: {
        enabled: {
          type: Boolean,
          default: false,
          description: "Enable quotation generation"
        },
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          description: "Quotation template"
        },
        validityDays: {
          type: Number,
          default: 30,
          description: "Quotation validity period in days"
        }
      },
      salesOrder: {
        enabled: {
          type: Boolean,
          default: false,
          description: "Enable sales order generation"
        },
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          description: "Sales order template"
        },
        requiresApproval: {
          type: Boolean,
          default: false,
          description: "Require manager approval for orders"
        }
      },
      salesReturn: {
        enabled: {
          type: Boolean,
          default: true,
          description: "Enable sales return/credit note"
        },
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          description: "Return/credit note template"
        },
        requiresReason: {
          type: Boolean,
          default: true,
          description: "Require return reason documentation"
        }
      }
    },

    // ========================================
    // ✅ NEW: HARDWARE MAPPING (Printer & Customer Display)
    // ========================================
    hardwareMapping: {
      printer: {
        enabled: {
          type: Boolean,
          default: true,
          description: "Enable printer at this terminal"
        },
        printerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PrinterConfiguration",
          description: "Reference to printer configuration"
        },
        printerName: {
          type: String,
          default: "",
          description: "Local printer name or IP"
        },
        printerModel: {
          type: String,
          enum: ["EPSON", "CANON", "STAR", "TSC", "ZEBRA", "CUSTOM"],
          default: "EPSON",
          description: "Printer model type"
        },
        paperSize: {
          type: String,
          enum: ["80MM", "58MM", "A4", "A5"],
          default: "80MM",
          description: "Receipt paper size"
        },
        copies: {
          type: Number,
          default: 1,
          description: "Default number of copies"
        },
        timeout: {
          type: Number,
          default: 5000,
          description: "Printer timeout in milliseconds"
        }
      },
      customerDisplay: {
        enabled: {
          type: Boolean,
          default: false,
          description: "Enable customer-facing display at this terminal"
        },
        displayType: {
          type: String,
          enum: ["LCD", "LED", "USB_DISPLAY", "NETWORK", "TABLET"],
          default: "LCD",
          description: "Type of customer display"
        },
        displayId: {
          type: String,
          default: "",
          description: "Display device identifier or IP"
        },
        protocol: {
          type: String,
          enum: ["SERIAL", "USB", "NETWORK", "HDMI"],
          default: "USB",
          description: "Connection protocol"
        },
        displayItems: {
          type: Boolean,
          default: true,
          description: "Show item details on customer display"
        },
        displayPrice: {
          type: Boolean,
          default: true,
          description: "Show price on customer display"
        },
        displayTotal: {
          type: Boolean,
          default: true,
          description: "Show running total on customer display"
        },
        displayDiscount: {
          type: Boolean,
          default: true,
          description: "Show discount information"
        }
      }
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
terminalManagementSchema.index({ terminalType: 1 });
terminalManagementSchema.index({ storeId: 1, terminalStatus: 1 });
terminalManagementSchema.index({ storeId: 1, terminalType: 1 });

// ========================================
// VIRTUAL FIELDS
// ========================================
// Reserved for future connectivity tracking when integrated with printer system

export default mongoose.model("TerminalManagement", terminalManagementSchema);
