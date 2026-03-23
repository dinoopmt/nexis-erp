# GRN Edit - All Collections Updated During Edit

## Overview
When editing a Received GRN, **ALL related collections are updated simultaneously** to keep data consistent:

```
GRN Edit Request
    ↓
SimpleGRNEditManager.editReceivedGRN()
    ↓
    ├─ Update 1: GRN Collection (items, totals)
    ├─ Update 2: CurrentStock Collection (quantities adjusted)
    ├─ Update 3: InventoryBatch Collection (batch quantities)
    └─ Update 4: VendorPayment Collection (amounts updated)
    ↓
✅ All collections updated → Response
```

---

## Collections Updated

### 1️⃣ **GRN Collection**

**What's Updated:**
- Items array (new quantities, costs)
- totalAmount (recalculated)
- finalTotal (recalculated)
- updatedAt (timestamp)
- lastModifiedBy (userId)

**Example:**
```javascript
await Grn.findByIdAndUpdate(grnId, {
  $set: {
    items: [
      { 
        productId: "...", 
        quantity: 60,      // Changed from 50
        unitCost: 100,
        totalCost: 6000
      }
    ],
    totalAmount: 6000,     // Recalculated
    finalTotal: 6000,
    updatedAt: new Date(),
    lastModifiedBy: "user123"
  }
});
```

---

### 2️⃣ **CurrentStock Collection**

**What's Updated:**
- quantityInStock (adjusted by difference)

**Adjustment Formula:**
```
qtyDifference = newQty - oldQty
CurrentStock.quantityInStock += qtyDifference
```

**Example:**
```javascript
// Item changed: 50 → 60 units
const qtyDifference = 60 - 50 = 10;

await CurrentStock.findOneAndUpdate(
  { productId: "507f1f77bcf86cd799439011" },
  { $inc: { quantityInStock: 10 } }  // Plus 10
);

// Result: Stock increases by 10 units
```

**Scenarios:**
| Old Qty | New Qty | Adjustment | Result |
|---------|---------|-----------|--------|
| 50 | 60 | +10 | Stock ⬆️ |
| 50 | 40 | -10 | Stock ⬇️ |
| 50 | 50 | 0 | Stock ➡️ |

---

### 3️⃣ **InventoryBatch Collection**

**What's Updated:**
- baseUnits (set to new quantity value)
- quantity (set to new quantity value)
- updatedAt (timestamp)

**Update Logic:**
```javascript
// For each item with a batchNumber:
if (newItem.batchNumber) {
  await InventoryBatch.findOneAndUpdate(
    {
      grnId: grn.grnNumber,
      batchNumber: newItem.batchNumber,
      productId: newItem.productId
    },
    {
      $set: {
        baseUnits: newItem.quantity,      // Set to NEW value (not adjusted)
        quantity: newItem.quantity,
        updatedAt: new Date()
      }
    }
  );
}
```

**Example:**
```
Original Batch: 
  batchNumber: "BATCH-001"
  quantity: 50

After edit (qty 50 → 60):
  batchNumber: "BATCH-001"
  quantity: 60  ← Updated to new value
```

---

### 4️⃣ **VendorPayment Collection**

**Conditions:**
- Only updated if PaymentStatus = "PENDING"
- If payment is PAID/PARTIAL/OVERDUE → Not updated, edit blocked

**What's Updated:**
- initialAmount (recalculated total)
- balance (set to new initialAmount)
- amountPaid (reset to 0)
- updatedAt (timestamp)

**Update Logic:**
```javascript
if (payments && payments.paymentStatus === "PENDING") {
  await VendorPayment.findByIdAndUpdate(
    payments._id,
    {
      $set: {
        initialAmount: newTotal,    // New GRN total
        balance: newTotal,          // Reset balance to new full amount
        amountPaid: 0,              // Reset paid amount
        updatedAt: new Date()
      }
    }
  );
}
```

**Example:**
```
Original Payment:
  initialAmount: 5000
  amountPaid: 1000
  balance: 4000
  paymentStatus: PENDING

After edit (total 5000 → 6000):
  initialAmount: 6000         ← Updated
  amountPaid: 0               ← Reset
  balance: 6000               ← Updated
  paymentStatus: PENDING      ← Unchanged
```

---

## Complete Update Sequence (Code Order)

### Step 1: Calculate New Total
```javascript
let newTotal = 0;
for (const item of changes.items) {
  newTotal += item.totalCost || (item.quantity * item.unitCost);
}
```

### Step 2: Update CurrentStock & InventoryBatch (per item)
```javascript
for (const newItem of changes.items) {
  const oldItem = oldItemsMap.get(newItem.productId?.toString());
  const qtyDifference = newItem.quantity - oldItem.quantity;
  
  if (qtyDifference !== 0) {
    // Update CurrentStock
    await CurrentStock.findOneAndUpdate(
      { productId: newItem.productId },
      { $inc: { quantityInStock: qtyDifference } }
    );
    
    // Update InventoryBatch (if batch exists)
    await InventoryBatch.findOneAndUpdate(
      { 
        grnId: grn.grnNumber, 
        batchNumber: newItem.batchNumber 
      },
      {
        $set: {
          baseUnits: newItem.quantity,
          quantity: newItem.quantity
        }
      }
    );
  }
}
```

### Step 3: Update GRN Document
```javascript
await Grn.findByIdAndUpdate(grnId, {
  $set: {
    items: changes.items,
    totalAmount: newTotal,
    finalTotal: newTotal,
    updatedAt: new Date(),
    lastModifiedBy: userId
  }
});
```

### Step 4: Update VendorPayment (if PENDING)
```javascript
if (payments && payments.paymentStatus === "PENDING") {
  await VendorPayment.findByIdAndUpdate(payments._id, {
    $set: {
      initialAmount: newTotal,
      balance: newTotal,
      amountPaid: 0,
      updatedAt: new Date()
    }
  });
}
```

---

## Response Structure

```json
{
  "success": true,
  "message": "GRN edited successfully - all related collections updated",
  "grn": { /* updated GRN document */ },
  "validations": {
    "grnExists": true,
    "statusOK": true,
    "paymentPending": true,
    "batchesMatch": true,
    "productsExist": true,
    "vendorExists": true,
    "itemsValid": true
  },
  "collectionsUpdated": {
    "grn": true,
    "currentStock": true,
    "inventoryBatch": true,
    "vendorPayment": true
  },
  "summary": {
    "items": 3,
    "totalAmount": 6000,
    "paymentStatus": "PENDING"
  }
}
```

---

## Example: Complete Edit Workflow

### Initial State
```
Product A: 
  Stock: 100
  Batch BATCH-001: 50 units

GRN-001:
  Item: ProductA qty=50
  Total: 5000
  Payment: 5000 (PENDING)

---

User edits GRN qty: 50 → 60

---

Final State (After Edit)

Product A:
  Stock: 110  ← +10 adjustment
  Batch BATCH-001: 60 units  ← Updated to new qty

GRN-001:
  Item: ProductA qty=60  ← Updated
  Total: 6000  ← Recalculated
  Payment: 6000 (PENDING)  ← Updated amount, reset balance
```

---

## Collections Updated - Summary Table

| Collection | Field | Change Type | Why |
|-----------|-------|------------|-----|
| **GRN** | items | Direct set | New values |
| **GRN** | totalAmount | Recalculated | New totals |
| **GRN** | updatedAt | New timestamp | Audit trail |
| **CurrentStock** | quantityInStock | Incremented | Qty difference |
| **InventoryBatch** | baseUnits | Direct set | New batch qty |
| **InventoryBatch** | quantity | Direct set | New batch qty |
| **VendorPayment** | initialAmount | Recalculated | New GRN total |
| **VendorPayment** | balance | Reset | Recalculate payment due |
| **VendorPayment** | amountPaid | Reset to 0 | Fresh payment cycle |

---

## Edge Cases Handled

### ✅ Multiple Items in One Edit
```
Item A: 50 → 60 (+10)
Item B: 30 → 25 (-5)
Item C: 20 → 20 (0)

Result:
- CurrentStock adjusted: +10, -5, 0
- InventoryBatch updated: 60, 25, 20
- Total recalculated: sum of all new values
- Payment updated with new total
```

### ✅ Partial Update
```
Only some items changed qty
- Changed items: collections updated
- Unchanged items: collections not touched
```

### ✅ Payment Already PAID
```
If paymentStatus ≠ PENDING:
- GRN ❌ EDIT BLOCKED (validation fails)
- No collections updated (transaction rolled back)
```

### ✅ Batch Not Found
```
If batchNumber provided but batch doesn't exist:
- Warning logged
- Other collections updated normally
- No error thrown
```

---

## Implementation File
**SimpleGRNEditManager.js** - Lines 150-220

Executing code:
```bash
node tests/test-grn-edit-with-stock-adjustment.js
```

