# Simple Import - Tax & Pricing Auto-Calculate Guide

## ✅ What's New

You can now import products with tax information and **automatic pricing calculations in one step**. No manual product edits needed!

---

## 📋 Simple Template Structure

### **11 Required Columns** (in this order)

| # | Column Name | Type | Example | Notes |
|---|---|---|---|---|
| 1 | Item Code | Text | PROD001 | Unique product identifier |
| 2 | Product Name | Text | White Rice 1KG | Full product name |
| 3 | Department | Text | Food Grains | Must exist in system |
| 4 | Vendor | Text | Rice Mills Inc | Must exist in system |
| 5 | Unit Name | Text | KG | Must exist in Unit Master |
| 6 | Cost | Number | 450.00 | Base cost price |
| 7 | Price | Number | 600.00 | Selling price |
| 8 | Tax Type | Text | GST, VAT, or blank | Optional - tax classification |
| 9 | Tax % | Number | 5, 18 | Optional - tax rate (0-100) |
| 10 | Tax In Price | Yes/No | No | Optional - is tax included in price? |
| 11 | Barcode | Text | BAR001 | Unique barcode (minimum 3 chars) |

---

## 🔢 Auto-Calculated Fields

When you import with the above data, these fields are **automatically calculated**:

### **Field 1: Cost Include VAT**
```
If Tax In Price = No:
  costIncludeVat = Cost value as-is

If Tax In Price = Yes:
  costIncludeVat = Cost / (1 + Tax% / 100)
  → Extracts base cost from tax-inclusive price
```

**Example:**
```
Cost: 450, Tax: 5%, Tax In Price: No
→ costIncludeVat = 450

Cost: 450, Tax: 5%, Tax In Price: Yes
→ costIncludeVat = 450 / 1.05 = 428.57
```

### **Field 2: Margin %**
```
Calculation: (Price - Cost) / Cost × 100

Example:
Cost: 450, Price: 600
→ marginPercent = (600 - 450) / 450 × 100 = 33.33%
```

### **Field 3: Margin Amount**
```
Calculation: Price - Cost

Example:
Cost: 450, Price: 600
→ marginAmount = 600 - 450 = 150
```

### **Field 4: Tax Amount**
```
If Tax In Price = No:
  taxAmount = Price × Tax% / 100

If Tax In Price = Yes:
  taxAmount = Price - (Price / (1 + Tax% / 100))

Example (No):
Price: 600, Tax: 5%, Tax In Price: No
→ taxAmount = 600 × 5 / 100 = 30

Example (Yes):
Price: 630, Tax: 5%, Tax In Price: Yes
→ basePrice = 630 / 1.05 = 600
→ taxAmount = 630 - 600 = 30
```

---

## 📊 Example Templates

### **Example 1: Independent Retailer (No Tax)**
```
Item Code | Product Name       | Department | Vendor      | Unit Name | Cost  | Price | Tax Type | Tax % | Tax In Price | Barcode
PROD001   | White Cotton Shirt | Apparel    | Fashion Co  | Piece     | 150   | 299   |          |       | No           | BAR001
PROD002   | Blue Jeans         | Apparel    | Fashion Co  | Piece     | 250   | 499   |          |       | No           | BAR002
```

**Result:**
```
PROD001: Margin 99.33% (₹149), No tax
PROD002: Margin 99.6% (₹249), No tax
```

### **Example 2: India (GST 18%)**
```
Item Code | Product Name     | Department  | Vendor      | Unit Name | Cost  | Price | Tax Type | Tax % | Tax In Price | Barcode
IND001    | Electronics      | Electronics | ElectroMart | Unit      | 1000  | 1425  | GST      | 18    | No           | BAR001
IND002    | Mobile Accessory | Electronics | ElectroMart | Piece     | 200   | 300   | GST      | 18    | No           | BAR002
```

**Result:**
```
IND001: 
  - Margin: 42.5%
  - Tax Amount: 1425 × 18% = 256.50 (CGST 128.25 + SGST 128.25)
  
IND002:
  - Margin: 50%
  - Tax Amount: 300 × 18% = 54 (CGST 27 + SGST 27)
```

### **Example 3: UAE (VAT 5% Inclusive)**
```
Item Code | Product Name  | Department | Vendor    | Unit Name | Cost | Price | Tax Type | Tax % | Tax In Price | Barcode
UAE001    | Coffee Beans  | Foods      | CoffeeExp | KG        | 300  | 420   | VAT      | 5     | Yes          | BAR001
UAE002    | Tea Powder    | Foods      | CoffeeExp | KG        | 200  | 280   | VAT      | 5     | Yes          | BAR002
```

**Result (Tax In Price = Yes means price includes VAT):**
```
UAE001:
  - Base Price: 420 / 1.05 = 400
  - Cost Include VAT: 300 / 1.05 = 285.71
  - Margin: (400-300)/300 × 100 = 33.33%
  - Tax Amount: 420 - 400 = 20

UAE002:
  - Base Price: 280 / 1.05 = 266.67
  - Cost Include VAT: 200 / 1.05 = 190.48
  - Margin: (266.67-200)/200 × 100 = 33.33%
  - Tax Amount: 280 - 266.67 = 13.33
```

### **Example 4: Mixed Countries (Multi-Region)**
```
Item Code | Product Name    | Department | Vendor     | Unit Name | Cost  | Price | Tax Type | Tax % | Tax In Price | Barcode
IN001     | Basmati Rice    | Grains     | RiceMills  | KG        | 450   | 600   | GST      | 5     | No           | BAR001
AE001     | Dates Pack      | Foods      | DatesExp   | Box       | 100   | 157.5 | VAT      | 5     | Yes          | BAR002
PROD003   | Notebook        | Stationary | PaperCorp  | Piece     | 25    | 50    |          |       | No           | BAR003
```

**Result:**
```
IN001 (GST): Tax Amount = 600 × 5% = 30
AE001 (VAT inclusive): Tax = 157.5 - 150 = 7.5
PROD003 (No tax): Tax Amount = 0
```

---

## 📥 Step-by-Step Import Process

### **Step 1: Download Template**
```
1. Open Bulk Product Upload
2. Click "Download Template (Simple Mode)"
3. File saved: product_simple_template_YYYY-MM-DD.xlsx
```

### **Step 2: Fill Template with Your Data**
```
Fill all 11 columns:
✓ Item Code (unique)
✓ Product Name
✓ Department (exact match with system)
✓ Vendor (exact match with system)
✓ Unit Name (exact match with system)
✓ Cost (positive number)
✓ Price (positive number, > Cost)
✓ Tax Type (optional: GST, VAT, or blank)
✓ Tax % (optional: 0-100)
✓ Tax In Price (optional: Yes or No)
✓ Barcode (minimum 3 characters)
```

### **Step 3: Select File**
```
1. Click "Choose File"
2. Select your filled Excel file
3. System loads data and shows preview
```

### **Step 4: Review Preview**
```
1. Check first 5 products look correct
2. See info box showing what will be auto-calculated:
   - Cost Include VAT
   - Margin %
   - Margin Amount
   - Tax Amount
   - Tax Type & Rate
```

### **Step 5: Click Import**
```
1. Click "Import Products" button
2. Progress shows % complete
3. System auto-calculates all fields
4. Results show:
   ✓ Number of successful imports
   ✓ Any failed/skipped
   ✓ Confirmation that pricing calculated
```

### **Step 6: Done!**
```
All products imported with:
✓ Basic info (name, code, barcode)
✓ Pricing (cost, price)
✓ Tax configuration (type, rate, inclusive?)
✓ Margin calculations (%, amount)
✓ Tax amount pre-calculated

Ready to use in invoicing!
```

---

## ⚠️ Validation Rules

### **Required Fields (Must Have)**
- ✅ Item Code - Unique, no duplicates
- ✅ Product Name - Not empty
- ✅ Department - Must exist in system
- ✅ Vendor - Must exist in system
- ✅ Unit Name - Must exist in Unit Master
- ✅ Cost - Positive number > 0
- ✅ Price - Positive number > 0 and ≥ Cost
- ✅ Barcode - Minimum 3 characters

### **Optional Fields (Can Be Blank)**
- ⚪ Tax Type - String (GST, VAT, etc.) or blank
- ⚪ Tax % - Number 0-100 or blank
- ⚪ Tax In Price - Yes/No or blank (defaults to No)

### **Validation Errors**
```
❌ Missing required field → Row fails
❌ Cost or Price not numeric → Row fails
❌ Cost or Price ≤ 0 → Row fails
❌ Price < Cost → Warning (continues)
❌ Tax % < 0 or > 100 → Row fails
❌ Barcode < 3 characters → Row fails
❌ Department not found → Auto-creates (or fails if strict)
❌ Unit not found → Row fails
❌ Vendor not found → Row fails
```

---

## 🎯 Quick Checklist

Before importing:

```
□ Downloaded Simple Template
□ Filled Item Code (all unique)
□ Filled Product Name (all products)
□ Filled Department (exists in system)
□ Filled Vendor (exists in system)
□ Filled Unit Name (exists in Unit Master)
□ Filled Cost (all positive numbers)
□ Filled Price (all positive, ≥ Cost)
□ Filled Tax Type (optional: GST/VAT/blank)
□ Filled Tax % (optional: 0-100 or blank)
□ Filled Tax In Price (optional: Yes/No or blank)
□ Filled Barcode (all 3+ characters)
□ Verified no duplicates in Item Code or Barcode
□ File saved as .xlsx or .xls
□ Ready to import!
```

---

## 💡 Pro Tips

### **Tip 1: Tax In Price Decision**
```
Choose "No" (default) if:
  - Your cost is base cost
  - You want tax shown separately on invoice
  - Example: Mark price as ₹600 + 18% tax = ₹708

Choose "Yes" if:
  - Your price already includes tax
  - You want final amount shown
  - Example: MRP ₹708 (includes 18% tax)
```

### **Tip 2: Zero Tax Products**
```
Leave Tax Type and Tax % blank (or use 0%)
These products will import with no tax calculation
Good for: Non-taxable items, services in some regions
```

### **Tip 3: Bulk Create Missing Items**
```
If Department/Vendor/Unit not found:
  - Department: System auto-creates as Level 1
  - Vendor: Must exist (add in Vendor page first)
  - Unit: Must exist (add in Unit Master first)
```

### **Tip 4: Verify After Import**
```
After successful import:
1. Go to Products list
2. Search for newly imported item
3. Click Edit
4. Check "Basic Info" tab
5. Verify:
   ✓ Tax Type is set
   ✓ Tax % is set
   ✓ Margin % calculated
   ✓ Cost Include VAT populated
```

---

## 🔗 Related Documentation

- [TAX_MANAGEMENT_PRODUCT_IMPORT.md](TAX_MANAGEMENT_PRODUCT_IMPORT.md) - Detailed tax configuration guide
- [BULK_PRODUCT_UPLOAD_GUIDE.md](BULK_PRODUCT_UPLOAD_GUIDE.md) - Full upload feature documentation
- [HSN_MANAGEMENT_GUIDE.md](HSN_MANAGEMENT_GUIDE.md) - HSN code setup (India)

---

## 📞 Support

**Common Issues:**

| Issue | Solution |
|-------|----------|
| "Department not found" | Department auto-created or verify spelling |
| "Vendor not found" | Create vendor in Vendor Master first |
| "Unit Name not found" | Create unit in Unit Master first |
| "Tax % invalid" | Use number 0-100, not "5%" |
| "Barcode too short" | Use minimum 3 characters |
| Price less than Cost | Warning - import continues, review margin |

**All fields auto-calculated correctly?**
✓ Yes → Products ready for use
✓ Check margins in Product Edit if needed
✓ All tax info pre-populated for invoicing
