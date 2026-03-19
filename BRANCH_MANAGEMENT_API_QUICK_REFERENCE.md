# Branch Management API - Quick Reference

## 🚀 Base URL
```
/api/v1/organizations
```

---

## 📋 Endpoints Summary

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/tree` | Hierarchical structure | ✅ |
| GET | `/all` | All branches (flat) | ✅ |
| GET | `/:branchId` | Single branch details | ✅ |
| GET | `/:branchId/config` | Branch configuration | ✅ |
| GET | `/:branchId/path` | Breadcrumb path | ✅ |
| GET | `/country/:country` | Filter by country | ✅ |
| GET | `/parent/:parentId` | Child branches | ✅ |
| POST | `/` | Create organization | ✅ |
| PUT | `/:branchId` | Update organization | ✅ |
| DELETE | `/:branchId` | Delete (soft) | ✅ |
| POST | `/:fromBranchId/transfer/:toBranchId` | Transfer inventory | ✅ |

---

## GET Endpoints

### 1️⃣ Get Organization Tree (Hierarchical)
```
GET /api/v1/organizations/tree
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Main Head Office",
      "code": "HO-001",
      "type": "HEAD_OFFICE",
      "level": 0,
      "address": "123 Main St",
      "city": "Dubai",
      "country": "UAE",
      "children": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Dubai Store",
          "code": "BR-001",
          "type": "BRANCH",
          "level": 1,
          "parentId": "507f1f77bcf86cd799439011",
          "children": []
        }
      ]
    }
  ]
}
```

---

### 2️⃣ Get All Branches (Flat List)
```
GET /api/v1/organizations/all
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Main Head Office",
      "code": "HO-001",
      "type": "HEAD_OFFICE",
      "level": 0
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Dubai Store",
      "code": "BR-001",
      "type": "BRANCH",
      "level": 1
    }
  ]
}
```

---

### 3️⃣ Get Single Branch
```
GET /api/v1/organizations/{branchId}
```

**Example:**
```
GET /api/v1/organizations/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Main Head Office",
    "code": "HO-001",
    "type": "HEAD_OFFICE",
    "address": "123 Main St",
    "city": "Dubai",
    "country": "UAE",
    "currency": "AED",
    "timezone": "Asia/Dubai",
    "phone": "+971-4-1234567",
    "email": "contact@nexis.com",
    "managerId": "user_123",
    "isActive": true,
    "createdAt": "2024-03-10T10:00:00Z",
    "updatedAt": "2024-03-10T10:00:00Z"
  }
}
```

---

### 4️⃣ Get Branch Configuration
```
GET /api/v1/organizations/{branchId}/config
```

**Example:**
```
GET /api/v1/organizations/507f1f77bcf86cd799439011/config
```

**Response:**
```json
{
  "success": true,
  "data": {
    "branchId": "507f1f77bcf86cd799439011",
    "branchName": "Main Head Office",
    "currency": "AED",
    "timezone": "Asia/Dubai",
    "country": "UAE",
    "taxNumber": "123456789",
    "allowInventoryTransfer": true,
    "warehouseId": "warehouse_001"
  }
}
```

---

### 5️⃣ Get Branch Hierarchy Path
```
GET /api/v1/organizations/{branchId}/path
```

**Example:**
```
GET /api/v1/organizations/507f1f77bcf86cd799439012/path
```

**Response (Breadcrumb):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Main Head Office",
      "code": "HO-001"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Dubai Store",
      "code": "BR-001"
    }
  ]
}
```

---

### 6️⃣ Get Branches by Country
```
GET /api/v1/organizations/country/{country}
```

**Example:**
```
GET /api/v1/organizations/country/UAE
```

**Valid Countries:** UAE, Oman, India

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    // All branches in UAE
  ]
}
```

---

### 7️⃣ Get Child Branches
```
GET /api/v1/organizations/parent/{parentId}
```

**Example:**
```
GET /api/v1/organizations/parent/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Dubai Store",
      "code": "BR-001",
      "type": "BRANCH"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Abu Dhabi Store",
      "code": "BR-002",
      "type": "BRANCH"
    }
  ]
}
```

---

## POST Endpoints

### 1️⃣ Create Organization
```
POST /api/v1/organizations
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Dubai Regional Office",
  "code": "RG-001",
  "type": "REGIONAL",
  "parentId": "507f1f77bcf86cd799439011",
  "address": "456 Business Park",
  "city": "Dubai",
  "country": "UAE",
  "postalCode": "12345",
  "phone": "+971-4-8765432",
  "email": "dubai@nexis.com",
  "currency": "AED",
  "timezone": "Asia/Dubai",
  "taxNumber": "987654321",
  "managerId": "user_456",
  "allowInventoryTransfer": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Dubai Regional Office",
    "code": "RG-001",
    "type": "REGIONAL",
    "level": 1,
    "// ... other fields"
  },
  "message": "Organization created successfully"
}
```

**Required Fields:**
- name
- code
- type (HEAD_OFFICE, REGIONAL, BRANCH, STORE)
- country (UAE, Oman, India)
- city

**Optional Fields:**
- parentId (omit for head offices)
- address, postalCode
- phone, email
- currency, timezone
- taxNumber, managerId
- allowInventoryTransfer

---

### 2️⃣ Transfer Inventory Between Branches
```
POST /api/v1/organizations/{fromBranchId}/transfer/{toBranchId}
Content-Type: application/json
```

**Example:**
```
POST /api/v1/organizations/507f1f77bcf86cd799439012/transfer/507f1f77bcf86cd799439013
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "prod_001",
      "quantity": 50,
      "batchNumber": "BATCH-2024-001"
    },
    {
      "productId": "prod_002",
      "quantity": 25
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "transfer_001",
    "fromBranch": "507f1f77bcf86cd799439012",
    "toBranch": "507f1f77bcf86cd799439013",
    "itemsTransferred": 2,
    "status": "initiated"
  }
}
```

---

## PUT Endpoints

### Update Organization
```
PUT /api/v1/organizations/{branchId}
Content-Type: application/json
```

**Example:**
```
PUT /api/v1/organizations/507f1f77bcf86cd799439011
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "address": "New Address",
  "city": "New City",
  "phone": "+971-4-9999999",
  "email": "newemail@nexis.com",
  "currency": "AED",
  "timezone": "Asia/Dubai",
  "managerId": "user_789"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "// ... updated fields"
  },
  "message": "Organization updated successfully"
}
```

**⚠️ Cannot be Changed:**
- code
- parentId
- type

---

## DELETE Endpoints

### Delete Organization (Soft Delete)
```
DELETE /api/v1/organizations/{branchId}
```

**Example:**
```
DELETE /api/v1/organizations/507f1f77bcf86cd799439012
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "isActive": false,
    "deletedAt": "2024-03-10T10:30:00Z"
  },
  "message": "Organization deleted successfully"
}
```

**Note:** Soft delete only sets `isActive: false`. Data remains in database.

---

## 🔴 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request data"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Organization not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Cannot delete organization with child branches"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🧪 Test Examples

### Using curl

**Get Tree:**
```bash
curl -X GET http://localhost:3000/api/v1/organizations/tree
```

**Create Head Office:**
```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Head Office",
    "code": "HO-001",
    "type": "HEAD_OFFICE",
    "country": "UAE",
    "city": "Dubai",
    "currency": "AED"
  }'
```

**Update Branch:**
```bash
curl -X PUT http://localhost:3000/api/v1/organizations/{branchId} \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+971-4-9999999",
    "email": "newemail@nexis.com"
  }'
```

**Delete (Soft):**
```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/{branchId}
```

---

## 📱 Frontend Usage (BranchSelector)

```javascript
import BranchSelector from '@/components/BranchSelector/BranchSelector';

function MyComponent() {
  const handleBranchChange = (branchData) => {
    console.log(branchData);
    // { branchId: "...", branchName: "..." }
  };

  return (
    <BranchSelector 
      onBranchChange={handleBranchChange}
      selectedBranchId={currentBranchId}
    />
  );
}
```

---

## 🎯 Common Workflows

### Workflow 1: Create Organization Hierarchy
```bash
# 1. Create Head Office
HO=$(curl -s -X POST ... HO_DATA | jq -r '.data._id')

# 2. Create Regional Office under HO
RG=$(curl -s -X POST ... -d "{parentId: $HO, ...}" | jq -r '.data._id')

# 3. Create Branches under Regional
BR1=$(curl -s -X POST ... -d "{parentId: $RG, ...}")
BR2=$(curl -s -X POST ... -d "{parentId: $RG, ...}")
```

### Workflow 2: Select Branch in Product Form
```javascript
const [selectedBranch, setSelectedBranch] = useState(null);

const saveProduct = async () => {
  const payload = {
    // ... product fields
    branchId: selectedBranch?.branchId,
    branchName: selectedBranch?.branchName
  };
  
  await api.post('/products', payload);
};
```

### Workflow 3: Get Branch Configuration
```javascript
const fetchBranchConfig = async (branchId) => {
  const { data } = await axios.get(`/api/v1/organizations/${branchId}/config`);
  // Use config.currency, config.timezone, etc.
};
```

---

## 📊 Data Model

### Organization Document
```json
{
  "_id": ObjectId,
  "name": "Branch Name",
  "code": "BR-001",
  "type": "BRANCH",
  "parentId": ObjectId,
  "level": 1,
  "address": "Street Address",
  "city": "City",
  "country": "UAE|Oman|India",
  "postalCode": "12345",
  "phone": "Phone",
  "email": "Email",
  "managerId": ObjectId,
  "currency": "AED|USD|INR|OMR",
  "timezone": "Asia/Dubai",
  "taxNumber": "Tax ID",
  "warehouseId": ObjectId,
  "allowInventoryTransfer": true|false,
  "isActive": true|false,
  "createdBy": "username",
  "updatedBy": "username",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

---

## ⚡ Performance Tips

1. **Cache the tree** - It doesn't change often
2. **Use `/all` for dropdowns** - Flat list is faster
3. **Use `/path` for breadcrumbs** - Just one query
4. **Filter by country early** - Reduces dataset size
5. **Use pagination for getAllBranches** - Add ?page=1&limit=50

---

## 🔗 Related Documentation

- **Full Integration Guide:** BRANCH_MANAGEMENT_INTEGRATION_GUIDE.md
- **Strategic Overview:** BRANCH_MANAGEMENT_GUIDE.md
- **Implementation Summary:** BRANCH_MANAGEMENT_IMPLEMENTATION_COMPLETE.md

---

**Last Updated:** 2024-03-10
**API Version:** v1
**Status:** Production Ready ✅
