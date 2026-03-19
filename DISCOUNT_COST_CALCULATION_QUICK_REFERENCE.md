# Discount Cost Calculation - Quick Implementation Guide

## Quick Comparison: Before vs After

### ❌ BEFORE (Using Original Unit Cost)
```javascript
// OLD CODE
let newCost;
if (costingMethod === "FIFO") {
  newCost = item.unitCost;  // 100 (ignores discount)
} else if (costingMethod === "WAC") {
  const newItemsValue = item.quantity * item.unitCost;  // 50 × 100 = 5000
  newCost = (currentTotalValue + newItemsValue) / (currentStock + item.quantity);
  // = (100×50 + 5000) / 150 = 66.67
}

// Problem: Discount ignored! Product cost too high.
```

### ✅ AFTER (Using Effective Cost After Discount)
```javascript
// NEW CODE - CORRECT
const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData);
// = (quantity × unitCost - itemDiscount) / quantity
// = (50 × 100 - 500) / 50 = 90

let newCost;
if (costingMethod === "FIFO") {
  newCost = effectiveUnitCost;  // 90 (CORRECT - includes discount)
} else if (costingMethod === "WAC") {
  let newItemsValue = item.netCost;  // 4500 (already discounted)
  newCost = (currentTotalValue + newItemsValue) / (currentStock + item.quantity);
  // = (100×50 + 4500) / 150 = 63.33 (CORRECT)
}
```

---

## Real-World Example

### Scenario
```
Current Stock:    100 units @ AED 50/unit     = AED 5,000 total value
Incoming GRN:     50 units @ AED 100/unit     = AED 5,000
With 10% Discount:                             = AED 4,500 (net)
```

### OLD CALCULATION ❌
```
FIFO: newCost = 100 (full price, discount ignored)
WAC:  newCost = (5000 + 5000) / 150 = 66.67 (full prices)

Problem: Overstates product cost!
```

### NEW CALCULATION ✅
```
FIFO: newCost = 90 (effective after 10% discount)
WAC:  newCost = (5000 + 4500) / 150 = 63.33 (includes discount)

Result: More accurate product cost!
```

---

## Three Discount Scenarios

### 1️⃣ Item-Level Discount Only
```javascript
{
  quantity: 50,
  unitCost: 100,
  itemDiscount: 500,        // 10% of 5000
  netCost: 4500,            // Already calculated in frontend
}

Effective Cost = 4500 / 50 = 90
```

### 2️⃣ GRN Header Discount Only
```javascript
{
  quantity: 50,
  unitCost: 100,
  itemDiscount: 0,
  totalCost: 5000,
  
  // GRN level:
  totalSubtotal: 25000,     // All items
  discountAmount: 2500,     // 10% off entire GRN
}

This Item's Share = (5000 / 25000) × 2500 = 500
Effective Cost = (5000 - 500) / 50 = 90
```

### 3️⃣ Both Item + Header Discount
```javascript
{
  quantity: 50,
  unitCost: 100,
  itemDiscount: 500,        // Item level (10%)
  totalCost: 5000,          // Before any discount
  
  // GRN level:
  discountAmount: 2500,     // Header discount (10%)
}

Step 1: Apply item discount = 5000 - 500 = 4500
Step 2: Apply proportional header = 4500 - (5000/25000 × 2500) = 4000
Result: Effective Cost = 4000 / 50 = 80
```

---

## Code Implementation Checklist

### ✅ Add Helper Function
```javascript
static calculateEffectiveUnitCost(item, grnData = {}) {
  // Calculate net cost (item discount already included in item.netCost)
  let itemNetCost = item.netCost || (item.quantity * item.unitCost - (item.itemDiscount || 0));
  
  // Apply header discount if exists
  if (grnData.discountAmount > 0) {
    const proportion = item.totalCost / grnData.netTotal + grnData.discountAmount;
    const headerDiscountShare = proportion * grnData.discountAmount;
    itemNetCost -= headerDiscountShare;
  }
  
  return itemNetCost / item.quantity;
}
```

### ✅ Update FIFO Cost
```javascript
if (costingMethod === "FIFO") {
  const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData);
  newCost = effectiveUnitCost;  // Changed from item.unitCost
}
```

### ✅ Update LIFO Cost
```javascript
if (costingMethod === "LIFO") {
  const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData);
  newCost = effectiveUnitCost;  // Changed from item.unitCost
}
```

### ✅ Update WAC Cost
```javascript
if (costingMethod === "WAC") {
  const currentStock = product.quantityInStock - item.quantity;
  const currentTotalValue = currentStock * oldCost;
  
  // Calculate net value for new items (with discounts)
  let newItemsValue = item.netCost;  // Changed from item.quantity * item.unitCost
  
  // Apply header discount
  if (grnData.discountAmount > 0) {
    const proportion = item.totalCost / (grnData.netTotal + grnData.discountAmount);
    newItemsValue = item.totalCost - (proportion * grnData.discountAmount);
  }
  
  newCost = (currentTotalValue + newItemsValue) / (currentStock + item.quantity);
}
```

### ✅ Update Response
```javascript
return {
  productId: product._id.toString(),
  itemCode: product.itemcode,
  costingMethod,
  oldCost,
  newCost,
  itemOriginalUnitCost: item.unitCost,      // ← NEW
  effectiveUnitCost: effectiveUnitCost,     // ← NEW
  itemDiscount: item.itemDiscount || 0,     // ← NEW
  headerDiscountApplied: grnData.discountAmount || 0, // ← NEW
  difference: newCost - oldCost
};
```

---

## Testing Examples

### Test Case 1: Simple Discount
```bash
POST /api/v1/grn
{
  "items": [
    {
      "productId": "prod1",
      "quantity": 50,
      "unitCost": 100,
      "itemDiscount": 500,    // 10% discount
      "netCost": 4500,
      "totalCost": 4500
    }
  ]
}

Expected Cost = 90 (not 100)
```

### Test Case 2: Header Discount
```bash
POST /api/v1/grn
{
  "items": [
    {
      "quantity": 50,
      "unitCost": 100,
      "netCost": 5000,
      "totalCost": 5000
    }
  ],
  "discountAmount": 500,      // 10% header discount
  "netTotal": 4500
}

Expected Cost = 90 (5000 - 500) / 50
```

### Test Case 3: Both Discounts
```bash
POST /api/v1/grn
{
  "items": [
    {
      "quantity": 50,
      "unitCost": 100,
      "itemDiscount": 250,      // 5% item discount
      "netCost": 4750,
      "totalCost": 5000
    }
  ],
  "discountAmount": 500,        // 10% header discount
  "netTotal": 4500
}

Expected Cost ≈ 85 (after both discounts)
```

---

## Key Points to Remember

| Point | Value |
|-------|-------|
| **Use for FIFO** | Effective unit cost |
| **Use for LIFO** | Effective unit cost |
| **Use for WAC** | Item's net cost (quantity × effective cost) |
| **Unit Variants** | New cost × conversion factor (automatic) |
| **Header Discount** | Distribute proportionally by item% |
| **Item Discount** | Already in item.netCost field |
| **Tax Inclusive?** | Apply on effective cost, not original |

---

## API Response Example

```json
{
  "grnNumber": "GRN-2024-001",
  "inventory": {
    "costUpdates": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "itemCode": "PROD-001",
        "costingMethod": "WAC",
        "oldCost": 50,
        "newCost": 63.33,
        "itemOriginalUnitCost": 100,
        "effectiveUnitCost": 90,
        "itemDiscount": 500,
        "headerDiscountApplied": 0,
        "difference": 13.33
      }
    ]
  }
}
```

---

## Field Reference in GRN Item

```javascript
{
  unitCost: 100,            // Original price per unit
  quantity: 50,             // Qty ordered
  itemDiscount: 500,        // Discount amount (if any)
  itemDiscountPercent: 10,  // Discount % (for reference)
  netCost: 4500,            // (qty × unitCost) - itemDiscount
  totalCost: 4500,          // Final cost for this line
  
  // Tax information
  taxType: "exclusive",     // exclusive | inclusive | notax
  taxPercent: 5,            // Tax rate
  taxAmount: 225,           // Tax on net cost
}

// GRN level fields
{
  netTotal: 22500,          // Grand total after all discounts & tax
  discountAmount: 2500,     // GRN header discount
  discountPercent: 10,      // Header discount %
  taxAmount: 250,           // Total tax
}
```

---

## Summary

The fix ensures product costs are calculated using the **actual amount paid**, not the list price. This is critical for:
- ✅ Accurate inventory valuation
- ✅ Proper COGS calculation
- ✅ Correct profit margins
- ✅ GL reconciliation
- ✅ Stock variance analysis

**Before**: Product cost = 100 (ignores discount)  
**After**: Product cost = 90 (reflects what was actually paid)
