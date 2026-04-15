/**
 * Terminal Management Seeder
 * Creates sample terminal configurations for testing
 * 
 * Run: node scripts/terminal-seeder.js
 */

import mongoose from "mongoose";
import TerminalManagement from "../server/Models/TerminalManagement.js";
import StoreSettings from "../server/Models/StoreSettings.js";
import dotenv from "dotenv";

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/NEXIS_ERP");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
}

async function seedTerminals() {
  try {
    await connectDB();

    console.log("\n" + "═".repeat(80));
    console.log("🌱 SEEDING TERMINAL MANAGEMENT DATABASE");
    console.log("═".repeat(80));

    // Get first store
    const store = await StoreSettings.findOne();
    if (!store) {
      console.log("❌ No store found. Please create a store first.");
      process.exit(1);
    }

    console.log(`\n📦 Store: ${store.storeName} (${store.storeCode})`);

    // ========================================
    // TERMINAL 1: Main Counter (Full Features)
    // ========================================
    const terminal1 = {
      terminalId: "MAIN-001",
      terminalName: "Main Counter",
      storeId: store._id,
      terminalStatus: "ACTIVE",
      hardware: {
        primaryPrinter: {
          printerModel: "ZEBRA",
          printerName: "ZEBRA_PRINTER_1",
          printerPort: "LPT1",
          connectionType: "PARALLEL",
          dpi: 203,
          isConfigured: true,
          testStatus: "PASS",
          lastTestDate: new Date(),
        },
        labelPrinter: {
          printerModel: "BROTHER",
          printerName: "BROTHER_LABEL",
          printerPort: "COM1",
          connectionType: "SERIAL",
          isConfigured: true,
          testStatus: "PASS",
        },
        barcodeScanner: {
          type: "HANDHELD",
          model: "Symbol DS3578",
          connectionType: "USB",
          isConfigured: true,
        },
        weightScale: {
          enabled: true,
          model: "METTLER TOLEDO",
          connectionType: "SERIAL",
          port: "COM2",
          precision: 2,
          isConfigured: true,
        },
        customerDisplay: {
          enabled: true,
          model: "EPSON DM-D110",
          connectionType: "USB",
          isConfigured: true,
        },
        cashDrawer: {
          enabled: true,
          model: "Star Micronics",
          connectionType: "PARALLEL",
          isConfigured: true,
        },
      },
      printingFormats: {
        receiptFormat: {
          type: "THERMAL",
          width: 80,
          paperSize: "80MM",
          orientation: "PORTRAIT",
          copies: 1,
          includeItemName: true,
          includeItemCode: true,
          includeQuantity: true,
          includeUnitPrice: true,
          includeDiscount: true,
          includeTax: true,
          includeTotal: true,
          includeLogo: true,
          includeQRCode: false,
          includeBarcode: false,
          includeStoreInfo: true,
          includeTerminalInfo: true,
          includePaymentMethod: true,
          includeDate: true,
          headerText: "Welcome to Our Store!",
          footerText: "Thank you for shopping!",
        },
        invoiceFormat: {
          type: "A4",
          width: 210,
          paperSize: "A4",
          orientation: "PORTRAIT",
          copies: 1,
          includeVendorInfo: true,
          includeBuyerInfo: true,
          includeInvoiceNumber: true,
          includeDate: true,
          includeItemName: true,
          includeItemCode: true,
          includeHSN: true,
          includeQuantity: true,
          includeUnitPrice: true,
          includeDiscount: true,
          includeTax: true,
          includeTotal: true,
          includeTermsAndConditions: false,
          headerText: "TAX INVOICE",
          footerText: "E. & O.E.",
        },
        labelFormat: {
          type: "SMALL_LABEL",
          width: 50,
          height: 40,
          includeBarcode: true,
          barcodeType: "EAN13",
          includePrice: true,
          includeName: true,
          includeWeight: false,
        },
      },
      invoiceControls: {
        invoiceNumberPrefix: "INV-",
        invoiceStartNumber: 1001,
        invoiceCounter: 1001,
        invoiceNumberFormat: "INV-YYMMDD-XXXXX",
        receiptNumberPrefix: "RC-",
        receiptStartNumber: 5001,
        receiptCounter: 5001,
        autoResetDaily: false,
        autoResetMonthly: false,
      },
      salesControls: {
        enableCreditSale: true,
        enableCashSale: true,
        enableCardSale: true,
        enableOnlinePayment: true,
        enableReturns: true,
        enableExchanges: true,
        enableCancellations: true,
        enablePromotions: true,
        enableManualDiscount: true,
        maxManualDiscountPercent: 10,
        requireManagerApprovalAbove: 1000,
        enablePriceOverride: false,
        enableBulkDiscount: true,
        enablePartialReturn: true,
        maxItemsPerTransaction: 0,
        maxLineItems: 0,
        enableSplitPayment: true,
        enableCashback: false,
      },
      permissions: {
        allowedUserRoles: ["ADMIN", "MANAGER", "CASHIER"],
        autoLockAfterMinutes: 30,
        requireBiometricAuth: false,
        enableOfflineMode: true,
        maxOfflineTransactions: 50,
      },
      connectivity: {
        ipAddress: "192.168.1.100",
        macAddress: "00:1A:2B:3C:4D:5E",
        connectionType: "WIRED",
        syncInterval: 5,
        isOnline: true,
        lastSyncTime: new Date(),
        lastHeartbeat: new Date(),
      },
      createdBy: "SEEDER",
    };

    // ========================================
    // TERMINAL 2: Self Checkout (Limited Features)
    // ========================================
    const terminal2 = {
      terminalId: "MAIN-002",
      terminalName: "Self Checkout",
      storeId: store._id,
      terminalStatus: "ACTIVE",
      hardware: {
        primaryPrinter: {
          printerModel: "EPSON",
          printerName: "EPSON_LABEL",
          printerPort: "USB001",
          connectionType: "USB",
          isConfigured: true,
          testStatus: "PASS",
        },
        barcodeScanner: {
          type: "FIXED",
          model: "Honeywell HF680",
          connectionType: "USB",
          isConfigured: true,
        },
        paymentTerminal: {
          enabled: true,
          provider: "SQUARE",
          model: "Square Terminal",
          terminalCode: "TERM-SC-001",
          isConfigured: true,
        },
      },
      printingFormats: {
        receiptFormat: {
          type: "THERMAL",
          width: 58,
          paperSize: "58MM",
          orientation: "PORTRAIT",
          copies: 1,
          includeItemName: true,
          includeQuantity: true,
          includeTotal: true,
          includeLogo: false,
          includeQRCode: true,
          includeDate: true,
          headerText: "SELF CHECKOUT",
          footerText: "Visit Us Online",
        },
      },
      invoiceControls: {
        invoiceNumberPrefix: "SC-",
        invoiceStartNumber: 2001,
        invoiceCounter: 2001,
        receiptStartNumber: 6001,
        receiptCounter: 6001,
        autoResetDaily: true,
      },
      salesControls: {
        enableCreditSale: false,
        enableCashSale: false,
        enableCardSale: true,
        enableOnlinePayment: true,
        enableReturns: false,
        enableExchanges: false,
        enablePromotions: true,
        enableManualDiscount: false,
        enablePriceOverride: false,
        enableSplitPayment: false,
        enableCashback: false,
        maxItemsPerTransaction: 50,
      },
      permissions: {
        allowedUserRoles: ["CUSTOMER"],
        autoLockAfterMinutes: 5,
        enableOfflineMode: false,
      },
      connectivity: {
        ipAddress: "192.168.1.101",
        macAddress: "00:1A:2B:3C:4D:5F",
        connectionType: "WIFI",
        syncInterval: 1,
        isOnline: true,
        lastSyncTime: new Date(),
      },
      createdBy: "SEEDER",
    };

    // ========================================
    // TERMINAL 3: Customer Service (Returns)
    // ========================================
    const terminal3 = {
      terminalId: "MAIN-003",
      terminalName: "Customer Service",
      storeId: store._id,
      terminalStatus: "ACTIVE",
      hardware: {
        primaryPrinter: {
          printerModel: "DYMO",
          printerName: "DYMO_4XL",
          printerPort: "USB",
          connectionType: "USB",
          isConfigured: true,
          testStatus: "PASS",
        },
        barcodeScanner: {
          type: "HANDHELD",
          model: "Symbol DS3578",
          connectionType: "BLUETOOTH",
          isConfigured: true,
        },
      },
      printingFormats: {
        receiptFormat: {
          type: "THERMAL",
          width: 80,
          paperSize: "80MM",
          orientation: "PORTRAIT",
          includeItemName: true,
          includeQuantity: true,
          includeTotal: true,
          headerText: "RETURN RECEIPT",
        },
        invoiceFormat: {
          type: "A4",
          paperSize: "A4",
          includeVendorInfo: true,
          includeBuyerInfo: true,
          headerText: "RETURN AUTHORIZATION",
        },
      },
      invoiceControls: {
        invoiceNumberPrefix: "RMA-",
        invoiceStartNumber: 3001,
        invoiceCounter: 3001,
        autoResetMonthly: true,
      },
      salesControls: {
        enableCreditSale: false,
        enableCashSale: true,
        enableCardSale: true,
        enableReturns: true,
        enableExchanges: true,
        enableCancellations: true,
        enableManualDiscount: true,
        maxManualDiscountPercent: 20,
        enablePriceOverride: true,
      },
      permissions: {
        allowedUserRoles: ["ADMIN", "MANAGER", "CUSTOMER_SERVICE"],
        autoLockAfterMinutes: 60,
        requireBiometricAuth: false,
        enableOfflineMode: true,
      },
      connectivity: {
        ipAddress: "192.168.1.102",
        macAddress: "00:1A:2B:3C:4D:60",
        connectionType: "WIFI",
        syncInterval: 10,
        isOnline: true,
      },
      createdBy: "SEEDER",
    };

    // ========================================
    // INSERT TERMINALS
    // ========================================
    
    // Delete existing terminals first
    const existingCount = await TerminalManagement.deleteMany({
      storeId: store._id,
    });
    console.log(`\n🗑️ Deleted ${existingCount.deletedCount} existing terminals`);

    // Insert new terminals
    const result = await TerminalManagement.insertMany([
      terminal1,
      terminal2,
      terminal3,
    ]);

    console.log(
      `\n✅ Successfully seeded ${result.length} terminals:\n`
    );

    result.forEach((terminal, index) => {
      console.log(`  ${index + 1}. ${terminal.terminalId} - ${terminal.terminalName}`);
      console.log(
        `     Hardware: ${Object.keys(terminal.hardware).filter(k => terminal.hardware[k]?.isConfigured).length} devices`
      );
      console.log(`     Status: ${terminal.terminalStatus}`);
      console.log(`     Online: ${terminal.connectivity.isOnline ? "🟢" : "🔴"}`);
      console.log();
    });

    // ========================================
    // SUMMARY
    // ========================================
    console.log("═".repeat(80));
    console.log("📊 SEEDING SUMMARY");
    console.log("═".repeat(80));
    console.log(`\n✅ Repository: TerminalManagement`);
    console.log(`✅ Documents Inserted: ${result.length}`);
    console.log(`✅ Store: ${store.storeName}`);
    console.log("\n📋 Terminals Created:");
    console.log("   1. MAIN-001 (Main Counter) - Full Features");
    console.log("      └─ Printers: ZEBRA + BROTHER");
    console.log("      └─ Hardware: Scanner + Scale + Display + Cash Drawer");
    console.log("      └─ Features: All enabled");
    console.log("\n   2. MAIN-002 (Self Checkout) - Limited Features");
    console.log("      └─ Printer: EPSON");
    console.log("      └─ Hardware: Fixed Scanner + Card Terminal");
    console.log("      └─ Features: Card/Online payments only");
    console.log("\n   3. MAIN-003 (Customer Service) - Returns");
    console.log("      └─ Printer: DYMO");
    console.log("      └─ Hardware: Scanner (Bluetooth)");
    console.log("      └─ Features: Returns & Exchanges");

    console.log("\n" + "═".repeat(80));
    console.log("✨ Seeding Complete!");
    console.log("═".repeat(80));

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    process.exit(1);
  }
}

seedTerminals();
