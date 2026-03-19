# Vendor Create Modal - Country Tax Requirements Redesign

**Date:** March 5, 2026  
**Status:** ✅ COMPLETE - Implementation Ready

---

## Overview

The vendor create/edit modal has been redesigned to support country-specific tax requirements. Vendors can now be configured with proper tax identification and classification based on their operating country.

---

## New Features

### 1. **Country Selection (Required)**
- **Location:** Basic Info Tab
- **Options:** UAE 🇦🇪, Oman 🇴🇲, India 🇮🇳
- **Behavior:** 
  - Defaults to company's operating country
  - Changes dynamically update tax fields
  - Clears dependent fields (taxType, taxGroupId) when changed

### 2. **Country-Specific Tax Fields**

#### **All Countries:**
| Field | Label | Purpose |
|-------|-------|---------|
| `taxNumber` | GSTIN (India) / VAT/Tax Number (Others) | Primary tax identification number |

#### **India Vendors Only:**
| Field | Label | Required | Purpose |
|-------|-------|----------|---------|
| `gstNumber` | Alternate GSTIN | Optional | Secondary GST identification |
| `taxType` | Tax Type (GST Act 2017) | ✅ Yes | Business classification |
| `taxGroupId` | Tax Group | ✅ Yes (if taxType selected) | Determines GST rate |

**Tax Type Options for India:**
- Registered - GST registered business
- Unregistered - Unregistered/small business
- Non-resident - Foreign vendor
- SEZ - Special Economic Zone
- Government Entity - Government organization
- Other - Other classification

#### **UAE/Oman Vendors Only:**
| Field | Label | Purpose |
|-------|-------|---------|
| `vatId` | VAT Registration ID | VAT identification (optional) |

**Tax Rate:** VAT automatically applied at 5% (standard rate)

---

## UI/UX Changes

### Modal Tabs

**Previously:**
- 📋 Basic Info
- 🏦 Banking Details

**Now:**
- 📋 Basic Info (country selection)
- 💰 Tax Info (country-specific tax fields)
- 🏦 Banking Details

### Basic Info Tab Changes
```
┌─────────────────────────────────────┐
│ Name *                  │ Email *   │
├─────────────────────────────────────┤
│ Phone *                 │ Address   │
├─────────────────────────────────────┤
│ City                    │ Country * │ ← NEW
└─────────────────────────────────────┘
│ Payment Terms *         │ Status    │
└─────────────────────────────────────┘
```

### New Tax Info Tab
```
Operating Country: 🇮🇦 India

TAX NUMBER (DYNAMIC LABEL):
- For India: Shows as "GSTIN" placeholder
- For UAE/Oman: Shows as "VAT/Tax Number"

IF INDIA VENDOR:
├─ Alternate GSTIN (optional)
├─ Tax Type (GST Act 2017) * 
│  └─ Options: Registered, Unregistered, Non-resident, SEZ, Government Entity, Other
├─ Tax Group * (appears after tax type selected)
│  └─ Auto-populated from TaxMaster filtered by India
└─ Info Message: "Select tax type to configure GST rate and group"

IF UAE/OMAN VENDOR:
├─ VAT Registration ID (optional)
└─ Info Message: "VAT automatically applied at 5% for standard rate"
```

### Table Display Enhancement
**New Column:** Country (with flag emoji)

```
Code │ Name │ Email │ Phone │ 🇦🇪 Country │ City │ Status │ Actions
     │      │       │       │ India       │      │        │
```

---

## Frontend Implementation

### File: `client/src/components/inventory/Vendors.jsx`

#### **Imports**
```javascript
import { useTaxMaster } from "../../hooks/useTaxMaster";
```

#### **New State Fields**
```javascript
const { company, taxMaster } = useTaxMaster();
const isIndiaCompany = company?.country === 'India';

const [newVendor, setNewVendor] = useState({
  // ... existing fields
  country: company?.country || 'UAE',      // NEW
  gstNumber: "",                            // NEW
  vatId: "",                                // NEW
  taxType: isIndiaCompany ? "" : null,     // NEW
  taxGroupId: isIndiaCompany ? "" : null,  // NEW
});
```

#### **Enhanced Validation**
```javascript
const validateForm = () => {
  const newErrors = {};
  // ... existing validation
  if (!newVendor.country) newErrors.country = "Country is required";
  
  // For India vendors
  if (isIndiaCompany && !newVendor.taxType) 
    newErrors.taxType = "Tax Type is required for India";
  
  if (isIndiaCompany && newVendor.taxType && !newVendor.taxGroupId) 
    newErrors.taxGroupId = "Tax Group is required";
  
  return Object.keys(newErrors).length === 0;
};
```

#### **Form Event Handlers**
```javascript
// When country changes
onChange={(e) => {
  setNewVendor({
    ...newVendor,
    country: e.target.value,
    taxType: e.target.value === 'India' ? "" : null,      // Reset if not India
    taxGroupId: e.target.value === 'India' ? "" : null,
  });
}}

// When tax type changes
onChange={(e) => {
  setNewVendor({
    ...newVendor,
    taxType: e.target.value,
    taxGroupId: "",  // Reset tax group on type change
  });
}}
```

---

## Backend Implementation

### File: `server/Models/CreateVendor.js`

#### **New Schema Fields**
```javascript
// GST Number - India vendors (secondary GSTIN)
gstNumber: {
  type: String,
  uppercase: true,
  trim: true,
  description: "Secondary GSTIN for India vendors"
},

// VAT ID - UAE and Oman vendors
vatId: {
  type: String,
  uppercase: true,
  trim: true,
  description: "VAT Registration ID for UAE/Oman vendors"
},

// Tax Type - India only (GST Act 2017 classification)
taxType: {
  type: String,
  enum: ['Registered', 'Unregistered', 'Non-resident', 'SEZ', 'Government Entity', 'Other', null],
  default: null,
  description: "GST classification for India vendors only"
},

// Tax Group - Reference to TaxMaster for India vendors
taxGroupId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'TaxMaster',
  description: "Reference to tax group for India vendors"
}
```

#### **New Indexes (for Performance)**
```javascript
vendorSchema.index({ country: 1, isActive: 1 });        // Filter by country
vendorSchema.index({ country: 1, taxType: 1 });         // Filter India vendors by tax type
vendorSchema.index({ gstNumber: 1, sparse: true });     // Lookup by GSTIN
vendorSchema.index({ vatId: 1, sparse: true });         // Lookup by VAT ID
vendorSchema.index({ taxGroupId: 1 });                  // Lookup by tax group
```

---

## Data Flow Examples

### Example 1: Adding India Vendor (Registered)

**User Input:**
```
Name: Tech Solutions Pvt Ltd
Email: vendor@techsolutions.co.in
Phone: +91-9876543210
Country: India
GSTIN: 27AABCT1234H1Z1
Tax Type: Registered
Tax Group: GST 18% - CGST 9% + SGST 9%
```

**Payload Sent to Backend:**
```javascript
{
  name: "Tech Solutions Pvt Ltd",
  email: "vendor@techsolutions.co.in",
  phone: "+91-9876543210",
  country: "India",
  taxNumber: "27AABCT1234H1Z1",
  gstNumber: "",
  vatId: "",
  taxType: "Registered",
  taxGroupId: "63f7a1b2c3d4e5f6g7h8i9j0",
  paymentTerms: "NET 30",
  status: "Active",
  // ... banking details
}
```

### Example 2: Adding UAE Vendor

**User Input:**
```
Name: Dubai Trading LLC
Email: trade@dubai.ae
Phone: +971-4-1234567
Country: UAE
VAT/Tax Number: 123456789012
VAT Registration ID: VAT-2023-001
```

**Payload Sent to Backend:**
```javascript
{
  name: "Dubai Trading LLC",
  email: "trade@dubai.ae",
  phone: "+971-4-1234567",
  country: "UAE",
  taxNumber: "123456789012",
  gstNumber: "",
  vatId: "VAT-2023-001",
  taxType: null,              // Not required for UAE
  taxGroupId: null,
  paymentTerms: "NET 30",
  status: "Active",
  // ... banking details
}
```

---

## Validation Rules

### Country Field
| Condition | Error | Action |
|-----------|-------|--------|
| Empty | "Country is required" | Show error badge |
| Changed | Auto-reset taxType & taxGroupId | Clears India-specific fields |

### Tax Type Field (India Only)
| Condition | Error | Action |
|-----------|-------|--------|
| India vendor, empty | "Tax Type is required for India" | Show error badge |
| Changed | Clear taxGroupId | Reset dependent field |

### Tax Group Field (India Only)
| Condition | Error | Action |
|-----------|-------|--------|
| India vendor, taxType selected but group empty | "Tax Group is required" | Show error badge |
| Only shows if | N/A | Conditional rendering |

### TAX ID Fields
All tax ID fields are optional for vendor creation:
- `taxNumber` - Main identification
- `gstNumber` - Optional secondary (India)
- `vatId` - Optional (UAE/Oman)

---

## API Endpoints

### Create Vendor
```
POST /api/v1/vendors/addvendor
Body: { country, taxType, taxGroupId, gstNumber, vatId, ... }
```

### Update Vendor
```
PUT /api/v1/vendors/updatevendor/:id
Body: { country, taxType, taxGroupId, gstNumber, vatId, ... }
```

### Get Vendors
```
GET /api/v1/vendors/getvendors?country=${country}
Response includes: country, taxType, taxGroupId, gstNumber, vatId
```

---

## Integration with Existing Systems

### CompanyContext Integration
```javascript
// UseTaxMaster hook provides:
const { company, taxMaster } = useTaxMaster();

// company.country determines:
// - Default country selection
// - Whether to show India-specific tax fields
// - Tax type validation requirements

// taxMaster provides:
// - List of active tax groups
// - Filtered by countryCode = 'IN' for India vendors
```

### TaxMaster Integration
```javascript
// When India vendor is created with taxType "Registered"
// The selected taxGroupId links to TaxMaster record
// Example: GST 18% group containing CGST 9% + SGST 9%

// During purchase/invoice creation:
// - Vendor's taxGroupId is referenced
// - Tax rate automatically applied from TaxMaster
```

---

## Migration Notes

### For Existing Vendors
1. **Backward Compatibility:** All new fields optional
2. **Country Assignment:** Existing vendors default to company's country
3. **Tax Fields:** Empty until vendor is edited and updated
4. **Data Seeding:** Can bulk update vendors with country based on company location

### Database Migration Example
```javascript
// MongoDB migration script (optional)
db.vendors.updateMany(
  { country: { $exists: false } },
  { $set: { country: "UAE", taxType: null, taxGroupId: null } }
);
```

---

## Testing Checklist

### Frontend UI Tests
- [ ] Country dropdown shows all 3 options (UAE, Oman, India)
- [ ] Tax Info tab only visible when modal open
- [ ] GSTIN label shows for India, VAT/Tax Number for others
- [ ] Tax Type dropdown only shows for India vendors
- [ ] Tax Group dropdown appears only after taxType selected
- [ ] Tax Group filtered to show only India groups (countryCode = 'IN')
- [ ] Changing country clears taxType and taxGroupId
- [ ] Validation errors display for required fields
- [ ] Table shows country column with flag emoji

### Frontend Logic Tests
- [ ] Create India vendor with all required tax fields ✓ Saves
- [ ] Create UAE vendor without tax type/group ✓ Saves
- [ ] Edit vendor, change country ✓ Tax fields reset
- [ ] Submit form without selecting country ✓ Shows error
- [ ] Submit India vendor without tax type ✓ Shows error
- [ ] Submit India vendor with tax type but no tax group ✓ Shows error

### Backend Tests
- [ ] Vendor created with country field ✓ Stored in DB
- [ ] Vendor created with taxGroupId ✓ Valid ObjectId reference
- [ ] Vendor retrieved includes all tax fields
- [ ] Validation ensures enum values accepted
- [ ] Country filtering works (query by country)
- [ ] Tax group lookups work with populated data

### Integration Tests
- [ ] Create vendor → Tax group populated → Used in invoices
- [ ] Purchase invoice uses vendor's tax rate automatically
- [ ] Vendor list shows country accurately
- [ ] Edit vendor, change country → Form updates properly

---

## Future Enhancements

1. **Tax Rate Caching:** Cache TaxMaster data in vendor form for performance
2. **Vendor Bulk Operations:** Bulk import vendors with tax classifications
3. **Tax Compliance Reports:** Generate GST/VAT reports by vendor country
4. **Multi-Country Groups:** Allow vendors to operate in multiple countries
5. **Tax Filing Integration:** Auto-populate tax filing forms from vendor tax data
6. **Pan India GST:** Support for Pan India registrations (optional)

---

## File Changes Summary

| File | Change | Impact |
|------|--------|--------|
| `client/src/components/inventory/Vendors.jsx` | Added country selection & tax fields | Form redesign ✅ |
| `server/Models/CreateVendor.js` | Added 4 new fields + 5 indexes | Schema update ✅ |
| **No API changes required** | Existing endpoints handle new fields | Backward compatible ✅ |

---

## Support & Documentation

- **User Guide:** See Vendors tab → New Vendor → Tax Info tab
- **API Docs:** POST/PUT endpoints include new fields
- **Sample Data:** See example vendor payloads above
- **Related Documentation:** `COUNTRY_TAX_IMPLEMENTATION_VERIFICATION.md`

