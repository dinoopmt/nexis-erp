# GRN Edit Management System

Complete guide for editing GRNs before and after posting with full stock synchronization, cost recalculation, and audit trails.

---

## Overview

### Problem: Current Limitation
- **Status**: Posted GRNs cannot be edited (error 409 thrown)
- **Impact**: Cannot correct quantities, fix unit costs, or adjust expenses
- **Solution**: GRNEditManager with two-phase stock reversal & reapplication

### Scenarios Handled

| Scenario | Status | Approach | Stock Impact |
|----------|--------|----------|--------------|
| Edit quantities before posting | Draft | Direct update | None (not yet posted) |
| Change prices before posting | Draft | Direct update | None |
| Modify posted GRN quantities | Received | Two-phase reversal + reapplication | Yes - fully managed |
| Delete item from posted GRN | Received | Reverse stock + remove item | Yes - automatic |
| Add items to posted GRN | Received | Apply new stock immediately | Yes - automatic |
| Track all changes | Any | Audit log + edit history | Complete trail |

---

## Architecture

### Two-Phase Edit System (Posted GRNs)

```
Original GRN Posting:
  └─ Stock: +100 units
  └─ Cost: $10,000
     
EDIT OPERATION:
  │
  ├─ PHASE 1: REVERSE
  │  ├─ CurrentStock: -100 units
  │  ├─ Batches: Mark as REVERSED
  │  ├─ Record reversal movement
  │  └─ Validate: Must have stock to reverse (can't be partially consumed)
  │
  ├─ PHASE 2: APPLY
  │  ├─ Calculate new quantities
  │  ├─ Recalculate costs
  │  ├─ CurrentStock: +NewQty units
  │  ├─ Create new batch records
  │  ├─ Record new movements
  │  └─ Update GRN items
  │
  └─ Result:
     └─ Stock reflects new quantity
     └─ Cost recalculated
     └─ Full audit trail
```

### Change Tracking

**Edit History Stored In:**
1. `GRN.editHistory` array - Direct document history
2. `ActivityLog` collection - Comprehensive audit trail
3. `StockMovement` collection - Stock transaction records
4. `CurrentStock` collection - Current state snapshot

---

## API Endpoints

### 1. Check Editability

**GET** `/api/grn/:id/editability`

Check if a GRN can be edited before attempting changes.

**Response:**
```json
{
  "canEdit": true,
  "reason": "GRN can be edited",
  "currentStatus": "Received",
  "postedDate": "2026-03-22T05:41:29.118Z",
  "postedBy": "69beee6a4083203fc968ae78"
}
```

**Example:**
```javascript
const response = await fetch(`/api/grn/${grnId}/editability`);
const { canEdit, reason } = await response.json();

if (!canEdit) {
  alert(`Cannot edit: ${reason}`);
  return;
}
```

---

### 2. Edit Draft GRN

**PATCH** `/api/grn/:id/edit-draft`

Modify a Draft GRN before posting (simple updates, no stock impact).

**Request Body:**
```json
{
  "items": [
    {
      "productId": "69beef0d228dfd0cc59b9fcc",
      "quantity": 15,
      "cost": 95
    }
  ],
  "grnDate": "2026-03-22T00:00:00.000Z",
  "vendorId": "69bef0d228dfd0cc59b9faa"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft GRN updated successfully",
  "grn": {
    "_id": "...",
    "status": "Draft",
    "items": [...],
    "totalQty": 15,
    "updatedBy": "user-id",
    "updatedDate": "2026-03-22T10:30:00.000Z"
  }
}
```

**Example:**
```javascript
const updates = {
  items: [
    {
      productId: "69beef0d228dfd0cc59b9fcc",
      quantity: 20,  // Changed from 10
      cost: 100
    }
  ]
};

const response = await fetch(`/api/grn/${grnId}/edit-draft`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
});

const { grn } = await response.json();
console.log(`✅ Updated: ${grn.totalQty} units`);
```

---

### 3. Edit Posted GRN ⭐ (Most Important)

**PATCH** `/api/grn/:id/edit-posted`

Modify a Posted GRN with full stock management (two-phase operation).

**Key Features:**
- ✅ Validates current stock levels
- ✅ Reverses original stock impact
- ✅ Applies new quantities with cost recalculation
- ✅ Updates all related collections
- ✅ Creates complete audit trail

**Request Body:**
```json
{
  "itemUpdates": [
    {
      "productId": "69beef0d228dfd0cc59b9fcc",
      "quantity": 22,
      "cost": 105
    },
    {
      "productId": "69beef0d228dfd0cc59b9fdd",
      "quantity": 18,
      "cost": 95
    }
  ],
  "reason": "Quantity correction - physical count vs invoice mismatch"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Posted GRN edited successfully with stock management",
  "grn": {
    "_id": "69bf7feeabf6a5c16cb2a7eb",
    "status": "Received",
    "items": [...],
    "totalQty": 40,
    "postedDate": "2026-03-22T05:41:29.118Z",
    "updatedDate": "2026-03-22T10:45:00.000Z"
  },
  "summary": {
    "reversals": 2,
    "applications": 2,
    "netStockChange": -2,
    "netCostChange": -500
  }
}
```

**Example - Fixing Quantity Discrepancy:**
```javascript
// Scenario: GRN posted with 100 units, but only received 95
const changes = {
  itemUpdates: [
    {
      productId: productId,
      quantity: 95,  // Corrected from 100
      cost: 100
    }
  ],
  reason: "Physical count revealed 95 units received, not 100"
};

try {
  const response = await fetch(`/api/grn/${grnId}/edit-posted`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  });

  const { grn, summary } = await response.json();
  
  console.log(`✅ Stock adjustment`);
  console.log(`   Reversed: ${summary.reversals} items`);
  console.log(`   Applied: ${summary.applications} items`);
  console.log(`   Net change: ${summary.netStockChange} units`);
  
} catch (error) {
  console.error(`❌ Edit failed: ${error.message}`);
}
```

**Process Flow:**
```
1. Validate requ❌est
2. Find GRN & products
3. PHASE 1: Reverse
   - Decrease CurrentStock
   - Mark batches as REVERSED
   - Record reversal movements
4. PHASE 2: Apply
   - Increase CurrentStock with new qty
   - Create new batch records
   - Record new movements
5. Update GRN document
6. Create audit logs
```

---

### 4. Delete Line Items

**DELETE** `/api/grn/:id/line-items`

Remove specific items from GRN (handles stock reversal if posted).

**Request Body:**
```json
{
  "productIds": ["69beef0d228dfd0cc59b9fcc", "69beef0d228dfd0cc59b9fdd"],
  "reason": "Items not needed - vendor not shipping"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 line items deleted",
  "grn": { ... },
  "deletedCount": 2
}
```

**Example:**
```javascript
const productIdsToDelete = [
  "69beef0d228dfd0cc59b9fcc",
  "69beef0d228dfd0cc59b9fdd"
];

const response = await fetch(`/api/grn/${grnId}/line-items`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productIds: productIdsToDelete,
    reason: "Items substituted with different models"
  })
});

const { deletedCount } = await response.json();
console.log(`✅ Deleted ${deletedCount} items and reversed stock`);
```

**What Happens:**
- If GRN is **Draft**: Items removed, no stock impact
- If GRN is **Posted**: Stock automatically reversed, then items removed

---

### 5. Add Line Items

**POST** `/api/grn/:id/line-items/add`

Add new items to existing GRN (handles stock update if posted).

**Request Body:**
```json
{
  "items": [
    {
      "productId": "69beef0d228dfd0cc59b9fcc",
      "quantity": 5,
      "cost": 100
    },
    {
      "productId": "69beef0d228dfd0cc59b9fdd",
      "quantity": 10,
      "cost": 95
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 items added to GRN",
  "grn": { ... },
  "addedItems": [
    {
      "productId": "...",
      "itemCode": "PROD-001",
      "quantity": 5,
      "cost": 100
    }
  ]
}
```

**Example:**
```javascript
const newItems = [
  {
    productId: "69beef0d228dfd0cc59b9fcc",
    quantity: 5,
    cost: 100
  }
];

const response = await fetch(`/api/grn/${grnId}/line-items/add`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: newItems })
});

const { addedItems } = await response.json();
console.log(`✅ Added ${addedItems.length} items`);

// If GRN was posted, stock is automatically updated
// If GRN is draft, items added to GRN for next posting
```

**Behavior:**
- **Draft GRN**: Items added for future posting (no stock change)
- **Posted GRN**: Items added AND stock immediately updated

---

### 6. Get Edit History

**GET** `/api/grn/:id/edit-history`

Retrieve complete history of all edits made to a GRN.

**Response:**
```json
{
  "success": true,
  "grnId": "69bf7feeabf6a5c16cb2a7eb",
  "editCount": 3,
  "history": [
    {
      "_id": "...",
      "entityId": "69bf7feeabf6a5c16cb2a7eb",
      "entityType": "GRN",
      "userId": { "name": "Admin", "email": "admin@..." },
      "action": "POSTED_EDIT",
      "timestamp": "2026-03-22T10:45:00.000Z",
      "changes": {
        "before": { "totalQty": 40, "totalCost": 4000 },
        "after": { "totalQty": 42, "totalCost": 4200 },
        "reversal": { "count": 1, "totalQuantity": 40 },
        "reason": "Quantity correction due to..."
      }
    }
  ]
}
```

**Example:**
```javascript
const response = await fetch(`/api/grn/${grnId}/edit-history`);
const { history, editCount } = await response.json();

console.log(`GRN has been edited ${editCount} times:`);
history.forEach(entry => {
  console.log(`  ${entry.timestamp}: ${entry.action} by ${entry.userId.name}`);
  console.log(`    Reason: ${entry.changes.reason}`);
  console.log(`    Before: ${entry.changes.before.totalQty} units`);
  console.log(`    After: ${entry.changes.after.totalQty} units`);
});
```

---

## Practical Examples

### Scenario 1: Fix Incorrect Unit Price

**Situation**: GRN posted with $100/unit, but should be $95/unit

**Solution**:
```javascript
const fixedItems = [
  {
    productId: "69beef0d228dfd0cc59b9fcc",
    quantity: 42,  // Same quantity
    cost: 95  // Corrected cost: $95 instead of $100
  }
];

const response = await fetch(`/api/grn/${grnId}/edit-posted`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemUpdates: fixedItems,
    reason: "Unit cost correction: Invoice shows $95/unit, not $100/unit"
  })
});

// ✅ Stock stays same (quantity unchanged)
// ✅ Cost recalculated: 42 × $95 = $3,990 (was $4,200)
// ✅ GL entries will be adjusted
```

---

### Scenario 2: Correct Received Quantity

**Situation**: GRN shows 100 units received, but physical count reveals 95

**Solution**:
```javascript
const correctedItems = [
  {
    productId: "69beef0d228dfd0cc59b9fcc",
    quantity: 95,  // Corrected from 100
    cost: 100
  }
];

const response = await fetch(`/api/grn/${grnId}/edit-posted`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemUpdates: correctedItems,
    reason: "Physical count correction: 95 units received, not 100"
  })
});

const { grn, summary } = await response.json();

// ✅ Phase 1 reversal: Stock decreases by 100
// ✅ Phase 2 application: Stock increases by 95
// ✅ Net effect: Stock decreased by 5 units
// ✅ Cost: 95 × $100 = $9,500 (was $10,000)
```

---

### Scenario 3: Remove Defective Items

**Situation**: 5 of 100 units received are defective, need to remove from GRN

**Solution**:
```javascript
const response = await fetch(`/api/grn/${grnId}/line-items`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productIds: ["69beef0d228dfd0cc59b9fcc"],
    reason: "Remove from GRN - 5 units defective, returning to vendor"
  })
});

// OR more controlled: Adjust quantity instead
const correctedItems = [
  {
    productId: "69beef0d228dfd0cc59b9fcc",
    quantity: 95,  // Reduced from 100
    cost: 100
  }
];

// Then mark 5 units as damaged separately
```

---

### Scenario 4: Split Receipt (Multi-day Delivery)

**Situation**: GRN created for 100 units, but only 30 arrived on day 1, 70 on day 2

**Solution**:
```javascript
// Day 1: Post GRN as draft first
// Day 2: Add only 30 units to GRN and post

// Day 3: When 70 more units arrive, add them
const additionalItems = [
  {
    productId: "69beef0d228dfd0cc59b9fcc",
    quantity: 70,
    cost: 100
  }
];

const response = await fetch(`/api/grn/${grnId}/line-items/add`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: additionalItems })
});

// ✅ Stock automatically updated: +70 units
// ✅ GRN now reflects total: 100 units
// ✅ Edit history shows phased receipts
```

---

## Validation & Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot reverse: Product has been partially consumed` | Stock used by sales after GRN | Cannot edit quantities if sold out; only price adjustments allowed |
| `Product not found` | Invalid productId | Verify product exists before editing |
| `GRN not found` | Invalid grnId | Check GRN ID |
| `Cannot edit GRN with status: Rejected` | GRN rejected | Rejected GRNs are locked |
| `itemUpdates array is required` | Missing request body field | Include itemUpdates array in request |

### Pre-Edit Validation

**Always check editability first:**
```javascript
const { canEdit, reason } = await fetch(`/api/grn/${grnId}/editability`).then(r => r.json());

if (!canEdit) {
  throw new Error(`Cannot edit: ${reason}`);
}

// If canEdit=true, proceed with appropriate endpoint
if (status === 'Draft') {
  // Use /edit-draft
} else if (status === 'Received') {
  // Use /edit-posted with special consideration for consumed stock
}
```

---

## Performance Considerations

### Two-Phase Edit (Posted GRN)

- **Phase 1 (Reversal)**: ~100-500ms per item (DB updates + stock movements)
- **Phase 2 (Application)**: ~100-500ms per item (DB updates + recalculation)
- **Total**: ~500ms - 5sec depending on item count

**Optimization Tips:**
1. Batch edits (multiple items) whenever possible
2. Avoid editing GRNs during high-traffic hours
3. Monitor audit logs for performance patterns

---

## Integration Points

### Frontend Integration

**Step 1: Check Editability**
```javascript
const validateGRNEdit = async (grnId) => {
  const { canEdit, reason } = await fetch(`/api/grn/${grnId}/editability`).then(r => r.json());
  return { canEdit, reason };
};
```

**Step 2: Render Edit UI**
```javascript
{canEdit && <GRNEditForm grnId={grnId} status={status} />}
{!canEdit && <Alert message={`Cannot edit: ${reason}`} type="warning" />}
```

**Step 3: Handle Edits**
```javascript
const handleGRNEdit = async (grnId, changes) => {
  const endpoint = status === 'Draft' ? '/edit-draft' : '/edit-posted';
  
  const response = await fetch(`/api/grn/${grnId}${endpoint}`, {
    method: 'PATCH',
    body: JSON.stringify(changes)
  });
  
  if (!response.ok) {
    ShowError(`Edit failed: ${response.statusText}`);
  }
};
```

### Backend Integration

**In your GRN controller:**
```javascript
import GRNEditManager from '../services/GRNEditManager.js';
import grnEditRoutes from '../routes/grnEditRoutes.js';

// Register routes
app.use('/api/grn', grnEditRoutes);

// Or embed in existing GRN routes
router.patch('/:id/edit-draft', (req, res) => {
  const result = await GRNEditManager.editDraftGRN(...);
});
```

---

## Audit Trail & Compliance

### What Gets Tracked

✅ **Every edit is recorded with:**
- User who made the edit (userId)
- Timestamp
- Type of edit (DRAFT_EDIT, POSTED_EDIT, DELETE_ITEMS, ADD_ITEMS)
- Before/after values
- Reason for change
- Stock reversals & applications (if posted)
- Execution time

### Accessing Audit Logs

```javascript
// Via GRNEditManager
const history = await GRNEditManager.getEditHistory(grnId);

// Via API
GET /api/grn/:id/edit-history

// Via Database (ActivityLog collection)
db.activity_logs.find({
  entityId: ObjectId(...),
  entityType: "GRN",
  action: { $in: ["DRAFT_EDIT", "POSTED_EDIT", ...] }
})
```

---

## Troubleshooting

### GRN Won't Edit After Posting

**Problem**: Edit returns 409 or "Cannot update received GRNs"

**Check:**
1. Is GRN status "Received" (posted)?
2. Have any items been sold? (Check CurrentStock.allocatedQuantity)
3. Is GRN in "Verified" status? (Might be locked)

**Fix:**
- Use `GET /api/grn/:id/editability` to understand constraints
- If stock consumed, try price-only adjustments instead
- Contact admin if GRN status seems wrong

---

## Files References

- **Service**: [GRNEditManager.js](server/modules/accounting/services/GRNEditManager.js)
- **Routes**: [grnEditRoutes.js](server/modules/accounting/routes/grnEditRoutes.js)
- **Models**: [Grn.js](server/Models/Grn.js), [CurrentStock.js](server/Models/CurrentStock.js)
- **Audit**: [ActivityLog.js](server/Models/ActivityLog.js)
- **Stock Tracking**: [StockHistoryManager.js](server/utils/StockHistoryManager.js)

---

## Next Steps

1. ✅ Register routes in main server.js
2. ✅ Create frontend edit form component
3. ✅ Add edit buttons to GRN detail view
4. ✅ Test all scenarios (draft/posted edits)
5. ✅ Monitor performance & audit logs
6. ✅ Document business rules for your team
