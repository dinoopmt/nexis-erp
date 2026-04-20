# Terminal Controls - Available from TerminalManagement Collection

**Date:** April 20, 2026  
**Status:** ✅ DEFINITIVE REFERENCE

---

## 🎯 Rule: Only Use Controls That Exist in Database

**All terminal controls MUST come from TerminalManagement collection in MongoDB.**

If a control isn't in the database model, don't expose it in the context.

---

## 📦 Available Terminal Controls

### Sales Controls (boolean flags)

Located at: `TerminalManagement.salesControls`

```javascript
{
  allowReturns: true,           // ✅ Enable: Can process returns
  allowDiscounts: true,         // ✅ Enable: Can apply discounts (UI only)
  allowCredits: false,          // ✅ Enable: Can use credit payments
  allowExchanges: true,         // ✅ Enable: Can process exchanges
  allowPromotions: true,        // ✅ Enable: Can use promo codes
  maxDiscount: 100,             // ⚠️ DEPRECATED - use role-based
  requireApprovalAbove: 50,     // ⚠️ DEPRECATED - use role-based
}
```

### Hardware Mapping

Located at: `TerminalManagement.hardwareMapping`

```javascript
{
  invoicePrinter: {
    enabled: true,              // ✅ Is printer available?
    printerName: "HP_LaserJet_Pro",  // ✅ Printer identifier
    timeout: 5000,              // ✅ Timeout in ms
  },
  
  barcodePrinter: {
    enabled: true,
    printerName: "Zebra_LP2844",
    timeout: 5000,
  },
  
  customerDisplay: {
    enabled: false,
    displayType: "VFD",         // VFD or SECONDARY_MONITOR
    vfdModel: "VFD_20X2",
    // ... other display config
  },
}
```

### Format Mapping

Located at: `TerminalManagement.formatMapping`

```javascript
{
  invoice: {
    templateId: "ObjectId(...)",        // ✅ Invoice template
  },
  deliveryNote: {
    templateId: "ObjectId(...)",        // ✅ Delivery note template
  },
  quotation: {
    templateId: "ObjectId(...)",
  },
  salesOrder: {
    templateId: "ObjectId(...)",
  },
  salesReturn: {
    templateId: "ObjectId(...)",
  },
}
```

---

## 🔌 Available Hooks in TerminalContext

### 1. useTerminalFeature(featureName)

**Purpose:** Check if feature is allowed on terminal

**Available Feature Names:**
- `allowReturns`
- `allowDiscounts`
- `allowCredits`
- `allowExchanges`
- `allowPromotions`

**Usage:**
```jsx
const allowReturns = useTerminalFeature('allowReturns');
if (allowReturns) {
  <button>Process Return</button>
}
```

**Returns:** boolean (default: true if not found in DB)

---

### 2. useTerminalPrinter(printerType)

**Purpose:** Get printer configuration for specific printer

**Available Printer Types:**
- `'invoicePrinter'` (default)
- `'barcodePrinter'`

**Usage:**
```jsx
const printer = useTerminalPrinter('invoicePrinter');
if (printer?.enabled) {
  console.log('Printer:', printer.printerName);
}
```

**Returns:**
```javascript
{
  enabled: boolean,
  printerName: string,
  timeout: number,
}
```

---

### 3. useTerminal()

**Purpose:** Get full terminal configuration

**Usage:**
```jsx
const { terminalConfig, isLoading, error } = useTerminal();

// Access any terminal field
terminalConfig.terminalId
terminalConfig.terminalName
terminalConfig.terminalType
terminalConfig.salesControls
terminalConfig.hardwareMapping
terminalConfig.formatMapping
```

**Returns:**
```javascript
{
  terminalConfig: {
    terminalId: string,
    terminalName: string,
    terminalType: "SALES" | "BACKOFFICE",
    terminalStatus: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "OFFLINE",
    salesControls: { /* from DB */ },
    hardwareMapping: { /* from DB */ },
    formatMapping: { /* from DB */ },
  },
  isLoading: boolean,
  error: string | null,
  refetch: () => Promise,
}
```

---

## ❌ Do NOT Expose

The following should NOT be exposed as terminal controls:

```javascript
// ❌ WRONG - Not in TerminalManagement model
useTerminalFeature('allowBulkDiscounts')
useTerminalFeature('requireManagerApproval')
useTerminalFeature('restrictPaymentMethods')

// ❌ WRONG - These are role-based, not terminal-based
useTerminalFeature('canApproveHighDiscounts')
useTerminalFeature('canEditProducts')
useTerminalFeature('canDeleteInvoices')
```

---

## ✅ Correct Usage Pattern

### Pattern 1: Show/Hide Based on Terminal Control

```jsx
import { useTerminalFeature } from '../context/TerminalContext';

export function SalesInvoice() {
  // These come directly from TerminalManagement DB
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  
  return (
    <div>
      {/* Show return button only if terminal allows */}
      {allowReturns && (
        <button onClick={handleReturn}>Process Return</button>
      )}
      
      {/* Show discount section only if terminal allows */}
      {allowDiscounts && (
        <DiscountSection />
      )}
    </div>
  );
}
```

### Pattern 2: Get Printer Configuration

```jsx
import { useTerminalPrinter } from '../context/TerminalContext';

export function InvoicePrinting() {
  // Get actual printer from TerminalManagement DB
  const invoicePrinter = useTerminalPrinter('invoicePrinter');
  
  if (invoicePrinter?.enabled) {
    // Send to configured printer
    sendToPrinter(invoicePrinter.printerName);
  }
}
```

### Pattern 3: Add New Terminal Feature

1. **First:** Add to TerminalManagement model in MongoDB
   ```javascript
   salesControls: {
     // ... existing controls ...
     allowNewFeature: true,  // ← Add here
   }
   ```

2. **Then:** Use in component
   ```jsx
   const allowNewFeature = useTerminalFeature('allowNewFeature');
   if (allowNewFeature) {
     <NewFeatureComponent />
   }
   ```

---

## 🔍 How to Check What's in Database

### Via MongoDB Shell
```javascript
db.terminal_management.findOne({ terminalId: "TERM-001" })
```

### Via Node.js
```javascript
const terminal = await TerminalManagement.findOne({ terminalId: "TERM-001" });
console.log(terminal.salesControls);
console.log(terminal.hardwareMapping);
```

### Via Frontend (after loading)
```jsx
const { terminalConfig } = useTerminal();
console.log(terminalConfig.salesControls);  // All available controls
console.log(terminalConfig.hardwareMapping);  // All printers
```

---

## 📋 Complete List of Exposed Controls

| Feature Name | Source | Type | Hook | Usage |
|--------------|--------|------|------|-------|
| `allowReturns` | `salesControls.allowReturns` | boolean | `useTerminalFeature` | Show returns button |
| `allowDiscounts` | `salesControls.allowDiscounts` | boolean | `useTerminalFeature` | Show discount UI |
| `allowCredits` | `salesControls.allowCredits` | boolean | `useTerminalFeature` | Show credit payment |
| `allowExchanges` | `salesControls.allowExchanges` | boolean | `useTerminalFeature` | Show exchange button |
| `allowPromotions` | `salesControls.allowPromotions` | boolean | `useTerminalFeature` | Show promo section |
| `invoicePrinter` | `hardwareMapping.invoicePrinter` | object | `useTerminalPrinter` | Get printer config |
| `barcodePrinter` | `hardwareMapping.barcodePrinter` | object | `useTerminalPrinter` | Get printer config |

---

## ⚠️ Important Notes

### Note 1: Default Behavior
- If a feature is not in the database, it defaults to `true` (allowed)
- This ensures backward compatibility with older terminal configs

### Note 2: Role-Based NOT Terminal-Based
- **Discount validation** is ROLE-BASED (from user.role)
- **Discount UI** visibility is TERMINAL-BASED (from useTerminalFeature)
- These are separate concerns!

### Note 3: No Custom Features
- Only use features that exist in TerminalManagement model
- Don't add arbitrary features to the context
- If you need a new feature, add it to the database model first

---

## 🎓 Quick Summary

```
Terminal Controls = What's in TerminalManagement Database

salesControls.*           → Use with useTerminalFeature()
hardwareMapping.*         → Use with useTerminalPrinter()
formatMapping.*           → Use with useTerminal()

All other controls        → NOT exposed (not in database)
```

---

## 📚 Related Files

- **Model:** `server/Models/TerminalManagement.js`
- **Context:** `client/src/context/TerminalContext.jsx`
- **Hook:** `client/src/hooks/useTerminalConfig.js`
- **Guide:** `TERMINAL_FEATURES_VS_ROLE_BASED_CONTROLS.md`

---

## ✅ Implementation Checklist

When exposing a new terminal control:

- [ ] Exists in TerminalManagement model? (YES = proceed, NO = add first)
- [ ] Added to useTerminalFeature() or useTerminalPrinter()? 
- [ ] Documented in this file?
- [ ] Only showing in components where database check passes?
- [ ] Not confusing with role-based controls?
- [ ] Tested with actual database values?

Everything must come from the database! 🗄️
