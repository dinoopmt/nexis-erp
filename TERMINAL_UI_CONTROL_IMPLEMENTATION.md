# Terminal-Based UI Control & Smart Printing Implementation Guide

## 📋 Overview

This system provides:
1. **Dynamic UI Control** - Show/hide features based on terminal configuration
2. **Smart Printing** - Auto-print to configured printer or show dialog
3. **Discount Validation** - Enforce terminal-level discount limits
4. **Feature Access Control** - Enable/disable features per terminal

---

## 🏗️ Architecture

### Files Created
```
client/
  src/
    hooks/
      └── useTerminalConfig.js          # Terminal config hook
    context/
      └── TerminalContext.jsx           # Terminal context provider
    services/
      └── SmartPrintService.js          # Print job routing
```

### Files Modified
```
client/src/App.jsx                       # Added TerminalProvider
client/src/components/shared/Header.jsx  # Display terminal name
```

---

## 🔧 Usage Examples

### 1. Basic Terminal Configuration Access

```jsx
import { useTerminal } from '../context/TerminalContext';

function MyComponent() {
  const { terminalConfig, isLoading, error } = useTerminal();

  if (isLoading) return <div>Loading terminal config...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Terminal: {terminalConfig.terminalName}</h3>
      <p>Type: {terminalConfig.terminalType}</p>
      <p>Status: {terminalConfig.terminalStatus}</p>
    </div>
  );
}
```

### 2. Show/Hide Features Based on Terminal Control

```jsx
import { useTerminalFeature } from '../context/TerminalContext';

function SalesInvoice() {
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowCredits = useTerminalFeature('allowCredits');

  return (
    <div>
      {allowReturns && (
        <button className="btn">Returns</button>
      )}
      {allowDiscounts && (
        <button className="btn">Apply Discount</button>
      )}
      {allowCredits && (
        <button className="btn">Credit Payment</button>
      )}
    </div>
  );
}
```

### 3. Discount Validation

```jsx
import { useTerminalDiscount } from '../context/TerminalContext';

function DiscountField() {
  const { maxDiscount, requireApprovalAbove, validate } = useTerminalDiscount();
  const [discount, setDiscount] = React.useState(0);

  const handleDiscountChange = (value) => {
    const validation = validate(value);
    
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    if (validation.requiresApproval) {
      alert(validation.message);
      // Show manager approval dialog
    }
    
    setDiscount(value);
  };

  return (
    <div>
      <label>Discount (Max: {maxDiscount}%)</label>
      <input 
        type="number" 
        value={discount}
        onChange={(e) => handleDiscountChange(e.target.value)}
        max={maxDiscount}
      />
    </div>
  );
}
```

### 4. Smart Printing

```jsx
import { printInvoice } from '../services/SmartPrintService';
import { useTerminal } from '../context/TerminalContext';

function SalesInvoice() {
  const { terminalConfig } = useTerminal();

  const handlePrint = async (invoiceData) => {
    const result = await printInvoice(invoiceData, terminalConfig, {
      showDialog: true,
      documentType: 'invoice'
    });

    if (result.success) {
      console.log(`✅ Printed via ${result.method}`);
      // Show success message
    } else {
      console.error('❌ Print failed:', result.error);
      // Show error message
    }
  };

  return (
    <button onClick={() => handlePrint(invoiceData)}>
      Print Invoice
    </button>
  );
}
```

### 5. Auto-Print to Configured Printer

```jsx
import { printInvoice } from '../services/SmartPrintService';
import { useTerminal } from '../context/TerminalContext';

function AutoPrintCheckout() {
  const { terminalConfig } = useTerminal();

  React.useEffect(() => {
    if (invoiceCreated) {
      // Auto-print without dialog
      printInvoice(invoiceData, terminalConfig, {
        showDialog: false,  // Don't show browser dialog
        documentType: 'invoice'
      });
    }
  }, [invoiceCreated]);

  return <div>Printing...</div>;
}
```

### 6. Test Printer

```jsx
import { testPrinter } from '../services/SmartPrintService';
import { useTerminalPrinter } from '../context/TerminalContext';

function PrinterSettings() {
  const printer = useTerminalPrinter('invoicePrinter');

  const handleTestPrint = async () => {
    const result = await testPrinter(printer.printerName);
    if (result.success) {
      alert('✅ Test page printed successfully!');
    } else {
      alert(`❌ Test failed: ${result.error}`);
    }
  };

  return (
    <div>
      <p>Printer: {printer?.printerName}</p>
      <button onClick={handleTestPrint}>Test Printer</button>
    </div>
  );
}
```

---

## 📊 Terminal Configuration Structure

From TerminalManagement collection:

```javascript
{
  // Identification
  terminalId: "TERM-001",
  terminalName: "Main Counter",
  terminalType: "SALES",
  terminalStatus: "ACTIVE",

  // Sales Controls
  salesControls: {
    allowReturns: true,
    allowDiscounts: true,
    allowCredits: false,
    allowExchanges: true,
    allowPromotions: true,
    maxDiscount: 15,              // 15%
    requireApprovalAbove: 10      // > 10% needs approval
  },

  // Hardware Mapping
  hardwareMapping: {
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
      displayType: "VFD",
      vfdModel: "VFD_20X2"
    }
  },

  // Format Mapping
  formatMapping: {
    invoice: { templateId: "template-id-1" },
    deliveryNote: { templateId: "template-id-2" },
    quotation: { templateId: "template-id-3" },
    salesOrder: { templateId: "template-id-4" },
    salesReturn: { templateId: "template-id-5" }
  }
}
```

---

## 🎯 Integration Checklist for SalesInvoice Component

### Step 1: Add Terminal Context Import
```jsx
import { useTerminal, useTerminalFeature } from '../context/TerminalContext';
```

### Step 2: Hide/Show Features
```jsx
const allowReturns = useTerminalFeature('allowReturns');
const allowDiscounts = useTerminalFeature('allowDiscounts');

// Use in JSX:
{allowReturns && <ReturnButton />}
{allowDiscounts && <DiscountButton />}
```

### Step 3: Validate Discount
```jsx
import { useTerminalDiscount } from '../context/TerminalContext';

const { validate } = useTerminalDiscount();

const handleDiscountChange = (amount) => {
  const result = validate(amount);
  if (!result.valid) {
    showError(result.error);
    return;
  }
  setDiscount(amount);
};
```

### Step 4: Add Smart Printing
```jsx
import { printInvoice } from '../services/SmartPrintService';

const handlePrint = async () => {
  const result = await printInvoice(invoiceData, terminalConfig);
  if (result.success) {
    showSuccess(`Printed via ${result.method}`);
  }
};
```

---

## 🔐 Server-Side Integration (Backend)

### 1. Terminal Validation Endpoint
```
GET /api/v1/terminals/:terminalId
Returns: Terminal configuration with all controls
```

### 2. Print Job Endpoint (To Implement)
```
POST /api/v1/print/invoice
Body: {
  invoiceId: string,
  printerName: string,
  templateId: string,
  autoPrint: boolean,
  timeout: number
}
```

### 3. Printer Status Endpoint (To Implement)
```
GET /api/v1/print/printer-status?printerName=XXX
Returns: { available: boolean, status: string }
```

### 4. Test Printer Endpoint (To Implement)
```
POST /api/v1/print/test-printer
Body: { printerName: string }
Returns: { success: boolean, message: string }
```

---

## 🚀 Feature Implementation Priority

### Phase 1 (Done ✅)
- ✅ Terminal config hook
- ✅ Context provider
- ✅ Print service
- ✅ Header display

### Phase 2 (Recommended Next)
1. Integrate terminal controls into SalesInvoice
   - Hide/show buttons based on terminal config
   - Validate discounts per terminal
   - Restrict payment methods

2. Implement backend print endpoints
   - Accept printer name parameter
   - Route to configured printer
   - Log print jobs

### Phase 3 (Advanced)
1. Real-time printer monitoring
2. Print queue management
3. Terminal activity logging
4. Terminal health dashboard

---

## 📝 Terminal Control Rules

### Discount Controls
- `maxDiscount`: Absolute maximum discount allowed (%)
- `requireApprovalAbove`: Threshold requiring manager approval

### Feature Controls
- `allowReturns`: Allow return transactions
- `allowDiscounts`: Allow manual discounts
- `allowCredits`: Allow credit payment method
- `allowExchanges`: Allow exchange transactions
- `allowPromotions`: Allow promotional codes

### Hardware Controls
- Each printer has `enabled` flag
- Only enabled printers can receive print jobs
- Multiple printers can be mapped (invoice, label, etc.)

---

## 🐛 Debugging

### Terminal Config Not Loading?
```javascript
// Check in browser console:
const { terminalConfig } = useTerminal();
console.log(terminalConfig);

// Check auth token exists:
console.log(localStorage.getItem('token'));

// Check terminal ID in config:
fetch('/config/terminal.json').then(r => r.json()).then(console.log);
```

### Printer Not Working?
```javascript
// Test printer connectivity:
import { testPrinter } from '../services/SmartPrintService';
await testPrinter('HP_LaserJet_Pro');

// Check printer config:
const printer = useTerminalPrinter('invoicePrinter');
console.log(printer);
```

---

## 📚 Example Components

All examples show real-world usage patterns for the terminal control system.
See examples above for production-ready code.
