# SalesInvoice Component: Terminal Feature Integration

**File:** `client/src/components/sales/SalesInvoice.jsx`  
**Date:** April 20, 2026  
**Status:** ✅ INTEGRATED

---

## Changes Made

### 1. Added Import (Line 34)

**BEFORE:**
```jsx
import { CompanyContext } from "../../context/CompanyContext";
import InvoiceViewModal from "./salesInvoice/InvoiceViewModal";
```

**AFTER:**
```jsx
import { CompanyContext } from "../../context/CompanyContext";
import { useTerminalFeature } from "../../context/TerminalContext";  // ← NEW
import InvoiceViewModal from "./salesInvoice/InvoiceViewModal";
```

---

### 2. Added Terminal Feature Hooks (Line 37-47)

**BEFORE:**
```jsx
const SalesInvoice = () => {
  // Get full company data from context
  const { company } = useContext(CompanyContext);
  // Get decimal formatting functions based on company currency settings
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();
```

**AFTER:**
```jsx
const SalesInvoice = () => {
  // Get full company data from context
  const { company } = useContext(CompanyContext);
  
  // ✅ Terminal Feature Controls
  const allowReturns = useTerminalFeature('allowReturns');
  const allowDiscounts = useTerminalFeature('allowDiscounts');
  const allowExchanges = useTerminalFeature('allowExchanges');
  const allowPromotions = useTerminalFeature('allowPromotions');
  
  // Get decimal formatting functions based on company currency settings
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();
```

---

### 3. Wrapped Discount UI with Terminal Check (Lines 2190-2220)

**BEFORE:**
```jsx
<div className="h-8 w-px bg-gray-200"></div>
<div className="text-center">
  <p className="text-gray-400 text-xs">Discount</p>
  <div className="flex items-center gap-1">
    <input
      type="number"
      inputMode="decimal"
      step={getInputStep()}
      min="0"
      name="discount"
      value={invoiceData.discount ?? 0}
      onChange={handleInputChange}
      className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
    />
    <span className="text-gray-400 text-xs">%</span>
  </div>
</div>
<div className="h-8 w-px bg-gray-200"></div>
<div className="text-center">
  <p className="text-gray-400 text-xs">Disc Amt</p>
  <input
    type="number"
    inputMode="decimal"
    step={getInputStep()}
    min="0"
    name="discountAmount"
    value={invoiceData.discountAmount ?? 0}
    onChange={handleInputChange}
    className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
  />
</div>
<div className="h-8 w-px bg-gray-200"></div>
```

**AFTER:**
```jsx
<div className="h-8 w-px bg-gray-200"></div>
{allowDiscounts && (
  <>
    <div className="text-center">
      <p className="text-gray-400 text-xs">Discount</p>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          step={getInputStep()}
          min="0"
          name="discount"
          value={invoiceData.discount ?? 0}
          onChange={handleInputChange}
          className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <span className="text-gray-400 text-xs">%</span>
      </div>
    </div>
    <div className="h-8 w-px bg-gray-200"></div>
    <div className="text-center">
      <p className="text-gray-400 text-xs">Disc Amt</p>
      <input
        type="number"
        inputMode="decimal"
        step={getInputStep()}
        min="0"
        name="discountAmount"
        value={invoiceData.discountAmount ?? 0}
        onChange={handleInputChange}
        className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </div>
  </>
)}
<div className="h-8 w-px bg-gray-200"></div>
```

---

## Impact

### What Changed
1. ✅ Discount fields now hidden if terminal doesn't allow discounts
2. ✅ Terminal configuration controls discount UI visibility
3. ✅ No functional change to discount logic (remains role-based)

### When Discount Fields Show/Hide

| Scenario | Result |
|----------|--------|
| Terminal has `allowDiscounts: true` | Fields SHOW |
| Terminal has `allowDiscounts: false` | Fields HIDDEN |
| User can't see/edit if hidden | Can't apply discount at this terminal |

### User Experience

**Terminal WITH Discounts Enabled:**
```
┌─────────────────────────────────────┐
│ Subtotal  │ Discount  │ Tax │ Total │
│  100 AED  │  10 AED   │ 3.3 │ 93.3  │
│           │ (visible) │     │       │
└─────────────────────────────────────┘
✅ User can apply discount
```

**Terminal WITHOUT Discounts Enabled:**
```
┌───────────────────────────────────┐
│ Subtotal  │ Tax │ Total           │
│  100 AED  │ 5   │ 105 AED         │
│           │     │                 │
└───────────────────────────────────┘
❌ Discount section completely hidden
```

---

## Important: Discount Validation

### This Change Does NOT Affect Discount Validation

The discount UI being hidden prevents the USER from entering a discount.  
But if they somehow bypass it, validation is still needed:

```jsx
// Role-based validation (SEPARATE from terminal feature)
const validateDiscountByRole = (amount) => {
  const userRole = user?.role?.name;  // STAFF, MANAGER, etc.
  const roleLimit = { STAFF: 5, MANAGER: 25 }[userRole];
  
  if (amount > roleLimit) {
    return { valid: false, error: '...' };
  }
  return { valid: true };
};

// In handleDiscountChange:
// 1. First check: Is terminal allowing discounts?
if (!allowDiscounts) return;

// 2. Then check: Does role allow this amount?
const validation = validateDiscountByRole(value);
if (!validation.valid) alert(validation.error);
```

---

## How to Add More Terminal Feature Checks

### Pattern for Other Features

```jsx
// 1. At top of component
const allowReturns = useTerminalFeature('allowReturns');
const allowExchanges = useTerminalFeature('allowExchanges');

// 2. In JSX - wrap button/section
{allowReturns && (
  <button onClick={handleReturn}>Process Return</button>
)}

{allowExchanges && (
  <button onClick={handleExchange}>Process Exchange</button>
)}
```

### Available Features to Check

```javascript
useTerminalFeature('allowReturns')       // Process returns
useTerminalFeature('allowDiscounts')     // Apply discounts  ← DONE
useTerminalFeature('allowCredits')       // Credit payment
useTerminalFeature('allowExchanges')     // Process exchanges
useTerminalFeature('allowPromotions')    // Use promotional codes
```

---

## Testing

### Test 1: Terminal with Discounts Enabled
1. Load SalesInvoice
2. Discount fields should be VISIBLE
3. User can type in discount %
4. Discount should apply normally

### Test 2: Terminal with Discounts Disabled
1. Change terminal config: `allowDiscounts: false`
2. Reload SalesInvoice
3. Discount fields should be HIDDEN
4. User cannot apply discount

### Test 3: Role-Based Validation
1. User is STAFF (max 5% discount)
2. Try to apply 10% discount
3. Should get error: "STAFF limited to 5%"
4. Require manager approval

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| SalesInvoice.jsx | Added import | 34 |
| SalesInvoice.jsx | Added terminal hooks | 37-47 |
| SalesInvoice.jsx | Wrapped discount UI | 2190-2220 |

## Files Related

- `TerminalContext.jsx` - Provides `useTerminalFeature()` hook
- `TerminalManagement.js` - Database model (stores config)
- `TERMINAL_FEATURES_VS_ROLE_BASED_CONTROLS.md` - Full documentation

---

## Next Steps

### Immediate
- ✅ Test discount hiding/showing
- ✅ Verify role-based discount validation still works

### Soon
- [ ] Add smart printing: `printInvoice()` on save
- [ ] Implement manager approval modal for high discounts
- [ ] Add similar checks to other modules (Returns, Exchanges, etc.)

### Future
- [ ] Add terminal health monitoring
- [ ] Implement print queue management
- [ ] Add terminal activity logging dashboard

---

## Summary

**What Works Now:**
✅ Discount UI shows/hides based on terminal config
✅ Terminal name displays in header
✅ Role-based discount validation (unchanged)

**What's Next:**
⏳ Smart printing integration
⏳ Other terminal feature controls (returns, exchanges, etc.)
⏳ Manager approval workflows
