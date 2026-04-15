# Data Duplication Analysis: Company Address in 3 Places

## Problem Statement

**Company address is being created 3 times**, violating the "Single Source of Truth" principle:

```
Company Master          Organization             StoreSettings
├── address            ├── address              ├── address
├── city               ├── city                 ├── phone
├── state              ├── country              ├── email
├── postalCode         ├── postalCode           └── taxNumber
├── country            ├── phone
├── email              ├── email
├── phone              └── taxNumber
└── taxId
    └── taxRate
```

---

## Current Data Flow (WRONG ❌)

```
User enters address in Company Master
    ↓
User enters SAME address in Organization
    ↓
User enters SAME address in Store Settings
    ↓
Result: 3 disconnected copies
    ↓
If address changes in Company, Organization & Store don't update
    ↓
Data inconsistency 🔴
```

---

## Proposed Solution: Single Source of Truth ✅

### Correct Hierarchy

```
Company (Headquarters/Legal Entity)
├── companyName
├── address (PRIMARY)
├── city
├── postalCode
├── country
├── email
├── phone
├── taxId / taxRate
└── currency

     ↓ References

Organization (Branches/Regions)
├── name
├── code
├── type (HEAD_OFFICE, BRANCH, STORE)
├── parentId → Company
├── address (OPTIONAL - can override if different)
├── city (OPTIONAL - can override)
├── country (can override or inherit)
├── manager
└── warehouse

     ↓ References

StoreSettings (Terminal/Sales Configuration)
├── storeName
├── storeCode
├── organizationId → Organization (inherit address from here)
├── terminalSettings
├── printerConfig
├── salesControls
└── weightScaleSettings
    (NO duplicated address fields)
```

---

## Migration Path

### Phase 1: Add Required References

**Step 1a: Update Organization Schema**
```javascript
// Add companyId reference
companyId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company',
  required: true
}

// Add address override flag
addressOverride: {
  type: Boolean,
  default: false  // If true, use organization.address; if false, inherit from company
}
```

**Step 1b: Update StoreSettings Schema**
```javascript
// Add organizationId reference
organizationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization',
  required: true
}

// Remove these fields (now inherited):
// - address
// - city
// - postalCode
// - country
// - taxNumber (will come from Organization → Company)
```

### Phase 2: Implement Inheritance Logic

**API Endpoint to get Full Store Address**
```javascript
GET /api/v1/store-settings/:storeId/address

Response:
{
  "storeId": "...",
  "storeName": "...",
  "address": {
    "line1": "...",
    "city": "...",
    "postalCode": "...",
    "country": "...",
    "phone": "...",
    "email": "...",
    "taxNumber": "...",
    "source": "organization"  // Shows where address came from
  }
}
```

**Data Resolution Logic**
```javascript
// When fetching store details:
1. Get StoreSettings (has organizationId)
2. Get Organization (has companyId & optional address override)
3. Get Company (has base address)
4. Resolve: If Organization.addressOverride=true, use Organization address
5. Otherwise: Use Company address
```

### Phase 3: Remove Duplicate Fields

**After migration:**
```javascript
// Company.js - KEEP (Headquarters)
address
city
state
postalCode
country
email
phone
taxId
taxRate

// Organization.js - KEEP (Branch-specific or override)
address (OPTIONAL - only if different from parent)
city (OPTIONAL - only if different from parent)
country (OPTIONAL)
phone (OPTIONAL)
email (OPTIONAL)
taxNumber (optional override)
companyId (NEW reference)

// StoreSettings.js - REMOVE
address ❌ (inherit from Organization)
phone ❌ (inherit from Organization)
email ❌ (inherit from Organization)
taxNumber ❌ (inherit from Organization)
organizationId (NEW reference)
```

---

## Implementation Steps

### Step 1: Create Migration Script
```javascript
// migrate-address-duplication.js

// 1. Add companyId to all Organizations
await Organization.updateMany({}, { companyId: mainCompanyId });

// 2. Add organizationId to all StoreSettings
const stores = await StoreSettings.find();
for (let store of stores) {
  const org = await Organization.findOne({ code: store.storeCode });
  if (org) {
    store.organizationId = org._id;
    await store.save();
  }
}

// 3. Flag which Organizations have custom addresses
await Organization.updateMany({}, { addressOverride: false });
```

### Step 2: Update Models
- [ ] Add `companyId` to Organization
- [ ] Add `addressOverride` to Organization
- [ ] Add `organizationId` to StoreSettings
- [ ] Remove address fields from StoreSettings

### Step 3: Update Controllers
- [ ] Create `getFullAddress()` helper function
- [ ] Update StoreSettings API to resolve inherited address
- [ ] Update Organization API to show address resolution

### Step 4: Update Frontend
- [ ] Get address from resolved API (not from StoreSettings.address)
- [ ] Show "Inherited from Organization" indicator
- [ ] Allow override at Organization level if needed

---

## Benefits

✅ **Single Source of Truth**
- One place to update company address
- Automatic propagation to all stores

✅ **Consistency**
- No conflicting address data
- Real-time updates across system

✅ **Maintainability**
- Easier schema management
- Clear data hierarchy
- Less database bloat

✅ **Flexibility**
- Organizations can override address if branch is in different location
- Stores inherit without duplication

✅ **Integrity**
- Can enforce referential constraints
- Prevent orphaned stores without organization

---

## Example After Migration

```
User changes Company address
    ↓
Only Company collection updates
    ↓
All Organizations inherits automatically
    ↓
All StoreSettings get address via API call (no duplication)
    ↓
Data is ALWAYS consistent ✅
```

---

## Queries After Implementation

**Get store with full address:**
```javascript
const store = await StoreSettings.findById(storeId).populate('organizationId');
const org = store.organizationId;
const company = await Company.findById(org.companyId);

const address = org.addressOverride ? 
  { address: org.address, city: org.city, country: org.country } :
  { address: company.address, city: company.city, country: company.country };
```

**Or simpler with aggregation pipeline:**
```javascript
const storeDetails = await StoreSettings.aggregate([
  { $match: { _id: storeId } },
  {
    $lookup: {
      from: 'organizations',
      localField: 'organizationId',
      foreignField: '_id',
      as: 'organization'
    }
  },
  {
    $lookup: {
      from: 'companies',
      localField: 'organization.companyId',
      foreignField: '_id',
      as: 'company'
    }
  },
  {
    $project: {
      storeName: 1,
      address: {
        $cond: [
          '$organization.addressOverride',
          '$organization.address',
          '$company.address'
        ]
      }
    }
  }
]);
```

---

## Summary

| Field | Current State | After Migration |
|-------|---------------|-----------------|
| **Company.address** | Definitive | ✅ Definitive (Headquarters) |
| **Organization.address** | Duplicate | 🔄 Optional override |
| **StoreSettings.address** | Duplicate | ❌ REMOVED (inherited) |
| **Data Consistency** | ❌ Can diverge | ✅ Always aligned |
| **Updates** | 3x effort | ✅ 1x effort |

**Ready to implement?**
