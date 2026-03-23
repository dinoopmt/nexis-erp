# GRN Edit - Before vs After: Related Collections Update

**Feature**: When editing GRN with PENDING payment, automatically update all related collections

---

## 📊 COMPARISON TABLE

| Aspect | BEFORE (Without Update) | NOW (With Auto-Update) ✨ |
|--------|------------------------|--------------------------|
| **GRN Qty** | 10 → 15 | 10 → 15 ✅ |
| **GRN Amount** | 115.5 → 165 | 115.5 → 165 ✅ |
| **Stock Qty** | 5 → 15 | 5 → 15 ✅ |
| **Payment Amount** | 52.5 (old) ❌ | 52.5 → 165 ✅ |
| **Payment Balance** | 52.5 (old) ❌ | 52.5 → 165 ✅ |
| **Product Records** | Not updated ❌ | Updated ✅ |
| **Audit Trail** | Partial ⚠️ | Complete ✅ |
| **Mismatch Warning** | None ❌ | Included ✅ |

---

## 🔄 EDITED GRN DATA FLOW

### Before Implementation
```
┌─────────────────────────────────────────┐
│ User edits GRN (qty: 10→15, amt: 115.5→165)
└──────────────┬──────────────────────────┘
               ↓
        ┌──────────────┐
        │ Phase 1:     │
        │ Reverse      │
        │ Stock 5→0    │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │ Phase 2:     │
        │ Apply        │
        │ Stock 0→15   │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │ Update GRN   │
        │ Qty & Amt    │
        └──────┬───────┘
               ↓
        ┌──────────────────────────────┐
        │ DONE ✓                       │
        │ ❌ Payment NOT updated       │
        │ ❌ Products NOT updated      │
        │ ❌ MISMATCH in system!       │
        └──────────────────────────────┘
```

### After Implementation
```
┌─────────────────────────────────────────┐
│ User edits GRN (qty: 10→15, amt: 115.5→165)
└──────────────┬──────────────────────────┘
               ↓
        ┌──────────────┐
        │ Phase 1:     │
        │ Reverse      │
        │ Stock 5→0    │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │ Phase 2:     │
        │ Apply        │
        │ Stock 0→15   │
        └──────┬───────┘
               ↓
        ┌──────────────┐
        │ Update GRN   │
        │ Qty & Amt    │
        └──────┬───────┘
               ↓
        ┌──────────────────────────────────────┐
        │ ✨ NEW: Update Related Collections   │
        │ ✅ Payment: 52.5 → 165              │
        │ ✅ Balance: 52.5 → 165              │
        │ ✅ Products: Updated                │
        │ ✅ Audit Trail: Complete            │
        └──────┬───────────────────────────────┘
               ↓
        ┌──────────────────────────────┐
        │ DONE ✓✓✓                     │
        │ ✅ All collections aligned   │
        │ ✅ NO MISMATCH               │
        │ ✅ Audit complete            │
        └──────────────────────────────┘
```

---

## 💾 FIELD UPDATES: BEFORE vs AFTER

### GRN Document
```javascript
// BEFORE & AFTER (Same - no change)
{
  grnNumber: "GRN-2025-2026-00027",
  totalQty: 15,        // Updated from 10
  totalAmount: 165,    // Updated from 115.5
  items: [ ... ]
}
```

### CurrentStock Document
```javascript
// BEFORE & AFTER (Same - no change)
{
  productId: "69beef0d228dfd0cc59b9fcc",
  totalQuantity: 15,        // Updated from 5
  grnReceivedQuantity: 15   // Updated from 5
}
```

### VendorPayment Document
```javascript
// BEFORE (❌ Mismatch)
{
  grnId: "GRN-2025-2026-00027",
  paymentStatus: "PENDING",
  initialAmount: 52.5,    // ❌ STUCK HERE!
  balance: 52.5,
  paymentHistory: []
}

// AFTER (✅ Fixed)
{
  grnId: "GRN-2025-2026-00027",
  paymentStatus: "PENDING",
  initialAmount: 165,     // ✅ AUTO-UPDATED!
  balance: 165,           // ✅ Recalculated
  editNotes: "Updated from 52.5 to 165 due to GRN edit...",
  paymentHistory: [
    {
      action: "AMOUNT_UPDATED",
      oldAmount: 52.5,
      newAmount: 165,
      reason: "GRN amount changed during edit",
      timestamp: "2026-03-22T06:30:00Z",
      updatedBy: "69beee6a4083203fc968ae78"
    }
  ]
}
```

### AddProduct Document
```javascript
// BEFORE (⚠️ Outdated)
{
  _id: "69beef0d228dfd0cc59b9fcc",
  itemcode: "1001",
  lastGrnDate: "2026-03-22T00:00:00Z",    // Old date
  lastGrnNumber: "GRN-2025-2026-00027",   // Not updated marking
  lastUpdatedBy: "...",                   // Not updated
  lastUpdatedDate: "2026-03-22T06:24:33Z"  // Stale
}

// AFTER (✅ Fresh)
{
  _id: "69beef0d228dfd0cc59b9fcc",
  itemcode: "1001",
  lastGrnDate: "2026-03-22T00:00:00Z",    // Same
  lastGrnNumber: "GRN-2025-2026-00027",   // Same
  lastUpdatedBy: "69beee6a4083203fc968ae78",  // ✅ Updated
  lastUpdatedDate: "2026-03-22T06:30:00Z"     // ✅ Current timestamp
  notes: [ "GRN GRN-2025-2026-00027 edited on 2026-03-22T06:30:00Z" ]
}
```

---

## 🔐 PAYMENT STATUS LOGIC: BEFORE vs AFTER

### Old Logic (❌ No Update)
```
Edit GRN → Update Stock → DONE
(Payment always skipped, no special handling)
```

### New Logic (✅ Smart Update)
```
Edit GRN → Update Stock → Check Payment:

  if paymentStatus === "PENDING" OR "CANCELLED"
    → ✅ UPDATE amount & balance
    → Log change to paymentHistory
    → Update editNotes with reason
    → Return { updated: true }
  
  else (PARTIAL, PAID, OVERDUE)
    → ⚠️ SKIP - Money already transferred
    → Return { updated: false, reason: "..." }
    → Warn user in response
```

---

## 📤 API RESPONSE: BEFORE vs AFTER

### Before Implementation
```javascript
{
  "success": true,
  "data": {
    "grn": {
      "grnNumber": "GRN-2025-2026-00027",
      "totalQty": 15,
      "totalAmount": 165,
      "items": [...]
    },
    "summary": {
      "reversals": 1,
      "applications": 1,
      "netStockChange": 10,
      "netCostChange": 110
    }
    // ❌ NO relatedCollections field
  }
}
```

### After Implementation
```javascript
{
  "success": true,
  "data": {
    "grn": {
      "grnNumber": "GRN-2025-2026-00027",
      "totalQty": 15,
      "totalAmount": 165,
      "items": [...]
    },
    "summary": {
      "reversals": 1,
      "applications": 1,
      "netStockChange": 10,
      "netCostChange": 110
    },
    // ✨ NEW: relatedCollections field
    "relatedCollections": {
      "vendorPayments": [
        {
          "paymentId": "69bf8b218cd42c35a3dd4a28",
          "status": "PENDING",
          "oldAmount": 52.5,
          "newAmount": 165,
          "amountDifference": 112.5,
          "updated": true,
          "reason": "PENDING payment - amount auto-updated"
        }
      ],
      "products": [
        {
          "productId": "69beef0d228dfd0cc59b9fcc",
          "itemCode": "1001",
          "oldCost": 110,
          "newCost": 165,
          "updated": true
        }
      ],
      "journals": [
        {
          "action": "MARK_FOR_REVIEW",
          "reason": "GRN amount changed - GL entries need adjustment",
          "recommendation": "Run reconciliation after edits complete"
        }
      ],
      "errors": []
    }
  }
}
```

---

## 🧪 REAL DATABASE EXAMPLE: GRN-2025-2026-00027

### Input: User edits GRN
```
Original: qty=10, amount=115.5
Updated:  qty=15, amount=165
Change:   +5 qty, +49.5 amount
```

### Result: All Collections Updated

#### 1. Grn Collection
```json
{
  "grnNumber": "GRN-2025-2026-00027",
  "totalQty": 10 → 15 ✅,
  "totalAmount": 115.5 → 165 ✅,
  "items": [
    {
      "productId": "69beef0d228dfd0cc59b9fcc",
      "quantity": 10 → 15 ✅,
      "unitCost": 11,
      "totalCost": 110 → 165 ✅
    }
  ]
}
```

#### 2. CurrentStock Collection
```json
{
  "productId": "69beef0d228dfd0cc59b9fcc",
  "totalQuantity": 5 → 15 ✅,
  "availableQuantity": 5 → 15 ✅,
  "grnReceivedQuantity": 5 → 15 ✅,
  "lastActivity": {
    "reference": "GRN-2025-2026-00027 (EDITED)" ✅
  }
}
```

#### 3. VendorPayment Collection
```json
{
  "grnId": "GRN-2025-2026-00027",
  "paymentStatus": "PENDING",
  "initialAmount": 52.5 → 165 ✅,
  "balance": 52.5 → 165 ✅,
  "editNotes": "Updated from 52.5 to 165 due to GRN edit..." ✅,
  "paymentHistory": [
    {
      "action": "AMOUNT_UPDATED",
      "oldAmount": 52.5,
      "newAmount": 165,
      "reason": "GRN amount changed during edit" ✅
    }
  ]
}
```

#### 4. AddProduct Collection
```json
{
  "_id": "69beef0d228dfd0cc59b9fcc",
  "itemcode": "1001",
  "lastGrnNumber": "GRN-2025-2026-00027",
  "lastUpdatedDate": "2026-03-22T06:30:00Z" ✅,
  "lastUpdatedBy": "69beee6a4083203fc968ae78" ✅
}
```

---

## ✅ SUMMARY: What Changed

| What | Before | After |
|-----|--------|-------|
| **GRN Edit** | Works | Works (same) |
| **Stock Update** | Works | Works (same) |
| **Payment Update** | ❌ Mismatch | ✅ Auto-updated |
| **Product Records** | ⚠️ Stale | ✅ Fresh |
| **Audit Trail** | Partial | Complete |
| **API Response** | Basic | Rich (includes relatedCollections) |

**Bottom Line**: Complete sync across all collections when GRN is edited! 🎉
