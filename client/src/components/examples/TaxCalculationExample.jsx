import React, { useState, useCallback } from 'react'
import useTaxMaster from '../../../hooks/useTaxMaster'

/**
 * Example component showing how to use useTaxMaster hook
 * This demonstrates tax calculation based on company's selected country
 */
const TaxCalculationExample = () => {
  const {
    company,
    taxMaster,
    calculateTax,
    getTotalWithTax,
    getTaxComponentNames,
    requiresHSN,
    hasInterstateTax,
    formatCurrency,
    loading,
  } = useTaxMaster()

  const [baseAmount, setBaseAmount] = useState(1000)
  const [hsnCode, setHsnCode] = useState('')
  const [description, setDescription] = useState('Sample Product')

  // Calculate tax breakdown
  const taxBreakdown = calculateTax(baseAmount)

  // Get tax component names for display
  const componentNames = getTaxComponentNames()

  // Check if HSN is required for this country
  const hsnRequired = requiresHSN()

  // Check if interstate tax applies
  const interstateApplies = hasInterstateTax()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading tax configuration...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        Tax Calculation Example
      </h2>

      {/* Company & Tax Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <p className="text-xs text-gray-600 uppercase">Country</p>
          <p className="text-lg font-bold text-gray-900">{company?.countryName}</p>
          <p className="text-sm text-gray-500">Code: {company?.countryCode}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase">Currency</p>
          <p className="text-lg font-bold text-gray-900">{company?.currency}</p>
          <p className="text-sm text-gray-500">
            Tax System: {company?.taxSystem}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase">Tax Structure</p>
          <p className="text-lg font-bold text-gray-900">
            {company?.taxStructure === 'DUAL' ? 'CGST + SGST' : 'Single Rate VAT'}
          </p>
          <p className="text-sm text-gray-500">
            {taxMaster && taxMaster.length > 0
              ? `${taxMaster.length} tax rates available`
              : 'No tax rates configured'}
          </p>
        </div>
      </div>

      {/* Product Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Laptop"
          />
        </div>

        {hsnRequired && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HSN Code * (Required for {company?.countryCode})
            </label>
            <input
              type="text"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 8471.30"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              HSN codes are mandatory for Indian GST
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Base Amount ({company?.currency})
          </label>
          <input
            type="number"
            value={baseAmount}
            onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            step="0.01"
            min="0"
          />
        </div>

        {interstateApplies && (
          <div className="flex items-end">
            <div className="p-3 bg-yellow-50 rounded-lg w-full border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-800">
                ⚠️ Interstate Supply (IGST applies)
              </p>
              <p className="text-xs text-yellow-700">
                Apply IGST instead of SGST for supplies outside the state
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tax Breakdown */}
      {taxBreakdown ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detailed Breakdown */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Tax Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-green-200">
                <span className="text-gray-700">Base Amount</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(taxBreakdown.baseAmount)}
                </span>
              </div>

              {/* Show CGST/SGST or VAT based on country */}
              {company?.countryCode === 'IN' && taxBreakdown.cgst !== undefined ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">
                      CGST ({taxBreakdown.cgstRate}%)
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(taxBreakdown.cgst)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">
                      SGST ({taxBreakdown.sgstRate}%)
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(taxBreakdown.sgst)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">
                    {componentNames[0]} ({taxBreakdown.taxRate}%)
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(taxBreakdown.vat || taxBreakdown.totalTax)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t-2 border-green-300 text-lg">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(taxBreakdown.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Info */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <div>
                  <p className="font-semibold text-gray-900">{description}</p>
                  {hsnRequired && hsnCode && (
                    <p className="text-gray-600">HSN: {hsnCode}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-blue-200 pt-2 mt-2">
                <p className="text-gray-700">
                  <strong>Tax Components:</strong> {componentNames.join(', ')}
                </p>
              </div>

              <div className="border-t border-blue-200 pt-2 mt-2">
                <p className="text-gray-700">
                  <strong>Structure:</strong> {company?.taxStructure}
                </p>
              </div>

              {interstateApplies && (
                <div className="border-t border-blue-200 pt-2 mt-2 p-2 bg-yellow-50 rounded">
                  <p className="text-yellow-800">
                    <strong>Interstate:</strong> Applicable (IGST applies)
                  </p>
                </div>
              )}

              <div className="border-t border-blue-200 pt-2 mt-2 p-2 bg-green-50 rounded">
                <p className="text-green-800 font-semibold">
                  Total Payable: {formatCurrency(taxBreakdown.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-700">
            ⚠️ Tax calculation failed. Please check tax configuration.
          </p>
        </div>
      )}

      {/* Available Tax Rates */}
      {taxMaster && taxMaster.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">
            Available Tax Rates for {company?.countryName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {taxMaster.map((tax, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-gray-300">
                <p className="font-semibold text-gray-900">{tax.taxName}</p>
                <p className="text-xs text-gray-600">{tax.taxType}</p>
                <div className="mt-1 flex gap-2">
                  {tax.components.map((comp, cidx) => (
                    <span
                      key={cidx}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                    >
                      {comp.name}: {comp.rate}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TaxCalculationExample


