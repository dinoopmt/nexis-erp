# GRN Edit Collections Update - Quick Reference

## All 4 Collections Updated During Edit

```
EXAMPLE: Edit Product A qty from 50 → 60 units

┌─────────────────────────────────────────────────────────────────┐
│                      GRN EDIT EVENT                             │
└─────────────────────────────────────────────────────────────────┘

    ↓↓↓ THIS TRIGGERS 4 COLLECTION UPDATES ↓↓↓

┌──────────────────────────────────────────────────────────────────┐
│ 1️⃣  GRN COLLECTION                                              │
├──────────────────────────────────────────────────────────────────┤
│ BEFORE:  items: [{ productId: A, quantity: 50 }]               │
│          totalAmount: 5000                                       │
│                                                                  │
│ AFTER:   items: [{ productId: A, quantity: 60 }]  ← Updated   │
│          totalAmount: 6000  ← Recalculated                     │
│          updatedAt: new Date()                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 2️⃣  CURRENT STOCK COLLECTION                                    │
├──────────────────────────────────────────────────────────────────┤
│ BEFORE:  { productId: A, quantityInStock: 115 }                │
│          (Original 100 + GRN qty 50 = 150)                      │
│                                                                  │
│ qtyDifference = 60 - 50 = +10                                   │
│                                                                  │
│ AFTER:   { productId: A, quantityInStock: 125 }  ← +10        │
│          (115 + 10 = 125)                                       │
│                                                                  │
│ ✅ ADJUSTED by difference (+10)                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 3️⃣  INVENTORY BATCH COLLECTION                                  │
├──────────────────────────────────────────────────────────────────┤
│ BEFORE:  { grnId: GRN-001, batchNumber: BATCH-001             │
│           productId: A, quantity: 50, baseUnits: 50 }          │
│                                                                  │
│ AFTER:   { grnId: GRN-001, batchNumber: BATCH-001             │
│           productId: A, quantity: 60, baseUnits: 60 }          │
│                                                ↑                 │
│ ✅ SET DIRECTLY to new value (60, not 50+10)                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 4️⃣  VENDOR PAYMENT COLLECTION                                   │
├──────────────────────────────────────────────────────────────────┤
│ BEFORE:  { grnId: GRN-001, initialAmount: 5000                 │
│           balance: 5000, paymentStatus: PENDING }              │
│                                                                  │
│ New Total = 6000                                                │
│                                                                  │
│ AFTER:   { grnId: GRN-001, initialAmount: 6000  ← Updated    │
│           balance: 6000  ← Reset                              │
│           amountPaid: 0  ← Reset                              │
│           paymentStatus: PENDING }  ← Unchanged               │
│                                                                  │
│ ✅ UPDATED amount + RESET balance (only if PENDING)            │
│    ❌ BLOCKED if payment = PAID/PARTIAL/OVERDUE                │
└──────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════

SUMMARY TABLE:

┌────────────────────┬──────────┬───────────────────┬────────────────┐
│ Collection         │ Op Type  │ Fields Changed    │ Condition      │
├────────────────────┼──────────┼───────────────────┼────────────────┤
│ GRN                │ SET      │ items, totals     │ Always         │
│ CurrentStock       │ INC      │ quantityInStock   │ Always         │
│ InventoryBatch     │ SET      │ quantity/baseUnits│ If batch exists│
│ VendorPayment      │ SET      │ amount, balance   │ If PENDING     │
└────────────────────┴──────────┴───────────────────┴────────────────┘

═══════════════════════════════════════════════════════════════════

SCENARIO: Multiple Items in One Edit

Item A: 50 → 60 (+10)
Item B: 30 → 25 (-5)  
Item C: 20 → 20 (0)

┌─ CurrentStock
│  Item A: +10
│  Item B: -5
│  Item C: 0
│  Total adjustment: +5
│
├─ InventoryBatch
│  Batch A: 50 → 60
│  Batch B: 30 → 25
│  Batch C: 20 → 20
│
├─ GRN
│  Total: sum of new values
│
└─ VendorPayment
   Amount: sum of new values
   
═══════════════════════════════════════════════════════════════════

QTY CHANGE SCENARIOS:

┌─ INCREASE (50 → 60)
│  Difference: +10
│  CurrentStock: += 10
│  InventoryBatch: = 60
│  Payment: = new total
│  ✅ Allowed if PENDING
│
├─ DECREASE (50 → 40)
│  Difference: -10
│  CurrentStock: += -10 (i.e., -= 10)
│  InventoryBatch: = 40
│  Payment: = new total
│  ✅ Allowed if PENDING
│
└─ NO CHANGE (50 → 50)
   Difference: 0
   CurrentStock: += 0 (no change)
   InventoryBatch: = 50 (unchanged)
   Payment: = same total
   ✓ No updates needed
   
═══════════════════════════════════════════════════════════════════
```

## Code Implementation

**File:** `SimpleGRNEditManager.js` (Lines 150-240)

**Key Logic:**
```javascript
// Calculate adjustment
const qtyDifference = newItem.quantity - oldItem.quantity;

// Update CurrentStock (ADJUSTED)
$inc: { quantityInStock: qtyDifference }

// Update InventoryBatch (DIRECT SET)
$set: { 
  baseUnits: newItem.quantity,
  quantity: newItem.quantity
}

// Update GRN (DIRECT SET)
$set: { items: [...], totalAmount, finalTotal }

// Update VendorPayment (DIRECT SET - if PENDING only)
$set: { initialAmount: newTotal, balance: newTotal, amountPaid: 0 }
```

## Response

```json
{
  "success": true,
  "message": "GRN edited successfully - all related collections updated",
  "collectionsUpdated": {
    "grn": true,
    "currentStock": true,
    "inventoryBatch": true,
    "vendorPayment": true  // false if payment not PENDING
  },
  "summary": {
    "items": 3,
    "totalAmount": 6000,
    "paymentStatus": "PENDING"
  }
}
```

## Testing

Run the comprehensive test:
```bash
node tests/test-all-collections-updated.js
```

This test:
1. ✅ Reads all 4 collections BEFORE edit
2. ✅ Executes edit
3. ✅ Reads all 4 collections AFTER edit
4. ✅ Verifies all changes are correct
