# HSN Management - Quick Start Guide

> **For India Companies:** HSN (6-digit code) is required for GST compliance
> **For UAE/Oman:** HSN is optional but supported

---

## 🚀 In 5 Minutes: Add HSN to Your Products

### Step 1: Open Products Module
```
NEXIS-ERP Dashboard
  ↓
Inventory
  ↓
Products
  ↓
Click [+ Add Product] button
```

### Step 2: Fill Basic Information
The form appears with tabs at top: **Basic Info | More Info | Image | Stock Batch | History**

**On "Basic Info" tab, you'll see:**
```
┌──────────────────────────────┬──────────────────────────────┐
│ Item Code *                  │ HSN Code                     │
├──────────────────────────────┼──────────────────────────────┤
│ 1001                         │ 260590                       │
│ (Generated or manual)        │ (6 digits, e.g., 260590)     │
└──────────────────────────────┴──────────────────────────────┘
```

### Step 3: Enter HSN Code
```
Example Products with HSN:

Coffee Beans        →  260590  (Coffee extracts)
Tea Leaves          →  090121  (Tea, packaged)
Wheat Flour         →  110100  (Cereal flour)
Vegetable Oil       →  151590  (Vegetable oils)
Fabric              →  610110  (Cotton clothing)
Electronics        →  854390  (Electrical apparatus)
```

### Step 4: Save Product
- Fill other required fields (Name, Category, Price, etc.)
- HSN automatically converts to UPPERCASE
- Click [Save] button
- ✅ Done! HSN is now stored with product

---

## 📋 Finding Correct HSN Code

### Quick 3-Step HSN Lookup

**Step 1: Identify Product Category**
```
Coffee          → Chapter 09 (Coffee, Tea, Spices)
Clothing        → Chapter 61 (Articles of apparel)
Electronics     → Chapter 85 (Electrical machinery)
Food            → Chapters 04-21 (Food & beverages)
```

**Step 2: Visit Official Database**
- **India:** [GST Council HSN Database](https://www.gst.gov.in/)
- **Alternate:** [ITC HS Code Finder](https://tcpat.pib.gov.in/)

**Step 3: Find 6-Digit Code**
```
Search: "Coffee"
↓
Results:
  - 090111: Coffee, not roasted, not decaffeinated
  - 090112: Coffee, not roasted, decaffeinated
  - 090121: Coffee, roasted, not decaffeinated
  - 090122: Coffee, roasted, decaffeinated
  
Choose the one matching your product → 090121 ✓
```

---

## 🎯 Common HSN Codes (Quick Reference)

Copy and paste these HSN codes for common products:

```
BEVERAGES & FOOD
════════════════════════════════════
Coffee              260590    (Coffee extracts/husks)
Tea                 090121    (Tea in packings)
Sugar              170131    (Refined sugar)
Spices             090411    (Black pepper)
Rice               100610    (Rice, semi-milled)
Wheat Flour        110100    (Cereal flour)
Cooking Oil        151590    (Vegetable oils)
Milk               040110    (Milk, fresh)
Cheese             040610    (Fresh cheese)

APPAREL & TEXTILES
════════════════════════════════════
Cotton Shirts      610510    (Cotton shirts)
Cotton Trousers    620462    (Cotton trousers)
Woolen Sweater     610530    (Cardigans/sweaters)
Leather Jacket     640399    (Leather clothing)
Fabric             600622    (Woven cotton fabric)

HOUSEHOLD & ELECTRONICS
════════════════════════════════════
Light Bulbs        853921    (Filament bulbs)
Mobile Phone       851712    (Mobile phones)
Laptop             847130    (Microprocessor/machines)
Refrigerator       841551    (Refrigerating machines)
AC Unit            841821    (Air conditioning units)
```

---

## 📝 Batch Add HSN to Existing Products

### Method 1: Edit One by One (Simple)
```
1. Go to Products list
2. Click [Edit] next to product
3. Enter HSN code on Basic Info tab
4. Click [Save]
5. Repeat for all products
```

### Method 2: Bulk Upload (Advanced - using CSV)
```
Expected workflow:
1. Export current products (CSV)
2. Add HSN column with values
3. Import back

Currently NEXIS doesn't support bulk import,
but you can use API or SQL if needed.
```

---

## 🔍 View & Verify HSN

### In Product Table (List View)
```
The product table shows:
┌─────────────┬──────────┬──────────┬──────────┬───────────┐
│ Item Code   │ HSN Code │ Name     │ Category │ Price     │
├─────────────┼──────────┼──────────┼──────────┼───────────┤
│ 1001        │ 260590   │ Coffee   │ Beverage │ ₹500.00   │
│ 1002        │ 090121   │ Tea      │ Beverage │ ₹300.00   │
│ 1003        │ 151590   │ Oil      │ Grocery  │ ₹800.00   │
│ 1004        │ -        │ Product4 │ Electronics │ ₹5000   │  ← No HSN
└─────────────┴──────────┴──────────┴──────────┴───────────┘
```

### Export with HSN (CSV)
```
1. Click [Export to CSV]  (if available)
2. CSV includes HSN column:
   Item Code, HSN Code, Name, Category, Price...
3. Open in Excel and verify all HSN codes
```

---

## ✅ Checklist: HSN Setup for India

If your company is in **India**, complete this:

- [ ] **Identify products requiring HSN** (all products with turnover)
- [ ] **Look up correct 6-digit HSN codes** for each
- [ ] **Add HSN to all products** through Product form
- [ ] **Verify HSN matches official GST schedule**
- [ ] **Export CSV to verify all HSN codes present**
- [ ] **Test invoice generation** (should include HSN)
- [ ] **Maintain HSN master list** for reference
- [ ] **Train team on HSN assignment**
- [ ] **Audit HSN codes** quarterly for accuracy
- [ ] **Update HSN when products change** category

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Wrong Format
```
WRONG                  RIGHT
═════════════════════════════════
260.590         ↔     260590      (Remove dots)
26059           ↔     260590      (Must be 6 digits)
COFFEE          ↔     260590      (Must be numeric)
260590-ABC      ↔     260590      (Only numbers)
```

### ❌ Mistake 2: Wrong HSN for Product
```
Product: Cotton Shirt
WRONG               RIGHT
═════════════════════════════════════
151590 (Oil)    ↔   610510 (Clothing)
090121 (Tea)    ↔   610510 (Clothing)

Always match HSN to actual product category!
```

### ❌ Mistake 3: Missing HSN (For India)
```
Company Location: INDIA
WRONG: hsn = ""        (Missing - GST violation)
RIGHT: hsn = "260590"  (Present - GST compliant)
```

### ❌ Mistake 4: Using Old/Repealed HSN
```
Check: Is HSN still valid?
- Visit GST Council website
- Check amendment date
- Use current, valid HSN only
```

---

## 📊 HSN in Invoices

### Invoice Display (India Only)
When you create an invoice in India:
```
┌─────────────────────────────────────────────┐
│ INVOICE                                     │
├─────────────────────────────────────────────┤
│ Item  │ HSN   │ Qty │ Rate  │ Amount │      │
├───────┼───────┼─────┼───────┼────────┤      │
│ Coffee│ 260590│ 10  │ 500   │ 5000.00│      │
│ Tea   │ 090121│ 5   │ 300   │ 1500.00│      │
│ Oil   │ 151590│ 1   │ 800   │ 800.00 │      │
│       │       │     │       │ ──────  │      │
│       │       │     │ TOTAL │ 7300.00│      │
└─────────────────────────────────────────────┘
```

**Important:** HSN appears automatically if product has HSN code stored.

---

## 🔗 API Usage (For Developers)

### Add Product with HSN
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "itemcode": "1001",
    "hsn": "260590",
    "name": "Coffee Beans",
    "categoryId": "category_id",
    "price": 500,
    "cost": 300,
    "vendor": "Supplier ABC",
    "stock": 100
  }'
```

### Update HSN for Existing Product
```bash
curl -X PUT http://localhost:5000/api/products/product_id \
  -H "Content-Type: application/json" \
  -d '{
    "hsn": "090121"
  }'
```

### Get Product with HSN
```bash
curl http://localhost:5000/api/products/product_id
# Response includes "hsn": "260590"
```

---

## 📚 HSN Category Breakdown

```
00-05: Animal, Vegetable Products
  ├─ 0901: Coffee, Tea, Spices
  └─ 0910-0921: Various spices

06-15: Food & Beverages
  ├─ 0702-0709: Vegetables
  ├─ 0801-0813: Fruits & Nuts
  ├─ 0901-0910: Coffee, Tea
  ├─ 1001-1008: Cereals
  └─ 1501-1515: Oils & Fats

16-22: Prepared Foods
  ├─ 1601-1605: Meat preparations
  ├─ 1701-1704: Sugar & sugar preps
  └─ 1901-1905: Cereals & flour

50-63: Textiles
  ├─ 5001-5011: Silk
  ├─ 5101-5113: Wool
  └─ 6001-6310: Knitted & apparel

84-85: Machinery & Electrical
  ├─ 8401-8506: Machinery
  └─ 8501-8548: Electrical machinery
```

---

## 🎓 Learning Resources

### Official References
- [GST Council - HSN Database](https://www.cbic.gov.in/)
- [GST Rates by HSN](https://www.cbic.gov.in/resources/taxinformation/gstrates)
- [GST Compliance Guide](https://www.gst.gov.in/resources/useful-links)

### Common Issues
1. **Product not matching any HSN?** → Check if product is GST-exempt
2. **HSN rate differs from invoice?** → Update HSN-Tax mapping in system
3. **Invoice not showing HSN?** → Ensure product HSN is saved (not empty)

---

## 💾 Quick HSN Checklist

Before submitting products to GST:

### Product Data
- [ ] All products have item codes
- [ ] All products have HSN codes (India)
- [ ] HSN codes are 6 digits
- [ ] HSN codes match official GST schedule
- [ ] No repeated HSN codes
- [ ] HSN codes are current (not repealed)

### Verification
- [ ] CSV export includes HSN column
- [ ] Invoice displays HSN correctly
- [ ] Tax rates match HSN classification
- [ ] GSTR reports include HSN

### Maintenance
- [ ] HSN audit log kept
- [ ] Changes documented
- [ ] Team trained
- [ ] Updates tracked

---

## 📞 Support

### Where to Find HSN Value
**In Product Form:**
```
Tab: "Basic Info"
Row 1, Column 2: "HSN Code" input field
```

### Where HSN Appears
```
✓ Product table (list view)
✓ Product edit form
✓ CSV export
✓ Invoices (for India)
✓ Reports
```

### Troubleshooting
| Issue | Fix |
|-------|-----|
| Can't find HSN field | Go to "Basic Info" tab |
| HSN not saving | Ensure 6 digits, no spaces |
| HSN shows as empty | Product saved without HSN - edit and add it |
| Invoice missing HSN | Make sure product has HSN before creating invoice |

---

## 🎯 Summary

**You now know how to:**

✅ Add HSN to products  
✅ Find correct HSN codes  
✅ Verify HSN in system  
✅ Export HSN in CSV  
✅ Use HSN in invoices  
✅ Maintain HSN compliance

---

**Next Steps:**
1. Go to Products module
2. Edit a product
3. Add HSN code on "Basic Info" tab
4. Click Save
5. Verify HSN appears in product list

**That's it!** Your HSN codes are now managed in NEXIS-ERP. 🎉

---

**For detailed information,** see [HSN_MANAGEMENT_GUIDE.md](HSN_MANAGEMENT_GUIDE.md)
