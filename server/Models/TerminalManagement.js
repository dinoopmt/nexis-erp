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
    },

    // ========================================
    // ✅ FORMAT MAPPING (Sales Templates Only - Invoice, Delivery Note, Quotation, Sales Order, Sales Return)
    // NOTE: Inventory templates (LPO, GRN, RTV) are managed at STORE level, not terminal level
    // ========================================
    formatMapping: {
      invoice: {
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          default: null,
          description: "Invoice template for this terminal"
        }
      },
      deliveryNote: {
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          default: null,
          description: "Delivery note template"
        }
      },
      quotation: {
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          default: null,
          description: "Quotation template"
        }
      },
      salesOrder: {
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          default: null,
          description: "Sales order template"
        }
      },
      salesReturn: {
        templateId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InvoiceTemplate",
          default: null,
          description: "Sales return/credit note template"
        }
      }
    },

    // ========================================
    // ✅ HARDWARE MAPPING (Printer & Customer Display)
    // ========================================
    hardwareMapping: {
      invoicePrinter: {
        enabled: {
          type: Boolean,
          default: true,
          description: "Enable invoice printer at this terminal"
        },
        printerName: {
          type: String,
          default: "",
          description: "Invoice printer name or network IP"
        },
        timeout: {
          type: Number,
          default: 5000,
          min: 1000,
          description: "Printer timeout in milliseconds"
        }
      },
      barcodePrinter: {
        enabled: {
          type: Boolean,
          default: false,
          description: "Enable barcode/label printer at this terminal"
        },
        printerName: {
          type: String,
          default: "",
          description: "Barcode printer name or network IP"
        },
        timeout: {
          type: Number,
          default: 5000,
          min: 1000,
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
          enum: ["VFD", "SECONDARY_MONITOR"],
          default: "VFD",
          description: "Type of customer display (VFD serial or secondary monitor)"
        },
        comPort: {
          type: String,
          default: "COM1",
          description: "COM port for VFD display (e.g., COM1, COM2)"
        },
        vfdModel: {
          type: String,
          enum: ["VFD_20X2", "VFD_40X2", "VFD_20X4"],
          default: "VFD_20X2",
          description: "VFD model specifications"
        },
        baudRate: {
          type: Number,
          enum: [2400, 4800, 9600, 19200, 38400, 57600, 115200],
          default: 9600,
          description: "Serial baud rate for VFD communication"
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
          description: "Show discount information on customer display"
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
