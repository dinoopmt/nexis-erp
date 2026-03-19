# Unit Variant Purchase Flow - Stock Update Calculation Check

**Status:** ⚠️ ISSUE IDENTIFIED

---

## The Issue: Quantity Conversion Missing

### Scenario
```
Product: Medicine Box
Base Unit: Single Box (cost: AED 50)
Variant: Outer Box (10x) (cost: AED 500)

User enters GRN:
- Selects variant: Outer Box (10x)
- Qty: 5
- Cost: 500 per outer box
```

### Expected Stock Update
```
5 Outer Boxes × 10 = 50 base units
quantityInStock should += 50 (NOT 5!)
```

### Current Implementation
```javascript
// In updateProductStock()
const quantityReceived = item.quantity || 0;  // = 5
product.quantityInStock += quantityReceived;  // += 5 (WRONG!)

// Should be:
const conversionFactor = item.conversionFactor || 1;  // = 10
const actualQuantity = quantityReceived * conversionFactor;  // = 50
product.quantityInStock += actualQuantity;  // += 50 (CORRECT)
```

---

## Current Flow (Broken)

### Frontend (grnCalculations.js)
```javascript
export const mapProductToGrnItem = (product, formDataTaxType, selectedUnit) => {
  if (selectedUnit) {
    // User selected a unit variant (e.g., Outer Box 10x)
    const newItem = {
      unitType: selectedUnit.unit,        // "Outer Box"
      unitSymbol: selectedUnit.unit,      // "Outer Box"
      cost: selectedUnit.cost,            // 500 (correct - variant cost)
      qty: 1,                             // 1 Outer Box
      // ❌ MISSING: conversionFactor or factor
      // Should be: factor: 10 (or conversionFactor: 10)
    }
  }
}
```

**Problem:** `conversionFactor` not included in GRN item sent to backend!

### Backend (GRNStockUpdateService.js)
```javascript
static async updateProductStock(product, item, grnData) {
  const quantityReceived = item.quantity || 0;
  
  // ❌ Uses quantity directly without conversion
  product.quantityInStock += quantityReceived;
  
  // Should be:
  const conversionFactor = item.conversionFactor || 1;
  const actualQty = quantityReceived * conversionFactor;
  product.quantityInStock += actualQty;
}
```

---

## Data Flow Analysis

### Step 1: Product with Variants
```javascript
{
  itemcode: "MED-001",
  name: "Medicine Box",
  cost: 50,                    // Base unit cost
  quantityInStock: 100,
  packingUnits: [
    {
      name: "Outer Box",
      unit: "BOX",
      conversionFactor: 10,    // 10 base units = 1 outer box
      cost: 500,               // 50 × 10
      price: 600
    }
  ]
}
```

### Step 2: User Selects Variant + Adds to GRN
```javascript
// Frontend receives variant selection
selectedUnit = {
  name: "Outer Box",
  unit: "BOX",
  factor: 10,              // ← conversion factor
  cost: 500,
  price: 600
}

// Frontend creates GRN item
newItem = {
  productId: "...",
  qty: 5,                  // "I want 5 Outer Boxes"
  cost: 500,               // Cost per Outer Box
  unitType: "BOX",
  // ❌ MISSING: factor or conversionFactor!
}
```

### Step 3: Backend Processes GRN
```javascript
// Backend receives item
item = {
  productId: "...",
  quantity: 5,             // 5 Outer Boxes
  unitCost: 500,
  // ❌ MISSING: conversionFactor!
}

// Stock update (WRONG)
product.quantityInStock += 5  // Should be += 50!

// Cost calculation (might be wrong too)
// Uses item.quantity = 5, but should use actual units = 50
```

---

## The Fix Required

### Step 1: Update Frontend - Include Conversion Factor

**File:** `client/src/utils/grnCalculations.js`

```javascript
export const mapProductToGrnItem = (product, formDataTaxType, selectedUnit) => {
  let conversionFactor = 1;  // ← ADD THIS
  
  if (selectedUnit) {
    conversionFactor = selectedUnit.factor || selectedUnit.conversionFactor || 1;
  }
  
  const newItem = {
    // ... existing fields ...
    qty: 1,
    conversionFactor: conversionFactor,  // ← ADD THIS
    cost: cost,
  };
  
  return newItem;
};
```

### Step 2: Update Backend - Use Conversion Factor for Stock

**File:** `server/modules/accounting/services/GRNStockUpdateService.js`

```javascript
static async updateProductStock(product, item, grnData) {
  const quantityBefore = product.quantityInStock || 0;
  
  // ✅ NEW: Get conversion factor (for unit variants)
  const conversionFactor = item.conversionFactor || 1;
  
  // Calculate actual quantity in base units
  const quantityReceived = (item.quantity || 0) * conversionFactor;
  const focQuantity = (item.focQty || 0) * conversionFactor;  // FOC also affected
  
  // Update stock with actual quantity
  product.quantityInStock = quantityBefore + quantityReceived;
  product.lastStockUpdate = new Date();
  product.lastStockUpdateBy = grnData.createdBy;
  
  // ... rest of code ...
  
  return {
    productId: product._id.toString(),
    itemCode: product.itemcode,
    conversionFactor: conversionFactor,     // ← TRACK IN RESPONSE
    quantityReceivedInVariant: item.quantity,  // ← 5 Outer Boxes
    quantityReceivedInBaseUnits: quantityReceived,  // ← 50 units
    quantityAfter: product.quantityInStock
  };
}
```

### Step 3: Update Cost Calculation for Unit Variants

```javascript
static async updateProductCost(product, item, grnData) {
  const conversionFactor = item.conversionFactor || 1;
  const costingMethod = product.costingMethod || "FIFO";
  const oldCost = product.cost || 0;
  
  // Calculate effective unit cost (per BASE unit, not variant)
  const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData);
  
  // ✅ Divide by actual units received (in base units)
  const actualQuantity = (item.quantity || 0) * conversionFactor;
  
  let newCost;
  
  if (costingMethod === "WAC") {
    const currentStock = product.quantityInStock - actualQuantity;
    const currentTotalValue = currentStock * oldCost;
    
    // Total value of new items
    let newItemsValue = item.netCost || 0;
    // ✅ Note: newItemsValue should already be in base unit costs
    // But need to verify it covers all units (actualQuantity)
    
    newCost = (currentTotalValue + newItemsValue) / (currentStock + actualQuantity);
  } else {
    // FIFO/LIFO
    newCost = effectiveUnitCost;
  }
  
  // ... rest of code ...
}
```

---

## Example: Complete Flow with Fix

### Scenario
```
Product: "Medicine Box" (base unit = Single Box)
Existing Stock: 100 Single Boxes @ AED 50/box

Purchase 5 Outer Boxes (10x) @ AED 500/box
(No discount, 5% tax exclusive)
```

### Frontend Calculation
```javascript
// User selects variant: Outer Box (10x)
selectedUnit = { factor: 10, cost: 500 }

// Create GRN item
newItem = {
  qty: 5,                      // 5 Outer Boxes
  cost: 500,                   // per Outer Box
  conversionFactor: 10,        // ← KEY FIX
  discount: 0,
  taxPercent: 5
}

// Calculate costs
gross = 5 × 500 = 2,500
net = 2,500 - 0 = 2,500
tax = 2,500 × 0.05 = 125
finalCost = 2,500 + 125 = 2,625
```

### Backend Stock Update
```javascript
item = {
  quantity: 5,                 // 5 Outer Boxes
  conversionFactor: 10,        // ← KEY FIX
  unitCost: 500,
  netCost: 2,500
}

// Stock calculation
conversionFactor = 10
actualQty = 5 × 10 = 50 (base units)

quantityBefore = 100
quantityAfter = 100 + 50 = 150 ✅ CORRECT

Response: {
  quantityReceivedInVariant: 5,      // 5 Outer Boxes
  quantityReceivedInBaseUnits: 50,   // 50 Single Boxes
  quantityAfter: 150
}
```

### Backend Cost Update
```javascript
// Effective cost per BASE unit (not per variant)
effectiveUnitCost = 2,500 / 50 = 50/base unit
// (Note: we received 5 × 500 = 2,500 for 50 base units)

// WAC Calculation
oldStock = 150 - 50 = 100
oldValue = 100 × 50 = 5,000
newValue = 2,500
newCost = (5,000 + 2,500) / 150 = 50

Result: Product cost = 50/base unit (unchanged, fair price) ✅
```

---

## Issues This Could Cause (If Not Fixed)

### 1. Stock Severely Undercounted
```
Expected: 150 units (100 + 50)
Actual: 105 units (100 + 5)
Error: -45 units (30% shortage!)
```

### 2. Cost Calculation Wrong
```
Expected cost: 50/unit (50 × 10 = 500 per variant)
Calculated cost: might be vastly different
Reason: Using 5 instead of 50 in denominator
```

### 3. Batch Creation Wrong Qty
```
Expected batch qty: 50 units
Actual batch qty: 5 units
Impact: Wrong batch valuation
```

### 4. Unit Variance Cost Update Wrong
```
If product has variants, variant costs updated using wrong base cost
All downstream variants affected
```

### 5. Inventory Mismatches GL
```
GL Shows: 2,500 cost
Stock Shows: 5 units (but should be 50)
Audit trail broken
```

---

## Fields That Need To Be Passed

### GRN Item (Frontend → Backend)
```javascript
{
  productId: String,
  itemCode: String,
  quantity: Number,              // In variant units (5 Outer Boxes)
  
  // ✅ NEW: Conversion factor
  conversionFactor: Number,      // 10 (1 Outer Box = 10 base units)
  
  unitCost: Number,              // 500 (per Outer Box)
  itemDiscount: Number,          // 0
  netCost: Number,               // 2500 (quantity × cost - discount)
  
  // For cost calculation to work correctly
  foc: Boolean,                  // false
  focQty: Number,                // 0
  taxType: String,               // "exclusive"
  taxPercent: Number             // 5
}
```

---

## Complete Solution Checklist

| Component | Current | Fix | Impact |
|-----------|---------|-----|--------|
| **Frontend** | No conversionFactor | Add factor field | Stock correct qty |
| **Backend** | Uses qty directly | Multiply by factor | Stock accurate |
| **Cost** | Uses wrong qty | Use actualQuantity | Cost correct |
| **Batch** | Wrong quantity | Use actualQuantity | Batch correct |
| **Variant Cost** | Wrong base cost | Use correct base | Variants right |
| **Response** | Missing details | Show both values | Transparency |
| **Audit** | Incomplete log | Log both values | Compliance |

---

## Before & After Comparison

### BEFORE (❌ WRONG)
```
GRN: 5 Outer Boxes @ 500 each

Frontend: Calculates correctly (5 × 500 = 2,500)
Backend: 
  - Stock += 5 (WRONG!)
  - Cost based on 5 units (WRONG!)
  - Batch: 5 units (WRONG!)
  - Variant cost: 50/unit (by luck, coincidence)

Result: Stock mismatches GL, inventory wrong
```

### AFTER (✅ CORRECT)
```
GRN: 5 Outer Boxes @ 500 each (10 units per box)

Frontend: 
  - Qty: 5 Outer Boxes
  - conversionFactor: 10
  - cost: 500
  - Total: 2,500

Backend:
  - Stock += 5 × 10 = 50 (CORRECT!)
  - Cost based on 50 units (CORRECT!)
  - Batch: 50 units (CORRECT!)
  - Variant cost: 50/unit (CORRECT!)

Result: All systems aligned, GL matches stock
```

---

## Response Format (After Fix)

### Stock Update Response
```json
{
  "productId": "...",
  "itemCode": "MED-001",
  "conversionFactor": 10,
  "quantityReceivedInVariant": 5,
  "variantName": "Outer Box",
  "quantityReceivedInBaseUnits": 50,
  "quantityBefore": 100,
  "quantityAfter": 150,
  "uom": "Box"
}
```

### Cost Update Response
```json
{
  "productId": "...",
  "itemCode": "MED-001",
  "conversionFactor": 10,
  "quantityInVariants": 5,
  "quantityInBaseUnits": 50,
  "costingMethod": "WAC",
  "oldCost": 50,
  "newCost": 50,
  "effectiveUnitCost": 50,
  "note": "Cost maintained - fair pricing"
}
```

---

## Testing After Fix

### Test 1: Single Box Purchase
```
Select: Base Unit (1x)
Qty: 100
Expected Stock: 100
Expected Factor: 1
```

### Test 2: Outer Box Purchase
```
Select: Outer Box (10x)
Qty: 5
Expected Stock: 150 (100 + 5×10)
Expected Factor: 10
```

### Test 3: Multiple Variants
```
Select: Carton (100x)
Qty: 2
Expected Stock: 200 (100 + 2×100)
Expected Factor: 100
```

---

## Summary

### Issue
When user buys product using unit variant, stock is not multiplied by conversion factor.

### Impact
- Stock counts are drastically underestimated
- GL reconciliation fails
- Inventory metrics wrong
- Batch quantities wrong

### Root Cause
- `conversionFactor` not included in GRN item
- Backend not using factor to calculate actual quantity
- Only updates by variant quantity, not base units

### Solution
1. Add `conversionFactor` field to GRN item in frontend
2. Use `conversionFactor` in backend stock calculation
3. Multiply quantity by factor for all calculations
4. Track both variant and base unit quantities in response

### Priority
🔴 **CRITICAL** - This causes severe stock count errors

