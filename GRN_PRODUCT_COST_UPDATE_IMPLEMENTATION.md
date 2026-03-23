# GRN Product Cost Update Implementation

## Overview

When a GRN (Goods Receipt Note) is created, edited, or posted, the system now automatically updates the product master data including cost, pricing levels, margins, and all unit variants.

**Implementation Complete:** ✅ server/modules/accounting/services/GRNStockUpdateService.js

## Features Implemented

### 1. Master Product Updates
When cost changes from GRN:
- ✅ **cost** - Updates to new cost from GRN
- ✅ **costIncludeVat** - Recalculated including applicable taxes
- ✅ **lastReceivedCost** - Tracks previous cost for history
- ✅ **marginPercent** - Recalculated based on (price - cost) / cost × 100
- ✅ **marginAmount** - Recalculated as cost × (margin% / 100)
- ✅ **pricingLevels** - All 5 levels (L1-L5) recalculated using margin%
- ✅ **price** - Updated to match pricingLevels[0].level1

### 2. Unit Variant Updates
For each packing unit (e.g., Single, Carton, Box):
- ✅ **cost** - Recalculated as: base_cost × conversion_factor
- ✅ **margin%** - Same as master product margin%
- ✅ **marginAmount** - variant_cost × (margin% / 100)
- ✅ **price** - variant_cost × (1 + margin% / 100)
- ✅ **costIncludeVat** - Updated with tax if applicable

### 3. Audit Logging
- ✅ Detailed audit log created for each GRN item processed
- ✅ Includes all pricing changes
- ✅ Tracks cost before/after, margin changes, and new pricing levels
- ✅ Enhanced description showing margin% and price changes

### 4. Update Conditions
- **When:** Automatically on every GRN post (always)
- **Scope:** Both master product AND all unit variants
- **Flow:** Triggered after cost calculation (FIFO/LIFO/WAC method)

---

## Implementation Details

### New Methods Added to GRNStockUpdateService

#### 1. `updateProductPricingAfterCostChange(product, newCost, oldCost, item)`

Updates master product pricing after cost change.

**Parameters:**
- `product` - Product document
- `newCost` - New cost from GRN
- `oldCost` - Previous cost
- `item` - GRN line item (contains tax info)

**Returns:** 
```javascript
{
  productId: "...",
  itemCode: "1001",
  costUpdate: {
    oldCost: 10,
    newCost: 8,
    lastReceivedCost: 10,
    costIncludeVat: 8.4
  },
  pricingUpdate: {
    previousPrice: 15,
    newPrice: 12,
    marginPercent: 50,
    marginAmount: 4,
    pricingLevels: {
      level1: 12,
      level2: 12,
      level3: 12,
      level4: 12,
      level5: 12
    }
  }
}
```

**Logic:**
1. Store previous cost as `lastReceivedCost`
2. Calculate `costIncludeVat` considering tax (inclusive/exclusive)
3. Preserve selling price, recalculate margin%: `(price - cost) / cost × 100`
4. Calculate `marginAmount = cost × (margin% / 100)`
5. Recalculate all pricingLevels[0] entries using the margin%
6. Update base price to match level1

**Example:**
```
Before: cost=10, price=15, margin%=50
GRN: unitCost=8
After:  cost=8,  price=12, margin%=50
  ↳ Calculation: 12 = 8 × (1 + 50/100)
```

---

#### 2. `updateVariantPricingAfterCostChange(product, newProductCost)`

Updates unit variant pricing after product cost change.

**Parameters:**
- `product` - Product document with packingUnits
- `newProductCost` - New master product cost

**Returns:**
```javascript
{
  productId: "...",
  itemCode: "1001",
  variantsUpdated: 2,
  updates: [
    {
      unitName: "Single",
      conversionFactor: 1,
      costUpdate: { oldCost: 10, newCost: 8 },
      pricingUpdate: {
        marginPercent: 50,
        marginAmount: 4,
        newPrice: 12
      }
    },
    {
      unitName: "Carton (12 pieces)",
      conversionFactor: 12,
      costUpdate: { oldCost: 120, newCost: 96 },
      pricingUpdate: {
        marginPercent: 50,
        marginAmount: 48,
        newPrice: 144
      }
    }
  ]
}
```

**Logic:**
For each packing unit:
1. Calculate new variant cost: `base_cost × factor`
2. Recalculate variant margin%: `(variant_price - variant_cost) / variant_cost × 100`
3. Calculate variant margin amount
4. Update variant price: `variant_cost × (1 + margin% / 100)`
5. Update costIncludeVat with tax if applicable

**Example with Carton (factor=12):**
```
Before: cost=120 (10×12), margin%=50, price=180
After:  cost=96 (8×12),  margin%=50, price=144
  ↳ variant margin% = (144-96)/96×100 = 50% ✅
```

---

### Modified Methods

#### `processGrnStockUpdate()` - Main GRN Processing Flow

**New Steps Added (4.5 and 4.6):**

```javascript
// 3. Update product cost based on costing method (existing)
const costUpdate = await this.updateProductCost(product, item, grnData);

// 4. Update unit variant costs (existing)
const variantUpdate = await this.updateUnitVariantCosts(product, item, costUpdate?.newCost);

// ✨ 4.5 NEW: Update master product pricing
const productPricingUpdate = await this.updateProductPricingAfterCostChange(
  product,
  costUpdate?.newCost,
  costUpdate?.oldCost,
  item
);

// ✨ 4.6 NEW: Update variant pricing
const variantPricingUpdate = await this.updateVariantPricingAfterCostChange(
  product,
  costUpdate?.newCost
);

// 5. Create stock movement record (existing)
// 6. Create audit log with pricing updates (enhanced)
```

**Result Object Enhancement:**
```javascript
results = {
  ...existing,
  pricingUpdates: [],          // ✨ NEW
  variantPricingUpdates: [],   // ✨ NEW
  ...
}
```

---

#### `createAuditLog()` - Enhanced Audit Logging

**Signature Change:**
```javascript
// Before:
static async createAuditLog(product, item, grnData, userId, stockUpdate, costUpdate)

// After:
static async createAuditLog(product, item, grnData, userId, stockUpdate, costUpdate, 
                             productPricingUpdate, variantPricingUpdate)
```

**Enhancements:**
1. Includes `productPricingUpdate` in audit changes
2. Includes `variantPricingUpdate` in audit changes
3. Enhanced description with pricing details

**Audit Log Example:**
```javascript
{
  action: "CREATE",
  module: "Inventory",
  resource: "Stock - GRN Receipt",
  description: "Stock received for 1001: +100 units from GRN GRN-001; 
                Pricing updated: margin 50.00%, price 15 → 12",
  changes: {
    action: "GRN_STOCK_RECEIVED",
    grnNumber: "GRN-001",
    vendor: "Supplier Name",
    productPricingUpdate: { /* pricing details */ },
    variantPricingUpdate: { /* variant pricing details */ },
    ...
  }
}
```

---

## Integration Points

### 1. GRN Post Endpoint
When GRN is posted, flow:
```
POST /api/grn/post/:id
  ↓
GRNStockUpdateService.processGrnStockUpdate()
  ├─ updateProductStock() ............. Updates quantity
  ├─ createOrUpdateBatch() ............ Creates batch record
  ├─ updateProductCost() ............. FIFO/LIFO/WAC cost
  ├─ updateUnitVariantCosts() ........ Variant base costs
  ├─ ✨ updateProductPricingAfterCostChange() ... MASTER PRICING
  ├─ ✨ updateVariantPricingAfterCostChange() ... VARIANT PRICING
  ├─ createStockMovement() ........... Stock audit trail
  └─ createAuditLog() ................ Enhanced audit ✨
```

### 2. Response Structure
GRN post response includes:
```javascript
{
  grnNumber: "GRN-001",
  processedItems: [...],
  updatedProducts: ["69beef0d..."],
  costUpdates: [...],
  variantUpdates: [...],
  pricingUpdates: [...],         // ✨ NEW
  variantPricingUpdates: [...],  // ✨ NEW
  currentStockUpdates: [...],
  logs: [...]
}
```

---

## Calculation Formulas

### Master Product Pricing

**Original Margin % Preservation:**
```
marginPercent = (sellingPrice - cost) / cost × 100
```

**New Price Calculation:**
```
newPrice = newCost × (1 + marginPercent / 100)
```

**Margin Amount:**
```
marginAmount = cost × (marginPercent / 100)
```

**costIncludeVat (Tax-Aware):**
```
If tax is inclusive:
  costIncludeVat = cost (already includes tax)
  
If tax is exclusive:
  costIncludeVat = cost + (cost × taxPercent / 100)
```

### Unit Variant Pricing

**Variant Cost:**
```
variantCost = masterCost × conversionFactor
```

**Variant Price:**
```
variantPrice = variantCost × (1 + marginPercent / 100)
```

### Pricing Levels

All 5 levels recalculated using same margin%:
```
level1 = cost × (1 + margin% / 100)  // Retail
level2 = cost × (1 + margin% / 100)  // Wholesale A
level3 = cost × (1 + margin% / 100)  // Wholesale B
level4 = cost × (1 + margin% / 100)  // Corporate
level5 = cost × (1 + margin% / 100)  // Distributor
```

---

## Database Fields Updated

### AddProduct Collection

| Field | Before | After | Notes |
|-------|--------|-------|-------|
| cost | 10 | 8 | From GRN |
| costIncludeVat | 10.5 | 8.4 | Includes tax |
| lastReceivedCost | - | 10 | NEW: Tracks history |
| price | 15 | 12 | Recalculated |
| marginPercent | 50 | 50 | Recalculated |
| marginAmount | 5 | 4 | Recalculated |
| pricingLevels[0] | {L1:15, L2:14...} | {L1:12, L2:12...} | All recalculated |
| packingUnits[].cost | 10, 120 | 8, 96 | Updated |
| packingUnits[].margin | 50 | 50 | Recalculated |
| packingUnits[].price | 15, 180 | 12, 144 | Recalculated |

### ActivityLog Collection

New fields populated:
```javascript
changes: {
  productPricingUpdate: { /* see schema */ },
  variantPricingUpdate: { /* see schema */ }
}
```

---

## Example Scenarios

### Scenario 1: Cost Reduction

**Input:**
- Product: cost=10, price=15, margin%=50
- GRN: unitCost=8

**Processing:**
1. New cost = 8
2. margin% = (15-8)/8 × 100 = 87.5%... NO!
   - Actually preserves the margin calculation from the original price
   - margin% = (15-10)/10 × 100 = 50% (recalculated on new cost basis)
   - Actually: newPrice = 8 × (1+50/100) = 12
   - margin% = (12-8)/8 × 100 = 50% ✓

**Result:**
- cost=8, price=12, margin%=50, marginAmount=4
- Profitability increases (4 units margin per cost 8 vs 5 units margin per cost 10)

---

### Scenario 2: Cost Increase with Variants

**Input:**
- Product: cost=5, price=7.5, margin%=50
- Variants: Single(1×), Carton(12×)
- GRN: unitCost=6

**Processing:**
1. Master: cost=6, price=9, margin%=50, marginAmount=4.5
2. Single variant: cost=6, price=9
3. Carton variant: cost=72, price=108

**Result:**
- All variants maintain 50% margin with new costs
- Pricing levels all updated to 9 (single) or 108 (carton)

---

### Scenario 3: Significant Cost Reduction

**Input:**
- Product: cost=20, price=30, margin%=50
- GRN: unitCost=12

**Processing:**
1. New cost=12
2. margin% from new ratio = (30-12)/12 × 100 = 150%!
3. So newPrice = 30... no wait
4. Actually: price is calculated as newCost × (1 + preserved_margin%/100)
5. Preserved margin% = original margin% = 50%
6. newPrice = 12 × 1.5 = 18

Actually, let me recalculate:
- If original price was preserved (30): margin% = (30-12)/12×100 = 150%
- But we want to preserve the margin calculation approach
- New approach: keep the same margin% ratio
- So price becomes: 12 × (1+50/100) = 18
- margin% = (18-12)/12×100 = 50% ✓

**Result:**
- cost=12, price=18, margin%=50
- Selling price reduced but profitability maintained (50% margins)

---

## Testing Checklist

- [ ] Create test product with cost, price, margins, variants
- [ ] Create GRN with different cost item
- [ ] Post GRN
- [ ] Verify product.cost updated
- [ ] Verify product.costIncludeVat updated with tax
- [ ] Verify product.lastReceivedCost tracks history
- [ ] Verify product.price recalculated
- [ ] Verify product.marginPercent preserved/recalculated
- [ ] Verify product.marginAmount recalculated
- [ ] Verify all pricingLevels[0] entries updated
- [ ] Verify variant costs updated
- [ ] Verify variant prices updated
- [ ] Verify variant margins maintained
- [ ] Verify ActivityLog contains pricingUpdate details
- [ ] Verify ActivityLog description includes pricing info
- [ ] Check response includes pricingUpdates array
- [ ] Check response includes variantPricingUpdates array

---

## Error Handling

All new methods include try-catch and non-critical error handling:
- If cost update fails → pricing update is skipped gracefully
- If pricing update fails → doesn't affect GRN posting
- Errors logged with console.error for debugging
- Returns null on error instead of throwing

---

## Performance Notes

- All updates batched in single database operation per product
- Variant updates done as array update in same save
- Audit logging is non-blocking
- No separate queries for pricing level updates (calculated in-memory)

---

## Files Modified

1. **server/modules/accounting/services/GRNStockUpdateService.js**
   - Added: `updateProductPricingAfterCostChange()`
   - Added: `updateVariantPricingAfterCostChange()`
   - Modified: `processGrnStockUpdate()` (added 2 new method calls)
   - Modified: `createAuditLog()` (enhanced signature and logic)
   - Modified: Results object initialization (added new arrays)

---

## Related Documentation

- See: GRN_PRODUCT_COST_UPDATE_TEST.js - Test scenarios and examples
- See: ActivityLog.js - Audit logging structure
- See: AddProduct.js - Product schema with pricing fields
- See: GRNStockUpdateService.js - Complete implementation

---

## Summary

This implementation provides complete automatic synchronization of product master data and pricing with GRN costs:

✅ **Master Product:** cost, price, margins, all 5 pricing levels  
✅ **Unit Variants:** costs and prices for all packing units  
✅ **Audit Trail:** detailed logging of all pricing changes  
✅ **Tax Support:** costIncludeVat calculated with tax rates  
✅ **History Tracking:** lastReceivedCost maintains cost history  

**Always active:** Triggered on every GRN post, no configuration needed.
