# Terminal Management System - Integration Checklist

## ✅ Quick Start Guide

### Step 1: Database Setup
- [ ] Model created: **TerminalManagement.js**
  - Location: `server/Models/TerminalManagement.js`
  - Collection: `Terminal_Management`
  - Indexed fields: terminalId, storeId, organizationId, terminalStatus, connectivity.isOnline

### Step 2: API Layer Setup
- [ ] Controller created: **terminalManagementController.js**
  - Location: `server/modules/settings/controllers/terminalManagementController.js`
  - 16 endpoint handlers implemented

- [ ] Routes created: **terminalManagementRoutes.js**
  - Location: `server/modules/settings/routes/terminalManagementRoutes.js`
  - Ready to mount on Express app

### Step 3: Seed Sample Data
```bash
node scripts/terminal-seeder.js
```
Creates 3 sample terminals:
- MAIN-001: Main Counter (Full features)
- MAIN-002: Self Checkout (Limited features)
- MAIN-003: Customer Service (Returns)

### Step 4: Mount Routes on Express App
Add to your main server file (e.g., `server/app.js` or `server/index.js`):

```javascript
import terminalManagementRoutes from "./modules/settings/routes/terminalManagementRoutes.js";

// Mount routes
app.use("/api/terminals", terminalManagementRoutes);
```

### Step 5: Verify API Endpoints
Test the endpoints:
```bash
# Create terminal
POST http://localhost:5000/api/terminals/create

# List terminals
GET http://localhost:5000/api/terminals/store/STORE_ID

# Get terminal
GET http://localhost:5000/api/terminals/POS-001

# Test printer
POST http://localhost:5000/api/terminals/POS-001/hardware/test-printer

# Get health
GET http://localhost:5000/api/terminals/POS-001/health
```

---

## 📋 Feature Overview

### Terminal Management Features
✅ **16 API Endpoints**
```
POST   /terminals/create                          - Create terminal
GET    /terminals/store/:storeId                  - List terminals (by store)
GET    /terminals/:terminalId                     - Get terminal config
PUT    /terminals/:terminalId                     - Update terminal
DELETE /terminals/:terminalId                     - Delete terminal

PUT    /terminals/:terminalId/hardware            - Update hardware config
POST   /terminals/:terminalId/hardware/test-printer - Test printer

PUT    /terminals/:terminalId/printing-formats   - Update printing formats

PUT    /terminals/:terminalId/sales-controls     - Update sales controls

PUT    /terminals/:terminalId/invoice-controls   - Update invoice controls
GET    /terminals/:terminalId/invoice/next-number - Get next invoice (auto-increment)

PATCH  /terminals/:terminalId/status             - Update terminal status
PATCH  /terminals/:terminalId/connectivity       - Update connectivity
GET    /terminals/:terminalId/health             - Get health diagnostics

POST   /terminals/:terminalId/faults             - Log hardware fault
PATCH  /terminals/:terminalId/faults/:faultId/resolve - Resolve fault
```

### Hardware Configuration Per Terminal
✅ **Multiple Hardware Types Support:**
- Primary Printer (Receipt/Invoice)
- Label Printer (Barcode)
- Barcode Scanner
- Weight Scale
- Customer Display
- Cash Drawer
- Payment Terminal

### Printing Formats Per Terminal
✅ **3 Format Types:**
- Receipt Format (Thermal 58MM, 80MM, A4)
- Invoice Format (A4, A5, Custom)
- Label Format (Small, Medium, Large)

### Sales Controls Per Terminal
✅ **Control Options:**
- Payment types (Credit, Cash, Card, Online)
- Features (Returns, Exchanges, Cancellations)
- Promotions (Discounts, Bulk pricing)
- Price controls (Override, Manual discount)
- Quantity controls (Max items, max line items)
- Split payments & Cashback

### Terminal Activity Monitoring
✅ **Health Tracking:**
- Online/Offline status
- Hardware test results (Pass/Fail)
- Last sync time
- Hardware faults with timestamps
- Maintenance history

---

## 🔄 Integration with Existing Systems

### Sales Invoice Module
**Update to use Terminal Management:**

```javascript
// OLD CODE (Uses StoreSettings)
const storeSettings = await StoreSettings.findOne({ storeCode });
const invoiceFormat = storeSettings.printerModel;
const nextInvoice = ++storeSettings.terminalSettings[0].invoiceCounter;

// NEW CODE (Uses TerminalManagement)
const terminal = await TerminalManagement.findOne({ terminalId: req.body.terminalId });
const invoiceFormat = terminal.printingFormats.receiptFormat.type;
const nextInvoice = await TerminalManagement.getNextInvoiceNumber(terminal.terminalId);

// Store terminal info with transaction
const invoice = await SalesInvoice.create({
  invoiceNumber: nextInvoice,
  terminalId: terminal.terminalId,      // ← NEW: Track which terminal
  terminalName: terminal.terminalName,   // ← NEW: Store terminal name
  printingConfig: terminal.printingFormats.receiptFormat,  // ← NEW
  ...otherData
});
```

### POS System Integration
**Update to check terminal permissions:**

```javascript
// Check sales controls before allowing action
const terminal = await TerminalManagement.findOne({ terminalId });

if (transactionAmount > 500 && !terminal.salesControls.enableManualDiscount) {
  return res.status(400).json({
    success: false,
    message: "Manual discount not allowed at this terminal for amounts > 500"
  });
}
```

### Printing System Integration
**Update to use terminal-specific formats:**

```javascript
// OLD: Use store-wide printer settings
// NEW: Use terminal-specific printer settings

const terminal = await TerminalManagement.findOne({ terminalId });
const printerConfig = terminal.hardware.primaryPrinter;
const receiptFormat = terminal.printingFormats.receiptFormat;

generateReceipt({
  format: receiptFormat.type,
  width: receiptFormat.width,
  includeBarcode: receiptFormat.includeBarcode,
  includeQRCode: receiptFormat.includeQRCode,
  headerText: receiptFormat.headerText,
  footerText: receiptFormat.footerText
});
```

---

## 🗂️ File Structure

```
NEXIS-ERP/
├── server/
│   ├── Models/
│   │   └── TerminalManagement.js          ✅ NEW
│   ├── modules/
│   │   └── settings/
│   │       ├── controllers/
│   │       │   └── terminalManagementController.js    ✅ NEW
│   │       └── routes/
│   │           └── terminalManagementRoutes.js        ✅ NEW
│   └── app.js  (ADD ROUTE MOUNT)
│
├── scripts/
│   └── terminal-seeder.js                 ✅ NEW
│
└── TERMINAL_MANAGEMENT_GUIDE.md           ✅ NEW
```

---

## 🧪 Testing Checklist

### Test 1: Create Terminal
```bash
curl -X POST http://localhost:5000/api/terminals/create \
  -H "Content-Type: application/json" \
  -d '{
    "terminalId": "TEST-001",
    "terminalName": "Test Terminal",
    "storeId": "STORE_ID"
  }'
```
✅ Expected: Terminal created with default values

### Test 2: Get All Terminals
```bash
curl http://localhost:5000/api/terminals/store/STORE_ID
```
✅ Expected: List of all terminals for store

### Test 3: Update Hardware
```bash
curl -X PUT http://localhost:5000/api/terminals/TEST-001/hardware \
  -H "Content-Type: application/json" \
  -d '{
    "hardware": {
      "primaryPrinter": {
        "printerModel": "ZEBRA",
        "printerPort": "LPT1",
        "isConfigured": true
      }
    }
  }'
```
✅ Expected: Hardware config updated

### Test 4: Get Next Invoice Number
```bash
curl http://localhost:5000/api/terminals/TEST-001/invoice/next-number
```
✅ Expected: Auto-incremented invoice number

### Test 5: Test Printer
```bash
curl -X POST http://localhost:5000/api/terminals/TEST-001/hardware/test-printer \
  -H "Content-Type: application/json" \
  -d '{"printerType": "primaryPrinter"}'
```
✅ Expected: Test status (PASS/FAIL)

### Test 6: Get Health Status
```bash
curl http://localhost:5000/api/terminals/TEST-001/health
```
✅ Expected: Health score and issues list

### Test 7: Log Hardware Fault
```bash
curl -X POST http://localhost:5000/api/terminals/TEST-001/faults \
  -H "Content-Type: application/json" \
  -d '{
    "hardwareType": "PRIMARY_PRINTER",
    "faultDescription": "Printer offline",
    "notes": "Will troubleshoot tomorrow"
  }'
```
✅ Expected: Fault logged with timestamp

---

## 📊 Performance Considerations

### Indexes
The Terminal Management model includes indexes on:
- `terminalId` - Fast lookups by terminal
- `storeId` - Fast lookups by store
- `organizationId` - Fast lookups by branch/organization
- `terminalStatus` - Fast filtering by status
- `connectivity.isOnline` - Fast filtering by online status
- Compound: `(storeId, terminalStatus)` - Fast store + status queries

### Query Optimization
```javascript
// ✅ GOOD: Uses index
const terminals = await TerminalManagement.find({ storeId, terminalStatus: "ACTIVE" });

// ❌ SLOW: No index on this combination
const terminals = await TerminalManagement.find({ 
  "hardware.primaryPrinter.printerModel": "ZEBRA" 
});
```

### Document Size
- Average document: ~15-20KB
- Storing ~100 terminals per store: ~1.5-2MB
- Highly scalable for most use cases

---

## 🔐 Security Considerations

### API Protection
Add authentication middleware to all endpoints:
```javascript
router.use(authenticate);  // Require login
router.use(authorize(["ADMIN", "MANAGER", "STORE_MANAGER"]));  // Require role
```

### Data Validation
All endpoints validate input using Mongoose schema validation.

### Audit Trail
Track who created/updated terminals:
```javascript
terminal.createdBy = req.user._id;
terminal.updatedBy = req.user._id;
```

---

## 🧩 Extending the System

### Add New Hardware Type
Update Terminal Management model:
```javascript
hardware: {
  // ... existing hardware ...
  fingerprint: {  // ← NEW
    enabled: { type: Boolean, default: false },
    model: { type: String, default: "" },
    connectionType: { type: String },
    isConfigured: { type: Boolean, default: false }
  }
}
```

### Add New Printing Format
Update Terminal Management model:
```javascript
printingFormats: {
  // ... existing formats ...
  reportFormat: {  // ← NEW
    type: { type: String, enum: ["PDF", "THERMAL", "A4"] },
    includeHeader: { type: Boolean, default: true }
  }
}
```

### Add New Sales Control
Update Terminal Management model and controller:
```javascript
salesControls: {
  // ... existing controls ...
  requireVoiceAuth: {  // ← NEW
    type: Boolean,
    default: false,
    description: "Require voice authorization for high-value transactions"
  }
}
```

---

## 📞 Support Documentation

### Common Issues

**Issue: "Terminal not found"**
- Check terminalId matches exactly (case-sensitive)
- Verify terminal exists: `GET /terminals/STORE_ID`

**Issue: "Invoice counter stuck"**
- Use atomic `$inc` operation (already implemented)
- Reset counter if needed: `PUT /terminals/T1/invoice-controls`

**Issue: "Printer test fails"**
- Verify printer is configured: `PUT /terminals/T1/hardware`
- Check printer connection
- Review hardware fault logs: Check `activityLog.hardwareFaults`

---

## ✨ Next Steps

1. **Mount routes** on Express app
2. **Run seeder** to create sample terminals
3. **Test endpoints** using provided curl commands
4. **Integrate with Sales Invoice module**
5. **Update POS system** to use terminal config
6. **Implement printer polling** for health checks
7. **Add terminal selection** to UI forms

---

## 📈 Migration Timeline

**Week 1:**
- [ ] Mount routes on Express app
- [ ] Run seeder to create test terminals
- [ ] Verify all API endpoints working

**Week 2:**
- [ ] Update Sales Invoice module to use TerminalManagement
- [ ] Update POS system to fetch terminal config
- [ ] Test invoice numbering with terminal prefix

**Week 3:**
- [ ] Update printing system to use terminal formats
- [ ] Implement printer test functionality
- [ ] Add health monitoring dashboards

**Week 4:**
- [ ] Migrate existing terminals from StoreSettings
- [ ] Deprecate terminalSettings from StoreSettings
- [ ] Full production rollout

---

## 📚 Related Documentation

- **Full API Guide**: `TERMINAL_MANAGEMENT_GUIDE.md`
- **Model Definition**: `server/Models/TerminalManagement.js`
- **Controller Implementation**: `server/modules/settings/controllers/terminalManagementController.js`
- **Routes**: `server/modules/settings/routes/terminalManagementRoutes.js`
- **Seeder Script**: `scripts/terminal-seeder.js`

---

**Status:** ✅ Ready for Integration

All components created and ready to use. Follow the Quick Start Guide above to get started!
