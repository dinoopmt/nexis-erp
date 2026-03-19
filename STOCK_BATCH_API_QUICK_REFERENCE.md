# Stock Batch API - Quick Reference

## Base URL
```
/api/v1/stock-batches
```

---

## Endpoints

### 1. CREATE BATCH
```http
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
  "notes": "First batch"
}

Response: 201 Created
{
  "success": true,
  "message": "Stock batch created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "batchNumber": "BATCH-2024-001",
    "quantity": 100,
    "usedQuantity": 0,
    "batchStatus": "ACTIVE",
    "daysToExpiry": 365,
    ...
  }
}
```

---

### 2. GET BATCHES BY PRODUCT
```http
GET /api/v1/stock-batches/product/:productId

Response: 200 OK
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
      ...
    }
  ]
}
```

**Example**:
```
GET /api/v1/stock-batches/product/507f1f77bcf86cd799439011
```

---

### 3. GET BATCH BY NUMBER
```http
GET /api/v1/stock-batches/:productId/batch/:batchNumber

Response: 200 OK
{
  "success": true,
  "message": "Batch retrieved successfully",
  "data": { ... }
}
```

**Example**:
```
GET /api/v1/stock-batches/507f1f77bcf86cd799439011/batch/BATCH-2024-001
```

---

### 4. GET EXPIRING BATCHES
```http
GET /api/v1/stock-batches/expiring/list?days=30

Query Parameters:
- days: Number of days (optional, default: 30)

Response: 200 OK
{
  "success": true,
  "message": "Batches expiring within 30 days retrieved",
  "count": 2,
  "data": [ ... ]
}
```

**Examples**:
```
GET /api/v1/stock-batches/expiring/list
GET /api/v1/stock-batches/expiring/list?days=7
GET /api/v1/stock-batches/expiring/list?days=60
```

---

### 5. GET EXPIRED BATCHES
```http
GET /api/v1/stock-batches/expired/list

Response: 200 OK
{
  "success": true,
  "message": "Expired batches retrieved successfully",
  "count": 1,
  "data": [ ... ]
}
```

---

### 6. GET LOW STOCK BATCHES
```http
GET /api/v1/stock-batches/low-stock/list?threshold=10

Query Parameters:
- threshold: Quantity threshold (optional, default: 10)

Response: 200 OK
{
  "success": true,
  "message": "Batches with <= 10 quantity retrieved",
  "count": 2,
  "data": [ ... ]
}
```

**Examples**:
```
GET /api/v1/stock-batches/low-stock/list
GET /api/v1/stock-batches/low-stock/list?threshold=5
GET /api/v1/stock-batches/low-stock/list?threshold=50
```

---

### 7. GET BATCH STATISTICS
```http
GET /api/v1/stock-batches/stats/:productId

Response: 200 OK
{
  "success": true,
  "message": "Batch statistics retrieved successfully",
  "data": {
    "productId": "507f1f77bcf86cd799439011",
    "totalBatches": 3,
    "activeBatches": 2,
    "expiringBatches": 1,
    "totalQuantity": 300,
    "totalQuantityInUse": 50,
    "totalCost": 7650,
    "nearestExpiryDate": "2025-01-15",
    "nearestExpiryDays": 20,
    "averageCostPerUnit": 25.50
  }
}
```

**Example**:
```
GET /api/v1/stock-batches/stats/507f1f77bcf86cd799439011
```

---

### 8. GET FIFO BATCH
```http
GET /api/v1/stock-batches/fifo/:productId

Response: 200 OK
{
  "success": true,
  "message": "FIFO batch retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "batchNumber": "BATCH-2024-001",
    "manufacturingDate": "2024-01-01",
    "expiryDate": "2025-01-01",
    "quantity": 100,
    "usedQuantity": 25,
    "availableQuantity": 75
  }
}
```

**Example**:
```
GET /api/v1/stock-batches/fifo/507f1f77bcf86cd799439011
```

---

### 9. CONSUME BATCH QUANTITY
```http
POST /api/v1/stock-batches/:batchId/consume
Content-Type: application/json

{
  "quantityToUse": 10
}

Response: 200 OK
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

---

### 10. UPDATE BATCH
```http
PUT /api/v1/stock-batches/:batchId
Content-Type: application/json

{
  "quantity": 120,
  "supplier": "New Supplier",
  "notes": "Updated batch information"
}

Response: 200 OK
{
  "success": true,
  "message": "Batch updated successfully",
  "data": { ... }
}
```

---

### 11. DELETE BATCH
```http
DELETE /api/v1/stock-batches/:batchId

Response: 200 OK
{
  "success": true,
  "message": "Batch deleted successfully",
  "data": {
    "deletedId": "507f1f77bcf86cd799439012"
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Batch created successfully |
| 400 | Bad Request - Invalid input or missing fields |
| 404 | Not Found - Product or batch not found |
| 500 | Server Error - Database or processing error |

---

## Batch Status Values

| Status | Description |
|--------|-------------|
| ACTIVE | Normal inventory available |
| EXPIRING_SOON | Within alert days of expiry |
| EXPIRED | Past expiry date |
| CLOSED | No longer available |

---

## Common Request/Response Patterns

### List Endpoints
```http
GET /api/v1/stock-batches/{action}/list?param=value

Response always includes:
- success (boolean)
- message (string)
- count (number of items)
- data (array of items)
```

### Detail Endpoints
```http
GET /api/v1/stock-batches/{resource}/:id

Response always includes:
- success (boolean)
- message (string)
- data (single item)
```

### Action Endpoints
```http
POST /api/v1/stock-batches/:batchId/{action}

Response always includes:
- success (boolean)
- message (string)
- data (result of action)
```

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## cURL Examples

### Create Batch
```bash
curl -X POST http://localhost:5000/api/v1/stock-batches \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "batchNumber": "BATCH-2024-001",
    "manufacturingDate": "2024-01-01",
    "expiryDate": "2025-01-01",
    "quantity": 100,
    "costPerUnit": 25.50
  }'
```

### Get Batches for Product
```bash
curl http://localhost:5000/api/v1/stock-batches/product/507f1f77bcf86cd799439011
```

### Get Expiring Batches (Next 7 Days)
```bash
curl http://localhost:5000/api/v1/stock-batches/expiring/list?days=7
```

### Consume Batch Quantity
```bash
curl -X POST http://localhost:5000/api/v1/stock-batches/507f1f77bcf86cd799439012/consume \
  -H "Content-Type: application/json" \
  -d '{"quantityToUse": 10}'
```

### Update Batch
```bash
curl -X PUT http://localhost:5000/api/v1/stock-batches/507f1f77bcf86cd799439012 \
  -H "Content-Type: application/json" \
  -d '{"supplier": "New Supplier"}'
```

### Delete Batch
```bash
curl -X DELETE http://localhost:5000/api/v1/stock-batches/507f1f77bcf86cd799439012
```

---

## JavaScript Fetch Examples

### Create Batch
```javascript
const createBatch = async (batchData) => {
  const response = await fetch('/api/v1/stock-batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchData)
  });
  return response.json();
};

// Usage
await createBatch({
  productId: '507f1f77bcf86cd799439011',
  batchNumber: 'BATCH-2024-001',
  manufacturingDate: '2024-01-01',
  expiryDate: '2025-01-01',
  quantity: 100,
  costPerUnit: 25.50
});
```

### Get Batches
```javascript
const getBatches = async (productId) => {
  const response = await fetch(`/api/v1/stock-batches/product/${productId}`);
  return response.json();
};
```

### Get Expiring Batches
```javascript
const getExpiringBatches = async (days = 30) => {
  const response = await fetch(`/api/v1/stock-batches/expiring/list?days=${days}`);
  return response.json();
};
```

### Consume Batch
```javascript
const consumeBatch = async (batchId, quantity) => {
  const response = await fetch(`/api/v1/stock-batches/${batchId}/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantityToUse: quantity })
  });
  return response.json();
};
```

---

## Axios Examples

### Create Batch
```javascript
import axios from 'axios';

const batchData = {
  productId: '507f1f77bcf86cd799439011',
  batchNumber: 'BATCH-2024-001',
  manufacturingDate: '2024-01-01',
  expiryDate: '2025-01-01',
  quantity: 100,
  costPerUnit: 25.50
};

axios.post('/api/v1/stock-batches', batchData)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

### Get with Axios
```javascript
axios.get(`/api/v1/stock-batches/product/${productId}`)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

---

## Notes

1. All dates should be in ISO format (YYYY-MM-DD)
2. Expiry date must be after manufacturing date
3. Quantity must be positive number
4. Cost per unit should be decimal
5. Batch numbers must be unique per product
6. Status is auto-calculated based on dates
7. All endpoints require valid MongoDB ObjectIds
8. Empty arrays in responses mean no matching data

---

*Last Updated: 2024*
*API Version: 1.0*
