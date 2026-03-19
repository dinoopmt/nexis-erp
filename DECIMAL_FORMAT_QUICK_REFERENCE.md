# Decimal Format System - Quick Reference Card

## 🚀 One-Liner Setup
```jsx
const { formatCurrency, formatNumber, sum } = useDecimalFormat();
```

---

## 📌 Copy-Paste Examples

### Currency Display (Most Common)
```jsx
<td>{formatCurrency(item.price)}</td>
// Output: د.إ 1234.57
```

### Percentage Display
```jsx
<span>{formatPercentage(18.5432)}</span>
// Output: 18.54%
```

### Sum with Proper Rounding
```jsx
const total = sum([100.555, 200.777, 300.123]);
// Output: 601.46 (not 601.4549999...)
```

### Average Calculation
```jsx
const avg = average([100, 200, 300]);
// Output: 200.00
```

### Validate User Input
```jsx
const handleChange = (e) => {
  if (isValidDecimal(e.target.value)) {
    setAmount(parseInput(e.target.value));
  }
};
```

### Display in Table
```jsx
<td className="text-right">
  {formatCurrency(subtotal)}
</td>
<td className="text-right">
  {formatCurrency(tax)}
</td>
```

### Invoice Summary
```jsx
const { formatCurrency, sum, round } = useDecimalFormat();

const subtotal = sum(items.map(i => i.qty * i.price));
const taxAmount = round(subtotal * (taxRate / 100));
const total = round(subtotal + taxAmount);

return (
  <div>
    <p>Subtotal: {formatCurrency(subtotal)}</p>
    <p>Tax ({taxRate}%): {formatCurrency(taxAmount)}</p>
    <p className="font-bold">Total: {formatCurrency(total)}</p>
  </div>
);
```

---

## 🎯 Method Quick Reference

| Need | Method | Example |
|------|--------|---------|
| Display price | `formatCurrency()` | `formatCurrency(99.99)` → `د.إ 99.99` |
| Display number | `formatNumber()` | `formatNumber(99.99)` → `"99.99"` |
| Display percent | `formatPercentage()` | `formatPercentage(15.5)` → `"15.50%"` |
| Sum amounts | `sum()` | `sum([10,20,30])` → `60.00` |
| Average | `average()` | `average([10,20,30])` → `20.00` |
| Round value | `round()` | `round(99.999)` → `100.00` |
| Parse input | `parseInput()` | `parseInput("$99")` → `99` |
| Validate | `isValidDecimal()` | `isValidDecimal("99.9")` → `true` |
| Get decimals | `config.decimalPlaces` | `2` |
| Get currency | `config.currency` | `'AED'` |

---

## ⚠️ Common Mistakes (DON'T DO THIS)

```jsx
// ❌ DON'T - Will lose decimals
const total = 100.1 + 200.2 + 300.3; // 600.5999999...

// ✅ DO - Use sum()
const total = sum([100.1, 200.2, 300.3]); // 600.60

// ❌ DON'T - Hardcode decimals
const formatted = amount.toFixed(2);

// ✅ DO - Use hook (auto uses company setting)
const formatted = formatCurrency(amount);

// ❌ DON'T - String concatenation for numbers
const total = "$" + amount;

// ✅ DO - Use format method
const total = formatCurrency(amount);

// ❌ DON'T - No validation
const amount = parseFloat(userInput);

// ✅ DO - Validate first
if (isValidDecimal(userInput)) {
  const amount = parseInput(userInput);
}
```

---

## 🏗️ Step-by-Step Integration

### Step 1: Import Hook
```jsx
import useDecimalFormat from '../../hooks/useDecimalFormat';
```

### Step 2: Initialize in Component
```jsx
const MyComponent = () => {
  const { formatCurrency, sum } = useDecimalFormat();
  // Now use cases below...
};
```

### Step 3: Format Display Values
```jsx
return <span>{formatCurrency(value)}</span>;
```

### Step 4: Format Calculations
```jsx
const total = sum(amounts); // Auto-rounded
```

---

## 🔌 Integration Locations (Priority Order)

### 🔴 HIGH PRIORITY
- [ ] Sales Invoice components (most user-visible)
- [ ] Payment/Receipt components
- [ ] Financial Reports dashboard

### 🟡 MEDIUM PRIORITY
- [ ] Product cost displays
- [ ] Inventory valuation
- [ ] Tax calculations

### 🟢 LOW PRIORITY
- [ ] Activity logs
- [ ] Historical data displays
- [ ] Analysis reports

---

## 🧪 Testing Pattern

```jsx
import { renderHook } from '@testing-library/react';
import useDecimalFormat from '../hooks/useDecimalFormat';
import { CompanyProvider } from '../context/CompanyContext';

test('format currency', () => {
  const { result } = renderHook(() => useDecimalFormat(), {
    wrapper: CompanyProvider,
  });
  
  expect(result.current.formatCurrency(1234.567))
    .toBe('د.إ 1234.57');
});
```

---

## 🎨 Styling Tips

### Right-aligned for numbers
```jsx
<td className="text-right">{formatCurrency(value)}</td>
```

### Bold for totals
```jsx
<p className="font-bold">{formatCurrency(total)}</p>
```

### Green for positive, red for negative
```jsx
<span className={profit > 0 ? 'text-green-600' : 'text-red-600'}>
  {formatCurrency(profit)}
</span>
```

### Mono font for precise numbers
```jsx
<span className="font-mono">{formatNumber(precision)}</span>
```

---

## 🔐 Error Prevention

### Always Use in Form Input
```jsx
const [amount, setAmount] = useState('');

const handleChange = (e) => {
  if (isValidDecimal(e.target.value)) {
    setAmount(e.target.value);
  }
};

const handleSubmit = () => {
  const parsed = parseInput(amount);
  submitToAPI(parsed);
};
```

### Always Round After Math
```jsx
const sub = 100.1 + 200.2;  // 300.2999...
const total = round(sub);   // 300.30 ✓
```

### Always Validate Before Save
```jsx
if (isValidDecimal(userInput)) {
  const value = parseInput(userInput);
  saveToDatabase(value);
} else {
  showError('Invalid amount');
}
```

---

## 💾 How Data Flows

```
User Input (Form)
    ↓
isValidDecimal() ← Validate
    ↓
parseInput() ← Convert to number
    ↓
Save to State/API
    ↓
Load from API
    ↓
formatCurrency() ← Format for display
    ↓
Display in UI
```

---

## 📱 Responsive Tips

```jsx
{/* Desktop: Full amount */}
<span className="hidden md:block">
  {formatCurrency(amount)}
</span>

{/* Mobile: Abbreviated */}
<span className="md:hidden">
  {formatForDisplay(amount, { abbreviate: true })}
</span>
```

---

## 🎓 Key Concepts

### What is `decimalPlaces`?
Number of digits after decimal point (0-4)
- 0 = Whole numbers only (1000)
- 1 = Tenths (100.0)
- 2 = Cents (100.00) ← Most common
- 3 = Thousandths (100.000)
- 4 = Ten-thousandths (100.0000)

### Why `sum()` instead of `reduce()`?
`reduce()` → 100.1 + 200.2 = 300.2999...
`sum()` → 100.1 + 200.2 = 300.30 ✓

### Why `round()` after math?
Floating point errors accumulate:
```javascript
0.1 + 0.2 = 0.30000000000000004 // IEEE 754
```
`round()` cleans this up.

---

## 🌍 Currency Support

Supported: AED, OMR, INR, USD, EUR, GBP, SAR, QAR, KWD, BHD

```jsx
// Auto uses company currency
formatCurrency(1234.56);

// Override for display
formatCurrency(1234.56, 'USD'); // "$ 1234.56"
```

---

## ⚡ Performance Note

Hook is lightweight - safe to use anywhere:
```jsx
// This is fine - no performance hit
const { formatCurrency } = useDecimalFormat();
```

For array operations, consider memoization:
```jsx
const total = useMemo(() => {
  return sum(items.map(i => i.amount));
}, [items, sum]);
```

---

## 🚨 Error Messages

### "useDecimalFormat must be used within CompanyProvider"
**Fix:** Wrap your app with CompanyProvider in main.jsx

### "Invalid decimal format"
**Fix:** Check isValidDecimal() before parsing

### "Showing wrong decimals"
**Fix:** Check company.decimalPlaces in DevTools → CompanyContext

---

## 📞 Quick Help

| Problem | Solution |
|---------|----------|
| Wrong decimals showing | Check CompanyMaster → Set decimal places |
| Input accepts invalid values | Add `isValidDecimal()` check |
| Calculation errors | Use `sum()` or `round()` |
| Missing formatting | Import hook and use `formatCurrency()` |
| Wrong currency | Check company.currency in context |

---

## ✅ Checklist Before Submitting Code

- [ ] Use `useDecimalFormat` hook (not hardcoded decimals)
- [ ] Validate user input with `isValidDecimal()`
- [ ] Round calculations with `sum()` or `round()`
- [ ] Display currency with `formatCurrency()`
- [ ] Add to code review checklist
- [ ] Test with different decimal places (0-4)
- [ ] Test with different currencies (AED, USD, INR)

---

**Print this card and keep it handy! 🎯**
