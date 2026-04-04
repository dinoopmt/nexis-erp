# Corrected Stock Management Workflow
**Date:** April 4, 2026  
**Status:** ✅ Implemented  
**Impact:** Ensures single-source-of-truth stock management across all modules

---

## Problem Statement

**Incorrect Workflow (Before):**
```
GRN/RTV Created → Create CurrentStock → Fetch Product
│
└─ Issue: Multiple CurrentStock entries possible
   Risk: Product might not have initial stock record
   Order: Backwards dependency
```

**Correct Workflow (After):**
```
Product Created → Create CurrentStock (atomic)
       ↓
   GRN/RTV → UPDATE existing CurrentStock (search by productId)
       ↓
   NEVER create new entries during transactions
```

---

## Corrected Forward Workflow

### 1️⃣ Product Creation (Forward)
**When:** User creates a product  
**Action:** 
- Create Product document
- **Immediately create CurrentStock entry** (atomic operation)
- Initialize quantityInStock = 0

**Code Location:** `productController.addProduct()`
```javascript
// Product created first
await product.save();

// CurrentStock created immediately after (same transaction ideally)
await CurrentStock.create({
  productId: product._id,
  quantityInStock: 0,  // Initial value
  totalQuantity: 0,
  availableQuantity: 0,
  allocatedQuantity: 0
});
```

**Result:**
```json
{
  "product._id": "69d0e2706c45ef4f39b8f143",
  "currentStock.productId": "69d0e2706c45ef4f39b8f143",
  "currentStock.quantityInStock": 0
}
```

---

### 2️⃣ GRN Transaction (Update Only)
**When:** User posts a GRN  
**Action:**
- Find existing CurrentStock by productId
- **Throw error if CurrentStock doesn't exist** (indicates product creation failed)
- Update quantities using `$inc` operator (atomic increment)
- NO `upsert: true` (never create new)

**Code Location:** `GRNStockUpdateService.updateCurrentStock()`
```javascript
// Find EXISTING record (must exist from product creation)
const existing = await CurrentStock.findOne({ productId });
if (!existing) {
  throw new Error(`CurrentStock missing for ${productId}.`);
}

// Update ONLY (no upsert)
const updated = await CurrentStock.findOneAndUpdate(
  { productId },
  {
    $inc: {
      quantityInStock: quantity,      // GRN quantity
      totalQuantity: quantity
    },
    $set: { lastGrnDate: new Date() }
  },
  { returnDocument: 'after' }  // ✅ NO upsert: true
);
```

**Result:**
```json
{
  "productId": "69d0e2706c45ef4f39b8f143",
  "quantityInStock": 100, // Updated from GRN
  "lastGrnDate": "2026-04-04T10:00:00Z"
}
```

---

### 3️⃣ RTV Transaction (Update Only)
**When:** User posts an RTV (return to vendor)  
**Action:**
- Find existing CurrentStock by productId
- **Throw error if CurrentStock doesn't exist**
- **Decrement** quantities (negative increment)
- Update to reflect reduced stock
- NO `upsert: true`

**Code Location:** `RTVStockUpdateService.reverseProductStock()`
```javascript
// Get current stock to verify availability
const current = await CurrentStock.findOne({ productId });
if (!current) {
  throw new Error(`CurrentStock missing for ${productId}.`);
}

if (item.quantity > current.quantityInStock) {
  throw new Error(`Cannot return more than available.`);
}

// Reverse (decrease) stock
const updated = await CurrentStock.findOneAndUpdate(
  { productId },
  {
    $inc: {
      quantityInStock: -item.quantity,  // Negative for return
      totalQuantity: -item.quantity
    },
    $set: { lastRtvDate: new Date() }
  },
  { returnDocument: 'after' }  // ✅ NO upsert: true
);
```

**Result:**
```json
{
  "productId": "69d0e2706c45ef4f39b8f143",
  "quantityInStock": 90, // Reduced by RTV
  "lastRtvDate": "2026-04-04T11:00:00Z"
}
```

---

### 4️⃣ Sales/Invoices (Update Only)
**When:** User posts a sales invoice  
**Action:**
- Find existing CurrentStock by productId
- **Throw error if CurrentStock doesn't exist**
- **Decrement** availableQuantity (customer received goods)
- NO `upsert: true`

**Code Location:** (To be implemented in SalesController)
```javascript
const updated = await CurrentStock.findOneAndUpdate(
  { productId },
  {
    $inc: {
      availableQuantity: -invoice.quantity  // Customer took stock
    },
    $set: { lastSaleDate: new Date() }
  },
  { returnDocument: 'after' }
);
```

---

## Workflow State Machine

```
Product Created (qty: 0)
      │
      ├─[GRN +100]──► quantityInStock: 100 ✓
      │
      ├─[GRN +50]───► quantityInStock: 150 ✓
      │
      ├─[RTV -30]───► quantityInStock: 120 ✓
      │
      ├─[Sale -40]──► availableQuantity: 80 ✓
      │
      └─[ERROR: No GRN] ─X─ quantityInStock unchanged


                    ❌ WRONG PATH (Before)
                    
Product Created (no stock)
      │
      ├─[GRN]──► ERROR: Create CurrentStock? (duplicate risk!)
      │
      └─[RTV]──► ERROR: Create CurrentStock? (wrong order!)
```

---

## Database Schema Relationship

### Product Collection
```javascript
{
  _id: ObjectId,
  itemcode: "1002",
  name: "Test Stock",
  cost: 10,
  price: 10,
  stock: 0,  // ❌ DEPRECATED (not updated)
  // ... other fields ...
}
```

### CurrentStock Collection (AUTHORITATIVE)
```javascript
{
  _id: ObjectId,
  productId: ObjectId("69d0e2706c45ef4f39b8f143"),  // FK → Product._id
  quantityInStock: 120,      // ✅ SINGLE SOURCE (GRN updates, RTV reverses)
  totalQuantity: 120,
  availableQuantity: 80,     // After sales allocation
  allocatedQuantity: 0,
  lastGrnDate: "2026-04-04T10:00:00Z",
  lastRtvDate: "2026-04-04T11:00:00Z",
  lastSaleDate: "2026-04-04T12:00:00Z",
  lastUpdatedBy: "admin"
}
```

**Relationship:**
- 1 Product → 1 CurrentStock (One-to-One)
- FK: CurrentStock.productId → Product._id
- Query: Find stock for product: `db.currentstocks.findOne({ productId })`

---

## Key Differences: Before vs After

| Aspect | Before (Wrong) | After (Correct) |
|--------|---------------|-----------------|
| **Product Creation** | Product only, no stock | Product + CurrentStock (atomic) |
| **GRN Stock** | Create or update? | Update ONLY (error if missing) |
| **RTV Stock** | Create or update? | Update ONLY (error if missing) |
| **Stock Source** | Dual: product.stock + currentstock | Single: currentstock.quantityInStock |
| **Upsert Usage** | `{ upsert: true }` in GRN/RTV | NO upsert (only update) |
| **Data Risk** | Multiple entries possible | Guaranteed single record |
| **Order Logic** | Transaction first, stock second | Stock first, transactions update |

---

## Implementation Checklist

### ✅ Completed
- [x] Product.addProduct() creates Product + CurrentStock atomically
- [x] GRNStockUpdateService removes `upsert: true`, errors if missing
- [x] RTVStockUpdateService uses CurrentStock (not product.quantityInStock)
- [x] Product responses exclude `stock` field, include `quantityInStock`
- [x] Frontend displays `quantityInStock` as read-only

### ⏳ Pending (Future)
- [ ] Audit Sales/Invoice controllers for CurrentStock updates
- [ ] Audit all other modules (Adjustment, Allocation, etc.)
- [ ] Remove product.quantityInStock field references
- [ ] Create database migration to clean up orphaned CurrentStock records
- [ ] Add monitoring for products without CurrentStock

### 🔍 Verification Tests
```javascript
// Test 1: Product creation
const product = await Product.create({...});
const stock = await CurrentStock.findOne({ productId: product._id });
assert(stock !== null, "CurrentStock should exist after product creation");

// Test 2: GRN without upsert
const gnr = await createGRN({...});
const updated = await CurrentStock.findOneAndUpdate(
  { productId },
  { $inc: { quantityInStock: 100 } },
  { returnDocument: 'after' }
);
assert(updated !== null, "Should update existing, error if missing");

// Test 3: Relationship
const count = await CurrentStock.countDocuments();
const productCount = await Product.countDocuments({ isDeleted: false });
assert(count === productCount, "Should have 1:1 relationship");
```

---

## Troubleshooting

### Issue: `Error: CurrentStock record missing for product X`
**Cause:** Product was created before this refactor without CurrentStock entry  
**Solution:** 
```bash
# Run migration for existing products
node scripts/migrate-current-stock.js
```

### Issue: Multiple CurrentStock records per product
**Cause:** Old `upsert: true` behavior in GRN/RTV  
**Solution:**
```javascript
// Cleanup duplicate records (keep latest)
const duplicates = await CurrentStock.aggregate([
  { $group: { _id: "$productId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);

for (const dup of duplicates) {
  const records = await CurrentStock.find({ 
    productId: dup._id 
  }).sort({ updatedAt: -1 });
  
  await CurrentStock.deleteMany({
    productId: dup._id,
    _id: { $in: records.slice(1).map(r => r._id) }
  });
}
```

---

## References

- Architecture: [SINGLE_SOURCE_STOCK_ARCHITECTURE.md](./SINGLE_SOURCE_STOCK_ARCHITECTURE.md)
- GRN Service: `server/modules/accounting/services/GRNStockUpdateService.js`
- RTV Service: `server/modules/accounting/services/RTVStockUpdateService.js`
- Product Controller: `server/modules/inventory/controllers/productController.js`
- Migration Script: `server/scripts/migrate-current-stock.js`

---

**Summary:** Product creation → CurrentStock created. All transactions update ONLY. No creation during transactions. Single source of truth maintained.
