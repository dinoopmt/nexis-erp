import React, { useState } from 'react'
import { RefreshCw, Download, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react'
import { showToast } from '../../shared/AnimatedCenteredToast.jsx'

const StockReconciliation = () => {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [reconciliationType, setReconciliationType] = useState('check')

  // Run reconciliation
  const runReconciliation = async (type) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/stock/reconciliation?type=${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Reconciliation failed')
      }

      const data = await response.json()
      setReport(data)
      setShowResults(true)

      if (type === 'check') {
        showToast('success', `Reconciliation complete: ${data.summary.discrepancies} discrepancies found`)
      } else if (type === 'heal') {
        showToast('success', `Reconciliation complete: ${data.healed} products healed`)
      }
    } catch (error) {
      showToast('error', error.message || 'Failed to run reconciliation')
      console.error('Reconciliation error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Export report
  const exportReport = () => {
    if (!report) return

    const csv = `Stock Reconciliation Report
Generated: ${new Date().toLocaleString()}

SUMMARY
Total Products: ${report.summary.totalProducts}
Reconciled: ${report.summary.reconciled}
Discrepancies: ${report.summary.discrepancies}
Discrepancy Rate: ${report.summary.discrepancyRate}
Healed: ${report.summary.healed}
Errors: ${report.summary.errors}

FINANCIAL IMPACT
Total Current Stock: ${report.financialImpact.totalCurrentStock} units
Total Calculated: ${report.financialImpact.totalCalculatedBalance} units
Total Variance: ${report.financialImpact.totalVariance} units
Variance Percent: ${report.financialImpact.variance_percent}

DISCREPANCIES
${report.discrepancies?.map(d => 
  `Product: ${d.product}, Current: ${d.current}, Calculated: ${d.calculated}, Variance: ${d.variance}`
).join('\n')}
`

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reconciliation-${new Date().getTime()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    showToast('success', 'Report exported successfully')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-600" />
          Stock Reconciliation
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Verify and fix stock quantity discrepancies by recalculating balances from scratch
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Check Option */}
        <button
          onClick={() => runReconciliation('check')}
          disabled={loading}
          className={`p-4 rounded-lg border-2 text-left transition ${
            reconciliationType === 'check'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Check Only</h3>
              <p className="text-xs text-gray-600 mt-1">Find discrepancies without making changes</p>
            </div>
            {loading ? (
              <RefreshCw size={18} className="text-blue-600 animate-spin" />
            ) : (
              <CheckCircle size={18} className="text-blue-600" />
            )}
          </div>
        </button>

        {/* Heal Option */}
        <button
          onClick={() => {
            if (window.confirm('⚠️ This will fix all discrepancies. Continue?')) {
              runReconciliation('heal')
            }
          }}
          disabled={loading}
          className={`p-4 rounded-lg border-2 text-left transition ${
            reconciliationType === 'heal'
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Check & Heal</h3>
              <p className="text-xs text-gray-600 mt-1">Fix discrepancies automatically</p>
            </div>
            {loading ? (
              <RefreshCw size={18} className="text-amber-600 animate-spin" />
            ) : (
              <AlertCircle size={18} className="text-amber-600" />
            )}
          </div>
        </button>

        {/* Quick Check Option */}
        <button
          onClick={() => runReconciliation('quick')}
          disabled={loading}
          className={`p-4 rounded-lg border-2 text-left transition ${
            reconciliationType === 'quick'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Quick Check</h3>
              <p className="text-xs text-gray-600 mt-1">Show top 10 discrepancies</p>
            </div>
            {loading ? (
              <RefreshCw size={18} className="text-green-600 animate-spin" />
            ) : (
              <BarChart3 size={18} className="text-green-600" />
            )}
          </div>
        </button>
      </div>

      {/* Results */}
      {showResults && report && (
        <div className="space-y-3">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 font-medium">Total Products</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{report.summary.totalProducts}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 font-medium">OK</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {report.summary.totalProducts - report.summary.discrepancies}
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200">
              <p className="text-xs text-gray-600 font-medium">Discrepancies</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{report.summary.discrepancies}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 font-medium">Healed</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{report.summary.healed}</p>
            </div>
          </div>

          {/* Financial Impact */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Financial Impact</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <p className="text-gray-600">Current Stock</p>
                <p className="font-bold text-gray-900">{report.financialImpact.totalCurrentStock}</p>
                <p className="text-xs text-gray-500">units</p>
              </div>
              <div>
                <p className="text-gray-600">Calculated</p>
                <p className="font-bold text-gray-900">{report.financialImpact.totalCalculatedBalance}</p>
                <p className="text-xs text-gray-500">units</p>
              </div>
              <div>
                <p className="text-gray-600">Variance</p>
                <p className="font-bold text-red-600">{report.financialImpact.totalVariance}</p>
                <p className="text-xs text-gray-500">units</p>
              </div>
              <div>
                <p className="text-gray-600">Variance %</p>
                <p className="font-bold text-red-600">{report.financialImpact.variance_percent}</p>
                <p className="text-xs text-gray-500">percent</p>
              </div>
            </div>
          </div>

          {/* Discrepancies List */}
          {report.discrepancies && report.discrepancies.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Discrepancies ({report.discrepancies.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Current</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Calculated</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-700">Variance</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.discrepancies.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900 font-medium">{item.product}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.current}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{item.calculated}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${
                          item.variance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.variance > 0 ? '+' : ''}{item.variance}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.status === 'HEALED' ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                              ✓ Healed
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-semibold">
                              ⚠️ Issue
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={exportReport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Export Report as CSV
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
        <h4 className="font-semibold text-blue-900 text-sm mb-1">How it works:</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>✓ Recalculates stock balances from scratch for all products</li>
          <li>✓ Compares with current system quantities</li>
          <li>✓ Identifies any discrepancies automatically</li>
          <li>✓ Can optionally heal discrepancies</li>
          <li>✓ Records all changes in Activity Log for audit trail</li>
        </ul>
      </div>
    </div>
  )
}

export default StockReconciliation
