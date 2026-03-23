# ✅ Improved GRN Edit Manager - Implementation Guide

## Summary: Why This is Better

### Current Implementation Problems
- ❌ No transaction wrapping (data could be left in inconsistent state on error)
- ❌ Modifies original StockMovement (breaks immutable history)
- ❌ Doesn't recalculate availableQuantity after $inc
- ⚠️ String-based key splitting is fragile

### New Implementation Advantages
- ✅ Full MongoDB transaction support (all-or-nothing)
- ✅ Clean delta-based calculation with $inc operator
- ✅ Auto-recalculates availableQuantity after each update
- ✅ Handles item additions, modifications, and removals
- ✅ Robust key system using pipe (|) separator
- ✅ Atomic payment updates
- ✅ Better logging and error messages
- ✅ Automatic rollback on any error

---

## Side-by-Side Comparison

### Your Original Code (Good Foundation)
```javascript
const delta = newQty - oldQty;

if (delta !== 0) {
  await CurrentStock.updateOne(
    { product_id, warehouse_id },
    {
      $inc: { qty: delta },
      $set: { updated_at: new Date() }
    },
    { upsert: true, session }
  );
}
```

### New Improved Version (Production Ready)
```javascript
const updated = await CurrentStock.findOneAndUpdate(
  { productId },
  {
    $inc: { totalQuantity: delta.delta },
    $set: { updatedAt: new Date(), updatedBy: userId }
  },
  { upsert: true, session, returnDocument: 'after' }
);

// EXTRA: Recalculate availableQuantity
const availableQty = 
  (updated.totalQuantity) - 
  (updated.allocatedQuantity || 0) - 
  (updated.damageQuality || 0);

await CurrentStock.updateOne(
  { productId },
  { $set: { availableQuantity: Math.max(0, availableQty) } },
  { session }
);
```

**Key Differences:**
1. Returns updated document for verification
2. Tracks `updatedBy` for audit trail
3. Recalculates `availableQuantity` = `totalQty - allocatedQty - damageQty`
4. Uses `Math.max(0, ...)` to prevent negative values

---

## Usage Example

### Before (in grnController.js)
```javascript
// OLD: Using SimpleGRNEditManager
const cascadeResult = await SimpleGRNEditManager.editReceivedGRN(
  grnId,
  { items, notes },
  userId
);
```

### After (Using ImprovedGRNEditManager)
```javascript
import ImprovedGRNEditManager from '../accounting/services/ImprovedGRNEditManager.js';

// NEW: Cleaner API
const result = await ImprovedGRNEditManager.editGRN(
  grnId,
  { items, notes },
  userId
);

if (result.success) {
  console.log(`✅ Updated ${result.changes.deltasApplied} items`);
  console.log(`   Affected products: ${result.changes.productIdsAffected}`);
  res.json(result);
} else {
  res.status(400).json({ error: result.error });
}
```

---

## What Gets Updated in a Transaction

### Example: Editing GRN-1 from 100 → 150

```
BEFORE:
  CurrentStock: totalQuantity=350, availableQty=350
  GRN-1 items: qty=100
  VendorPayment: initialAmount=$1000, balance=$1000

AFTER:
  ✅ CurrentStock: totalQuantity=400 (+50), availableQty=400
  ✅ GRN items: qty=150
  ✅ InventoryBatch: qty=150
  ✅ StockBefore: delta=+50 logged
  ✅ VendorPayment: initialAmount=$1500, balance=$1500

ATOMIC: All succeed or all rollback
```

---

## Key Features Explained

### 1. Transaction Wrapper
```javascript
await session.withTransaction(async () => {
  // All updates happen here
  // If ANY error throws, ALL changes rollback automatically
});
```

### 2. Item Key System
```javascript
// OLD (fragile): const key = `${productId}_${batchNumber}`
// Issue: If productId contains "_", split breaks

// NEW (robust): const key = `${productId}|${batchNumber}`
// Pipe (|) is very unlikely in IDs
const key = this.createItemKey(productId, batchNumber);
const { productId, batchNumber } = this.parseItemKey(key);
```

### 3. Delta Application
```javascript
// Calculate delta ONCE
const delta = newQty - oldQty;  // e.g., 150 - 100 = +50

// Apply to stock (atomic increment)
const updated = await CurrentStock.findOneAndUpdate(
  { productId },
  { $inc: { totalQuantity: delta } },  // ← Atomic
  { returnDocument: 'after' }
);
// Result: totalQuantity increased by exactly 50

// Then fix availableQuantity
const availableQty = updated.totalQuantity - allocated - damage;
```

### 4. Payment Handling
```javascript
// Only update if PENDING
if (existingPayment?.paymentStatus === 'PENDING') {
  // Calculate new total from edited items
  const newTotal = this.calculateGRNTotal(changes.items);
  
  // Update atomically
  await VendorPayment.findByIdAndUpdate(
    existingPayment._id,
    {
      $set: {
        initialAmount: newTotal,
        balance: newTotal,
        amountPaid: 0
      }
    },
    { session }
  );
}
```

---

## Integration Steps

### Step 1: Add to grnController.js
```javascript
import ImprovedGRNEditManager from '../../../modules/accounting/services/ImprovedGRNEditManager.js';

export const updateGrn = async (req, res) => {
  // ... existing validation ...
  
  if (grn.status === 'Received' || grn.status === 'Draft') {
    // REPLACE the SimpleGRNEditManager call with:
    const result = await ImprovedGRNEditManager.editGRN(
      id,
      {
        items: req.body.items,
        notes: req.body.notes
      },
      req.body.createdBy || 'System'
    );
    
    return res.json(result);
  }
};
```

### Step 2: Remove SimpleGRNEditManager Call
Delete or comment out the old SimpleGRNEditManager usage

### Step 3: Test
```bash
# Edit a GRN with qty change
curl -X PUT http://localhost:3000/api/grn/[grnId] \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "productId": "...",
      "quantity": 150,
      "unitCost": 100,
      ...
    }]
  }'
```

---

## Validation Checklist

- ✅ Transaction rolls back on ANY error
- ✅ Delta calculated correctly (newQty - oldQty)
- ✅ CurrentStock.totalQuantity incremented by delta
- ✅ CurrentStock.availableQuantity recalculated
- ✅ InventoryBatch updated with new qty
- ✅ VendorPayment updated (if PENDING)
- ✅ StockBefore logged for each change
- ✅ GRN document updated with new items
- ✅ Handles item removal (newQty = 0)
- ✅ Handles item addition (oldQty = 0)
- ✅ Handles pure modification (oldQty → newQty)

---

## Error Handling

All errors automatically trigger transaction rollback:

```javascript
try {
  const result = await ImprovedGRNEditManager.editGRN(...);
} catch (error) {
  // Nothing was modified due to automatic rollback
  res.status(400).json({ error: error.message });
}
```

No manual rollback needed!

---

## Files

- **New:** [ImprovedGRNEditManager.js](d:\NEXIS-ERP\server\modules\accounting\services\ImprovedGRNEditManager.js)
- **Keep:** SimpleGRNEditManager.js (for reference/comparison)
- **Update:** grnController.js (integrate new manager)
