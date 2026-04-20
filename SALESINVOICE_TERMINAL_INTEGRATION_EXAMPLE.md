# SalesInvoice Integration Example

This example shows how to integrate the terminal control system into the SalesInvoice component.

## Step 1: Add Imports at Top

```jsx
import { useTerminal, useTerminalFeature, useTerminalDiscount } from '../context/TerminalContext';
import { printInvoice } from '../services/SmartPrintService';
```

## Step 2: Initialize Hooks in Component

```jsx
export function SalesInvoice() {
  // Existing state...
  const [invoiceData, setInvoiceData] = useState(null);
  const [discount, setDiscount] = useState(0);
  
  // ✅ NEW: Terminal configuration
  const { terminalConfig } = useTerminal();
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowCredits = useTerminalFeature('allowCredits');
  const { maxDiscount, requireApprovalAbove, validate: validateDiscount } = useTerminalDiscount();
  
  // ... rest of component
}
```

## Step 3: Validate Discount Input

```jsx
const handleDiscountChange = (amount) => {
  // Validate discount against terminal limits
  const validation = validateDiscount(amount);
  
  if (!validation.valid) {
    showToast('error', validation.error);
    return;
  }
  
  if (validation.requiresApproval) {
    showToast('warning', validation.message);
    // Show manager approval modal
    setShowApprovalModal(true);
  }
  
  setDiscount(amount);
};
```

## Step 4: Conditionally Show Buttons

```jsx
return (
  <div className="sales-invoice-form">
    {/* Invoice items */}
    
    {/* Discount Section - Show only if allowed */}
    {allowDiscounts && (
      <div className="discount-section">
        <label>Discount (Max: {maxDiscount}%)</label>
        <input
          type="number"
          value={discount}
          onChange={(e) => handleDiscountChange(parseFloat(e.target.value))}
          max={maxDiscount}
          placeholder="0"
        />
      </div>
    )}
    
    {/* Return Button - Show only if allowed */}
    {allowReturns && (
      <button className="btn btn-secondary" onClick={handleReturnTransaction}>
        Process Return
      </button>
    )}
    
    {/* Payment Methods Section */}
    <div className="payment-section">
      <label>Payment Method</label>
      
      {/* Cash always available */}
      <input type="radio" name="payment" value="cash" /> Cash
      
      {/* Credit only if allowed */}
      {allowCredits && (
        <>
          <input type="radio" name="payment" value="credit" /> Credit
        </>
      )}
      
      {/* Other methods */}
      <input type="radio" name="payment" value="card" /> Card
    </div>
    
    {/* Action Buttons */}
    <div className="action-buttons">
      <button onClick={handleSaveInvoice} className="btn btn-primary">
        Save
      </button>
      
      <button onClick={() => handlePrintInvoice(invoiceData)} className="btn btn-secondary">
        Print
      </button>
    </div>
  </div>
);
```

## Step 5: Implement Smart Printing

```jsx
const handlePrintInvoice = async (invoice) => {
  try {
    showToast('info', 'Processing print...');
    
    const result = await printInvoice(invoice, terminalConfig, {
      showDialog: true,  // Show dialog if no printer configured
      documentType: 'invoice'
    });
    
    if (result.success) {
      if (result.method === 'auto-print') {
        showToast('success', `✅ Sent to printer: ${terminalConfig.hardwareMapping?.invoicePrinter?.printerName}`);
      } else if (result.method === 'browser-print') {
        showToast('info', 'Print dialog opened');
      }
    } else {
      showToast('error', `Print failed: ${result.error}`);
    }
  } catch (error) {
    showToast('error', 'Error during printing');
  }
};
```

## Step 6: Auto-Print on Save (Optional)

```jsx
const handleSaveInvoice = async (invoiceData) => {
  try {
    // Save invoice to database
    const savedInvoice = await apiClient.post('/invoices', invoiceData);
    
    showToast('success', 'Invoice saved');
    
    // Optional: Auto-print to terminal printer
    if (terminalConfig?.hardwareMapping?.invoicePrinter?.enabled) {
      await printInvoice(savedInvoice.data, terminalConfig, {
        showDialog: false  // Don't show dialog, just print
      });
    }
    
    // Reset form
    resetForm();
  } catch (error) {
    showToast('error', 'Error saving invoice');
  }
};
```

## Step 7: Add Manager Approval Modal (Optional)

```jsx
{showApprovalModal && (
  <div className="modal">
    <div className="modal-content">
      <h3>Manager Approval Required</h3>
      <p>
        Discount of {discount}% exceeds the approval threshold of {requireApprovalAbove}%.
      </p>
      <p>Manager approval is required to proceed.</p>
      
      <input 
        type="password" 
        placeholder="Enter manager PIN" 
        onChange={(e) => setManagerPin(e.target.value)}
      />
      
      <button onClick={handleApproveDiscount}>Approve</button>
      <button onClick={() => setShowApprovalModal(false)}>Cancel</button>
    </div>
  </div>
)}
```

---

## Complete Code Example

```jsx
import React, { useState } from 'react';
import { useTerminal, useTerminalFeature, useTerminalDiscount } from '../context/TerminalContext';
import { printInvoice } from '../services/SmartPrintService';
import { showToast } from '../utils/toast';

export function SalesInvoice() {
  const [invoiceData, setInvoiceData] = useState({
    items: [],
    discount: 0,
    paymentMethod: 'cash'
  });
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  // Terminal configuration
  const { terminalConfig } = useTerminal();
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowCredits = useTerminalFeature('allowCredits');
  const { maxDiscount, validate: validateDiscount } = useTerminalDiscount();
  
  const handleDiscountChange = (amount) => {
    const validation = validateDiscount(amount);
    if (!validation.valid) {
      showToast('error', validation.error);
      return;
    }
    if (validation.requiresApproval) {
      showToast('warning', validation.message);
      setShowApprovalModal(true);
    }
    setInvoiceData({ ...invoiceData, discount: amount });
  };
  
  const handlePrintInvoice = async () => {
    const result = await printInvoice(invoiceData, terminalConfig);
    if (result.success) {
      showToast('success', `✅ Print via ${result.method}`);
    } else {
      showToast('error', result.error);
    }
  };
  
  const handleSaveInvoice = async () => {
    try {
      // Save logic here
      showToast('success', 'Invoice saved');
    } catch (error) {
      showToast('error', 'Save failed');
    }
  };
  
  return (
    <div className="sales-invoice">
      <h2>Sales Invoice</h2>
      
      {/* Terminal Info */}
      <div className="terminal-info">
        <small>Terminal: {terminalConfig?.terminalName}</small>
      </div>
      
      {/* Items Section */}
      {/* ... items form ... */}
      
      {/* Discount Section - Conditional */}
      {allowDiscounts && (
        <div className="form-group">
          <label>Discount %</label>
          <input
            type="number"
            value={invoiceData.discount}
            onChange={(e) => handleDiscountChange(parseFloat(e.target.value))}
            max={maxDiscount}
            placeholder="0"
          />
          <small>Max allowed: {maxDiscount}%</small>
        </div>
      )}
      
      {/* Return Button - Conditional */}
      {allowReturns && (
        <button className="btn btn-warning" onClick={() => console.log('Return')}>
          Process Return
        </button>
      )}
      
      {/* Payment Methods - Conditional */}
      <div className="form-group">
        <label>Payment Method</label>
        <select value={invoiceData.paymentMethod} onChange={(e) => 
          setInvoiceData({ ...invoiceData, paymentMethod: e.target.value })
        }>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          {allowCredits && <option value="credit">Credit</option>}
        </select>
      </div>
      
      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={handleSaveInvoice} className="btn btn-primary">
          Save Invoice
        </button>
        <button onClick={handlePrintInvoice} className="btn btn-secondary">
          Print
        </button>
      </div>
      
      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal">
          <h3>Manager Approval Required</h3>
          <p>Discount exceeds approval threshold</p>
          <button onClick={() => setShowApprovalModal(false)}>Close</button>
        </div>
      )}
    </div>
  );
}
```

---

## Key Points

1. **Always wrap with TerminalProvider** - Already done in App.jsx
2. **Check features early** - Use conditional rendering
3. **Validate before applying** - Use validateDiscount() hook
4. **Smart print** - Use printInvoice() for automatic printer routing
5. **Show terminal name** - Display in UI for user confirmation

---

## Testing Checklist

- [ ] Terminal name shows in header
- [ ] Discount field hidden if `allowDiscounts: false`
- [ ] Discount validation works (shows error if exceeds max)
- [ ] Approval needed message shows when above threshold
- [ ] Returns button hidden if `allowReturns: false`
- [ ] Credit option only shows if `allowCredits: true`
- [ ] Print button sends to configured printer
- [ ] Browser print dialog shows if no printer configured

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Terminal config null | Check auth token exists in localStorage |
| Discount validation not working | Import validateDiscount from useTerminalDiscount hook |
| Print not working | Check printer name in terminal config |
| Features not showing | Check salesControls in terminal DB config |

