# GRN Stock Update Implementation - Complete Guide

## Overview

This document describes the complete stock update process that occurs when a GRN (Goods Receipt Note) is posted. The system automatically handles:

1. **Stock Quantity Updates** - Update product inventory
2. **Batch Creation** - Create batch records with expiry tracking  
3. **Product Cost Updates** - Calculate new cost using FIFO/LIFO/WAC
4. **Unit Variant Cost Updates** - Update variant costs proportionally
5. **Stock Movement Logging** - Record all movements for audit trail
6. **Activity Audit Logs** - Create comprehensive activity logs

---

## 1. Architecture

### Service Layer: `GRNStockUpdateService`

**Location:** `server/modules/accounting/services/GRNStockUpdateService.js`

**Entry Point:** `processGrnStockUpdate(grnData, userId)`

This is the main orchestrator that coordinates all stock updates:

```
GRN Posted
  ↓
postGrn() endpoint
  ↓
GRNStockUpdateService.processGrnStockUpdate()
  ├─ For each GRN line item:
  │  ├→ updateProductStock()
  │  ├→ createOrUpdateBatch()
  │  ├→ updateProductCost()
  │  ├→ updateUnitVariantCosts()
  │  ├→ createStockMovement()
  │  └→ createAuditLog()
  ↓
Return comprehensive results
```

---

## 2. Process Flow

### Step 1: Update Product Stock Quantity

**Function:** `updateProductStock(product, item, grnData)`

**What It Does:**
- Adds received quantity to `product.quantityInStock`
- Sets `lastStockUpdate` timestamp
- Updates low stock alert if quantity falls below `minStock`
- Optionally applies FOC (Free Of Charge) quantity

**Example:**
```javascript
Before GRN:  product.quantityInStock = 100
Item received: 50 units
After GRN:   product.quantityInStock = 150
```

**Output:**
```javascript
{
  itemCode: "PROD-001",
  itemName: "Product Name",
  quantityBefore: 100,
  quantityReceived: 50,
  focQuantity: 0,
  quantityAfter: 150,
  uom: "PC"
}
```

---

### Step 2: Create or Update Batch Records

**Function:** `createOrUpdateBatch(product, item, grnData)`

**Two Models Used:**

#### A. **StockBatch** (For expiry-tracked products)
- Used if `product.trackExpiry === true`
- Fields: batchNumber, manufacturingDate, expiryDate, quantity, costPerUnit
- Auto-calculates: shelfLifeDays, daysToExpiry, batchStatus
- Statuses: ACTIVE, EXPIRING_SOON, EXPIRED, CLOSED

```javascript
{
  productId: ObjectId,
  batchNumber: "GRN-001-BATCH",
  manufacturingDate: "2024-01-01",
  expiryDate: "2025-01-01",
  quantity: 50,
  usedQuantity: 0,
  costPerUnit: 100,
  supplier: "ABC Supplies",
  referenceNumber: "GRN-001",
  batchStatus: "ACTIVE"
}
```

#### B. **InventoryBatch** (For non-expiry-tracked products)
- Used if `product.trackExpiry === false`
- Fields: batchNumber, purchasePrice, quantity, quantityRemaining
- Simpler structure, no date calculations
- Statuses: ACTIVE, CLOSED, EXPIRED

```javascript
{
  productId: ObjectId,
  batchNumber: "GRN-001-BATCH",
  purchasePrice: 100,
  quantity: 50,
  quantityRemaining: 50,
  purchaseDate: "2024-03-18",
  vendorId: ObjectId,
  expiryDate: null
}
```

**Output:**
```javascript
{
  batchId: "507f1f77bcf86cd799439012",
  batchNumber: "GRN-001-BATCH",
  model: "StockBatch",
  quantity: 50,
  expiryDate: "2025-01-01",
  costPerUnit: 100
}
```

---

### Step 3: Update Product Cost

**Function:** `updateProductCost(product, item, grnData)`

**Calculation Methods:**

#### FIFO (First In, First Out)
```
New Cost = Current Item Unit Cost
(Oldest batches used first, cost stays as-is)
```

#### LIFO (Last In, First Out)
```
New Cost = Current Item Unit Cost
(Latest batches used first, cost updates to latest)
```

#### WAC (Weighted Average Cost)
```
New Cost = (CurrentStock × OldCost + NewQuantity × NewCost) / (CurrentStock + NewQuantity)

Example:
Old Stock:    100 units @ AED 50 = AED 5,000
New Receipt:  50 units @ AED 60 = AED 3,000
New WAC:      (5,000 + 3,000) / (100 + 50) = 8,000 / 150 = AED 53.33
```

**Fields Updated:**
- `product.cost` - New average/latest cost
- `product.costIncludeVat` - If item has tax
- `product.lastCostUpdate` - Timestamp
- `product.lastCostUpdateBy` - User
- `product.costingMethod` - Method used

**Output:**
```javascript
{
  productId: "507f1f77bcf86cd799439011",
  itemCode: "PROD-001",
  costingMethod: "WAC",
  oldCost: 50.00,
  newCost: 53.33,
  itemUnitCost: 60.00,
  difference: 3.33
}
```

---

### Step 4: Update Unit Variant Costs

**Function:** `updateUnitVariantCosts(product, item, newProductCost)`

**What It Does:**
- If product has packing units (variants), update each variant's cost
- Cost calculation: `newProductCost × conversionFactor`
- Also updates margin amount if margin % exists

**Example:**
```
Product: "Medicine Tablets"
Base Cost (updated): AED 10

Variants:
- Single Box (1x): 10 × 1 = AED 10
- Outer Box (10x): 10 × 10 = AED 100
- Carton (100x): 10 × 100 = AED 1,000

If margin is 25%:
- Single Box: margin = 10 × 0.25 = AED 2.50
- Outer Box: margin = 100 × 0.25 = AED 25
- Carton: margin = 1,000 × 0.25 = AED 250
```

**Output:**
```javascript
{
  productId: "507f1f77bcf86cd799439011",
  itemCode: "PROD-001",
  variantsUpdated: 3,
  updates: [
    {
      unitName: "Single",
      factor: 1,
      oldCost: 9.50,
      newCost: 10.00
    },
    {
      unitName: "Outer",
      factor: 10,
      oldCost: 95.00,
      newCost: 100.00
    },
    {
      unitName: "Carton",
      factor: 100,
      oldCost: 950.00,
      newCost: 1000.00
    }
  ]
}
```

---

### Step 5: Stock Movement Logging

**Function:** `createStockMovement(product, item, batchRecord, grnData, userId)`

**Model:** `StockMovement`

**Fields:**
- `productId` - Which product
- `batchId` - Related batch
- `movementType` - "INBOUND" for GRN
- `quantity` - Quantity moved
- `unitCost` - Cost per unit
- `totalAmount` - quantity × unitCost
- `reference` - GRN number
- `referenceType` - "PURCHASE_ORDER"
- `costingMethodUsed` - FIFO/LIFO/WAC
- `documentDate` - GRN date
- `createdBy` - User

**Database Record:**
```javascript
{
  productId: ObjectId,
  batchId: ObjectId,
  movementType: "INBOUND",
  quantity: 50,
  unitCost: 100,
  totalAmount: 5000,
  reference: "GRN-2024-001",
  referenceType: "PURCHASE_ORDER",
  costingMethodUsed: "WAC",
  documentDate: "2024-03-18",
  notes: "GRN Receipt - GRN-2024-001 from ABC Supplies"
}
```

**Purpose:** Audit trail for inventory movements, cost analysis, FIFO valuation

---

### Step 6: Activity Audit Logging

**Function:** `createAuditLog(product, item, grnData, userId, stockUpdate, costUpdate)`

**Model:** `ActivityLog`

**Logged Information:**
- Who made the change (userId, username)
- What changed (stock quantity, product cost)
- When (timestamp)
- Which GRN
- Before/after values
- Associated vendor

**Record:**
```javascript
{
  userId: ObjectId,
  username: "user123",
  action: "CREATE",
  module: "Inventory",
  resource: "Stock - GRN Receipt",
  description: "Stock received for PROD-001: +50 units from GRN GRN-2024-001",
  changes: {
    action: "GRN_STOCK_RECEIVED",
    grnNumber: "GRN-2024-001",
    vendor: "ABC Supplies",
    quantityBefore: 100,
    quantityAfter: 150,
    oldCost: 50,
    newCost: 53.33
  },
  status: "success",
  timestamp: "2024-03-18T10:30:00Z"
}
```

**Purpose:** Complete audit trail for compliance, debugging, traceability

---

## 3. Complete GRN Posting Flow

```
┌─────────────────────────────────────┐
│ POST /api/v1/grn/:id/post           │
│ { "createdBy": "user123" }          │
└────────────┬────────────────────────┘
             │
             ↓
    ┌────────────────────┐
    │  Fetch GRN + Items │
    └────────┬───────────┘
             │
             ↓
    ┌────────────────────────────┐
    │ Phase 1: ACCOUNTING ENTRIES│
    │ ✓ Main journal (items)     │
    │ ✓ Shipping journal (if >0) │
    └────────┬───────────────────┘
             │
             ↓
    ┌───────────────────────────────┐
    │ Phase 2: STOCK UPDATES        │
    │ For each GRN item:            │
    │ ├─ Update qty               │
    │ ├─ Create batch (+ expiry)  │
    │ ├─ Calc new cost (FIFO/WAC) │
    │ ├─ Update unit variants     │
    │ ├─ Log stock movement       │
    │ └─ Create audit log         │
    └────────┬────────────────────┘
             │
             ↓
    ┌───────────────────────┐
    │ Update GRN Status:    │
    │ POSTED                │
    └────────┬──────────────┘
             │
             ↓
    ┌─────────────────────────────────────┐
    │ Return Comprehensive Response:      │
    │ ├─ GRN status                       │
    │ ├─ Accounting entries created       │
    │ ├─ Stock updates summary            │
    │ ├─ Batch records created            │
    │ ├─ Cost updates applied             │
    │ ├─ Variant updates                  │
    │ ├─ Audit logs created               │
    │ └─ Any errors encountered           │
    └──────────────────────────────────────┘
```

---

## 4. API Endpoint & Response

### Request
```bash
POST /api/v1/grn/:id/post
Content-Type: application/json

{
  "createdBy": "user123"
}
```

### Response (Success: 200)
```json
{
  "message": "GRN posted successfully with all updates",
  "grn": {
    "grnNumber": "GRN-2024-001",
    "status": "Posted",
    "netTotal": 5000,
    "shippingCost": 200,
    "totalItems": 3
  },
  "accounting": {
    "journals": {
      "items": {
        "voucherNumber": "JV-00001",
        "status": "DRAFT",
        "totalAmount": 5000
      },
      "shipping": {
        "voucherNumber": "JV-00002",
        "status": "DRAFT",
        "totalAmount": 200
      }
    }
  },
  "inventory": {
    "itemsProcessed": 3,
    "batchesCreated": 3,
    "costUpdates": 3,
    "variantUpdates": 2,
    "auditLogs": 3,
    "summary": {
      "updatedProducts": 3,
      "errors": 0
    }
  },
  "errors": null,
  "timestamp": "2024-03-18T10:30:00Z"
}
```

### Response (With Errors: 200)
```json
{
  "message": "GRN posted successfully with all updates",
  "inventory": {
    "itemsProcessed": 2,
    "batchesCreated": 2,
    "costUpdates": 2,
    "variantUpdates": 1,
    "summary": {
      "updatedProducts": 2,
      "errors": 1
    }
  },
  "errors": [
    {
      "type": "STOCK",
      "itemCode": "PROD-003",
      "error": "Product not found"
    }
  ]
}
```

---

## 5. Data Models Updated

### AddProduct (Product)
**Updated Fields:**
- `quantityInStock` - ℹ️ Integer | Increased by GRN items
- `cost` - 💰 Number | New cost from calculation
- `costIncludeVat` - 💰 Number | If item has tax
- `packingUnits[].cost` - 💰 Number | Updated for each variant
- `packingUnits[].marginAmount` - 💰 Number | Recalculated
- `lastStockUpdate` - 📅 Date | Timestamp
- `lastStockUpdateBy` - 👤 String | User who updated
- `lastCostUpdate` - 📅 Date | Timestamp
- `lastCostUpdateBy` - 👤 String | User who updated
- `lowStockAlert` - ⚠️ Boolean | If stock < minStock
- `costingMethod` - 📊 String | "FIFO", "LIFO", or "WAC"

### StockBatch (New Record Created)
**Fields:**
- `productId`, `batchNumber`, `manufacturingDate`, `expiryDate`
- `quantity`, `usedQuantity`, `costPerUnit`
- `batchStatus` → "ACTIVE"
- Auto-calculated: `shelfLifeDays`, `daysToExpiry`, `availableQuantity`

### InventoryBatch (New Record Created)
**Fields:**
- `productId`, `batchNumber`, `purchasePrice`, `quantity`
- `quantityRemaining`, `purchaseDate`, `vendorId`
- `expiryDate`, `invoiceNumber`, `batchStatus` → "ACTIVE"

### StockMovement (New Record Created)
**Fields:**
- Reference to batch, product, GRN
- Movement type: "INBOUND"
- Cost calculation method used (FIFO/LIFO/WAC)
- Complete audit trail

### ActivityLog (New Record Created)
**Fields:**
- User action details
- Changes made
- Before/after values
- Status: "success"

---

## 6. Error Handling

### Non-Critical Errors (Don't Stop GRN Posting)
```
- Batch creation failure
- Audit log creation failure
- Stock movement creation failure
```

**Behavior:** Logged in response.errors, GRN still posted

### Critical Errors (Return 500)
```
- Product not found
- Cost calculation failure
- Stock update failure
```

**Behavior:** Returns error response, GRN not posted

---

## 7. Costing Method Details

### FIFO Costing
```
Pros: Best for perishable goods, realistic for inflation
Cons: Not average cost
Use when: Product shelf-life critical, inflation expected

Cost = Latest receipt cost
Old batches consumed first (by date or expiry)
```

### LIFO Costing
```
Pros: Good for fixed-price items
Cons: Can defer older stock indefinitely
Use when: Price-stable products, LIFO allowed in jurisdiction

Cost = Latest receipt cost
Latest batches consumed first
```

### WAC (Weighted Average Cost)
```
Pros: Smooths cost fluctuations, balanced approach
Cons: Less suitable for perishables
Use when: General manufacturing, most jurisdictions

Cost = (Previous Inventory + New Receipt) / Total Quantity
Recalculated every GRN receipt
```

---

## 8. Expiry Tracking

### For Expiry-Tracked Products (trackExpiry = true)

**At GRN Receipt:**
- ✅ StockBatch created with manufacturingDate & expiryDate
- ✅ Auto-calculates shelfLifeDays
- ✅ Auto-calculates daysToExpiry
- ✅ Auto-sets batchStatus based on dates

**Auto-Status Updates:**
- ACTIVE: Normal inventory
- EXPIRING_SOON: Within 30 days of expiry
- EXPIRED: Past expiry date
- CLOSED: Fully consumed (usedQuantity = quantity)

### For Non-Expiry Products (trackExpiry = false)

**At GRN Receipt:**
- ✅ InventoryBatch created with simple structure
- ✅ No date calculations
- ✅ Status only: ACTIVE, CLOSED, EXPIRED (manual only)

---

## 9. Integration Points

### 1. From GRN Form (Frontend)
```javascript
// When user clicks "Post & Process"
POST /api/v1/grn/:id/post

Response includes:
- Stock updated: ✓
- Batches created: ✓
- Costs calculated: ✓
- Audit logged: ✓
```

### 2. From Purchase Order (Backend)
```javascript
// If auto-creating GRN from PO
postGrn() is called after status validation
All stock updates happen automatically
```

### 3. Inventory Dashboard
```javascript
// Display real-time updates
GET /api/v1/products/:id/stock
Returns: Latest quantities, costs, batches
```

---

## 10. Testing Checklist

- [ ] Create GRN with 3 line items
- [ ] Call POST /api/v1/grn/:id/post
- [ ] Verify product quan updated (added to stock)
- [ ] Verify batch created (StockBatch or InventoryBatch)
- [ ] Verify product cost updated using costing method
- [ ] Verify unit variant costs updated (if variants exist)
- [ ] Verify stock movement recorded
- [ ] Verify audit log created for each item
- [ ] Check GRN status = "Posted"
- [ ] Verify journal entries created (accounting)
- [ ] Test with shipping cost, verify separate journal entry
- [ ] Test with FOC items (Free Of Charge)
- [ ] Test with expiry tracking enabled product
- [ ] Test error handling (missing product, invalid vendor, etc.)
- [ ] Verify response includes all updates summary

---

## 11. File Locations

```
d:\NEXIS-ERP\
├── server\
│   ├── Models\
│   │   ├── AddProduct.js
│   │   ├── StockBatch.js
│   │   ├── InventoryBatch.js
│   │   ├── StockMovement.js
│   │   └── ActivityLog.js
│   ├── services\
│   │   └── CostingService.js
│   └── modules\
│       ├── accounting\
│       │   └── services\
│       │       ├── GRNJournalService.js
│       │       └── GRNStockUpdateService.js    ← NEW
│       └── inventory\
│           └── controllers\
│               └── grnController.js            ← UPDATED
└── Documentation
    └── GRN_STOCK_UPDATE_IMPLEMENTATION.md      ← THIS FILE
```

---

## 12. Performance Considerations

**Time Complexity:**
- Per item: O(1) for stock update, O(1) for batch creation, O(1) for cost calculation
- Per GRN: O(n) where n = number of items

**Estimated Times:**
- 1 item: ~50-100ms
- 5 items: ~250-500ms
- 10 items: ~500ms-1s
- 100 items: ~5-10s

**Optimization Tips:**
- For large GRNs (100+ items), consider batch processing
- Index on productId, vendorId for faster lookups
- Cache product data to avoid repeated queries

---

## 13. Support & Troubleshooting

### Issue: Stock not updating
- Check GRN status is "Posted"
- Verify product ID is valid
- Check quantity in GRN item is > 0
- Review logs for error messages

### Issue: Wrong cost calculated
- Verify costingMethod on product
- Check all previous batches for FIFO/LIFO
- For WAC, verify calculation: (prev inventory + new) / total

### Issue: Batch not created
- Check trackExpiry setting for model selection (StockBatch vs InventoryBatch)
- Verify batchNumber is provided or generateable
- Check expiryDate format if provided

### Issue: Variant costs not updating
- Verify product has packingUnits array
- Check conversionFactor on each unit
- Verify new cost calculated correctly

### Issue: No audit log created
- Check userId is provided
- Review ActivityLog collection
- Verify user exists in User model
