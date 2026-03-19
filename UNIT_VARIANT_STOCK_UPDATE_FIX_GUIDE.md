# Unit Variant Stock Update Fix - Implementation Guide

**Issue:** When purchasing items via unit variants, stock quantity is not multiplied by `conversionFactor`

**Impact:** Stock counts are drastically undercounted (e.g., buying 5 Outer Boxes adds only 5 instead of 50 units)

---

## Fix 1: Frontend - Pass Conversion Factor

### File: `client/src/utils/grnCalculations.js`

**Current Code (Line 188-232):**
```javascript
export const mapProductToGrnItem = (product, formDataTaxType, selectedUnit = null, unitTypesMap = null) => {
  let unitName, unitSymbol, unitDecimal, cost, price;

  if (selectedUnit) {
    unitName = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitSymbol = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitDecimal = selectedUnit.unitDecimal || 0;
    cost = parseFloat(selectedUnit.cost || product.cost || product.price || product.rate || 0) || 0;
    price = parseFloat(selectedUnit.price || product.price || product.rate || 0) || 0;
    // ❌ MISSING: conversionFactor not extracted
  } else {
    // Use base product
  }

  const newItem = {
    qty: 1,              // ❌ Hardcoded, should use factor
    cost: cost,
    // ❌ MISSING: conversionFactor field
  };
};
```

**Fixed Code:**
```javascript
export const mapProductToGrnItem = (product, formDataTaxType, selectedUnit = null, unitTypesMap = null) => {
  let unitName, unitSymbol, unitDecimal, cost, price;
  let conversionFactor = 1;  // ✅ ADD: Default conversion factor

  if (selectedUnit) {
    unitName = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitSymbol = selectedUnit.unit || selectedUnit.unitSymbol || "PC";
    unitDecimal = selectedUnit.unitDecimal || 0;
    cost = parseFloat(selectedUnit.cost || product.cost || product.price || product.rate || 0) || 0;
    price = parseFloat(selectedUnit.price || product.price || product.rate || 0) || 0;
    
    // ✅ ADD: Extract conversion factor from selected unit variant
    conversionFactor = selectedUnit.factor || selectedUnit.conversionFactor || 1;
  } else {
    // Use base product (factor stays 1)
  }

  const taxPercent = parseTaxPercent(product);

  const newItem = {
    id: Math.random().toString(36),
    productId: product._id || product.id,
    productName: product.name || product.productName || "",
    itemCode: product.itemcode || product.sku || product.code || "",
    barcode: selectedUnit?.barcode || product.barcode || "",
    unitType: unitName,
    unitSymbol: unitSymbol,
    unitDecimal: unitDecimal,
    qty: 1,
    foc: false,
    focQty: 0,
    cost: cost,
    discount: 0,
    discountType: "amount",
    taxType: formDataTaxType,
    taxPercent: taxPercent,
    taxAmount: 0,
    netCost: 0,
    netCostWithoutTax: 0,
    finalCost: 0,
    conversionFactor: conversionFactor,  // ✅ ADD: Store conversion factor
    // ✅ Track expiry handling
    trackExpiry: product.trackExpiry || false,
    batchNumber: "",
    expiryDate: null,
  };

  calculateItemCost(newItem);
  return newItem;
};
```

**What Changed:**
1. Added `let conversionFactor = 1;` at line start
2. Added `conversionFactor = selectedUnit.factor || selectedUnit.conversionFactor || 1;` in selectedUnit block
3. Added `conversionFactor: conversionFactor,` to newItem object

---

## Fix 2: Backend - Use Conversion Factor in Stock Update

### File: `server/modules/accounting/services/GRNStockUpdateService.js`

**Current Code (Line 145-165):**
```javascript
static async updateProductStock(product, item, grnData) {
  try {
    const quantityBefore = product.quantityInStock || 0;
    const quantityReceived = item.quantity || 0;      // ❌ Raw qty, not converted
    const focQuantity = item.focQty || 0;

    // ❌ WRONG: Uses raw quantity without conversion
    product.quantityInStock = (quantityBefore + quantityReceived);
    product.lastStockUpdate = new Date();
    product.lastStockUpdateBy = grnData.createdBy;

    // ... rest of code ...

    return {
      productId: product._id.toString(),
      itemCode: product.itemcode,
      itemName: product.name,
      quantityBefore,
      quantityReceived,
      focQuantity,
      quantityAfter: product.quantityInStock,
      uom: product.unitSymbol
    };
  }
};
```

**Fixed Code:**
```javascript
static async updateProductStock(product, item, grnData) {
  try {
    const quantityBefore = product.quantityInStock || 0;
    
    // ✅ ADD: Get conversion factor from item
    const conversionFactor = item.conversionFactor || 1;
    
    // ✅ CHANGE: Convert quantity to base units
    const quantityReceived = (item.quantity || 0) * conversionFactor;
    const focQuantity = (item.focQty || 0) * conversionFactor;  // FOC also converted

    // ✅ FIXED: Uses actual quantity (in base units)
    product.quantityInStock = (quantityBefore + quantityReceived);
    product.lastStockUpdate = new Date();
    product.lastStockUpdateBy = grnData.createdBy;

    // Update minimum stock warning if needed
    if (product.minStock && product.quantityInStock < product.minStock) {
      product.lowStockAlert = true;
      product.lowStockAlertDate = new Date();
    } else {
      product.lowStockAlert = false;
    }

    await product.save();

    console.log(`✅ Stock updated for ${product.itemcode}: ${quantityBefore} → ${product.quantityInStock} (variant qty: ${item.quantity}, factor: ${conversionFactor})`);

    return {
      productId: product._id.toString(),
      itemCode: product.itemcode,
      itemName: product.name,
      conversionFactor: conversionFactor,              // ✅ ADD: Show factor
      quantityReceivedInVariant: item.quantity || 0,  // ✅ ADD: Show variant qty
      quantityReceivedInBaseUnits: quantityReceived,  // ✅ ADD: Show converted qty
      focQuantity: focQuantity,                        // ✅ UPDATE: Now converted
      quantityBefore,
      quantityAfter: product.quantityInStock,
      uom: product.unitSymbol,
      note: `Converted from ${item.quantity} variant units to ${quantityReceived} base units`
    };
  } catch (error) {
    console.error("❌ Error updating product stock:", error);
    throw error;
  }
}
```

**What Changed:**
1. Added `const conversionFactor = item.conversionFactor || 1;`
2. Changed `quantityReceived` to multiply by factor: `(item.quantity || 0) * conversionFactor`
3. Changed `focQuantity` to also multiply by factor
4. Updated console.log to show conversion details
5. Enhanced return object with:
   - `conversionFactor`
   - `quantityReceivedInVariant`
   - `quantityReceivedInBaseUnits`
   - Updated `focQuantity`
   - `note` field explaining conversion

---

## Fix 3: Backend - Use Conversion Factor in Cost Update

### File: `server/modules/accounting/services/GRNStockUpdateService.js`

**Current Code (Line ~220-280):**
```javascript
static async updateProductCost(product, item, grnData) {
  try {
    const costingMethod = product.costingMethod || "FIFO";
    const oldCost = product.cost || 0;
    
    // ❌ ISSUE: Uses item.quantity directly without conversion
    const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData);
    
    let newCost;
    
    if (costingMethod === "WAC") {
      // WAC calculation uses item.quantity (WRONG if variant)
      // ...
    }
  }
}
```

**Find & Check the calculateEffectiveUnitCost method to see if it needs fixing too.**

**Fixed Code Pattern:**
```javascript
static async updateProductCost(product, item, grnData) {
  try {
    const costingMethod = product.costingMethod || "FIFO";
    const oldCost = product.cost || 0;
    
    // ✅ ADD: Get conversion factor
    const conversionFactor = item.conversionFactor || 1;
    
    // ✅ CHANGE: Calculate actual quantity in base units
    const actualQuantity = (item.quantity || 0) * conversionFactor;
    
    // ✅ CHANGE: Pass actual quantity for cost calculation
    const effectiveUnitCost = this.calculateEffectiveUnitCost(item, grnData, actualQuantity);
    
    let newCost;
    
    if (costingMethod === "WAC") {
      const quantityBefore = product.quantityInStock - actualQuantity;
      const costBefore = quantityBefore * oldCost;
      
      // ✅ CHANGE: Use actual quantity in divisor
      newCost = (costBefore + item.netCost) / product.quantityInStock;
    } else if (costingMethod === "FIFO" || costingMethod === "LIFO") {
      // For FIFO/LIFO, use effective unit cost directly
      newCost = effectiveUnitCost;
    } else {
      newCost = oldCost;
    }
    
    product.cost = newCost;
    await product.save();

    console.log(`✅ Cost updated for ${product.itemcode}: ${oldCost} → ${newCost} (${costingMethod})`);

    return {
      productId: product._id.toString(),
      itemCode: product.itemcode,
      conversionFactor: conversionFactor,           // ✅ ADD
      quantityInVariants: item.quantity,            // ✅ ADD
      quantityInBaseUnits: actualQuantity,          // ✅ ADD
      costingMethod: costingMethod,
      oldCost: oldCost,
      newCost: newCost,
      effectiveUnitCost: effectiveUnitCost
    };
  }
}
```

---

## Fix 4: Backend - Use Conversion Factor in Batch Creation

### File: `server/modules/accounting/services/GRNStockUpdateService.js`

**Current Code (Line ~300-350 approx):**
```javascript
static async createBatches(product, item, grnData) {
  // ❌ ISSUE: Uses item.quantity directly
  
  // Create batch with wrong quantity
  const batch = new StockBatch({
    quantity: item.quantity,  // ❌ Not converted!
    // ...
  });
}
```

**Fixed Code Pattern:**
```javascript
static async createBatches(product, item, grnData, conversionFactor = 1) {
  // ✅ ADD: Use conversion factor
  
  // Calculate actual quantity
  const actualQuantity = (item.quantity || 0) * conversionFactor;
  
  // Create batch with correct quantity
  const batch = new StockBatch({
    quantity: actualQuantity,  // ✅ Converted to base units!
    // ...
  });
  
  return {
    batchId: batch._id.toString(),
    quantityInVariants: item.quantity,
    quantityInBaseUnits: actualQuantity,
    // ...
  };
}
```

---

## Fix 5: Backend - Use Conversion Factor in Variant Cost Update

### File: `server/modules/accounting/services/GRNStockUpdateService.js`

**Current Code (Line ~424-480):**
```javascript
static async updateUnitVariantCosts(product, item, newProductCost) {
  // ✅ This might already be correct, verify it uses conversionFactor properly
  
  for (let i = 0; i < product.packingUnits.length; i++) {
    const unit = product.packingUnits[i];
    // Variant cost = base cost × factor (this is correct!)
    const newVariantCost = newProductCost * (unit.conversionFactor || 1);
    unit.cost = newVariantCost;
  }
}
```

**Verification Needed:** This method already uses `conversionFactor` for cost updates, which is good. Just verify it uses the NEW base cost (after stock update conversion), not the old cost.

---

## Complete Integration Points

### 1. GRN Item Structure (After Fix)
```javascript
{
  productId: "...",
  itemCode: "MED-001",
  qty: 1,                          // In GRN UI (1 Outer Box selected)
  conversionFactor: 10,            // ✅ NEW FIELD
  cost: 500,                       // Per Outer Box
  discount: 0,
  netCost: 2500,
  focQty: 0,
  
  // When stored/sent to backend:
  quantity: 1,                     // Quantity of variant (1 Outer Box)
  conversionFactor: 10,            // ✅ Also in backend item
  foc: false
}
```

### 2. Stock Update Flow (After Fix)
```
Frontend GRN: qty=1, cost=500, conversionFactor=10
          ↓
Backend Receives: item.quantity=1, item.conversionFactor=10
          ↓
Calculate: actualQty = 1 × 10 = 10
          ↓
Update Stock: product.quantityInStock += 10 ✅
```

### 3. Cost Update Flow (After Fix)
```
Item: qty=1 (variant), conversionFactor=10, netCost=2500
          ↓
Convert: actualQty = 1 × 10 = 10
         unitCost = 2500 / 10 = 250 per base unit
          ↓
WAC Calc: newCost = (stockBefore×oldCost + 2500) / (stockBefore + 10)
          ↓
Update: product.cost = newCost ✅
```

---

## Testing Checklist After Fix

- [ ] Purchase 1 Single Box (factor 1) → Stock += 1
- [ ] Purchase 5 Outer Boxes (factor 10) → Stock += 50  
- [ ] Purchase 2 Cartons (factor 100) → Stock += 200
- [ ] Mixed: 2 Cartons + 5 Outer + 3 Single → Stock += 253
- [ ] With FOC: 2 Outer (FOC) → Stock += 20, Cost unchanged
- [ ] With Discount: 3 Outer (10% discount) → Stock += 30, Cost correct
- [ ] Batch Created: Qty should show 50 for 5 Outer Boxes
- [ ] Variant Cost: Should use new base cost × factor
- [ ] GL Reconciliation: Stock value = stock qty × cost

---

## Rollout Plan

**Order of Implementation:**
1. ✅ **Step 1:** Fix frontend (grnCalculations.js) - Add conversionFactor
2. ✅ **Step 2:** Fix backend stock update (GRNStockUpdateService.updateProductStock)
3. ✅ **Step 3:** Fix backend cost update (uses converted quantity)
4. ✅ **Step 4:** Fix batch creation (uses converted quantity)
5. ✅ **Step 5:** Test all combinations
6. ✅ **Step 6:** Monitor GL reconciliation

**Database Migration:** None needed (no data structure change)

**Backward Compatibility:** 
- If `conversionFactor` missing, defaults to 1 (backward compatible)
- Existing GRNs with base units unaffected

---

## Verification

After implementing all fixes, test posting GRN with unit variants and verify:

```javascript
// Example Test Data
Product: Medicine Box
- Base Unit: Single Box
- Variant 1: Outer Box (10x) @ 500/box
- Current Stock: 100

GRN:
- Qty: 5 Outer Boxes
- Cost: 500 each
- No Discount
- Tax: 5%

Expected Results:
{
  conversionFactor: 10,
  quantityReceivedInVariant: 5,
  quantityReceivedInBaseUnits: 50,
  quantityBefore: 100,
  quantityAfter: 150,  // ✅ CORRECT
  
  Cost: 50/base unit (maintained)
  Batch: 50 units (correct)
  GL: Stock value = 150 × 50 = 7500
}
```

