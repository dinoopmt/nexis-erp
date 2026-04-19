# Terminal Format Mapping Structure Migration Guide

## Overview

The terminal configuration structure has been simplified to separate **template selection** from **business logic**. This makes the data model cleaner and easier to maintain.

---

## Before & After

### BEFORE (Bloated Structure)
```javascript
formatMapping: {
  invoice: {
    enabled: true,              // ❌ Business logic mixed in
    templateId: ObjectId,
    printOnSale: true,          // ❌ Business logic mixed in
    copies: 1                   // ❌ Business logic mixed in
  },
  deliveryNote: {
    enabled: false,             // ❌ Business logic mixed in
    templateId: ObjectId,
    requiresSignature: false    // ❌ Business logic mixed in
  },
  quotation: {
    enabled: false,             // ❌ Business logic mixed in
    templateId: ObjectId,
    validityDays: 30            // ❌ Business logic mixed in
  },
  salesOrder: {
    enabled: false,             // ❌ Business logic mixed in
    templateId: ObjectId,
    requiresApproval: false     // ❌ Business logic mixed in
  },
  salesReturn: {
    enabled: true,              // ❌ Business logic mixed in
    templateId: ObjectId,
    requiresReason: true        // ❌ Business logic mixed in
  }
}
```

### AFTER (Simplified & Separated)

#### formatMapping - Templates Only
```javascript
// ✅ Clean: Only template references
formatMapping: {
  invoice: {
    templateId: ObjectId
  },
  deliveryNote: {
    templateId: ObjectId
  },
  quotation: {
    templateId: ObjectId
  },
  salesOrder: {
    templateId: ObjectId
  },
  salesReturn: {
    templateId: ObjectId
  }
}
```

#### documentSettings - Business Logic & Options
```javascript
// ✅ Clean: All business logic separated
documentSettings: {
  invoice: {
    enabled: true,
    printOnSale: true,
    copies: 1
  },
  deliveryNote: {
    enabled: false,
    requiresSignature: false
  },
  quotation: {
    enabled: false,
    validityDays: 30
  },
  salesOrder: {
    enabled: false,
    requiresApproval: false
  },
  salesReturn: {
    enabled: true,
    requiresReason: true
  }
}
```

---

## Database Document Example

### New Terminal (With Migration)
```json
{
  "_id": ObjectId("69e3a361dc41140a4635b86f"),
  "terminalId": "BACKOFFICE-DEFAULT",
  "terminalName": "Default Backoffice",
  "terminalType": "BACKOFFICE",
  "storeId": ObjectId("69d447360a8d4ec24b698970"),
  "terminalStatus": "ACTIVE",
  
  "invoiceControls": {
    "invoiceNumberPrefix": "BO",
    "invoiceFormat": "STANDARD"
  },
  
  "formatMapping": {
    "invoice": {
      "templateId": ObjectId("...")
    },
    "deliveryNote": {
      "templateId": null
    },
    "quotation": {
      "templateId": null
    },
    "salesOrder": {
      "templateId": null
    },
    "salesReturn": {
      "templateId": null
    }
  },
  
  "documentSettings": {
    "invoice": {
      "enabled": true,
      "printOnSale": true,
      "copies": 1
    },
    "deliveryNote": {
      "enabled": false,
      "requiresSignature": false
    },
    "quotation": {
      "enabled": false,
      "validityDays": 30
    },
    "salesOrder": {
      "enabled": false,
      "requiresApproval": false
    },
    "salesReturn": {
      "enabled": true,
      "requiresReason": true
    }
  },
  
  "hardwareMapping": {
    "invoicePrinter": {
      "enabled": true,
      "printerName": "EPSON TM-T88V",
      "timeout": 5000
    },
    "barcodePrinter": {
      "enabled": false,
      "printerName": "",
      "timeout": 5000
    },
    "customerDisplay": {
      "enabled": false,
      "displayType": "VFD",
      "comPort": "COM1",
      "vfdModel": "VFD_20X2",
      "baudRate": 9600,
      "displayItems": true,
      "displayPrice": true,
      "displayTotal": true,
      "displayDiscount": true
    }
  },
  
  "createdBy": "SYSTEM",
  "createdAt": ISODate("2026-04-18T15:29:37.684Z"),
  "updatedAt": ISODate("2026-04-19T01:16:46.204Z"),
  "updatedBy": "SYSTEM"
}
```

---

## API Payload Structure

### Create Terminal
```javascript
POST /api/terminals

{
  "terminalId": "TERM-ABC123DEF456-001",
  "terminalName": "Counter 1",
  "terminalType": "SALES",
  "storeId": "ObjectId",
  "organizationId": "ObjectId",
  
  "invoiceControls": {
    "invoiceNumberPrefix": "C1"
  },
  
  "formatMapping": {
    "invoice": { "templateId": "ObjectId" },
    "deliveryNote": { "templateId": null },
    "quotation": { "templateId": null },
    "salesOrder": { "templateId": null },
    "salesReturn": { "templateId": null }
  },
  
  "documentSettings": {
    "invoice": {
      "enabled": true,
      "printOnSale": true,
      "copies": 1
    },
    "deliveryNote": {
      "enabled": false,
      "requiresSignature": false
    },
    "quotation": {
      "enabled": false,
      "validityDays": 30
    },
    "salesOrder": {
      "enabled": false,
      "requiresApproval": false
    },
    "salesReturn": {
      "enabled": true,
      "requiresReason": true
    }
  },
  
  "hardwareMapping": {
    "invoicePrinter": {
      "enabled": true,
      "printerName": "EPSON TM-T88V",
      "timeout": 5000
    },
    "barcodePrinter": {
      "enabled": false,
      "printerName": "",
      "timeout": 5000
    },
    "customerDisplay": {
      "enabled": false,
      "displayType": "VFD",
      "comPort": "COM1",
      "vfdModel": "VFD_20X2",
      "baudRate": 9600,
      "displayItems": true,
      "displayPrice": true,
      "displayTotal": true,
      "displayDiscount": true
    }
  }
}
```

### Update Terminal
```javascript
PUT /api/terminals/{terminalId}

{
  "terminalName": "Updated Name",
  "terminalType": "SALES",
  "invoiceControls": { ... },
  "formatMapping": { ... },
  "documentSettings": { ... },
  "hardwareMapping": { ... }
}
```

---

## Frontend Form Structure

### Initial State
```javascript
const [formData, setFormData] = useState({
  terminalId: '',
  terminalName: '',
  terminalType: 'SALES',
  
  invoiceControls: {
    invoiceNumberPrefix: '',
  },
  
  formatMapping: {
    invoice: { templateId: null },
    deliveryNote: { templateId: null },
    quotation: { templateId: null },
    salesOrder: { templateId: null },
    salesReturn: { templateId: null },
  },
  
  documentSettings: {
    invoice: {
      enabled: true,
      printOnSale: true,
      copies: 1,
    },
    deliveryNote: {
      enabled: false,
      requiresSignature: false,
    },
    quotation: {
      enabled: false,
      validityDays: 30,
    },
    salesOrder: {
      enabled: false,
      requiresApproval: false,
    },
    salesReturn: {
      enabled: true,
      requiresReason: true,
    },
  },
  
  hardwareMapping: {
    invoicePrinter: {
      enabled: true,
      printerName: '',
      timeout: 5000,
    },
    barcodePrinter: {
      enabled: false,
      printerName: '',
      timeout: 5000,
    },
    customerDisplay: {
      enabled: false,
      displayType: 'VFD',
      comPort: '',
      vfdModel: 'VFD_20X2',
      baudRate: 9600,
      displayItems: true,
      displayPrice: true,
      displayTotal: true,
      displayDiscount: true,
    },
  },
})
```

### Form Tabs
1. **Basic Info** - Terminal ID, Name, Type
2. **Document Formats** - Format selection + enable/disable + options per document type
3. **Hardware** - Printer and display configuration

---

## Migration from Old Structure

### Automatic Migration (On Form Load)
The form automatically detects old data and migrates it:

```javascript
// If old data has: formatMapping.invoice.enabled
// Extract to: documentSettings.invoice.enabled
// Keep only templateId in formatMapping.invoice
```

### Data Migration Handling
1. Extract `enabled`, `printOnSale`, `copies` from old formatMapping into documentSettings
2. Keep only `templateId` in formatMapping
3. Auto-migrate old hardwareMapping.printer to invoicePrinter
4. Preserve all template references

---

## Default Values by Terminal Type

### SALES Terminal Defaults
```javascript
{
  formatMapping: {
    invoice: { templateId: null },
    deliveryNote: { templateId: null },
    quotation: { templateId: null },
    salesOrder: { templateId: null },
    salesReturn: { templateId: null },
  },
  documentSettings: {
    invoice: { enabled: true, printOnSale: true, copies: 1 },
    deliveryNote: { enabled: false, requiresSignature: false },
    quotation: { enabled: false, validityDays: 30 },
    salesOrder: { enabled: false, requiresApproval: false },
    salesReturn: { enabled: true, requiresReason: true },
  },
  hardwareMapping: {
    invoicePrinter: { enabled: true, printerName: '', timeout: 5000 },
    barcodePrinter: { enabled: false, printerName: '', timeout: 5000 },
    customerDisplay: { enabled: false, displayType: 'VFD', ... },
  },
}
```

### BACKOFFICE Terminal Defaults
```javascript
{
  formatMapping: {
    invoice: { templateId: null },
    deliveryNote: { templateId: null },
    quotation: { templateId: null },
    salesOrder: { templateId: null },
    salesReturn: { templateId: null },
  },
  documentSettings: {
    invoice: { enabled: true, printOnSale: false, copies: 1 },
    deliveryNote: { enabled: false, requiresSignature: false },
    quotation: { enabled: false, validityDays: 30 },
    salesOrder: { enabled: false, requiresApproval: false },
    salesReturn: { enabled: true, requiresReason: true },
  },
  hardwareMapping: {
    invoicePrinter: { enabled: false, printerName: '', timeout: 5000 },
    barcodePrinter: { enabled: false, printerName: '', timeout: 5000 },
    customerDisplay: { enabled: false, displayType: 'VFD', ... },
  },
}
```

---

## Benefits of New Structure

| Aspect | Before | After |
|--------|--------|-------|
| **Data Size** | Large (mixed logic) | Smaller (separated) |
| **Clarity** | Confusing | Clear separation of concerns |
| **API Payload** | Bloated | Compact |
| **Enable/Disable** | Mixed in template section | Dedicated settings section |
| **Defaults** | Hard to set globally | Easy with documentSettings |
| **Maintenance** | Complex | Simple |
| **Backward Compat** | N/A | Automatic migration |

---

## Implementation Checklist

- [x] Update Terminal model schema
- [x] Separate formatMapping and documentSettings
- [x] Update TerminalFormModal.jsx
- [x] Add migration logic for old data
- [x] Update createTerminal controller
- [x] Update updateTerminalConfig controller
- [ ] Update existing terminals in database (if needed)
- [ ] Test terminal creation flow
- [ ] Test terminal editing with old data
- [ ] Test all document type enable/disable options

---

## Testing Scenarios

### Scenario 1: Create New Terminal
✅ Should save formatMapping with templateId only
✅ Should save documentSettings with enable/disable
✅ Should save hardwareMapping with correct printer setup

### Scenario 2: Edit Existing Terminal
✅ Should migrate old data on load
✅ Should preserve all template references
✅ Should allow changing enable/disable settings
✅ Should allow changing document-specific options

### Scenario 3: Enable/Disable Documents
✅ When disabled, template selector should be disabled
✅ Document-specific options should only show when enabled
✅ Disabling should not lose template selection (can re-enable later)

### Scenario 4: Hardware Configuration
✅ Should detect installed printers
✅ Should allow multiple printer setup
✅ Should support VFD and secondary monitor displays

---

## Related Files

- [server/Models/TerminalManagement.js](../../server/Models/TerminalManagement.js) - Database schema
- [client/src/components/settings/general/TerminalFormModal.jsx](../../client/src/components/settings/general/TerminalFormModal.jsx) - Frontend form
- [server/modules/settings/controllers/terminalManagementController.js](../../server/modules/settings/controllers/terminalManagementController.js) - API controllers

---

## Future Enhancements

1. **Batch Operations** - Enable/disable multiple documents at once
2. **Templates Per Region** - Different templates based on store location
3. **Print Queue** - Manage multiple print jobs
4. **Printer Health** - Monitor printer status and connectivity
5. **Document Archive** - Track all printed documents per terminal
