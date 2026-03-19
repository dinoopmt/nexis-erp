# FOC & Line-Wise Discount Cost Calculation - Implementation Check

## Current Status: ⚠️ Issues Found

### Problem 1: FOC (Free on Cost) Items ❌
**Current Behavior:**
```javascript
// updateProductStock() - CORRECT ✅
quantityReceived = 50 units  // Including FOC
focQuantity = 10 units       // Free items
product.quantityInStock += 50 // All quantities added (correct)

// updateProductCost() - INCORRECT ❌  
newCost = item.unitCost // Uses 50 units cost
// Should exclude FOC quantity in costing calculation!
```

**What Should Happen:**
```
Receive: 50 units @ AED 100/unit
  - Paid: 40 units @ 100 = AED 4,000
  - Free: 10 units FOC = AED 0
  - Total: 50 units, AED 4,000

Cost per Unit (for costing) = 4,000 / 50 = AED 80
NOT 4,000 / 40 = AED 100

Why? Because you have 50 units of stock, but only paid for 40.
The cost reflects what you actually PAID across ALL units you received.
```

### Problem 2: Line-Wise Discount Handling ✅ CORRECT
**Status:** Line-wise discounts are properly handled since the update!

```javascript
// Frontend calculates:
netCost = (qty × cost) - discount
calculateItemCost() ✅ Works correctly

// Backend calculates:
effectiveUnitCost = netCost / qty ✅ Correct
Uses in FIFO/LIFO/WAC ✅ Implemented
```

---

## FOC Calculation Logic

### Step-by-Step Calculation

**Scenario 1: FOC with No Discount**
```
Qty: 50 units
Unit Cost: 100
FOC Qty: 10 units
Item Discount: 0

Paid Quantity: 50 - 10 = 40 units
Paid Amount: 40 × 100 = 4,000

Cost per Unit = 4,000 / 50 = 80 (not 100!)
```

**Scenario 2: FOC + Line Discount**
```
Qty: 50 units
Unit Cost: 100
Item Discount: 500 (10% of gross amount)
FOC Qty: 10 units

Gross Amount: 50 × 100 = 5,000
After Discount: 5,000 - 500 = 4,500
Paid Quantity: 50 - 10 = 40 units
Paid Amount: 4,500 - (10 × 100) = 3,500

Cost per Unit = 3,500 / 50 = 70 (cheaper due to FOC!)
```

**Scenario 3: FOC + Header Discount**
```
Item: 50 units @ 100, FOC: 10
GRN Header Discount: 500 (10% of all items)

Gross Item: 5,000
Proportional Header Discount: 500
Item Subtotal: 4,500

FOC Impact: 10 × 100 = 1,000 free
Paid: 4,500 - 1,000 = 3,500

Cost per Unit = 3,500 / 50 = 70
```

---

## CORRECT Formula with FOC

### For FIFO/LIFO
```javascript
const paidQuantity = item.quantity - item.focQty;
const paidAmount = item.netCost - (item.focQty * item.unitCost);
// Adjust for header discount if applicable
const effectiveUnitCost = paidAmount / item.quantity;
// Divide by TOTAL quantity, not paid quantity!
```

### For WAC (Weighted Average)
```javascript
// Calculate weighted average based on actual cost
const paidQuantity = item.quantity - item.focQty;
let paidAmount = item.netCost;

// Reduce by FOC cost
if (item.focQty > 0) {
  const focCost = item.focQty * item.unitCost;
  paidAmount = paidAmount - focCost;
}

const newCost = (oldStock × oldCost + paidAmount) / (oldStock + item.quantity);
// Still divide by TOTAL quantity when averaging!
```

---

## Implementation Fix Required

### Step 1: Update Frontend Calculation
```javascript
// In grnCalculations.js - calculateItemCost()

export const calculateItemCost = (item) => {
  const qty = parseFloat(item.qty) || 0;
  const cost = parseFloat(item.cost) || 0;
  const discount = parseFloat(item.discount) || 0;
  const focQty = parseFloat(item.focQty) || 0;  // ← ADD THIS
  const taxPercent = parseFloat(item.taxPercent) || 0;

  let netCost = qty * cost;

  // Apply discount
  if (item.discountType === "percentage") {
    item.discount = (netCost * discount) / 100;
  }
  netCost = netCost - discount;

  // ✅ NEW: Reduce for FOC items
  const focCost = focQty * cost;  // Free items cost
  const paidCost = netCost - focCost;  // What actually costs
  
  // Calculate tax on PAID amount (not FOC)
  if (item.taxType === "exclusive") {
    item.taxAmount = (paidCost * taxPercent) / 100;
    item.finalCost = paidCost + item.taxAmount;
    item.netCostWithoutTax = paidCost;
  } else if (item.taxType === "inclusive") {
    item.netCostWithoutTax = paidCost / (1 + taxPercent / 100);
    item.taxAmount = paidCost - item.netCostWithoutTax;
    item.finalCost = paidCost;
  } else {
    item.taxAmount = 0;
    item.finalCost = paidCost;
    item.netCostWithoutTax = paidCost;
  }

  item.netCost = paidCost;  // Changed from netCost
};
```

### Step 2: Update Backend Cost Calculation
```javascript
// In GRNStockUpdateService.js - calculateEffectiveUnitCost()

static calculateEffectiveUnitCost(item, grnData = {}) {
  try {
    // ✅ Handle FOC items first
    const focQty = item.focQty || 0;
    
    // Start with item's net cost (already has item-level discount applied)
    let itemNetCost = item.netCost || (item.quantity * item.unitCost - (item.itemDiscount || 0));

    // ✅ NEW: Reduce by FOC cost
    if (focQty > 0) {
      const focCost = focQty * item.unitCost;
      itemNetCost = itemNetCost - focCost;
    }

    // Apply proportional GRN header discount if exists
    if (grnData.discountAmount > 0 || grnData.discountPercent > 0) {
      const totalSubtotal = (grnData.netTotal + grnData.discountAmount) - (grnData.taxAmount || 0);
      if (totalSubtotal > 0) {
        const proportionalDiscount = (item.totalCost / totalSubtotal) * grnData.discountAmount;
        itemNetCost = itemNetCost - proportionalDiscount;
      }
    }

    // ✅ CRITICAL: Divide by TOTAL quantity, not paid quantity
    // This spreads the cost across all units received
    const effectiveUnitCost = itemNetCost / item.quantity;
    return effectiveUnitCost;
  } catch (error) {
    console.warn("⚠️  Error calculating effective unit cost:", error.message);
    return item.unitCost;
  }
}
```

### Step 3: Update Frontend Discount Logic
```javascript
// No changes needed if backend handles correctly
// But verify frontend display shows:
// - Original Cost: 100
// - After Discount: X
// - Effective Cost (with FOC): Y
```

---

## Example Walkthrough

### Scenario: Mixed Discount + FOC

**Input:**
```
qty: 50
unitCost: 100
itemDiscount: 500 (10%)
focQty: 10
taxType: exclusive, tax: 5%
```

**Frontend (calculateItemCost):**
```
Step 1: Gross = 50 × 100 = 5,000
Step 2: Apply Discount = 5,000 - 500 = 4,500
Step 3: FOC Cost = 10 × 100 = 1,000
Step 4: Paid Cost = 4,500 - 1,000 = 3,500
Step 5: Tax (exclusive) = 3,500 × 5% = 175
Step 6: Final = 3,500 + 175 = 3,675

Displayed in GRN:
- Gross: 5,000
- Discount: 500
- FOC Cost: 1,000
- Taxable: 3,500
- Tax: 175
- Final: 3,675
```

**Backend (Cost Update):**
```
Effective Unit Cost = 3,500 / 50 = 70

For WAC (old: 100@50):
newCost = (100×50 + 3500) / (100+50)
        = 8500 / 150
        = 56.67 (not 63.33)
```

---

## Testing Cases for Line-Wise Discount + FOC

### Test 1: Discount Only (No FOC)
```
qty: 50, cost: 100, discount: 500, focQty: 0
Expected Effective Cost: 90 ✅
```

### Test 2: FOC Only (No Discount)
```
qty: 50, cost: 100, discount: 0, focQty: 10
Expected Effective Cost: 80
(because 40 paid units out of 50 total)
```

### Test 3: Both Discount + FOC
```
qty: 50, cost: 100, discount: 500, focQty: 10
Paid: (50×100 - 500) - (10×100) = 3,500
Expected Effective Cost: 70
```

### Test 4: Header Discount + FOC
```
qty: 50, cost: 100, focQty: 10
GRN Discount: 500
Item Share: (5000/25000) × 500 = 100
Paid: (5000 - 100) - 1000 = 3900
Expected Effective Cost: 78
```

---

## Database Fields Check

**GRN Item Schema:**
```javascript
{
  quantity: 50,           // ✅ Total received
  unitCost: 100,         // ✅ Per unit price
  itemDiscount: 500,     // ✅ Line discount
  itemDiscountPercent: 10, // ✅ Discount %
  foc: true,             // ✅ Is FOC item?
  focQty: 10,            // ✅ Free quantity
  netCost: 4500,         // After discount (NEEDS UPDATE)
  totalCost: 4500,       // Final line total (NEEDS UPDATE)
  taxType: exclusive,    // ✅ Tax type
  taxPercent: 5,         // ✅ Tax %
  taxAmount: 175,        // Tax on paid (NEEDS UPDATE)
}
```

---

## Response Example (After Fix)

```json
{
  "grnNumber": "GRN-2024-001",
  "inventory": {
    "costUpdates": [
      {
        "productId": "...",
        "itemCode": "PROD-001",
        "costingMethod": "WAC",
        "oldCost": 50,
        "newCost": 56.67,
        "itemOriginalUnitCost": 100,
        "itemLineDiscount": 500,
        "focQty": 10,
        "focCost": 1000,
        "effectiveUnitCost": 70,
        "paidAmount": 3500,
        "taxAmount": 175
      }
    ]
  }
}
```

---

## Summary of Issues

| Issue | Current | Should Be |
|-------|---------|-----------|
| **Line Discount** | ✅ Handled correctly | ✅ Working |
| **FOC Items** | ❌ NOT accounted for | ❌ NEEDS FIX |
| **Effective Cost Calc** | Partial | Needs FOC logic |
| **Product Stock** | ✓ Includes all qty | ✓ Correct |
| **Product Cost** | ❌ Inflated (ignores FOC) | Should exclude FOC |
| **WAC Calculation** | ❌ Wrong (uses full qty) | Should use paid amount |

---

## Next Steps

1. **Update Frontend** - Calculate netCost excluding FOC items
2. **Update Backend** - Add FOC deduction in cost calculation
3. **Update Response** - Include FOC details in output
4. **Test Cases** - Verify all 4 discount/FOC combinations
5. **Documentation** - Update GRN posting guide

