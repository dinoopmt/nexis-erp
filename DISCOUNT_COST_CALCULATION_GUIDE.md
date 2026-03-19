# Discount Impact on Product Cost Calculation

## Problem
When a discount is applied to a GRN item, the product cost should use the **effective cost (after discount)**, not the original unit cost.

---

## Data Available in GRN Item

```javascript
{
  unitCost: 100,              // Price per unit (BEFORE discount)
  quantity: 50,               // Qty ordered
  itemDiscount: 500,          // Discount amount (AED)
  itemDiscountPercent: 10,    // Discount percentage (10%)
  netCost: 4500,              // (qty × unitCost) - discount
  totalCost: 4500,            // Final cost for all units
}
```

---

## Cost Calculation Formulas

### CURRENT APPROACH (INCORRECT ❌)
```javascript
// Uses unitCost directly without considering discount
newCost = item.unitCost;  // 100 (WRONG - ignores 10% discount)
```

### CORRECT APPROACH ✅ - Effective Unit Cost

**Formula:**
```
Effective Unit Cost = (unitCost × quantity - itemDiscount) / quantity
                    = netCost / quantity
```

**Example:**
```
unitCost = 100
quantity = 50
itemDiscount = 500  (10% discount)

Effective Unit Cost = (100 × 50 - 500) / 50
                    = 4500 / 50
                    = 90 (per unit after discount)
```

---

## Implementation for Each Costing Method

### FIFO (First In, First Out)
```javascript
// Use effective cost (after discount)
const effectiveUnitCost = (item.unitCost * item.quantity - item.itemDiscount) / item.quantity;
newCost = effectiveUnitCost;
// newCost = 90 (instead of 100)
```

### LIFO (Last In, First Out)
```javascript
// Same as FIFO - use effective cost
const effectiveUnitCost = (item.unitCost * item.quantity - item.itemDiscount) / item.quantity;
newCost = effectiveUnitCost;
// newCost = 90
```

### WAC (Weighted Average Cost) ⭐ MOST COMMON
```javascript
// Calculate weighted average including discount
const currentStock = product.quantityInStock - item.quantity;
const currentTotalValue = currentStock * oldCost;

// Use discounted total cost for new items
const newItemsValue = item.netCost;  // Already includes discount (qty × unitCost - discount)

newCost = (currentTotalValue + newItemsValue) / (currentStock + item.quantity);
```

**Example:**
```
Current Stock: 100 units @ AED 50/unit = AED 5,000 total

New GRN:
- Qty: 50
- Unit Cost: 100
- Discount: 500 (10%)
- Net Cost: 4,500 (this is quantity × unitCost - discount)

OLD WAC (WRONG):
newCost = (100×50 + 50×100) / (100+50) = 10000/150 = AED 66.67

NEW WAC (CORRECT):
newCost = (100×50 + 4500) / (100+50) = 9500/150 = AED 63.33
```

---

## Subtotal Discount (Applies to Entire GRN) 💡

If discount is at the **GRN header level** (not per-item):

```javascript
// GRN totals
{
  totalSubtotal: 25000,
  discountAmount: 2500,  // Or discountPercent: 10%
  netTotal: 22500
}

// Distribute discount proportionally to each item
const proportionalDiscount = (item.totalCost / totalSubtotal) * discountAmount;
const itemNetCost = item.totalCost - proportionalDiscount;
const effectiveUnitCost = itemNetCost / item.quantity;
```

**Example:**
```
GRN Total: 25,000
Discount: 2,500 (10% off entire order)
Net Total: 22,500

Item 1: totalCost = 10,000
  Proportional Discount = (10,000 / 25,000) × 2,500 = 1,000
  Item Net Cost = 10,000 - 1,000 = 9,000

Item 2 (PROD-001): quantity = 50, totalCost = 5,000
  Proportional Discount = (5,000 / 25,000) × 2,500 = 500
  Item Net Cost = 5,000 - 500 = 4,500
  Effective Unit Cost = 4,500 / 50 = 90
```

---

## Updated GRNStockUpdateService Implementation

### Key Changes

**1. Calculate Effective Cost Function**
```javascript
static calculateEffectiveUnitCost(item) {
  // Handle item-level discount
  if (item.itemDiscount > 0 || item.itemDiscountPercent > 0) {
    return item.netCost / item.quantity;
  }
  
  // No item-level discount, use unit cost
  return item.unitCost;
}
```

**2. Handle Subtotal Discount (GRN-level)**
```javascript
static calculateEffectiveUnitCostWithHeaderDiscount(item, grnData) {
  let itemNetCost = item.totalCost;
  
  // If GRN has header-level discount, distribute proportionally
  if (grnData.discountAmount > 0) {
    const totalSubtotal = (grnData.netTotal + grnData.discountAmount) - (grnData.taxAmount || 0);
    const proportionalDiscount = (item.totalCost / totalSubtotal) * grnData.discountAmount;
    itemNetCost = item.totalCost - proportionalDiscount;
  }
  
  return itemNetCost / item.quantity;
}
```

**3. Update Cost Calculation**
```javascript
static async updateProductCost(product, item, grnData) {
  try {
    const costingMethod = product.costingMethod || "FIFO";
    const oldCost = product.cost || 0;
    
    // ✅ Calculate effective unit cost (after discount)
    const effectiveUnitCost = this.calculateEffectiveUnitCostWithHeaderDiscount(item, grnData);
    
    let newCost;
    
    if (costingMethod === "FIFO") {
      newCost = effectiveUnitCost;
    } else if (costingMethod === "LIFO") {
      newCost = effectiveUnitCost;
    } else if (costingMethod === "WAC") {
      // Weighted Average Cost using discounted cost
      const currentStock = product.quantityInStock - item.quantity;
      const currentTotalValue = currentStock * oldCost;
      
      // ✅ Use itemNetCost or calculate it
      let itemNetCost = item.netCost || (item.totalCost - item.itemDiscount);
      
      // If GRN has header discount, add proportional portion
      if (grnData.discountAmount > 0) {
        const totalSubtotal = (grnData.netTotal + grnData.discountAmount) - (grnData.taxAmount || 0);
        const proportionalDiscount = (item.totalCost / totalSubtotal) * grnData.discountAmount;
        itemNetCost = item.totalCost - proportionalDiscount;
      }
      
      newCost = (currentTotalValue + itemNetCost) / (currentStock + item.quantity);
    } else {
      newCost = effectiveUnitCost;
    }
    
    // Round to 2 decimal places
    newCost = Math.round(newCost * 100) / 100;
    
    product.cost = newCost;
    product.lastCostUpdate = new Date();
    product.lastCostUpdateBy = grnData.createdBy;
    product.costingMethod = costingMethod;
    
    await product.save();
    
    return {
      productId: product._id.toString(),
      itemCode: product.itemcode,
      costingMethod,
      oldCost,
      newCost,
      effectiveUnitCost: Number(effectiveUnitCost.toFixed(2)),
      itemOriginalUnitCost: item.unitCost,
      discountApplied: item.itemDiscount || 0,
      difference: newCost - oldCost
    };
    
  } catch (error) {
    console.error("❌ Error updating product cost:", error);
    return null;
  }
}
```

---

## Example Scenarios

### Scenario 1: Item-Level Discount Only

```
Product: PROD-001
Qty: 50
Unit Cost: 100
Item Discount: 500 (10% of 5000)
Net Cost: 4,500

Effective Unit Cost = 4,500 / 50 = 90

If WAC and old stock = 100 @ 50:
New Cost = (100×50 + 4500) / 150 = 63.33
```

### Scenario 2: Subtotal (GRN-Level) Discount

```
GRN Total Items:
  Item 1: 10,000
  Item 2: 15,000
  Total: 25,000

GRN Discount: 2,500 (10% of total)

Item 2 Proportional Discount = (15,000/25,000) × 2,500 = 1,500
Item 2 Net Cost = 15,000 - 1,500 = 13,500

If qty = 60:
Effective Unit Cost = 13,500 / 60 = 225
```

### Scenario 3: Both Item & Header Discount

```
Item Total Cost: 5,000
Item Discount: 500 (10% item discount)
Item Net After Item Disc: 4,500

GRN Header Discount: 2,500 (distributed proportionally)
This Item's Share: (5,000/25,000) × 2,500 = 500

Final Net Cost = 4,500 - 500 = 4,000
Effective Unit Cost = 4,000 / 50 = 80
```

---

## Fields to Update in GRN Item

Ensure these fields are passed to backend:
```javascript
{
  unitCost: Number,          // ✅ Include
  quantity: Number,          // ✅ Include
  itemDiscount: Number,      // ✅ Include or calculate
  itemDiscountPercent: Number, // ✅ Include
  netCost: Number,           // ✅ Include or calculate
  totalCost: Number,         // ✅ Include or calculate
  
  // Optional (from GRN header):
  grnDiscountAmount: Number,
  grnDiscountPercent: Number,
}
```

---

## Response Example

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
        "effectiveUnitCost": 90,
        "itemOriginalUnitCost": 100,
        "discountApplied": 500,
        "difference": 13.33
      }
    ]
  }
}
```

---

## Summary

| Component | Formula | Example |
|-----------|---------|---------|
| Effective Unit Cost | netCost ÷ quantity | 4500 ÷ 50 = 90 |
| FIFO Cost | effective unit cost | 90 |
| LIFO Cost | effective unit cost | 90 |
| WAC Cost | (oldStock×oldCost + netCost) ÷ totalStock | (100×50 + 4500) ÷ 150 = 63.33 |
| Header Discount | proportional to item cost | (itemCost ÷ total) × discAmount |

✅ **Use item.netCost for cost calculations** (it already has discounts applied)  
✅ **Or calculate: (unitCost × quantity - itemDiscount) / quantity**  
✅ **For header discount: distribute proportionally to each item**

