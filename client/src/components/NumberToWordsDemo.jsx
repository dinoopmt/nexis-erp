/**
 * Example Component: NumberToWordsDemo
 * Demonstrates useNumberToWords hook implementation
 * Shows various use cases and formatting options
 */

import React, { useState } from 'react';
import { useNumberToWords } from '../hooks';

export const NumberToWordsDemo = () => {
  const [amount, setAmount] = useState(5234.50);
  const {
    convertToWords,
    convertToWordsWithCurrency,
    convertIntegerToWords,
    convertDecimalToWords,
    getCurrencyWords,
    getSupportedCurrencies,
    getCountryCode,
    getLanguage,
  } = useNumberToWords();

  const country = getCountryCode();
  const language = getLanguage();
  const currencies = getSupportedCurrencies();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Number to Words Converter</h1>

      {/* Input Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium mb-2">Amount to Convert:</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>

      {/* Country & Language Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="font-semibold mb-2">Configuration</h2>
        <p>
          <strong>Country:</strong> {country} | <strong>Language:</strong> {language.toUpperCase()}
        </p>
        <p>
          <strong>Supported Currencies:</strong> {currencies.join(', ')}
        </p>
      </div>

      {/* Full Conversion with Currency */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
        <h2 className="font-semibold mb-2">With Currency</h2>
        {currencies.map((currency) => (
          <div key={currency} className="mb-3">
            <p className="text-sm text-gray-600">{currency}</p>
            <p className="text-lg">
              {convertToWordsWithCurrency(amount, currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Without Currency */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <h2 className="font-semibold mb-2">Number Only</h2>
        <p className="text-lg">{convertToWords(amount)}</p>
      </div>

      {/* Integer and Decimal Separated */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg">
        <h2 className="font-semibold mb-2">Separated Conversion</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Integer Part</p>
            <p className="text-lg">{convertIntegerToWords(amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Decimal Part</p>
            <p className="text-lg">{convertDecimalToWords(amount)}</p>
          </div>
        </div>
      </div>

      {/* Currency Words */}
      <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
        <h2 className="font-semibold mb-2">Currency Words Detail</h2>
        {currencies.map((currency) => {
          const currencyWords = getCurrencyWords(currency);
          const isMultiple = amount > 1;
          return (
            <div key={currency} className="mb-3 text-sm">
              <p className="font-medium">{currency}:</p>
              <ul className="ml-4 text-gray-700">
                <li>Main: {isMultiple ? currencyWords.plural : currencyWords.singular}</li>
                <li>
                  Sub: {isMultiple ? currencyWords.subunitPlural : currencyWords.subunit}
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      {/* Test Cases */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-semibold mb-3">Quick Test Cases</h2>
        <div className="space-y-2 text-sm">
          {[0, 1, 10, 100, 1000, 10000, 100000, 1000000].map((testAmount) => (
            <div key={testAmount} className="flex justify-between py-1 border-b">
              <span className="font-medium">{testAmount.toLocaleString()}</span>
              <span className="text-gray-700">{convertToWords(testAmount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Check Format (Uppercase for checks) */}
      <div className="mb-6 p-4 bg-red-50 rounded-lg border-2 border-red-300">
        <h2 className="font-semibold mb-2">Check Format</h2>
        <p className="text-lg font-bold uppercase">
          {convertToWordsWithCurrency(amount, currencies[0])
            .charAt(0)
            .toUpperCase() +
            convertToWordsWithCurrency(amount, currencies[0]).slice(1)}
        </p>
      </div>
    </div>
  );
};

export default NumberToWordsDemo;

/**
 * Usage Instructions:
 *
 * 1. Import in your component:
 *    import { useNumberToWords } from '../hooks';
 *
 * 2. Use in functional component:
 *    const {
 *      convertToWords,
 *      convertToWordsWithCurrency,
 *      // ... other methods
 *    } = useNumberToWords();
 *
 * 3. Common Usage Patterns:
 *
 *    // Invoice amount display
 *    <p>{convertToWordsWithCurrency(invoiceTotal, 'AED')}</p>
 *
 *    // For check/bank transfer
 *    <p className="uppercase">{convertToWordsWithCurrency(checkAmount, currency)}</p>
 *
 *    // Simple number conversion (no currency)
 *    <p>{convertToWords(quantity)}</p>
 *
 *    // With country-specific currency
 *    const { getCountryCode } = useNumberToWords();
 *    const country = getCountryCode();
 *    const currency = country === 'IN' ? 'INR' : country === 'OM' ? 'OMR' : 'AED';
 *    <p>{convertToWordsWithCurrency(amount, currency)}</p>
 *
 * 4. Supported Countries:
 *    - UAE (AE): AED, USD
 *    - Oman (OM): OMR, USD
 *    - India (IN): INR, USD
 *
 * 5. Supported Languages:
 *    - English: All countries
 *    - Arabic: UAE, Oman only
 */


