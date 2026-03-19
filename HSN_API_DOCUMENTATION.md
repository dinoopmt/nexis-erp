# HSN API Documentation

## Overview
The HSN Master API provides comprehensive endpoints for managing Harmonized System of Nomenclature (HSN) codes used in India's GST system. These endpoints enable searching, validating, and managing HSN codes across the entire application.

## Base URL
```
http://localhost:5000/api/hsn
```

---

## Authentication
All endpoints are public. If you implement authentication, add the auth middleware to `hsnRoutes.js`.

---

## Endpoints

### 1. **Get HSN List with Filters**
Retrieve all HSN codes with optional filtering and pagination.

#### Request
```
GET /api/hsn/list
```

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category (e.g., "Foodstuffs") |
| `gstRate` | number | - | Filter by GST rate (0, 5, 12, 18, 28) |
| `isActive` | boolean | true | Filter by active status |
| `limit` | number | 100 | Results per page |
| `page` | number | 1 | Page number |
| `search` | string | - | Text search on description |

#### Example Requests
```bash
# Get first 50 active HSN codes
GET /api/hsn/list?limit=50&page=1

# Get foodstuff HSN codes with 5% GST
GET /api/hsn/list?category=Foodstuffs&gstRate=5

# Search for coffee products
GET /api/hsn/list?search=coffee

# Get all repealed HSN codes
GET /api/hsn/list?isActive=false
```

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "code": "090111",
      "description": "Coffee, not roasted, not decaffeinated",
      "category": "Foodstuffs",
      "gstRate": 5,
      "isActive": true,
      "repealed": false,
      "applicableFrom": "2017-07-01T00:00:00.000Z"
    }
    // ... more items
  ],
  "pagination": {
    "total": 2450,
    "page": 1,
    "pages": 25,
    "limit": 100
  }
}
```

---

### 2. **Get HSN by Code**
Retrieve a single HSN code with full details.

#### Request
```
GET /api/hsn/code/:code
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | 6-digit HSN code (e.g., "090111") |

#### Example Requests
```bash
GET /api/hsn/code/090111
GET /api/hsn/code/100610
```

#### Success Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "code": "090111",
    "chapter": 9,
    "heading": 1,
    "subHeading": 11,
    "description": "Coffee, not roasted, not decaffeinated",
    "category": "Foodstuffs",
    "gstRate": 5,
    "isActive": true,
    "repealed": false,
    "applicableFrom": "2017-07-01T00:00:00.000Z",
    "repealedDate": null,
    "replacementHSN": null,
    "remarks": null,
    "hsnStructure": {
      "code": "090111",
      "chapter": 9,
      "heading": 1,
      "subHeading": 11
    }
  }
}
```

#### Error Response (404)
```json
{
  "success": false,
  "error": "HSN code not found"
}
```

---

### 3. **Search HSN by Description**
Search HSN codes by description using text search.

#### Request
```
GET /api/hsn/search?query=coffee
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term (min 2 characters) |

#### Example Requests
```bash
GET /api/hsn/search?query=coffee
GET /api/hsn/search?query=textile
GET /api/hsn/search?query=machinery
```

#### Success Response (200)
```json
{
  "success": true,
  "query": "coffee",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "code": "090111",
      "description": "Coffee, not roasted, not decaffeinated",
      "category": "Foodstuffs",
      "gstRate": 5,
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "code": "090121",
      "description": "Coffee, roasted, not decaffeinated",
      "category": "Foodstuffs",
      "gstRate": 5,
      "isActive": true
    }
    // ... more results
  ],
  "count": 4
}
```

---

### 4. **Get HSN by Category**
Retrieve all HSN codes for a specific category.

#### Request
```
GET /api/hsn/category/:category
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | Yes | Category name |

#### Valid Categories
- Foodstuffs
- Textiles
- Machinery
- Electrical
- Vehicles
- Optical
- Glass & Ceramics
- Metals
- Plastics
- Wood & Paper
- Chemicals
- Minerals
- Apparel
- Footwear
- Stone & Clay
- Pharmaceuticals

#### Example Requests
```bash
GET /api/hsn/category/Foodstuffs
GET /api/hsn/category/Textiles
GET /api/hsn/category/Machinery
```

#### Success Response (200)
```json
{
  "success": true,
  "category": "Foodstuffs",
  "data": [
    {
      "code": "090111",
      "description": "Coffee, not roasted, not decaffeinated",
      "category": "Foodstuffs",
      "gstRate": 5,
      "isActive": true
    }
    // ... more items
  ],
  "count": 127
}
```

---

### 5. **Validate HSN Code**
Validate if an HSN code is valid and currently active.

#### Request
```
GET /api/hsn/validate/:code
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | 6-digit HSN code |

#### Example Requests
```bash
GET /api/hsn/validate/090111
GET /api/hsn/validate/invalid
```

#### Success Response - Valid Code (200)
```json
{
  "success": true,
  "valid": true,
  "code": "090111",
  "hsn": {
    "code": "090111",
    "description": "Coffee, not roasted, not decaffeinated",
    "category": "Foodstuffs",
    "gstRate": 5,
    "isActive": true
  }
}
```

#### Success Response - Invalid Code (200)
```json
{
  "success": true,
  "valid": false,
  "code": "999999",
  "error": "HSN code not found in master database"
}
```

#### Success Response - Repealed Code (200)
```json
{
  "success": true,
  "valid": false,
  "code": "089999",
  "error": "HSN code is no longer active",
  "replacement": "090111",
  "repealedDate": "2020-12-31T00:00:00.000Z"
}
```

---

### 6. **Get HSN Statistics**
Get aggregate statistics about HSN codes.

#### Request
```
GET /api/hsn/stats
```

#### Example Requests
```bash
GET /api/hsn/stats
```

#### Success Response (200)
```json
{
  "success": true,
  "statistics": {
    "total": 2450,
    "active": 2350,
    "repealed": 100,
    "byGSTRate": [
      {
        "_id": 0,
        "count": 150
      },
      {
        "_id": 5,
        "count": 850
      },
      {
        "_id": 12,
        "count": 950
      },
      {
        "_id": 18,
        "count": 350
      },
      {
        "_id": 28,
        "count": 150
      }
    ],
    "byCategory": [
      {
        "_id": "Machinery",
        "count": 450
      },
      {
        "_id": "Foodstuffs",
        "count": 350
      }
      // ... more categories
    ]
  }
}
```

---

### 7. **Get All Categories**
Retrieve all unique HSN categories.

#### Request
```
GET /api/hsn/categories
```

#### Example Requests
```bash
GET /api/hsn/categories
```

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    "Apparel",
    "Chemicals",
    "Electrical",
    "Foodstuffs",
    "Glass & Ceramics",
    "Machinery",
    "Metals",
    "Optical",
    "Pharmaceuticals",
    "Plastics",
    "Stone & Clay",
    "Textiles",
    "Vehicles",
    "Wood & Paper"
  ]
}
```

---

### 8. **Get HSN Dropdown Data**
Get formatted HSN data for UI dropdowns/selects.

#### Request
```
GET /api/hsn/dropdown?category=Foodstuffs
```

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Optional category filter |

#### Example Requests
```bash
GET /api/hsn/dropdown
GET /api/hsn/dropdown?category=Foodstuffs
```

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "value": "090111",
      "label": "090111 - Coffee, not roasted, not decaffeinated (5% GST)",
      "code": "090111",
      "description": "Coffee, not roasted, not decaffeinated",
      "gstRate": 5
    },
    {
      "value": "090121",
      "label": "090121 - Coffee, roasted, not decaffeinated (5% GST)",
      "code": "090121",
      "description": "Coffee, roasted, not decaffeinated",
      "gstRate": 5
    }
    // ... more items
  ]
}
```

---

### 9. **Get HSN with Product Count**
Get HSN codes with count of products using each code.

#### Request
```
GET /api/hsn/with-products
```

#### Example Requests
```bash
GET /api/hsn/with-products
```

#### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "code": "090111",
      "description": "Coffee, not roasted, not decaffeinated",
      "category": "Foodstuffs",
      "gstRate": 5,
      "productCount": 15
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "code": "100610",
      "description": "Cereals",
      "category": "Foodstuffs",
      "gstRate": 5,
      "productCount": 8
    }
    // ... more items
  ]
}
```

---

### 10. **Create New HSN Code**
Create a new custom HSN code (admin only).

#### Request
```
POST /api/hsn/create
Content-Type: application/json

{
  "code": "090145",
  "description": "Coffee compound",
  "category": "Foodstuffs",
  "gstRate": 5
}
```

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | 6-digit HSN code |
| `description` | string | Yes | Product description |
| `category` | string | Yes | Category name |
| `gstRate` | number | Yes | GST rate (0, 5, 12, 18, 28) |
| `remarks` | string | No | Additional notes |
| `applicableFrom` | date | No | When HSN is applicable |

#### Success Response (201)
```json
{
  "success": true,
  "message": "HSN code created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "code": "090145",
    "chapter": 9,
    "heading": 1,
    "subHeading": 45,
    "description": "Coffee compound",
    "category": "Foodstuffs",
    "gstRate": 5,
    "isActive": true,
    "repealed": false,
    "applicableFrom": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Response (400)
```json
{
  "success": false,
  "error": "HSN code 090145 already exists"
}
```

---

### 11. **Update HSN Code**
Update an existing HSN code (admin only).

#### Request
```
PUT /api/hsn/update/:code
Content-Type: application/json

{
  "description": "Updated description",
  "remarks": "Updated GST rate",
  "gstRate": 12
}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | 6-digit HSN code |

#### Request Body
Fields to update (same as Create, except `code` is read-only).

#### Success Response (200)
```json
{
  "success": true,
  "message": "HSN code updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "code": "090111",
    "description": "Updated description",
    "category": "Foodstuffs",
    "gstRate": 12,
    "isActive": true
  }
}
```

---

### 12. **Mark HSN as Repealed**
Mark an HSN code as repealed with optional replacement code.

#### Request
```
POST /api/hsn/repeal/:code
Content-Type: application/json

{
  "replacementCode": "090121",
  "reason": "Superseded by new classification"
}
```

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | 6-digit HSN code to repeal |

#### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `replacementCode` | string | No | New HSN code to use instead |
| `reason` | string | No | Reason for repeal |

#### Success Response (200)
```json
{
  "success": true,
  "message": "HSN code marked as repealed",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "code": "090111",
    "repealed": true,
    "repealedDate": "2024-01-15T10:30:00.000Z",
    "replacementHSN": "090121",
    "remarks": "Superseded by new classification",
    "isActive": false
  }
}
```

---

## HSN Validation Service

The `HSNValidationService` provides methods for validating HSN codes in backend logic.

### Usage Examples

```javascript
import HSNValidationService from '../services/HSNValidationService.js';

// 1. Validate format (6 digits)
const formatCheck = HSNValidationService.validateFormat('090111');
// Returns: { valid: true }

// 2. Validate code exists
const existCheck = await HSNValidationService.validateExists('090111');
// Returns: { valid: true, hsn: { code, description, category, gstRate } }

// 3. Validate code is active (not repealed)
const activeCheck = await HSNValidationService.validateActive('090111');
// Returns: { valid: true } or { valid: false, repealed: true, replacement: ... }

// 4. Complete validation (format + exists + active)
const completeCheck = await HSNValidationService.validateComplete('090111');
// Returns: { valid: true, hsn: {...} } or any of the errors

// 5. Get GST rate for HSN
const gstInfo = await HSNValidationService.getGSTRate('090111');
// Returns: { success: true, code: '090111', gstRate: 5, description: '...' }

// 6. Search HSN by description
const results = await HSNValidationService.search('coffee');
// Returns: { success: true, exact: false, data: [...] }

// 7. Get chapter name from code
const chapter = HSNValidationService.getChapterName('090111');
// Returns: 'Coffee, Tea, Spices'

// 8. Format code for display
const formatted = HSNValidationService.formatCode('090111');
// Returns: '09-01-11'

// 9. Bulk validate multiple codes
const bulkResult = await HSNValidationService.validateBulk(['090111', '100610', '999999']);
// Returns: { success: true, results: { valid: [...], invalid: [...], repealed: [...] }, summary: {...} }

// 10. Validate for category match
const categoryCheck = await HSNValidationService.validateForCategory('090111', 'Coffee');
// Returns: { valid: true } or { valid: false, warning: '...', canOverride: true }
```

---

## Error Codes

| Status Code | Meaning |
|------------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Server Error |

---

## Rate Limiting
Currently not implemented. Consider adding rate limiting middleware for production.

---

## CORS
CORS is enabled. Adjust as needed in `server.js`.

---

## Pagination
Default limit: 100 records per page
Maximum limit: 1000 records per page

---

## Text Search
The API uses MongoDB text indexes for description search. The text search is case-insensitive and matches partial words.

---

## Caching Recommendations

For production, consider implementing Redis caching for:
1. HSN list (cache for 1 hour)
2. Category list (cache for 1 day)
3. Statistics (cache for 1 hour)

---

## Webhook Example (Future Enhancement)

```javascript
// Example: Notify when a product is created with HSN
app.post('/webhook/product-hsn', (req, res) => {
  const { productId, hsn, gstRate } = req.body;
  // Process webhook
});
```

---

## Related Models
- **Product** (`server/Models/AddProduct.js`) - Optional `hsnReference` field and `gstRate` field
- **HSNMaster** (`server/Models/HSNMaster.js`) - Core HSN database

---

## File References

- **Controller**: [server/controllers/hsnController.js](../controllers/hsnController.js)
- **Routes**: [server/routes/hsnRoutes.js](../routes/hsnRoutes.js)
- **Service**: [server/services/HSNValidationService.js](../services/HSNValidationService.js)
- **Model**: [server/Models/HSNMaster.js](../Models/HSNMaster.js)
- **Seeder**: [server/hsnMasterSeeder.js](../hsnMasterSeeder.js)

---

## Next Steps

1. **Execute Seeder**: `cd server && node hsnMasterSeeder.js`
2. **Test Endpoints**: Use Postman or curl to test API endpoints
3. **Implement Frontend**: Create HSN autocomplete component
4. **Link Products**: Update product form to use HSN dropdown
5. **Integrate Reports**: Add HSN to invoice generation

---

## Support
For issues or enhancements, refer to the HSN Management documentation files.
