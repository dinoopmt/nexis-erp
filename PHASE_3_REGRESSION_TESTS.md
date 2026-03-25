# 🔍 Phase 3: Side-by-Side Regression Tests

**Status:** Ready for execution  
**Created:** March 23, 2026  
**Purpose:** Compare old vs new component behavior for 100% feature parity

---

## 📋 Test Execution Format

For each test case:
1. **Set up:** Prepare test data
2. **Old Component:** Perform action in `/sales-invoice`, document result
3. **New Component:** Perform action in `/sales-invoice-refactored`, document result
4. **Comparison:** Mark as ✅ MATCH or ❌ DIFF
5. **Notes:** Any observations or issues

---

## ✅ Regression Test Suite (25 Test Cases)

### **Test 1: Basic Invoice Creation**
```
Objective: Create new blank invoice and verify initial state

Steps (OLD):
  1. Go to /sales-invoice
  2. Verify blank form loads
  3. Note invoice number shown
  4. Check date field shows today's date
  5. Verify customer dropdown is empty

Expected (OLD): Blank form, auto-generated invoice #, current date
Actual (OLD): [USER INPUT]

Steps (NEW):
  1. Go to /sales-invoice-refactored
  2. Repeat steps 2-5 above

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

**Test Case Template** (use for all tests):
```
Objective: [What are we testing?]

Steps (OLD): [Step-by-step]
Expected (OLD): [Expected result]
Actual (OLD): [What actually happened]

Steps (NEW): [Same steps, different URL]
Expected (NEW): [Should match OLD]
Actual (NEW): [What actually happened]

Parity: ✅ MATCH / ❌ DIFF
Notes: [Any issues found]
```

---

### **Test 2: Customer Selection & Tax Rate**
```
Objective: Select customer and verify tax rate loads

Steps (OLD):
  1. Create new invoice
  2. Click on "Select Party" dropdown
  3. Search for customer "ABC Corp"
  4. Select ABC Corp
  5. Note: Verify tax rate field updates
  6. Verify invoice total recalculates if items exist

Expected (OLD): Customer selected, tax rate populated, total updates
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat steps for /sales-invoice-refactored

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 3: Add Item via Product Search**
```
Objective: Add product via search autocomplete

Steps (OLD):
  1. Create invoice with customer selected
  2. Type "Laptop" in product search
  3. Verify dropdown shows matching products
  4. Click on "Laptop 15-inch"
  5. Verify item row appears in grid
  6. Verify qty defaults to 1
  7. Verify rate populates with product price
  8. Verify total updates

Expected (OLD): Item added, grid shows row, calculations correct
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-8. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 4: Barcode Scanner Entry**
```
Objective: Add item via barcode scanner

Steps (OLD):
  1. Create invoice
  2. Focus on barcode input field
  3. Simulate barcode scan: "123456789" + Enter
  4. Verify item added to grid
  5. Verify qty = 1
  6. Verify total updates

Expected (OLD): Item added via barcode
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 5: Edit Quantity in Grid**
```
Objective: Edit item quantity and verify calculations

Steps (OLD):
  1. Create invoice with 1 item (rate = 100)
  2. Click on quantity cell
  3. Change qty from 1 to 5
  4. Press Tab or click elsewhere
  5. Verify item total = 500 (5 × 100)
  6. Verify invoice subtotal updates
  7. Verify tax recalculates
  8. Verify net total updates

Expected (OLD): Qty editable, all totals update
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-8. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 6: Edit Rate in Grid**
```
Objective: Edit item rate and verify calculations

Steps (OLD):
  1. Create invoice with 1 item (qty = 2, rate = 100)
  2. Click on rate cell
  3. Change rate from 100 to 150
  4. Press Tab or click elsewhere
  5. Verify item total = 300 (2 × 150)
  6. Verify invoice subtotal updates

Expected (OLD): Rate editable, totals update
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 7: Line Discount (Per-Item)**
```
Objective: Apply discount to individual item

Steps (OLD):
  1. Create invoice with 1 item (qty = 1, rate = 100)
  2. Click on discount column for that item
  3. Enter discount amount: 10
  4. Press Tab or click elsewhere
  5. Verify item total = 90 (100 - 10)
  6. Verify invoice subtotal = 90

Expected (OLD): Line discount applied correctly
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 8: Global Discount (Invoice-Level)**
```
Objective: Apply discount to entire invoice

Steps (OLD):
  1. Create invoice with 3 items, subtotal = 300
  2. Enter global discount: 10% (or 30 fixed)
  3. Press Tab or click elsewhere
  4. Verify subtotal still = 300
  5. Verify discounted total = 270 (300 - 30)
  6. Verify tax applies to discounted amount
  7. Verify net total updates

Expected (OLD): Global discount applied correctly
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-7. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 9: Tax Calculation**
```
Objective: Verify tax is calculated correctly

Steps (OLD):
  1. Create invoice with customer (tax = 18%)
  2. Add items with total = 100
  3. No discount
  4. Verify tax calculation:
     - Tax Amount should = 18 (100 × 18%)
     - Net Total should = 118
  5. Apply 10% discount (10 off)
  6. Verify tax recalculates:
     - Discounted base = 90
     - Tax should = 16.2 (90 × 18%)
     - Net Total should = 106.2

Expected (OLD): Tax calculated on correct base
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 10: Remove Item**
```
Objective: Delete item from grid and verify recalculation

Steps (OLD):
  1. Create invoice with 3 items, total value = 300
  2. Click "Delete" button on item #2
  3. Verify item row removed
  4. Verify remaining items count = 2
  5. Verify subtotal recalculates (excluding deleted item)

Expected (OLD): Item removed, totals update
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 11: Keyboard Navigation (Tab)**
```
Objective: Navigate grid cells with Tab key

Steps (OLD):
  1. Create invoice with 2 items
  2. Click on qty cell in item 1
  3. Press Tab → should move to rate cell
  4. Press Tab → should move to discount cell
  5. Press Tab → should move to next item's qty cell
  6. Verify cursor moves correctly

Expected (OLD): Tab key navigates cells correctly
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 12: Keyboard Shortcut - Ctrl+S (Save)**
```
Objective: Save invoice with Ctrl+S

Steps (OLD):
  1. Create invoice with items
  2. Press Ctrl+S
  3. Verify save dialog appears OR invoice saves
  4. Verify success message shown
  5. Verify invoice number increments for next invoice

Expected (OLD): Ctrl+S saves invoice
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 13: Keyboard Shortcut - Ctrl+P (Print)**
```
Objective: Print invoice with Ctrl+P

Steps (OLD):
  1. Create invoice with items (don't save yet, or save first)
  2. Press Ctrl+P
  3. Verify print preview dialog appears
  4. Verify invoice data is shown correctly
  5. Verify all items, totals, tax visible

Expected (OLD): Ctrl+P opens print preview
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 14: Keyboard Shortcut - Ctrl+N (Add Item)**
```
Objective: Add new item row with Ctrl+N

Steps (OLD):
  1. Create invoice with 1 item
  2. Press Ctrl+N
  3. Verify new empty row appears
  4. Verify cursor focuses on qty field
  5. Verify total item count = 2

Expected (OLD): Ctrl+N adds new item row
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 15: Serial Number Modal**
```
Objective: Add serial numbers for serial-tracked items

Steps (OLD):
  1. Create invoice with item that requires serial (e.g., Laptop)
  2. Click "Serial" button for that item (if visible)
  3. Enter serial number: "SN12345"
  4. Click Save
  5. Verify serial stored and displayed

Expected (OLD): Serial modal works, serial saved
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 16: Item Notes Modal**
```
Objective: Add notes to item

Steps (OLD):
  1. Create invoice with 1 item
  2. Click "Notes" button for that item
  3. Enter note: "This is a special order"
  4. Click Save
  5. Verify note saved and icon shows note exists

Expected (OLD): Notes modal works, note saved
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 17: Invoice History Modal**
```
Objective: View past invoices

Steps (OLD):
  1. Create and save multiple invoices (at least 3)
  2. Click "History" button
  3. Verify modal shows list of invoices
  4. Verify invoices can be filtered by date
  5. Verify invoices can be searched
  6. Click on invoice to load it (or verify option exists)

Expected (OLD): History modal functional, invoices listed
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 18: Product Lookup Modal**
```
Objective: Browse and add products via full product catalog

Steps (OLD):
  1. Click "Lookup Product" button
  2. Verify modal opens with product list
  3. Search for product: "Monitor"
  4. Verify search results filter correctly
  5. Click on "Monitor 24-inch"
  6. Verify item added to invoice
  7. Close modal

Expected (OLD): Product lookup functional, item added
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-7. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 19: Save Invoice - Validation**
```
Objective: Test save validation (should prevent invalid saves)

Steps (OLD):
  1. Create invoice but don't select customer
  2. Click Save button
  3. Verify error message: "Please select customer"
  4. Try saving with no items
  5. Verify error message: "Invoice must have items"
  6. Try saving with negative discount
  7. Verify error message

Expected (OLD): Validation prevents invalid saves
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-7. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 20: Save & Print Combined**
```
Objective: Save invoice and print in one action

Steps (OLD):
  1. Create valid invoice
  2. Click "Save & Print" button
  3. Verify invoice saves (success message)
  4. Verify print dialog opens automatically
  5. Verify correct invoice data shown in print preview

Expected (OLD): Save & Print works as two combined steps
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 21: Reset Form**
```
Objective: Clear all fields and start fresh

Steps (OLD):
  1. Create invoice with multiple items
  2. Click "Reset" button (or press Ctrl+N with no items)
  3. Verify all fields cleared
  4. Verify new invoice number generated
  5. Verify date reset to today

Expected (OLD): Form reset clears all data
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 22: Zero Quantity Validation**
```
Objective: Test that qty cannot be zero or negative

Steps (OLD):
  1. Create invoice with item (qty = 1)
  2. Try to change qty to 0
  3. Verify rejected or reverts to previous value
  4. Try to change qty to -5
  5. Verify rejected

Expected (OLD): Zero/negative qty not allowed
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 23: Decimal Precision (Currency)**
```
Objective: Test currency calculations with decimals

Steps (OLD):
  1. Create invoice with item: qty = 3, rate = 15.50
  2. Verify item total = 46.50 (3 × 15.50)
  3. Apply 5% discount = 2.325 → rounds to 2.33
  4. Add multiple items to verify precision throughout
  5. Verify no rounding errors accumulate

Expected (OLD): Decimals handled correctly
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 24: Free-on-Cost (FOC) Items**
```
Objective: Handle FOC (free) items in invoice

Steps (OLD):
  1. Create invoice
  2. Add item marked as FOC
  3. Verify rate shows as 0
  4. Verify qty can be entered
  5. Verify FOC item NOT included in subtotal calculation
  6. Verify other items calculate correctly

Expected (OLD): FOC items excluded from totals
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-6. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

### **Test 25: Stock Availability Check**
```
Objective: Prevent selling more than available stock

Steps (OLD):
  1. Try to add item with available stock = 5 units
  2. Enter qty = 10
  3. Verify error: "Insufficient stock available"
  4. Try qty = 5 (should work)
  5. Verify item added

Expected (OLD): Stock validation prevents overselling
Actual (OLD): [USER INPUT]

Steps (NEW):
  1-5. Repeat

Expected (NEW): Same as OLD
Actual (NEW): [USER INPUT]

Parity: ✅ MATCH / ❌ DIFF
Notes: [ANY DIFFERENCES]
```

---

## 📊 Results Summary

After completing all 25 tests, fill in:

| Test # | Feature | Parity | Status | Notes |
|--------|---------|--------|--------|-------|
| 1 | Basic Creation | ✅/❌ | PASS/FAIL | |
| 2 | Customer & Tax | ✅/❌ | PASS/FAIL | |
| 3 | Product Search | ✅/❌ | PASS/FAIL | |
| 4 | Barcode | ✅/❌ | PASS/FAIL | |
| 5 | Edit Qty | ✅/❌ | PASS/FAIL | |
| 6 | Edit Rate | ✅/❌ | PASS/FAIL | |
| 7 | Line Discount | ✅/❌ | PASS/FAIL | |
| 8 | Global Discount | ✅/❌ | PASS/FAIL | |
| 9 | Tax Calc | ✅/❌ | PASS/FAIL | |
| 10 | Remove Item | ✅/❌ | PASS/FAIL | |
| 11 | Tab Nav | ✅/❌ | PASS/FAIL | |
| 12 | Ctrl+S | ✅/❌ | PASS/FAIL | |
| 13 | Ctrl+P | ✅/❌ | PASS/FAIL | |
| 14 | Ctrl+N | ✅/❌ | PASS/FAIL | |
| 15 | Serial Modal | ✅/❌ | PASS/FAIL | |
| 16 | Notes Modal | ✅/❌ | PASS/FAIL | |
| 17 | History Modal | ✅/❌ | PASS/FAIL | |
| 18 | Lookup Modal | ✅/❌ | PASS/FAIL | |
| 19 | Validation | ✅/❌ | PASS/FAIL | |
| 20 | Save & Print | ✅/❌ | PASS/FAIL | |
| 21 | Reset | ✅/❌ | PASS/FAIL | |
| 22 | Zero Qty | ✅/❌ | PASS/FAIL | |
| 23 | Decimals | ✅/❌ | PASS/FAIL | |
| 24 | FOC Items | ✅/❌ | PASS/FAIL | |
| 25 | Stock Check | ✅/❌ | PASS/FAIL | |

**Total Parity Match Rate:** ______ / 25 (____%)

**Pass to Proceed:** 24/25 or 100%

---

## ❌ Issues Found

### Critical (Block Cutover)
List any CRITICAL issues that must be fixed before switching:
1. [Issue description]
2. [Issue description]

### Major (Should Fix)
List any MAJOR issues that should be fixed:
1. [Issue description]
2. [Issue description]

### Minor (Can Document)
List any MINOR issues that can be worked around:
1. [Issue description]
2. [Issue description]

---

## ✅ Sign-Off

- [ ] All 25 tests completed
- [ ] Parity match rate ≥ 96%
- [ ] No critical issues found
- [ ] Ready to proceed to Phase 4 (Automated Tests)

**Tester Name:** ________________  
**Date Completed:** ________________  
**Signature:** ________________
