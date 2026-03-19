# Decimal Format System - Developer Integration Checklist

Use this checklist when adding decimal formatting to any component.

---

## 📋 Pre-Integration Checklist

### Verify System is Ready
- [ ] `server/Models/Company.js` has `decimalPlaces` field
- [ ] `client/src/services/DecimalFormatService.js` exists
- [ ] `client/src/hooks/useDecimalFormat.js` exists
- [ ] CompanyMaster shows decimal control UI (5 buttons)
- [ ] You can change decimals in CompanyMaster and save

### Identify Component to Update
- [ ] Component displays monetary/percentage values
- [ ] Component accepts number inputs from users
- [ ] Component does calculations on numbers
- [ ] Component is frequently used
- [ ] Makes sense to use company-wide decimal places

---

## 🔧 Integration Steps

### Step 1: Import Hook
```jsx
// Add this line at top of your component file
import useDecimalFormat from '../../hooks/useDecimalFormat';
```
- [ ] Import statement added
- [ ] No console errors about undefined import

### Step 2: Initialize in Component
```jsx
const MyComponent = () => {
  // Add this line right after other hooks
  const { formatCurrency, sum, round } = useDecimalFormat();
  
  // Rest of component...
};
```
- [ ] Hook initialized in component body
- [ ] Methods destructured from hook
- [ ] Only import methods you need

### Step 3: Update Display Values
Find all places where numbers are displayed:

```jsx
// BEFORE
<td>${item.price}</td>
<p>Total: {total}</p>

// AFTER
<td>{formatCurrency(item.price)}</td>
<p>Total: {formatCurrency(total)}</p>
```

**Checklist:**
- [ ] All currency values use `formatCurrency()`
- [ ] All percentages use `formatPercentage()`
- [ ] All plain numbers use `formatNumber()`
- [ ] No hardcoded $ or د.إ symbols (use formatCurrency)

### Step 4: Update Calculations
Find all math operations on numbers:

```jsx
// BEFORE
const total = subtotal + tax;
const summary = items.reduce((sum, i) => sum + i.amount, 0);

// AFTER
const total = round(subtotal + tax);
const summary = sum(items.map(i => i.amount));
```

**Checklist:**
- [ ] Uses `sum()` for adding arrays
- [ ] Uses `round()` after addition/subtraction
- [ ] Uses `average()` for array average
- [ ] No direct `toFixed()` calls

### Step 5: Add Input Validation
Find all user input fields for numbers:

```jsx
// BEFORE
const handleChange = (e) => {
  setAmount(e.target.value);
};

// AFTER
const handleChange = (e) => {
  const value = e.target.value;
  if (isValidDecimal(value)) {
    setAmount(value);
  }
};
```

**Checklist:**
- [ ] Input fields validate with `isValidDecimal()`
- [ ] Invalid input is rejected (not stored)
- [ ] User gets feedback on validity (visual or message)
- [ ] Only valid numbers reach API/database

### Step 6: Handle Form Submission
```jsx
// BEFORE
const handleSubmit = () => {
  const amount = userInput;
  submitToAPI(amount);
};

// AFTER
const handleSubmit = () => {
  if (isValidDecimal(userInput)) {
    const amount = parseInput(userInput);
    const cleaned = round(parseFloat(amount));
    submitToAPI(cleaned);
  } else {
    setError('Invalid amount');
  }
};
```

**Checklist:**
- [ ] Validates before submission
- [ ] Uses `parseInput()` to clean user input
- [ ] Uses `round()` to ensure proper decimals
- [ ] Shows error if validation fails
- [ ] Only sends valid data to API

---

## 🎯 Common Scenarios Checklist

### Scenario: Displaying Single Price
```jsx
<span>{formatCurrency(product.price)}</span>
```
- [ ] Using `formatCurrency()`
- [ ] Passing single number value
- [ ] No custom formatting logic

### Scenario: Invoice Line Items Table
```jsx
{items.map(item => (
  <tr key={item.id}>
    <td>{formatCurrency(item.unitPrice)}</td>
    <td>{item.quantity}</td>
    <td>{formatCurrency(item.quantity * item.unitPrice)}</td>
  </tr>
))}
```
- [ ] Each price uses `formatCurrency()`
- [ ] Calculations are wrapped in `formatCurrency()`
- [ ] No stray $ or symbols

### Scenario: Invoice Summary/Totals
```jsx
const subtotal = sum(items.map(i => i.qty * i.price));
const tax = round(subtotal * (taxRate / 100));
const total = round(subtotal + tax);

return (
  <div>
    <p>Subtotal: {formatCurrency(subtotal)}</p>
    <p>Tax: {formatCurrency(tax)}</p>
    <p className="font-bold">Total: {formatCurrency(total)}</p>
  </div>
);
```
- [ ] Uses `sum()` for subtotals
- [ ] Uses `round()` after tax calculation
- [ ] Uses `round()` for final total
- [ ] All values displayed with `formatCurrency()`

### Scenario: Financial Metrics
```jsx
const { formatCurrency, formatPercentage } = useDecimalFormat();

return (
  <div>
    <p>Revenue: {formatCurrency(data.revenue)}</p>
    <p>Profit: {formatCurrency(data.profit)}</p>
    <p>Margin: {formatPercentage((data.profit/data.revenue)*100)}</p>
  </div>
);
```
- [ ] Uses `formatCurrency()` for amounts
- [ ] Uses `formatPercentage()` for percentages
- [ ] Calculations are simple
- [ ] Number precision maintained

### Scenario: User Input Field
```jsx
const { parseInput, isValidDecimal, formatNumber } = useDecimalFormat();
const [amount, setAmount] = useState('');
const [error, setError] = useState('');

const handleChange = (e) => {
  const value = e.target.value;
  if (isValidDecimal(value)) {
    setAmount(value);
    setError('');
  } else if (value !== '') {
    setError('Invalid decimal format');
  }
};

const handleSave = () => {
  const cleaned = round(parseInput(amount));
  submitAmount(cleaned);
};

return (
  <div>
    <input
      value={amount}
      onChange={handleChange}
      placeholder="Enter amount"
    />
    {error && <span className="text-red-600">{error}</span>}
    <p>Preview: {formatNumber(amount)}</p>
    <button onClick={handleSave}>Save</button>
  </div>
);
```
- [ ] Input validates with `isValidDecimal()`
- [ ] Error message shown on invalid input
- [ ] Uses `parseInput()` before saving
- [ ] Uses `round()` to finalize
- [ ] Shows formatted preview
- [ ] Only valid data sent to API

---

## 🔍 Code Review Checklist

When reviewing code that uses decimal formatting:

### Imports & Setup
- [ ] `useDecimalFormat` hook is imported
- [ ] Only necessary methods are destructured
- [ ] Hook is called at component top level
- [ ] No hooks in conditional logic

### Display Values
- [ ] All currency values use `formatCurrency()`
- [ ] No hardcoded currency symbols ($ د.إ € etc)
- [ ] All percentages use `formatPercentage()`
- [ ] Formatting methods wraps the value directly

### Calculations
- [ ] Array sums use `sum()` method
- [ ] Addition/subtraction wrapped in `round()`
- [ ] No floating point operations without rounding
- [ ] Calculations are correct logically

### Input Validation
- [ ] User number inputs validated with `isValidDecimal()`
- [ ] Input parsing uses `parseInput()`
- [ ] Final value rounded with `round()` before save
- [ ] Error messages shown for invalid input

### Edge Cases
- [ ] Handles empty input gracefully
- [ ] Handles NaN/null values gracefully
- [ ] Handles very large numbers correctly
- [ ] Handles negative numbers correctly

---

## ❌ Anti-Patterns to Avoid

Check that code does NOT do these:

```jsx
// ❌ DON'T: String concatenation for currency
const display = "$" + amount;

// ✅ DO: Use formatCurrency()
const display = formatCurrency(amount);

---

// ❌ DON'T: Multiple toFixed() calls
const formatted = amount.toFixed(2).toFixed(3);

// ✅ DO: Use formatNumber()
const formatted = formatNumber(amount);

---

// ❌ DON'T: Hardcoded decimal places
const result = amount.toFixed(2);

// ✅ DO: Use company's decimal setting
const result = formatCurrency(amount);

---

// ❌ DON'T: Direct floating point math
const total = 100.1 + 200.2 + 300.3; // 600.5999...

// ✅ DO: Use sum() for arrays
const total = sum([100.1, 200.2, 300.3]); // 600.60

---

// ❌ DON'T: No validation on user input
const amount = parseFloat(userInput);

// ✅ DO: Validate before parsing
if (isValidDecimal(userInput)) {
  const amount = parseInput(userInput);
}

---

// ❌ DON'T: Mixing formatting methods
const display = `${symbol}${(amount).toFixed(2)}`;

// ✅ DO: Use one clear method
const display = formatCurrency(amount);
```

- [ ] No string concatenation for numbers
- [ ] No hardcoded toFixed() calls
- [ ] No unvalidated user input
- [ ] No floating point math without rounding
- [ ] No mixing of different formatting approaches

---

## 👀 Testing Before Submitting

### In Development (Browser)
- [ ] Component displays numbers correctly
- [ ] Open CompanyMaster → Change decimal places
- [ ] Click Save
- [ ] Component values update with new decimals
- [ ] Process again: 0, 1, 2, 3, 4 decimals all work
- [ ] Values look correct for each decimal setting

### Test Different Inputs
```jsx
// Test these values in your inputs:
'99.99'       // ✓ Valid
'100'         // ✓ Valid (integer)
'0.1'         // ✓ Valid
'1,234.56'    // ✗ Should reject (depending on validation)
'-50.25'      // ✓ Valid (negative)
'abc'         // ✗ Should reject
'99.9999'     // ✗ Might reject (over decimal limit)
''            // ✓ Valid (empty)
```

- [ ] Tests pass for valid inputs
- [ ] Tests pass for invalid inputs (rejected appropriately)
- [ ] No console errors during testing
- [ ] Values round correctly

### Test Different Currencies
If supporting multiple currencies:
- [ ] AED (2 decimals standard)
- [ ] USD (2 decimals standard)
- [ ] OMR (3 decimals standard)
- [ ] Each shows correct symbol

### Performance Check
- [ ] Component doesn't re-render unnecessarily
- [ ] No console lag when changing values
- [ ] Calculations are fast (< 1ms)
- [ ] Works with large datasets (100+ items)

---

## 📝 Pull Request Checklist

Before creating PR with your changes:

### Code Quality
- [ ] All `formatCurrency()` calls verified
- [ ] All calculations use `sum()` or `round()`
- [ ] All input fields validated
- [ ] No console errors or warnings
- [ ] Code follows component style

### Testing
- [ ] Manual testing completed
- [ ] Different decimal places tested (0-4)
- [ ] Invalid inputs rejected properly
- [ ] Edge cases handled
- [ ] Performance verified

### Documentation
- [ ] Component updated if comments needed
- [ ] Complex logic has explanatory comments
- [ ] No TODO or FIXME comments left

### Diff Review
- [ ] Only necessary changes in diff
- [ ] No debugging code left
- [ ] No console.log() statements
- [ ] Imports are organized

### PR Description
Include:
- [ ] Which component was updated
- [ ] What formatting was added/changed
- [ ] How decimal places now work in this component
- [ ] Testing instructions
- [ ] Screenshots if UI changed significantly

---

## 🎓 After Integration

### Maintenance
- [ ] Component works for 1 week without issues
- [ ] Users report correct formatting
- [ ] No rounding errors reported
- [ ] Input validation working as expected

### Documentation Updates
- [ ] Update component README if exists
- [ ] Add to integration examples in guide
- [ ] Note any special handling or edge cases
- [ ] Suggest to team if others need similar updates

### Team Communication
- [ ] Tell team about successful integration
- [ ] Share patterns in team meeting if possible
- [ ] Update integration checklist with lessons learned
- [ ] Celebrate completion! 🎉

---

## 📞 Questions During Integration?

**Q: My component shows wrong decimals**
A: Check that CompanyMaster is saving to database. Use DevTools → CompanyContext to verify `decimalPlaces` value.

**Q: Floating point errors still happening**
A: You're using `+` instead of `sum()`. Replace: `const total = sum([a, b, c]);`

**Q: Input validation rejecting valid numbers**
A: Check decimal limit in your form. If company has 2 decimals, `99.999` will be rejected (correct). Allow user to enter, then `round()` it.

**Q: Currency symbol wrong**
A: Check `company.currency` in DevTools. Should match one of: AED, USD, EUR, GBP, OMR, INR, SAR, QAR, KWD, BHD.

**Q: Hook throws error "must be used within CompanyProvider"**
A: Your component isn't inside `<CompanyProvider>`. Check main.jsx - should wrap entire app.

**Q: Performance is slow**
A: If formatting 1000+ values, consider memoization. See DECIMAL_FORMATTING_GUIDE.md section on performance.

---

## ✅ Final Sign-Off

Before marking this integration complete:

- [ ] Code compiles without errors
- [ ] All functionality tested manually
- [ ] Decimal places change test passed
- [ ] Edge cases handled gracefully
- [ ] Code review approved
- [ ] PR merged to main
- [ ] Component deployed to staging/production
- [ ] No user-reported issues after 1 week

---

**Ready to Integrate?** 

1. Pick a component from "Integration Roadmap" in README
2. Follow "Integration Steps" above
3. Test thoroughly
4. Use "Code Review Checklist"
5. Submit PR with "Pull Request Checklist"
6. Celebrate! 🎉

---

**Estimated Time Per Component:** 30-60 minutes  
**Difficulty:** Easy to Medium  
**Priority Components:** Sales Invoice → Reports → Inventory

Good luck! 🚀
