# NEXIS-ERP Codebase Structure Mapping
## Complete Guide to Product Creation, Stock Management, GRN, and RTV

---

## 1. PRODUCT CREATION

### Routes
- **File**: [server/modules/inventory/routes/productRoutes.js](server/modules/inventory/routes/productRoutes.js#L29)
- **Route**: `POST /api/v1/addproduct`
- **Related Routes**:
  - `POST /api/v1/checkbarcode` - Validate barcode
  - `POST /api/v1/checkitemcode` - Validate item code
  - `PUT /api/v1/updateproduct/:id` - Update product

### Controller
- **File**: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js#L125)
- **Key Functions**:
  - `addProduct()` (Line 125-428) - CREATE new product endpoint
  - `updateProduct()` (Line 574-937) - UPDATE product endpoint
  - `getNextItemCode()` (Line 82-123) - Generate next item code
  
### Service Layer
- **File**: [server/modules/inventory/services/ProductService.js](server/modules/inventory/services/ProductService.js#L172)
- **Key Method**: `createProduct()` - Service-layer product creation

### Product Model
- **File**: `server/Models/AddProduct.js`
- **Key Fields**:
  - itemcode, name, barcode, cost, price, category, grouping, unitType
  - quantityInStock (legacy, use CurrentStock instead)

### ⚠️ CRITICAL: CurrentStock Creation on Product Add
- **Location**: [productController.js Line 361-375](server/modules/inventory/controllers/productController.js#L361)
- **Process**:
  - When product is created, a corresponding **CurrentStock** record is automatically created
  - **Initial Quantity**: 0 (opening stock managed by Inventory Adjustment module)
  - **Why**: CurrentStock is the single source of truth for all real-time stock tracking

---

## 2. CURRENTSTOCK MODEL & CREATION

### Model Definition
- **File**: [server/Models/CurrentStock.js](server/Models/CurrentStock.js)
- **Collection**: `current_stock`
- **Purpose**: Single source of truth for real-time inventory tracking (replaces product.quantityInStock)

### Schema Fields
```javascript
{
  productId: ObjectId (required, unique),
  
  // CURRENT QUANTITIES
  totalQuantity: Number (default: 0),           // Total physical stock
  allocatedQuantity: Number (default: 0),       // Reserved for sales orders
  availableQuantity: Number (computed),         // Available = total - allocated - damage
  
  // TRANSACTION COUNTERS
  grnReceivedQuantity: Number (default: 0),     // Total received via GRN
  rtvReturnedQuantity: Number (default: 0),     // Total returned via RTV
  salesOutQuantity: Number (default: 0),        // Total sold
  salesReturnQuantity: Number (default: 0),     // Total received from sales returns
  adjustmentQuantity: Number,                   // Net adjustments
  
  // COST TRACKING
  totalCost: Number (default: 0),               // Total cost using FIFO/LIFO/WAC
  averageCost: Number (computed),               // Cost per unit
  
  // AUDIT TRAIL
  lastGrnDate: Date,
  lastSaleDate: Date,
  lastRtvDate: Date,
  lastActivity: Object                          // Last transaction snapshot
}
```

### CurrentStock Creation Flow
1. **Product Created** → addProduct() in productController.js (Line 361)
2. **Auto-creates** CurrentStock with initial quantity 0
3. **Never create manually** - Always create via product creation
4. **If missing**: GRN posting will throw error (see GRNStockUpdateService.js Line 728)

### Utility/Helper Scripts
- [server/rebuild-from-movements.js](server/rebuild-from-movements.js) - Rebuild stock from StockMovement history
- [server/rebuild-current-stock.js](server/rebuild-current-stock.js) - Recalculate availableQuantity
- [server/current-stock-healer.js](server/current-stock-healer.js) - Fix discrepancies
- [server/diagnose-stock.js](server/diagnose-stock.js) - Check stock data integrity

---

## 3. GRN (GOODS RECEIPT NOTE) STOCK CREATION

### Routes
- **File**: [server/modules/inventory/routes/grnRoutes.js](server/modules/inventory/routes/grnRoutes.js)
- **Key Routes**:
  - `POST /api/v1/grn` - Create GRN (draft)
  - `PATCH /api/v1/grn/:id/post` - **POST GRN & Update Stock** ⭐
  - `PUT /api/v1/grn/:id` - Update GRN

### Controller
- **File**: [server/modules/inventory/controllers/grnController.js](server/modules/inventory/controllers/grnController.js#L465)
- **Key Function**: `postGrn()` (Line 623-850)
  - **Entry point for stock updates**
  - Called when user clicks "Post & Process GRN"
  - Status changes from "Draft" → "Received"

### Stock Update Service (Main Logic)
- **File**: [server/modules/accounting/services/GRNStockUpdateService.js](server/modules/accounting/services/GRNStockUpdateService.js#L24)
- **Main Function**: `processGrnStockUpdate(grnData, userId)` (Line 24-165)
- **Orchestrates**:
  1. Update product stock quantity
  2. Create/update batch records (InventoryBatch or StockBatch)
  3. Update product cost (FIFO/LIFO/WAC)
  4. Update unit variant costs
  5. Create stock movement record
  6. Create audit log

### Stock Update Sub-Functions

#### 1. Update Product Stock
- **Function**: `updateProductStock()` (Line 168+)
- **Increases**: product.quantityInStock
- **Updates**: CurrentStock.totalQuantity

#### 2. Create/Update Batch
- **Function**: `createOrUpdateBatch()` (Line 321+)
- **Creates**: InventoryBatch or StockBatch record
- **For**: Expiry tracking, cost tracking, FIFO/LIFO calculation
- **Fields**: batchNumber, expiryDate, quantity, costPerUnit

#### 3. Update Product Cost
- **Function**: `updateProductCost()` (Line 358+)
- **Calculates**: New weighted average cost based on costing method
- **Methods**: FIFO, LIFO, Weighted Average Cost

#### 4. Update Variant Costs
- **Function**: `updateUnitVariantCosts()` (Line 467+)
- **For**: Product variants (different UOM/packing)
- **Updates**: All variants proportionally

#### 5. Update CurrentStock Collection
- **Function**: `updateCurrentStock()` (Line 734+)
- **Key Operations**:
  ```javascript
  $inc: {
    totalQuantity: quantityReceived,
    grnReceivedQuantity: quantityReceived
  }
  ```
- **Atomic update** for concurrent safety

#### 6. Create Stock Movement
- **Function**: `createStockMovement()` (Line 644+)
- **Creates**: StockMovement record for audit trail
- **Type**: INBOUND
- **Reference**: GRN number

#### 7. Create Audit Log
- **Function**: `createAuditLog()` (Line 671+)
- **Logs**: Who, what, when, quantity changes
- **To**: ActivityLog collection

### GRN Posting Flow

```
POST /api/v1/grn/:id/post
  ↓
postGrn(id, createdBy)
  │
  ├─→ Phase 1: Accounting Entries
  │   ├─ createGrnJournalEntry() - Items journal
  │   └─ createShippingJournalEntry() - Shipping cost journal (optional)
  │
  ├─→ Phase 2: Stock Updates (✅ KEY)
  │   └─ GRNStockUpdateService.processGrnStockUpdate()
  │       └─ For each GRN item:
  │          ├─ updateProductStock() - qty += qty
  │          ├─ createOrUpdateBatch() - create batch
  │          ├─ updateProductCost() - new cost
  │          ├─ updateUnitVariantCosts() - update variants
  │          ├─ updateCurrentStock() - update real-time stock
  │          ├─ createStockMovement() - audit record
  │          └─ createAuditLog() - activity log
  │
  ├─→ Phase 3: GRN Status Update
  │   └─ grn.status = "Received"
  │
  └─→ Return: Comprehensive response with all updates
```

### Models Used
- **Grn**: [server/Models/Grn.js](server/Models/Grn.js) - GRN header + items
- **InventoryBatch**: [server/Models/InventoryBatch.js](server/Models/InventoryBatch.js) - For non-expiry products
- **StockBatch**: [server/Models/StockBatch.js](server/Models/StockBatch.js) - For expiry-tracked products
- **StockMovement**: [server/Models/StockMovement.js](server/Models/StockMovement.js) - Audit trail
- **CurrentStock**: [server/Models/CurrentStock.js](server/Models/CurrentStock.js) - Real-time tracking

---

## 4. RTV (RETURN TO VENDOR) STOCK REVERSAL

### Routes
- **File**: [server/modules/inventory/routes/rtvRoutes.js](server/modules/inventory/routes/rtvRoutes.js)
- **Key Routes**:
  - `POST /api/v1/rtv` - Create RTV (draft)
  - `PATCH /api/v1/rtv/:id/post` - **POST RTV & Reverse Stock** ⭐
  - `PUT /api/v1/rtv/:id` - Update RTV

### Controller
- **File**: [server/modules/inventory/controllers/rtvController.js](server/modules/inventory/controllers/rtvController.js#L1)
- **Key Functions**:
  - `createRtv()` (Line 55+) - Create RTV draft with validation
  - `postRtv()` (Line 400+) - **POST RTV & trigger stock reversal**
  - `getAvailableRtvStock()` (Line 749+) - Show what's available for return

### Stock Reversal Service (Main Logic)
- **File**: [server/modules/accounting/services/RTVStockUpdateService.js](server/modules/accounting/services/RTVStockUpdateService.js#L1)
- **Main Function**: `processRtvStockReversal(rtvData, userId)` (Line 30+)
- **Orchestrates**:
  1. Reverse (reduce) product stock quantity
  2. Reduce/adjust batch records
  3. Reverse product cost impact
  4. Check for cost shift (Rule 3)
  5. Create stock movement record
  6. Create audit log

### Stock Reversal Sub-Functions

#### 1. Reverse Product Stock
- **Function**: `reverseProductStock()` (Line 166+)
- **Decreases**: product.quantityInStock
- **Updates**: CurrentStock.totalQuantity (negative)
- **Validation**: Cannot return more than available
- **Formula**: 
  ```javascript
  Available for RTV = GRN Received Qty - Already Returned Qty
  (Independent of sales)
  ```

#### 2. Adjust Batch Quantity
- **Function**: `adjustBatchQuantity()` (Line 244+)
- **Reduces**: Batch quantity (from InventoryBatch or StockBatch)
- **Marks**: Batch as "CONSUMED" if empty
- **Handles**: Both expiry-tracked and non-expiry products

#### 3. Reverse Product Cost
- **Function**: `reverseProductCost()` (Line 391+)
- **Logic**: 
  - Checks if this is the latest GRN for the product
  - If full return of latest GRN: shifts cost to older GRN
  - If partial: weighted average recalculation
- **Rule 3**: Cost shift when latest GRN is fully returned

#### 4. Create Stock Movement
- **Function**: `createStockMovement()` (Line 492+)
- **Type**: OUTBOUND (reverses INBOUND from GRN)
- **Reference**: RTV number
- **Records**: All return details

#### 5. Create Audit Log
- **Function**: `createAuditLog()` (Line 526+) 
- **Logs**: Return reason, quantities, cost impact

### RTV Posting Flow

```
PATCH /api/v1/rtv/:id/post
  ↓
postRtv(id, createdBy)
  │
  ├─→ Phase 1: Stock Reversal (✅ KEY)
  │   └─ RTVStockUpdateService.processRtvStockReversal()
  │       └─ For each RTV item:
  │          ├─ reverseProductStock() - qty -= qty
  │          ├─ adjustBatchQuantity() - reduce batch
  │          ├─ reverseProductCost() - reverse cost (with Rule 3)
  │          ├─ createStockMovement() - OUTBOUND record
  │          └─ createAuditLog() - activity log
  │
  ├─→ Phase 2: Accounting Entries
  │   ├─ createRtvJournalEntry() - GL reversal
  │   └─ createCreditNoteJournalEntry() - Credit note
  │
  ├─→ Phase 3: GRN Update (Track Returns)
  │   └─ Update GRN items' rtvReturnedQuantity
  │
  ├─→ Phase 4: RTV Status Update
  │   └─ rtv.status = "Posted"
  │
  └─→ Return: Comprehensive response
```

### Stock Validation for RTV Creation
- **Location**: [rtvController.js Line 55-84](server/modules/inventory/controllers/rtvController.js#L55)
- **Formula**: `Available = Received - Already RTV Returned`
- **Independent**: NOT affected by sales or sales returns
- **Prevents**: Over-returning to vendor

### RTV Rules Implementation
- **Rule 1**: Cannot return more than received
- **Rule 2**: RTV independent of sales inventory
- **Rule 3**: Cost shift when latest GRN fully returned (see RTVStockUpdateService.js)
- **Rule 5**: Complete RTV tracking in GRN items

### Models Used
- **Rtv**: [server/Models/Rtv.js](server/Models/Rtv.js) - RTV header + items
- **InventoryBatch/StockBatch**: Adjusted during reversal
- **StockMovement**: OUTBOUND records
- **CurrentStock**: Real-time reversal updates

---

## 5. RELATED STOCK OPERATIONS

### Sales Stock Updates
- **File**: Integration point in sales modules
- **Affects**: CurrentStock (allocatedQuantity, salesOutQuantity)
- **Not detailed** in this mapping but follows similar pattern

### Sales Return Stock Updates
- **File**: Sales return modules
- **Affects**: CurrentStock (salesReturnQuantity)
- **Reverses** sold quantities

### Inventory Adjustment (Opening Stock)
- **Purpose**: Set opening stock balances
- **Uses**: Inventory Adjustment module (not detailed here)
- **Affects**: CurrentStock.totalQuantity

### Stock Batch vs InventoryBatch
- **InventoryBatch**: Used for non-expiry-tracked products
- **StockBatch**: Used for expiry-tracked products (trackExpiry = true)
- **Selection**: Determined by `product.trackExpiry` flag

---

## 6. KEY BUSINESS LOGIC FILES

### Accounting & Costing
- [server/modules/accounting/services/GRNJournalService.js](server/modules/accounting/services/GRNJournalService.js) - GL entries for GRN
- [server/modules/accounting/services/RTVJournalService.js](server/modules/accounting/services/RTVJournalService.js) - GL entries for RTV
- [server/modules/costing/](server/modules/costing/) - Costing methods (FIFO, LIFO, WAC)

### Stock Tracking & Audit
- [server/Models/StockMovement.js](server/Models/StockMovement.js) - Complete movement history
- [server/utils/StockHistoryManager.js](server/utils/StockHistoryManager.js) - Centralized movement recording
- [server/Models/ActivityLog.js](server/Models/ActivityLog.js) - Audit trail

### Data Consistency
- [server/rebuild-from-movements.js](server/rebuild-from-movements.js) - Rebuild CurrentStock
- [server/current-stock-healer.js](server/current-stock-healer.js) - Fix discrepancies
- [server/diagnose-stock.js](server/diagnose-stock.js) - Check data integrity

---

## 7. CRITICAL WORKFLOWS SUMMARY

### ✅ Product Creation → Stock Initialization
1. User POST /addproduct
2. productController.addProduct() creates Product
3. **Automatically creates** CurrentStock with qty=0
4. Ready for GRN posting

### ✅ GRN Posting → Stock Increase
1. User PATCH /grn/:id/post
2. grnController.postGrn() triggered
3. GRNStockUpdateService.processGrnStockUpdate():
   - Creates batch records
   - Updates CurrentStock.totalQuantity += qty
   - Records StockMovement
   - Updates accounting entries
4. GRN status = "Received"

### ✅ RTV Posting → Stock Decrease
1. User PATCH /rtv/:id/post
2. rtvController.postRtv() triggered
3. RTVStockUpdateService.processRtvStockReversal():
   - Reduces batch quantity
   - Updates CurrentStock.totalQuantity -= qty
   - Records StockMovement (OUTBOUND)
   - Updates accounting entries
   - Handles cost shifts
4. RTV status = "Posted"
5. GRN items track rtvReturnedQuantity

### ⚠️ Data Flow
```
Product Created
  ↓
CurrentStock Created (qty=0)
  ↓
GRN Posted
  ├─ Batch Created
  ├─ CurrentStock.totalQuantity += qty
  ├─ StockMovement recorded (INBOUND)
  └─ GL entries created
  ↓
RTV Posted (if returning)
  ├─ Batch Quantity Reduced
  ├─ CurrentStock.totalQuantity -= qty
  ├─ StockMovement recorded (OUTBOUND)
  ├─ GL entries reversed
  └─ Cost shifts handled
```

---

## 8. KEY TAKEAWAYS

1. **CurrentStock is the Single Source of Truth**
   - Created automatically with products
   - Updated atomically by GRN/RTV/Sales operations
   - NEVER modify directly in code

2. **Stock Movements are Audited**
   - Every change recorded in StockMovement collection
   - Used for reconciliation and data recovery
   - Complete transaction history

3. **Batch Records Track Costs**
   - InventoryBatch for regular products
   - StockBatch for expiry-tracked products
   - Cost basis for FIFO/LIFO/WAC calculations

4. **GRN Creates Stock, RTV Removes Stock**
   - Both atomic operations with GL integration
   - Both validate against CurrentStock
   - Both record in StockMovement

5. **Rules Prevent Data Corruption**
   - Cannot return more than received
   - RTV independent of sales (separate tracking)
   - Cost shifts handled automatically

---

## 9. FILE LOCATIONS QUICK REFERENCE

### Controllers
- Product: [server/modules/inventory/controllers/productController.js](server/modules/inventory/controllers/productController.js)
- GRN: [server/modules/inventory/controllers/grnController.js](server/modules/inventory/controllers/grnController.js)
- RTV: [server/modules/inventory/controllers/rtvController.js](server/modules/inventory/controllers/rtvController.js)

### Services
- GRN Stock: [server/modules/accounting/services/GRNStockUpdateService.js](server/modules/accounting/services/GRNStockUpdateService.js)
- RTV Stock: [server/modules/accounting/services/RTVStockUpdateService.js](server/modules/accounting/services/RTVStockUpdateService.js)
- GRN Journal: [server/modules/accounting/services/GRNJournalService.js](server/modules/accounting/services/GRNJournalService.js)
- RTV Journal: [server/modules/accounting/services/RTVJournalService.js](server/modules/accounting/services/RTVJournalService.js)

### Models
- Product: [server/Models/AddProduct.js](server/Models/AddProduct.js)
- Stock: [server/Models/CurrentStock.js](server/Models/CurrentStock.js)
- GRN: [server/Models/Grn.js](server/Models/Grn.js)
- RTV: [server/Models/Rtv.js](server/Models/Rtv.js)
- Batches: [server/Models/InventoryBatch.js](server/Models/InventoryBatch.js), [server/Models/StockBatch.js](server/Models/StockBatch.js)
- Movements: [server/Models/StockMovement.js](server/Models/StockMovement.js)

### Routes
- Product: [server/modules/inventory/routes/productRoutes.js](server/modules/inventory/routes/productRoutes.js)
- GRN: [server/modules/inventory/routes/grnRoutes.js](server/modules/inventory/routes/grnRoutes.js)
- RTV: [server/modules/inventory/routes/rtvRoutes.js](server/modules/inventory/routes/rtvRoutes.js)

---

**Document Generated**: April 4, 2026
**Purpose**: Codebase architecture reference for stock management operations
