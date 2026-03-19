# Costing Methods Visual Guide - With Expiry Tracking

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
│  POST /api/v1/costing/calculate or /compare                 │
│  { productId, quantityNeeded, method }                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              costingController.js                            │
│  1. Fetch Product from AddProduct model                     │
│  2. Check: product.batchTrackingEnabled?                    │
│  3. Route to correct batch source                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   IF TRUE                        IF FALSE
 (Batch Tracked)              (Regular Product)
        │                             │
        ▼                             ▼
  StockBatch Model           InventoryBatch Model
  ┌──────────────┐            ┌──────────────┐
  │ expiryDate   │            │ purchaseDate │
  │ costPerUnit  │            │ purchasePrice│
  │ mfgDate      │            │ quantity     │
  │ daysToExpiry │            │              │
  └──────────────┘            └──────────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │     CostingService.js             │
        │  calculateFIFO(batches, qty, ✓)  │
        │  calculateLIFO(batches, qty, ✓)  │
        │  calculateWAC(batches, qty, ✓)   │
        │                                  │
        │  ✓ = batchTrackingEnabled flag   │
        └──────────────┬───────────────────┘
                       │
    ┌──────┬──────────┴──────────┬──────┐
    │      │                     │      │
    ▼      ▼                     ▼      ▼
  FIFO    LIFO                 WAC   Response
   Cost   Cost              Average  (formatted)
```

---

## FIFO Flow: WITH EXPIRY TRACKING ⭐

```
INPUT:
┌─────────────────────────────────────┐
│ Batches:                            │
│ ├─ BATCH-001: Expires 2026-01-31  │
│ ├─ BATCH-002: Expires 2026-02-15  │
│ ├─ BATCH-003: Expires TODAY ❌     │
│ └─ BATCH-004: Expires 2026-03-20  │
│ Needed: 500 units                  │
└─────────────────────────────────────┘
            │
            ▼
   STEP 1: Filter Expired
   ┌──────────────────────┐
   │ Check expiryDate:    │
   │ if (date < NOW)      │
   │ → EXCLUDE ❌         │
   └──────────────────────┘
   Remaining:
   ├─ BATCH-001 ✓ (Jan 31)
   ├─ BATCH-002 ✓ (Feb 15)
   └─ BATCH-004 ✓ (Mar 20)
            │
            ▼
   STEP 2: Sort by expiryDate (Ascending)
   ┌──────────────────────┐
   │ Oldest expiry first: │
   │ 1. BATCH-001 (Jan 31)│
   │ 2. BATCH-002 (Feb 15)│
   │ 3. BATCH-004 (Mar 20)│
   └──────────────────────┘
            │
            ▼
   STEP 3: Issue Units from Oldest-Expiring
   ┌──────────────────────────┐
   │ BATCH-001: 100 units @ $2 │
   │ = $200                     │
   │                            │
   │ BATCH-002: 200 units @ $2  │
   │ = $400                     │
   │                            │
   │ BATCH-004: 200 units @ $2  │
   │ = $400                     │
   │ ─────────────────────────  │
   │ Total: 500 units = $1,000  │
   │ Avg: $2.00 per unit        │
   └──────────────────────────┘
            │
            ▼
        OUTPUT
   ┌─────────────────────────┐
   │ quantityIssued: 500     │
   │ totalCost: $1,000       │
   │ averageCost: $2.00      │
   │ sort_method: expiryDate │
   │ batches_excluded: 1     │
   └─────────────────────────┘
```

### Natural FIFO Advantage
For perishable products (milk, food, pharma):
```
✅ BATCH-003 (expired today) is EXCLUDED
✅ BATCH-001 (expires soonest) is USED FIRST
✅ Reduces waste automatically
✅ Complies with food safety regulations
```

---

## FIFO Flow: WITHOUT EXPIRY TRACKING

```
INPUT:
┌─────────────────────────────────────┐
│ InventoryBatch:                     │
│ ├─ BATCH-A: Purchased 2024-01-01   │
│ ├─ BATCH-B: Purchased 2024-02-01   │
│ ├─ BATCH-C: Purchased 2024-03-01   │
│ └─ BATCH-D: Purchased 2024-04-01   │
│ Needed: 300 units                   │
└─────────────────────────────────────┘
            │
            ▼
   STEP: Sort by purchaseDate (Ascending)
   ┌──────────────────────┐
   │ Oldest purchase first:│
   │ 1. BATCH-A (Jan 01)  │
   │ 2. BATCH-B (Feb 01)  │
   │ 3. BATCH-C (Mar 01)  │
   │ 4. BATCH-D (Apr 01)  │
   └──────────────────────┘
            │
            ▼
   STEP: Issue Units from Oldest-Purchased
   ┌──────────────────────────┐
   │ BATCH-A: 100 @ $10 = $1,000│
   │ BATCH-B: 100 @ $12 = $1,200│
   │ BATCH-C: 100 @ $15 = $1,500│
   │ ──────────────────────     │
   │ Total: 300 = $3,700        │
   │ Avg: $12.33 per unit       │
   └──────────────────────────┘
            │
            ▼
        OUTPUT
   ┌──────────────────────────┐
   │ quantityIssued: 300      │
   │ totalCost: $3,700        │
   │ averageCost: $12.33      │
   │ sort_method: purchaseDate│
   │ batches_excluded: 0      │
   └──────────────────────────┘
```

---

## LIFO Flow: WITH EXPIRY TRACKING

```
INPUT:
┌────────────────────────────────────┐
│ StockBatch (with expiry):          │
│ ├─ BATCH-A: Purchased 2024-01-01  │
│ ├─ BATCH-B: Purchased 2024-02-01  │
│ ├─ BATCH-C: Purchased 2024-03-01  │
│ ├─ BATCH-D: Purchased 2024-04-01  │
│ ├─ BATCH-X: EXPIRED ❌             │
│ Needed: 250 units                  │
└────────────────────────────────────┘
            │
            ▼
   STEP 1: Filter Expired
   ┌──────────────────────┐
   │ BATCH-X: expiryDate   │
   │ < NOW?                │
   │ YES → EXCLUDE ❌      │
   └──────────────────────┘
   Remaining: A, B, C, D
            │
            ▼
   STEP 2: Sort by purchaseDate (DESCENDING)
   ┌──────────────────────┐
   │ Newest purchase first:│
   │ 1. BATCH-D (Apr 01)  │
   │ 2. BATCH-C (Mar 01)  │
   │ 3. BATCH-B (Feb 01)  │
   │ 4. BATCH-A (Jan 01)  │
   └──────────────────────┘
            │
            ▼
   STEP 3: Issue Units from Newest-Purchased
   ┌──────────────────────────┐
   │ BATCH-D: 100 @ $20 = $2,000│
   │ BATCH-C: 100 @ $18 = $1,800│
   │ BATCH-B: 50 @ $15 = $750  │
   │ ──────────────────────    │
   │ Total: 250 = $4,550       │
   │ Avg: $18.20 per unit      │
   └──────────────────────────┘
            │
            ▼
        OUTPUT
   ┌──────────────────────────┐
   │ quantityIssued: 250      │
   │ totalCost: $4,550        │
   │ averageCost: $18.20      │
   │ sort_method: purchaseDate│
   │ batches_excluded: 1      │
   └──────────────────────────┘
```

### Key Difference for LIFO
```
✅ Expired batch EXCLUDED
✅ Still uses newest purchase date (LIFO cost logic)
✅ Safe for cost calculations
⚠️  Not ideal for perishables (contradicts physical flow)
```

---

## WAC Flow: WITH EXPIRY TRACKING

```
INPUT:
┌────────────────────────────────────┐
│ Available StockBatches:            │
│ ├─ BATCH-A: 100 units @ $10       │
│ ├─ BATCH-B: 150 units @ $12       │
│ ├─ BATCH-C: 200 units @ $8        │
│ ├─ BATCH-X: EXPIRED ❌             │
│ │           100 units @ $7 (NOT    │
│ │           used in calculation)   │
│ Needed: 250 units                  │
└────────────────────────────────────┘
            │
            ▼
   STEP 1: Filter Expired
   ┌──────────────────────┐
   │ BATCH-X: expiryDate   │
   │ < NOW?                │
   │ YES → EXCLUDE ❌      │
   │ (not in calculation)  │
   └──────────────────────┘
   Valid batches: A, B, C
   Available qty: 450 units
            │
            ▼
   STEP 2: Calculate WAC from Valid Batches ONLY
   ┌────────────────────────────────┐
   │ Total Cost:                     │
   │ A: 100 × $10 = $1,000          │
   │ B: 150 × $12 = $1,800          │
   │ C: 200 × $8 = $1,600           │
   │ ─────────────────────          │
   │ Total = $4,400                 │
   │                                │
   │ Total Qty: 100 + 150 + 200     │
   │           = 450 units          │
   │                                │
   │ WAC = $4,400 / 450             │
   │     = $9.78 per unit ✅        │
   └────────────────────────────────┘
            │
            ▼
   STEP 3: Cost for Needed Quantity
   ┌────────────────────────────────┐
   │ Needed: 250 units              │
   │ Cost: 250 × $9.78 = $2,444.44  │
   │                                │
   │ Average Cost: $9.78            │
   │ (only from non-expired batches)│
   └────────────────────────────────┘
            │
            ▼
        OUTPUT
   ┌────────────────────────────────┐
   │ quantityIssued: 250            │
   │ totalCost: $2,444.44           │
   │ averageCost: $9.78             │
   │ method: WAC                    │
   │ batches_excluded: 1            │
   │ totalQuantityAvailable: 450    │
   └────────────────────────────────┘
```

### WAC with Expiry Impact
```
WITHOUT expiry filtering:
Available: 550 units (including expired)
WAC = $5,100 / 550 = $9.27 per unit ❌ (too low - includes old stock)

WITH expiry filtering:
Available: 450 units (excluding expired)
WAC = $4,400 / 450 = $9.78 per unit ✅ (accurate - only fresh stock)

Impact: $9.78 vs $9.27 = 5.5% difference!
```

---

## Comparison: All Three Methods

### Scenario: 300 Units Needed from Same Batches

```
Available Stock:
├─ BATCH-2024-01: 150 units @ $10 (expires 2026-01-31)
├─ BATCH-2024-02: 100 units @ $12 (expires 2026-02-28)
├─ BATCH-2024-03: 150 units @ $15 (expires 2026-03-31)
└─ BATCH-2023-12: 100 units @ $8 (EXPIRED) ❌

FIFO (with expiry tracking):
├─ Use BATCH-2024-01: 150 @ $10 = $1,500 (expires soonest)
├─ Use BATCH-2024-02: 100 @ $12 = $1,200
├─ Use BATCH-2024-03: 50 @ $15 = $750
└─ Total: $3,450 | Avg: $11.50/unit | Batches excluded: 1

LIFO (with expiry tracking):
├─ Use BATCH-2024-03: 150 @ $15 = $2,250 (newest purchase)
├─ Use BATCH-2024-02: 100 @ $12 = $1,200
├─ Use BATCH-2024-01: 50 @ $10 = $500
└─ Total: $3,950 | Avg: $13.17/unit | Batches excluded: 1

WAC (with expiry tracking):
├─ Valid batches: 3 (exclude expired)
├─ Total cost: (150×$10) + (100×$12) + (150×$15) = $4,400
├─ Total qty: 400 units
├─ WAC: $4,400 / 400 = $11.00/unit
├─ Cost for 300 units: 300 × $11.00 = $3,300
└─ Total: $3,300 | Avg: $11.00/unit | Batches excluded: 1

COST COMPARISON:
FIFO: $3,450 (LOWEST - uses oldest expiry)
WAC:  $3,300 (MIDDLE)
LIFO: $3,950 (HIGHEST - uses newest purchase)
Difference: $650 (18.8%)
```

---

## Decision Tree

```
                    START
                      │
                      ▼
         Product with batchTrackingEnabled?
              /                      \
            YES                       NO
            /                          \
           ▼                            ▼
    StockBatch Model            InventoryBatch Model
    (expiry dates)              (purchase dates)
           │                            │
           ▼                            ▼
    Need FIFO?                   Need FIFO?
    /  YES  \                    /  YES  \
   ▼         NO                 ▼        NO
┌──────────────────┐        ┌──────────────┐
│ Sort by          │        │ Sort by      │
│ expiryDate ⭐    │        │ purchaseDate │
│ (oldest first)   │        │ (oldest first)
│                  │        │              │
│ Natural FIFO for │        │ Traditional  │
│ perishables!     │        │ FIFO         │
└──────────────────┘        └──────────────┘
   ▼                           ▼
Need LIFO?                Need LIFO?
/  YES  \              /  YES  \
▼        NO            ▼        NO
┌──────────────────┐  ┌──────────────┐
│ Filter expired   │  │ Sort by      │
│ + Sort by purc.  │  │ purchaseDate │
│ date (newest)    │  │ (newest)     │
│                  │  │              │
│ Avoids waste but │  │ For cost     │
│ not ideal for    │  │ accounting   │
│ perishables      │  │              │
└──────────────────┘  └──────────────┘
   ▼                     ▼
Need WAC?             Need WAC?
/  YES  \            /  YES  \
▼        NO          ▼        NO
┌──────────────────┐ ┌──────────────┐
│ Exclude expired, │ │ Average all  │
│ Average remaining│ │ available    │
│                  │ │ units        │
│ Realistic        │ │              │
│ average cost!    │ │ Standard     │
│                  │ │ costing      │
└──────────────────┘ └──────────────┘
```

---

## Real World Sequence

```
Day 1: Product Created
┌──────────────────────────┐
│ Milk 1L                  │
│ Track Expiry: YES ✓      │
│ Batch Tracking: YES ✓    │
│ → batchTrackingEnabled   │
└──────────────────────────┘

Day 1: Batch A Created
┌──────────────────────────────────────┐
│ Batch A: 1000L                       │
│ Mfg Date: 2024-01-01                 │
│ Expiry Date: 2026-01-15              │
│ Cost/Unit: $2.00                     │
│ Status: ACTIVE ✓                     │
└──────────────────────────────────────┘

Day 15: Batch B Created (newer but expires first!)
┌──────────────────────────────────────┐
│ Batch B: 1500L                       │
│ Mfg Date: 2024-01-15                 │
│ Expiry Date: 2026-01-08 ⚠️ Soon!    │
│ Cost/Unit: $2.10                     │
│ Status: ACTIVE ✓                     │
└──────────────────────────────────────┘

Day 30: Need 1200L - Using FIFO
┌────────────────────────────────────────────┐
│ Request: Sell 1200L                        │
│ Method: FIFO                               │
│                                            │
│ FIFO Processing:                           │
│ 1. Check expiryDate: Batch B expires first │
│ 2. Use Batch B: 1200L (expires 2026-01-08)│
│ 3. Cost: 1200 × $2.10 = $2,520.00         │
│                                            │
│ ✅ Automatically preventing waste!         │
│ ✅ Batch B taken first (expires soonest)  │
│ ✅ Older Batch A not used yet              │
└────────────────────────────────────────────┘

Day 40: Batch B Expires
┌──────────────────────────────────────┐
│ Batch B Status: EXPIRED❌             │
│ → Excluded from all costing           │
│                                       │
│ Next FIFO for 500L:                   │
│ 1. Batch B: EXPIRED → SKIP ❌        │
│ 2. Batch A: Use 500L (next in line)  │
│ 3. Cost: 500 × $2.00 = $1,000.00     │
└──────────────────────────────────────┘
```

---

## System Impact Matrix

```
┌────────────────────┬──────────────────┬──────────────────┐
│     Feature        │  With Batch      │  Without Batch   │
│                    │  Tracking        │  Tracking        │
├────────────────────┼──────────────────┼──────────────────┤
│ FIFO Sort Key      │ expiryDate ⭐    │ purchaseDate     │
│                    │ (oldest expiry)  │ (oldest purchase)│
├────────────────────┼──────────────────┼──────────────────┤
│ LIFO Behavior      │ Skip expired +   │ Normal LIFO      │
│                    │ sort by purchase │ descending sort  │
├────────────────────┼──────────────────┼──────────────────┤
│ WAC Calculation    │ Exclude expired  │ Include all      │
│                    │ from average     │ active batches   │
├────────────────────┼──────────────────┼──────────────────┤
│ Expired Handling   │ Auto-excluded ✅ │ Ignored          │
├────────────────────┼──────────────────┼──────────────────┤
│ Batch Model        │ StockBatch       │ InventoryBatch   │
├────────────────────┼──────────────────┼──────────────────┤
│ Result Detail      │ Includes expiry  │ No expiry info   │
│                    │ data ✓           │                  │
├────────────────────┼──────────────────┼──────────────────┤
│ Use Case           │ Perishables,     │ Raw materials,   │
│                    │ Food, Pharma     │ Commodities      │
└────────────────────┴──────────────────┴──────────────────┘
```

---

## Status: ✅ FULLY IMPLEMENTED

All three costing methods now seamlessly support batch-wise expiry tracking with automatic detection and intelligent processing.
