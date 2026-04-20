import mongoose from "mongoose";

const storeSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    address1: {
      type: String,
      default: "",
    },
    address2: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    taxNumber: {
      type: String,
      default: "",
    },
    // ✅ NEW: Store Logo Only (branding per location)
    // Company Name, Currency, Decimal Places come from Company Master (single source of truth)
    logoUrl: {
      type: String,
      default: "",
      description: "Store logo uploaded as base64 or URL (each store can have unique logo)"
    },
    // ✅ NOTE: Barcode, Printer, and Label settings moved to Terminal level
    // barcodePrefix, barcodeFormat, printerModel, printerPort, labelWidth, labelHeight
    // are now managed per-terminal in Terminal Management settings
    // Sales Controls
    salesControls: {
      enableInvoiceNumbering: {
        type: Boolean,
        default: true,
      },
      invoiceNumberFormat: {
        type: String,
        default: "INV-YYMMDD-XXXX",
      },
      enableReceiptPrinting: {
        type: Boolean,
        default: true,
      },
      enableOnlineSync: {
        type: Boolean,
        default: true,
      },
      maxOfflineTransactions: {
        type: Number,
        default: 100,
      },
    },
    // Terminal-Wise Settings
    terminalSettings: [
      {
        terminalId: String,
        terminalName: String,
        invoiceNumberPrefix: String,
        invoiceFormat: {
          type: String,
          enum: ["STANDARD", "THERMAL", "THERMAL80", "A4"],
          default: "STANDARD",
        },
        enableCreditSale: {
          type: Boolean,
          default: true,
        },
        enableReturns: {
          type: Boolean,
          default: true,
        },
        enablePromotions: {
          type: Boolean,
          default: true,
        },
        // ✅ NEW: System Settings moved to terminal level
        dateFormat: {
          type: String,
          default: 'DD-MM-YYYY',
          enum: ['DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'],
        },
        timeFormat: {
          type: String,
          enum: ['24', '12'],
          default: '24',
        },
        currency: {
          type: String,
          default: 'AED',
        },
        timezone: {
          type: String,
          default: 'Asia/Dubai',
        },
        defaultLanguage: {
          type: String,
          default: 'English',
          enum: ['English', 'Arabic', 'Urdu'],
        },
        enableAutoBackup: {
          type: Boolean,
          default: true,
        },
        backupFrequency: {
          type: String,
          enum: ['hourly', 'daily', 'weekly', 'monthly'],
          default: 'daily',
        },
        backupTime: {
          type: String,
          default: '02:00',
        },
      },
    ],
    // Store Control Settings
    storeControlSettings: {
      enableInventoryTracking: {
        type: Boolean,
        default: true,
      },
      enableStockAlerts: {
        type: Boolean,
        default: true,
      },
      enableCreditLimit: {
        type: Boolean,
        default: true,
      },
      enableDiscounts: {
        type: Boolean,
        default: true,
      },
      enableReturns: {
        type: Boolean,
        default: true,
      },
      enablePriceOverride: {
        type: Boolean,
        default: false,
      },
      enableManagerApproval: {
        type: Boolean,
        default: true,
      },
    },
    // ✅ Weight Scale Configuration
    weightScaleSettings: {
      // Prefix control for weight scale items (e.g., "2" for 2-digit weight code)
      scalePrefix: {
        type: String,
        default: "2",
        enum: ["2", "20", "21", "22"],
        description: "EAN barcode prefix for weight scale items",
      },
      // Enable weight scale items in POS
      enableWeightScale: {
        type: Boolean,
        default: false,
      },
      // Measurement unit for weight scale (KG, LB, G)
      defaultWeightUnit: {
        type: String,
        default: "KG",
        enum: ["KG", "LB", "G", "MG"],
      },
      // Pricing model: weight-based or total-price-based
      pricingModel: {
        type: String,
        default: "weight",
        enum: ["weight", "total"],
        description: "weight=Price per unit weight, total=Fixed total price by weight",
      },
      // Barcode measurement settings
      barcodeMeasurement: {
        // Enable embedding weight in barcode
        enableWeightEmbedding: {
          type: Boolean,
          default: false,
        },
        // Maximum weight for single scale item (e.g., 99.99 KG)
        maxWeight: {
          type: Number,
          default: 99.99,
        },
        // Minimum weight for single scale item (e.g., 0.01 KG)
        minWeight: {
          type: Number,
          default: 0.01,
        },
        // Decimal places for weight precision (2 = 0.01, 3 = 0.001)
        precipisionDecimalPlaces: {
          type: Number,
          default: 2,
          enum: [1, 2, 3],
        },
        // Weight position in barcode (start, middle, end)
        weightPosition: {
          type: String,
          default: "end",
          enum: ["start", "middle", "end"],
        },
        // Fixed weight digits in barcode (e.g., 5 digits for weight)
        weightDigits: {
          type: Number,
          default: 5,
          min: 3,
          max: 8,
        },
      },
      // Scale device configuration
      scaleDevice: {
        // Device type: manual, serial, usb, network
        deviceType: {
          type: String,
          default: "manual",
          enum: ["manual", "serial", "usb", "network"],
        },
        // Serial port settings for device connection
        serialPort: {
          type: String,
          default: "COM1",
        },
        // Baud rate for serial communication
        baudRate: {
          type: Number,
          default: 9600,
          enum: [2400, 4800, 9600, 19200, 38400, 57600, 115200],
        },
        // USB vendor/product ID
        usbVendorId: {
          type: String,
          default: "",
        },
        usbProductId: {
          type: String,
          default: "",
        },
        // Network device IP/URL
        networkAddress: {
          type: String,
          default: "",
        },
        networkPort: {
          type: Number,
          default: 5000,
        },
      },
      // Auto-sync weight from scale to POS
      autoSyncWeight: {
        type: Boolean,
        default: false,
      },
      // Alert on scale connection loss
      enableScaleAlerts: {
        type: Boolean,
        default: true,
      },
    },
    // ✅ Product Naming Conventions
    productNamingRules: {
      enabled: {
        type: Boolean,
        default: true,
      },
      convention: {
        type: String,
        default: "FREE",
        enum: ["FREE", "PREFIX_PATTERN", "AUTO_GENERATED"],
      },
      preventLowercase: {
        type: Boolean,
        default: false,
      },
      preventAllCaps: {
        type: Boolean,
        default: false,
      },
      enforceOnSave: {
        type: Boolean,
        default: true,
      },
      checkDuplicates: {
        type: Boolean,
        default: true,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, collection: "storeSettings" }
);

export default mongoose.model("StoreSettings", storeSettingsSchema);
