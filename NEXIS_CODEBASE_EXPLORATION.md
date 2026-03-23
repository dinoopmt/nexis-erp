# NEXIS-ERP Codebase Exploration Report
**Date:** March 23, 2026  
**Scope:** GRN Processing, Product Updates, Pricing, and Audit Logging

---

## 1. GRN Create/Edit Endpoints & Product Update Logic

### GRN Routes Location
- **GRN Management Routes**: `server/modules/inventory/routes/` (managed by grnController)
- **GRN Edit Routes**: `server/modules/accounting/routes/grnEditRoutes.js`
- **GRN Controller**: `server/modules/inventory/controllers/grnController.js`

### Key Endpoints

#### GRN Creation Flow
**POST /api/grn/next-number** → Gets next GRN number using sequence table (FIFO)
**POST /api/grn** → Creates new GRN with validation
- Validates items exist
- Checks GRN number uniqueness
- Creates vendor payment entries
- Auto-generates batch numbers if not provided

#### GRN Edit Endpoints (Post-Submission)
**GET /api/grn/:id/editability** 
- Validates if GRN can be edited (Draft vs Posted)
- For Posted GRNs: checks for downstream transactions (vendor payments, sales, returns)
- Returns: `{ canEdit, reason, currentStatus, transactionCheck }`

**PATCH /api/grn/:id/edit-draft**
- Edits Draft GRN (before posting)
- Simple quantity/cost updates without stock reversal
- Calls: `GRNEditManager.editDraftGRN()`

**PATCH /api/grn/:id/edit-posted**
- Edits Posted GRN (after posting/submission)
- Two-phase workflow: reverse existing stock → apply new values
- Calls: `GRNEditManager.editPostedGRN()`
- Body: `{ itemUpdates: [{ productId, quantity, unitCost }], reason }`

**DELETE /api/grn/:id/line-items**
- Removes specific line items from GRN
- Manages stock rollback

---

## 2. Product Master Update Mechanism During GRN Submission

### Stock Update Flow (When GRN Posted)

**Key Service:** `GRNStockUpdateService` (in `server/modules/accounting/services/`)

**Process Steps:**

1. **For Each GRN Item:**
   ```
   For each product in GRN.items:
   ├─ 1. updateProductStock() → Updates quantityInStock
   ├─ 1b. updateCurrentStock() → Updates CurrentStock collection (real-time tracking)
   ├─ 2. createOrUpdateBatch() → Creates InventoryBatch or StockBatch (if expiry-tracked)
   ├─ 3. updateProductCost() → Recalculates cost using costing method
   ├─ 4. updateUnitVariantCosts() → Updates packing unit costs
   ├─ 5. createStockMovement() → Creates audit trail record
   └─ 6. createAuditLog() → Records activity log
   ```

2. **Variant Quantity Handling:**
   - If item purchased via variant (e.g., Outer Box with factor=10):
     - `actualQuantity = item.quantity × item.conversionFactor`
     - Example: 5 Outer Boxes × factor 10 = 50 base units in stock
   - All batch and cost calculations use converted base units

3. **Post-Stock-Update Recalculation:**
   - After all items processed, runs `StockRecalculationHelper.batchRecalculate()`
   - Recalculates `availableQuantity = totalQuantity - allocatedQuantity - damageQuality`
   - Handles pre-save hook bypasses from `$inc` operations

### Product Fields Updated on GRN Post

**Stock Quantity:**
- `product.quantityInStock` → incremented by received quantity
- `product.lastStockUpdate` → current timestamp
- `product.lastStockUpdateBy` → GRN created by user

**Cost Fields:**
- `product.cost` → recalculated per costing method (FIFO/LIFO/WAC)
- `product.costIncludeVat` → cost with tax included (if tax is inclusive)
- `product.lastCostUpdate` → timestamp
- `product.lastCostUpdateBy` → user who triggered update
- `product.costingMethod` → method used for calculation

**Stock Warnings:**
- `product.lowStockAlert` → set if stock < minStock
- `product.lowStockAlertDate` → timestamp when alert triggered

---

## 3. Pricing Levels Calculation Logic

### Product Pricing Structure

**Location:** `server/Models/AddProduct.js`

### Pricing Levels (5-Tier System)
```javascript
pricingLevels: {
  type: Map,
  of: new mongoose.Schema({
    level1: Number,  // Retail
    level2: Number,  // Wholesale A
    level3: Number,  // Wholesale B
    level4: Number,  // Corporate
    level5: Number   // Distributor
  }),
  // Key = pricing line index (0, 1, 2, ...)
  // Value = pricing tier levels for that unit type
}
```

### Calculated Pricing Fields (Per Pricing Line)

**Base Fields (Input):**
- `unit` → Unit type (from UnitType master)
- `factor` → Conversion factor for this unit
- `cost` → Purchase cost

**Derived Fields (Calculated):**
1. **Cost with Tax:**
   - `costIncludeVat = cost × (1 + taxPercent/100)` if tax-in-cost
   - Used for display when tax is inclusive

2. **Margin Amount:**
   - `marginAmount = price - cost`
   - Or manually entered, then recalculates margin %

3. **Margin Percentage:**
   - `marginPercent = (marginAmount / cost) × 100`
   - Or manually entered, then recalculates margin amount and price

4. **Tax Amount:**
   - `taxAmount = cost × taxPercent / 100` (if tax exclusive)
   - `taxAmount = cost - (cost / (1 + taxPercent/100))` (if tax inclusive)

5. **Price (Selling Price):**
   - **If margin % entered:** `price = cost × (1 + marginPercent/100)`
   - **If margin amount entered:** `price = cost + marginAmount`
   - **If price entered directly:** recalculates margins from price

### Pricing Calculation Cases

**Case 1: Cost Changed**
- Updates cost, costIncludeVat
- Recalculates margin amount based on existing price
- Recalculates margin % = (marginAmount / newCost) × 100
- Price stays unchanged (preserves selling price)

**Case 2: Margin % Entered**
- Calculates marginAmount = cost × marginPercent / 100
- Calculates price = cost + marginAmount

**Case 3: Margin Amount Entered**
- Calculates marginPercent = (marginAmount / cost) × 100
- Calculates price = cost + marginAmount

**Case 4: Price Entered Directly**
- Calculates marginAmount = price - cost
- Calculates marginPercent = (marginAmount / cost) × 100

**Case 5: Cost Including Tax Changed**
- Reverses to find actual cost: `cost = costIncludeVat / (1 + taxPercent/100)`
- Then proceeds as Case 1

### Tax Handling

**Tax Type Field:**
- `taxType` → "exclusive", "inclusive", or "notax"
- `taxPercent` → Tax percentage (e.g., 5 for 5% VAT)
- `taxInPrice` → Boolean (true = price includes tax, false = excludes)

**Tax Recalculation:**
- When tax % changes → full pricing recalculation triggered
- When tax-in-price flag toggles → price interpretation changes
- Tax amount always calculated: `taxAmount = cost × taxPercent / 100`

### Current Implementation

**Frontend Calculation Function:** `calculatePricingFields()` in `Product.jsx`
- Single source of truth for pricing logic
- Called by BasicInfoTab on any pricing field change
- Handles all 5 calculation cases
- Supports bidirectional Cost ↔ Price calculations

**Storage:** Pricing levels saved to DB via AddProduct model
- All calculated fields persisted
- Used in sales orders and invoicing

---

## 4. Unit Variant Structure & Cost Calculations

### Packing Units (Unit Variants) Schema

**Location:** `server/Models/AddProduct.js` → `packingUnitSchema`

```javascript
packingUnits: [
  {
    name: String,              // "Single", "Outer", "Carton", etc.
    barcode: String,           // Unique barcode for this unit
    additionalBarcodes: [String], // Multiple barcodes support
    unit: ObjectId,            // Reference to UnitType master
    factor: Number,            // How many base units in this variant
    conversionFactor: Number,  // Explicit factor (e.g., 10 = 1 Box = 10 units)
    
    // Cost fields
    cost: Number,              // Cost for this variant
    costIncludeVat: Number,    // Cost with tax
    
    // Margin fields
    margin: Number,            // Margin % for this variant
    marginAmount: Number,      // Absolute margin amount
    
    // Price & Tax
    price: Number,             // Selling price for this variant
    taxAmount: Number,         // Tax on this variant
    taxInPrice: Boolean        // Price includes tax?
  }
]
```

### Variant Cost Calculation

**During GRN Stock Update:**

1. **Get Conversion Factor:**
   ```
   conversionFactor = item.conversionFactor || 1
   actualQuantity = item.quantity × conversionFactor
   ```
   Example: If buying 5 Outer Boxes with factor 10:
   - actualQuantity = 5 × 10 = 50 base units in stock
   - Batch created with 50 units
   - Cost calculations use 50 units

2. **Update Variant Costs** (after product cost recalculated):
   ```javascript
   // For each packing unit variant:
   variantNewCost = productNewCost × variant.conversionFactor
   
   // Update variant margin if exists:
   if (variant.margin > 0) {
     variant.marginAmount = variantNewCost × variant.margin / 100
   }
   ```

3. **Effective Unit Cost Calculation** (for costing methods):
   ```javascript
   effectiveUnitCost = (itemNetCost - focCost) / actualQuantity
   
   Where:
   - itemNetCost = (quantity × unitCost) - itemDiscount
   - focCost = focQuantity × unitCost (free items)
   - actualQuantity = quantity × conversionFactor (base units)
   ```

### Stock Movement with Variants

- Batch created with actual base unit quantity
- All stock tracking in base units
- Conversion factor captured in batch record for reference
- Example log: "5 Outer Boxes = 50 base units (factor 10)"

---

## 5. Product Audit Logging Mechanism

### ActivityLog Model

**Location:** `server/Models/ActivityLog.js`

```javascript
{
  userId: ObjectId,              // User ID
  username: String,              // Username
  action: String,                // LOGIN, LOGOUT, CREATE, READ, UPDATE, DELETE, EXPORT, IMPORT
  module: String,                // Users, Roles, Sales, Inventory, Accounts, Reports, Settings
  resource: String,              // What was affected: "Stock - GRN Receipt", "Product - Cost Update"
  description: String,           // Human-readable description
  permission: String,            // Permission required
  ipAddress: String,             // IP address of user
  status: String,                // "success", "failed", "pending"
  changes: Mixed,                // Object with before/after or detailed changes
  timestamp: Date                // Default: current date
}
```

### Audit Logging During GRN Processing

**When stock is received (GRN posted):**

1. **For each product item:**
   - Stock update logged with:
     - `action: "CREATE"`
     - `module: "Inventory"`
     - `resource: "Stock - GRN Receipt"`
     - `description: "Stock received for {productCode}: +{quantity} units from GRN {grnNumber}"`
     - `changes: { grnNumber, vendor, stockUpdate, costUpdate }`

2. **Stock Update Details Logged:**
   ```javascript
   {
     productId, itemCode, itemName,
     conversionFactor,
     quantityReceivedInVariant,    // e.g., 5 Outer Boxes
     quantityReceivedInBaseUnits,  // e.g., 50 units
     focQuantity,
     quantityBefore, quantityAfter,
     uom, note
   }
   ```

3. **Cost Update Details Logged:**
   ```javascript
   {
     productId, itemCode,
     conversionFactor,
     quantityInVariants,
     quantityInBaseUnits,
     costingMethod,
     oldCost, newCost,
     itemOriginalUnitCost,
     effectiveUnitCost,
     itemDiscount, headerDiscountApplied,
     focQty, focCost, paidAmount
   }
   ```

### Other Audit Points

**GRN Edit Operations:**
- Comprehensive edit audit with before/after snapshots
- Stores: itemUpdates, reason, stock changes, cost changes
- Tracks which collections were affected (CurrentStock, StockBatch, InventoryBatch, etc.)

**GRN Validation Failures:**
- Permission denials logged: "Edit blocked by vendor payment"
- Rejection reasons captured: "Consumed stock prevents edit"
- Action status marked as "failed"

### Activity Log Storage

**Collection:** `activity_logs` (MongoDB)
**Indexed on:** `timestamp` for efficient queries
**Retention:** Permanent (all edits tracked for compliance)

---

## 6. Sample GRN Line Item Structure with Cost Fields

### GRN Item Schema

**Location:** `server/Models/Grn.js` → `grnItemSchema`

```javascript
{
  productId: ObjectId,           // Reference to Product
  itemName: String,              // "Widget Pro"
  itemCode: String,              // "WID-001"
  location: String,              // Warehouse location
  
  // Quantity and Unit
  quantity: Number,              // Qty in variant units (e.g., 5 Outer Boxes)
  unitType: String,              // "PC", "BOX", "KG", etc. (default: "PC")
  conversionFactor: Number,      // Factor for unit variant (default: 1)
  
  // Free on Cost
  foc: Boolean,                  // Is this FOC (free goods)?
  focQty: Number,                // FOC quantity
  
  // Cost Calculation Fields
  unitCost: Number,              // Cost per unit variant (required)
  itemDiscount: Number,          // Line-level discount amount
  itemDiscountPercent: Number,   // Line-level discount percentage
  netCost: Number,               // Cost after item discount
  totalCost: Number,             // netCost × quantity (required)
  
  // Tax Fields
  taxType: String,               // "exclusive", "inclusive", "notax"
  taxPercent: Number,            // Tax percentage (e.g., 5)
  taxAmount: Number,             // Calculated tax amount
  
  // Batch & Expiry
  batchNumber: String,           // Batch/lot number (auto-generated if not provided)
  expiryDate: Date,              // Expiry date for tracked products
  
  // Notes & RTV
  notes: String,                 // Item-level notes
  rtvReturnedQuantity: Number    // Qty returned to vendor (independent of sales)
}
```

### Sample GRN Line Item Data

```javascript
// Example: Purchasing 5 Outer Boxes of Widget Pro
{
  productId: "64f1a2b3c4d5e6f7g8h9i0j1",
  itemName: "Widget Pro",
  itemCode: "WID-001",
  location: "A1-02",
  
  // Quantity (5 Outer Boxes)
  quantity: 5,
  unitType: "BOX",
  conversionFactor: 10,  // 1 Box = 10 individual units
  
  // Cost: 100 AED per box
  unitCost: 100,
  itemDiscount: 5,       // 5 AED discount per box
  itemDiscountPercent: 5, // 5% discount
  netCost: 475,          // (100 - 5) × 5 = 475 AED
  totalCost: 475,        // 475 AED total for this line
  
  // Tax calculation
  taxType: "exclusive",
  taxPercent: 5,         // 5% VAT
  taxAmount: 23.75,      // 475 × 5% = 23.75 AED
  
  // Batch tracking
  batchNumber: "GRN-2025-26-00001-BATCH1",
  expiryDate: "2026-12-31",
  
  foc: false,
  focQty: 0,
  
  rtvReturnedQuantity: 0
}
```

### GRN Header Structure (Overall)

```javascript
{
  grnNumber: "GRN-2025-26-00001",
  grnDate: ISODate("2025-03-20"),
  vendorId: ObjectId,
  vendorName: "AcmeTrade Import",
  
  // Payment & Terms
  paymentTerms: "NET_30",
  invoiceNo: "INV-2025-00123",
  lpoNo: "LPO-00456",
  referenceNumber: "REF-789",
  deliveryDate: ISODate("2025-03-22"),
  shippingCost: 150.00,
  
  // Tax & Totals
  taxType: "exclusive",
  totalQty: 50,              // Total quantity (in base units)
  subtotal: 2375.00,         // Before discount & tax
  discountAmount: 50.00,     // GRN-level discount
  discountPercent: 2,
  totalExTax: 2325.00,       // After discount, before tax
  taxAmount: 116.25,         // 2325 × 5% VAT
  netTotal: 2325.00,
  finalTotal: 2441.25,       // Includes tax and shipping
  
  // Items
  items: [
    { productId, itemName, quantity, unitCost, totalCost, ... },
    { ... }
  ],
  
  // Audit
  status: "Posted",
  createdBy: "user123",
  postedBy: "approver456",
  postedDate: ISODate("2025-03-20T14:30:00"),
  
  // Tracking
  batchExpiryTracking: true
}
```

---

## 7. Current Product Update Flow Summary

### Complete GRN to Product Update Pipeline

```
1. GRN Created (Draft)
   └─ No product updates yet

2. GRN Posted/Submitted
   └─ GRNStockUpdateService.processGrnStockUpdate() executes:
      
      For each item in GRN.items:
      ├─ Validate product exists
      ├─ UPDATE: Product.quantityInStock (add received qty)
      ├─ UPDATE: CurrentStock collection (real-time tracking)
      ├─ CREATE: InventoryBatch or StockBatch (expiry-tracked)
      ├─ UPDATE: Product.cost (recalculate via FIFO/LIFO/WAC)
      ├─ UPDATE: Product.packingUnits[].cost (propagate to variants)
      ├─ CREATE: StockMovement (audit trail)
      └─ CREATE: ActivityLog (comprehensive audit)
      
      Post-processing:
      └─ StockRecalculationHelper.batchRecalculate()
         └─ Recalculate availableQuantity for all updated products

3. If GRN Edited (Posted Status)
   └─ GRNEditManager.editPostedGRN():
      ├─ Validate edit permission (check downstream transactions)
      ├─ REVERSE: Previous stock entries (create negative movements)
      ├─ RECALCULATE: Costs using new quantities
      ├─ APPLY: New values to product
      ├─ UPDATE: All related collections atomically
      └─ CREATE: Comprehensive edit audit log
```

### Key Data Flows

**Stock Quantity Flow:**
```
GRN item.quantity (with factor) → Convert to base units → 
ProductStock update → CurrentStock increment → 
InventoryBatch/StockBatch create → StockRecalculation
```

**Cost Calculation Flow:**
```
GRN item { unitCost, discount, foc, quantity, factor } → 
Calculate effective cost (after discounts/FOC) → 
Apply costing method (FIFO/LIFO/WAC) → 
Update Product.cost → Propagate to variants → 
Create audit log
```

**Audit Trail:**
```
All changes → ActivityLog (INSERT) → 
StockMovement (INSERT) → 
FailedEdit (if needed) → 
Complete change history preserved
```

---

## 8. Where to Add New Updates

### For New Product Update Requirements

**Key Decision Points:**

1. **If updating during GRN posting:**
   - Modify: `GRNStockUpdateService` 
   - Layer: `static async updateProductStock()` or new method
   - Hook point: Within the for-loop processing each item

2. **If calculating derived fields:**
   - Use: `calculateEffectiveUnitCost()` or `updateProductCost()`
   - Pattern: Calculate from item-level data, then persist to product

3. **If tracking variant updates:**
   - Modify: `updateUnitVariantCosts()` in GRNStockUpdateService
   - Ensure: Propagates cost changes to packing units

4. **If adding new audit fields:**
   - Extend: `changes` object in createAuditLog()
   - Pattern: Add to changes object, then save to ActivityLog

5. **If creating alternative workflows:**
   - Use: GRNEditManager pattern (two-phase updates for posted GRNs)
   - Validate: Transaction dependencies first via GRNTransactionValidator

### Extension Points

**Services to extend:**
- `GRNStockUpdateService` → For GRN-triggered updates
- `GRNEditManager` → For GRN edit workflows
- `CostingService` → For new costing methods
- `UniversalStockRecalculationService` → For recalculation logic

**Models to extend:**
- `AddProduct` → For new product fields
- `ActivityLog` → For audit tracking (already flexible with `changes` field)
- `Grn` → For new GRN-level tracking (already extensible)

---

## File Reference Map

| Component | File Location | Purpose |
|-----------|---------------|---------|
| GRN Controller | `server/modules/inventory/controllers/grnController.js` | GRN endpoints (create, update, fetch) |
| GRN Service | `server/modules/inventory/services/GRNService.js` | GRN business logic, number generation |
| GRN Model | `server/Models/Grn.js` | GRN schema with item structure |
| Stock Update Service | `server/modules/accounting/services/GRNStockUpdateService.js` | Master stock update logic |
| GRN Edit Manager | `server/modules/accounting/services/GRNEditManager.js` | GRN edit workflows (draft & posted) |
| Edit Routes | `server/modules/accounting/routes/grnEditRoutes.js` | Edit endpoints |
| Transaction Validator | `server/modules/accounting/services/GRNTransactionValidator.js` | Validates edit permission |
| Product Model | `server/Models/AddProduct.js` | Product schema with pricing levels |
| Activity Log Model | `server/Models/ActivityLog.js` | Audit trail schema |
| Costing Service | `server/services/CostingService.js` | FIFO/LIFO/WAC calculations |
| Stock Recalculation | `server/modules/accounting/services/StockRecalculationHelper.js` | Recalculates available qty |

---

## Key Insights

1. **Pricing is multi-tiered** → Both per-unit (cost/price) and per-level (retail/wholesale)
2. **Unit variants use conversion factors** → All stock calculations in base units internally
3. **Costing methods flexible** → FIFO/LIFO/WAC applied per product, recalculated on each GRN
4. **Complete audit trail** → Every change tracked with before/after snapshots
5. **Two-phase edits** → Posted GRNs reverse then reapply (transactional integrity)
6. **Real-time stock** → CurrentStock collection kept in sync for dashboard performance
7. **Batch tracking optional** → Products can track by batch (expiry) or simple inventory

