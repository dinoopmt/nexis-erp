# HSN Frontend Management Guide

## Overview
A complete UI for managing HSN codes has been added to the Company Settings. Users can create, update, search, filter, and delete HSN codes directly from the frontend without any backend knowledge.

---

## Where to Find HSN Management

**Path:** Settings → HSN Management

1. Open the Settings page
2. Click on the **HSN Management** tab (with Barcode icon)
3. Use the interface to manage HSN codes

---

## Features

### 1. **Search HSN Codes**
- **Search by Code:** Enter 6-digit code (e.g., "090111")
- **Search by Description:** Enter keywords (e.g., "coffee", "textile")
- Real-time search updates the list

### 2. **Filter HSN Codes**
- **By Category:** Select from dropdown (Foodstuffs, Textiles, Machinery, etc.)
- **By GST Rate:** Filter by 0%, 5%, 12%, 18%, or 28%
- **Combine Filters:** Search + Category + GST Rate work together

### 3. **Create New HSN Code**
Click **Add HSN** button and fill the form:

| Field | Description | Example |
|-------|-------------|---------|
| **HSN Code** | 6 digits (required) | 090111 |
| **Description** | Product description (required) | Coffee, not roasted, not decaffeinated |
| **Category** | Select from dropdown (required) | Foodstuffs |
| **GST Rate** | Select valid rate (required) | 5% |

✅ **After creating:** Code appears in the list immediately

### 4. **Edit HSN Code**
1. Find the HSN code in the list
2. Click **Edit** button (pencil icon)
3. Update Description, Category, or GST Rate
4. Click **Update** to save

❌ **Cannot change:** The 6-digit code cannot be changed (to maintain referential integrity)

### 5. **Delete HSN Code**
1. Find the HSN code in the list
2. Click **Delete** button (trash icon)
3. Confirm the action
4. HSN is marked as "Repealed" (soft delete, not permanently removed)

✅ **After deletion:** Status changes to "Repealed"

---

## Table Columns

| Column | Information |
|--------|-------------|
| **Code** | 6-digit HSN code (blue, highlighted) |
| **Description** | Product description |
| **Category** | Product category |
| **GST Rate** | GST percentage (color-coded badge) |
| **Status** | Active (green) or Repealed (red) |
| **Actions** | Edit, Delete buttons |

---

## Pagination

- **Default:** 10 items per page
- **Navigation:** Previous/Next buttons
- **Info:** Shows "Showing X to Y of Z results"
- **Page indicator:** "Page X of Y"

---

## Validation Rules

### HSN Code Validation
✅ **Valid:** `090111` (exactly 6 digits)  
❌ **Invalid:** `90111` (5 digits)  
❌ **Invalid:** `0901111` (7 digits)  
❌ **Invalid:** `09011A` (contains letters)

### Required Fields
- HSN Code: ✅ Required (when creating)
- Description: ✅ Required
- Category: ✅ Required
- GST Rate: ✅ Required

### Duplicate Prevention
- Cannot create HSN code that already exists
- Error message: "HSN code XXXX already exists"

---

## Status Messages

### Success Messages ✅
- "HSN code created successfully" - New code created
- "HSN code updated successfully" - Code updated
- "HSN code repealed successfully" - Code deleted/repealed

### Error Messages ❌
- "Please fill all required fields" - Missing required field
- "HSN code must be exactly 6 digits" - Invalid format
- "HSN code XXXX already exists" - Duplicate code
- "Failed to create HSN code" - Backend error

---

## How to Use: Step-by-Step

### Creating a New HSN Code

**Example:** Add HSN for "Cinnamon"

1. Go to Settings → HSN Management
2. Click **Add HSN** button
3. Fill the form:
   - Code: `090410` (6 digits)
   - Description: `Cinnamon, ground`
   - Category: `Foodstuffs`
   - GST Rate: `5%`
4. Click **Create** button
5. ✅ New HSN code appears in the list

### Searching for HSN

**Example:** Find all coffee HSN codes

1. In the search box, type: `coffee`
2. Table updates to show only coffee-related HSN codes
3. Results filtered by description text

### Filtering by Category

**Example:** Show only Textile HSN codes with 5% GST

1. Select **Category:** `Textiles`
2. Select **GST Rate:** `5%`
3. Table shows only Textile codes with 5% GST
4. To clear: Select "All Categories" and "All GST Rates"

### Editing an HSN Code

**Example:** Update coffee GST rate from 5% to 12%

1. Find `090111` (Coffee) in the list
2. Click **Edit** button (pencil icon)
3. Change **GST Rate** from `5%` to `12%`
4. Click **Update** button
5. ✅ List updates with new GST rate

### Deleting an HSN Code

**Example:** Repeal outdated HSN code

1. Find the HSN code in the list
2. Click **Delete** button (trash icon)
3. Confirm: "Are you sure you want to repeal HSN code XXXXX?"
4. Click **OK** to confirm
5. ✅ Status changes to "Repealed"

---

## Tips & Tricks

### 💡 Tip 1: Search Before Creating
Always search for the HSN code before creating a new one to avoid duplicates.

### 💡 Tip 2: Use Filters Efficiently
Combine category and GST rate filters to quickly find groups of HSN codes.

### 💡 Tip 3: Pagination
If you have many HSN codes, use Next/Previous buttons to navigate pages.

### 💡 Tip 4: Can't Edit Code?
You cannot change the 6-digit code once created. If needed, delete and recreate.

### 💡 Tip 5: Repealed vs. Active
Repealed codes cannot be edited or deleted again (they're locked). This preserves historical data.

---

## Common Tasks

### Task 1: Add New Product Category to HSN
1. Someone needs to add new category to the system first
2. Then you can select it from the Category dropdown
3. Contact admin if category is not available

### Task 2: Bulk Import HSN Codes
Currently limited to one-by-one through the UI.
For bulk import:
- Contact backend admin to run the seeder script
- Or use API endpoint directly: `POST /api/hsn/create`

### Task 3: Find Products Using Specific HSN
1. Go to Products section
2. Create a filter by HSN code
3. All products with that HSN will appear

### Task 4: Check HSN Statistics
From the HSN Management page, the system tracks:
- Total HSN codes
- Active vs. Repealed
- Distribution by GST rate
- Distribution by category

---

## Troubleshooting

### Problem: "HSN Code not found" error
**Solution:** Check the 6-digit code format. Must be exactly 6 digits.

### Problem: Can't create duplicate code
**Cause:** HSN code already exists in the system.  
**Solution:** Select a different code or edit the existing one.

### Problem: Dropdown showing no categories
**Cause:** HSN Master seeder hasn't been run.  
**Solution:** Contact admin to run seeder: `node server/hsnMasterSeeder.js`

### Problem: Changes not visible after create/update
**Solution:** Page auto-refreshes. Wait a few seconds or refresh manually.

### Problem: Can't edit repealed codes
**Cause:** Repealed codes are locked.  
**Solution:** Delete status is final. You cannot edit repealed codes.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate between form fields |
| Enter | Submit form (in modal) |
| Escape | Close modal |
| Ctrl+F | Browser search (search in page) |

---

## Data Mapping to Products

When you create or update an HSN code:

✅ **Used by:** Product creation forms
✅ **Referenced:** In product HSN field
✅ **Calculated:** GST rate automatically populated in invoices
✅ **Tracked:** In activity logs
✅ **Reported:** In GSTR reports

---

## HSN Code Structure

Every HSN code has a meaning:

```
HSN Code: 090111

09 = Chapter (Coffee, Tea, Spices)
01 = Heading (Coffee)
11 = Sub-heading (Not roasted, not decaffeinated)

Result: Coffee, not roasted, not decaffeinated (5% GST)
```

---

## API Reference (For Developers)

If integrating with external systems:

### Endpoints Available
```
GET  /api/hsn/list           - Get paginated HSN list
GET  /api/hsn/code/:code     - Get single HSN
GET  /api/hsn/search         - Search HSN
GET  /api/hsn/categories     - Get all categories
GET  /api/hsn/dropdown       - Get for dropdown selects
POST /api/hsn/create         - Create new HSN
PUT  /api/hsn/update/:code   - Update HSN
POST /api/hsn/repeal/:code   - Delete HSN (soft delete)
```

### Example: Create via API
```javascript
fetch('/api/hsn/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: '090111',
    description: 'Coffee, not roasted',
    category: 'Foodstuffs',
    gstRate: 5
  })
})
```

---

## User Permissions

| Action | Permission Required |
|--------|-------------------|
| View HSN List | All users |
| Search/Filter | All users |
| Create HSN | Admin/Manager |
| Edit HSN | Admin/Manager |
| Delete HSN | Admin/Manager |

❌ **Future:** Permission system not yet implemented. All authenticated users can manage HSN.

---

## Support & Help

### For User Questions
- Ask your system administrator
- Refer to this guide
- Check error messages (they are descriptive)

### For System Issues
- Report to IT/Admin
- Provide screenshots of the error
- Note the exact steps taken

### For Feature Requests
- Submit through your IT department
- Request new categories or validations
- Suggest improvements

---

## Summary

| Feature | Status |
|---------|--------|
| Create HSN | ✅ Available |
| Read/Search | ✅ Available |
| Update HSN | ✅ Available |
| Delete HSN | ✅ Available (Soft Delete) |
| Category Filter | ✅ Available |
| GST Rate Filter | ✅ Available |
| Text Search | ✅ Available |
| Pagination | ✅ Available |
| Bulk Import | ❌ Not in UI (API available) |
| Export | ❌ Not yet available |
| Permission Control | ❌ Future enhancement |

---

**Last Updated:** March 2026  
**Component:** HSNManagement.jsx  
**Location:** Settings → HSN Management
