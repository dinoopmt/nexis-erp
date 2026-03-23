# Integration Guide: ImprovedGRNEditManager into grnController.js

## What to Change

In `server/modules/inventory/controllers/grnController.js`

### BEFORE (Current Code - Lines ~395-415)

```javascript
try {
  // Import simple edit manager
  const { default: SimpleGRNEditManager } = await import("../../../modules/accounting/services/SimpleGRNEditManager.js");
  
  // Pass ORIGINAL items so it can calculate the difference correctly
  cascadeResult = await SimpleGRNEditManager.editReceivedGRN(
    id,
    {
      ...req.body,
      originalItems: originalData.items  // ← Pass original items for comparison
    },
    req.body.createdBy || "System"
  );

  if (cascadeResult.success) {
    console.log(`✅ [EDIT] Completed successfully`);
  }
} catch (editError) {
  console.error(`⚠️ [EDIT] Error during update:`, editError.message);
  cascadeResult = {
    success: false,
    error: editError.message
  };
}
```

### AFTER (Improved Code)

```javascript
try {
  // Import improved edit manager (transaction-based)
  const { default: ImprovedGRNEditManager } = await import("../../../modules/accounting/services/ImprovedGRNEditManager.js");
  
  // Use new manager (cleaner API)
  cascadeResult = await ImprovedGRNEditManager.editGRN(
    id,
    {
      items: items,
      notes: notes || req.body.notes
    },
    req.body.createdBy || "System"
  );

  if (cascadeResult.success) {
    console.log(`✅ [EDIT] Completed successfully`);
    console.log(`   Items: ${cascadeResult.changes.itemsCount}`);
    console.log(`   Deltas applied: ${cascadeResult.changes.deltasApplied}`);
  }
} catch (editError) {
  console.error(`⚠️ [EDIT] Error during update:`, editError.message);
  cascadeResult = {
    success: false,
    error: editError.message
  };
}
```

---

## Exact Diff

### Location: grnController.js Line ~395

```diff
try {
-  // Import simple edit manager
-  const { default: SimpleGRNEditManager } = await import("../../../modules/accounting/services/SimpleGRNEditManager.js");
+  // Import improved edit manager (transaction-based)
+  const { default: ImprovedGRNEditManager } = await import("../../../modules/accounting/services/ImprovedGRNEditManager.js");
   
-  // Pass ORIGINAL items so it can calculate the difference correctly
-  cascadeResult = await SimpleGRNEditManager.editReceivedGRN(
+  // Use new manager (cleaner API, atomic transactions)
+  cascadeResult = await ImprovedGRNEditManager.editGRN(
     id,
     {
-      ...req.body,
-      originalItems: originalData.items  // ← Pass original items for comparison
+      items: items,
+      notes: notes || req.body.notes
     },
     req.body.createdBy || "System"
   );

   if (cascadeResult.success) {
     console.log(`✅ [EDIT] Completed successfully`);
+    console.log(`   Items: ${cascadeResult.changes.itemsCount}`);
+    console.log(`   Deltas applied: ${cascadeResult.changes.deltasApplied}`);
   }
} catch (editError) {
   console.error(`⚠️ [EDIT] Error during update:`, editError.message);
   cascadeResult = {
     success: false,
     error: editError.message
   };
}
```

---

## Step-by-Step Integration

### Step 1: Backup Current File
```bash
cp server/modules/inventory/controllers/grnController.js \
   server/modules/inventory/controllers/grnController.js.backup
```

### Step 2: Apply the Change
Replace the import and call (around line 395-415):

**OLD:**
```javascript
const { default: SimpleGRNEditManager } = await import(
  "../../../modules/accounting/services/SimpleGRNEditManager.js"
);

cascadeResult = await SimpleGRNEditManager.editReceivedGRN(
  id,
  {
    ...req.body,
    originalItems: originalData.items
  },
  req.body.createdBy || "System"
);
```

**NEW:**
```javascript
const { default: ImprovedGRNEditManager } = await import(
  "../../../modules/accounting/services/ImprovedGRNEditManager.js"
);

cascadeResult = await ImprovedGRNEditManager.editGRN(
  id,
  {
    items: items,
    notes: notes || req.body.notes
  },
  req.body.createdBy || "System"
);
```

### Step 3: Verify Syntax
```bash
cd server
node -c modules/inventory/controllers/grnController.js  # Check syntax
```

### Step 4: Test
```bash
# Start server
npm start

# Test GRN edit via REST API
curl -X PUT http://localhost:3000/api/grn/[grnId] \
  -H "Content-Type: application/json" \
  -d '{
    "grnDate": "2026-03-23",
    "vendorId": "...",
    "items": [{
      "productId": "...",
      "quantity": 150,
      "unitCost": 100,
      ...
    }]
  }'
```

### Step 5: Rollback (if needed)
```bash
cp server/modules/inventory/controllers/grnController.js.backup \
   server/modules/inventory/controllers/grnController.js
```

---

## What Happens During GRN Edit

### Old Flow (SimpleGRNEditManager)
```
API Request
  ↓
updateGrn() captures original data
  ↓
SimpleGRNEditManager.editReceivedGRN()
  ├─ Update GRN ✅
  ├─ Update CurrentStock (no transaction) ⚠️
  ├─ Update StockMovement (no transaction) ⚠️
  ├─ Update InventoryBatch (no transaction) ⚠️
  ├─ Update VendorPayment (no transaction) ⚠️
  └─ Run UniversalStockRecalculationService (separate) ❌
  
If error mid-way → Database in inconsistent state 🔴
```

### New Flow (ImprovedGRNEditManager)
```
API Request
  ↓
updateGrn() captures original data
  ↓
ImprovedGRNEditManager.editGRN()
  └─ CREATE TRANSACTION 🔄
       ├─ Build item maps ✅
       ├─ Calculate deltas ✅
       ├─ Update CurrentStock: $inc delta ✅
       ├─ Recalc availableQty ✅
       ├─ Update InventoryBatch ✅
       ├─ Update StockBefore log ✅
       ├─ Update VendorPayment ✅
       ├─ Update GRN ✅
       └─ COMMIT TRANSACTION (all succeed) 🎯
       
       If error anywhere → Automatic rollback ✅
```

---

## Files to Review

1. **ImprovedGRNEditManager.js** (NEW)
   - Location: `server/modules/accounting/services/ImprovedGRNEditManager.js`
   - Lines: ~450
   - Status: ✅ Ready

2. **grnController.js** (TO UPDATE)
   - Location: `server/modules/inventory/controllers/grnController.js`
   - Change location: ~Line 395-415
   - Total changes: ~10 lines

3. **SimpleGRNEditManager.js** (KEEP AS FALLBACK)
   - Keep for reference/comparison
   - Can be deprecated later

---

## Testing Checklist

After integration, test:

- [ ] ✅ GRN edit with quantity increase
- [ ] ✅ GRN edit with quantity decrease
- [ ] ✅ GRN edit with multiple items changed
- [ ] ✅ GRN edit with item removal (qty 0)
- [ ] ✅ CurrentStock.totalQuantity updates correctly
- [ ] ✅ CurrentStock.availableQuantity recalculated
- [ ] ✅ VendorPayment updated (if PENDING)
- [ ] ✅ Error handling (e.g., invalid vendorId)
- [ ] ✅ Transaction rollback on error
- [ ] ✅ No orphaned records left

---

## Expected Results

### Before Edit
```json
{
  "grnId": "12345",
  "grnNumber": "GRN-001",
  "status": "Draft",
  "items": [
    { "productId": "ABC", "quantity": 100, "unitCost": 50 }
  ],
  "totalAmount": 5000
}

CurrentStock ({ productId: "ABC" }):
{
  "totalQuantity": 350,
  "availableQuantity": 350
}
```

### Edit Request
```json
{
  "items": [
    { "productId": "ABC", "quantity": 150, "unitCost": 50 }
  ],
  "totalAmount": 7500
}
```

### After Edit
```json
{
  "grnId": "12345",
  "grnNumber": "GRN-001",
  "status": "Draft",
  "items": [
    { "productId": "ABC", "quantity": 150, "unitCost": 50 }
  ],
  "totalAmount": 7500,
  "updatedAt": "2026-03-23T..."
}

CurrentStock ({ productId: "ABC" }):
{
  "totalQuantity": 400,  // 350 + delta(+50)
  "availableQuantity": 400  // Recalculated
}

StockBefore log:
{
  "grnId": "12345",
  "productId": "ABC",
  "stockBefore": 100,
  "newStock": 150,
  "difference": 50
}
```

---

## Troubleshooting

### Issue: Import error
```
Error: Cannot find module 'ImprovedGRNEditManager'
```
**Solution:** Check path is correct: `../../../modules/accounting/services/ImprovedGRNEditManager.js`

### Issue: Transaction timeout
```
MongooseError: Session timeout
```
**Solution:** Increase session timeout or check DB connection

### Issue: Delta not applied
```
CurrentStock.totalQuantity doesn't match expected
```
**Solution:** Check delta calculation in logs, verify old qty was correct

### Issue: Rollback triggered unexpectedly
```
Transaction rolled back / No changes persisted
```
**Solution:** Check error logs for validation errors (e.g., invalid vendorId)

---

## Questions?

Refer to:
- **Full Details:** `IMPROVED_GRN_EDIT_GUIDE.md`
- **Comparison:** `COMPARISON_SimpleVsImproved.md`
- **Implementation:** `ImprovedGRNEditManager.js`
