import React, { useState } from 'react';
import useDecimalFormat from '../../hooks/useDecimalFormat';

/**
 * DecimalFormatUsageExample Component
 * Demonstrates how to use useDecimalFormat hook across different scenarios:
 * - Sales/Invoices (line items, totals)
 * - Reports (summaries, percentages)
 * - Calculations (sum, average, rounding)
 * - User Input (validation, parsing)
 */
const DecimalFormatUsageExample = () => {
  const { formatNumber, formatCurrency, formatPercentage, sum, average, round, parseInput, isValidDecimal } = useDecimalFormat();

  const [userInput, setUserInput] = useState('');
  const [inputValidation, setInputValidation] = useState('');

  // Example sales invoice data
  const invoiceItems = [
    { id: 1, description: 'Product A', quantity: 5, unitPrice: 150.555, tax: 7.5 },
    { id: 2, description: 'Product B', quantity: 2, unitPrice: 299.999, tax: 5.0 },
    { id: 3, description: 'Service C', quantity: 1, unitPrice: 500.123, tax: 0 },
  ];

  // Example report data
  const reportMetrics = {
    totalRevenue: 12345.6789,
    profitMargin: 18.5432,
    costPercentage: 65.9876,
    averageOrderValue: 3421.789,
  };

  // Handle user input with validation
  const handleInputChange = (e) => {
    const value = e.target.value;
    setUserInput(value);

    if (value === '') {
      setInputValidation('');
      return;
    }

    if (isValidDecimal(value)) {
      const parsed = parseInput(value);
      setInputValidation(`✓ Valid (Parsed: ${formatNumber(parsed)})`);
    } else {
      setInputValidation('✗ Invalid decimal format');
    }
  };

  // Calculate line totals
  const calculateLineTotal = (item) => {
    const subtotal = item.quantity * item.unitPrice;
    const taxAmount = subtotal * (item.tax / 100);
    return subtotal + taxAmount;
  };

  // Calculate invoice summary
  const subtotal = sum(invoiceItems.map(item => item.quantity * item.unitPrice));
  const taxTotal = sum(
    invoiceItems.map(item => {
      const line = item.quantity * item.unitPrice;
      return line * (item.tax / 100);
    })
  );
  const grandTotal = subtotal + taxTotal;

  // Calculate metrics
  const profitAmount = reportMetrics.totalRevenue * (reportMetrics.profitMargin / 100);
  const costAmount = reportMetrics.totalRevenue * (reportMetrics.costPercentage / 100);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Decimal Format Usage Examples</h1>

      {/* ===== SECTION 1: SALES INVOICE ===== */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Sales Invoice Example</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit Price</th>
                <th className="px-4 py-2 text-right">Line Total</th>
                <th className="px-4 py-2 text-right">Tax %</th>
                <th className="px-4 py-2 text-right">With Tax</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item) => {
                const lineSubtotal = item.quantity * item.unitPrice;
                const lineWithTax = calculateLineTotal(item);

                return (
                  <tr key={item.id} className="border-b hover:bg-blue-50">
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(lineSubtotal)}
                    </td>
                    <td className="px-4 py-2 text-right">{formatPercentage(item.tax)}</td>
                    <td className="px-4 py-2 text-right font-bold text-green-600">
                      {formatCurrency(lineWithTax)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Invoice Totals */}
        <div className="mt-6 border-t pt-4">
          <div className="flex justify-end mb-2">
            <div className="w-80">
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-semibold">Total Tax:</span>
                <span className="text-orange-600">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="flex justify-between py-3 bg-green-50 px-3 rounded text-lg font-bold">
                <span>Grand Total:</span>
                <span className="text-green-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 2: FINANCIAL REPORTS ===== */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Financial Report Example</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Revenue Metrics */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Revenue Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Revenue:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(reportMetrics.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Profit Margin:</span>
                <span className="font-bold text-green-600">
                  {formatPercentage(reportMetrics.profitMargin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Profit Amount:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(profitAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Cost Metrics */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">Cost Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Cost Percentage:</span>
                <span className="font-bold text-red-600">
                  {formatPercentage(reportMetrics.costPercentage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cost Amount:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(costAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg Order Value:</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(reportMetrics.averageOrderValue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: CALCULATIONS WITH PRECISION ===== */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Calculation Examples (With Proper Rounding)</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Array Calculations */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Sum & Average</h3>
            <div className="text-sm space-y-3">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600 mb-1">Sample amounts:</p>
                <p className="font-mono text-xs mb-2">[100.555, 200.777, 300.123]</p>
                <p className="text-gray-600 mb-1">Sum (with rounding):</p>
                <p className="font-bold text-lg">
                  {formatCurrency(sum([100.555, 200.777, 300.123]))}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-600 mb-1">Average (with rounding):</p>
                <p className="font-bold text-lg">
                  {formatCurrency(average([100.555, 200.777, 300.123]))}
                </p>
              </div>
            </div>
          </div>

          {/* Rounding Examples */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Rounding Examples</h3>
            <div className="text-sm space-y-2 bg-gray-50 p-3 rounded">
              <div className="flex justify-between">
                <span>1234.5555 →</span>
                <span className="font-bold">{formatCurrency(1234.5555)}</span>
              </div>
              <div className="flex justify-between">
                <span>999.9999 →</span>
                <span className="font-bold">{formatCurrency(999.9999)}</span>
              </div>
              <div className="flex justify-between">
                <span>42.1234 →</span>
                <span className="font-bold">{formatCurrency(42.1234)}</span>
              </div>
              <div className="flex justify-between">
                <span>0.123 →</span>
                <span className="font-bold">{formatCurrency(0.123)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION 4: INPUT VALIDATION ===== */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">User Input Validation</h2>

        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Amount (validated with company decimal places):
          </label>
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            placeholder="e.g., 1234.56"
            className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none text-lg ${
              inputValidation.startsWith('✓')
                ? 'border-green-500'
                : inputValidation.startsWith('✗')
                  ? 'border-red-500'
                  : 'border-gray-300'
            }`}
          />
          {inputValidation && (
            <p
              className={`mt-2 text-sm font-semibold ${
                inputValidation.startsWith('✓') ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {inputValidation}
            </p>
          )}

          {/* Validation Rules Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-gray-700">
            <p className="font-semibold mb-2">Validation Rules:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Only digits and decimal point allowed</li>
              <li>Negative numbers supported</li>
              <li>Decimal places limited to company setting</li>
              <li>Invalid format shows error</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== INTEGRATION GUIDE ===== */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Integration Guide</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Step 1:</strong> Import the hook in any component:
          </p>
          <code className="block bg-gray-800 text-white p-2 rounded mb-3 text-xs">
            import useDecimalFormat from '../../hooks/useDecimalFormat';
          </code>

          <p>
            <strong>Step 2:</strong> Use in your component:
          </p>
          <code className="block bg-gray-800 text-white p-2 rounded mb-3 text-xs">
            const {'{'} formatCurrency, formatNumber {'}'} = useDecimalFormat();
          </code>

          <p>
            <strong>Step 3:</strong> Format any amount (automatically uses company's decimal places):
          </p>
          <code className="block bg-gray-800 text-white p-2 rounded mb-3 text-xs">
            &lt;span&gt;{'{formatCurrency(totalAmount)}'}&lt;/span&gt;
          </code>

          <p className="pt-3 border-t text-gray-600">
            ✓ All company-specific formatting is handled automatically
            <br />✓ Changes to company decimal settings apply instantly across app
            <br />✓ Proper rounding prevents floating-point errors
          </p>
        </div>
      </div>
    </div>
  );
};

export default DecimalFormatUsageExample;


