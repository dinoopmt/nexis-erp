# HSN Code - Auto Tax Update Feature

## Overview

When a user selects an HSN code in the Product form, the system automatically updates the tax information based on the HSN's GST rate and the company's country setting.

---

## How It Works

### 1. **HSN Code Selection**
- User selects an HSN code from the dropdown (India only)
- Triggers `handleHSNSelection()` function

### 2. **Automatic Tax Update**
The system performs the following:

```javascript
- Finds the selected HSN code in the hsnCodes array
- Extracts the gstRate from the HSN object
- Sets taxType = "GST {gstRate}%" (e.g., "GST 5%", "GST 18%")
- Sets taxPercent = gstRate value (e.g., 5, 12, 18, 28)
- Calculates taxAmount = (cost × gstRate) / 100
```

### 3. **Country-Specific Logic**
- **For India Companies:** 
  - HSN dropdown enabled
  - Auto-updates tax type to GST format
  - Applies GST rate from HSN code

- **For Non-India Companies:**
  - HSN field disabled
  - Shows "India only" message
  - No auto-tax update

---

## Tax Calculation Example

**Scenario:** Product with HSN code "090121" (Coffee, roasted, not decaffeinated) - GST 5%

| Field | Before Selection | After HSN Selection |
|-------|-----------------|-------------------|
| HSN Code | (empty) | 090121 |
| Tax Type | (empty) | GST 5% |
| Tax % | 0 | 5 |
| Cost | $100 | $100 |
| Tax Amount | $0 | $5 |

---

## Implementation Details

### Modified Files
- **client/src/components/product/Product.jsx**

### Key Functions

#### 1. fetchHSNCodes()
```javascript
// Fetches all HSN codes from the database
// Only runs for India companies
// Stores HSN codes in state for dropdown
```

#### 2. handleHSNSelection(hsnCode)
```javascript
// Triggered when user selects HSN from dropdown
// Parameters:
//   - hsnCode: string (e.g., "090121")
// 
// Updates:
//   - newProduct.hsn = hsnCode
//   - newProduct.taxType = "GST {gstRate}%"
//   - newProduct.taxPercent = gstRate
//   - newProduct.taxAmount = calculated amount
```

### Updated UI Elements

#### HSN Code Dropdown
```jsx
{isIndiaCompany ? (
  <select
    value={newProduct.hsn}
    onChange={(e) => handleHSNSelection(e.target.value)}
    disabled={loading || loadingHsn}
  >
    <option value="">Select HSN Code...</option>
    {hsnCodes.map((hsn) => (
      <option key={hsn.code} value={hsn.code}>
        {hsn.code} - {hsn.description}
      </option>
    ))}
  </select>
) : (
  <input
    placeholder="HSN not available for this country"
    disabled
    value="India only"
  />
)}
```

#### Auto-Updated Tax Fields (Read-Only)
```jsx
{/* Tax % - Auto-populated from HSN */}
<input
  type="number"
  placeholder="Tax %"
  value={newProduct.taxPercent}
  disabled={true}
/>

{/* Tax Amount - Auto-calculated */}
<input
  type="number"
  placeholder="Tax $"
  value={newProduct.taxAmount}
  disabled={true}
/>
```

---

## HSN Code Structure

Each HSN code object contains:

```javascript
{
  code: "090121",           // 6-digit HSN code
  description: "Coffee, roasted, not decaffeinated",
  category: "Foodstuffs",
  gstRate: 5,              // ← Used for tax calculation
  chapter: 9,
  heading: 1,
  subHeading: 21,
  hsnChapterDescription: "Coffee, tea, maté and spices",
  applicableFrom: Date,
  applicableTo: ["IN"],
  repealed: false
}
```

---

## GST Rates Supported

| GST Rate | Status | Countries |
|----------|--------|-----------|
| 0% | ✅ Supported | India (Exempt items) |
| 5% | ✅ Supported | India (Basic necessities) |
| 12% | ✅ Supported | India (Mid-range goods) |
| 18% | ✅ Supported | India (General goods) |
| 28% | ✅ Supported | India (Luxury items) |

---

## Features

✅ **Automatic Tax Detection**
- No manual entry required for tax type/percent
- Reduces data entry errors

✅ **Country-Based Control**
- Only available for India companies
- Disabled for other countries

✅ **Real-Time Calculation**
- Tax amount calculated when HSN is selected
- Recalculated if cost changes

✅ **User-Friendly Display**
- HSN code and description shown in dropdown
- Read-only tax fields prevent accidental changes
- Auto-populated values clearly visible

✅ **Compliant with GST**
- Uses official HSN to GST rate mapping
- Supports all GST slabs (0%, 5%, 12%, 18%, 28%)

---

## Testing Scenarios

### Test 1: India Company - Select HSN 5% GST
1. Load Product form
2. Company country = "India"
3. HSN dropdown enabled
4. Select HSN "090111" (5% GST)
5. **Verify:** Tax Type = "GST 5%", Tax % = 5

### Test 2: India Company - Select HSN 18% GST
1. Load Product form
2. Company country = "India"
3. Select HSN "100191" (18% GST)
4. **Verify:** Tax Type = "GST 18%", Tax % = 18

### Test 3: Non-India Company
1. Load Product form
2. Company country = "UAE"
3. **Verify:** HSN field disabled, shows "India only"
4. Tax fields not auto-updated

### Test 4: Cost-Based Tax Amount
1. Load Product form
2. Company = "India"
3. Cost = $100
4. Select HSN with 5% GST
5. **Verify:** Tax Amount = $5 (shown in read-only field)

---

## Related Features

- [HSN Management Component](HSN_COUNTRY_BASED_CONTROL.md)
- [Product Model Documentation](PRODUCT_MODEL_GUIDE.md)
- [Country Settings Configuration](COMPANY_SETTINGS_SETUP.md)

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| HSN dropdown empty | No HSN codes loaded | Ensure HSN seeder ran successfully |
| Tax not updating | Company not India | Change company country to "India" |
| Wrong tax rate | Selected wrong HSN | Verify HSN code selection |
| Tax Amount 0 | Cost field empty | Enter cost value |

---

## Future Enhancements

- [ ] Support for multiple countries (Bangladesh, Sri Lanka, etc.)
- [ ] Bulk HSN updates for existing products
- [ ] HSN search/filter in dropdown for large lists
- [ ] Tax rate history tracking
- [ ] Override tax amount with manual entry

---

**Feature Status:** ✅ Complete and Tested  
**Date Implemented:** March 4, 2026  
**Component:** Product.jsx  
**Requirement:** Auto-populate tax based on HSN and country
