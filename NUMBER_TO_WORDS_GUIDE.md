# useNumberToWords Hook - Usage Guide

A comprehensive React hook for converting numbers to words in **English and Arabic** for UAE, Oman, and India with proper currency formatting.

## Features

✅ **Multi-Country Support**: UAE, Oman, India  
✅ **Multi-Language**: English and Arabic (UAE/Oman)  
✅ **Currency-Aware**: Automatic currency formatting based on country  
✅ **Indian Numbering**: Supports Lakh and Crore system for India  
✅ **Company Context**: Automatically uses company settings  
✅ **Decimal Handling**: Proper conversion of paise, fils, and cents  

## Installation

The hook is already installed at:
```
client/src/hooks/useNumberToWords.js
client/src/services/NumberToWordsService.js
```

## Basic Usage

### Simple Example - UAE (English)

```jsx
import { useNumberToWords } from '../hooks';

function InvoiceComponent() {
  const { convertToWords } = useNumberToWords();
  
  const amount = 5234.50;
  const inWords = convertToWords(amount, 'AED');
  
  return <p>{inWords}</p>;
  // Output: "five thousand two hundred thirty-four Dirhams and fifty Fils"
}
```

### With Currency

```jsx
const { convertToWordsWithCurrency } = useNumberToWords();

const amount = 1500.75;
const inWords = convertToWordsWithCurrency(amount, 'AED');
// Output: "one thousand five hundred Dirhams and seventy-five Fils"
```

## All Methods

### 1. convertToWords(amount, currency)
Converts a number to words with optional currency.

```jsx
const { convertToWords } = useNumberToWords();

// Default uses company currency settings
convertToWords(1234.50);

// With specific currency
convertToWords(1234.50, 'AED');
convertToWords(1234.50, 'OMR');
convertToWords(1234.50, 'INR');
```

### 2. convertToWordsWithCurrency(amount, customCurrency)
Same as above but emphasizes currency inclusion.

```jsx
const { convertToWordsWithCurrency } = useNumberToWords();
convertToWordsWithCurrency(5000, 'AED');
```

### 3. convertIntegerToWords(amount)
Converts only the integer part.

```jsx
const { convertIntegerToWords } = useNumberToWords();

convertIntegerToWords(1234.99);
// Output: "one thousand two hundred thirty-four"
```

### 4. convertDecimalToWords(amount)
Converts only the decimal/fraction part.

```jsx
const { convertDecimalToWords } = useNumberToWords();

convertDecimalToWords(1234.75);
// Output: "seventy-five"
```

### 5. getCurrencyWords(currencyCode)
Get singular/plural forms of a currency.

```jsx
const { getCurrencyWords } = useNumberToWords();

const aed = getCurrencyWords('AED');
// Output: { singular: 'Dirham', plural: 'Dirhams', subunit: 'Fils', subunitPlural: 'Fils' }
```

### 6. getSupportedCurrencies()
Get all supported currencies for the current country.

```jsx
const { getSupportedCurrencies } = useNumberToWords();

const currencies = getSupportedCurrencies();
// For UAE: ['AED', 'USD']
// For Oman: ['OMR', 'USD']
// For India: ['INR', 'USD']
```

### 7. isLanguageSupported(language)
Check if a language is available for the current country.

```jsx
const { isLanguageSupported } = useNumberToWords();

isLanguageSupported('en');  // true for all
isLanguageSupported('ar');  // true for UAE/Oman, false for India
```

### 8. getCountryCode() & getLanguage()
Get current settings.

```jsx
const { getCountryCode, getLanguage } = useNumberToWords();

const country = getCountryCode();  // 'AE', 'OM', or 'IN'
const lang = getLanguage();        // 'en' or 'ar'
```

## Examples by Country

### UAE (AED) - English
```jsx
const { convertToWords } = useNumberToWords();

convertToWords(5234.50, 'AED');
// Output: "five thousand two hundred thirty-four Dirhams and fifty Fils"
```

### UAE (AED) - Arabic
```jsx
// When company language is set to 'ar'
const { convertToWords } = useNumberToWords();

convertToWords(5234.50, 'AED');
// Output: "خمسة آلاف ومائتان وأربعة وثلاثون درهم وخمسون فلس"
```

### Oman (OMR) - English
```jsx
const { convertToWords } = useNumberToWords();

convertToWords(1500.250, 'OMR');
// Output: "one thousand five hundred Rials and twenty-five Baisa"
```

### Oman (OMR) - Arabic
```jsx
const { convertToWords } = useNumberToWords();

convertToWords(1500.250, 'OMR');
// Output: "ألف وخمسمائة ريال وخمسة وعشرون بيسة"
```

### India (INR) - English with Lakh/Crore
```jsx
const { convertToWords } = useNumberToWords();

convertToWords(1234567.00, 'INR');
// Output: "twelve lakh thirty-four thousand five hundred sixty-seven Rupees"

convertToWords(123456789.50, 'INR');
// Output: "twelve crore thirty-four lakh fifty-six thousand seven hundred eighty-nine Rupees and fifty Paise"
```

## Real-World Examples

### Invoice Check Amount
```jsx
function CheckAmount() {
  const { convertToWordsWithCurrency } = useNumberToWords();
  
  return (
    <div className="check-amount">
      <p>Amount in Words:</p>
      <p className="amount-text">
        {convertToWordsWithCurrency(15234.75).toUpperCase()}
      </p>
    </div>
  );
}
```

### Financial Report
```jsx
function FinancialReport() {
  const { convertToWords, getCountryCode } = useNumberToWords();
  const country = getCountryCode();
  
  const revenue = 500000;
  const expenses = 350000;
  
  return (
    <table>
      <tr>
        <td>Revenue:</td>
        <td>{convertToWords(revenue, country === 'IN' ? 'INR' : country === 'OM' ? 'OMR' : 'AED')}</td>
      </tr>
      <tr>
        <td>Expenses:</td>
        <td>{convertToWords(expenses, country === 'IN' ? 'INR' : country === 'OM' ? 'OMR' : 'AED')}</td>
      </tr>
    </table>
  );
}
```

### Multi-Currency Display
```jsx
function PriceDisplay({ amount }) {
  const { convertToWords, getSupportedCurrencies } = useNumberToWords();
  const currencies = getSupportedCurrencies();
  
  return (
    <div>
      {currencies.map(currency => (
        <div key={currency}>
          <strong>{currency}:</strong>
          {convertToWords(amount, currency)}
        </div>
      ))}
    </div>
  );
}
```

## Supported Configurations

### Country & Language Matrix

| Country | Code | Languages Supported | Default Currency |
|---------|------|-------------------|------------------|
| UAE | AE | English, Arabic | AED |
| Oman | OM | English, Arabic | OMR |
| India | IN | English only | INR |

### Currency Support by Country

**UAE (AE)**
- AED (United Arab Emirates Dirham) - Default
- USD (United States Dollar)

**Oman (OM)**
- OMR (Omani Rial) - Default
- USD (United States Dollar)

**India (IN)**
- INR (Indian Rupee) - Default
- USD (United States Dollar)

## Implementation Notes

1. **Language Detection**: The hook automatically uses the company's language setting from CompanyContext
2. **Currency Detection**: Currency is auto-detected from company settings
3. **Decimal Places**: Always handled as 2 decimal places (follows standard currency format)
4. **Context Required**: Must be wrapped within CompanyProvider

## Error Handling

```jsx
function SafeExample() {
  try {
    const { convertToWords } = useNumberToWords();
    return <div>{convertToWords(1000)}</div>;
  } catch (error) {
    if (error.message.includes('CompanyProvider')) {
      return <div>Hook must be used within CompanyProvider</div>;
    }
    throw error;
  }
}
```

## Integration with Form Validation

```jsx
function PaymentForm() {
  const { convertToWords } = useNumberToWords();
  const [amount, setAmount] = useState(0);
  
  const handleAmountChange = (e) => {
    setAmount(parseFloat(e.target.value));
  };
  
  return (
    <form>
      <input 
        type="number" 
        value={amount} 
        onChange={handleAmountChange}
        placeholder="Enter amount"
      />
      {amount > 0 && (
        <p className="preview">
          Preview: {convertToWords(amount)}
        </p>
      )}
    </form>
  );
}
```

## Performance Considerations

- Conversions are done in-memory with no external API calls
- Suitable for real-time conversions in forms
- No dependencies beyond React core

## Localization Notes

**Arabic numerals (0-9) are handled consistently across all countries**

The service converts Western Arabic numerals (0-9) to:
- English words for English mode
- Arabic words for Arabic mode (UAE, Oman only)
- Indian numbering system for India (Lakh, Crore, etc.)

---

**Created**: March 2026  
**Supported Version**: React 18+  
**Last Updated**: March 2026
