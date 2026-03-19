# HSN (Harmonized System of Nomenclature) Management Guide

## Overview

HSN is a standardized system for classifying products used primarily in **India for GST compliance**. This guide explains how to manage HSN codes in NEXIS-ERP.

---

## 📋 What is HSN?

**HSN Code** = Harmonized System of Nomenclature
- **Length:** 6 digits (e.g., 260590, 380894)
- **Purpose:** Product classification for tax purposes
- **Requirement:** Mandatory in India for GST if turnover > ₹5 lakhs or goods > ₹5 lakhs
- **Used in:** Invoices, Tax returns, Compliance reports

### HSN Code Structure
```
Example: 260590
└── 2 Digits: Chapter (Product Category)
└── 2 Digits: Heading (Sub-category)
└── 2 Digits: Sub-heading (Specific classification)
```

---

## ✅ Current HSN Implementation in NEXIS-ERP

### 1. Database Level
- **Model:** [server/Models/AddProduct.js](../server/Models/AddProduct.js)
- **Field:** `hsn` (String, uppercase, trimmed)
- **Storage:** Optional but recommended for India

### 2. Country Configuration
- **File:** [server/Models/CountryConfig.js](../server/Models/CountryConfig.js)
- **Field:** `hsnRequired` (Boolean)
- **Current Settings:**
  - **UAE:** `hsnRequired: false` - Not required
  - **Oman:** `hsnRequired: false` - Not required
  - **India:** `hsnRequired: true` - Required for GST compliance

### 3. Product Form
- **Location:** [client/src/components/product/Product.jsx](../client/src/components/product/Product.jsx)
- **Field:** HSN Code input (lines 1361-1375)
- **Features:**
  - Auto-converts to UPPERCASE
  - Optional for non-India companies
  - Displayed in product table
  - Exported in CSV

### 4. API Integration
- **Controller:** [server/controllers/productController.js](../server/controllers/productController.js)
- **Create:** `POST /api/products` - includes hsn
- **Update:** `PUT /api/products/:id` - can update hsn
- **Export:** Included in CSV export

---

## 🎯 How to Manage HSN Codes

### Step 1: Access Product Management
1. Login to NEXIS-ERP
2. Go to **Inventory → Products**
3. Click **Add Product** (+ button)

### Step 2: Fill HSN Code (Basic Info Tab)
```
┌─────────────────────────────────────────┐
│ Item Code *    │ 1001                  │
│ HSN Code       │ 260590     (Optional) │
│ Product Name * │ Coffee Beans          │
│ Short Name     │ Coffee                │
│ Local Name     │ قهوة (Arabic)        │
└─────────────────────────────────────────┘
```

**HSN Input Rules:**
- ✅ Accepts 6-digit codes: `260590`
- ✅ Auto-converts to UPPERCASE: `abc123` → `ABC123`
- ✅ Can be left empty if not required
- ✅ Stored trimmed (no spaces)

### Step 3: Validate Before Saving
For India companies, ensure:
- [ ] HSN code is 6 digits
- [ ] Code matches product category
- [ ] Code is correct per GST schedule

### Step 4: Save & Verify
1. Fill required fields (Item Code, Name, etc.)
2. Enter HSN code (if applicable)
3. Click **Save**
4. HSN appears in product table

---

## 📊 HSN Code Examples

### Common Indian HSN Codes

| Product Category | HSN Code | Description |
|-----------------|----------|-------------|
| **Coffee & Tea** | 090111, 090121 | Coffee extracts, Tea |
| **Spices** | 090411-090950 | Various spices |
| **Flour/Grains** | 110100-110810 | Wheat flour, rice flour |
| **Sugar** | 170131-170199 | Refined sugar, confectionery |
| **Oils** | 150711-151590 | Vegetable oils, ghee |
| **Dairy** | 040110-040690 | Milk, cheese, ghee |
| **Meat** | 020110-020999 | Meat products |
| **Beverages** | 220410-220860 | Coffee drinks, juices |
| **Electronics** | 850720-854390 | Electronic parts |
| **Textiles** | 610110-629090 | Clothing, fabrics |

**Find exact code:** Visit [GST HSN Lookup](https://www.cbic.gov.in/) or [ITC HS Code Finder](https://itc.indiastack.org/)

---

## 🔍 HSN Code Validation Rules

### For Indian Products (hsnRequired: true)

```javascript
function validateHSNCode(hsn, productType) {
  // Rule 1: Must be 6 digits
  if (!/^\d{6}$/.test(hsn)) {
    return { valid: false, error: "HSN must be exactly 6 digits" };
  }
  
  // Rule 2: Must match product category
  const validCodes = getValidHSNForCategory(productType);
  if (!validCodes.includes(hsn)) {
    return { 
      valid: false, 
      error: `Invalid HSN for ${productType}. Valid codes: ${validCodes.join(', ')}`
    };
  }
  
  // Rule 3: Check if HSN is active (not repealed)
  if (isHSNRepealed(hsn)) {
    return { valid: false, error: `HSN ${hsn} has been superseded` };
  }
  
  return { valid: true };
}
```

### Database Validation
```javascript
// In server/Models/AddProduct.js
hsn: {
  type: String,
  trim: true,
  uppercase: true,
  validate: {
    validator: function(v) {
      // Allow empty or 6-digit code
      return !v || /^\d{6}$/.test(v);
    },
    message: 'HSN must be 6 digits'
  }
}
```

---

## 💾 HSN Operations

### Add Product with HSN
```jsx
// In Product.jsx - Create
const handleCreate = async () => {
  const productData = {
    itemcode: "1001",
    hsn: "260590",           // Coffee HSN
    name: "Premium Coffee Beans",
    categoryId: "category_id",
    price: 500,
    cost: 300,
    vendor: "ABC Supplier",
    stock: 100
  };
  
  const response = await axios.post(`${API_URL}/products`, productData);
  // HSN auto-converts to uppercase and is stored
};
```

### Edit Existing Product HSN
```jsx
// In Product.jsx - Update
const handleUpdate = async (productId) => {
  const updatedData = {
    ...newProduct,
    hsn: newProduct.hsn.toUpperCase() // Ensures uppercase
  };
  
  const response = await axios.put(
    `${API_URL}/products/${productId}`, 
    updatedData
  );
};
```

### View HSN in Product Table
```jsx
// HSN appears in product listing
<table>
  <thead>
    <tr>
      <th>Item Code</th>
      <th>HSN Code</th>        {/* Column 2 */}
      <th>Name</th>
      <th>Category</th>
      ...
    </tr>
  </thead>
</table>
```

---

## 📤 HSN in Exports & Reports

### CSV Export includes HSN
```javascript
// In Product.jsx - exportToCSV()
const headers = [
  "Item Code",
  "HSN Code",    // ← Always included
  "Barcode",
  "Name",
  "Category",
  ...
];

const rows = products.map(prod => [
  prod.itemcode,
  prod.hsn || "-",   // Shows "-" if no HSN
  prod.barcode,
  ...
]);
```

**Export Path:**
1. Products → More Options
2. Click "Export to CSV"
3. File includes HSN column

### Invoice Display (For India)
```jsx
// On Invoice/Bill
if (company.countryCode === 'IN') {
  // Show HSN for each line item
  <tr>
    <td>{item.hsn}</td>        {/* HSN Code */}
    <td>{item.name}</td>
    <td>{item.qty}</td>
    <td>{item.rate}</td>
    <td>{item.amount}</td>
  </tr>
}
```

---

## ✨ Best Practices for HSN Management

### ✅ DO:

1. **Use Correct HSN Codes**
   ```javascript
   // ✓ RIGHT
   const hsn = "260590";  // Valid 6-digit code
   ```

2. **Update HSN When Product Changes**
   ```javascript
   // Product changes from "Coffee" to "Tea"
   // Update HSN from 260590 → 090121
   ```

3. **Validate Against Official GST Schedule**
   - Refer to [GST HSN Database](https://www.cbic.gov.in/)
   - Check latest amendments

4. **Keep HSN Consistent**
   - Same product = same HSN across system
   - Use centralized master for HSN codes

### ❌ DON'T:

1. **Use Incorrect HSN Codes**
   ```javascript
   // ✗ WRONG
   const hsn = "999999";  // Invalid
   const hsn = "26059";   // Only 5 digits
   const hsn = "ABC123";  // Non-numeric
   ```

2. **Leave HSN Empty (For India)**
   ```javascript
   // ✗ WRONG (For India companies)
   const hsn = "";        // Violates compliance
   ```

3. **Use Different HSN for Same Product**
   ```javascript
   // ✗ WRONG
   Same product, different HSN in different locations
   ```

---

## 🛠️ HSN Master Setup

### Create HSN Master List (Recommended)
Create a reusable HSN reference list:

```javascript
// server/Models/HSNMaster.js (OPTIONAL but recommended)
const hsnMasterSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{6}$/
  },
  description: String,
  category: String,
  sac: String,              // Service Accounting Code (if applicable)
  taxRate: Number,          // GST rate for this HSN
  applicableFrom: Date,
  repealed: { type: Boolean, default: false },
  remarks: String
});

// Example: 260590 = Coffee
const hsnRecord = {
  code: "260590",
  description: "Coffee, not roasted; husks and skins offcuts of coffee",
  category: "Coffee",
  taxRate: 5,               // 5% GST
  applicableFrom: new Date('2017-07-01'),
  repealed: false
};
```

**Benefits:**
- Centralized HSN database
- Easy lookup
- Validation against master
- Historical tracking

### Link Product to HSN Master
```javascript
// In Product model (Optional enhancement)
const productSchema = new Schema({
  itemcode: String,
  name: String,
  hsnCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HSNMaster',    // Link to HSN master
    required: function() { 
      return this.company.country === 'IN';  // Required for India
    }
  }
});
```

---

## 📋 Compliance Checklist for India

If your company operates in **India**, ensure:

- [ ] **All products have valid HSN codes** (6 digits)
- [ ] **HSN matches GST schedule** (official classification)
- [ ] **Invoices include HSN** for each line item
- [ ] **GST rate matches HSN** (correct tax percentage)
- [ ] **GSTR-1 report includes HSN**
- [ ] **HSN updated when products change**
- [ ] **Audit trail maintained** (who changed HSN, when)

### GSTR-1 Report Structure (India)
```
Item Details:
├── Item Code
├── HSN Code           ← From Product.hsn
├── Description
├── Quantity
├── Rate
├── GST Rate
├── CGST (Central GST)
├── SGST (State GST)
└── Amount
```

---

## 🔧 Integration with Tax System

### HSN → Tax Determination

```javascript
// In TaxService or similar
function getTaxDetailsForProduct(product, country) {
  if (country === 'IN') {
    // Step 1: Get HSN code
    const hsn = product.hsn;
    
    // Step 2: Look up in HSN master
    const hsnRecord = getHSNRecord(hsn);
    
    // Step 3: Get tax rate
    const taxRate = hsnRecord.taxRate;
    
    // Step 4: Determine GST components
    return {
      hsn: hsn,
      taxRate: taxRate,
      cgst: taxRate / 2,  // Central GST
      sgst: taxRate / 2,  // State GST
      igst: taxRate        // Integrated GST (for interstate)
    };
  }
}
```

---

## 📊 Sample HSN Data Load Script

For bulk HSN import from official GST database:

```javascript
// server/seeds/hsnMasterSeeder.js (OPTIONAL)
import HSNMaster from '../Models/HSNMaster.js';

const hsnData = [
  {
    code: "260590",
    description: "Coffee, not roasted; husks and skins",
    category: "Coffee",
    taxRate: 5
  },
  {
    code: "090121",
    description: "Tea, in immediate packings of a content not exceeding 3kg",
    category: "Tea",
    taxRate: 5
  },
  {
    code: "090199",
    description: "Other tea",
    category: "Tea",
    taxRate: 5
  },
  // ... more HSN codes
];

async function seedHSN() {
  try {
    await HSNMaster.insertMany(hsnData);
    console.log('HSN Master seeded successfully');
  } catch (error) {
    console.error('Error seeding HSN:', error);
  }
}
```

---

## 🚀 Quick Reference

### HSN Code Lookup
| Need | Action |
|------|--------|
| **Find HSN** | Visit [GST Council](https://www.gst.gov.in/) or [ITC](https://tcpat.pib.gov.in/) |
| **Validate HSN** | Check format: 6 digits, matches category |
| **Update HSN** | Edit product → Change HSN field → Save |
| **Export HSN** | Products → Export CSV (includes HSN column) |
| **View in Invoice** | Appears in invoice if country = India |

### API Endpoints for HSN

| Operation | Endpoint | Method | Payload |
|-----------|----------|--------|---------|
| Create with HSN | `/api/products` | POST | `{ itemcode, hsn, name, ... }` |
| Update HSN | `/api/products/:id` | PUT | `{ hsn: "260590" }` |
| Get Product with HSN | `/api/products/:id` | GET | - |
| Export with HSN | `/api/products/export` | GET | - |

---

## 📞 Troubleshooting

### Issue: HSN field not showing in form
**Solution:** Check browser console for errors. HSN field is on "Basic Info" tab.

### Issue: HSN not saving
**Solution:** 
- Verify it's 6 digits
- Check no spaces
- Ensure product name is filled
- Check server logs

### Issue: HSN validation error
**Solution:**
```javascript
// Validation only applies to India companies
// For UAE/Oman: HSN is optional and never required
if (countryCode === 'IN' && !hsn) {
  showError("HSN is required for India");
}
```

### Issue: HSN changes not reflected in invoice
**Solution:** 
- Product must be saved first
- Invoice must be regenerated/recreated
- Check product is linked correctly

---

## 📈 Future Enhancements

### Planned Features:
1. **HSN Master Database** - Centralized reference list
2. **HSN Validation API** - Real-time validation against official DB
3. **HSN History Tracking** - Audit trail of HSN changes
4. **Bulk HSN Import** - CSV upload for multiple products
5. **HSN Reports** - Generate GSTR reports by HSN
6. **GST Rate Mapping** - Auto-assign tax based on HSN

---

## ✅ Summary

**HSN Management in NEXIS-ERP:**

✅ **Field Present** - In Product model and form  
✅ **Country-Aware** - Required only for India  
✅ **Validation** - Auto-uppercase, trimmed  
✅ **Exported** - Included in CSV exports  
✅ **Ready for Invoices** - Set up for invoice display  

**Your Next Steps:**
1. Add HSN codes to your India products
2. Validate against GST schedule
3. Use in invoices and GSTR reports
4. Maintain HSN master list

---

**Need Help?** Check the Product component in [client/src/components/product/Product.jsx](../client/src/components/product/Product.jsx) or reach out with specific questions!
