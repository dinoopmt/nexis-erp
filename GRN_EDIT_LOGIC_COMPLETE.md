# GRN Edit Logic - Complete Implementation

## Two Workflows

### **Workflow 1: SAVE DRAFT**
```
User fills GRN form → Click "💾 Save Draft"
    ↓
grnController.createGrn()
    ↓
Save GRN to MongoDB (Status: Draft)
    ↓
✅ No stock updates, no accounting entries
   No batches created, no costs calculated
```

**Result:** GRN saved but nothing processed

---

### **Workflow 2: POST GRN**
```
User fills GRN form → Click "✓ Post GRN"
    ↓
grnController.createGrn() [saves with Draft]
    ↓
Auto-triggers: POST /api/v1/grn/:id/post
    ↓
grnController.postGrn()
    ↓
ALL 7 UPDATES HAPPEN:
├─ 1. Create accounting journals
├─ 2. Update current stock (+qty)
├─ 3. Create batches
├─ 4. Calculate costs
├─ 5. Update unit variants
├─ 6. Create stock movements
└─ 7. Create audit logs
    ↓
GRN Status: Received (or Posted)
```

**Result:** Complete GRN processing - everything updated

---

## GRN Edit Rules (After Post)

### ✅ EDITS ALLOWED IF:

| Condition | Check |
|-----------|-------|
| GRN Status | Draft / Received / Verified |
| Payment Status | **PENDING** (not committed) |
| Batch Matching | Batch qty = GRN qty (no discrepancies) |
| Products | All exist in database |
| Vendor | Exists in database |

### ❌ EDITS BLOCKED IF:

| Scenario | Block Reason |
|----------|--------------|
| Payment = PARTIAL | Payment already started |
| Payment = PAID | Payment completed |
| Payment = OVERDUE | Past due date |
| Batch qty ≠ GRN qty | Stock discrepancy exists |

---

## Current Stock Adjustment Logic

When editing a **Received GRN**, current stock must be adjusted:

```
Example:
  Original GRN qty: 50 units
  Current Stock: 100 units (before GRN: theoretical 50)
  Edit to new qty: 60 units

Adjustment Process:
  Step 1: Subtract old qty       100 - 50 = 50
  Step 2: Add new qty            50 + 60 = 110
  
Result: Current Stock = 110 ✓ Correct

Net Change: +10 units (60 - 50)
```

### Implementation (SimpleGRNEditManager):

```javascript
// For each item being edited:
const qtyDifference = newItem.quantity - oldItem.quantity;

await CurrentStock.findOneAndUpdate(
  { productId: newItem.productId },
  { $inc: { quantityInStock: qtyDifference } }  // Add difference
);
```

---

## API Endpoint

### Endpoint: `PUT /api/v1/grn/:id`

**Request Body:**
```json
{
  "items": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "productName": "Product A",
      "quantity": 60,          // Changed from 50
      "unitCost": 100,
      "totalCost": 6000
    }
  ],
  "notes": "Updated quantity"
}
```

**Response (Success):**
```json
{
  "success": true,
  "grn": {
    "_id": "...",
    "grnNumber": "GRN-001",
    "status": "Received",
    "items": [...],
    "updatedAt": "2024-03-22T10:30:00Z",
    "lastModifiedBy": "user123"
  },
  "validations": {
    "grnExists": true,
    "statusOK": true,
    "paymentPending": true,
    "batchesMatch": true,
    "productsExist": true,
    "vendorExists": true,
    "itemsValid": true
  },
  "stockAdjustment": "completed"
}
```

**Response (Blocked - Payment Committed):**
```json
{
  "success": false,
  "error": "❌ EDIT BLOCKED - Payment status is \"PAID\".\n   Cannot edit when payment is committed.\n   Payment must be PENDING to allow edits."
}
```

**Response (Blocked - Stock Discrepancy):**
```json
{
  "success": false,
  "error": "❌ EDIT BLOCKED - Batch qty (45) doesn't match GRN qty (50).\n   This indicates stock discrepancy.\n   Cannot edit when discrepancy exists."
}
```

---

## Use Case Examples

### ✅ Case 1: Valid Edit (Draft GRN)
```
Status: Draft
Payment: PENDING
Action: Change qty from 50 → 60
Result: ✅ Allowed (all validations pass)
```

### ✅ Case 2: Valid Edit (Received GRN, Payment PENDING)
```
Status: Received
Payment: PENDING
Batch qty: 50 (matches GRN qty)
Action: Change qty from 50 → 60
Result: ✅ Allowed
Stock adjustment: Current -50 +60 = +10 net
```

### ❌ Case 3: Blocked Edit (Payment PAID)
```
Status: Received
Payment: PAID
Batch qty: 50
Action: Change qty from 50 → 60
Result: ❌ BLOCKED - Payment committed
```

### ❌ Case 4: Blocked Edit (Stock Discrepancy)
```
Status: Received
Payment: PENDING
Batch qty: 45 (GRN qty: 50) ← MISMATCH
Action: Change qty from 50 → 60
Result: ❌ BLOCKED - Batch qty mismatch
```

### ❌ Case 5: Blocked Edit (Posted Status)
```
Status: Posted
Payment: PENDING
Action: Change qty
Result: ❌ BLOCKED - Status must be Draft/Received/Verified
```

---

## Table Summary

| Scenario | Save Draft | Post GRN | Edit (Received) |
|----------|-----------|---------|-----------------|
| **User Action** | Save form | Post form | Edit existing |
| **Final Status** | Draft | Received | Received (unchanged) |
| **Stock Updated** | ❌ No | ✅ Yes | ✅ Yes (adjusted) |
| **Journals Created** | ❌ No | ✅ Yes | ❌ No |
| **Batches Created** | ❌ No | ✅ Yes | ❌ No |
| **Payment Required** | ❌ No | ❌ No | PENDING only |
| **Allowed After Post** | N/A | N/A | ✅ If PENDING & no discrepancy |

---

## Files Modified

1. **SimpleGRNEditManager.js**
   - Added CurrentStock import
   - Enhanced payment status check (blocks if not PENDING)
   - Enhanced batch matching check (blocks if mismatched)
   - Added current stock adjustment logic

2. **grnController.js**
   - Uses SimpleGRNEditManager for all GRN edits

3. **Test: test-grn-edit-with-stock-adjustment.js**
   - Tests edit with stock adjustment
   - Verifies before/after stock values
   - Tests blocked scenarios

---

## Testing

Run the stock adjustment test:
```bash
node tests/test-grn-edit-with-stock-adjustment.js
```

Test scenarios covered:
- ✅ Edit Draft GRN (always allowed)
- ✅ Edit Received GRN with PENDING payment
- ✅ Current stock adjustment verification (+10 net change)
- ❌ Block if Payment != PENDING
- ❌ Block if Batch qty != GRN qty

