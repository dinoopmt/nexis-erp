# 🏗️ Stock Recalculation Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERP STOCK SYSTEM                             │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │   User Action: Edit GRN  │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │  SimpleGRNEditManager    │
                    │  .editReceivedGRN()      │
                    └───────────┬──────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
    ┌────────────┐         ┌────────────┐      ┌─────────────┐
    │ Update GRN │         │Update Stock│      │Update Batch │
    │ Document   │         │Movement    │      │Records      │
    └────────────┘         └────┬───────┘      └─────────────┘
                                │
                                │ Qty: 100 → 80
                                │
                    ┌───────────▼──────────────────┐
                    │ Collect Changes              │
                    │ {productId, oldQty, newQty}  │
                    └───────────┬──────────────────┘
                                │
                    ┌───────────▼──────────────────────────┐
                    │ UniversalStockRecalculationService   │
                    │ .recalculateBatch()                  │
                    └───────────┬──────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
    ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
    │Find Changed  │   │Iterate Later     │   │Update Final  │
    │Transaction   │   │Movements (by     │   │Stock in      │
    │             │   │date)             │   │CurrentStock  │
    └──────────────┘   └───────┬──────────┘   └──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │ For Each Movement:       │
                    │ balance += qty           │
                    │ Update .newStock         │
                    │ Update .stockBefore      │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │ Create Audit Log         │
                    │ (Complete Change Trail)  │
                    └──────────────────────────┘
```

---

## Data Model Relationships

```
┌────────────────────────┐
│     AddProduct         │
│  - itemcode            │
│  - name                │
│  - quantityInStock     │
│  - costingMethod       │
└────────────┬───────────┘
             │
             │ 1:N
             │
             ▼
┌────────────────────────┐          ┌──────────────────────────┐
│   StockMovement        │          │    CurrentStock          │
│  - productId           │◄─────────│  - productId             │
│  - movementType        │  linked  │  - totalQuantity (CACHE) │
│  - quantity            │          │  - availableQuantity     │
│  - stockBefore         │          │  - updatedAt             │
│  - newStock ⭐        │          └──────────────────────────┘
│  - documentDate        │                     ▲
│  - referenceId         │                     │ updates
│  - createdAt           │                     │
│  - updatedAt ⭐       │                     │
└────────────────────────┘  ◄─────────────────┘
             │              recalculation
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  GRN (ref)   │  │ Sales (ref)  │
│  - grnNumber │  │ - invoiceNum  │
│  - items[]   │  │ - items[]     │
└──────────────┘  └──────────────┘

⭐ = Updated by recalculation
```

---

## Recalculation Flow (Detailed)

```
INPUT: Product, oldQty, newQty, transactionId

STEP 1: Get Changed Transaction
  ┌─────────────────────────────────────┐
  │ StockMovement.findOne({             │
  │   referenceId: transactionId,        │
  │   productId: productId               │
  │ })                                   │
  │ Result: changedTx = {                │
  │   quantity: oldQty,                  │
  │   documentDate: date,                │
  │   newStock: oldBalance               │
  │ }                                    │
  └──────────────┬──────────────────────┘
                 │
STEP 2: Update Changed Transaction
  ┌──────────────▼──────────────────────┐
  │ StockMovement.updateOne(id, {        │
  │   quantity: newQty,        ← Changed │
  │   newStock: newQty,        ← Changed │
  │   updatedBy: userId,                 │
  │   updatedAt: now                     │
  │ })                                   │
  └──────────────┬──────────────────────┘
                 │
STEP 3: Get Later Movements
  ┌──────────────▼──────────────────────┐
  │ StockMovement.find({                 │
  │   productId,                         │
  │   documentDate: {$gt: changedDate}   │
  │ }).sort([documentDate, createdAt])   │
  │ Result: laterMovements = [{...}]     │
  └──────────────┬──────────────────────┘
                 │
STEP 4: Recalculate Balances
  ┌──────────────▼──────────────────────┐
  │ prevBalance = newQty                 │
  │ FOR each movement IN laterMovements: │
  │   qty = movement.quantity            │
  │   prevBalance += qty   ◄─ KEY LINE   │
  │   Update(movement, {                 │
  │     stockBefore: prevBalance - qty,  │
  │     newStock: prevBalance,           │
  │     updatedBy: userId,               │
  │     updatedAt: now                   │
  │   })                                 │
  │ NEXT                                 │
  └──────────────┬──────────────────────┘
                 │
STEP 5: Update CurrentStock
  ┌──────────────▼──────────────────────┐
  │ CurrentStock.findOneAndUpdate({      │
  │   productId                          │
  │ }, {                                 │
  │   totalQuantity: prevBalance,        │
  │   updatedAt: now,                    │
  │   updatedBy: userId                  │
  │ })                                   │
  └──────────────┬──────────────────────┘
                 │
STEP 6: Create Audit Log
  ┌──────────────▼──────────────────────┐
  │ ActivityLog.create({                 │
  │   action: 'STOCK_RECALCULATION',    │
  │   module: 'Inventory',               │
  │   description: '...',                │
  │   changes: {                         │
  │     oldQty, newQty, movementsCount   │
  │   }                                  │
  │ })                                   │
  └──────────────┬──────────────────────┘
                 │
           RETURN Result
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│           Stock Transaction Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │  CREATE (POST)   │
                    └────────┬─────────┘
                             │
             ┌───────────────┴────────────────┐
             │                                │
       ┌─────▼──────┐                ┌───────▼────────┐
       │ GRN Posted │                │ Sales Created  │
       │ qty = 100  │                │ qty = -50      │
       │ balance=100│                │ balance = 50   │
       └─────┬──────┘                └────────────────┘
             │
       ┌─────▼──────────────────────────────────────┐
       │         EDIT (Update Quantity)              │
       │  GRN: 100 → 80                              │
       │  ← TRIGGERS RECALCULATION                   │
       └─────┬──────────────────────────────────────┘
             │
    ┌────────▼────────────────────────┐
    │ UniversalStockRecalculation:     │
    │ ✅ Update GRN movement           │
    │ ✅ Recalculate Sales movement    │
    │    (50 units still, but balance  │
    │     changes from 50→30)          │
    │ ✅ Update CurrentStock: 50 → 30  │
    │ ✅ Create Audit: Shows all steps │
    └────────┬────────────────────────┘
             │
       ┌─────▼──────┐
       │  RESULT    │
       │ Read Data  │
       │ balance=30 │
       │ Consistent │
       └────────────┘
```

---

## State Transitions

```
Transaction State During Recalculation
═══════════════════════════════════════

BEFORE EDIT:
┌──────────────────────────────┐
│ GRN:   qty=100, balance=100  │
│ Sale:  qty=-50, balance=50   │
│ Stock: currentStock=50       │
└──────────────────────────────┘

DURING EDIT (Step by Step):
┌──────────────────────────────┐
│ ✓ GRN.qty changed: 100→80    │
│ ✓ GRN.balance: 100→80        │ (updated)
│ ✓ Sale.quantity: still -50   │ (unchanged)
│ ✓ Sale.balance: 50→ ?        │ (recalculating)
│ ✓ CurrentStock: 50→ ?        │ (recalculating)
└──────────────────────────────┘

AFTER RECALCULATION:
┌──────────────────────────────┐
│ GRN:   qty=80, balance=80 ✅ │
│ Sale:  qty=-50, balance=30 ✅│
│ Stock: currentStock=30 ✅    │
│ Audit: Change logged ✅      │
└──────────────────────────────┘
```

---

## Performance Characteristics

```
Operation Timing (Approximate)
═════════════════════════════

Find Changed Transaction       ~5ms
Update Changed Movement        ~10ms
Find Later Movements           ~50ms (with index)
Iterate & Update (per move):   ~2ms each
   100 movements              ~200ms
   1000 movements             ~2000ms
Update CurrentStock            ~10ms
Create Audit Log               ~5ms
────────────────────────────────────
TOTAL for 100 movements:  ~280ms ✅
TOTAL for 1000 movements: ~2280ms (consider batch)

Database Indexes Required:
- StockMovement.productId (SPEED)
- StockMovement.documentDate (ESSENTIAL)
- StockMovement.referenceId (SPEED)
```

---

## Error Handling Strategy

```
Recalculation Error Paths
═════════════════════════

┌─ Transaction Not Found
│  └─ LOG: Warning, skip recalc
│     Return: success=true (no change needed)
│
├─ No Later Movements
│  └─ Update only changed transaction
│     Return: success=true
│
├─ Movement Update Fails
│  └─ LOG: Error → Collect in errors array
│     CONTINUE with next movement
│     Return: success=true, errors=[...]
│
├─ CurrentStock Not Found
│  └─ LOG: Warning (non-critical)
│     CONTINUE (affected movements updated)
│     Return: success=true, errors=[...]
│
└─ Audit Log Fails
   └─ LOG: Warning (non-critical)
      CONTINUE (stock already updated)
      Return: success=true, errors=[...]

RESULT: Partial success possible & handled
         Never rolls back (data-first design)
```

---

## Comparison: Before vs After

```
BEFORE (Point Calculation - BROKEN)
═════════════════════════════════

Edit GRN Qty: 100 → 80
  └─ Update GRN record
  └─ Increment CurrentStock by -20
  └─ DONE ❌

Result:
  ├─ GRN: qty=80 ✓
  ├─ CurrentStock: 80 ✓
  ├─ Sale (queried now): qty=-50, ?
  │   └─ Shows balance=50 (was calculated before edit) ❌
  │   └─ INCONSISTENT: Stock updated but sale balance wrong
  └─ Stock balances: BROKEN

───────────────────────────────────

AFTER (Universal Recalculation - FIXED ✅)
════════════════════════════════════════

Edit GRN Qty: 100 → 80
  └─ Update GRN record
  └─ Update GRN movement qty
  └─ Recalculate all later movements
  └─ Update CurrentStock atomically
  └─ Create audit log
  └─ DONE ✅

Result:
  ├─ GRN: qty=80, balance=80 ✓
  ├─ CurrentStock: 80 ✓
  ├─ Sale (queried now): qty=-50, balance=30 ✓
  │   └─ Shows correct balance (recalculated) ✅
  │   └─ CONSISTENT: All balances aligned
  └─ Stock balances: CORRECT ✅
```

---

## Integration Roadmap

```
Phase 1: GRN Edits  ✅ COMPLETE
  ├─ UniversalStockRecalculationService created
  ├─ SimpleGRNEditManager integrated
  └─ All downstream movements now recalculated

Phase 2: Sales Integration  ⏳ TODO
  ├─ SalesInvoiceService: Add stock deduction
  ├─ Trigger recalculation on create/edit
  └─ Enable FIFO/LIFO/WAC costing

Phase 3: RTV Integration  ⏳ TODO
  ├─ RTVStockUpdateService: Add cost recalc
  ├─ Trigger recalculation on create/edit
  └─ Reverse batches & costing

Phase 4: Data Healing  ⏳ TODO
  ├─ Create healing script
  ├─ Recreate all balances from scratch
  └─ Verify consistency

Phase 5: Comprehensive Tests  ⏳ TODO
  ├─ Unit tests
  ├─ Integration tests
  └─ Stress tests (100k+ movements)
```

---

## Quick Implementation Guide

```
TO USE IN NEW SERVICES:

1. Import the service:
   import UniversalStockRecalculationService from 
     "./UniversalStockRecalculationService.js";

2. After updating transaction qty:
   const result = await 
     UniversalStockRecalculationService.recalculateFromTransaction(
       productId,
       transactionId,
       oldQty,
       newQty,
       userId,
       "TRANSACTION_TYPE_REASON"
     );

3. Check result:
   if (result.success) {
     console.log(`Recalculated ${result.movementsRecalculated} movements`);
   } else {
     console.error("Recalculation failed");
   }

4. Logging auto-created, audit trail recorded ✅
```
