# Terminal Management System - Implementation Guide

## Overview

This guide covers the new **Terminal Management Collection** - a separate, dedicated system for managing individual terminal configurations, hardware, printing formats, and sales controls.

**Why Separate?**
- ✅ **Scalability**: Manage unlimited terminals independently
- ✅ **Hardware Control**: Per-terminal printer, scale, scanner configurations
- ✅ **No Duplication**: Eliminates embedded terminal arrays in store settings
- ✅ **Individual Accountability**: Track which terminal processed each transaction
- ✅ **Flexible Updates**: Change terminal config without affecting store settings
- ✅ **Health Monitoring**: Monitor each terminal's connectivity and hardware status

---

## Database Structure

### Before (StoreSettings - Old Approach)
```javascript
StoreSettings = {
  storeName: "Main Store",
  storeCode: "STORE-001",
  printerModel: "ZEBRA",  // ❌ Single printer for all terminals
  printerPort: "COM1",
  terminalSettings: [      // ❌ Nested array - not scalable
    {
      terminalId: "T1",
      terminalName: "Counter 1",
      invoiceNumberPrefix: "C1-",
      enableCreditSale: true,
      enableReturns: true
    }
  ]
}
```

### After (Terminal Management - New Approach)
✅ **Separate Collection for Each Terminal**

```javascript
TerminalManagement = {
  terminalId: "POS-001",
  terminalName: "Main Counter",
  storeId: ObjectId("..."),
  organizationId: ObjectId("..."),
  
  // ✅ Terminal-specific hardware
  hardware: {
    primaryPrinter: {
      printerModel: "ZEBRA",
      printerPort: "LPT1",
      connectionType: "USB",
      testStatus: "PASS"
    },
    labelPrinter: {
      printerModel: "BROTHER",
      printerPort: "COM1"
    },
    barcodeScanner: { ... },
    weightScale: { ... },
    cashDrawer: { ... }
  },
  
  // ✅ Terminal-specific printing formats
  printingFormats: {
    receiptFormat: {
      type: "THERMAL",
      width: 80,
      paperSize: "80MM",
      includeBarcode: true
    },
    invoiceFormat: {
      type: "A4",
      width: 210,
      includeQRCode: true
    },
    labelFormat: { ... }
  },
  
  // ✅ Terminal-specific controls
  salesControls: {
    enableCreditSale: true,
    enableCardSale: true,
    enableManualDiscount: false,
    maxManualDiscountPercent: 10
  },
  
  // ✅ Terminal-specific invoice numbering
  invoiceControls: {
    invoiceNumberPrefix: "T1-",
    invoiceCounter: 5001,
    receiptStartNumber: 1001
  }
}
```

---

## API Endpoints

### Terminal CRUD Operations

#### Create Terminal
```bash
POST /api/terminals/create
Content-Type: application/json

{
  "terminalId": "POS-001",
  "terminalName": "Main Counter",
  "storeId": "507f1f77bcf86cd799439011",
  "organizationId": "507f2f77bcf86cd799439012",
  "hardware": {
    "primaryPrinter": {
      "printerModel": "ZEBRA",
      "printerPort": "LPT1",
      "connectionType": "USB"
    }
  },
  "printingFormats": {
    "receiptFormat": {
      "type": "THERMAL",
      "width": 80
    }
  },
  "salesControls": {
    "enableCreditSale": true,
    "enableManualDiscount": false
  }
}
```

#### Get All Terminals for Store
```bash
GET /api/terminals/store/507f1f77bcf86cd799439011
```

Response:
```json
{
  "success": true,
  "count": 3,
  "data": [
    { "terminalId": "POS-001", "terminalName": "Main Counter", ... },
    { "terminalId": "POS-002", "terminalName": "Billing Point 2", ... },
    { "terminalId": "POS-003", "terminalName": "Online Counter", ... }
  ]
}
```

#### Get Specific Terminal
```bash
GET /api/terminals/POS-001
```

#### Update Terminal Configuration
```bash
PUT /api/terminals/POS-001
Content-Type: application/json

{
  "terminalName": "Main Counter - Updated",
  "terminalStatus": "ACTIVE"
}
```

#### Delete Terminal
```bash
DELETE /api/terminals/POS-001
```

---

### Hardware Management Endpoints

#### Update Hardware Configuration
```bash
PUT /api/terminals/POS-001/hardware
Content-Type: application/json

{
  "hardware": {
    "primaryPrinter": {
      "printerModel": "ZEBRA",
      "printerPort": "LPT1",
      "connectionType": "USB",
      "isConfigured": true
    },
    "labelPrinter": {
      "printerModel": "BROTHER",
      "printerPort": "COM1",
      "isConfigured": true
    },
    "barcodeScanner": {
      "type": "HANDHELD",
      "model": "Symbol DS3578",
      "connectionType": "USB",
      "isConfigured": true
    },
    "weightScale": {
      "enabled": true,
      "model": "METTLER TOLEDO",
      "connectionType": "SERIAL",
      "port": "COM1",
      "precision": 2,
      "isConfigured": true
    },
    "customerDisplay": {
      "enabled": true,
      "model": "EPSON DM-D110",
      "connectionType": "USB",
      "isConfigured": true
    },
    "cashDrawer": {
      "enabled": true,
      "model": "Star Micronics",
      "connectionType": "PARALLEL",
      "isConfigured": true
    }
  }
}
```

#### Test Printer Connection
```bash
POST /api/terminals/POS-001/hardware/test-printer
Content-Type: application/json

{
  "printerType": "primaryPrinter"
}
```

Response:
```json
{
  "success": true,
  "testStatus": "PASS",
  "message": "Printer connection successful",
  "printer": {
    "printerModel": "ZEBRA",
    "testStatus": "PASS",
    "lastTestDate": "2026-04-14T10:30:00Z"
  }
}
```

---

### Printing Formats Management

#### Update Printing Formats
```bash
PUT /api/terminals/POS-001/printing-formats
Content-Type: application/json

{
  "printingFormats": {
    "receiptFormat": {
      "type": "THERMAL",
      "width": 80,
      "paperSize": "80MM",
      "orientation": "PORTRAIT",
      "copies": 1,
      "includeItemName": true,
      "includeItemCode": true,
      "includeQuantity": true,
      "includeUnitPrice": true,
      "includeDiscount": true,
      "includeTax": true,
      "includeTotal": true,
      "includeLogo": true,
      "includeQRCode": false,
      "includeBarcode": false,
      "includeStoreInfo": true,
      "includeTerminalInfo": true,
      "headerText": "Thank You for Shopping!",
      "footerText": "Visit again soon!"
    },
    "invoiceFormat": {
      "type": "A4",
      "width": 210,
      "paperSize": "A4",
      "orientation": "PORTRAIT",
      "copies": 1,
      "includeVendorInfo": true,
      "includeBuyerInfo": true,
      "includeInvoiceNumber": true,
      "includeHSN": true,
      "includeTax": true,
      "footerText": "E. & O.E."
    },
    "labelFormat": {
      "type": "SMALL_LABEL",
      "width": 50,
      "height": 40,
      "includeBarcode": true,
      "barcodeType": "EAN13",
      "includePrice": true,
      "includeName": true
    }
  }
}
```

---

### Sales Controls Management

#### Update Sales Controls
```bash
PUT /api/terminals/POS-001/sales-controls
Content-Type: application/json

{
  "salesControls": {
    "enableCreditSale": true,
    "enableCashSale": true,
    "enableCardSale": true,
    "enableOnlinePayment": true,
    "enableReturns": true,
    "enableExchanges": true,
    "enablePromotions": true,
    "enableManualDiscount": false,
    "maxManualDiscountPercent": 5,
    "requireManagerApprovalAbove": 500,
    "enablePriceOverride": false,
    "enableSplitPayment": true,
    "enableCashback": false,
    "maxItemsPerTransaction": 0,
    "maxLineItems": 0
  }
}
```

**Example Scenarios:**

Terminal 1 (Main Counter):
```json
{
  "enableManualDiscount": true,
  "maxManualDiscountPercent": 10,
  "requireManagerApprovalAbove": 1000
}
```

Terminal 2 (Self Checkout):
```json
{
  "enableCreditSale": false,
  "enableCardSale": true,
  "enableManualDiscount": false,
  "requireManagerApprovalAbove": 0
}
```

Terminal 3 (Online Orders):
```json
{
  "enablePriceOverride": true,
  "enableSplitPayment": true,
  "enableCashback": true
}
```

---

### Invoice/Receipt Numbering

#### Update Invoice Controls
```bash
PUT /api/terminals/POS-001/invoice-controls
Content-Type: application/json

{
  "invoiceControls": {
    "invoiceNumberPrefix": "T1-",
    "invoiceStartNumber": 1001,
    "invoiceNumberFormat": "INV-T1-YYMMDD-XXXXX",
    "receiptNumberPrefix": "RC-",
    "receiptStartNumber": 5001,
    "autoResetDaily": true,
    "autoResetMonthly": false
  }
}
```

#### Get Next Invoice Number
```bash
GET /api/terminals/POS-001/invoice/next-number
```

Response:
```json
{
  "success": true,
  "invoiceNumber": "T1-1002",
  "data": {
    "terminalId": "POS-001",
    "invoiceNumber": 1002,
    "prefix": "T1-",
    "format": "INV-T1-YYMMDD-XXXXX"
  }
}
```

---

### Terminal Status & Connectivity

#### Update Terminal Status
```bash
PATCH /api/terminals/POS-001/status
Content-Type: application/json

{
  "terminalStatus": "MAINTENANCE"
}
```

Valid statuses: `ACTIVE`, `INACTIVE`, `MAINTENANCE`, `OFFLINE`

#### Update Connectivity Status
```bash
PATCH /api/terminals/POS-001/connectivity
Content-Type: application/json

{
  "isOnline": true,
  "ipAddress": "192.168.1.100",
  "macAddress": "00:1A:2B:3C:4D:5E"
}
```

#### Get Terminal Health
```bash
GET /api/terminals/POS-001/health
```

Response:
```json
{
  "success": true,
  "data": {
    "terminalId": "POS-001",
    "terminalStatus": "ACTIVE",
    "healthScore": 95,
    "isHealthy": true,
    "issues": [],
    "connectivity": {
      "isOnline": true,
      "ipAddress": "192.168.1.100",
      "lastSyncTime": "2026-04-14T10:45:30Z"
    },
    "hardware": {
      "primaryPrinter": "PASS",
      "labelPrinter": "PASS"
    }
  }
}
```

---

### Hardware Fault Management

#### Log Hardware Fault
```bash
POST /api/terminals/POS-001/faults
Content-Type: application/json

{
  "hardwareType": "PRIMARY_PRINTER",
  "faultDescription": "Paper jam detected",
  "notes": "Cleared jam, ran test print successfully"
}
```

#### Resolve Hardware Fault
```bash
PATCH /api/terminals/POS-001/faults/607f2c5d5d5d5d5d5d5d5d5d/resolve
```

---

## Integration with Existing Systems

### 1. Update Sales Invoice to Use Terminal

**Before (Uses Store Settings):**
```javascript
const storeSettings = await StoreSettings.findOne({ storeCode });
const invoiceFormat = storeSettings.terminalSettings[0]?.invoiceFormat || "STANDARD";
```

**After (Uses Terminal Management):**
```javascript
const terminal = await TerminalManagement.findOne({ terminalId: req.body.terminalId });
const invoiceFormat = terminal.printingFormats.receiptFormat.type;
const printingConfig = terminal.printingFormats.receiptFormat;

// Get next invoice number (auto-incremented)
const nextInvoice = await getNextInvoiceNumber(terminal.terminalId);
```

### 2. Update POS to Get Terminal Config

```javascript
// Get all configurations for a terminal
const terminalConfig = await TerminalManagement.findOne({ terminalId });

// Use hardware config for printer
const printerConfig = terminalConfig.hardware.primaryPrinter;

// Use sales controls for this transaction
const canApplyDiscount = terminalConfig.salesControls.enableManualDiscount;
const maxDiscount = terminalConfig.salesControls.maxManualDiscountPercent;

// Use printing format for receipt
const receiptFormat = terminalConfig.printingFormats.receiptFormat;
```

### 3. Track Terminal with Every Transaction

```javascript
// When creating sales invoice
const invoice = {
  invoiceNumber: nextInvoiceNo,
  terminalId: "POS-001",  // ← Track which terminal
  terminalName: "Main Counter",
  timestamp: new Date(),
  ...otherData
};

// When creating GRN
const grn = {
  grnNumber: nextGRNNo,
  terminalId: "POS-001",  // ← If entered via POS
  ...otherData
};
```

---

## Migration Path: StoreSettings → TerminalManagement

### Step 1: Export Terminal Data from StoreSettings
```javascript
// Get all terminals from store settings
const storeSettings = await StoreSettings.find({});
const allTerminals = [];

storeSettings.forEach(store => {
  store.terminalSettings?.forEach(terminal => {
    allTerminals.push({
      terminalId: terminal.terminalId,
      terminalName: terminal.terminalName,
      storeId: store._id,
      invoiceControls: {
        invoiceNumberPrefix: terminal.invoiceNumberPrefix,
        invoiceCounter: terminal.invoiceCounter || 1001
      },
      salesControls: {
        enableCreditSale: terminal.enableCreditSale,
        enableReturns: terminal.enableReturns,
        enablePromotions: terminal.enablePromotions
      },
      hardware: {
        primaryPrinter: {
          printerModel: store.printerModel,
          printerPort: store.printerPort,
          isConfigured: true
        }
      },
      printingFormats: {
        receiptFormat: {
          type: terminal.invoiceFormat || "STANDARD"
        }
      }
    });
  });
});
```

### Step 2: Bulk Insert into TerminalManagement
```javascript
await TerminalManagement.insertMany(allTerminals);
```

### Step 3: Update Controllers to Use Terminal Management
```javascript
// Old code
const invoiceNo = ++storeSettings.terminalSettings[0].invoiceCounter;

// New code
const invoiceNo = await TerminalManagement.getNextInvoiceNumber(terminalId);
```

### Step 4: Remove Terminal Array from StoreSettings (Optional)
```javascript
// After migration, you can remove terminalSettings from StoreSettings
// Or keep as reference (read-only)
await StoreSettings.updateMany(
  {},
  { $unset: { terminalSettings: 1 } }
);
```

---

## Configuration Examples

### Example 1: Multi-Terminal Store
```javascript
// Store "MAIN-STORE" has 3 terminals

// Terminal 1: Main Counter (Full Features)
{
  terminalId: "MAIN-001",
  terminalName: "Main Counter",
  salesControls: {
    enableCreditSale: true,
    enableManualDiscount: true,
    maxManualDiscountPercent: 10,
    requireManagerApprovalAbove: 1000
  },
  printingFormats: {
    receiptFormat: { type: "THERMAL" },
    invoiceFormat: { type: "A4" }
  }
}

// Terminal 2: Self Checkout (Limited Features)
{
  terminalId: "MAIN-002",
  terminalName: "Self Checkout",
  salesControls: {
    enableCreditSale: false,
    enableCardSale: true,
    enableManualDiscount: false,
    enableReturns: false
  },
  hardware: {
    barcodeScanner: { type: "FIXED", enabled: true },
    paymentTerminal: { provider: "SQUARE", enabled: true }
  }
}

// Terminal 3: Customer Service (Returns Only)
{
  terminalId: "MAIN-003",
  terminalName: "Customer Service",
  salesControls: {
    enableCreditSale: false,
    enableReturns: true,
    enableExchanges: true,
    enableCancellations: true
  }
}
```

### Example 2: Multi-Branch Organization
```javascript
// Same store exists in Dubai and Muscat branches

// Dubai Terminal
{
  terminalId: "DBH-POS-001",
  organizationId: dubaiBranchId,
  terminalName: "Dubai - Main Counter",
  invoiceControls: {
    invoiceNumberPrefix: "DBH-",
    invoiceCounter: 1001
  }
}

// Muscat Terminal
{
  terminalId: "MSH-POS-001",
  organizationId: muscatBranchId,
  terminalName: "Muscat - Main Counter",
  invoiceControls: {
    invoiceNumberPrefix: "MSH-",
    invoiceCounter: 1001
  }
}
```

---

## Best Practices

### 1. Naming Convention
```
❌ BAD:   T1, Terminal, POS
✅ GOOD:  POS-001, COUNTER-MAIN, SELF-CHECKOUT-01, RETURNS-DESK
```

### 2. Hardware Validation
```javascript
// Before allowing transactions, validate hardware
const terminal = await TerminalManagement.findOne({ terminalId });
if (terminal.hardware.primaryPrinter.testStatus !== "PASS") {
  // Alert user to test printer
}
```

### 3. Invoice Counter Management
```javascript
// Always use getNextInvoiceNumber() instead of manual increment
const nextNo = await getNextInvoiceNumber(terminalId);
// This ensures thread-safe counter increment
```

### 4. Terminal Health Monitoring
```javascript
// Periodically check terminal health
const health = await getTerminalHealth(terminalId);
if (health.healthScore < 50) {
  // Send alert to admin
}
```

### 5. Hardware Fault Tracking
```javascript
// Log failures immediately
await logHardwareFault(terminalId, {
  hardwareType: "PRINTER",
  faultDescription: "Print job failed",
  notes: "Will retry in 5 minutes"
});
```

---

## Summary

| Aspect | Before (StoreSettings) | After (TerminalManagement) |
|--------|----------------------|--------------------------|
| **Scalability** | Limited (array in store) | Unlimited (separate docs) |
| **Hardware Config** | Store-wide only | Per-terminal |
| **Printing Formats** | Store-wide only | Per-terminal |
| **Sales Controls** | Limited per terminal | Comprehensive per terminal |
| **Invoice Numbering** | Manual management | Auto-incremented per terminal |
| **Health Monitoring** | Not available | Full monitoring |
| **Fault Tracking** | Manual logging | Built-in fault system |
| **Performance** | Slower (nested queries) | Faster (dedicated collection) |

**Result:** ✅ Better management, more flexibility, scalability, and individual terminal accountability!
