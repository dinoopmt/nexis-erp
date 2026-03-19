# Product Expiry Tracking System - Implementation Guide

## Overview
Complete batch-level product expiry tracking system for inventory management. Tracks individual product batches with manufacturing dates, expiry dates, and automatic status management.

## Database Models

### 1. **StockBatch Model** (`server/Models/StockBatch.js`)
Represents individual product batches with expiry information.

**Fields:**
- `productId` (ObjectId) - Reference to Product
- `batchNumber` (String) - Unique batch identifier per product
- `manufacturingDate` (Date) - Product manufacturing date
- `expiryDate` (Date) - Product expiration date
- `shelfLifeDays` (Number) - Days between manufacturing and expiry
- `quantity` (Number) - Total quantity received
- `usedQuantity` (Number) - Quantity already consumed/sold
- `costPerUnit` (Number) - Batch unit cost
- `batchStatus` (Enum) - ACTIVE, EXPIRING_SOON, EXPIRED, CLOSED
- `daysToExpiry` (Number) - Calculated days until expiry
- `supplier` (String) - Supplier name
- `referenceNumber` (String) - Purchase/receipt reference
- `notes` (String) - Additional batch notes
- `createdAt` (Date) - Batch creation date
- `updatedAt` (Date) - Last update timestamp

**Virtual Fields:**
- `availableQuantity` - quantity - usedQuantity
- `totalBatchCost` - quantity × costPerUnit

**Indexes:**
- `productId + expiryDate` (sorted by expiry)
- `expiryDate + batchStatus` (for expiry reports)

### 2. **AddProduct Model** (Extended) (`server/Models/AddProduct.js`)
Six new fields added to Product model:

```javascript
trackExpiry: {
  type: Boolean,
  default: false,
  description: "Enable/disable expiry tracking for product"
}

manufacturingDate: {
  type: Date,
  description: "Product manufacturing date"
}

expiryDate: {
  type: Date,
  description: "Product expiration date"
}

shelfLifeDays: {
  type: Number,
  description: "Calculated days between manufacturing and expiry"
}

expiryAlertDays: {
  type: Number,
  default: 30,
  description: "Alert threshold before expiry date"
}

batchTrackingEnabled: {
  type: Boolean,
  default: false,
  description: "Enable individual batch-level tracking"
}
```

## Service Layer

### **StockBatchService** (`server/modules/inventory/services/stockBatchService.js`)

Comprehensive service for batch management operations.

#### Methods:

**1. createBatch(batchData)**
- Creates new stock batch with validation
- Auto-calculates shelf life and days to expiry
- Sets initial status to ACTIVE
- Parameters: batchData object with batch details
- Returns: Created batch document

**2. getBatchesByProduct(productId)**
- Retrieves all active batches for a product
- Sorts by expiry date (ascending)
- Parameters: productId
- Returns: Array of batch documents

**3. getExpiringBatches(days = 30)**
- Gets batches expiring within X days
- Filters by status EXPIRING_SOON or ACTIVE
- Parameters: days (default 30)
- Returns: Array of expiring batches

**4. getExpiredBatches()**
- Retrieves all expired batches
- Filters by status EXPIRED
- Parameters: None
- Returns: Array of expired batch documents

**5. consumeBatchQuantity(batchId, quantityToUse)**
- Uses/consumes inventory from batch
- Tracks used quantity
- Updates batch status if fully consumed
- Parameters: batchId, quantityToUse
- Returns: Updated batch document

**6. updateBatch(batchId, updateData)**
- Updates batch details
- Recalculates dates if manufacturing/expiry changed
- Auto-updates status
- Parameters: batchId, updateData object
- Returns: Updated batch document

**7. deleteBatch(batchId)**
- Hard delete of batch
- Parameters: batchId
- Returns: Confirmation

**8. getBatchStats(productId)**
- Comprehensive batch statistics for product
- Calculates: total batches, active count, expiring count, total inventory, total cost, nearest expiry
- Parameters: productId
- Returns: Statistics object

**9. updateProductExpiryStatus(productId)**
- Syncs product expiry fields with batch data
- Sets product expiryDate to nearest batch expiry
- Updates product's batch count
- Parameters: productId
- Returns: Updated product

**10. getLowStockBatches(threshold = 10)**
- Batches with quantity below threshold
- Parameters: threshold (default 10)
- Returns: Array of low stock batches

**11. getFIFOBatch(productId)**
- Gets oldest batch by manufacturing date
- For FIFO (First In First Out) consumption
- Parameters: productId
- Returns: Oldest active batch

**12. getBatchByNumber(productId, batchNumber)**
- Fetches specific batch by number
- Parameters: productId, batchNumber
- Returns: Batch document

## API Endpoints

**Base Path:** `/api/v1/stock-batches`

### Create Batch
```
POST /api/v1/stock-batches
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "batchNumber": "BATCH-2024-001",
  "manufacturingDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "quantity": 100,
  "costPerUnit": 25.50,
  "supplier": "Supplier A",
  "referenceNumber": "PO-2024-001",
  "notes": "First batch production run"
}

Response:
{
  "success": true,
  "message": "Stock batch created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "productId": "507f1f77bcf86cd799439011",
    "batchNumber": "BATCH-2024-001",
    "quantity": 100,
    "usedQuantity": 0,
    "costPerUnit": 25.50,
    "batchStatus": "ACTIVE",
    "daysToExpiry": 365,
    "shelfLifeDays": 365,
    ...
  }
}
```

### Get Batches by Product
```
GET /api/v1/stock-batches/product/:productId

Response:
{
  "success": true,
  "message": "Batches retrieved successfully",
  "count": 3,
  "data": [
    {
      "_id": "...",
      "batchNumber": "BATCH-2024-001",
      "quantity": 100,
      "usedQuantity": 25,
      "batchStatus": "ACTIVE",
      "daysToExpiry": 340,
      ...
    }
  ]
}
```

### Get Expiring Batches
```
GET /api/v1/stock-batches/expiring/list?days=30

Query Parameters:
- days: Number of days to check (default 30)

Response:
{
  "success": true,
  "message": "Batches expiring within 30 days retrieved",
  "count": 2,
  "data": [...]
}
```

### Get Expired Batches
```
GET /api/v1/stock-batches/expired/list

Response:
{
  "success": true,
  "message": "Expired batches retrieved successfully",
  "count": 1,
  "data": [...]
}
```

### Get Low Stock Batches
```
GET /api/v1/stock-batches/low-stock/list?threshold=10

Query Parameters:
- threshold: Quantity threshold (default 10)

Response:
{
  "success": true,
  "message": "Batches with <= 10 quantity retrieved",
  "count": 2,
  "data": [...]
}
```

### Get Batch Statistics
```
GET /api/v1/stock-batches/stats/:productId

Response:
{
  "success": true,
  "message": "Batch statistics retrieved successfully",
  "data": {
    "productId": "507f1f77bcf86cd799439011",
    "totalBatches": 3,
    "activeBatches": 2,
    "expiringBatches": 1,
    "totalQuantitor": 300,
    "totalQuantityInUse": 50,
    "totalCost": 7650,
    "nearestExpiryDate": "2025-01-15",
    "nearestExpiryDays": 20,
    "averageCostPerUnit": 25.50
  }
}
```

### Get FIFO Batch
```
GET /api/v1/stock-batches/fifo/:productId

Response:
{
  "success": true,
  "message": "FIFO batch retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "batchNumber": "BATCH-2024-001",
    "manufacturingDate": "2024-01-01",
    "expiryDate": "2025-01-01",
    "quantity": 75,
    "usedQuantity": 25,
    "batchStatus": "ACTIVE"
  }
}
```

### Get Batch by Number
```
GET /api/v1/stock-batches/:productId/batch/:batchNumber

Response:
{
  "success": true,
  "message": "Batch retrieved successfully",
  "data": {...}
}
```

### Consume Batch Quantity
```
POST /api/v1/stock-batches/:batchId/consume
Content-Type: application/json

{
  "quantityToUse": 10
}

Response:
{
  "success": true,
  "message": "Batch quantity consumed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "batchNumber": "BATCH-2024-001",
    "quantity": 100,
    "usedQuantity": 35,
    "availableQuantity": 65,
    "batchStatus": "ACTIVE"
  }
}
```

### Update Batch
```
PUT /api/v1/stock-batches/:batchId
Content-Type: application/json

{
  "quantity": 120,
  "supplier": "New Supplier",
  "notes": "Updated batch information"
}

Response:
{
  "success": true,
  "message": "Batch updated successfully",
  "data": {...}
}
```

### Delete Batch
```
DELETE /api/v1/stock-batches/:batchId

Response:
{
  "success": true,
  "message": "Batch deleted successfully",
  "data": {
    "deletedId": "507f1f77bcf86cd799439012"
  }
}
```

## Frontend Integration

### Product Form Fields
New fields added to Product.jsx after "Min Stock Level":

1. **Track Expiry Checkbox**
   - Enables/disables expiry tracking for product
   - Controls visibility of date fields

2. **Manufacturing Date** (Conditional)
   - Shows when `trackExpiry` is enabled
   - Date input field

3. **Expiry Date** (Conditional)
   - Shows when `trackExpiry` is enabled
   - Date input field

4. **Alert Days** (Conditional)
   - Shows when `trackExpiry` is enabled
   - Number input, default 30
   - Days before expiry to trigger alerts

5. **Batch Tracking** (Conditional)
   - Shows when `trackExpiry` is enabled
   - Enables batch-level inventory tracking
   - Required for individual batch management

### Form Behavior
- When `trackExpiry` is unchecked: All date fields hidden
- When `trackExpiry` is checked:
  - Manufacturing and expiry date inputs visible
  - Alert days input visible with default value 30
  - Batch tracking checkbox visible

## Batch Status Values

| Status | Description | Trigger |
|--------|-------------|---------|
| ACTIVE | Normal inventory | Created or consumed below threshold |
| EXPIRING_SOON | Approaching expiry | Within `expiryAlertDays` of expiry date |
| EXPIRED | Past expiry date | Current date > expiry date |
| CLOSED | No longer available | Manual closure or fully consumed |

## Automatic Status Updates

StockBatch model automatically updates status during:
1. **Pre-save hook** - On any batch creation/update
2. **Consume operation** - When inventory used
3. **Update operation** - When batch details changed

Status is determined by:
```javascript
if (currentDate > expiryDate) status = 'EXPIRED'
else if (daysToExpiry <= alertDays) status = 'EXPIRING_SOON'
else if (availableQuantity === 0) status = 'CLOSED'
else status = 'ACTIVE'
```

## Calculation Fields

### Shelf Life Days (Auto-Calculated)
```javascript
shelfLifeDays = expiryDate - manufacturingDate
```

### Days to Expiry (Auto-Calculated)
```javascript
daysToExpiry = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24))
```

### Available Quantity (Virtual)
```javascript
availableQuantity = quantity - usedQuantity
```

### Total Batch Cost (Virtual)
```javascript
totalBatchCost = quantity × costPerUnit
```

## Implementation Checklist

### Backend ✅
- [x] StockBatch model created
- [x] AddProduct model enhanced with expiry fields
- [x] StockBatchService with 12+ methods
- [x] StockBatchController with 10+ endpoints
- [x] StockBatchRoutes configured
- [x] Server.js route registration

### Frontend ✅
- [x] Product.jsx form fields added
- [x] Conditional field visibility
- [x] Date input handling

### Pending - Next Phase
- [ ] Stock Batch Management UI component
- [ ] Batch creation/editing modal
- [ ] Batch consumption in transactions
- [ ] Expiry alert notifications
- [ ] Batch reporting dashboard
- [ ] FIFO automatic selection in sales
- [ ] Integration tests

## Usage Examples

### Creating a Product with Expiry Tracking
```
1. Go to Product form
2. Enter product basic details (Name, SKU, Type, etc.)
3. Enable "Track Expiry" checkbox
4. Set Manufacturing Date (e.g., 2024-01-01)
5. Set Expiry Date (e.g., 2025-01-01)
6. Set Alert Days (e.g., 30)
7. Enable "Batch Tracking" for batch-level management
8. Save product
```

### Creating a Batch for Product
```
POST /api/v1/stock-batches
{
  "productId": "507f1f77bcf86cd799439011",
  "batchNumber": "BATCH-2024-001",
  "manufacturingDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "quantity": 100,
  "costPerUnit": 25.50,
  "supplier": "Supplier ABC"
}
```

### Getting Expiring Batches (Next 7 Days)
```
GET /api/v1/stock-batches/expiring/list?days=7
```

### Recording Stock Consumption
```
POST /api/v1/stock-batches/:batchId/consume
{
  "quantityToUse": 10
}
```

## Error Handling

All endpoints include comprehensive error handling:

**400 Bad Request**
- Missing required fields
- Invalid data types
- Duplicate batch numbers

**404 Not Found**
- Product not found
- Batch not found
- Invalid product/batch reference

**500 Server Error**
- Database operation failures
- Service layer errors
- Calculation errors

## Notes

- Batch numbers must be unique per product
- Expiry date must be after manufacturing date
- Default alert days is 30 (configurable per product)
- Batch status updates automatically on creation and consumption
- All date calculations use server timezone
- Service automatically syncs product with nearest batch expiry

## File Locations
- **Model**: `server/Models/StockBatch.js`
- **Service**: `server/modules/inventory/services/stockBatchService.js`
- **Controller**: `server/modules/inventory/controllers/stockBatchController.js`
- **Routes**: `server/modules/inventory/routes/stockBatchRoutes.js`
- **Frontend**: `client/src/components/product/Product.jsx` (expiry section)
