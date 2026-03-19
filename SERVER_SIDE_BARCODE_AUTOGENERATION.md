# Server-Side Barcode Auto-Generation with FIFO & Duplicate Prevention

## Overview

The barcode auto-generation system has been migrated to the server side for multi-system data entry support, duplicate prevention, and FIFO (First-In-First-Out) queue management.

## Key Features

### 1. **FIFO Queue System**
- **First-In-First-Out Processing**: Barcodes are generated sequentially based on request order
- **Multi-System Support**: Multiple terminals/systems can request barcodes simultaneously without conflicts
- **Atomic Operations**: Database operations ensure no duplicate barcodes are created

### 2. **Duplicate Prevention**
- **Database Check**: Verifies against existing products before generation
- **Queue Check**: Verifies against pending barcode requests
- **Suffix Strategy**: Uses incremental suffixes (00-99) to guarantee uniqueness
- **Max Retries**: 100 attempts to find a unique barcode

### 3. **Multi-System Data Entry**
- **System ID Tracking**: Each terminal/system has a unique identifier
- **Queue Monitoring**: Track pending barcodes by system
- **Expiration Handling**: Auto-cleanup of expired requests (5-minute timeout)

## Architecture

### Server-Side Components

#### 1. **BarcodeQueue Model** (`server/Models/BarcodeQueue.js`)
Tracks barcode generation requests and their status.

```javascript
{
  systemId: String,              // Terminal/system identifier
  baseBarcode: String,           // Base pattern: item+dept+row
  generatedBarcode: String,      // Final 10-digit barcode
  suffix: Number,                // Uniqueness suffix (00-99)
  status: String,                // pending | generated | assigned | failed
  productId: ObjectId,           // Assigned product (after creation)
  itemCode: String,              // Item code reference
  departmentId: String,          // Department reference
  retryCount: Number,            // Retry attempts
  error: String,                 // Error message if failed
  expiresAt: Date,               // Auto-cleanup (5 minutes)
  createdAt: Date,               // Request timestamp
  updatedAt: Date
}
```

**Indexes:**
- `status + createdAt`: FIFO retrieval
- `baseBarcode + status`: Find by pattern
- `generatedBarcode`: Duplicate prevention (unique)
- `expiresAt`: Auto-expiration (TTL)

#### 2. **ProductService Methods** (`server/modules/inventory/services/ProductService.js`)

##### `generateNextBarcode(baseBarcode, itemCode, departmentId, systemId)`
Generates unique barcode with FIFO and duplicate prevention.

**Parameters:**
- `baseBarcode` (string): Base pattern [ItemCode:4] + [DeptCode:2] + [RowIndex:2] = 8 digits
- `itemCode` (string): Product item code
- `departmentId` (string): Department ID
- `systemId` (string): Terminal/system identifier

**Returns:**
```javascript
{
  barcode: "12340100",           // Final 10-digit barcode
  queueId: "507f1f77bcf86cd799439011",  // Queue entry ID
  suffix: 0,                     // Suffix used
  baseBarcode: "12340100",       // Original base
  status: "pending"              // Current status
}
```

**Algorithm:**
1. Validate base barcode format (minimum 8 digits)
2. Start with suffix = 0
3. Generate candidate: baseBarcode + suffix (padded to 10 digits)
4. Check database for existing product with this barcode
5. Check queue for pending/assigned entries
6. If unique, create queue entry and return
7. If duplicate, increment suffix and retry (max 100 times)
8. Create queue entry with 5-minute expiration

##### `assignBarcodeToProduct(queueId, productId)`
Marks queue entry as assigned after product creation.

**Parameters:**
- `queueId` (string): Queue entry ID
- `productId` (string): Created product ID

**Returns:** Updated queue entry with status = "assigned"

##### `cleanupExpiredBarcodes()`
Removes expired queue entries (older than 5 minutes).

**Call frequency:** Every 10 minutes via scheduled task

##### `getBarcodeQueueStatus(filters)`
Monitors queue status for debugging/monitoring.

**Filters:**
- `status`: Filter by status (pending, assigned, failed)
- `systemId`: Filter by system/terminal
- `itemCode`: Filter by item code
- `limit`: Max results (default: 50)

### API Endpoints

#### POST `/api/v1/products/generatebarcode`
Generate barcode with server-side FIFO and duplicate prevention.

**Request Body:**
```javascript
{
  baseBarcode: "12340100",    // Base pattern
  itemCode: "1234",           // Item code
  departmentId: "507f...",    // Department ID
  systemId: "system-default"  // Optional: terminal ID
}
```

**Response (Success 200):**
```javascript
{
  success: true,
  message: "Barcode generated successfully",
  data: {
    barcode: "12340100",
    queueId: "507f1f77bcf86cd799439011",
    suffix: 0,
    baseBarcode: "12340100",
    status: "pending"
  }
}
```

**Response (Error 409 - Conflict):**
```javascript
{
  success: false,
  message: "Unable to generate unique barcode after 100 attempts",
  error: "..."
}
```

#### POST `/api/v1/products/assignbarcode`
Mark barcode as assigned to product after creation.

**Request Body:**
```javascript
{
  queueId: "507f1f77bcf86cd799439011",
  productId: "507f1f77bcf86cd799439012"
}
```

**Response:**
```javascript
{
  success: true,
  message: "Barcode assigned to product successfully",
  data: { /* queue entry */ }
}
```

#### GET `/api/v1/products/barcodequeue/status?status=pending&systemId=system-1&limit=50`
Monitor queue status for debugging.

**Query Parameters:**
- `status`: pending | assigned | failed
- `systemId`: Terminal/system ID
- `itemCode`: Item code filter
- `limit`: Max results (default: 50)

**Response:**
```javascript
{
  success: true,
  message: "Queue status retrieved successfully",
  count: 5,
  data: [ /* queue entries */ ]
}
```

## Client-Side Implementation

### `useProductAPI` Hook Methods

#### `generateBarcodeOnServer(baseBarcode, itemCode, departmentId, systemId)`
Call server endpoint for barcode generation.

```javascript
const { generateBarcodeOnServer } = useProductAPI();

const result = await generateBarcodeOnServer(
  "12340100",                              // baseBarcode
  "1234",                                  // itemCode
  "507f1f77bcf86cd799439011",            // departmentId
  "system-default"                        // systemId (optional)
);

// result: { barcode, queueId, suffix, status }
```

#### `assignBarcodeToProduct(queueId, productId)`
Mark barcode as assigned after product creation.

```javascript
const { assignBarcodeToProduct } = useProductAPI();

await assignBarcodeToProduct(
  result.queueId,        // Queue ID from generation
  createdProduct._id     // Product ID after creation
);
```

### Product.jsx Integration

#### `handleGenerateBarcodeOnServer(index)`
New handler for server-side barcode generation (replaces client-side).

**Workflow:**
1. Validate item code, department, and unit
2. Build base barcode: [ItemCode:4] + [DeptCode:2] + [RowIndex:2]
3. Call `generateBarcodeOnServer()`
4. Store queue ID in product state
5. Update UI with generated barcode
6. After product creation, call `assignBarcodeToProduct()`

**Usage:**
```javascript
// Called from UI button click in BasicInfoTab
onClick={() => handleGenerateBarcodeOnServer(lineIndex)}
```

## Barcode Format

### Format Specification
```
[ItemCode: 4 digits] + [DeptCode: 2 digits] + [RowIndex: 2 digits] + [Suffix: 2 digits] = 10 digits
```

### Example
- Item Code: 1234
- Department: 01 (first department)
- Row Index: 00 (base unit)
- Suffix: 00 (first attempt, no duplicates)
- **Final Barcode: 1234010000**

### With Conflict Resolution
If 1234010000 exists, suffix increments:
- Second attempt: 1234010001
- Third attempt: 1234010002
- ... up to 1234010099 (100 attempts max)

## Multi-System Data Entry Scenario

### Scenario: Two Terminals Creating Products Simultaneously

**System A (Terminal 1):**
1. User enters Item Code 5678
2. Requests barcode generation
3. Receives: `5678010000` (suffix 0)
4. Creates product with barcode

**System B (Terminal 2):**
1. User enters Item Code 5678 (same item)
2. Requests barcode generation
3. Queue checks: `5678010000` exists (pending from System A)
4. Increments suffix → `5678010001`
5. Returns: `5678010001`
6. Creates product with barcode

**Result:** No duplicates, FIFO order maintained, atomic operations

## Workflow: Product Creation with Server Barcode

### Step-by-Step Process

1. **User Selects Item Code**
   - Item Code: 1234
   - Department: Production (index 0)
   - Unit: Pieces (row 0 = base unit)

2. **User Clicks "Auto" Button**
   - Frontend builds base barcode: "12340100"
   - Calls `/products/generatebarcode` with:
     ```json
     {
       "baseBarcode": "12340100",
       "itemCode": "1234",
       "departmentId": "...",
       "systemId": "system-chrome-user1"
     }
     ```

3. **Server Processing**
   - Validates input
   - Checks if "1234010000" exists in products
   - Checks if "1234010000" exists in queue
   - Creates queue entry with status="pending"
   - Returns: `{ barcode: "1234010000", queueId: "...", suffix: 0 }`

4. **Frontend Updates UI**
   - Displays generated barcode: 1234010000
   - Stores queue ID in product state
   - User completes product form

5. **User Saves Product**
   - Sends product data with barcode to `/products/addproduct`
   - Server saves product
   - Returns product with _id

6. **Frontend Assigns Queue Entry**
   - Calls `/products/assignbarcode` with:
     ```json
     {
       "queueId": "...",
       "productId": "..."
     }
     ```
   - Server updates queue entry status="assigned"

7. **Complete**
   - Product saved with barcode
   - Queue entry linked to product
   - Barcode locked (cannot be reused)

## Error Handling

### Duplicate Barcode (After Max Retries)

**Error Code:** 409 Conflict

**Response:**
```json
{
  "success": false,
  "message": "Unable to generate unique barcode after 100 attempts. Base: 12340100",
  "error": "No unique suffix found"
}
```

**Resolution:**
- Check if base barcode pattern is correct
- Check item code, department, row index values
- Consider using different item code

### Missing Queue Entry

**Error Code:** 404 Not Found

**Response:**
```json
{
  "success": false,
  "message": "Queue entry not found",
  "error": "..."
}
```

**Cause:** Queue entry expired (5-minute timeout)

**Resolution:** Re-generate barcode

## Performance Considerations

### Database Queries
- **Barcode Generation:** 2 queries (product check + queue check)
- **Assignment:** 1 query (update queue entry)
- **Index:** Unique index on `generatedBarcode` prevents duplicates

### Timeout
- Queue entries expire after 5 minutes
- Auto-cleanup runs every 10 minutes
- Prevents orphaned entries

### Concurrent Requests
- Atomic operations ensure no race conditions
- FIFO ordering maintained by `createdAt` index
- Suffix increment ensures uniqueness under load

## Monitoring & Debugging

### Check Queue Status
```javascript
// Get all pending barcodes
GET /api/v1/products/barcodequeue/status?status=pending

// Get pending barcodes for specific system
GET /api/v1/products/barcodequeue/status?status=pending&systemId=system-terminal-1

// Get failed barcodes
GET /api/v1/products/barcodequeue/status?status=failed&limit=100
```

### Sample Queue Entry
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "systemId": "system-chrome-user1",
  "baseBarcode": "12340100",
  "generatedBarcode": "1234010000",
  "suffix": 0,
  "status": "assigned",
  "productId": "507f1f77bcf86cd799439012",
  "itemCode": "1234",
  "departmentId": "507f...",
  "retryCount": 0,
  "error": null,
  "createdAt": "2026-03-10T10:30:45.123Z",
  "updatedAt": "2026-03-10T10:31:12.456Z",
  "expiresAt": "2026-03-10T10:35:45.123Z"
}
```

## Migration from Client-Side to Server-Side

### What Changed

**Before (Client-Side):**
```javascript
// Client generates barcode
const itemDigits = "1234";
const deptCode = "01";
let barcode = "1234010000";

// Manual duplicate check (not atomic)
if (!await checkBarcodeExists(barcode)) {
  // Save with barcode
}
```

**After (Server-Side):**
```javascript
// Server generates barcode with atomic check
const result = await generateBarcodeOnServer(
  "12340100", "1234", departmentId
);
// result.barcode: "1234010000"
// result.queueId: stored for assignment
```

### Benefits

1. **Multi-System Safe**: Atomic operations prevent duplicates
2. **FIFO Queue**: Fair allocation across terminals
3. **Automatic Cleanup**: Expired entries auto-removed
4. **Scalability**: Server handles complexity, not client
5. **Auditability**: Queue tracks all barcode requests
6. **Monitoring**: Real-time queue status visibility

## Troubleshooting

### Issue: "Unable to generate unique barcode"

**Cause:** Too many products with same item code + department + row

**Solutions:**
1. Check if item code is correct
2. Use different department
3. Consider using manual barcode for this product
4. Check for duplicate products in database

### Issue: Queue entry expired, barcode lost

**Cause:** Product creation took longer than 5 minutes

**Solutions:**
1. Faster data entry (complete form before generating barcode)
2. Pre-allocate barcodes before user starts form
3. Extend queue expiration timeout in settings

### Issue: Multiple terminals generating duplicate barcodes

**This should not happen** - architecture prevents this through:
- Atomic database operations
- Queue entry locking
- Unique index on `generatedBarcode`

**If it occurs:**
1. Check database indexes are created
2. Verify MongoDB atomic operations are working
3. Check server logs for errors

## Future Enhancements

1. **Barcode Patterns**: Support custom patterns (e.g., EAN-13, UPC-A)
2. **Batch Generation**: Pre-allocate barcodes for bulk entry
3. **Barcode Recycling**: Recover barcodes from deleted products
4. **Analytics**: Track barcode generation metrics per terminal
5. **Integration**: Webhook notifications on barcode assignment
