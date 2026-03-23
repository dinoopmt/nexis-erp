# STOCK RECONCILIATION ARCHITECTURE

## System Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     STOCK RECONCILIATION SYSTEM                      │
│                                                                       │
│  Recalculate running balances from scratch for all products          │
└─────────────────────────────────────────────────────────────────────┘

                            START RECONCILIATION
                                    │
                                    ↓
                    ┌───────────────────────────┐
                    │  GET ALL PRODUCTS         │
                    │  (or specific products)   │
                    └───────────────────────────┘
                                    │
                                    ↓
                    ┌───────────────────────────┐
                    │  FOR EACH PRODUCT         │
                    │  reconcileProduct()       │
                    └───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ↓                           ↓                           ↓
   ┌─────────────┐         ┌─────────────────┐       ┌──────────────────┐
   │ GET ALL     │         │ RECALCULATE     │       │ GET CURRENT      │
   │ MOVEMENTS   │         │ BALANCE FROM    │       │ STOCK            │
   │             │         │ SCRATCH         │       │                  │
   │ • INBOUND   │         │                 │       │ totalQuantity    │
   │ • OUTBOUND  │         │ Sort by:        │       │ availableQty     │
   │ • ADJUSTMENT│         │ 1. documentDate │       │ grnReceivedQty   │
   │             │         │ 2. createdAt    │       │                  │
   │ Sorted by   │         │                 │       │                  │
   │ date order  │         │ Loop:           │       │                  │
   │             │         │ balance += qty  │       │                  │
   └─────────────┘         └─────────────────┘       └──────────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                    ┌───────────────────────────┐
                    │ COMPARE                   │
                    │                           │
                    │ currentStock.totalQty     │
                    │    ===                    │
                    │ calculatedBalance?        │
                    └───────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
        ┌───────────────────────┐      ┌───────────────────────┐
        │ NO - DISCREPANCY      │      │ YES - MATCH           │
        │                       │      │                       │
        │ variance ≠ 0          │      │ ✅ Product is OK      │
        │                       │      │                       │
        │ Action:               │      │ Result: PASS          │
        │ • Log in report       │      │                       │
        │ • If autoHeal:        │      └───────────────────────┘
        │   recalculate()       │
        │ • Store details       │
        └───────────────────────┘
                    │
                    ↓
        ┌───────────────────────┐
        │ GENERATE REPORT       │
        │                       │
        │ Summary:              │
        │ • Total products      │
        │ • Discrepancies found │
        │ • Healed count        │
        │ • Errors              │
        │                       │
        │ Financial impact:     │
        │ • Total variance      │
        │ • Variance %          │
        │                       │
        │ Details:              │
        │ • Per-product info    │
        │ • Movements list      │
        └───────────────────────┘
                    │
                    ↓
        ┌───────────────────────┐
        │ EXPORT REPORT         │
        │                       │
        │ Format options:       │
        │ • JSON (full detail)  │
        │ • CSV (Excel ready)   │
        │ • Console (display)   │
        └───────────────────────┘
                    │
                    ↓
                END - REPORT READY
```

---

## Recalculation Algorithm Detail

```
STEP 1: GET MOVEMENTS
  StockMovement.find({ productId })
    .sort({ documentDate: 1, createdAt: 1 })
    .lean()

  Example sequence:
  ┌───────────────────────────────────────────┐
  │ Movement 1 (GRN) - 2026-03-10 - +100      │
  │ Movement 2 (GRN) - 2026-03-15 - +250      │
  │ Movement 3 (Sales) - 2026-03-18 - -50     │
  │ Movement 4 (Sales) - 2026-03-20 - -100    │
  │ Movement 5 (Return) - 2026-03-22 - +25    │
  └───────────────────────────────────────────┘

STEP 2: CALCULATE RUNNING BALANCE
  calculatedBalance = 0
  
  Movement 1: calculatedBalance += 100  = 100
  Movement 2: calculatedBalance += 250  = 350
  Movement 3: calculatedBalance -= 50   = 300
  Movement 4: calculatedBalance -= 100  = 200
  Movement 5: calculatedBalance += 25   = 225
  
  ✅ FINAL = 225

STEP 3: GET CURRENT STOCK
  currentStock = CurrentStock.findOne({ productId })
  currentStock.totalQuantity = 225
  
  ✅ MATCHES!

STEP 4: REPORT
  Product-XYZ:
  ✅ Match
  Current: 225
  Calculated: 225
  Variance: 0
```

---

## Discrepancy Scenarios

```
SCENARIO 1: SHORTAGE (Missing inventory)
┌──────────────────────────────────────┐
│ Current Stock:    500                │
│ Calculated:       550                │
│ Variance:         -50 (shortage)     │
│                                      │
│ Root Cause:                          │
│ • Unrecorded sales                   │
│ • Inventory theft/loss               │
│ • System error in posting            │
│                                      │
│ Action:                              │
│ • Trace transactions                 │
│ • Physical count                     │
│ • Create adjustment if needed        │
└──────────────────────────────────────┘

SCENARIO 2: OVERAGE (Extra inventory)
┌──────────────────────────────────────┐
│ Current Stock:    750                │
│ Calculated:       700                │
│ Variance:         +50 (overage)      │
│                                      │
│ Root Cause:                          │
│ • Unrecorded returns                 │
│ • Duplicate GRN posting              │
│ • Data entry error                   │
│                                      │
│ Action:                              │
│ • Review recent receipts             │
│ • Check for duplicate posts          │
│ • Create negative adjustment         │
└──────────────────────────────────────┘

SCENARIO 3: MAJOR DISCREPANCY
┌──────────────────────────────────────┐
│ Current Stock:    100                │
│ Calculated:       0                  │
│ Variance:         +100               │
│ Variance %:       100%               │
│                                      │
│ Root Cause:                          │
│ • Complete movement history missing  │
│ • Major data corruption              │
│ • System initialization issue        │
│                                      │
│ Action:                              │
│ • Audit trail review                 │
│ • Manual count verification          │
│ • Possible data recovery needed      │
└──────────────────────────────────────┘
```

---

## Data Flow Diagram

```
APPLICATION LAYER
│
├─ GRN Edit
│  └─> SimpleGRNEditManager
│      ├─> Collect changes
│      ├─> Update documents
│      └─> Call UniversalStockRecalculationService.recalculateBatch()
│          └─> Update running balances
│              └─> Create ActivityLog audit entry
│
├─ Stock Reconciliation
│  └─> StockReconciliationService
│      ├─> Get all products
│      ├─> For each product:
│      │   ├─> Get all movements (sorted)
│      │   ├─> Recalculate balance from scratch
│      │   ├─> Compare with CurrentStock
│      │   ├─> Identify discrepancies
│      │   └─> Optional: Call recalculateFullProduct() for healing
│      └─> Generate report
│
└─ Manual Healing
   └─> UniversalStockRecalculationService.recalculateFullProduct()
       ├─> Recalculate all movements
       ├─> Update balances
       ├─> Update CurrentStock
       └─> Create ActivityLog entry

DATABASE LAYER
│
├─ StockMovement
│  ├─ productId
│  ├─ quantity (INBOUND, OUTBOUND, ADJUSTMENT)
│  ├─ newStock (running balance)
│  ├─ documentDate
│  ├─ movementType
│  └─ createdAt
│
├─ CurrentStock
│  ├─ productId
│  ├─ totalQuantity (✅ compared in reconciliation)
│  ├─ availableQuantity (informational)
│  ├─ grnReceivedQuantity (informational)
│  └─ updatedAt
│
└─ ActivityLog (audit trail)
   ├─ userId
   ├─ action (UPDATE)
   ├─ module (accounting)
   ├─ changes (object)
   └─ timestamp
```

---

## Report Structure

```
┌─────────────────────────────────────────────────────────────┐
│                   RECONCILIATION REPORT                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ SUMMARY                                              │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Total Products:      1,247                            │   │
│  │ Reconciled:          1,247                            │   │
│  │ Discrepancies:       23 (1.84%)                       │   │
│  │ Healed:              0 (0%)                           │   │
│  │ Errors:              0                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FINANCIAL IMPACT                                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Total Current Stock:      50,000 units              │   │
│  │ Total Calculated:         51,250 units              │   │
│  │ Total Variance:           -1,250 units (-2.39%)     │   │
│  │                                                       │   │
│  │ 💰 Business Impact: $12,500 (assuming $10/unit)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ DISCREPANCIES (23 products)                          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 1. Product-A001  │ 500 → 550 │ -50 (-9.09%)         │   │
│  │ 2. Product-B002  │ 750 → 700 │ +50 (+7.14%)         │   │
│  │ 3. Product-C003  │ 100 → 120 │ -20 (-20%)           │   │
│  │  ... (20 more)                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ OK PRODUCTS: 1,224                                  │   │
│  │ ERROR PRODUCTS: 0                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

```
BEFORE RECONCILIATION
├─ GRN Entry (posts stock)
│  └─> Creates StockMovement entries
│      └─> Updates CurrentStock.totalQuantity
│
├─ GRN Edit (changes quantity)
│  └─> Updates StockMovement
│      └─> Calls UniversalStockRecalculationService
│          └─> Recalculates all downstream balances
│
└─ Sales (planned integration)
   └─> Future: Calls recalculation for consistency

RECONCILIATION PROCESS
├─ Gets all movements (sorted by date)
├─ Recalculates from scratch
├─ Compares with CurrentStock
└─ Reports discrepancies

AFTER RECONCILIATION
├─ Report shows issues
├─ Optional: Auto-heal discrepancies
│  └─> Calls recalculateFullProduct()
│
└─ Future: Monitor for new issues
   └─> Run weekly/monthly
```

---

## Key Metrics

```
✅ PASS CRITERIA
├─ calculated balance = currentStock.totalQuantity
├─ variance = 0
├─ No errors during reconciliation
└─ All movements accounted for

⚠️ WARNING CRITERIA
├─ variance > 10 units
├─ variance % > 5%
├─ Trend of increasing discrepancies
└─ Repeated same product errors

❌ CRITICAL CRITERIA
├─ calculated = 0 but current > 0 (history lost)
├─ Missing entire movement sequence
├─ Negative balance in calculations
└─ Multiple products affected systematically
```

---

**Visual Guide Created:** 2026-03-22  
**Shows:** Reconciliation flow, algorithm detail, scenarios, integration
