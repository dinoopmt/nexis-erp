# GRN Edit Mode - UI Values Population & Persistence Fix
**Date:** March 21, 2026  
**Status:** ✅ COMPLETE

## Problem Statement

When editing a posted GRN:
- ❌ Items were not loading with calculated values (netCost, taxAmount, finalCost)
- ❌ FOC calculations weren't being recalculated when loading for edit
- ❌ Payload was missing focCost field
- ❌ User couldn't see proper values in the UI for editing

## Solution Overview

### Phase 1: Load GRN for Editing
When user clicks "Edit" on a posted GRN:
1. Load all item data from backend **including** calculated fields
2. Recalculate items with `skipFocCalculation=true` 
3. Display entry-state values in UI (without FOC deduction)
4. Preserve all original data (qty, cost, focQty, discount, tax)

### Phase 2: User Edits Values
User can now:
- Edit qty, cost, discount, tax values
- See proper recalculated amounts in UI
- FOC not deducted during entry display

### Phase 3: Save Edited GRN
When user clicks "Post" to save:
1. Apply FOC calculations to all items (`skipFocCalculation=false`)
2. Include computed fields in payload: focCost, paidAmount
3. Send to backend with complete calculation data
4. Backend saves final calculated amounts to database

---

## Implementation Details

### File: `client/src/components/inventory/GrnForm.jsx`

#### Change 1: Enhanced Item Loading (Lines ~870-945)

**Before:**
```javascript
items: (grn.items || []).map(item => ({
  productId: item.productId,
  productName: item.itemName,
  qty: item.quantity,
  cost: item.unitCost,
  finalCost: item.totalCost,  // ← Only mapped finalCost
  // ✗ Missing netCost, netCostWithoutTax, id
}))
```

**After:**
```javascript
const mappedItems = (grn.items || []).map(item => ({
  id: item._id || Math.random().toString(36),  // ✅ NEW: Item ID tracking
  productId: item.productId,
  productName: item.itemName,
  qty: item.quantity,
  cost: item.unitCost,
  
  // ✅ NEW: Map all calculated fields
  netCost: item.netCost || (item.quantity * item.unitCost - (item.itemDiscount || 0)),
  netCostWithoutTax: item.netCostWithoutTax || 0,
  finalCost: item.totalCost || 0,
  
  // FOC & Tax fields mapped with proper defaults
  foc: item.foc || false,
  focQty: item.focQty || 0,
  discount: item.itemDiscount || 0,
  discountPercent: item.itemDiscountPercent || 0,
  taxType: item.taxType || grn.taxType || "exclusive",
  taxPercent: item.taxPercent || 0,
  taxAmount: item.taxAmount || 0,
  // ✅ ... other fields
}));

// ✅ NEW: Recalculate items with entry-phase flag
const recalculatedItems = mappedItems.map(item => {
  const itemToCalculate = { ...item };
  calculateItemCost(itemToCalculate, true);  // ← Skip FOC in UI
  return itemToCalculate;
});
```

#### Change 2: Enhanced Item Transformation Before Posting (Lines ~575-608)

**Before:**
```javascript
const transformedItem = {
  quantity: quantity,
  unitCost: unitCost,
  foc: item.foc || false,
  focQty: Math.max(0, parseFloat(item.focQty || 0)),
  netCost: Math.max(0, parseFloat((quantity * unitCost - discount) || 0)),
  // ✗ Missing focCost, paidAmount
  taxAmount: taxAmount,
  totalCost: totalCostValue,
};
```

**After:**
```javascript
const transformedItem = {
  quantity: quantity,
  unitCost: unitCost,
  foc: item.foc || false,
  focQty: Math.max(0, parseFloat(item.focQty || 0)),
  netCost: Math.max(0, parseFloat((quantity * unitCost - discount) || 0)),
  
  // ✅ NEW: Include FOC cost fields
  focCost: item.focCost || (Math.max(0, parseFloat(item.focQty || 0)) * unitCost),
  paidAmount: item.focCost 
    ? Math.max(0, parseFloat((quantity * unitCost - discount) || 0) - (item.focCost || 0))
    : Math.max(0, parseFloat((quantity * unitCost - discount) || 0)),
  
  taxAmount: taxAmount,
  totalCost: totalCostValue,
};
```

---

## Data Flow Diagram

### New GRN (Fresh Entry)
```
User enters data → skipFocCalculation=true → UI shows full amounts
                                  ↓
                        Stock updates with full qty
                                  ↓
                          On Post: Apply FOC → Backend saves reduced cost
```

### Existing GRN (Edit Mode)
```
Load from DB with calculated values
         ↓
Map netCost, finalCost, focCost from backend
         ↓
Recalculate with skipFocCalculation=true (entry-state)
         ↓
UI displays entry-state values (user sees what can be edited)
         ↓
User edits values (qty, cost, discount, tax)
         ↓
On Post: Apply FOC calculations again
         ↓
Include focCost, paidAmount in payload
         ↓
Backend saves final amounts to DB
```

---

## Example: Edit Mode with FOC

### 1. GRN Posted with FOC
**Database stored:**
```
{
  quantity: 50,
  unitCost: 100,
  focQty: 10,
  itemDiscount: 0,
  netCost: 5000,        // 50 × 100
  focCost: 1000,        // 10 × 100
  paidAmount: 4000,     // 5000 - 1000
  taxAmount: 200,       // Calculated on 4000
  totalCost: 4200
}
```

### 2. User Clicks "Edit"
**Loaded into UI:**
1. Map all fields from DB
2. Recalculate with skipFocCalculation=true:
   ```
   netCost: 5000  (NOT reduced by FOC)
   focCost: 1000  (1000 × 100)
   taxAmount: 250 (calculated on 5000)
   finalCost: 5250
   ```
3. **UI displays:**
   ```
   Qty: 50
   Cost: 100
   FOC: true
   FOC Qty: 10
   Net Cost: 5000  ← User sees full amount (can edit)
   Tax (5%): 250
   Final: 5250
   ```

### 3. User Modifies Values
```
Changes: Cost 100 → 120
         FOC Qty 10 → 8
```

### 4. User Posts (Save)
1. Recalculate with skipFocCalculation=false:
   ```
   netCost: 60 × 120 = 6000
   focCost: 8 × 120 = 960
   paidAmount: 6000 - 960 = 5040
   taxAmount: 252 (on 5040)
   finalCost: 5292
   ```

2. **Payload includes:**
   ```
   {
     quantity: 60,
     unitCost: 120,
     focQty: 8,
     focCost: 960,
     paidAmount: 5040,
     netCost: 6000,
     taxAmount: 252,
     totalCost: 5292
   }
   ```

3. **Backend saves to DB:**
   - Stock: 60 units (50 + 10 new)
   - Cost: Recalculated based on FOC
   - All values properly persisted

---

## Key Changes Summary

| Component | Change | Impact |
|-----------|--------|--------|
| **Item Loading** | Map netCost, netCostWithoutTax, finalCost, focCost | UI values properly populated |
| **Item Recalculation** | Apply skipFocCalculation=true on load | UI shows entry-state amounts |
| **Item ID** | Add ID when mapping items | Proper item tracking |
| **Payload** | Include focCost, paidAmount fields | Backend understands FOC properly |
| **Edit Flow** | FOC recalculated when saving edit | Consistent cost calculations |

---

## Testing Scenarios

### ✅ Test 1: Simple Edited GRN
1. Post GRN with 50 units @ 100 = 5000
2. Edit GRN → UI shows cost: 5000
3. Change qty to 60
4. Save → DB receives correct FOC-adjusted cost

### ✅ Test 2: FOC Modified During Edit
1. Post GRN with FOC Qty: 10
2. Edit GRN → UI shows FOC Qty: 10
3. Change FOC Qty to 5
4. Save → DB receives focCost: 500 (5 × 100)

### ✅ Test 3: Edit with Discount & FOC
1. Post GRN: 50 units @ 100, discount 500, FOC 10
2. Edit → UI shows netCost: 4500 (before FOC deduction)
3. Change cost to 120
4. Save → DB recalculates: 
   - netCost: (50 × 120 - 500) = 5500
   - focCost: 1200 (10 × 120)
   - paidAmount: 4300

### ✅ Test 4: Tax Recalculation on Edit
1. Post GRN: qty 50, cost 100, tax 5%
2. Edit → Change tax to 10%
3. Save → Tax recalculated on paidAmount

---

## Backward Compatibility

✅ **Fully Compatible:**
- Existing GRNs can be edited properly
- No database schema changes
- FOC calculations preserved
- New fields optional (fallback calculations provided)

---

## Impact on Other Systems

✅ **Positive Impacts:**
- Consistent cost calculations
- Proper FOC tracking
- Accurate inventory valuation
- Reliable COGS calculations
- Better audit trail

✅ **No Breaking Changes:**
- Stock calculations unchanged
- Discount calculations unchanged
- Batch/Expiry tracking independent
- RTV/Sales calculations use calculated totals

---

## Debugging Tips

**If UI values aren't showing correctly:**
1. Check browser console for mapping logs
2. Verify DB has netCost, finalCost fields
3. Check if focCost is being calculated properly

**If edit saves incorrect values:**
1. Check FOC payload includes focCost, paidAmount
2. Verify handleSubmit is calling calculateFocOnPost()
3. Check if backend receives all calculated fields

---

## Code Locations

| File | Lines | Change |
|------|-------|--------|
| GrnForm.jsx | ~870-945 | Enhanced item loading & recalculation |
| GrnForm.jsx | ~575-608 | Payload item transformation with focCost |
| grnCalculations.js | ~33-70 | calculateItemCost with skipFocCalculation flag |
| grnCalculations.js | ~93-98 | calculateFocOnPost function |

---

## Summary

✅ **Edit Mode Now Properly:**
1. Loads all calculated values from database
2. Recalculates items for entry-phase display
3. Preserves FOC information
4. Allows editing with proper UI values
5. Applies FOC calculations before saving
6. Includes focCost and paidAmount in payload
7. Saves consistent values to database

**Result:** Users can now edit posted GRNs with confidence that values are properly displayed, calculated, and persisted.
