# Branch Management Integration Guide

## Overview
This guide covers the integration of the Branch Management system into the NEXIS-ERP product module. The system includes:

1. **Backend:** Organization Model, OrganizationService, API Controller, API Routes
2. **Frontend:** BranchSelector Component
3. **Integration:** Product form updates to include branch selection

---

## Part 1: Backend Implementation (COMPLETED ✅)

### 1.1 Organization Model
**File:** `server/Models/Organization.js`
- Defines MongoDB schema for organizational hierarchy
- Supports multiple types: HEAD_OFFICE, REGIONAL, BRANCH, STORE
- Tracks location, contact, and operational settings
- Includes audit fields (createdBy, updatedBy, timestamps)

### 1.2 Organization Service
**File:** `server/modules/organization/services/OrganizationService.js`
- Business logic layer with 13 methods
- Key features:
  - Tree building for hierarchical display
  - CRUD operations with validation
  - Branch configuration retrieval
  - Inventory transfer management
  - Hierarchy traversal (breadcrumb paths)

### 1.3 Organization Controller
**File:** `server/modules/organization/controllers/organizationController.js`
- HTTP request handlers for all organization endpoints
- Integrates with OrganizationService
- Handles user context from request (createdBy/updatedBy)
- Proper error handling and response formatting

### 1.4 Organization Routes
**File:** `server/modules/organization/routes/organizationRoutes.js`
- Express router with 10 endpoints:
  - `GET /tree` - Get hierarchical organization structure
  - `GET /all` - Get all branches (flat list)
  - `GET /country/:country` - Get branches by country
  - `GET /:branchId` - Get specific branch
  - `GET /:branchId/config` - Get branch configuration
  - `GET /:branchId/path` - Get breadcrumb path
  - `GET /parent/:parentId` - Get child branches
  - `POST /` - Create new organization
  - `PUT /:branchId` - Update organization
  - `DELETE /:branchId` - Delete organization (soft delete)
  - `POST /:fromBranchId/transfer/:toBranchId` - Transfer inventory

### 1.5 Server Integration
**File:** `server/server.js` (UPDATED)
- Added import for organizationRoutes
- Registered routes at `/api/v1/organizations`
- All 10 endpoints now available

---

## Part 2: Frontend Implementation (COMPLETED ✅)

### 2.1 BranchSelector Component
**File:** `client/src/components/BranchSelector/BranchSelector.jsx`

#### Features:
- **Dual View Modes:**
  - Hierarchy View: Tree structure with expand/collapse
  - Flat List View: Dropdown for easy selection
  
- **Visual Elements:**
  - Icons based on branch type (🏢 office, 🏭 regional, 🏪 branch, 🛒 store)
  - Branch name and code display
  - Selection indicator (checkmark)
  - Loading state and error handling

#### Props:
```javascript
BranchSelector.propTypes = {
  onBranchChange: PropTypes.func.isRequired,  // Called on selection
  selectedBranchId: PropTypes.string,          // Current selection
};
```

#### Callback Format:
```javascript
onBranchChange({
  branchId: "507f1f77bcf86cd799439011",
  branchName: "Main Store - UAE"
})
```

#### API Integration:
- Calls `GET /api/v1/organizations/tree` on mount
- Auto-refresh capability
- Error handling with user feedback

### 2.2 Component Styling
**File:** `client/src/components/BranchSelector/BranchSelector.css`

#### Features:
- Responsive design (mobile & desktop)
- Tree node expansion animation
- Hover effects and selected state styling
- Scrollbar customization
- Button and input styling

#### Key Classes:
- `.branch-selector` - Container
- `.branch-tree` - Hierarchical view
- `.branch-flat-list` - Flat dropdown view
- `.branch-node-content` - Individual node
- `.branch-name` - Selectable branch button

---

## Part 3: Integration with Product Form

### 3.1 Basic Integration (Step by Step)

#### Step 1: Import BranchSelector
In `client/src/modules/inventory/Product.jsx`:

```javascript
import BranchSelector from '../../components/BranchSelector/BranchSelector';
```

#### Step 2: Add State for Selected Branch
In Product component state initialization (around line 50-100):

```javascript
const [selectedBranch, setSelectedBranch] = useState(null);

const handleBranchChange = (branchData) => {
  setSelectedBranch(branchData);
};
```

#### Step 3: Add Component to Form
Add before or after the company/location selectors (recommended after company selection):

```javascript
<div className="form-section">
  <h3>Location Information</h3>
  
  {/* Existing company selector */}
  {/* ... */}
  
  {/* Add BranchSelector */}
  <BranchSelector 
    onBranchChange={handleBranchChange}
    selectedBranchId={selectedBranch?.branchId}
  />
  
  {/* Display selected branch info */}
  {selectedBranch && (
    <div className="selected-branch-info">
      <p>Selected: <strong>{selectedBranch.branchName}</strong></p>
      <p>Branch ID: <code>{selectedBranch.branchId}</code></p>
    </div>
  )}
</div>
```

#### Step 4: Update Payload to Include Branch
In the `handleSaveProduct` function (lines ~2200-2300):

```javascript
const payload = {
  // ... existing fields ...
  
  // Add branch information
  branchId: selectedBranch?.branchId || null,
  branchName: selectedBranch?.branchName || '',
  
  // Keep existing audit fields
  createdBy: isNewProduct ? user?.username : newProduct?.createdBy,
  updatedBy: user?.username
};
```

#### Step 5: Update API Call
Update the product save endpoint to handle branchId (if Product model is updated):

```javascript
// In Product Model (server/Models/Product.js) - ADD THIS FIELD:
branchId: {
  type: Schema.Types.ObjectId,
  ref: 'Organization',
  default: null
},
branchName: {
  type: String,
  default: ''
}
```

### 3.2 Advanced Integration: Data Isolation

#### Query-Level Isolation
In product controllers/services, filter by branch:

```javascript
// In server/modules/inventory/services/ProductService.js
const getProductsByBranch = async (companyId, branchId) => {
  const query = {
    companyId,
    ...(branchId && { branchId })  // Add branch filter
  };
  return await Product.find(query).lean();
};
```

#### Inventory Tracking by Branch
In stock management:

```javascript
// Stock entry should include branch context
const stockEntry = {
  productId,
  companyId,
  branchId,  // Track which branch
  quantity,
  location: 'warehouse_A'  // Can be refined per branch
};
```

---

## Part 4: API Usage Reference

### 4.1 Frontend API Calls

#### Get Organization Tree
```javascript
// BranchSelector handles this automatically
// Example manual call:
axios.get('/api/v1/organizations/tree')
  .then(res => {
    console.log(res.data.data); // Array of root branches with nested children
  });
```

#### Get All Branches (Flat)
```javascript
axios.get('/api/v1/organizations/all')
  .then(res => {
    console.log(res.data.data); // Flat array of all branches
  });
```

#### Get Specific Branch
```javascript
axios.get(`/api/v1/organizations/${branchId}`)
  .then(res => {
    console.log(res.data.data); // Branch details with relationships
  });
```

#### Get Branch Configuration
```javascript
axios.get(`/api/v1/organizations/${branchId}/config`)
  .then(res => {
    const config = res.data.data;
    console.log(config.currency, config.timezone);
  });
```

### 4.2 Server-Side API Usage

#### In Controllers
```javascript
import OrganizationService from '../modules/organization/services/OrganizationService.js';

// Get branch details
const branch = await OrganizationService.getBranchById(branchId);

// Get configuration
const config = await OrganizationService.getBranchConfig(branchId);

// Transfer inventory
const result = await OrganizationService.transferInventory(
  fromBranchId,
  toBranchId,
  items
);
```

---

## Part 5: Complete File Checklist

### Backend Files
- ✅ `server/Models/Organization.js` - MongoDB model
- ✅ `server/modules/organization/services/OrganizationService.js` - Business logic
- ✅ `server/modules/organization/controllers/organizationController.js` - HTTP handlers
- ✅ `server/modules/organization/routes/organizationRoutes.js` - Express routes
- ✅ `server/server.js` - Route registration

### Frontend Files
- ✅ `client/src/components/BranchSelector/BranchSelector.jsx` - React component
- ✅ `client/src/components/BranchSelector/BranchSelector.css` - Component styling

### Files to Update (Manual)
- `client/src/modules/inventory/Product.jsx` - Add BranchSelector and state management
- `server/Models/Product.js` - Add branchId and branchName fields (optional but recommended)

---

## Part 6: Testing the Integration

### Step 1: Create Organization Hierarchy
```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Head Office",
    "code": "HO-001",
    "type": "HEAD_OFFICE",
    "address": "123 Main St",
    "city": "Dubai",
    "country": "UAE",
    "currency": "AED",
    "timezone": "Asia/Dubai"
  }'
```

### Step 2: Create Child Branches
```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dubai Store",
    "code": "BR-001",
    "type": "BRANCH",
    "parentId": "<<HEAD_OFFICE_ID>>",
    "address": "Branch Address",
    "city": "Dubai",
    "country": "UAE",
    "currency": "AED"
  }'
```

### Step 3: Test BranchSelector Component
1. Open product creation form
2. BranchSelector should load with hierarchy
3. Select a branch
4. Verify `selectedBranch` state updates
5. Save product and verify branchId in payload

### Step 4: Verify Audit Trail
1. Create product with branch
2. Check HistoryTab for audit fields
3. Verify createdBy, updatedBy, timestamps

---

## Part 7: Performance Considerations

### Caching
For frequently accessed organization tree, consider caching:
```javascript
// In OrganizationService
const CACHE_KEY = 'org_tree';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getOrganizationTree = async (useCache = true) => {
  if (useCache) {
    const cached = cache.get(CACHE_KEY);
    if (cached) return cached;
  }
  
  const tree = buildTree(/* ... */);
  cache.set(CACHE_KEY, tree, CACHE_TTL);
  return tree;
};
```

### Pagination for Large Organizations
```javascript
// Add pagination for getAllBranches
export const getAllBranches = async (page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  return await Organization.find({ isActive: true })
    .skip(skip)
    .limit(limit)
    .lean();
};
```

---

## Part 8: Troubleshooting

### Issue: BranchSelector shows "No branches available"
- **Cause:** No organization data in database
- **Solution:** Create organization hierarchy using API
- **Verify:** Check MongoDB `organizations` collection

### Issue: selectedBranch not updating
- **Cause:** onBranchChange callback not properly bound
- **Solution:** Verify handleBranchChange function is defined
- **Check:** Console for callback invocation

### Issue: API returns 404
- **Cause:** Routes not registered in server.js
- **Solution:** Verify import and app.use() are added
- **Restart:** Server to load new routes

### Issue: Tree not rendering
- **Cause:** Nested structure issue in tree building
- **Solution:** Check data structure returned by getOrganizationTree
- **Debug:** Log tree in browser console

---

## Part 9: Next Steps & Enhancements

### Phase 2: Advanced Features
1. **Inventory Transfer UI**
   - Interface for transferring stock between branches
   - Transfer approval workflow
   - Audit trail for transfers

2. **Branch-Specific Reports**
   - Sales by branch
   - Inventory levels by branch
   - Regional rollup reports

3. **Multi-Branch Consolidation**
   - Consolidated reports across branches
   - Inter-branch transactions
   - Regional management dashboard

4. **User Association**
   - Link users to branches
   - Branch-based access control
   - Branch manager roles

---

## Integration Checklist

- [ ] Backend files created (5 files)
- [ ] Frontend files created (2 components)
- [ ] server.js updated with route registration
- [ ] BranchSelector imported in Product.jsx
- [ ] State management added (selectedBranch)
- [ ] Component added to form
- [ ] Payload updated with branchId
- [ ] Product model updated (optional)
- [ ] API calls working (tested with curl/Postman)
- [ ] BranchSelector renders without errors
- [ ] Branch selection updates component state
- [ ] Product saved with branchId
- [ ] HistoryTab shows audit trail

---

## Summary

The branch management system is now fully implemented with:
- ✅ Complete backend infrastructure (Model, Service, Controller, Routes)
- ✅ Interactive frontend component (BranchSelector with dual views)
- ✅ Server integration (routes registered and available)
- ✅ Clear integration path for Product module
- ✅ Comprehensive API reference and examples

**Next Action:** Integrate BranchSelector into Product.jsx following Part 3 steps.
