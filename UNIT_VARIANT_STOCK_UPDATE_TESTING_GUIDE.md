# Unit Variant Stock Update - Comprehensive Testing Guide

**Version:** 1.0  
**Last Updated:** Current Session  
**Status:** Ready for Testing

---

## Overview

This guide provides step-by-step test scenarios to validate the unit variant stock update fix. All tests should pass after the implementation.

---

## Quick Test (5 minutes)

### Quick Test 1: Basic Variant Purchase

**Scenario:**
```
Product: Medicine Box
- Base Unit: Single Box @ 50
- Variant: Outer Box (10x) @ 500
- Current Stock: 100 units
```

**Steps:**
1. Create GRN
2. Add product
3. Select variant: "Outer Box (10x)"
4. Enter qty: 5
5. Post GRN

**Expected Results:**
```
✅ Stock: 100 → 150 (added 50, not 5)
✅ Cost: Remains 50/unit
✅ Response shows conversionFactor: 10
```

**If Failed:** ❌
- Stock is 105 instead of 150 → Conversion not applied
- Check if `conversionFactor` field is in GRN item
- Verify backend is using factor

---

## Full Test Suite (30 minutes)

### Test Suite 1: Basic Unit Variants

#### Test 1.1: Single Unit (Factor 1)
```
Setup:
- Product: "Medicine A"
- Stock: 100 Single Boxes @ 50
- Variant: None (base unit only)

Action:
- GRN qty: 50 Single Boxes
- Cost: 50
- No discount

Assertions:
✓ Stock: 100 → 150 (+50)
✓ Cost: 50/unit (unchanged)
✓ Batch qty: 50 units
✓ Response: conversionFactor = 1 or not shown
✓ GL: Debit 2,500 (50 units × 50)
```

**Command:**
```bash
# In browser console, after GRN posts:
console.log("Stock:", productObject.quantityInStock);  // Should be 150
console.log("Response:", grnResponse.stockUpdate);      // Should show +50
```

---

#### Test 1.2: Outer Box (Factor 10)
```
Setup:
- Product: "Medicine B"
- Stock: 100 Single Boxes @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes
- Cost: 500 per box
- No discount
- Tax: 5% exclusive

Assertions:
✓ Stock: 100 → 150 (+50, NOT +5)
✓ Cost: 50/unit (maintained)
✓ Batch qty: 50 units (NOT 5)
✓ Response shows:
  - conversionFactor: 10
  - quantityReceivedInVariant: 5
  - quantityReceivedInBaseUnits: 50
✓ GL: Debit 2,625 (2,500 + 125 tax)

Math Verification:
- variant qty: 5 Outer Boxes
- factor: 10
- actual qty: 5 × 10 = 50 ✓
- cost/unit: 2,500 / 50 = 50 ✓
- tax: 2,500 × 0.05 = 125 ✓
```

**Pass/Fail:** _______

---

#### Test 1.3: Carton (Factor 100)
```
Setup:
- Product: "Medicine C"
- Stock: 50 Single Boxes @ 60
- Variant: Carton (100x) @ 6000

Action:
- GRN qty: 2 Cartons
- Cost: 6000 per carton
- No discount

Assertions:
✓ Stock: 50 → 250 (+200, NOT +2)
✓ Batch qty: 200 units
✓ Cost/unit: 60 (unchanged or calculated)
✓ Response:
  - quantityReceivedInBaseUnits: 200
  - conversionFactor: 100
```

**Pass/Fail:** _______

---

### Test Suite 2: FOC (Free On Cost) with Variants

#### Test 2.1: FOC with Single Unit
```
Setup:
- Product: "Medicine D"
- Stock: 100 @ 40
- No variants (single unit)

Action:
- GRN qty: 50
- FOC qty: 5
- Paid qty: 45 @ 40
- Cost total: 1,800

Assertions:
✓ Stock: 100 → 155 (+50, including 5 FOC)
✓ Cost: 1,800 / 50 = 36/unit ✓
✓ Batch: 50 units (all recorded)
✓ Batch cost/unit: 36
✓ WAC: (100×40 + 1,800) / (100+50) = 36
```

**Pass/Fail:** _______

---

#### Test 2.2: FOC with Variant
```
Setup:
- Product: "Medicine E"
- Stock: 100 Single @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (= 50 singles)
- FOC qty: 1 Outer Box (= 10 singles) 
- Paid qty: 4 Outer Boxes (= 40 singles)
- Paid cost: 4 × 500 = 2,000

Assertions:
✓ Stock: 100 → 150 (+50)
✓ FOC units: 10 (NOT 1)
✓ Paid units: 40 (NOT 4)
✓ Cost: 2,000 / 50 = 40/unit
✓ Response:
  - quantityReceivedInVariant: 5
  - quantityReceivedInBaseUnits: 50
  - focQuantity: 10 (NOT 1)
✓ Batch: 50 units
✓ Batch cost: 40/unit
✓ WAC: (100×50 + 2,000) / (100+50) = 40
```

**Pass/Fail:** _______

---

### Test Suite 3: Discounts with Variants

#### Test 3.1: Line Item Discount
```
Setup:
- Product: "Medicine F"
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes
- Discount: 10% (amount = 250)
- Paid: 2,500 - 250 = 2,250
- Paid qty: 50 units

Assertions:
✓ Stock: 100 → 150 (+50)
✓ Cost: 2,250 / 50 = 45/unit
✓ Response:
  - itemDiscount: 250
  - quantityReceivedInBaseUnits: 50
  - effectiveUnitCost: 45
✓ Batch cost: 45/unit
```

**Pass/Fail:** _______

---

#### Test 3.2: GRN Header Discount (Proportional)
```
Setup:
- Product: "Medicine G"
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- Item 1: 2 Outer Boxes (= 20 singles) @ 500 = 1,000
- Item 2: 50 Single @ 50 = 2,500
- Total before discount: 3,500
- GRN Header discount: 350 (10%)
- Item 1 share: 350 × (1,000/3,500) = 100
- Item 2 share: 350 × (2,500/3,500) = 250

Assertions for Item 1:
✓ Stock qty: 20 units
✓ Paid: 1,000 - 100 = 900
✓ Cost: 900 / 20 = 45/unit

Assertions for Item 2:
✓ Stock qty: 50 units
✓ Paid: 2,500 - 250 = 2,250
✓ Cost: 2,250 / 50 = 45/unit

Overall:
✓ Total stock increased: 70 units
✓ Both items' effective cost: 45/unit
✓ Proportional discount applied correctly
```

**Pass/Fail:** _______

---

### Test Suite 4: Costing Methods

#### Test 4.1: FIFO with Variants
```
Setup:
- Product: "Medicine H"
- Costing: FIFO
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (50 units) @ 500
- Effective cost: 500/10 = 50/unit

Assertions:
✓ Stock: 100 → 150
✓ Product cost: Still at latest = 50 (FIFO takes newest)
✓ Next FIFO pull uses these 50 at 50/unit
```

**Pass/Fail:** _______

---

#### Test 4.2: LIFO with Variants
```
Setup:
- Product: "Medicine I"
- Costing: LIFO
- Stock: 100 @ 50
- Variant: Carton (100x) @ 6000

Action:
- GRN qty: 1 Carton (100 units) @ 6000
- Effective cost: 6000/100 = 60/unit

Assertions:
✓ Stock: 100 → 200
✓ Product cost: 60 (LIFO takes newest)
✓ If sold: LIFO pulls from newest (100 @ 60)
✓ Then pulls from old stock (remaining @ 50)
```

**Pass/Fail:** _______

---

#### Test 4.3: WAC with Variants
```
Setup:
- Product: "Medicine J"
- Costing: WAC
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (50 units) @ 500
- Paid: 2,500
- New cost (WAC): (100×50 + 2,500) / (100+50) = 7,500 / 150 = 50

Assertions:
✓ Stock: 100 → 150
✓ Product cost: 50 (unchanged, fair average)
✓ Calculation correct: 7,500 / 150 = 50
✓ Next with different cost:
  - GRN qty: 5 Outer Boxes (50 units) @ 600 (= 3,000)
  - New WAC: (150×50 + 3,000) / (150+50) = 10,500 / 200 = 52.5
```

**Pass/Fail:** _______

---

### Test Suite 5: Multiple Variants in One GRN

#### Test 5.1: Mix of Variants
```
Setup:
- Product: "Medicine K"
- Stock: 100 @ 50
- Variants: 
  - Outer Box (10x) @ 500
  - Carton (100x) @ 5000
  - Single @ 50

Action:
- Line 1: 2 Cartons (200 units) @ 5000
- Line 2: 3 Outer Boxes (30 units) @ 500
- Line 3: 20 Single (20 units) @ 50
- Total to receive: 250 units

Assertions:
✓ Line 1 stock: +200
✓ Line 2 stock: +30
✓ Line 3 stock: +20
✓ Total stock: 100 → 350
✓ Each batch qty correct:
  - Batch 1: 200 units (NOT 2)
  - Batch 2: 30 units (NOT 3)
  - Batch 3: 20 units
✓ WAC cost calculated over all 250 units
```

**Pass/Fail:** _______

---

### Test Suite 6: Expiry Tracking

#### Test 6.1: StockBatch with Variant
```
Setup:
- Product: "Medicine L"
- trackExpiry: true
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (50 units)
- Expiry: 2025-12-31
- ManufacturingDate: today

Assertions:
✓ StockBatch created (not InventoryBatch)
✓ Batch qty: 50 (NOT 5)
✓ Batch expiryDate: 2025-12-31
✓ Stock: 100 → 150
✓ Response includes:
  - model: "StockBatch"
  - quantity: 50
  - quantityInVariants: 5
  - conversionFactor: 10
```

**Pass/Fail:** _______

---

#### Test 6.2: InventoryBatch without Expiry
```
Setup:
- Product: "Medicine M"
- trackExpiry: false
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (50 units)

Assertions:
✓ InventoryBatch created (not StockBatch)
✓ Batch quantity: 50
✓ quantityRemaining: 50
✓ Stock: 100 → 150
✓ Response includes:
  - model: "InventoryBatch"
  - quantity: 50
  - quantityInVariants: 5
```

**Pass/Fail:** _______

---

### Test Suite 7: GL Reconciliation

#### Test 7.1: Stock GL Entry with Variant
```
Setup:
- Product: "Medicine N"
- GL Inventory Account: 1401 (Stocks)
- GL Payable Account: 2401 (Vendor Payable)
- Stock: 100 @ 50
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (50 units) @ 500 each
- Net cost: 2,500
- Tax (5%): 125
- Total: 2,625

Expected GL Entries:
1. Debit 1401 Inventory: 2,625
   Credit 2401 Payable: 2,625

Stock Verification:
- Qty in stock: 150 units
- Cost/unit: 2,500 / 50 = 50
- GL value: 150 × 50 = 7,500
- GL Debit should be: 2,625 (just this GRN)
- Total inventory asset after: 
  - Before: 100 × 50 = 5,000
  - Plus: 2,625
  - After: 7,625

Assertions:
✓ GL Debit matches GRN cost: 2,625
✓ Inventory balance: 7,625 (100×50 + 50×50)
✓ Stock qty: 150 units
✓ GL reconciles: 150 units × 50 = 7,500 (stock value)
```

**Pass/Fail:** _______

---

#### Test 7.2: Cost Update Impact on GL
```
Setup:
- Product: "Medicine O"
- Stock: 100 @ 50 = 5,000 GL value
- Variant: Outer Box (10x) @ 500

Action:
- GRN qty: 5 Outer Boxes (50 units) @ 400 (discount case)
- Paid: 2,000 (effective 40/unit)

GL Impact:
- Debit 1401: 2,000
- Total GL value: 5,000 + 2,000 = 7,000
- New cost: (100×50 + 2,000) / 150 = 46.67/unit
- GL should reflect: 150 × 46.67 = 7,000.5 ≈ 7,000

Assertions:
✓ GL Debit: 2,000
✓ Stock qty: 150
✓ Cost updated: 46.67
✓ GL value: 7,000
✓ Reconcile: 150 × 46.67 ≈ 7,000
```

**Pass/Fail:** _______

---

### Test Suite 8: Error Scenarios

#### Test 8.1: Missing Conversion Factor
```
Action:
- GRN item created WITHOUT conversionFactor field
- Backend receives: item.quantity = 5 (no factor)

Expected:
✓ System defaults factor to: 1
✓ Stock += 5 (correct for single unit)
✓ No error thrown
✓ Backward compatible

Result:
✓ Pass if backward compatible
✓ Fail if error occurs
```

**Pass/Fail:** _______

---

#### Test 8.2: Zero or Null Factor
```
Action:
- GRN item with: conversionFactor = 0 or null
- Qty: 5

Expected:
✓ System defaults to factor: 1
✓ Stock += 5
✓ No error

Result:
✓ Pass if defaults to 1
✓ Fail if calculation breaks
```

**Pass/Fail:** _______

---

#### Test 8.3: Negative Quantity
```
Action:
- GRN qty: -5 (reverse/return)
- Factor: 10
- Current stock: 150

Expected:
✓ Stock -= 50 → 100
✓ Batch not created (negative qty handling)
✓ Cost not recalculated (may vary)

Result:
✓ Pass if quantities handled
✓ Fail if error
```

**Pass/Fail:** _______

---

## Performance Tests (Optional)

### Performance Test 1: Bulk GRN Processing
```
Setup:
- Single GRN with 100 items
- All with variants
- Mixed factors: 1, 5, 10, 50, 100

Expected:
- Processing time: < 5 seconds
- No memory leaks
- All calculations accurate

Measurement:
console.time("GRN_Processing");
// Post GRN
console.timeEnd("GRN_Processing");  // Should log < 5000ms
```

**Pass/Fail:** _______

---

## Checklist

### Pre-Testing
- [ ] Code changes reviewed
- [ ] No syntax errors
- [ ] All files compiled successfully
- [ ] Database backup taken

### During Testing
- [ ] Complete at least Quick Test
- [ ] Complete Full Test Suite
- [ ] Log any failures with details
- [ ] Capture screenshots of key assertions

### Post-Testing
- [ ] All tests passed: _____ / _____
- [ ] No regression issues
- [ ] GL reconciliation verified
- [ ] Performance acceptable
- [ ] Ready for production

---

## Test Results Summary

| Test Suite | Total | Passed | Failed | Notes |
|-----------|-------|--------|--------|-------|
| Quick Test | 1 | ___ | ___ | |
| Basic Units | 3 | ___ | ___ | |
| FOC Tests | 2 | ___ | ___ | |
| Discount Tests | 2 | ___ | ___ | |
| Costing Methods | 3 | ___ | ___ | |
| Multi-Variant | 1 | ___ | ___ | |
| Expiry Tracking | 2 | ___ | ___ | |
| GL Reconciliation | 2 | ___ | ___ | |
| Error Scenarios | 3 | ___ | ___ | |
| **TOTAL** | **19** | **___** | **___** | |

---

## Sign-Off

**Tester Name:** ________________________  
**Date:** ________________________  
**Overall Status:** ☐ PASS ☐ FAIL ☐ PARTIAL  

**Comments:**
```



```

**Ready for Production:** ☐ YES ☐ NO

---

## Troubleshooting

### Issue: Stock not multiplied by factor

**Diagnosis:**
1. Check if `conversionFactor` in GRN item
2. Check backend console logs
3. Verify conversionFactor extracted from selectedUnit

**Fix:**
- Ensure frontend passes conversionFactor
- Verify backend updateProductStock uses factor
- Test with console.log debugging

---

### Issue: Cost calculated wrong

**Diagnosis:**
1. Check effective unit cost calculation
2. Verify factor used in divisor
3. Check FOC handling

**Fix:**
- Review calculateEffectiveUnitCost implementation
- Ensure actualQuantity = item.quantity × factor
- Verify divide by actualQuantity, not item.quantity

---

### Issue: Batch quantity wrong

**Diagnosis:**
1. Check createOrUpdateBatch implementation
2. Verify actualQuantity calculated
3. Check batch.quantity assignment

**Fix:**
- Review batch creation code
- Ensure quantity = actualQuantity (not item.quantity)
- Test batch creation response

---

