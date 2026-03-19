import React, { useState, useEffect } from 'react';
import { useCostingMaster } from '../../hooks/useCostingMaster';

/**
 * InventoryCostingExample Component
 * Demonstrates FIFO, LIFO, and WAC costing methods
 */
export default function InventoryCostingExample() {
  const {
    costingMethod,
    switchCostingMethod,
    calculateCost,
    compareCostingMethods,
    getABCAnalysis,
    getInventoryValuation,
    updateCostingConfig,
    costingConfig,
    loading,
    error,
  } = useCostingMaster();

  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantityToIssue, setQuantityToIssue] = useState('');
  const [costingResult, setCostingResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [abcAnalysis, setABCAnalysis] = useState(null);
  const [valuationData, setValuationData] = useState(null);
  const [activeTab, setActiveTab] = useState('calculate');

  // Handle cost calculation
  const handleCalculateCost = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantityToIssue) {
      alert('Please select product and enter quantity');
      return;
    }

    try {
      const result = await calculateCost(
        selectedProduct,
        parseInt(quantityToIssue),
        costingMethod
      );
      setCostingResult(result);
    } catch (err) {
      console.error('Error calculating cost:', err);
    }
  };

  // Handle method comparison
  const handleCompareMethods = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantityToIssue) {
      alert('Please select product and enter quantity');
      return;
    }

    try {
      const result = await compareCostingMethods(
        selectedProduct,
        parseInt(quantityToIssue)
      );
      setComparisonResult(result);
    } catch (err) {
      console.error('Error comparing methods:', err);
    }
  };

  // Handle ABC analysis
  const handleABCAnalysis = async (e) => {
    e.preventDefault();
    try {
      const result = await getABCAnalysis(selectedProduct || null);
      setABCAnalysis(result);
    } catch (err) {
      console.error('Error getting ABC analysis:', err);
    }
  };

  // Handle inventory valuation
  const handleInventoryValuation = async (e) => {
    e.preventDefault();
    try {
      const result = await getInventoryValuation(selectedProduct || null);
      setValuationData(result);
    } catch (err) {
      console.error('Error getting valuation:', err);
    }
  };

  const getCostingDescription = (method) => {
    const descriptions = {
      FIFO: 'First In First Out - Oldest items purchased are sold first. Best for perishable goods.',
      LIFO: 'Last In First Out - Newest items purchased are sold first. Good for non-perishable goods.',
      WAC: 'Weighted Average Cost - Uses average cost of all units. Common in production environments.',
    };
    return descriptions[method] || '';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Inventory Costing Methods
          </h1>
          <p className="text-gray-600">
            Compare FIFO, LIFO, and WAC methods for inventory valuation
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Current Method Selection Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Current Costing Method
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {['FIFO', 'LIFO', 'WAC'].map((method) => (
              <button
                key={method}
                onClick={() => switchCostingMethod(method)}
                className={`p-4 rounded-lg font-semibold transition-all ${
                  costingMethod === method
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-600 italic">
            {getCostingDescription(costingMethod)}
          </p>

          {costingConfig && (
            <div className="mt-6 pt-6 border-t text-sm">
              <p className="text-gray-700">
                <span className="font-semibold">Configuration:</span> {costingConfig.description || 'Default'}
              </p>
              <p className="text-gray-700 mt-2">
                <span className="font-semibold">WAC Calculation:</span> {costingConfig.wacCalculationFrequency}
              </p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-gray-300">
          {['calculate', 'compare', 'abc', 'valuation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 font-semibold transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2')}
            </button>
          ))}
        </div>

        {/* TAB 1: Calculate Single Method */}
        {activeTab === 'calculate' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Calculate Cost ({costingMethod})
              </h3>
              <form onSubmit={handleCalculateCost} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product ID
                  </label>
                  <input
                    type="text"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    placeholder="Enter product ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantity to Issue
                  </label>
                  <input
                    type="number"
                    value={quantityToIssue}
                    onChange={(e) => setQuantityToIssue(e.target.value)}
                    placeholder="Enter quantity"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Calculating...' : 'Calculate Cost'}
                </button>
              </form>
            </div>

            {/* Result Display */}
            {costingResult && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  {costingResult.method} Result
                </h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Quantity Issued</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {costingResult.quantityIssued}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Total Cost</p>
                      <p className="text-2xl font-bold text-green-600">
                        {costingResult.totalCostFormatted}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Average Cost per Unit
                  </p>
                  <p className="text-xl font-bold text-gray-900 mb-4">
                    {costingResult.averageCostFormatted}
                  </p>
                </div>

                {costingResult.shortfall > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm">
                    ⚠️ Shortfall: {costingResult.shortfall} units
                  </div>
                )}

                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">Batch Breakdown</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {costingResult.batches.map((batch, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                        <p className="font-semibold text-gray-800">
                          {batch.batchNumber}
                        </p>
                        <p className="text-gray-600 mt-1">
                          Qty: {batch.quantity} × ${batch.unitCostFormatted} =
                          ${batch.totalCostFormatted}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Compare All Methods */}
        {activeTab === 'compare' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Compare All Methods
              </h3>
              <form onSubmit={handleCompareMethods} className="space-y-4 max-w-md">
                <input
                  type="text"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  placeholder="Enter product ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  value={quantityToIssue}
                  onChange={(e) => setQuantityToIssue(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
                >
                  {loading ? 'Comparing...' : 'Compare Methods'}
                </button>
              </form>
            </div>

            {comparisonResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['fifo', 'lifo', 'wac'].map((method) => (
                  <div key={method} className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-4 uppercase">
                      {method}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Total Cost</p>
                        <p className="text-2xl font-bold text-green-600">
                          {comparisonResult[method].totalCostFormatted}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Average Cost</p>
                        <p className="text-xl font-bold text-gray-900">
                          {comparisonResult[method].averageCostFormatted}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Quantity</p>
                        <p className="text-lg font-bold text-gray-900">
                          {comparisonResult[method].quantityIssued}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comparisonResult && comparisonResult.comparison && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mt-8">
                <h4 className="text-lg font-bold text-purple-900 mb-4">Cost Variance</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-purple-700">Highest Cost</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${comparisonResult.comparison.highestCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">Lowest Cost</p>
                    <p className="text-2xl font-bold text-purple-900">
                      ${comparisonResult.comparison.lowestCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-700">Difference</p>
                    <p className="text-2xl font-bold text-red-600">
                      ${comparisonResult.comparison.difference.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ABC Analysis */}
        {activeTab === 'abc' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">ABC Inventory Analysis</h3>
            <form onSubmit={handleABCAnalysis} className="mb-6 max-w-md">
              <input
                type="text"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                placeholder="Enter product ID (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </form>

            {abcAnalysis && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Batch</th>
                      <th className="px-4 py-2 text-right font-semibold">Quantity</th>
                      <th className="px-4 py-2 text-right font-semibold">Unit Cost</th>
                      <th className="px-4 py-2 text-right font-semibold">Total Value</th>
                      <th className="px-4 py-2 text-right font-semibold">% Total</th>
                      <th className="px-4 py-2 text-center font-semibold">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abcAnalysis.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold">{item.batchNumber}</td>
                        <td className="px-4 py-2 text-right">{item.quantityRemaining}</td>
                        <td className="px-4 py-2 text-right">${item.unitCost.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          ${item.totalValue.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">{item.percentageOfTotal.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-white text-xs font-bold ${
                              item.classification === 'A'
                                ? 'bg-red-600'
                                : item.classification === 'B'
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                            }`}
                          >
                            {item.classification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Inventory Valuation */}
        {activeTab === 'valuation' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Inventory Valuation</h3>
            <form onSubmit={handleInventoryValuation} className="mb-6 max-w-md">
              <input
                type="text"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                placeholder="Enter product ID (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                {loading ? 'Calculating...' : 'Calculate'}
              </button>
            </form>

            {valuationData && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                  <h4 className="font-semibold text-green-900 mb-3">Total Inventory Value</h4>
                  <p className="text-4xl font-bold text-green-600">
                    ${valuationData.totalInventoryValue.toFixed(2)}
                  </p>
                  <p className="text-sm text-green-700 mt-2">
                    Total Quantity: {valuationData.totalQuantity} units
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Product</th>
                        <th className="px-4 py-2 text-right font-semibold">SKU</th>
                        <th className="px-4 py-2 text-right font-semibold">Quantity</th>
                        <th className="px-4 py-2 text-right font-semibold">Avg Cost</th>
                        <th className="px-4 py-2 text-right font-semibold">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuationData.data.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-semibold">{item.productName}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{item.productSKU}</td>
                          <td className="px-4 py-2 text-right">{item.totalQuantity}</td>
                          <td className="px-4 py-2 text-right">${item.averageCost}</td>
                          <td className="px-4 py-2 text-right font-semibold text-green-600">
                            ${item.totalValue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


