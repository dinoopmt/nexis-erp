# Country-Based Decimal Configuration Guide

## Overview

All currency and decimal formatting in NEXIS ERP now follows the company's **country-based decimal configuration**. This ensures that UAE, Oman, India, and other countries display decimals correctly according to their standards.

## Currency Decimal Standards by Country

| Country | Code | Currency | Decimals | Symbol |
|---------|------|----------|----------|--------|
| UAE | AE | AED | 2 | د.إ |
| Oman | OM | OMR | **3** | ر.ع. |
| India | IN | INR | 2 | ₹ |
| USA | US | USD | 2 | $ |
| EU | EU | EUR | 2 | € |

**Key Note:** Oman (OMR) uses **3 decimal places**, while others use **2**.

## Implementation in Components

### Method 1: Using useDecimalFormat Hook (Recommended)

```jsx
import useDecimalFormat from '../../hooks/useDecimalFormat';

export const MyComponent = () => {
  const { formatCurrency, formatNumber, decimalPlaces, currency, countryCode } = useDecimalFormat();

  return (
    <div>
      {/* Format currency automatically with company's decimals */}
      <p>Price: {formatCurrency(1234.567)}</p>
      
      {/* Format plain numbers */}
      <p>Quantity: {formatNumber(5.123)}</p>

      {/* Access raw values */}
      <p>Country: {countryCode}, Currency: {currency}, Decimals: {decimalPlaces}</p>
    </div>
  );
};
```

### Method 2: Using currencyFormatter Utility

```jsx
import { formatCurrency, getCountryDecimals } from '../../utils/currencyFormatter';

export const MyComponent = () => {
  const decimals = getCountryDecimals('AE'); // Returns 2 for UAE
  
  return (
    <p>Price: {formatCurrency(1234.56, 'AED', decimals)}</p>
  );
};
```

### Method 3: Direct Update in Product Component

```jsx
const { formatCurrency, decimalPlaces, currency } = useDecimalFormat();

// Display product price with country-based decimals
<td>{formatCurrency(product.price)}</td>

// Or manually
<td>{product.price.toFixed(decimalPlaces)}</td>
```

## Updating Existing Code

### Before (Hardcoded Decimals)
```jsx
<p>Total: AED {amount.toFixed(2)}</p>
```

### After (Country-Based)
```jsx
import useDecimalFormat from '../../hooks/useDecimalFormat';

const { formatCurrency } = useDecimalFormat();
<p>Total: {formatCurrency(amount)}</p>
```

## Product Component Example

```jsx
import useDecimalFormat from '../../hooks/useDecimalFormat';
import { formatCurrency } from '../../utils/currencyFormatter';

const ProductList = () => {
  const { formatCurrency: formatPrice, decimalPlaces, currency } = useDecimalFormat();
  
  return (
    <table>
      <tbody>
        {products.map(product => (
          <tr key={product._id}>
            <td>{product.name}</td>
            {/* Using hook - Automatic */}
            <td>{formatPrice(product.price)}</td>
            {/* Using utility - Manual */}
            <td>{formatCurrency(product.cost, currency, decimalPlaces)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## How It Works

1. **Company Context** provides `decimalPlaces`, `currency`, and `countryCode`
2. **useDecimalFormat Hook** reads these values and provides formatting functions
3. **Components** call `formatCurrency()` or `formatNumber()` automatically
4. **All displays** respect the company's country configuration

## Decimal Places by Scenario

| Scenario | Decimals | Example | Notes |
|----------|----------|---------|-------|
| Currency (UAE) | 2 | 1234.56 | Standard for AED |
| Currency (Oman) | 3 | 1234.567 | OMR has 3 decimals |
| Currency (India) | 2 | 1234.56 | Standard for INR |
| Quantity/Units | 4 | 10.1234 | Can be high precision |
| Percentages | 2 | 15.50% | Standard rounding |
| Costs/Rates | Based on company setting | Varies | Follows company config |

## Testing Country-Based Formatting

### Test UAE (2 decimals)
```
Company: UAE | Currency: AED | Decimals: 2
Input: 1234.5678
Output: د.إ 1234.57
```

### Test Oman (3 decimals)
```
Company: Oman | Currency: OMR | Decimals: 3
Input: 1234.5678
Output: ر.ع. 1234.568
```

### Test India (2 decimals)
```
Company: India | Currency: INR | Decimals: 2
Input: 1234.5678
Output: ₹ 1234.57
```

## Conversion for Existing Products

When saving to database:
- Store amounts in **cents** (multiply by 100): `1234.56 → 123456`
- When displaying: divide by 100 and apply formatting

```jsx
// Saving to database
const priceInCents = Math.round(1234.56 * 100); // 123456

// Retrieving and displaying
const priceInDecimals = priceInCents / 100; // 1234.56
const formatted = formatCurrency(priceInDecimals); // د.إ 1234.56
```

## Database Storage vs Display

| Context | Decimals | Storage | Display |
|---------|----------|---------|---------|
| Database | Integer (×100) | 123456 (for 1234.56) | Automatic formatting |
| Form Input | User's choice | Parsed via hook | Formatted in real-time |
| Export/Report | Company config | As stored | Applied on export |

## Common Patterns

### Price Display
```jsx
{formatCurrency(product.price)}
```

### Quantity Display
```jsx
{formatNumber(product.quantity)}
```

### Tax Calculation
```jsx
const taxAmount = amount * (taxRate / 100);
<p>Tax: {formatCurrency(taxAmount)}</p>
```

### Multiple Currencies
```jsx
import { formatCurrency } from '../../utils/currencyFormatter';

<p>Price: {formatCurrency(1234.56, 'AED', 2)}</p>
<p>Price: {formatCurrency(1234.567, 'OMR', 3)}</p>
```

## Troubleshooting

### Issue: Showing 2 decimals when should show 3
**Solution:** Make sure using `useDecimalFormat` hook or pass correct `decimalPlaces` parameter

```jsx
// Wrong
amount.toFixed(2) // Always 2 decimals

// Correct
const { formatCurrency } = useDecimalFormat();
formatCurrency(amount) // Uses company's setting
```

### Issue: Currency symbol not showing
**Solution:** Check `currencyFormatter.js` has the symbol definition

```jsx
// Add to CURRENCY_SYMBOLS if missing
CURRENCY_SYMBOLS['NEW_CODE'] = 'symbol';
```

## Next Steps

1. ✅ Update all `toFixed(2)` calls to use `useDecimalFormat()` hook
2. ✅ Test with UAE (2 decimals), Oman (3 decimals), India (2 decimals)
3. ✅ Verify database storage uses integer format (×100)
4. ✅ Update export/report generation to respect decimals
5. ✅ Document in API responses which fields have country-based formatting

---

**Last Updated:** March 2026  
**Status:** Active - All new currency displays should use country-based config
