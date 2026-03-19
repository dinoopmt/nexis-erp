# 🌍 Country-Based Tax System Implementation Guide

## Overview

This guide explains how the entire application now handles country-based tax calculations dynamically. When a user changes the company's country in **CompanyMaster**, all tax calculations across the app automatically update.

## 📁 File Structure

```
client/src/
├── context/
│   └── CompanyContext.jsx          ← Global state for company & tax
├── hooks/
│   └── useTaxMaster.js             ← Custom hook for accessing tax data
├── services/
│   └── TaxService.js               ← Tax calculation utilities
├── components/
│   ├── settings/company/
│   │   └── CompanyMaster.jsx       ← Updated to use context
│   └── examples/
│       └── TaxCalculationExample.jsx ← Example implementation
└── main.jsx                        ← Updated with CompanyProvider
```

## 🔧 Architecture

### **CompanyContext** (`context/CompanyContext.jsx`)
Global state management for company settings and tax data.

**Features:**
- Stores company information (name, country, currency, etc.)
- Fetches and stores tax master data for selected country
- Auto-fetches tax master when country changes
- Provides methods to update company and switch countries

**Data:**
```javascript
{
  company: {
    countryCode: 'IN',
    countryName: 'India',
    currency: 'INR',
    taxSystem: 'GST',
    taxRate: 18.0,
    ...other company fields
  },
  taxMaster: [
    { countryCode: 'IN', taxName: 'GST 18%', components: [...], ... },
    ...
  ]
}
```

### **TaxService** (`services/TaxService.js`)
Pure utility functions for tax calculations.

**Main Methods:**
- `calculateTaxAmount(baseAmount, taxRate)` - Get tax amount
- `calculateTotalWithTax(baseAmount, taxRate)` - Get amount + tax
- `calculateDualTax(baseAmount, rate)` - CGST + SGST breakdown (India)
- `calculateSingleTax(baseAmount, rate)` - Simple VAT (UAE/Oman)
- `calculateTaxByCountry(baseAmount, countryCode, taxMaster)` - Auto-detect system
- `formatCurrency(amount, currency)` - Format for display
- `getTaxComponentNames(countryCode)` - ['CGST', 'SGST'] or ['VAT']
- `requiresHSN(countryCode)` - Check if HSN code needed
- `hasInterstateTax(countryCode)` - Check if IGST applies

### **useTaxMaster Hook** (`hooks/useTaxMaster.js`)
Custom React hook for easy access to all tax functionality.

**Usage:**
```javascript
const { 
  company,           // Current company data
  taxMaster,         // Array of tax configs
  loading,           // Loading state
  calculateTax,      // Calculate tax breakdown
  getTotalWithTax,   // Get final amount
  getTaxComponentNames,  // Get ['CGST', 'SGST'] or ['VAT']
  requiresHSN,       // Check if HSN required
  hasInterstateTax,  // Check if IGST applies
  formatCurrency,    // Format amount for display
  switchCountry,     // Change country
  updateCompany      // Update company settings
} = useTaxMaster()
```

## 🚀 How to Use

### **1. Basic Usage - Calculate Tax**

```javascript
import useTaxMaster from '../hooks/useTaxMaster'

function MyComponent() {
  const { company, taxMaster, calculateTax, formatCurrency } = useTaxMaster()
  
  // Calculate tax for ₹1000
  const taxBreakdown = calculateTax(1000)
  
  if (taxBreakdown) {
    console.log(`Base: ${formatCurrency(taxBreakdown.baseAmount)}`)
    console.log(`Tax: ${formatCurrency(taxBreakdown.totalTax)}`)
    console.log(`Total: ${formatCurrency(taxBreakdown.total)}`)
  }
}
```

### **2. Tax Breakdown - India (Dual Tax)**

```javascript
const taxBreakdown = calculateTax(1000)
// Returns: {
//   baseAmount: 1000,
//   cgst: 90,      // Central GST (9%)
//   sgst: 90,      // State GST (9%)
//   totalTax: 180,
//   total: 1180,
//   taxRate: 18
// }
```

### **3. Tax Breakdown - UAE/Oman (Single Tax)**

```javascript
const taxBreakdown = calculateTax(1000)
// Returns: {
//   baseAmount: 1000,
//   vat: 50,       // Value Added Tax (5%)
//   totalTax: 50,
//   total: 1050,
//   taxRate: 5
// }
```

### **4. Check Country-Specific Requirements**

```javascript
function ProductForm() {
  const { 
    company,
    requiresHSN,
    hasInterstateTax,
    getTaxComponentNames 
  } = useTaxMaster()
  
  const hsnRequired = requiresHSN()     // true for India, false for others
  const igstApplies = hasInterstateTax() // true for India
  const components = getTaxComponentNames()  // ['CGST', 'SGST'] or ['VAT']
  
  return (
    <>
      {hsnRequired && <input placeholder="HSN Code" />}
      {igstApplies && <input placeholder="IGST (if interstate)" />}
      <p>Tax Components: {components.join(', ')}</p>
    </>
  )
}
```

### **5. Switch Countries Dynamically**

```javascript
function CountrySwitcher() {
  const { switchCountry } = useTaxMaster()
  
  return (
    <>
      <button onClick={() => switchCountry('AE')}>Switch to UAE</button>
      <button onClick={() => switchCountry('IN')}>Switch to India</button>
      <button onClick={() => switchCountry('OM')}>Switch to Oman</button>
    </>
  )
}
```

## 📊 Tax System Differences

### **India (IN)** - DUAL Tax Structure
- **Tax System:** GST (Goods & Services Tax)
- **Rate:** 18% (standard)
- **Components:** CGST 9% + SGST 9%
- **Special:** HSN code required, Interstate IGST applies
- **Example:** ₹1000 → CGST ₹90 + SGST ₹90 = ₹1180

### **UAE (AE)** - SINGLE Tax Structure
- **Tax System:** VAT (Value Added Tax)
- **Rate:** 5% (standard), 0% (zero-rated)
- **Components:** VAT only
- **Special:** Zero-rated for food, medicine, healthcare
- **Example:** د.إ1000 → VAT د.إ50 = د.إ1050

### **Oman (OM)** - SINGLE Tax Structure
- **Tax System:** VAT (Value Added Tax)
- **Rate:** 5% (standard), 0% (zero-rated)
- **Components:** VAT only
- **Special:** Zero-rated for food, medicine, healthcare
- **Example:** ر.ع.1000 → VAT ر.ع.50 = ر.ع.1050

## 🔄 Data Flow

1. **User selects country** in CompanyMaster
2. **CompanyContext.updateCompany()** is called
3. **API saves** company settings to database
4. **CompanyContext.fetchTaxMaster()** fetches tax rules for new country
5. **Context updates** all subscribed components
6. **All components** automatically recalculate taxes
7. **UI reflects** new tax system instantly

```
Change Country → API Save → Fetch TaxMaster → Update Context → 
All Components Recalculate → Display New Taxes
```

## 🎯 Real-World Examples

### **Sales Invoice Component**
```javascript
function SalesInvoice() {
  const { calculateTax, formatCurrency } = useTaxMaster()
  
  const lineItem = { quantity: 2, unitPrice: 500 }
  const subtotal = lineItem.quantity * lineItem.unitPrice  // 1000
  
  const taxBreakdown = calculateTax(subtotal)
  
  return (
    <table>
      <tr>
        <td>Subtotal</td>
        <td>{formatCurrency(taxBreakdown.baseAmount)}</td>
      </tr>
      {taxBreakdown.cgst && (
        <tr>
          <td>CGST</td>
          <td>{formatCurrency(taxBreakdown.cgst)}</td>
        </tr>
      )}
      {taxBreakdown.sgst && (
        <tr>
          <td>SGST</td>
          <td>{formatCurrency(taxBreakdown.sgst)}</td>
        </tr>
      )}
      {taxBreakdown.vat && (
        <tr>
          <td>VAT</td>
          <td>{formatCurrency(taxBreakdown.vat)}</td>
        </tr>
      )}
      <tr>
        <td><strong>Total</strong></td>
        <td><strong>{formatCurrency(taxBreakdown.total)}</strong></td>
      </tr>
    </table>
  )
}
```

### **Product Component**
```javascript
function ProductForm() {
  const { 
    company,
    requiresHSN,
    getTaxComponentNames 
  } = useTaxMaster()
  
  return (
    <>
      <input name="productName" />
      <input name="basePrice" />
      
      {requiresHSN() && (
        <input name="hsnCode" placeholder="HSN Code (Required for India)" />
      )}
      
      <p>Applicable Taxes: {getTaxComponentNames().join(', ')}</p>
    </>
  )
}
```

## ⚙️ Configuration

### **Setup (Already Done)**
1. Created `CompanyContext` in `context/CompanyContext.jsx`
2. Created `TaxService` in `services/TaxService.js`
3. Created `useTaxMaster` hook in `hooks/useTaxMaster.js`
4. Wrapped app with `<CompanyProvider>` in `main.jsx`
5. Updated `CompanyMaster.jsx` to use context

### **Using in New Components**
```javascript
import useTaxMaster from '../hooks/useTaxMaster'

function MyComponent() {
  const { company, calculateTax, ... } = useTaxMaster()
  // Component code
}
```

## 🐛 Troubleshooting

### **TaxMaster not loading**
- Check network tab to ensure `/api/tax-masters` returns data
- Verify seeder was run: `node taxMasterSeeder.js`
- Check CompanyContext fetchTaxMaster is called

### **Taxes not updating when country changes**
- Ensure CompanyProvider is wrapping the app in main.jsx
- Check that useTaxMaster is called inside a component within CompanyProvider scope
- Verify context.updateCompany is being called

### **formatCurrency showing wrong symbol**
- Check currency code in company settings
- Add new currency to TaxService.formatCurrency if needed

## 📝 Example Implementation

See `TaxCalculationExample.jsx` for a complete working example that demonstrates:
- Fetching and displaying company/tax info
- Calculating tax breakdown
- Showing different UI based on country (HSN for India, etc.)
- Formatting currency correctly
- Displaying available tax rates

## 🔗 API Endpoints Used

```bash
GET /api/settings/company          # Load company settings
POST /api/settings/company         # Save company settings
GET /api/countries                 # Get all countries
GET /api/tax-masters               # Get all tax masters
GET /api/tax-masters/:countryCode  # Get tax for specific country
```

---

**Status:** ✅ Implementation Complete
**Countries Supported:** UAE (AE), Oman (OM), India (IN)
**Tax Calculations:** DUAL (India), SINGLE (UAE/Oman)
