# Global Decimal Formatting Implementation Guide

## Overview

The decimal formatting system provides **company-wide automatic decimal place control**. Once set in CompanyMaster, all monetary values, percentages, and calculations throughout the application automatically use the configured decimal places and currency formatting.

---

## Architecture

```
CompanyMaster (Set decimalPlaces)
    ↓
CompanyContext (Provides company data including decimalPlaces)
    ↓
useDecimalFormat Hook (Accesses context and provides formatting)
    ↓
DecimalFormatService (Pure utility functions)
    ↓
Any Component (Format values automatically)
```

---

## Quick Start

### 1. Basic Usage (Sales Invoice)

```jsx
import React from 'react';
import useDecimalFormat from '../../hooks/useDecimalFormat';

const InvoiceItem = ({ item }) => {
  const { formatCurrency, sum } = useDecimalFormat();

  const lineTotal = item.quantity * item.unitPrice;
  const withTax = lineTotal * (1 + item.taxRate / 100);

  return (
    <tr>
      <td>{item.description}</td>
      <td className="text-right">{item.quantity}</td>
      <td className="text-right">{formatCurrency(item.unitPrice)}</td>
      <td className="text-right">{formatCurrency(lineTotal)}</td>
      <td className="text-right font-bold">{formatCurrency(withTax)}</td>
    </tr>
  );
};
```

### 2. Financial Report Usage

```jsx
const FinancialReport = ({ metrics }) => {
  const { formatCurrency, formatPercentage, average } = useDecimalFormat();

  return (
    <div>
      <p>Revenue: {formatCurrency(metrics.totalRevenue)}</p>
      <p>Margin: {formatPercentage(metrics.profitMargin)}</p>
      <p>Avg Value: {formatCurrency(average([...orders]))}</p>
    </div>
  );
};
```

### 3. User Input Validation

```jsx
const AmountInput = () => {
  const { formatNumber, parseInput, isValidDecimal } = useDecimalFormat();
  const [amount, setAmount] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    
    // Validate before storing
    if (isValidDecimal(value)) {
      const parsed = parseInput(value);
      setAmount(parsed);
    }
  };

  return (
    <input
      value={amount}
      onChange={handleChange}
      placeholder="Enter amount"
    />
  );
};
```

---

## Available Methods

### Core Formatting Methods

#### `formatCurrency(amount, customCurrency?, customDecimals?)`
- **Use for:** All monetary values
- **Returns:** Formatted string with currency symbol
- **Example:** `formatCurrency(1234.567)` → `د.إ 1234.57`

#### `formatNumber(amount)`
- **Use for:** Plain numbers without currency
- **Returns:** Number as fixed decimal string
- **Example:** `formatNumber(99.999)` → `"100.00"`

#### `formatPercentage(value)`
- **Use for:** Percentage values
- **Returns:** Percentage string
- **Example:** `formatPercentage(18.5432)` → `"18.54%"`

#### `formatForDisplay(amount, options)`
- **Use for:** Display in tables/reports with advanced options
- **Options:** `{ currency, decimalPlaces, showSymbol, abbreviate }`
- **Example:** `formatForDisplay(1500000, { abbreviate: true })` → `د.إ 1.50M`

### Calculation Methods

#### `sum(amounts[])`
- **Use for:** Adding multiple numbers with proper rounding
- **Returns:** Sum rounded to company decimals
- **Example:** `sum([100.555, 200.777, 300.123])` → `601.46`

#### `average(amounts[])`
- **Use for:** Calculating average of array
- **Returns:** Average rounded to company decimals
- **Example:** `average([100, 200, 300])` → `200.00`

#### `round(amount)`
- **Use for:** Rounding to company's decimal places
- **Returns:** Rounded number
- **Example:** `round(99.9999)` → `100.00`

### Validation Methods

#### `isValidDecimal(input)`
- **Use for:** Validating user input before processing
- **Returns:** Boolean
- **Example:** `isValidDecimal("1234.56")` → `true`

#### `parseInput(input)`
- **Use for:** Safely parse user input to number
- **Returns:** Parsed number or 0
- **Example:** `parseInput("$1,234.56")` → `1234.56`

#### `getValidationRegex()`
- **Use for:** Regex validation in form fields
- **Returns:** RegExp pattern
- **Example:** Input validation pattern

### Configuration Methods

#### `getDecimalSeparator()`
- **Use for:** Getting the decimal separator for company currency
- **Returns:** "." or ","

#### `config`
- **Access:** `{ decimalPlaces, currency, countryCode }`
- **Use for:** Reading current company settings

---

## Common Integration Points

### 1. **Sales / Invoice Components**

```jsx
// src/components/sales/InvoiceLineItem.jsx
const InvoiceLineItem = ({ item, onUpdate }) => {
  const { formatCurrency, round } = useDecimalFormat();

  const calculateLineTotal = () => {
    const subtotal = item.quantity * item.unitPrice;
    const tax = subtotal * (item.taxRate / 100);
    return round(subtotal + tax); // Ensures proper rounding
  };

  return (
    <tr>
      <td>{item.sku}</td>
      <td className="text-right">{item.quantity}</td>
      <td className="text-right">{formatCurrency(item.unitPrice)}</td>
      <td className="text-right">{formatCurrency(calculateLineTotal())}</td>
    </tr>
  );
};
```

### 2. **Financial Reports**

```jsx
// src/components/reports/ProfitLossReport.jsx
const ProfitLossReport = ({ data }) => {
  const { formatCurrency, formatPercentage } = useDecimalFormat();

  return (
    <div className="report">
      <div className="row">
        <span>Revenue</span>
        <span>{formatCurrency(data.revenue)}</span>
      </div>
      <div className="row">
        <span>Expenses</span>
        <span>{formatCurrency(data.expenses)}</span>
      </div>
      <div className="row highlight">
        <span>Net Profit</span>
        <span>{formatCurrency(data.profit)}</span>
      </div>
      <div className="row">
        <span>Margin</span>
        <span>{formatPercentage((data.profit / data.revenue) * 100)}</span>
      </div>
    </div>
  );
};
```

### 3. **Inventory / Product Components**

```jsx
// src/components/inventory/ProductCostForm.jsx
const ProductCostForm = ({ product }) => {
  const { formatCurrency, round, isValidDecimal } = useDecimalFormat();
  const [cost, setCost] = useState(product.cost || '');

  const handleCostChange = (e) => {
    const value = e.target.value;
    
    if (isValidDecimal(value)) {
      setCost(value);
    }
  };

  const handleSave = () => {
    const finalCost = round(parseFloat(cost));
    updateProductCost(product.id, finalCost);
  };

  return (
    <div>
      <input
        value={cost}
        onChange={handleCostChange}
        placeholder="0.00"
      />
      <p className="preview">Formatted: {formatCurrency(cost)}</p>
      <button onClick={handleSave}>Save</button>
    </div>
  );
};
```

### 4. **Dashboard / Summary Widgets**

```jsx
// src/components/dashboard/SummaryWidget.jsx
const SummaryWidget = ({ title, value, type = 'currency' }) => {
  const { formatCurrency, formatPercentage, formatNumber } = useDecimalFormat();

  const formatValue = () => {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  };

  return (
    <div className="widget">
      <h3>{title}</h3>
      <div className="value">{formatValue()}</div>
    </div>
  );
};
```

### 5. **Tax Calculation Components**

```jsx
// src/components/sales/TaxCalculator.jsx
const TaxCalculator = ({ subtotal, taxRate }) => {
  const { formatCurrency, round } = useDecimalFormat();

  const calculateTax = () => {
    const tax = subtotal * (taxRate / 100);
    return round(tax); // Prevents floating point errors
  };

  const total = round(subtotal + calculateTax());

  return (
    <div className="summary">
      <div>Subtotal: {formatCurrency(subtotal)}</div>
      <div>Tax ({taxRate}%): {formatCurrency(calculateTax())}</div>
      <div className="total">Total: {formatCurrency(total)}</div>
    </div>
  );
};
```

---

## Company Settings Integration

### How Decimal Places Flow

1. **CompanyMaster** - User selects decimal places (0-4)
2. **CompanyContext** - Stores in company object
3. **useDecimalFormat** - Reads from context
4. **All Components** - Use hook for formatting automatically

### Changing Decimal Places

When a user changes the company's decimal places in CompanyMaster:
1. Form updates local state: `decimalPlaces: 3`
2. handleSubmit calls API: `PUT /api/company/...`
3. API updates Company in database
4. CompanyContext updates (via useEffect)
5. All components using `useDecimalFormat` re-render with new decimals
6. All values instantly show new formatting

---

## Error Handling & Edge Cases

### Invalid Input

```jsx
const SafeAmountInput = ({ value }) => {
  const { parseInput, formatCurrency } = useDecimalFormat();

  const parsed = parseInput(value); // Returns 0 if invalid
  const formatted = formatCurrency(parsed);

  return <span>{formatted}</span>;
};
```

### Missing Company Context

```jsx
// Component will throw error if CompanyProvider not in tree
const MyComponent = () => {
  const { formatCurrency } = useDecimalFormat(); // throws if missing provider
};

// Solution: Wrap app with provider
<CompanyProvider>
  <MyComponent />
</CompanyProvider>
```

### Floating Point Errors Prevention

```jsx
// BAD - Floating point error
const total = subtotal + tax; // Could be 100.00000000001

// GOOD - Use round()
const total = round(subtotal + tax); // Always 100.00
```

---

## Best Practices

### ✅ DO:
- Use `formatCurrency()` for all monetary values
- Use `sum()` and `average()` for calculations with multiple values
- Use `round()` after math operations
- Use `isValidDecimal()` to validate user input
- Import hook once at component top level

### ❌ DON'T:
- Don't mix formatting libraries
- Don't do string operations on numbers (leads to errors)
- Don't skip validation for user input
- Don't hardcode decimal places in components
- Don't use `toFixed()` directly (not globally aware)

---

## Testing

### Example Test Cases

```jsx
import { renderHook } from '@testing-library/react';
import useDecimalFormat from '../hooks/useDecimalFormat';

describe('useDecimalFormat', () => {
  test('formats currency correctly', () => {
    const { result } = renderHook(() => useDecimalFormat(), {
      wrapper: CompanyProvider,
    });

    expect(result.current.formatCurrency(1234.567)).toBe('د.إ 1234.57');
  });

  test('validates decimal input', () => {
    const { result } = renderHook(() => useDecimalFormat(), {
      wrapper: CompanyProvider,
    });

    expect(result.current.isValidDecimal('1234.56')).toBe(true);
    expect(result.current.isValidDecimal('12.345.67')).toBe(false);
  });

  test('calculates sum with proper rounding', () => {
    const { result } = renderHook(() => useDecimalFormat(), {
      wrapper: CompanyProvider,
    });

    const sum = result.current.sum([100.555, 200.777, 300.123]);
    expect(sum).toBe(601.46);
  });
});
```

---

## Performance Optimization

### Memoization for Heavy Calculations

```jsx
import { useMemo } from 'react';
import useDecimalFormat from '../../hooks/useDecimalFormat';

const HeavyCalculationComponent = ({ items }) => {
  const { sum, formatCurrency } = useDecimalFormat();

  // Memoize expensive calculation
  const total = useMemo(() => {
    return sum(items.map(i => i.amount));
  }, [items, sum]);

  return <div>{formatCurrency(total)}</div>;
};
```

### Prevent Unnecessary Re-renders

```jsx
// Use config to check if decimals changed
const Component = () => {
  const { config } = useDecimalFormat();
  const prevDecimals = useRef(config.decimalPlaces);

  useEffect(() => {
    if (prevDecimals.current !== config.decimalPlaces) {
      // Re-format all values
      prevDecimals.current = config.decimalPlaces;
    }
  }, [config.decimalPlaces]);
};
```

---

## Migration Checklist

### Phase 1: Core Implementation ✅
- [x] Create DecimalFormatService
- [x] Create useDecimalFormat hook
- [x] Integrate into CompanyMaster
- [x] Create documentation and examples

### Phase 2: Sales Components 🔄
- [ ] Update InvoiceLineItem component
- [ ] Update CartComponent
- [ ] Update OrderSummary component
- [ ] Update Payment components

### Phase 3: Financial Reports 🔄
- [ ] Update ProfitLossReport
- [ ] Update BalanceSheet
- [ ] Update SalesReport
- [ ] Update InventoryReport

### Phase 4: Other Areas 🔄
- [ ] Product cost displays
- [ ] Inventory valuation
- [ ] Tax calculations
- [ ] Dashboards

---

## Quick Reference

| Use Case | Method | Example |
|----------|--------|---------|
| Display price | `formatCurrency()` | `formatCurrency(99.99)` |
| Display number | `formatNumber()` | `formatNumber(99.99)` |
| Display percentage | `formatPercentage()` | `formatPercentage(15.5)` |
| Sum array | `sum()` | `sum([10, 20, 30])` |
| Calculate average | `average()` | `average([10, 20, 30])` |
| Round value | `round()` | `round(99.999)` |
| Validate input | `isValidDecimal()` | `isValidDecimal("99.99")` |
| Parse input | `parseInput()` | `parseInput("$99.99")` |

---

## Support

For questions or issues:
1. Check DecimalFormatUsageExample component for examples
2. Review DecimalFormatService for detailed implementation
3. Check hook source for available methods
4. Run tests to validate behavior
