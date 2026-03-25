# 🔄 Option B: Parallel Testing Plan (SalesInvoiceNew)

**Status:** ✅ Implementation Ready  
**Created:** March 23, 2026  
**Version:** 1.0

---

## 📋 Executive Summary

**Strategy:** Create new refactored component alongside old one, test independently, switch only after validation.

- **Old Component:** `/client/src/components/sales/SalesInvoice.jsx` (2822 lines, tested, fallback)
- **New Component:** `/client/src/components/sales/SalesInvoiceNew.jsx` (350 lines, modular, test focus)
- **Test Method:** Separate route accessing each version independently  
- **Switch Trigger:** 100% feature parity + all tests passing

---

## 🎯 Phase 1: Route Configuration (15 min)

### Add Test Routes

Edit `/client/src/App.jsx` or your routing configuration:

```javascript
// Current production route
<Route path="/sales/invoice" element={<SalesInvoice />} />

// Add test route for new version
<Route path="/sales/invoice/refactored" element={<SalesInvoiceNew />} />

// Add feature comparison route (optional)
<Route path="/sales/invoice/comparison" element={<ComparisonView />} />
```

### Result
- Old version: `http://localhost:3000/sales/invoice` (stable, production)
- New version: `http://localhost:3000/sales/invoice/refactored` (test, feature-complete)

---

## ✅ Phase 2: Feature Parity Checklist (2-3 hours)

Test ALL features in new component. Mark each as ✅ WORKING or ❌ ISSUE.

### Invoice Creation & Management
- [ ] **New Invoice** - Create blank invoice (Ctrl+N works)
- [ ] **Invoice Number** - Auto-incremental number generation
- [ ] **Date Picker** - Set invoice date
- [ ] **Reset Form** - Clear all fields (Ctrl+N or button)

### Customer Management
- [ ] **Customer Selection** - Dropdown working
- [ ] **Customer Search** - Filter by name/phone
- [ ] **Customer Switching** - Change customer and verify tax rate updates

### Product & Item Management
- [ ] **Add Item** - Barcode scanner works
- [ ] **Product Search** - Type product name/itemcode, autocomplete works
- [ ] **Search Pagination** - "Load More" buttons work
- [ ] **Quantity Input** - Qty cells editable (arrow keys to navigate)
- [ ] **Qty Validation** - Prevents qty > available stock
- [ ] **Rate Input** - Rate cells editable
- [ ] **Rate Validation** - Prevents negative rates
- [ ] **Cell Navigation** - Tab/Arrow keys for grid navigation (Ctrl+N to add new row)

### Discounts & Special Cases
- [ ] **Line Discount** - Per-item line discount applied
- [ ] **Global Discount** - Invoice-level discount (% or fixed)
- [ ] **FOC Items** - Free-on-Cost items handled correctly
- [ ] **Serial Numbers** - Serial # modal works for serial-tracked items
- [ ] **Item Notes** - Notes modal adds/edits/saves correctly

### Calculations
- [ ] **Total Qty** - Correct sum of all items
- [ ] **Subtotal** - Sum of all item totals (qty × rate)
- [ ] **Discount** - Subtotal - discount = discounted total
- [ ] **Tax Calculation** - Tax % applied to correct amount
- [ ] **Net Total** - Discounted total + tax
- [ ] **Profit Margin** - Calculated from cost vs sale rate
- [ ] **Profit %** - (Profit / Cost) × 100

### Keyboard Shortcuts
- [ ] **Ctrl+S** - Save invoice (save dialog appears)
- [ ] **Ctrl+P** - Save and Print
- [ ] **Ctrl+N** - Add new item (new row appears)
- [ ] **Escape** - Close modal or exit edit mode
- [ ] **Barcode Scan** - Physical barcodes trigger add-to-invoice

### Modals & Dialogs
- [ ] **History Modal** - Shows list of past invoices by date
- [ ] **Product Lookup** - Full product catalog searchable
- [ ] **Item Notes Modal** - Edit notes per item
- [ ] **Serial Modal** - Manage serial numbers
- [ ] **Print Preview** - Before printing, preview looks correct

### Save & Print
- [ ] **Save Invoice** - Save to database, get success message
- [ ] **Print Invoice** - Opens browser print dialog
- [ ] **Save & Print** - Both actions in sequence
- [ ] **Validation on Save** - Prevents saving invalid invoice
- [ ] **Invoice No Increment** - After save, next invoice # shows

### Error Handling
- [ ] **Missing Customer** - Prevents save without customer
- [ ] **No Items** - Prevents save with empty invoice
- [ ] **Negative Totals** - Prevents invalid discount values
- [ ] **Stock Exceeded** - Qty validation against available stock
- [ ] **Invalid Input** - Non-numeric inputs rejected in number fields

### UI/UX
- [ ] **No JavaScript Errors** - Browser console clean
- [ ] **No Network Errors** - Network tab shows no failed requests
- [ ] **Responsive Layout** - Works on different screen sizes
- [ ] **Modal Performance** - Modals appear/close quickly
- [ ] **Dropdown Focus** - Elements maintain focus correctly

---

## 🔍 Phase 3: Regression Testing (1-2 hours)

Run side-by-side tests: Old vs New

### Test Case Format
For each test, verify **BOTH** components behave identically:

**Test:** [Feature Name]
- **Steps:** 1. … 2. … 3. …
- **Old Result:** ✅ / ❌ [describe]
- **New Result:** ✅ / ❌ [describe]
- **Parity:** ✅ MATCH / ❌ DIFF

### Example Test Cases

**Test: Create Invoice with Multiple Items**
```
Steps:
1. Open both routes in tabs
2. Create invoice with 5 random products
3. Set different discounts
4. Save invoice

Old Result: ✅ Saved, invoice number 00257
New Result: ✅ Saved, invoice number 00258
Parity: ✅ MATCH (numbers diff but logic same)
```

**Test: Keyboard Barcode Entry**
```
Steps:
1. Open both routes
2. Simulate barcode scan: "123456789\n"
3. Verify item added to grid
4. Check qty defaults to 1

Old Result: ✅ Item added
New Result: ✅ Item added
Parity: ✅ MATCH
```

---

## 🧪 Phase 4: Automated Testing (1-2 hours)

### Test File: `SalesInvoiceNew.test.jsx`

```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SalesInvoiceNew from "./SalesInvoiceNew";

describe("SalesInvoiceNew - Refactored Component", () => {
  // State Management Tests
  test("useSalesInvoiceState: Loads initial state", () => {
    render(<SalesInvoiceNew />);
    expect(screen.getByText(/Sales Invoice/i)).toBeInTheDocument();
  });

  test("useSalesInvoiceState: Adds item to state", async () => {
    render(<SalesInvoiceNew />);
    const addButton = screen.getByText(/Add Item/i);
    fireEvent.click(addButton);
    await waitFor(() => {
      expect(screen.getByDisplayValue(/Qty/i)).toBeInTheDocument();
    });
  });

  // Handler Tests
  test("useSalesInvoiceHandlers: Saves invoice", async () => {
    render(<SalesInvoiceNew />);
    const saveButton = screen.getByText(/Save/i);
    fireEvent.click(saveButton);
    await waitFor(() => {
      expect(screen.getByText(/Invoice saved/i)).toBeInTheDocument();
    });
  });

  // Service Tests
  test("SalesInvoiceCalculationService: Calculates totals", () => {
    const items = [
      { qty: 2, rate: 100, discount: 0 },
      { qty: 1, rate: 50, discount: 10 },
    ];
    const total = SalesInvoiceCalculationService.calculateTotals(items, 0, 0);
    expect(total.subtotal).toBe(240); // (2*100) + (1*50-10)
  });

  test("SalesInvoiceValidationService: Validates invoice", () => {
    const invoice = { items: [], customerId: null };
    const errors = SalesInvoiceValidationService.validateInvoice(invoice);
    expect(errors).toContain("No items in invoice");
  });
});
```

### Run Tests
```bash
npm test -- SalesInvoiceNew.test.jsx
```

---

## 🚀 Phase 5: Performance Testing (30 min)

### Metrics to Verify

| Metric | Old (2822 lines) | New (350 lines) | Goal |
|--------|------------------|-----------------|------|
| Bundle Size | ~85KB | ~20KB* | ✅ Reduce |
| Initial Load | ~1.2s | ~0.8s | ✅ Faster |
| Add Item (ms) | ~45ms | ~30ms | ✅ Faster |
| Save (ms) | ~650ms (with API) | ~650ms (same API) | ✅ Same |
| Memory Usage | ~12MB | ~8MB | ✅ Reduce |

*Only new component; shared services counted separately

### Test with Browser DevTools
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform action (Add item, Save, Print)
5. Click Stop
6. Check timeline for performance issues

---

## 📊 Phase 6: API Compatibility Check (15 min)

### Verify API Endpoints

The new SalesInvoiceService uses different endpoint format. Verify both work:

**Old Component Endpoints:**
```javascript
// From SalesInvoice.jsx (hardcoded)
GET /api/v1/sales-invoices/getSalesInvoices
POST /api/v1/sales-invoices/create
```

**New Component Endpoints:**
```javascript
// From SalesInvoiceService.js
GET /sales-invoices (simplified)
POST /sales-invoices (simplified)
```

### Action Items
- [ ] Verify backend routes support BOTH old and new endpoint formats
- [ ] Add route aliases if needed: `/sales-invoices` → `/api/v1/sales-invoices`
- [ ] Document endpoint compatibility matrix
- [ ] Test fallback behavior if endpoint returns 404

---

## ✨ Phase 7: User Acceptance Testing (1-2 hours)

### Have End Users Test New Component

**User Testing Script:**
> "Please use the new Sales Invoice (http://localhost:3000/sales/invoice/refactored) to process 5-10 real invoices as if it were the normal system. Try all features you normally use. Report any issues."

**Feedback Form:**
- 👍 What works well?
- 👎 What's confusing?
- 🐛 Did you encounter any bugs?
- 💡 Any suggestions?

---

## 🔄 Phase 8: Validation Sign-Off

### Checklist Before Switching

#### Code Quality
- [ ] All ESLint warnings resolved
- [ ] No console errors/warnings
- [ ] No unused variables
- [ ] Code follows project style guide

#### Testing
- [ ] ✅ All feature parity tests pass
- [ ] ✅ All regression tests pass
- [ ] ✅ All unit tests pass
- [ ] ✅ Performance benchmarks acceptable

#### Documentation
- [ ] [ ] API endpoint compatibility verified
- [ ] [ ] Migration guide created
- [ ] [ ] Rollback procedure documented
- [ ] [ ] Team briefed on changes

#### Stakeholder Approval
- [ ] [ ] QA Lead: ✅ Approved
- [ ] [ ] Product Manager: ✅ Approved
- [ ] [ ] DevOps: ✅ Approved

---

## 🎯 Phase 9: Cutover Strategy (30 min)

### Option 1: Hard Switch (Fastest, Higher Risk)
```javascript
// Routes.jsx
<Route path="/sales/invoice" element={<SalesInvoiceNew />} />
// Old component retired
```
**⚠️ Requires:** 100% confidence, full validation passed

### Option 2: Feature Flag (Safest, Recommended)
```javascript
// Routes.jsx
<Route path="/sales/invoice" element={
  useFeatureFlag("use_new_sales_invoice") ? 
    <SalesInvoiceNew /> : 
    <SalesInvoice />
} />
```
**Benefits:** Can toggle back instantly if issue found

### Option 3: Gradual Rollout (Best for Enterprise)
- Day 1: 10% users get new version (monitoring)
- Day 2: 50% users (if no critical issues)
- Day 3: 100% users (if no issues)

### Option 4: Keep Both (Maximum Safety)
```javascript
// Keep both versions indefinitely
<Route path="/sales/invoice" element={<SalesInvoice />} />
<Route path="/sales/invoice/new" element={<SalesInvoiceNew />} />
// Let users choose version in settings
```

---

## 📈 Monitoring & Rollback

### After Cutover: Monitor for 72 Hours

**Metrics to Watch:**
- Error rate in new component
- API response times
- User session length
- Feature usage patterns

### Rollback Procedure (< 5 min)

If critical issues found:
1. Disable new component in routes
2. Switch traffic back to old version
3. Post-mortem analysis
4. Fix issues
5. Retry cutover

```javascript
// Instant rollback
<Route path="/sales/invoice" element={<SalesInvoice />} />
// Clear browser cache (users auto-sync)
```

---

## 📝 Testing Progress Tracker

```
PHASE 1: Route Setup ━━━━━━━━━━━━━━━━━━ [████░░░░░░] 0%
PHASE 2: Feature Parity ━━━━━━━━━━━━━ [██░░░░░░░░] 0%
PHASE 3: Regression Testing ━━━━━━━ [░░░░░░░░░░] 0%
PHASE 4: Automated Testing ━━━━━━━ [░░░░░░░░░░] 0%
PHASE 5: Performance Testing ━━━━━ [░░░░░░░░░░] 0%
PHASE 6: API Compatibility ━━━━━━ [░░░░░░░░░░] 0%
PHASE 7: UAT ━━━━━━━━━━━━━━━━━━━━━ [░░░░░░░░░░] 0%
PHASE 8: Validation Sign-Off ━━━━ [░░░░░░░░░░] 0%
PHASE 9: Cutover ━━━━━━━━━━━━━━━━ [░░░░░░░░░░] 0%

OVERALL PROGRESS ━━━━━━━━━━━━━━━━ [░░░░░░░░░░] 0%
ESTIMATED TIME: 8-10 hours
RECOMMENDED: 2-3 days (with breaks for UAT feedback)
```

---

## 🎓 Key Benefits of Option B

✅ **Zero Production Risk** - Old component stay intact as safety net  
✅ **Independent Testing** - New component tested in isolation  
✅ **Parallel Development** - Team can work on both versions  
✅ **Easy Rollback** - Switch routes instantly if issues found  
✅ **Validated Switch** - Only cutover AFTER 100% validation  
✅ **User Confidence** - Users can test both before switching  

---

## 📞 Support & Escalation

| Issue | Action | Escalation |
|-------|--------|-----------|
| Feature not working | Check Feature Parity checklist | QA Lead |
| Performance degradation | Check Phase 5 metrics | DevOps |
| Data inconsistency | Run validation tests | Backend Team |
| Critical bug | Initiate rollback | Tech Lead |

---

**Next Step:** Start Phase 1 (Route Configuration) - 15 minutes  
**Expected Completion:** 8-10 hours total testing  
**Recommendation:** Split across 2-3 days with UAT feedback cycles
