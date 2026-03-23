# GRN Edit - Automatic Related Collections Update (PENDING Payment)

**Date**: March 22, 2026  
**Status**: ✅ IMPLEMENTED  
**Feature**: Auto-update all related records when GRN is edited with PENDING payment

---

## 🎯 Problem Solved

**Before**: When editing a posted GRN with PENDING payment:
```
❌ GRN updated (qty: 10 → 15, amount: 115.5 → 165)
❌ Stock updated (qty: 5 → 15 ✅)
❌ Payment stayed old amount (52.5) ← MISMATCH!
```

**After**: Automatic cascade updates to all related collections:
```
✅ GRN updated (qty: 10 → 15, amount: 115.5 → 165)
✅ Stock updated (qty: 5 → 15)
✅ Payment updated (52.5 → 165) ← MATCHED!
✅ Product records updated
✅ Audit trails complete
```

---

## 📋 Implementation Details

### New Method: `updateRelatedCollections()`

**Location**: GRNEditManager.js (lines ~820+)

**Purpose**: Called automatically after GRN edit completes

**Collections Updated**:

| Collection | Field | Condition | Action |
|-----------|-------|-----------|--------|
| **VendorPayment** | initialAmount | paymentStatus = PENDING | ✅ UPDATE |
| **VendorPayment** | initialAmount | paymentStatus = PARTIAL | ❌ NO UPDATE |
| **VendorPayment** | initialAmount | paymentStatus = PAID | ❌ NO UPDATE |
| **VendorPayment** | balance | ALL PENDING | ✅ Recalculated |
| **VendorPayment** | paymentHistory | ALL PENDING | ✅ Logged |
| **AddProduct** | lastGrnDate | Every item | ✅ UPDATE |
| **AddProduct** | lastUpdatedBy | Every item | ✅ UPDATE |
| **JournalEntry** | — | Amount changed | ⚠️ Mark for review |

---

## 🔄 Workflow: Edit with PENDING Payment

### Step-by-Step Process

```
1. User edits posted GRN (qty: 10 → 15)
   ↓
2. GRNTransactionValidator checks:
   - Payment = PENDING ✅ ALLOWED
   - No sales ✅
   - No returns ✅
   ↓
3. editPostedGRN() executes:
   - Phase 1: Reverse stock (5 → 0)
   - Phase 2: Apply changes (0 → 15)
   - Update GRN document
   ↓
4. ✨ NEW: updateRelatedCollections():
   - Find VendorPayment for this GRN
   - Check paymentStatus = PENDING?
     - YES → Update amount (52.5 → 165)
     - NO (PARTIAL/PAID) → Skip & warn
   - Update AddProduct records
   - Log all changes
   ↓
5. Response includes:
   - Updated GRN
   - Stock changes
   - Payment updates
   - Related collections summary
```

---

## 💾 Database Operations During Edit

### Before Edit
```javascript
Grn:
  grnNumber: "GRN-2025-2026-00027"
  totalQty: 10
  totalAmount: 115.5

VendorPayment:
  grnId: "GRN-2025-2026-00027"
  paymentStatus: "PENDING"
  initialAmount: 52.5          ← Old payment
  balance: 52.5

CurrentStock:
  totalQuantity: 5
  grnReceivedQuantity: 5
```

### After Edit (qty: 10 → 15)
```javascript
Grn:
  grnNumber: "GRN-2025-2026-00027"
  totalQty: 15                  ← UPDATED
  totalAmount: 165              ← UPDATED

VendorPayment:
  grnId: "GRN-2025-2026-00027"
  paymentStatus: "PENDING"
  initialAmount: 165            ← ✅ AUTO-UPDATED!
  balance: 165                  ← ✅ Recalculated
  editNotes: "Updated from 52.5 to 165 due to GRN edit"
  paymentHistory: [
    {
      action: "AMOUNT_UPDATED"
      oldAmount: 52.5
      newAmount: 165
      reason: "GRN amount changed during edit"
      timestamp: 2026-03-22T...
    }
  ]

CurrentStock:
  totalQuantity: 15             ← ✅ Updated from 5
  grnReceivedQuantity: 15       ← ✅ Updated from 5
```

---

## 🔐 Safety Rules

### When Payment CAN Be Updated (Auto-Updates)
```
✅ paymentStatus = "PENDING"
   Reason: Vendor hasn't confirmed receipt yet
   Safety: Safe to update until confirmation arrives

✅ paymentStatus = "CANCELLED"
   Reason: Payment was reversed
   Safety: Safe to update for resubmission
```

### When Payment CANNOT Be Updated (Skipped with Warning)
```
❌ paymentStatus = "PARTIAL"
   Reason: Vendor confirmed receipt of partial payment
   Warning: Cannot change - actual cash received
   Action: Manual adjustment needed + vendor notification

❌ paymentStatus = "PAID"
   Reason: Vendor confirmed full payment received
   Warning: Cannot change - full amount settled
   Action: Manual adjustment needed + vendor notification

❌ paymentStatus = "OVERDUE"
   Reason: Payment past due date
   Warning: Cannot change - payment issue
   Action: Resolve overdue first
```

---

## 📊 API Response Format

### POST /api/grn/:id/edit-posted

**Request**:
```javascript
{
  "itemUpdates": [
    {
      "productId": "69beef0d228dfd0cc59b9fcc",
      "quantity": 15,    // Was 10
      "unitCost": 11
    }
  ],
  "reason": "Correction: Received 15 units not 10"
}
```

**Response** (NEW: Includes relatedCollections):
```javascript
{
  "success": true,
  "data": {
    "grn": {
      "_id": "69bf8b218cd42c35a3dd4a25",
      "grnNumber": "GRN-2025-2026-00027",
      "totalQty": 15,           // Updated
      "totalAmount": 165,       // Updated
      "items": [
        {
          "productId": "69beef0d228dfd0cc59b9fcc",
          "quantity": 15,       // Updated
          "unitCost": 11,
          "totalCost": 165      // Updated
        }
      ]
    },
    "summary": {
      "reversals": 1,
      "applications": 1,
      "netStockChange": 10,       // 5 to 15
      "netCostChange": 110        // 55 to 165
    },
    "relatedCollections": {
      "vendorPayments": [
        {
          "paymentId": "69bf8b218cd42c35a3dd4a28",
          "status": "PENDING",
          "oldAmount": 52.5,
          "newAmount": 165,
          "amountDifference": 112.5,
          "updated": true,          // ✅ Updated!
          "message": "Amount auto-updated"
        }
      ],
      "products": [
        {
          "productId": "69beef0d228dfd0cc59b9fcc",
          "itemCode": "1001",
          "itemName": "iPhone 6S Plus",
          "oldCost": 110,
          "newCost": 165,
          "updated": true
        }
      ],
      "journals": [
        {
          "action": "MARK_FOR_REVIEW",
          "reason": "GRN amount changed - journal entries need review",
          "recommendation": "Run GL reconsolidation after all edits complete"
        }
      ],
      "errors": []
    }
  }
}
```

---

## 🧪 Test Scenarios

### Scenario 1: Edit GRN with PENDING Payment ✅
```
Given:
  GRN qty: 10, amount: 115.5
  Payment: PENDING, amount: 52.5

When:
  Edit GRN qty to 15 (amount: 165)

Then:
  ✅ GRN updated: qty=15, amount=165
  ✅ Payment updated: amount=52.5 → 165
  ✅ Stock updated: qty=5 → 15
  ✅ Response includes relatedCollections
```

### Scenario 2: Edit GRN with PARTIAL Payment ❌
```
Given:
  GRN qty: 10, amount: 115.5
  Payment: PARTIAL, amount: 52.5 (vendor received $50)

When:
  Edit GRN qty to 15 (amount: 165)

Then:
  ❌ Edit BLOCKED by GRNTransactionValidator
  Reason: "Partial payment made - edit not allowed"
```

### Scenario 3: Edit Draft GRN (No Payment Yet)
```
Given:
  GRN status: Draft
  No payment created

When:
  Edit items, quantities

Then:
  ✅ Draft updated
  ⚠️ No relatedCollections update (not posted yet)
  ℹ️ Payment will be created when GRN posted
```

---

## 📝 Audit Trail Examples

### VendorPayment History After Edit
```javascript
paymentHistory: [
  {
    action: "AMOUNT_UPDATED",
    timestamp: "2026-03-22T06:30:00Z",
    oldAmount: 52.5,
    newAmount: 165,
    reason: "GRN amount changed during edit",
    updatedBy: "69beee6a4083203fc968ae78"
  }
]

editNotes: "Updated from 52.5 to 165 due to GRN edit. 
            Old balance: 52.5, New balance: 165"
```

### ActivityLog Entry
```javascript
{
  entityId: "69bf8b218cd42c35a3dd4a25",
  entityType: "GRN",
  userId: "69beee6a4083203fc968ae78",
  action: "POSTED_EDIT",
  changes: {
    before: { items: [...], totalQty: 10, totalCost: 110 },
    after: { items: [...], totalQty: 15, totalCost: 165 },
    reversal: { count: 1, items: [...], totalQty: 10 },
    relatedUpdates: {
      vendorPayment: "Updated from 52.5 to 165",
      products: 1,
      journals: "Marked for repost"
    }
  },
  timestamp: "2026-03-22T06:30:00Z"
}
```

---

## ⚠️ Important Notes

### 1. PENDING vs PARTIAL
```
PENDING = Payment record created but not sent to vendor yet
  → Safe to edit GRN ✅

PARTIAL = Vendor received partial payment
  → Cannot edit GRN ❌
```

### 2. Journal Entries Need Manual Repost
```
When GRN amount changed:
  - Original JV entries still show old amount
  - Marked as needing review
  - Manual repost required or GL reconciliation
  
Recommendation:
  - Run GL reconciliation after all GRN edits
  - Or manually adjust journal entries
```

### 3. Payment Notification
```
When payment amount updated:
  - VendorPayment record updated ✅
  - paymentHistory logged ✅
  - ⚠️ Vendor NOT auto-notified
  
Action Required:
  - Notify vendor of new amount
  - Wait for vendor confirmation (status stays PENDING)
  - Vendor may reject or delay payment
```

---

## 🚀 Usage Example

### Edit GRN and Update All Collections
```javascript
// In your GRN edit endpoint
const result = await GRNEditManager.editPostedGRN(
  grnId,
  {
    itemUpdates: [
      {
        productId: productId1,
        quantity: 15,     // Changed from 10
        unitCost: 11
      }
    ],
    reason: "Correction: Received more units than recorded"
  },
  userId
);

// Response now includes relatedCollections:
console.log(result.relatedCollections);
// {
//   vendorPayments: [ { updated: true, oldAmount: 52.5, newAmount: 165 } ],
//   products: [ { updated: true, ... } ],
//   journals: [ { action: "MARK_FOR_REVIEW" } ]
// }
```

---

## ✅ Verification Checklist

- ✅ VendorPayment import added to GRNEditManager.js
- ✅ updateRelatedCollections() method implemented
- ✅ Called from editPostedGRN() after GRN update
- ✅ PENDING payment logic: Update amount + balance
- ✅ PARTIAL/PAID/OVERDUE logic: Skip with warning
- ✅ Audit trail logging in paymentHistory
- ✅ editNotes field captures reason
- ✅ Related collections returned in response
- ✅ Error handling with graceful fallback
- ✅ No breaking changes to existing API

---

**Next Steps**: Deploy and test with PENDING payment scenario  
**Monitoring**: Check relatedCollections response for update success
