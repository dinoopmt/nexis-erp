# Organization Management UI - User Guide

## Overview

The **Branches & Locations** tab in Company Settings allows you to create and manage your organizational hierarchy including head offices, regional offices, branches, and stores. This is the central interface for setting up your multi-location structure.

---

## Location: Company Settings → Branches & Locations Tab

**Path:** Home → Settings → Company Settings → Branches & Locations

---

## Features

### 1. ✨ Create New Organization

#### Button Location
The **"New Organization"** button is at the top of the Branches & Locations tab.

#### What You Can Create
- **Head Office** - The top-level organization (no parent required)
- **Regional Office** - Sub-level under head office
- **Branch** - Sub-level under regional or head office
- **Store** - Retail location under any upper level

#### Form Sections

**A. Basic Information**
| Field | Required | Notes |
|-------|----------|-------|
| Organization Name | Yes | e.g., "Dubai Head Office", "Abu Dhabi Branch" |
| Organization Code | Yes | Unique identifier e.g., "HO-001", "BR-002" |
| Organization Type | Yes | HEAD_OFFICE, REGIONAL, BRANCH, STORE |
| Parent Organization | No | Leave empty for head offices |

**B. Location Information**
| Field | Required | Notes |
|-------|----------|-------|
| Country | Yes | UAE, Oman, or India |
| City | Yes | e.g., "Dubai", "Muscat" |
| Address | Optional | Street address |
| Postal Code | Optional | Postal/ZIP code |

**C. Contact Information**
| Field | Required | Notes |
|-------|----------|-------|
| Phone | Optional | e.g., "+971-4-1234567" |
| Email | Optional | Contact email |

**D. Settings**
| Field | Default | Notes |
|-------|---------|-------|
| Currency | Auto-set by country | Based on selected country |
| Timezone | Auto-set by country | Based on selected country |
| Tax Number | Optional | VAT/GST/Tax ID |
| Allow Inventory Transfer | Checked | Enable stock transfers between branches |

---

## How to Use

### Scenario 1: Create a Head Office

1. Click **"New Organization"** button
2. Fill in the form:
   - **Name:** "Main Head Office"
   - **Code:** "HO-001"
   - **Type:** "Head Office"
   - **Country:** "UAE" (this auto-fills currency and timezone)
   - **City:** "Dubai"
   - **Address:** "123 Business Park, Dubai"
   - **Currency:** AED (auto-filled)
   - **Timezone:** Asia/Dubai (auto-filled)
3. Click **"Create Organization"**

### Scenario 2: Create a Branch Under Head Office

1. Click **"New Organization"** button
2. Fill in the form:
   - **Name:** "Abu Dhabi Branch"
   - **Code:** "BR-001"
   - **Type:** "Branch"
   - **Parent Organization:** "Main Head Office (HO-001)" ← Select from dropdown
   - **Country:** "UAE"
   - **City:** "Abu Dhabi"
3. Click **"Create Organization"**

### Scenario 3: Create a Regional Office with Branches

1. Create Regional Office:
   - **Name:** "Northern Region"
   - **Code:** "RG-001"
   - **Type:** "Regional"
   - **Parent:** "Main Head Office"

2. Create Branches under it:
   - **Name:** "Ras Al Khaimah Store"
   - **Code:** "ST-001"
   - **Type:** "Store"
   - **Parent:** "Northern Region (RG-001)"

---

## 📊 Organization Hierarchy View

### What You'll See

The bottom section shows your complete organization structure as a **hierarchical tree**:

```
🏢 Main Head Office (HO-001) - UAE/Dubai
├─ ▶ 🏭 Northern Region (RG-001) - UAE/Ras Al Khaimah
└─ ▶ 🏪 Abu Dhabi Branch (BR-001) - UAE/Abu Dhabi
   └─ 🛒 Store Main (ST-001) - UAE/Abu Dhabi
```

### Tree Features

- **Expand/Collapse (▶/▼):** Click arrow to show/hide child locations
- **Type Icons:** Visual indicators for each level:
  - 🏢 Head Office
  - 🏭 Regional Office
  - 🏪 Branch
  - 🛒 Store
- **Location Display:** Shows city and country badges
- **Type Badge:** Color-coded type label
- **Quick Actions:** Edit and Delete buttons on each item

### Editing an Organization

1. Click the **Edit (✏️)** icon on any organization
2. The form will pre-fill with current data
3. Make your changes (⚠️ Cannot change: Code, Type, Parent)
4. Click **"Update Organization"**

### Deleting an Organization

1. Click the **Delete (🗑️)** icon on any organization
2. Confirm the action
3. ⚠️ Cannot delete if it has child organizations

---

## 🎯 Currency & Timezone Auto-Configuration

### How It Works

When you select a **Country**, the currency and timezone are **automatically set**:

| Country | Currency | Timezone |
|---------|----------|----------|
| UAE | AED | Asia/Dubai |
| Oman | OMR | Asia/Muscat |
| India | INR | Asia/Kolkata |

You can **override** these if needed for special cases.

---

## 🔄 Inventory Transfer

### Enable/Disable for Locations

The **"Allow Inventory Transfer"** checkbox (in Settings section) determines if this location can:
- Send inventory to another location
- Receive inventory from another location

✅ **Checked:** This location can participate in transfers  
❌ **Unchecked:** No transfers allowed for this location

---

## Fields You Cannot Edit

Once created, these fields **cannot be changed**:
- ❌ Organization Code
- ❌ Organization Type
- ❌ Parent Organization

**Why?** These define the organizational structure and changing them would break relationships.

---

## 📋 Managing Your Organization

### Common Tasks

#### Task 1: Change Location Address
1. Open organization (click Edit)
2. Update "Address" or "City" fields
3. Click "Update Organization"
✅ Done

#### Task 2: Update Contact Information
1. Open organization (click Edit)
2. Update "Phone" or "Email"
3. Click "Update Organization"
✅ Done

#### Task 3: Disable Transfers for a Location
1. Open organization (click Edit)
2. Uncheck "Allow Inventory Transfer"
3. Click "Update Organization"
✅ Stock transfers now blocked for this location

#### Task 4: Update Tax Number
1. Open organization (click Edit)
2. Update "Tax Number" field
3. Click "Update Organization"
✅ New tax number saved

#### Task 5: Look at Organization Path
1. Click anywhere in the tree
2. **Path shown at top:** Head Office → Region → Branch → Store
3. Helps verify hierarchy

---

## ⚠️ Important Rules

### Hierarchy Constraints

1. **Head Office can have:**
   - Regional Offices
   - Branches
   - Stores

2. **Regional Office can have:**
   - Branches
   - Stores

3. **Branch can have:**
   - Stores

4. **Store cannot have:**
   - Any children

### Deletion Rules

- ❌ **Cannot delete** if location has child organizations
- ✅ **Can delete** only leaf organizations (those with no children)
- 💡 **Workaround:** Delete all children first, then delete parent

---

## 💾 What Gets Saved

When you create an organization, the system stores:

✅ Organization name, code, type, and hierarchy position  
✅ Location information (address, city, country, postal code)  
✅ Contact details (phone, email)  
✅ Settings (currency, timezone, tax number)  
✅ Audit trail (who created, when created, who updated, when updated)  
✅ Inventory transfer settings

---

## 🔍 Viewing Your Hierarchy

### Expanded View
Click the **▼** arrow to expand and see:
- All child organizations nested below
- Full address and city information
- Edit/Delete options for each

### Collapsed View
Click the **▶** arrow to collapse and reduce screen clutter

### Flat List View
Not available in this UI, but accessible via API for reports

---

## 🆘 Troubleshooting

### "Cannot Delete - Child Organizations Exist"
**Problem:** Trying to delete a location that has branches/stores  
**Solution:** Delete all child organizations first, then delete parent

### "Code Already Exists"
**Problem:** Trying to create with duplicate code  
**Solution:** Use a unique code for each organization (e.g., HO-001, HO-002)

### "Parent Organization Not Showing in Dropdown"
**Problem:** Can't find expected parent in dropdown  
**Reasons:**
- Selected type doesn't allow that parent (e.g., Store can't have Store as parent)
- Parent not yet created
**Solution:** Create parent first, or select compatible type

### "Country Change Not Updating Currency"
**Problem:** Currency/timezone didn't auto-update  
**Solution:** Manually select country again, or manually update currency field

---

## 📱 Mobile & Responsive Design

The UI is **fully responsive** and works on:
- 📱 Mobile phones (stacked layout)
- 📋 Tablets (2-column layout)
- 💻 Desktop (full-featured layout)

---

## 🎨 Visual Elements

### Status Indicators

**Color-Coded Type Badges:**
- 🟣 **Purple:** Head Office
- 🔵 **Blue:** Regional Office
- 🟢 **Green:** Branch
- 🟠 **Orange:** Store

**Success/Error Messages:**
- ✅ **Green banner:** Operation succeeded
- ❌ **Red banner:** Error occurred
- ℹ️ **Blue banner:** Information or note

---

## 🔗 Integration Points

This UI connects to:
- **Product Creation:** Choose branch when creating products
- **Stock Management:** Track inventory by location
- **Invoicing:** Assign invoices to specific locations
- **Reports:** Generate location-specific reports

---

## 📞 Support & Next Steps

### After Creating Organizations

1. **Integrate with Products:** Products can now be assigned to branches
2. **Set Up Inventory:** Track stock by location
3. **Create Reports:** Generate branch-specific reports
4. **Enable Transfers:** Use inventory transfer feature to move stock

### API Access

If you need programmatic access:
- **API Endpoint:** `/api/v1/organizations`
- **Documentation:** See BRANCH_MANAGEMENT_API_QUICK_REFERENCE.md
- **Examples:** See BRANCH_MANAGEMENT_INTEGRATION_GUIDE.md

---

## 📊 Example Organization Structure

### Small Company (Single Location)
```
🏢 Al Arab Computers (HO-001) - Dubai
└─ No children
```

### Medium Company (Multiple Branches)
```
🏢 Al Arab Computers HQ (HO-001) - Dubai
├─ 🏪 Dubai Branch (BR-001) - Dubai
├─ 🏪 Abu Dhabi Branch (BR-002) - Abu Dhabi
└─ 🏪 Sharjah Branch (BR-003) - Sharjah
```

### Large Company (Regional Structure)
```
🏢 Al Arab Computers (HO-001) - Dubai
├─ 🏭 UAE Region (RG-001) - Dubai
│  ├─ 🏪 Dubai Branch (BR-001) - Dubai
│  ├─ 🛒 Dubai Store (ST-001) - Dubai
│  ├─ 🏪 Abu Dhabi Branch (BR-002) - Abu Dhabi
│  └─ 🛒 Abu Dhabi Store (ST-002) - Abu Dhabi
└─ 🏭 Oman Region (RG-002) - Muscat
   ├─ 🏪 Muscat Branch (BR-003) - Muscat
   └─ 🛒 Muscat Store (ST-003) - Muscat
```

---

## ✨ Tips & Tricks

### 💡 Best Practices

1. **Use Consistent Codes:** HO (Head Office), RG (Regional), BR (Branch), ST (Store)
   - Example: HO-001, RG-001, BR-001, ST-001

2. **Name Clearly:** Include location in name
   - ✅ Good: "Dubai Branch", "Abu Dhabi Store"
   - ❌ Bad: "Branch 1", "Store A"

3. **Set Up Regions First:** Create regional structure before individual branches
   - Easier to manage and report

4. **Enable Transfers Early:** Plan which locations can transfer stock to others
   - Important for supply chain efficiency

5. **Complete Address Info:** Always include city and full address
   - Required for accurate reporting and identification

---

## 🎯 Success Checklist

- [ ] Created at least one Head Office
- [ ] Verified organization appears in hierarchy tree
- [ ] Created branches/locations as needed
- [ ] Updated all contact information
- [ ] Set correct currency and timezone for each location
- [ ] Configured inventory transfer settings
- [ ] Tested organization can be edited
- [ ] Confirmed hierarchy is correct

---

## 📚 Related Documentation

- **BRANCH_MANAGEMENT_IMPLEMENTATION_COMPLETE.md** - System overview
- **BRANCH_MANAGEMENT_API_QUICK_REFERENCE.md** - API reference
- **BRANCH_MANAGEMENT_INTEGRATION_GUIDE.md** - Complete integration guide
- **START_HERE_BRANCH_MANAGEMENT.md** - Quick start guide

---

**Status:** ✅ Ready for Production  
**Version:** 1.0  
**Last Updated:** March 10, 2024
