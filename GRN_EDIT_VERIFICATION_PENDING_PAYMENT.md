# GRN Edit Database Verification - PENDING Payment Scenario

**Date**: March 22, 2026  
**GRN**: GRN-2025-2026-00027  
**Scenario**: GRN Posted with PENDING Payment → Edit Verification

---

## 📊 CURRENT DATABASE STATE

### 1. GRN Document
```
grnNumber: "GRN-2025-2026-00027"
status: "Received" (Posted ✅)
totalQty: 10 units ordered
totalAmount: 115.5
items: [
  {
    productId: 69beef0d228dfd0cc59b9fcc (iPhone 6S Plus)
    quantity: 10 ← ORDERED
    unitCost: 11
    totalCost: 115.5
  }
]
```

### 2. CurrentStock Document
```
productId: 69beef0d228dfd0cc59b9fcc
totalQuantity: 5 ← ⚠️ ONLY 5 (NOT 10!)
availableQuantity: 5
grnReceivedQuantity: 5 ← RECEIVED
lastActivity: GRN-2025-2026-00027 (PENDING)
```

### 3. StockMovement Document
```
reference: "GRN-2025-2026-00027"
quantity: 5 ← ONLY 5 (NOT 10!)
movementType: "INBOUND"
costingMethod: "FIFO"
```

### 4. VendorPayment Document
```
grnId: "GRN-2025-2026-00027"
paymentStatus: "PENDING" ← ✅ NOT BLOCKING EDIT (NEW LOGIC)
initialAmount: 52.5
amountPaid: 0
balance: 52.5
```

---

## ⚠️ DISCREPANCY FOUND

| Field | GRN Says | Stock Says | Issue |
|-------|----------|-----------|-------|
| Ordered Qty | 10 | — | The order |
| Received Qty | — | 5 | Only half received! |
| Posted Qty | — | 5 | Only half posted! |

**Possible Causes:**
1. ❌ Partial GRN posting (only 5 of 10 posted)
2. ❌ Stock adjustment afterwards (5 units consumed/removed)
3. ❌ RTV return for 5 units (not shown in data)
4. ⚠️ Data mismatch between GRN and stock

---

## 🔄 WHAT HAPPENS WHEN EDITING THIS GRN

### PRE-EDIT VALIDATION (GRNTransactionValidator)

**Step 1: Check Payment Status**
```javascript
VendorPayment.find({ grnId: "GRN-2025-2026-00027" })
Result:
  ✅ PASSED: paymentStatus = "PENDING"
  Reason: "Payment not confirmed yet"
  blocksEdit: false
  
  Cannot Edit If:
  ❌ PARTIAL (would block)
  ❌ PAID (would block)
  ❌ OVERDUE (would block)
```

**Step 2: Check Stock Consumption**
```javascript
StockBatch.find({ grnId: "GRN-2025-2026-00027" })
  usedQuantity: 0 ← No sales made
  ✅ PASSED: Can edit
```

**Step 3: Check RTV Returns**
```javascript
Grn.findById(grnId).rtvReturnedQuantity: 0
  ✅ PASSED: No returns
```

**EDIT ALLOWED**: ✅ YES (All checks pass)

---

## 📝 EDIT SCENARIO: Change Qty from 10 to 15

### User Action
```javascript
PATCH /api/grn/69bf8b218cd42c35a3dd4a25/edit-posted
{
  "itemUpdates": [
    {
      "productId": "69beef0d228dfd0cc59b9fcc",
      "quantity": 15,  // Changed from 10 to 15
      "unitCost": 11
    }
  ],
  "reason": "Correction: Received 15 units not 10"
}
```

### DATABASE OPERATIONS - PHASE 1: REVERSE

**Current Stock Before Edit:**
```
totalQuantity: 5
grnReceivedQuantity: 5
```

**Reversal Operations:**
```javascript
// For each original item (qty=10, but only 5 in system):
CurrentStock.$inc({
  totalQuantity: -5,        // Reverse posted qty
  availableQuantity: -5,
  grnReceivedQuantity: -5
})

Result after Phase 1:
  totalQuantity: 0 ← Back to baseline
  availableQuantity: 0
  grnReceivedQuantity: 0

// Mark existing batches as REVERSED
InventoryBatch.$set({
  status: "REVERSED",
  reversedAt: now()
})

// Record reversal in audit
StockMovement.create({
  reference: "GRN-2025-2026-00027 - REVERSAL",
  quantity: -5,
  movementType: "OUTBOUND"
})
```

---

### DATABASE OPERATIONS - PHASE 2: APPLY NEW CHANGES

**New Values Being Applied:**
```
productId: 69beef0d228dfd0cc59b9fcc
newQuantity: 15 ← Changed
unitCost: 11
```

**Application Operations:**
```javascript
// Update AddProduct with new cost calculation
AddProduct.update(
  { _id: productId },
  {
    quantityInStock: 15,     // NEW: 15 units
    costingMethod: "FIFO",
    cost: 11,
    lastStockUpdate: now(),
    lastStockUpdateBy: userId
  }
)

// Update real-time stock tracking
CurrentStock.$inc({
  totalQuantity: +15,        // Apply new qty
  availableQuantity: +15,
  grnReceivedQuantity: +15   // NEW: Will be 15
})

Result after Phase 2:
  totalQuantity: 15 ← NEW
  availableQuantity: 15
  grnReceivedQuantity: 15
  
// Create new batch for 15 units
InventoryBatch.create({
  productId: 69beef0d228dfd0cc59b9fcc,
  quantity: 15,
  costPerUnit: 11,
  status: "ACTIVE"
})

// Record new inbound movement
StockMovement.create({
  reference: "GRN-2025-2026-00027",
  quantity: +15,
  movementType: "INBOUND",
  costingMethodUsed: "FIFO"
})

// Update GRN with new data
Grn.update(
  { _id: "69bf8b218cd42c35a3dd4a25" },
  {
    items: [
      {
        ...original,
        quantity: 15 ← UPDATED
      }
    ],
    totalQty: 15,
    totalCost: 165, // 15 * 11
    updatedBy: userId,
    editHistory: {
      $push: {
        timestamp: now(),
        editedBy: userId,
        changes: {
          reversal: { qty: 5, items: 1 },
          application: { qty: 15, items: 1 }
        }
      }
    }
  }
)

// Audit log
ActivityLog.create({
  action: "UPDATE",
  module: "Inventory",
  resource: "Stock - GRN Edit",
  changes: {
    grnNumber: "GRN-2025-2026-00027",
    productId: "69beef0d228dfd0cc59b9fcc",
    quantityBefore: 5,
    quantityAfter: 15,
    costBefore: 55,
    costAfter: 165,
    reason: "Correction: Received 15 units not 10",
    phase1: { reversed: 5 },
    phase2: { applied: 15 }
  },
  status: "success",
  timestamp: now()
})
```

---

## ✅ DATABASE STATE AFTER EDIT

### GRN Document
```
grnNumber: "GRN-2025-2026-00027"
status: "Received"
totalQty: 15 ← UPDATED
items: [
  {
    productId: 69beef0d228dfd0cc59b9fcc
    quantity: 15 ← UPDATED
    unitCost: 11
    totalCost: 165 ← RECALCULATED
  }
]
editHistory: [
  {
    timestamp: 2026-03-22T06:30:00Z
    editedBy: 69beee6a4083203fc968ae78
    changes: { reversal: 5, application: 15 }
  }
]
```

### CurrentStock Document
```
productId: 69beef0d228dfd0cc59b9fcc
totalQuantity: 15 ← UPDATED from 5
availableQuantity: 15 ← UPDATED from 5
grnReceivedQuantity: 15 ← UPDATED from 5
lastActivity: {
  timestamp: 2026-03-22T06:30:00Z
  type: "GRN_EDIT"
  reference: "GRN-2025-2026-00027"
}
```

### StockMovement Collection (2 new records)
```
Record 1 (Reversal):
  reference: "GRN-2025-2026-00027 - REVERSAL"
  quantity: -5
  movementType: "OUTBOUND"
  timestamp: 2026-03-22T06:30:00Z

Record 2 (Reapplication):
  reference: "GRN-2025-2026-00027"
  quantity: +15
  movementType: "INBOUND"
  timestamp: 2026-03-22T06:30:01Z
```

### VendorPayment Document
```
grnId: "GRN-2025-2026-00027"
paymentStatus: "PENDING" ← UNCHANGED
initialAmount: 52.5 ← NOT UPDATED (only GRN amount changed)
  
⚠️ NOTE: GRN total changed to 165, but payment still shows 52.5
  This is a mismatch that should trigger warning:
  "GRN amount updated but payment record unchanged"
```

---

## 🔔 IMPORTANT NOTES

### What DOESN'T Change During Edit
- ❌ Payment record (stays PENDING)
- ❌ Payment amount (stays 52.5, but GRN now 165)
- ❌ Journal entries (not reversed, stays old amount)

### What CHANGES During Edit
- ✅ GRN items and totals
- ✅ CurrentStock quantities
- ✅ CreateNewBatches/InventoryBatches
- ✅ StockMovement records (reversal + reapply)
- ✅ ActivityLog audit trail

### Business Impact
```
Before Edit:
  GRN: 10 units @ 11 = 115.5
  Stock Posted: 5 units
  Payment: PENDING 52.5
  
After Edit:
  GRN: 15 units @ 11 = 165 ← Changed
  Stock Posted: 15 units ← Changed
  Payment: PENDING 52.5 ← MISMATCH!
```

---

## ⚠️ RECOMMENDATIONS

### 1. Update Payment When GRN Changes
```javascript
If edit changes GRN total significantly:
  1. Calculate new payment amount proportionally
  2. Update VendorPayment.initialAmount
  3. Update VendorPayment.balance
  4. Log change reason
```

### 2. Handle Journal Entries
```javascript
If edit changes GRN amounts:
  1. Reverse original journal entry
  2. Create new journal entries with updated amounts
  3. Mark PENDING journal as needs-repost
```

### 3. Payment Confirmation Required
```javascript
Warning shown to user:
  "⚠️ GRN amount changed from 115.5 to 165.
   Payment record still shows 52.5.
   
   Action needed:
   ☐ Update vendor payment amount
   ☐ Notify vendor of change
   ☐ Wait for payment confirmation"
```

---

## 🧪 VALIDATION CHECKLIST

### Before Edit (Validation)
- ✅ Payment status is PENDING or NO_PAYMENT
- ✅ No stock consumed by sales
- ✅ No returns made
- ✅ GRN status is "Received"

### After Edit (Verification)
- ✅ GRN.items updated with new qty
- ✅ GRN.totalQty matches sum of items
- ✅ CurrentStock.totalQuantity = new qty
- ✅ StockMovement has reversal + reapply records
- ✅ ActivityLog captures complete edit history
- ✅ InventoryBatch status updated to REVERSED
- ⚠️ VendorPayment amount matches GRN total (needs manual update?)

---

**Status**: Ready for Implementation  
**Next**: Add validation warning for payment amount mismatch
