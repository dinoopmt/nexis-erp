# Vendor Modal Redesign - Quick Reference

## Fields Added to Vendor Form

### Basic Info Tab
```
+ Country: Dropdown (UAE, Oman, India) - REQUIRED
  └─ Affects visibility of tax fields in Tax Info tab
```

### NEW Tax Info Tab (💰)
```
Operating Country: [Display Only]

TAX IDENTIFICATION:
├─ taxNumber / GSTIN / VAT Tax Number (Label changes by country)
├─ gstNumber: Alternate GSTIN (India only, optional)
└─ vatId: VAT Registration ID (UAE/Oman only, optional)

IF INDIA VENDOR:
├─ taxType: Select from (Registered, Unregistered, Non-resident, SEZ, Government Entity, Other)
├─ taxGroupId: Dropdown filtered to India tax groups
└─ Info: "Select tax type to configure GST rate and group"

IF UAE/OMAN VENDOR:
└─ Info: "VAT automatically applied at 5% for standard rate"
```

## State Fields

```javascript
// Before
newVendor.taxNumber

// After (expanded)
newVendor.country       // NEW: 'UAE' | 'Oman' | 'India'
newVendor.taxNumber     // Updated: label changes based on country
newVendor.gstNumber     // NEW: For India secondary GSTIN
newVendor.vatId         // NEW: For UAE/Oman VAT registration
newVendor.taxType       // NEW: 'Registered' | 'Unregistered' | 'SEZ' | etc (India only)
newVendor.taxGroupId    // NEW: Reference to TaxMaster (India only)
```

## Validation Logic

```javascript
// Required for all
country ✓

// Required if India vendor
taxType ✓

// Required if India vendor AND taxType selected
taxGroupId ✓
```

## Backend Schema Changes

```javascript
// Added to CreateVendor.js Model
{
  gstNumber: String,
  vatId: String,
  taxType: Enum['Registered', 'Unregistered', ...],
  taxGroupId: ObjectId (ref TaxMaster)
}

// Added Indexes
{ country: 1, isActive: 1 }
{ country: 1, taxType: 1 }
{ gstNumber: 1, sparse: true }
{ vatId: 1, sparse: true }
{ taxGroupId: 1 }
```

## Frontend Hooks Used

```javascript
import { useTaxMaster } from "../../hooks/useTaxMaster";

const { company, taxMaster } = useTaxMaster();
const isIndiaCompany = company?.country === 'India';

// taxMaster filtered for India:
taxMaster.filter(tg => tg.isActive && tg.countryCode === 'IN')
```

## Key Behaviors

| Action | Behavior |
|--------|----------|
| **Country Change** | Clear taxType & taxGroupId if switching away from India |
| **Tax Type Change** | Clear taxGroupId (must re-select after type changes) |
| **Form Submit (India)** | Require country, taxType, taxGroupId |
| **Form Submit (UAE/Oman)** | Require country only |
| **Table Display** | Show country column with flag emoji |

## API Payload

```json
{
  "name": "Vendor Name",
  "email": "vendor@email.com",
  "phone": "+91-1234567890",
  "country": "India",
  "taxNumber": "27AABCT1234H1Z1",
  "gstNumber": "",
  "vatId": "",
  "taxType": "Registered",
  "taxGroupId": "63f7a1b2c3d4e5f6g7h8i9j0",
  "paymentTerms": "NET 30",
  "status": "Active",
  "bankName": "HDFC Bank",
  "accountNumber": "5001254685741230",
  "accountHolder": "Vendor Name"
}
```

## Component Files Modified

✅ `client/src/components/inventory/Vendors.jsx`
  - Imports: useTaxMaster hook
  - State: Added country, gstNumber, vatId, taxType, taxGroupId
  - Validation: Added country, tax type/group requirements
  - UI: Added Tax Info tab, country column to table
  - Handlers: Updated handleEdit, resetForm with new fields

✅ `server/Models/CreateVendor.js`
  - Schema: Added 4 new fields with descriptions
  - Indexes: Added 5 performance indexes
  - References: taxGroupId references TaxMaster

## Testing Scenarios

**Scenario 1: Create India Vendor**
```
1. Select Country: India
2. Enter GSTIN: 27AABCT1234H1Z1
3. Select Tax Type: Registered
4. Select Tax Group: GST 18%
5. Save → ✅ Success
```

**Scenario 2: Create UAE Vendor**
```
1. Select Country: UAE
2. Enter VAT Tax Number: 123456789012
3. Enter VAT ID: VAT-2023-001
4. Save → ✅ Success (no tax type needed)
```

**Scenario 3: Edit Vendor (Country Change)**
```
1. Open India vendor editing
2. Change Country: UAE
3. Tax Type/Group auto-clear
4. Save → ✅ Success with new country
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Tax Type dropdown not showing | Company is not India | Tax type only for India vendors |
| Tax Group dropdown empty | India but no tax groups seeded | Check TaxMaster has India records |
| Can't save India vendor | Missing taxType or taxGroupId | Select both fields |
| Table shows old data | Browser cache | Clear cache or refresh |

## Backward Compatibility

✅ Existing vendors continue to work
✅ New fields are optional (except country)
✅ API accepts old payloads without new fields
✅ No breaking changes to existing endpoints

---

Last Updated: March 5, 2026
