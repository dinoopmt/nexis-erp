# GRN Posting → InventoryBatch Creation Flow

## Overview
When a GRN is posted, the system creates an `InventoryBatch` record for **EACH item** in the GRN. Here's the complete code flow:

---

## 1. Entry Point: `postGrn()` in grnController.js

**File:** [server/modules/inventory/controllers/grnController.js](server/modules/inventory/controllers/grnController.js#L465)

```javascript
export const postGrn = async (req, res) => {
  // Step 1: Fetch GRN with populated items
  const grn = await Grn.findById(id).populate("items.productId");
  
  // Step 2: Create accounting entries (journal entries)
  journalEntry = await GRNJournalService.createGrnJournalEntry({...});
  
  // Step 3: UPDATE STOCK, BATCHES, COSTS  ✅ KEY STEP
  stockUpdate = await GRNStockUpdateService.processGrnStockUpdate(grn, userId);
  
  // Step 4: Change GRN status to "Received"
  grn.status = "Received";
  grn.postedDate = new Date();
  grn.postedBy = createdBy;
  await grn.save();
  
  // Step 5: Return comprehensive response
  res.status(200).json({
    inventory: {
      batchesCreated: stockUpdate.createdBatches.length,
      createdBatches: stockUpdate.createdBatches  // ✅ Array of batch details
    }
  });
};
```

---

## 2. Batch Creation: `processGrnStockUpdate()` in GRNStockUpdateService

**File:** [server/modules/accounting/services/GRNStockUpdateService.js](server/modules/accounting/services/GRNStockUpdateService.js#L24)

```javascript
static async processGrnStockUpdate(grnData, userId) {
  // Initialize results object
  const results = {
    createdBatches: [],  // ✅ Will store all created batch records
    processedItems: [],
    updatedProducts: [],
    costUpdates: [],
    // ... other fields
  };

  // ✅ KEY: Process EACH item in GRN
  for (const item of grnData.items || []) {
    try {
      // Get product
      const product = await AddProduct.findById(item.productId);
      
      // 1. Update stock quantity
      const stockUpdate = await this.updateProductStock(product, item, grnData);
      results.processedItems.push(stockUpdate);
      
      // 2. ✅ CREATE BATCH FOR THIS ITEM
      const batchRecord = await this.createOrUpdateBatch(product, item, grnData);
      if (batchRecord) {
        results.createdBatches.push(batchRecord);  // ✅ Add to results
      }
      
      // 3. Update product cost
      const costUpdate = await this.updateProductCost(product, item, grnData);
      
      // 4. Update unit variant costs
      const variantUpdate = await this.updateUnitVariantCosts(product, item, costUpdate?.newCost);
      
      // 5. Create stock movement record
      await this.createStockMovement(product, item, batchRecord, grnData, userId);
      
      // 6. Create audit log
      await this.createAuditLog(product, item, grnData, userId, stockUpdate, costUpdate);
      
    } catch (itemError) {
      results.errors.push({
        itemCode: item.itemCode,
        error: itemError.message
      });
    }
  }
  
  return results;  // ✅ Returns all created batches
}
```

---

## 3. Batch Creation Details: `createOrUpdateBatch()`

**File:** [server/modules/accounting/services/GRNStockUpdateService.js#L234](server/modules/accounting/services/GRNStockUpdateService.js#L234)

### For Non-Expiry-Tracked Products:
```javascript
static async createOrUpdateBatch(product, item, grnData) {
  // Determine which batch model to use
  const isExpiryTracked = product.trackExpiry || false;
  const BatchModel = isExpiryTracked ? StockBatch : InventoryBatch;
  
  // Get conversion factor for unit variants
  const conversionFactor = item.conversionFactor || 1;
  const actualQuantity = (item.quantity || 0) * conversionFactor;  // Convert to base units
  
  // Generate batch number
  const batchNumber = item.batchNumber || `${grnData.grnNumber}-${Date.now()}`;
  
  if (!isExpiryTracked) {
    // ✅ CREATE INVENTORYBATCH FOR THIS ITEM
    const batch = new InventoryBatch({
      productId: product._id,                    // Link to product
      batchNumber,                               // Unique batch identifier
      purchasePrice: item.unitCost,              // Cost per base unit
      quantity: actualQuantity,                  // Total units in batch (in base units)
      quantityRemaining: actualQuantity,         // Initially all remaining
      purchaseDate: grnData.grnDate,             // When it was received
      vendorId: grnData.vendorId,                // Supplier reference
      expiryDate: item.expiryDate || null,       // If applicable
      lotNumber: item.batchNumber || null,       // Batch/lot from supplier
      invoiceNumber: grnData.invoiceNo,          // Reference to purchase invoice
      batchStatus: "ACTIVE"                      // Status of batch
    });
    
    await batch.save();  // ✅ Persisted to database
    
    console.log(`✅ InventoryBatch created: ${batch.batchNumber}`);
    
    return {
      batchId: batch._id.toString(),
      batchNumber: batch.batchNumber,
      model: "InventoryBatch",
      quantity: batch.quantity,
      quantityInVariants: item.quantity,
      conversionFactor: conversionFactor,
      purchasePrice: batch.purchasePrice
    };
  }
  
  // For expiry-tracked products, create StockBatch instead
  // (same process, different model)
}
```

---

## 4. What About During GRN Edit?

When editing a GRN **after it's been posted** (status = "Received"), the batches created during initial posting are **already in the database**.

**File:** [server/modules/accounting/services/GRNEditManager.js](server/modules/accounting/services/GRNEditManager.js)

```javascript
// When editing a Received GRN, batches are found by:
const originalBatch = await InventoryBatch.findOne({
  productId: item.productId,
  batchNumber: item.batchNumber,  // Matches batch created during initial posting
  batchStatus: 'ACTIVE'
});

// Then updates are applied to the existing batch
const updatedBatch = await InventoryBatch.findByIdAndUpdate(
  batch._id,
  { 
    $set: { quantity: newQuantity }  // Update quantity if item quantity changed
  }
);
```

---

## Summary: Batch Creation Guarantee ✅

| Step | Action | Result |
|------|--------|--------|
| 1 | User clicks "Post GRN" button | GRN in Draft status |
| 2 | `postGrn()` handler called | GRN fetched with items |
| 3 | `GRNStockUpdateService.processGrnStockUpdate()` called | **Loops through EACH item** |
| 4 | For each item, `createOrUpdateBatch()` called | **InventoryBatch created** for that item |
| 5 | All batches saved to database | Batches queryable by productId + batchNumber |
| 6 | GRN status changed to "Received" | GRN marked as posted |
| 7 | Response sent to client | Shows `batchesCreated` count |

---

## Evidence of Batch Creation

### In the Response:
```json
{
  "inventory": {
    "batchesCreated": 3,
    "createdBatches": [
      {
        "batchId": "507f1f77bcf86cd799439011",
        "batchNumber": "GRN2024-001-1234567890",
        "model": "InventoryBatch",
        "quantity": 100,
        "purchasePrice": 50.00
      },
      // ... more batches (one per item)
    ]
  }
}
```

### In the Database:
Each item creates ONE `InventoryBatch` document:
```javascript
db.inventorybatches.find({
  batchNumber: { $regex: "^GRN2024-001-" }
})
// Returns all batches created from that GRN
```

---

## Critical Points ✅

1. **Loop Through All Items**: Line 57 in `processGrnStockUpdate()` loops `for (const item of grnData.items || [])`
2. **One Batch Per Item**: Each item calls `createOrUpdateBatch()` which creates exactly 1 batch
3. **Batch Persisted**: `await batch.save()` on line 296 persists to MongoDB
4. **Batches Available for Edit**: After posting, batches are in database by productId + batchNumber
5. **Conversion Factor Handled**: Quantity converted to base units (line 245)

---

## To Verify in Your Environment

1. **Post a GRN with multiple items**
   ```javascript
   POST /grn/post/:id
   Body: { "createdBy": "user123" }
   ```

2. **Check the response**
   - Look for `inventory.batchesCreated` count
   - Should equal number of items in GRN

3. **Query database**
   ```bash
   db.inventorybatches.count({ 
     batchNumber: { $regex: "^GRN-YOUR-GRN-NUMBER" }
   })
   ```
   - Should return number of items in that GRN

4. **Edit the GRN** (if status is Received)
   - Batches should be found successfully
   - Quantity updates should work

---

## No Issues Found ✅

The code properly handles batch creation:
- ✅ Iterates through all items
- ✅ Creates one batch per item
- ✅ Saves to database
- ✅ Returns batch details in response
- ✅ Batches queryable for use during edit operations
