# Branch & Head Office Management Guide
## NEXIS ERP - Multi-Location Setup

---

## 1. Current System Architecture

The system currently supports:
- **Single Company Master** → One company per installation
- **Multiple Stores** → Via `StoreSettings` model
- **Multiple Terminals** → Via POS terminals per store
- **Country Isolation** → UAEOman, India with different tax systems

---

## 2. Implementation Strategy: Head Office + Branches

### Option A: **Store-Based Approach** (Simplest - Current Infrastructure)
Each branch is a **Store**, Head Office is also a **Store**

**Pros:**
- Uses existing `StoreSettings` model
- No database schema changes
- Easy inventory allocation per branch
- Minimal code changes

**Cons:**
- Single company (no multi-tenant)
- All branches under one company
- Limited parent-child relationship tracking

### Option B: **Organization Hierarchy Approach** (Recommended - Scalable)
Create formal **Organization Structure** with levels:
- Head Office (Level 0)
- Regional Office (Level 1)
- Branch Office (Level 2)
- Store/Terminal (Level 3)

---

## 3. Recommended Implementation: Organization Model

### A. Database Models

**Organization Model** (New)
```javascript
// server/Models/Organization.js
{
  _id: ObjectId (PK),
  name: String,                    // "Head Office" / "Dubai Branch"
  code: String (unique),           // "HQ", "BR-DXB", "BR-ABU"
  type: String enum,               // "HEAD_OFFICE", "REGIONAL", "BRANCH", "STORE"
  parentId: ObjectId (FK),         // Points to parent organization
  level: Number,                   // 0=HQ, 1=Region, 2=Branch, 3=Store
  companyId: ObjectId (FK),        // Same company
  
  // Location
  address: String,
  city: String,
  country: String,                 // "UAE", "Oman", "India"
  postalCode: String,
  
  // Contact
  phone: String,
  email: String,
  manager: ObjectId (FK → User),
  
  // Settings
  currency: String (enum: AED, USD, INR), // Can differ per location
  timezone: String,                // "Asia/Dubai", "Asia/Muscat", "Asia/Kolkata"
  taxNumber: String,               // VAT/GST number for this location
  
  // Inventory
  warehouseId: ObjectId (FK),      // Default warehouse for this branch
  allowInventoryTransfer: Boolean, // Can transfer stock from HQ
  
  // Status
  isActive: Boolean,
  createdBy: String (username),
  updatedBy: String (username),
  createdAt: Date,
  updatedAt: Date
}
```

**Update StoreSettings Model**
```javascript
// Add reference to Organization
{
  // Existing fields...
  organizationId: ObjectId (FK → Organization),  // NEW: Link to branch
  
  // Keep existing store functionality
  storeName: String,
  storeCode: String,
  address: String,
  // ... rest of fields
}
```

### B. Hierarchy Visualization

```
Company "Al Arab Computers LLC"
│
├── Head Office (HQ) [Level 0]
│   ├── Dubai Regional Office [Level 1]
│   │   ├── Dubai Downtown Branch [Level 2]
│   │   ├── Dubai Marina Branch [Level 2]
│   │   └── Abu Dhabi Branch [Level 2]
│   │       ├── Store 1 (Terminal) [Level 3]
│   │       └── Store 2 (Terminal) [Level 3]
│   │
│   └── Northern Region Office [Level 1]
│       ├── Sharjah Branch [Level 2]
│       └── Ajman Branch [Level 2]
│
└── Oman Operations [Level 1]
    ├── Muscat Branch [Level 2]
    └── Salalah Branch [Level 2]
```

---

## 4. Implementation Steps

### Step 1: Create Organization Model

```javascript
// server/Models/Organization.js
import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['HEAD_OFFICE', 'REGIONAL', 'BRANCH', 'STORE'],
    default: 'BRANCH'
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null
  },
  level: {
    type: Number,
    default: 0
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // Location
  address: String,
  city: String,
  country: {
    type: String,
    enum: ['UAE', 'Oman', 'India'],
    required: true
  },
  postalCode: String,
  
  // Contact
  phone: String,
  email: String,
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Settings
  currency: {
    type: String,
    enum: ['AED', 'USD', 'INR', 'OMR'],
    default: 'AED'
  },
  timezone: String,
  taxNumber: String,
  
  // Inventory
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  allowInventoryTransfer: {
    type: Boolean,
    default: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: String,
  updatedBy: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
organizationSchema.index({ companyId: 1, code: 1 });
organizationSchema.index({ parentId: 1 });
organizationSchema.index({ type: 1 });

export default mongoose.model('Organization', organizationSchema);
```

### Step 2: Create Organization Service

```javascript
// server/modules/organization/services/OrganizationService.js
import Organization from '../../../Models/Organization.js';
import logger from '../../../config/logger.js';

class OrganizationService {
  // Get full organization hierarchy
  async getOrganizationTree(companyId) {
    try {
      const headOffice = await Organization.findOne({
        companyId,
        type: 'HEAD_OFFICE'
      }).populate(['parentId', 'managerId', 'warehouseId']);

      if (!headOffice) {
        throw new Error('Head Office not found');
      }

      return this.buildTree(headOffice);
    } catch (error) {
      logger.error('Error getting organization tree', { error });
      throw error;
    }
  }

  // Build nested tree structure
  async buildTree(node) {
    const children = await Organization.find({
      parentId: node._id
    }).populate(['parentId', 'managerId', 'warehouseId']);

    return {
      ...node.toObject(),
      children: await Promise.all(
        children.map(child => this.buildTree(child))
      )
    };
  }

  // Get all branches under a parent
  async getBranchesByParent(parentId) {
    try {
      return await Organization.find({
        parentId
      }).populate(['managerId', 'warehouseId']);
    } catch (error) {
      logger.error('Error getting branches', { error });
      throw error;
    }
  }

  // Create new organization
  async createOrganization(orgData) {
    try {
      // If parent exists, calculate level
      if (orgData.parentId) {
        const parent = await Organization.findById(orgData.parentId);
        if (!parent) throw new Error('Parent organization not found');
        orgData.level = parent.level + 1;
      }

      const org = new Organization(orgData);
      await org.save();

      logger.info('Organization created', { 
        orgId: org._id, 
        name: org.name 
      });

      return org.populate(['managerId', 'warehouseId']);
    } catch (error) {
      logger.error('Error creating organization', { error });
      throw error;
    }
  }

  // Transfer inventory between branches
  async transferInventory(fromBranchId, toBranchId, items) {
    try {
      const fromBranch = await Organization.findById(fromBranchId);
      const toBranch = await Organization.findById(toBranchId);

      if (!fromBranch || !toBranch) {
        throw new Error('Invalid branch');
      }

      // Validate inventory transfer eligibility
      if (!fromBranch.allowInventoryTransfer || !toBranch.allowInventoryTransfer) {
        throw new Error('Inventory transfer not allowed');
      }

      // Create transfer record (integrate with inventory system)
      logger.info('Inventory transfer planned', {
        from: fromBranch.code,
        to: toBranch.code,
        itemCount: items.length
      });

      // TODO: Implement actual transfer logic
      return { success: true, message: 'Transfer initiated' };
    } catch (error) {
      logger.error('Error transferring inventory', { error });
      throw error;
    }
  }

  // Get branch-specific configuration
  async getBranchConfig(branchId) {
    try {
      const branch = await Organization.findById(branchId)
        .populate('warehouseId')
        .populate('managerId');

      if (!branch) {
        throw new Error('Branch not found');
      }

      return {
        branchId: branch._id,
        name: branch.name,
        code: branch.code,
        type: branch.type,
        country: branch.country,
        currency: branch.currency,
        timezone: branch.timezone,
        taxNumber: branch.taxNumber,
        manager: branch.managerId,
        warehouse: branch.warehouseId,
        allowTransfers: branch.allowInventoryTransfer
      };
    } catch (error) {
      logger.error('Error getting branch config', { error });
      throw error;
    }
  }
}

export default new OrganizationService();
```

### Step 3: Create API Routes

```javascript
// server/modules/organization/routes/organizationRoutes.js
import express from 'express';
import {
  getOrganizationTree,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchConfig,
  transferInventory
} from '../controllers/organizationController.js';

const router = express.Router();

// Organization Tree
router.get('/tree', getOrganizationTree);
router.get('/:parentId/branches', getBranches);
router.get('/:branchId/config', getBranchConfig);

// CRUD
router.post('/', createBranch);
router.put('/:branchId', updateBranch);
router.delete('/:branchId', deleteBranch);

// Inventory
router.post('/:fromBranchId/transfer/:toBranchId', transferInventory);

export default router;
```

---

## 5. Frontend Implementation

### Setup Branch Selection Dropdown

**Component: BranchSelector**
```jsx
// client/src/components/common/BranchSelector.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BranchSelector = ({ onBranchChange }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/organizations/tree');
      setBranches(flattenTree(response.data));
    } catch (err) {
      console.error('Error fetching branches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Flatten tree to dropdown options
  const flattenTree = (node, prefix = '') => {
    const options = [{
      id: node._id,
      label: prefix + node.name,
      code: node.code,
      type: node.type,
      country: node.country
    }];

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        options.push(...flattenTree(child, prefix + '  '));
      });
    }

    return options;
  };

  const handleChange = (e) => {
    const branch = branches.find(b => b.id === e.target.value);
    setSelectedBranch(branch);
    onBranchChange(branch);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Branch/Location
      </label>
      <select
        onChange={handleChange}
        value={selectedBranch?._id || ''}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        disabled={loading}
      >
        <option value="">-- Choose Branch --</option>
        {branches.map(branch => (
          <option key={branch.id} value={branch.id}>
            {branch.label} ({branch.code})
          </option>
        ))}
      </select>
      {selectedBranch && (
        <p className="mt-2 text-xs text-gray-600">
          Location: {selectedBranch.country} | Type: {selectedBranch.type}
        </p>
      )}
    </div>
  );
};

export default BranchSelector;
```

### Add to Product Form

```jsx
// In Product.jsx, add:
import BranchSelector from '../common/BranchSelector';

// In component:
const [selectedBranch, setSelectedBranch] = useState(null);

const handleBranchChange = (branch) => {
  setSelectedBranch(branch);
  // Update product with branch-specific pricing if needed
  setNewProduct({
    ...newProduct,
    branchId: branch.id,
    branchCode: branch.code,
    branchCountry: branch.country
  });
};

// In JSX:
<BranchSelector onBranchChange={handleBranchChange} />
```

---

## 6. Feature Matrix: Branch Operations

| Feature | Head Office | Regional | Branch | Store |
|---------|------------|----------|--------|-------|
| **Inventory Management** | ✅ Master inventory | ✅ Regional stock | ✅ Local stock | ✅ Sell |
| **Transfer Stock** | ✅ To any | ✅ To child branches | ✅ To parent/sibling | ❌ No |
| **Create Invoices** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Tax Calculation** | ✅ Corporate | ✅ Regional | ✅ Local | ✅ Local |
| **Reports** | ✅ Consolidated | ✅ Regional | ✅ Branch only | ✅ Daily |
| **User Management** | ✅ All branches | ✅ Regional only | ✅ Branch only | ✅ Store only |
| **Pricing Control** | ✅ Master pricing | ✅ Regional override | ✅ Branch override | ✅ Display only |

---

## 7. Data Isolation Strategy

**Filter data by branch at query level:**

```javascript
// In Product service
async getProducts(branchId) {
  return await Product.find({
    $or: [
      { branchId: branchId },        // Specific to branch
      { branchId: { $exists: false } } // Head office products (global)
    ]
  });
}

// In Invoice service
async getInvoices(branchId) {
  return await Invoice.find({
    branchId: branchId
  });
}
```

---

## 8. Reporting by Branch

**Report Structure:**
```javascript
{
  consolidatedReport: {
    allBranches: {...},    // Sum of all branches
  },
  branchReports: {
    HQ: {...},
    DUBAI: {...},
    MUSCAT: {...},
    SALALAH: {...}
  }
}
```

---

## 9. Initial Setup Checklist

When setting up branches:

- [ ] Create **Organization** records for HQ and each branch
- [ ] Set unique `code` for each (HQ, BR-DXB, BR-ABU, etc.)
- [ ] Assign `managers` to each branch
- [ ] Link to **Warehouses** if using warehouse module
- [ ] Configure `currency` & `timezone` per location
- [ ] Set local `taxNumber` for compliance
- [ ] Enable/disable `allowInventoryTransfer` as needed
- [ ] Assign **Users** to specific branches (in user role)
- [ ] Update **Products** with `branchId` if location-specific
- [ ] Configure **POS Terminals** per branch

---

## 10. Next Steps

1. **Create Organization Model** in database
2. **Implement OrganizationService** with CRUD
3. **Create API endpoints** for branch operations
4. **Build BranchSelector component**
5. **Update Product/Invoice** to support `branchId`
6. **Implement Data Isolation** at query level
7. **Create Branch Reports** in reporting module
8. **Setup User Access Control** per branch
9. **Document Branch Workflows** for users

---

**Status: Ready for Implementation** ✅
