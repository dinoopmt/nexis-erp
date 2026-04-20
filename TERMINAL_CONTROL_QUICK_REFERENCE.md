# Terminal Control System - Quick Reference

## 🎯 Common Tasks

### Task 1: Show Button Only If Allowed by Terminal
```jsx
import { useTerminalFeature } from '../context/TerminalContext';

// In component:
const allowReturns = useTerminalFeature('allowReturns');

if (allowReturns) {
  <button>Process Return</button>
}
```

### Task 2: Validate Discount Amount
```jsx
import { useTerminalDiscount } from '../context/TerminalContext';

const { maxDiscount, validate } = useTerminalDiscount();

// Check if discount is valid:
const result = validate(discountAmount);
if (!result.valid) {
  console.error(result.error);  // Discount exceeds maximum
}
if (result.requiresApproval) {
  console.warn(result.message); // Needs manager approval
}
```

### Task 3: Get Printer Name & Print
```jsx
import { useTerminalPrinter } from '../context/TerminalContext';
import { printInvoice } from '../services/SmartPrintService';
import { useTerminal } from '../context/TerminalContext';

const { terminalConfig } = useTerminal();
const printer = useTerminalPrinter('invoicePrinter');

// Print invoice
await printInvoice(invoiceData, terminalConfig);
// Result will be: auto-print or browser dialog
```

### Task 4: Test Printer Connection
```jsx
import { testPrinter } from '../services/SmartPrintService';

const result = await testPrinter('HP_LaserJet_Pro');
if (result.success) {
  alert('Printer OK');
} else {
  alert(`Printer Error: ${result.error}`);
}
```

### Task 5: Get All Terminal Info
```jsx
import { useTerminal } from '../context/TerminalContext';

const { terminalConfig } = useTerminal();

// Access:
terminalConfig.terminalId      // e.g. "TERM-001"
terminalConfig.terminalName    // e.g. "Main Counter"
terminalConfig.terminalType    // "SALES" or "BACKOFFICE"
terminalConfig.terminalStatus  // "ACTIVE", "INACTIVE", etc.
terminalConfig.salesControls   // { allowReturns, allowDiscounts, ... }
terminalConfig.hardwareMapping // { invoicePrinter, barcodePrinter, ... }
terminalConfig.formatMapping   // { invoice, deliveryNote, ... }
```

---

## 📦 Hook/Function Reference

### Hooks
| Hook | Returns | Usage |
|------|---------|-------|
| `useTerminal()` | `{ terminalConfig, isLoading, error, refetch }` | Get all terminal data |
| `useTerminalFeature(name)` | `boolean` | Check if feature enabled |
| `useTerminalPrinter(type)` | `{ enabled, printerName, timeout }` | Get printer config |
| `useTerminalDiscount()` | `{ maxDiscount, requireApprovalAbove, validate() }` | Discount validation |

### Services
| Function | Params | Returns | Purpose |
|----------|--------|---------|---------|
| `printInvoice()` | `(data, config, opts)` | `Promise` | Smart print to terminal printer |
| `sendPrintJob()` | `(data, config)` | `Promise` | Send to backend printer |
| `testPrinter()` | `(printerName)` | `Promise` | Test printer connection |
| `getPrinterStatus()` | `(printerName)` | `Promise` | Get printer status |
| `getPrintJobConfig()` | `(config, data, type)` | `Object` | Get print config |
| `shouldAutoPrint()` | `(config)` | `boolean` | Check if auto-print enabled |

---

## 🎨 Terminal Controls Reference

### Sales Controls
```javascript
{
  allowReturns: true,           // Can process returns?
  allowDiscounts: true,         // Can apply discounts?
  allowCredits: true,           // Can use credit payment?
  allowExchanges: true,         // Can process exchanges?
  allowPromotions: true,        // Can use promo codes?
  maxDiscount: 15,              // Max discount %
  requireApprovalAbove: 10      // Approval needed above %
}
```

### Hardware Mapping
```javascript
{
  invoicePrinter: {
    enabled: true,
    printerName: "HP_LaserJet_Pro",
    timeout: 5000
  },
  barcodePrinter: {
    enabled: true,
    printerName: "Zebra_LP2844",
    timeout: 5000
  },
  customerDisplay: {
    enabled: true,
    displayType: "VFD"
  }
}
```

---

## ⚙️ Implementation Pattern

### For SalesInvoice Component
```jsx
export function SalesInvoice() {
  // 1. Get terminal config
  const { terminalConfig } = useTerminal();
  const allowReturns = useTerminalFeature('allowReturns');
  const { validate: validateDiscount } = useTerminalDiscount();
  
  // 2. Use in handlers
  const handleApplyDiscount = (amount) => {
    const result = validateDiscount(amount);
    if (!result.valid) {
      showError(result.error);
      return;
    }
    applyDiscount(amount);
  };

  const handlePrint = async (invoice) => {
    const result = await printInvoice(invoice, terminalConfig);
    if (result.success) {
      showSuccess(`Printed via ${result.method}`);
    }
  };

  // 3. Render with controls
  return (
    <div>
      {allowReturns && <ReturnButton />}
      <DiscountInput onApply={handleApplyDiscount} />
      <PrintButton onClick={() => handlePrint(currentInvoice)} />
    </div>
  );
}
```

---

## 🔍 Debugging Checklist

- [ ] Terminal config loads (check console)
- [ ] `terminalConfig` object has all properties
- [ ] Auth token exists in localStorage
- [ ] Printer name is correct in terminal config
- [ ] Printer is set to `enabled: true`
- [ ] Backend print endpoints are implemented
- [ ] Terminal management routes are mounted on server

---

## 📞 Support

For detailed implementation guide, see: `TERMINAL_UI_CONTROL_IMPLEMENTATION.md`
