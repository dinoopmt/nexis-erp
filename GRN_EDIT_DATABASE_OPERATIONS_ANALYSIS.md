# GRN Edit Database Operations - Complete Analysis

**Date:** March 22, 2026  
**Scope:** All database write operations during GRN edits (draft and posted)  
**Status:** ✅ COMPLETE

---

## QUICK OVERVIEW

### Primary Edit Entry Points
- **GRNEditManager.js** - Orchestrates both draft and posted GRN edits
- **grnController.js** - HTTP endpoints for updating GRN
- **GRNStockUpdateService.js** - Stock & cost updates (posting only)
- **GRNTransactionValidator.js** - Validates editability constraints

### Edit Scenarios
1. **Draft GRN Edit** - Simple field updates, no stock impact
2. **Posted GRN Edit** - Two-phase: reverse → recalculate → apply
3. **Status Change** - Draft → Received triggers accounting entries

---

## 1. DRAFT GRN EDIT FLOW

### Entry Point
```javascript
GRNEditManager.editDraftGRN(grnId, updates, userId)
// from: grnController.updateGrn() when status = "Draft"
```

### Database Operations

| # | Collection | Operation | Fields Changed | Impact | Transaction |
|---|------------|-----------|-----------------|---------|------------|
| 1 | **Grn** | UPDATE | All fields: items, grnDate, vendorId, vendorName, shippingCost, totalQty, subtotal, discountAmount, discountPercent, totalExTax, taxAmount, netTotal, finalTotal, totalAmount, updatedBy, updatedDate | Draft record modified | Single save() |
| 2 | **ActivityLog** | CREATE | userId, username, action, module, resource, description, changes, status | Audit trail of edit | Single insert |

### Important Notes
✅ **NO STOCK IMPACT** - Draft GRN has not been posted yet  
✅ **NO INVENTORY UPDATES** - User is still preparing the receipt  
✅ **NO ACCOUNTING ENTRIES** - Will be created when status changes to "Received"  
✅ **SIMPLE ATOMIC OPERATION** - Single Grn.save() + audit log  

### Data Stored in Audit Log
```javascript
{
  before: {
    items: [...],
    totalQty,
    totalAmount,
    updatedAt
  },
  after: {
    items: [...],
    totalQty,
    totalAmount
  },
  status: "No stock impact - Draft mode"
}
```

---

## 2. STATUS CHANGE: DRAFT → RECEIVED

### Entry Point
```javascript
grnController.updateGrn() 
// When oldStatus !== "Received" AND status === "Received"
```

### Database Operations (Sequential Order)

| # | Collection | Operation | Fields | When | Critical |
|---|------------|-----------|--------|------|----------|
| **A1** | **Grn** | UPDATE | status="Received", postedDate=now(), postedBy=userId | On status change | Yes |
| **B1** | **JournalEntry** | CREATE | voucherNumber, entryDate, description, lineItems (2 lines), status="DRAFT" | For goods | Yes |
| **B2** | **JournalEntry** | CREATE | voucherNumber, entryDate, description, reference_shipping | For shipping (if > 0) | Conditional |

### Journal Entry Details

#### 1. Main Journal (Goods)
```javascript
{
  voucherNumber: "JV-00001",
  voucherType: "JV",
  entryDate: grnDate,
  referenceNumber: grnNumber,
  lineItems: [
    {
      accountId: "140400" (Trading Goods - DEBIT),
      amount: netTotal + shippingCost
    },
    {
      accountId: vendorPayableAccount (CREDIT),
      amount: netTotal + shippingCost
    }
  ],
  status: "DRAFT",
  postedBy: createdBy
}
```

#### 2. Shipping Journal (if shippingCost > 0)
```javascript
{
  voucherNumber: "JV-00002",
  lineItems: [
    { accountId: "Freight Account", debit: shippingCost },
    { accountId: vendorPayable, credit: shippingCost }
  ]
}
```

---

## 3. POSTED GRN EDIT FLOW

### Entry Point
```javascript
GRNEditManager.editPostedGRN(grnId, changes, userId)
// from: Edit endpoint after validation
```

### Pre-Edit Validation (GRNTransactionValidator)
```javascript
✅ BYPASSED FOR DRAFT: No transaction check needed
✅ FOR POSTED GRN:
  __Cannot Edit If__:
  ❌ Any vendor payment is PARTIAL_PAID or PAID or OVERDUE
  ❌ Stock consumed by sales > 0
  ❌ Returns made to vendor > 0
  
  __Can Edit If__:
  ✅ No payments made (NO_PAYMENT or PENDING only) 
  ✅ No stock sold
  ✅ No returns recorded
```

### Database Operations - PHASE 1: REVERSE ORIGINAL IMPACT

**Purpose:** Undo all stock movements from original GRN posting

| # | Collection | Operation | Fields | Order |
|---|------------|-----------|--------|-------|
| 1 | **CurrentStock** | UPDATE (Atomic $inc) | $inc: { totalQuantity: -qty, availableQuantity: -qty, grnReceivedQuantity: -qty }, $set: { lastUpdatedBy: userId } | Loop item 1 |
| 2 | **StockMovement** | CREATE | productId, quantity, movementType: "OUTBOUND", reference: "GRN# - REVERSAL", referenceId: grnId, unitCost, costingMethodUsed | Loop item 1 |
| 3 | **InventoryBatch** | UPDATE (bulk) | $set: { status: "REVERSED", reversedAt: now() } | Once for all batches |
|  |  |  | For each item in loop | |
| 4 | **CurrentStock** | UPDATE | Same as #1 for next item | Loop item 2..N |
| 5 | **StockMovement** | CREATE | Same as #2 for next item | Loop item 2..N |

### Database Operations - PHASE 2: APPLY NEW CHANGES

**Purpose:** Re-apply GRN with updated quantities/costs

| # | Collection | Operation | Fields | Order | Impact |
|---|------------|-----------|--------|-------|--------|
| 1 | **AddProduct** | UPDATE | quantityInStock = (old - reversed + new), lastStockUpdate: now(), costingMethod, cost (recalculated) | For each product | Stock qty updated |
| 2 | **CurrentStock** | UPDATE (Atomic $inc) | $inc: { totalQuantity: +newQty, availableQuantity: +newQty, grnReceivedQuantity: +newQty } | For each product | Real-time tracking |
| 3 | **StockBatch** or **InventoryBatch** | CREATE | batchNumber, quantity, costPerUnit, expiryDate, batchStatus: "ACTIVE" | Per item with batch | New batch created |
| 4 | **AddProduct** (variants) | UPDATE | packingUnits[i].cost = newProductCost * conversionFactor | If variants exist | Variant costs updated |
| 5 | **StockMovement** | CREATE | reference: "GRN# - <QTY> base units", movementType: "INBOUND" | Per item | Movement logged |
| 6 | **Grn** | UPDATE | items: newItems, totalQty: newTotalQty, totalCost: newTotalCost, updatedBy, updatedDate, editHistory: $push | Once at end | GRN document updated |
| 7 | **ActivityLog** | CREATE | Comprehensive edit audit with before/after snapshots | Once at end | Audit trail |

### Edit History Structure (Stored in Grn.editHistory array)
```javascript
{
  timestamp: now(),
  editedBy: userId,
  reason: "GRN line item modification",
  changes: {
    reversal: { count, items, totalQuantity },
    application: { count, items, totalQuantity }
  }
}
```

---

## 4. GRN POSTING (FROM DRAFT → RECEIVED)

### Entry Point
```javascript
grnController.postGrn(id, { createdBy })
```

### Database Operations (Sequential Order)

**STEP 1: CREATE ACCOUNTING ENTRIES**

| # | Collection | Operation | Details | Status |
|---|------------|-----------|---------|--------|
| 1a | **JournalEntry** | CREATE (Main) | Debit: Inventory, Credit: Vendor Payable, Amount: netTotal | DRAFT |
| 1b | **JournalEntry** | CREATE (Shipping) | If shippingCost > 0 | DRAFT |

**STEP 2: UPDATE STOCK & INVENTORY** (via GRNStockUpdateService.processGrnStockUpdate)

For **each item** in GRN:

| # | Collection | Operation | Fields | Condition |
|---|------------|-----------|--------|-----------|
| 2a | **AddProduct** | UPDATE | quantityInStock += received, lastStockUpdate, lastStockUpdateBy | Always |
| 2b | **CurrentStock** | UPDATE (Atomic) | $inc: totalQuantity, availableQuantity, grnReceivedQuantity | Always |
| 2c | **StockBatch** | CREATE | If trackExpiry=true, batchNumber, expiryDate, quantity, costPerUnit | If expiry tracked |
| 2d | **InventoryBatch** | CREATE | If trackExpiry=false, quantity, purchasePrice, lot info | If not expiry tracked |
| 2e | **AddProduct** (cost) | UPDATE | cost = FIFO/LIFO/WAC, costingMethod, lastCostUpdate | Always |
| 2f | **AddProduct** (variants) | UPDATE | packingUnits[i].cost = newCost * factor | If variants exist |
| 2g | **StockMovement** | CREATE | movementType: "INBOUND", reference: grnNumber, costingMethodUsed | Always |
| 2h | **ActivityLog** | CREATE | GRN_STOCK_RECEIVED action with stock+cost details | Always |

**STEP 3: UPDATE GRN STATUS**

| # | Collection | Operation | Fields |
|---|------------|-----------|--------|
| 3 | **Grn** | UPDATE | status: "Posted", postedDate: now(), postedBy: userId |

### Complete Processing Summary Response
```javascript
{
  grnNumber,
  processedItems: [{ productId, quantity, cost, batchId }],
  updatedProducts: [productIds],
  createdBatches: [batchRecords],
  costUpdates: [{ productId, oldCost, newCost, method }],
  variantUpdates: [{ variantsUpdated, updates }],
  currentStockUpdates: [{ stockId, totalQuantity, availableQuantity }],
  logs: [{ productId, action }],
  errors: []
}
```

---

## 5. AUDIT LOGGING OPERATIONS

### ActivityLog Collection Structure

```javascript
{
  userId: string,
  username: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  module: "Inventory" | "Accounting",
  resource: "Stock - GRN Receipt" | "JV - GRN Posting",
  description: string,
  changes: {
    grnNumber,
    vendor,
    productId,
    quantityBefore,
    quantityAfter,
    costBefore,
    costAfter,
    batchInfo,
    ...
  },
  status: "success" | "failed",
  timestamp: Date
}
```

### When Created
1. **Draft Edit** - Records field changes
2. **Posted GRN Edit** - Records reversal AND reapplication
3. **Stock Receipt** - Per-product stock/cost changes
4. **Edit Denial** - Logs why edit was blocked (transaction constraint)

---

## 6. TRANSACTION HANDLING

### Atomicity Level

| Operation | Scope | Atomicity |
|-----------|-------|-----------|
| Draft GRN Update | Single Grn.save() | ✅ Atomic |
| Status change + Journal | Grn.save() + JournalEntry.save() | ⚠️ Non-atomic (2 ops) |
| Posted GRN Reversal | Loop of CurrentStock.$inc + batches | ⚠️ Per-item atomic via $inc |
| Stock update (posting) | Loop of 8+ operations per item | ⚠️ Non-atomic |
| Batch creation | Single batch save() | ✅ Atomic |

### Failure Handling

**Draft Edit:** Fails immediately if Grn.save() fails

**Posted GRN Edit:** 
- Transaction check blocks edit before reversal starts
- Reversal failures prevent phase 2
- Phase 2 failures don't block phase 1 reversals (may need manual recovery)

**Posting:**
- Journal entry failure doesn't block stock update (logs as warning)
- Stock update failures per-item (collects errors, continues processing)
- Non-critical errors (audit logs, movements) don't throw

---

## 7. FIELD-BY-FIELD UPDATE MATRIX

### When Editing Draft GRN

| Field | Updated | Source |
|-------|---------|--------|
| grnDate | ✅ | req.body |
| invoiceNo | ✅ | req.body |
| lpoNo | ✅ | req.body |
| vendorId | ✅ | req.body |
| vendorName | ✅ | req.body |
| shipperId | ✅ | req.body |
| shipperName | ✅ | req.body |
| referenceNumber | ✅ | req.body |
| deliveryDate | ✅ | req.body |
| shippingCost | ✅ | req.body (parsed float) |
| taxType | ✅ | req.body or "exclusive" |
| status | ✅ | req.body or "Draft" |
| items | ✅ | req.body (full array) |
| notes | ✅ | req.body or "" |
| **CALCULATED TOTALS** | | |
| totalQty | ✅ | req.body (parsed int) |
| subtotal | ✅ | req.body (parsed float) |
| discountAmount | ✅ | req.body (parsed float) |
| discountPercent | ✅ | req.body (parsed float) |
| totalExTax | ✅ | req.body (parsed float) |
| taxAmount | ✅ | req.body (parsed float) |
| netTotal | ✅ | req.body (parsed float) |
| finalTotal | ✅ | req.body (parsed float) |
| totalAmount | ✅ | finalTotal or subtotal |
| updatedBy | ✅ | userId |
| updatedDate | ✅ | now() |

### When Posting GRN (updates AddProduct)

| Field | Calculation | Factor |
|-------|-------------|--------|
| quantityInStock | += qty * conversionFactor | Variant support |
| lowStockAlert | Set if < minStock | Alert threshold |
| lowStockAlertDate | Current date | Timestamp |
| cost | FIFO/LIFO/WAC calculation | Costing method |
| costingMethod | From config | "FIFO" default |
| lastStockUpdate | now() | Timestamp |
| lastStockUpdateBy | grnData.createdBy | User reference |
| costIncludeVat | adjustedCost * (1 + tax%) | If tax inclusive |
| packingUnits[].cost | newProductCost * factor | Per variant |
| packingUnits[].marginAmount | cost * margin% | If margin set |

---

## 8. DATA INTEGRITY CONSTRAINTS

### Pre-Edit Validation

**Draft GRN:**
- ✅ Must exist
- ✅ Status must be "Draft"
- ✅ Required fields: grnDate, vendorId, items

**Posted GRN:**
- ✅ Must exist
- ✅ Status must be "Received"
- ✅ **No vendor payments** (except CANCELLED or PENDING)
- ✅ **No stock consumed** in sales
- ✅ **No returns** recorded
- ✅ Cannot reverse if consumed qty > item qty

### Business Rules

| Rule | Enforced | Level |
|------|----------|-------|
| Reject edit if payment PARTIAL_PAID | ✅ Yes | GRNTransactionValidator |
| Reject edit if stock sold | ✅ Yes | GRNTransactionValidator |
| Require positive quantities | ⚠️ Partial | Frontend validation only |
| Prevent duplicate GRN numbers | ✅ Yes | GRNService (sequence) |
| Lock rejected GRNs | ✅ Yes | GRNEditManager |
| Prevent negative stock reversal | ✅ Yes | GRNEditManager throws |

---

## 9. CHANGE TRACKING & HISTORY

### Grn.editHistory Array
Stores complete edit record when posted GRN is edited:

```javascript
{
  timestamp: Date,
  editedBy: userId,
  reason: string,
  changes: {
    reversal: {
      count: number,
      items: [{ productId, itemCode, quantity, cost }],
      totalQuantity: number
    },
    application: {
      count: number,
      items: [{ productId, itemCode, quantity, cost }],
      totalQuantity: number
    }
  }
}
```

### ActivityLog Captures
- All user actions with before/after snapshots
- Timestamp of each operation
- User performing the action
- Reason/description of change
- Success/failure status

---

## 10. MODELS AFFECTED BY GRN EDITS

| Model | Operations | Purpose |
|-------|-----------|---------|
| **Grn** | CREATE, READ, UPDATE | Main GRN document |
| **AddProduct** | UPDATE | Stock quantity, cost, variants |
| **CurrentStock** | CREATE, UPDATE | Real-time stock tracking |
| **StockBatch** | CREATE, UPDATE | Expiry-tracked batches |
| **InventoryBatch** | CREATE, UPDATE | Simple batches |
| **StockMovement** | CREATE | Audit trail of movements |
| **JournalEntry** | CREATE | Accounting entries (posting) |
| **ActivityLog** | CREATE | User action audit log |
| **VendorPayment** | READ | Transaction check |
| **FinancialYear** | READ | Journal entry validation |
| **ChartOfAccounts** | READ | Account lookups |
| **CreateVendor** | READ | Vendor payable accounts |

---

## 11. ORDER OF OPERATIONS - CRITICAL SEQUENCE

### Posting GRN (Correct Order)
```
1. Fetch GRN with items populated ✓
2. Check if already Posted → reject ✓
3. Create main JournalEntry (DRAFT) ✓
4. Create shipping JournalEntry if needed ✓
5. UPDATE Grn status to "Posted" ✓
6. For each item:
   a. Get product
   b. UPDATE AddProduct qty + cost
   c. UPDATE CurrentStock (atomic $inc)
   d. CREATE batch (StockBatch or InventoryBatch)
   e. UPDATE variant costs
   f. CREATE StockMovement
   g. CREATE ActivityLog
7. Return comprehensive response
```

### Posted GRN Edit (Correct Order)
```
1. Validate GRN exists and is Posted
2. Check transaction dependencies
3. If blocked → log denial + throw error
4. Store original state snapshot
5. PHASE 1 - For each item:
   a. Fetch product
   b. UPDATE CurrentStock (atomic $inc negative)
   c. CREATE reversal StockMovement
   d. UPDATE batch status to REVERSED
6. PHASE 2 - For each changed item:
   a. Fetch product
   b. UPDATE AddProduct qty + cost (recalculated)
   c. UPDATE CurrentStock (atomic $inc positive, new qty)
   d. CREATE new batch
   e. UPDATE variant costs
   f. CREATE new StockMovement
7. UPDATE Grn with new items + editHistory entry
8. CREATE comprehensive ActivityLog
```

---

## 12. ERROR SCENARIOS & RECOVERY

| Error Type | When | Recovery |
|-----------|------|----------|
| Product not found | During stock update | Add to errors array, continue processing |
| Insufficient stock to reverse | Phase 1 | Throw error, block edit completely |
| Account not found | Journal creation | Log warning, proceed with stock update |
| Cost calculation error | Cost update | Use fallback unit cost |
| Batch creation fails | During posting | Non-critical, continue processing |
| Audit log creation fails | At end of operation | Non-critical, don't throw |

---

## 13. PERFORMANCE CONSIDERATIONS

### Database Load

**Draft Edit:** Single Grn.save() + 1 ActivityLog = 2 operations

**Posted GRN Edit:** ~20+ operations per item edited (reversal + reapplication)

**Posting (1 GRN with N items):**
- 1-2 JournalEntry creates
- 1 Grn update
- Per item: 8 operations (product, stock, batch, movement, log, variant, etc.)
- **Total: ~(8N + 3) database operations**

### Atomic Operations Used
- `CurrentStock.findOneAndUpdate(..., { $inc, $set }, upsert: true)` - Atomic increment
- `InventoryBatch.updateMany(..., $set)` - Bulk status update

### Potential Optimization Opportunities
⚠️ **Currently non-atomic sequence:**
- Phase 1 reversals complete before Phase 2 applies
- If Phase 2 fails partway, Phase 1 reversals stand (stock lost)
- Consider MongoDB transactions (if available) for consistency

---

## 14. TESTING SCENARIOS REQUIRED

### Test Cases Needed

| Scenario | Models Affected | Audit Trail |
|----------|-----------------|------------|
| Edit draft GRN header fields | Grn, ActivityLog | ✅ Before/after captured |
| Change draft qty/items | Grn, ActivityLog | ✅ Item changes logged |
| Post draft GRN with normal items | AddProduct, CurrentStock, StockBatch, JournalEntry | ✅ Complete flow |
| Post GRN with FOC items | AddProduct, StockBatch (cost calculation) | ✅ FOC excluded from WAC |
| Post GRN with variants | AddProduct (variants), CurrentStock | ✅ Conversion factor applied |
| Edit posted GRN - increase qty | AddProduct, CurrentStock, InventoryBatch, StockMovement | ✅ Full round-trip logged |
| Edit posted GRN - decrease qty | AddProduct, CurrentStock, InventoryBatch | ✅ Reversals recorded |
| Edit blocked by vendor payment | ActivityLog (denial) | ✅ Rejection logged |
| Edit blocked by consumed stock | ActivityLog (denial) | ✅ Reason logged |
| Multi-item GRN edit | AddProduct (multiple), CurrentStock (multiple) | ✅ All changes per item |

---

## 15. KEY FINDINGS & RECOMMENDATIONS

### ✅ Strengths
1. **Comprehensive audit trail** - All changes logged with before/after snapshots
2. **Two-phase posting** - Reversals before reapplication prevents partial updates
3. **Transaction validation** - Blocks edits when downstream transactions exist
4. **Variant support** - Conversion factors handled correctly throughout
5. **Expiry tracking** - StockBatch created for tracked products

### ⚠️ Gaps & Risks
1. **Non-atomic sequences** - Multi-step operations lack transaction rollback
2. **No concurrency locks** - Two users could edit same GRN simultaneously
3. **Partial success scenarios** - Some items process, others fail (inconsistent state)
4. **Journal entry status** - Created as DRAFT, no automation to post
5. **Error recovery** - Manual intervention needed for Phase 2 failures

### 🔧 Recommended Enhancements
1. Implement MongoDB transactions for multi-step operations
2. Add concurrency prevention (document-level lock flag)
3. Create automated journal posting after successful stock update
4. Add rollback mechanism for Phase 2 failures
5. Implement retry logic for transient failures

---

## SUMMARY TABLE: All Database Operations

```
OPERATION TYPE          | DRAFT | POST  | EDIT(DRAFT) | EDIT(POSTED) | INSTANCES
────────────────────────┼───────┼───────┼─────────────┼──────────────┼──────────
Grn UPDATE              |  -    | 1     |  1          | 1            | 1-3
Grn CREATE              |  1    | -     |  -          | -            | 1
JournalEntry CREATE     |  -    | 2*    |  -          | -            | 0-2
AddProduct UPDATE       |  -    | N     |  -          | N            | N items
CurrentStock UPDATE     |  -    | N     |  -          | 2N           | N to 2N
StockBatch CREATE       |  -    | N*    |  -          | N*           | 0-N
InventoryBatch CREATE   |  -    | N*    |  -          | N*           | 0-N
StockMovement CREATE    |  -    | N     |  -          | 2N           | N to 2N
ActivityLog CREATE      |  1    | 1     |  1          | 1            | 1 per action
────────────────────────┴───────┴───────┴─────────────┴──────────────┴──────────

Legend:
* = Conditional (based on product configuration)
N = Number of items in GRN
- = Not applicable for this flow
```

---

**Generated:** March 22, 2026  
**Source Files:**
- `server/modules/accounting/services/GRNEditManager.js`
- `server/modules/accounting/services/GRNStockUpdateService.js`
- `server/modules/accounting/services/GRNJournalService.js`
- `server/modules/accounting/services/GRNTransactionValidator.js`
- `server/modules/inventory/controllers/grnController.js`
- `server/modules/inventory/services/GRNService.js`
