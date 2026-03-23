# StockMovement Model - Complete Analysis

**Date**: March 22, 2026  
**Status**: Analysis Complete  
**Scope**: Schema, Relationships, GRN Edit Handling, Usage Patterns

---

## 1. SCHEMA DEFINITION

### File Location
`server/Models/StockMovement.js`

### Complete Schema

```javascript
{
  // ✅ REQUIRED FIELDS
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AddProduct',
    required: true,              // ✅ REQUIRED
    index: true,
  },

  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryBatch',
    required: true,              // ✅ REQUIRED - ISSUE: Set as required but passed as null in edits
    index: true,
  },

  movementType: {
    type: String,
    enum: ['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'RETURN'],
    required: true,              // ✅ REQUIRED
    index: true,
  },

  quantity: {
    type: Number,
    required: true,              // ✅ REQUIRED
    min: 0,
  },

  unitCost: {
    type: Number,
    required: true,              // ✅ REQUIRED
    min: 0,
  },

  // OPTIONAL FIELDS
  totalAmount: {
    type: Number,                // Computed: quantity × unitCost
    computed: true,
  },

  reference: {
    type: String,                // Document number (GRN-2026-001, SALES-2026-001, etc.)
    required: true,              // ✅ REQUIRED
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    // Optional - links to the source document
  },

  referenceType: {
    type: String,
    enum: ['SALES_INVOICE', 'PURCHASE_ORDER', 'STOCK_ADJUSTMENT', 'RETURN'],
    required: true,              // ✅ REQUIRED
  },

  costingMethodUsed: {
    type: String,
    enum: ['FIFO', 'LIFO', 'WAC'],
    required: true,              // ✅ REQUIRED
  },

  documentDate: {
    type: Date,
    required: true,              // ✅ REQUIRED
    default: Date.now,
    index: true,
  },

  notes: {
    type: String,                // Optional
  },

  reasonCode: {
    type: String,
    enum: ['DAMAGE', 'LOSS', 'EXPIRY', 'QUALITY', 'OTHER'],
    // For adjustments/returns only - optional
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Optional - user who recorded movement
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  }
}
```

### Virtual Fields

```javascript
// Computed total: quantity × unitCost
StockMovementSchema.virtual('total').get(function() {
  return this.quantity * this.unitCost;
});
```

### Indexes

```javascript
// Quick lookup by movement type and date
StockMovementSchema.index({ movementType: 1, documentDate: 1 });

// Find movements linked to source documents
StockMovementSchema.index({ referenceType: 1, referenceId: 1 });
```

---

## 2. REQUIRED vs OPTIONAL FIELDS

### ✅ REQUIRED FIELDS (8 fields)
| Field | Type | Validation | Used For |
|-------|------|-----------|----------|
| `productId` | ObjectId | Required | Which product moved |
| `batchId` | ObjectId | **Required** | Batch tracking (⚠️ ISSUE: passed as null in edits) |
| `movementType` | String | ENUM required | INBOUND\|OUTBOUND\|ADJUSTMENT\|RETURN |
| `quantity` | Number | Required, min:0 | How many units |
| `unitCost` | Number | Required, min:0 | Costing information |
| `reference` | String | Required | Document number (GRN#, SI#) |
| `referenceType` | String | ENUM required | PURCHASE_ORDER\|SALES_INVOICE\|... |
| `costingMethodUsed` | String | ENUM required | FIFO\|LIFO\|WAC |
| `documentDate` | Date | Required | Transaction date |

### 📝 OPTIONAL FIELDS (6 fields)
| Field | Type | Default | Used For |
|-------|------|---------|----------|
| `referenceId` | ObjectId | None | Link to source doc (_id) |
| `notes` | String | None | Additional context |
| `reasonCode` | String | None | DAMAGE\|LOSS\|EXPIRY for adjustments |
| `createdBy` | ObjectId | None | User who recorded |
| `totalAmount` | Number | Computed | quantity × unitCost |
| `createdAt` | Date | Date.now | Record timestamp |

---

## ⚠️ 3. CRITICAL ISSUE: batchId REQUIREMENT

### Problem

**The schema defines `batchId` as `required: true`, but GRN edit operations pass `batchId: null`**

```javascript
// Current GRNEditManager code - PROBLEMATIC
await StockHistoryManager.recordMovement({
  productId: item.productId,
  batchId: null,                    // ❌ VIOLATES required: true
  movementType: 'OUTBOUND',
  quantity: item.quantity,
  unitCost: item.cost || 0,
  reference: `${grn.grnNumber} - REVERSAL`,
  referenceId: grn._id,
  referenceType: 'PURCHASE_ORDER',
  costingMethodUsed: grn.costingMethod || 'FIFO',
  documentDate: new Date(),
  createdBy: userId,
  notes: `Reversal of GRN ${grn.grnNumber}`
});
```

### Why This Happens

1. **GRN Posting** - Batch exists, use it:
   ```javascript
   // ✅ CORRECT - GRN posting creates batch first
   const batchRecord = await this.createOrUpdateBatch(product, item, grnData);
   await this.createStockMovement(product, item, batchRecord, grnData, userId);
   ```

2. **GRN Edits - Reversals** - No clear batch to use:
   ```javascript
   // ❌ PROBLEM - Reversal doesn't know which batch to reference
   // Original stock movement may have referenced multiple batches
   // Or batch may already be partially consumed
   ```

3. **GRN Edits - New Items** - No batch created yet:
   ```javascript
   // ❌ PROBLEM - New items added in edit don't have a batch yet
   // Should create batch first, then reference it
   ```

---

## 4. STOCKMOVEMENT ↔ INVENTORYBATCH RELATIONSHIP

### Relationship Model

```
InventoryBatch (One)
    ↕
StockMovement (Many)
```

### InventoryBatch Schema

```javascript
{
  _id: ObjectId,
  productId: ObjectId,
  batchNumber: String,
  purchasePrice: Number,           // Cost per unit
  quantity: Number,                // Total received
  quantityRemaining: Number,       // Still available
  purchaseDate: Date,
  vendorId: ObjectId,
  expiryDate: Date,               // If applicable
  lotNumber: String,
  batchStatus: String,            // ACTIVE | CLOSED | EXPIRED
  
  // ✅ Tracks all movements of this batch
  costMovements: [ObjectId],      // References to StockMovement
  
  createdAt: Date,
  updatedAt: Date
}
```

### How They Link

```javascript
// 1. InventoryBatch stores list of movements
InventoryBatch {
  _id: "batch-001",
  batchNumber: "BATCH-001",
  costMovements: ["movement-001", "movement-002", "movement-003"]
}

// 2. StockMovement references the batch
StockMovement {
  _id: "movement-001",
  batchId: "batch-001",           // ← Points back to InventoryBatch
  productId: "prod-001",
  movementType: "INBOUND",
  quantity: 100,
  reference: "GRN-2026-001"
}

// 3. Query relationships
const movements = await StockMovement
  .find({ batchId: batchId })
  .populate('batchId', 'batchNumber expiryDate');
```

### Unique Constraint

```javascript
// Compound index ensures one batch per product per purchase date
InventoryBatchSchema.index(
  { productId: 1, batchNumber: 1, purchaseDate: 1 },
  { unique: true }
);
```

---

## 5. GRN EDIT SCENARIOS - HOW TO HANDLE BATCHES

### Scenario 1: Edit Draft GRN (No Stock Impact)

**Situation**: GRN not yet posted, no stock movements exist yet

**Solution**: 
- No batch needed
- No stock movement needed
- Just update GRN document
- Create ActivityLog for audit trail

```javascript
// No stock impact scenario
await Grn.findByIdAndUpdate(grnId, { items: newItems, status: 'DRAFT' });
await ActivityLog.create({ action: 'GRN_EDITED', ... });
```

### Scenario 2: Post Draft GRN (First Time Stock Update)

**Situation**: GRN moving from DRAFT to RECEIVED status

**Solution**:
1. Create batch records (StockBatch or InventoryBatch)
2. Create stock movements with batchId references
3. Update product stock
4. Create journal entries

```javascript
// ✅ CORRECT - Process both batch and movement together
for (const item of grn.items) {
  // 1. Create batch first
  const batch = new InventoryBatch({
    productId: item.productId,
    batchNumber: item.batchNumber || `${grn.grnNumber}-${Date.now()}`,
    purchasePrice: item.unitCost,
    quantity: item.quantity,
    quantityRemaining: item.quantity,
    purchaseDate: grn.grnDate,
    vendorId: grn.vendorId,
    batchStatus: 'ACTIVE'
  });
  await batch.save();

  // 2. Create movement WITH batch
  const movement = new StockMovement({
    productId: item.productId,
    batchId: batch._id,           // ✅ NOW HAS BATCH
    movementType: 'INBOUND',
    quantity: item.quantity,
    unitCost: item.unitCost,
    totalAmount: item.quantity * item.unitCost,
    reference: grn.grnNumber,
    referenceId: grn._id,
    referenceType: 'PURCHASE_ORDER',
    costingMethodUsed: grn.costingMethod,
    documentDate: grn.grnDate,
    createdBy: userId
  });
  await movement.save();

  // 3. Update batch's costMovements array
  await InventoryBatch.findByIdAndUpdate(batch._id, {
    $push: { costMovements: movement._id }
  });
}
```

### Scenario 3: Edit Posted GRN - Quantity Increase

**Situation**: Posted GRN, user increases quantity from 100 → 150

**Problem to Solve**:
- Original 100 units already in InventoryBatch
- Need to add 50 more units
- Original batch may have partial movements (some consumed by sales)
- Can't modify existing batch (may break sales history)

**Solution Options**:

#### Option A: Create New Batch for Additional Quantity (RECOMMENDED)
```javascript
// ✅ PREFERRED - Separate batch for clarity
// Original batch: 100 units (ACTIVE, possibly partially consumed)
// New batch: 50 units (from edited GRN)

// 1. Create new batch for the additional quantity
const additionalBatch = new InventoryBatch({
  productId: item.productId,
  batchNumber: `${grn.grnNumber}-EDIT-${Date.now()}`,
  purchasePrice: item.unitCost,
  quantity: 50,                           // Only the difference
  quantityRemaining: 50,
  purchaseDate: grn.grnDate,
  vendorId: grn.vendorId,
  batchStatus: 'ACTIVE'
});
await additionalBatch.save();

// 2. Record movement for the addition
await StockHistoryManager.recordMovement({
  productId: item.productId,
  batchId: additionalBatch._id,          // ✅ NEW batch
  movementType: 'INBOUND',               // Still INBOUND
  quantity: 50,
  unitCost: item.unitCost,
  reference: `${grn.grnNumber} - EDIT-INCREASE`,
  referenceId: grn._id,
  referenceType: 'PURCHASE_ORDER',
  costingMethodUsed: grn.costingMethod,
  documentDate: grn.grnDate,
  createdBy: userId,
  notes: `GRN edit: increased quantity by 50 units`
});

// 3. Update original GRN item quantity
await Grn.findByIdAndUpdate(grnId, {
  'items.$[elem].quantity': 150,
  'items.$[elem].batchId': originalBatchId  // Keeps original batch reference
}, { arrayFilters: [{ 'elem._id': itemId }] });
```

#### Option B: If Batch Not Yet Consumed (Simpler)
```javascript
// ✅ ONLY if batch has NO movements (hasn't been touched by sales)
const existingBatch = await InventoryBatch.findById(originalBatchId);

if (existingBatch.costMovements.length === 0) {
  // Safe to update - no sales have used this batch
  await InventoryBatch.findByIdAndUpdate(existingBatchId, {
    $set: {
      quantity: 150,
      quantityRemaining: 150
    }
  });

  // Record the amendment
  await StockHistoryManager.recordMovement({
    productId: item.productId,
    batchId: existingBatchId,
    movementType: 'INBOUND',
    quantity: 50,                         // Only the addition
    unitCost: item.unitCost,
    reference: `${grn.grnNumber} - AMENDMENT`,
    referenceId: grn._id,
    referenceType: 'PURCHASE_ORDER',
    costingMethodUsed: grn.costingMethod,
    documentDate: grn.grnDate,
    createdBy: userId,
    notes: `GRN amendment: added 50 units`
  });
} else {
  // Fallback to Option A if batch already consumed
  // ... use Option A above
}
```

### Scenario 4: Edit Posted GRN - Quantity Decrease

**Situation**: Posted GRN, user decreases quantity from 100 → 80

**Problem**: 
- Original batch has 100 units
- Some may have been sold/consumed
- Need to reduce appropriately

**Solution**:
```javascript
// ✅ IMPLEMENTATION
const originalBatch = await InventoryBatch.findById(batchId);
const quantityDifference = originalQuantity - newQuantity;  // 100 - 80 = 20

// 1. Reverse the excess as OUTBOUND
await StockHistoryManager.recordMovement({
  productId: item.productId,
  batchId: batchId,                       // Same batch
  movementType: 'OUTBOUND',               // REVERSAL as outbound
  quantity: quantityDifference,           // 20 units
  unitCost: item.unitCost,
  reference: `${grn.grnNumber} - EDIT-DECREASE`,
  referenceId: grn._id,
  referenceType: 'PURCHASE_ORDER',
  costingMethodUsed: grn.costingMethod,
  documentDate: new Date(),
  createdBy: userId,
  reasonCode: 'OTHER',
  notes: `GRN edit: reduced quantity by ${quantityDifference} units`
});

// 2. Update batch
await InventoryBatch.findByIdAndUpdate(batchId, {
  $set: {
    quantity: newQuantity,                // 80
    quantityRemaining: Math.max(0, originalBatch.quantityRemaining - quantityDifference)
  }
});

// 3. Update GRN
await Grn.findByIdAndUpdate(grnId, {
  'items.$[elem].quantity': newQuantity
}, { arrayFilters: [{ 'elem._id': itemId }] });
```

---

## 6. STOCKHISTORYMANAGER.recordMovement - USAGE PATTERNS

### File Location
`server/utils/StockHistoryManager.js`

### Method Signature

```javascript
static async recordMovement(data) {
  // data = {
  //   productId: ObjectId,
  //   batchId: ObjectId,                  // ⚠️ Currently required but got null
  //   movementType: 'INBOUND'|'OUTBOUND'|'ADJUSTMENT'|'RETURN',
  //   quantity: Number,
  //   unitCost: Number,
  //   reference: String,
  //   referenceId: ObjectId,
  //   referenceType: 'SALES_INVOICE'|'PURCHASE_ORDER'|'STOCK_ADJUSTMENT'|'RETURN',
  //   costingMethodUsed: 'FIFO'|'LIFO'|'WAC',
  //   documentDate: Date,
  //   createdBy: ObjectId,
  //   reasonCode: 'DAMAGE'|'LOSS'|'EXPIRY'|'QUALITY'|'OTHER',
  //   notes: String
  // }
}
```

### Usage Pattern 1: GRN Posting (CORRECT)

**File**: `GRNStockUpdateService.js` - Line 553

```javascript
static async createStockMovement(product, item, batchRecord, grnData, userId) {
  try {
    // Only create if batch exists (from inventory batch)
    if (!batchRecord) return;

    const movement = new StockMovement({
      productId: product._id,
      batchId: batchRecord.batchId,          // ✅ HAS BATCH ID
      movementType: "INBOUND",
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalAmount: item.quantity * item.unitCost,
      reference: grnData.grnNumber,
      referenceId: grnData._id,
      referenceType: "PURCHASE_ORDER",
      costingMethodUsed: product.costingMethod || "FIFO",
      documentDate: grnData.grnDate,
      notes: `GRN Receipt - ${grnData.grnNumber} from ${grnData.vendorName}`,
      createdBy: userId
    });

    await movement.save();
    
    console.log(`✅ Stock movement recorded: ${movement._id}`);

  } catch (error) {
    console.error("❌ Error creating stock movement:", error);
  }
}
```

### Usage Pattern 2: GRN Edit - Reversal (PROBLEMATIC)

**File**: `GRNEditManager.js` - Line 384

```javascript
// ❌ ISSUE: batchId is null but schema requires it
await StockHistoryManager.recordMovement({
  productId: item.productId,
  batchId: null,                            // ❌ VIOLATES required: true
  movementType: 'OUTBOUND',
  quantity: item.quantity,
  unitCost: item.cost || 0,
  reference: `${grn.grnNumber} - REVERSAL`,
  referenceId: grn._id,
  referenceType: 'PURCHASE_ORDER',
  costingMethodUsed: grn.costingMethod || 'FIFO',
  documentDate: new Date(),
  createdBy: userId,
  notes: `Reversal of GRN ${grn.grnNumber} posted on ${grn.postedDate}`
});
```

### Usage Pattern 3: GRN Edit - Quantity Change (PROBLEMATIC)

**File**: `GRNEditManager.js` - Line 477

```javascript
// ❌ ISSUE: batchId is null when adding new items
await StockHistoryManager.recordMovement({
  productId: change.productId,
  batchId: null,                            // ❌ VIOLATES required: true
  movementType: 'INBOUND',
  quantity: change.quantity,
  unitCost: change.cost || 0,
  reference: `${grn.grnNumber} - EDITED`,
  referenceId: grnId,
  referenceType: 'PURCHASE_ORDER',
  costingMethodUsed: grn.costingMethod || 'FIFO',
  documentDate: grn.grnDate,
  createdBy: userId,
  notes: `Updated quantity in GRN edit: ${change.quantity} units`
});
```

### Usage Pattern 4: Stock Adjustment (WOULD NEED BATCH)

**Scenario**: Manual stock adjustment

```javascript
// Adjustment batches created for stock add
const adjustmentBatch = new InventoryBatch({
  productId,
  batchNumber: `ADJ-BATCH-${Date.now()}`,
  purchasePrice: 0,
  quantity,
  quantityRemaining: quantity,
  purchaseDate: new Date(),
  batchStatus: 'ACTIVE'
});
await adjustmentBatch.save();

// Record adjustment movement
await StockHistoryManager.recordMovement({
  productId,
  batchId: adjustmentBatch._id,            // ✅ HAS BATCH
  movementType: 'ADJUSTMENT',
  quantity,
  unitCost: 0,
  totalAmount: 0,
  reference: `ADJ-${Date.now()}`,
  referenceType: 'STOCK_ADJUSTMENT',
  costingMethodUsed: 'FIFO',
  documentDate: new Date(),
  createdBy: userId,
  reasonCode: 'OTHER',
  notes: `Manual stock adjustment`
});
```

---

## 7. RECOMMENDED FIXES

### Fix 1: Make batchId Optional (Schema Change)

```javascript
// In StockMovement.js
batchId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'InventoryBatch',
  required: false,                    // ✅ CHANGE: Make optional
  index: true,
},

// Add validator to allow null but track it
batchId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'InventoryBatch',
  default: null,
  index: true,
  validate: {
    validator: function(value) {
      // Allow null, or must be valid ObjectId
      return value === null || mongoose.Types.ObjectId.isValid(value);
    },
    message: 'batchId must be null or valid ObjectId'
  }
}
```

### Fix 2: Create Batches During GRN Edits

```javascript
// In GRNEditManager - create batch before recording movement
static async editPostedGRN(grnId, changes, userId) {
  const grn = await Grn.findById(grnId);

  for (const change of changes.additions) {
    // 1. Create batch for new items
    const newBatch = new InventoryBatch({
      productId: change.productId,
      batchNumber: `${grn.grnNumber}-EDIT-ADD-${Date.now()}`,
      purchasePrice: change.cost || 0,
      quantity: change.quantity,
      quantityRemaining: change.quantity,
      purchaseDate: grn.grnDate,
      vendorId: grn.vendorId,
      batchStatus: 'ACTIVE',
      invoiceNumber: grn.invoiceNo
    });
    await newBatch.save();

    // 2. Record movement with the batch
    await StockHistoryManager.recordMovement({
      productId: change.productId,
      batchId: newBatch._id,              // ✅ NOW HAS BATCH
      movementType: 'INBOUND',
      quantity: change.quantity,
      unitCost: change.cost || 0,
      reference: `${grn.grnNumber}-EDIT`,
      referenceId: grnId,
      referenceType: 'PURCHASE_ORDER',
      costingMethodUsed: grn.costingMethod || 'FIFO',
      documentDate: grn.grnDate,
      createdBy: userId,
      notes: `Added during GRN edit`
    });
  }
}
```

### Fix 3: Link Reversal to Original Batch

```javascript
// For reversals, find the batch that was originally used
static async reverseGRNItem(grn, item, userId) {
  // Find the batch created for this GRN item
  const originalBatch = await InventoryBatch.findOne({
    productId: item.productId,
    referenceNumber: grn.grnNumber
  });

  if (originalBatch) {
    // Record reversal with original batch reference
    await StockHistoryManager.recordMovement({
      productId: item.productId,
      batchId: originalBatch._id,          // ✅ LINK TO ORIGINAL
      movementType: 'OUTBOUND',
      quantity: item.quantity,
      unitCost: item.cost || 0,
      reference: `${grn.grnNumber}-REVERSAL`,
      referenceId: grn._id,
      referenceType: 'PURCHASE_ORDER',
      costingMethodUsed: grn.costingMethod || 'FIFO',
      documentDate: new Date(),
      createdBy: userId,
      reasonCode: 'OTHER',
      notes: `Reversal of GRN ${grn.grnNumber}`
    });
  } else {
    // Fallback: create reversal batch
    // ...
  }
}
```

---

## 8. SUMMARY TABLE

| Aspect | Details |
|--------|---------|
| **Schema Location** | `server/Models/StockMovement.js` |
| **Required Fields** | productId, batchId, movementType, quantity, unitCost, reference, referenceType, costingMethodUsed, documentDate |
| **Optional Fields** | referenceId, notes, reasonCode, createdBy |
| **batchId Status** | ⚠️ Marked `required: true` but passed as `null` in GRN edits |
| **Batch Relationship** | Many StockMovements per InventoryBatch (one-to-many) |
| **Movement Types** | INBOUND (purchasing), OUTBOUND (sales/returns), ADJUSTMENT (corrections), RETURN (vendor returns) |
| **Costing Methods** | FIFO, LIFO, WAC (Weighted Average Cost) |
| **Key Indexes** | (movementType, documentDate), (referenceType, referenceId), (productId), (batchId) |
| **Audit Trail** | Complete history in StockMovement (NOT in CurrentStock) |
| **GRN Edit Issue** | Reversals pass `batchId: null` violating schema constraint |
| **Recommendation** | Either make batchId optional OR create batches during GRN edits |

---

## 9. KEY FINDINGS

### ✅ Strengths
- Complete audit trail for every stock movement
- Proper indexing for performance
- Costing method tracking (FIFO/LIFO/WAC)
- Batch reference for traceability

### ⚠️ Issues Identified
1. **Schema Constraint Violation**: batchId marked required but GRN edits pass null
2. **Data Quality**: Inconsistent batch tracking during edits
3. **Missing Batch Creation**: GRN edits don't create batches before recording movements
4. **Audit Trail Completeness**: Some movements may not properly reference batches

### 🔧 Required Fixes
1. Make batchId optional in schema OR
2. Create batches during all GRN edit operations before recording movements
3. Update GRNEditManager to handle batch creation
4. Document batch creation strategy for edits

