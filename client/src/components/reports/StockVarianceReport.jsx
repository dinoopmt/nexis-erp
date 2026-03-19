import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  TrendingDown,
  Download,
  XCircle,
  AlertCircle,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Loader,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";

const StockVarianceReport = () => {
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();

  // State
  const [varianceData, setVarianceData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showInvestigation, setShowInvestigation] = useState(false);
  const [investigationData, setInvestigationData] = useState(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Fetch variance report on mount and when filters change
  useEffect(() => {
    fetchVarianceReport();
  }, [config?.country, severityFilter, searchTerm]);

  const fetchVarianceReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        country: config?.country || "UAE",
      });

      if (severityFilter !== "ALL") {
        params.append("severity", severityFilter);
      }

      if (searchTerm.trim()) {
        params.append("searchTerm", searchTerm);
      }

      const response = await axios.get(
        `${API_URL}/api/v1/stock-variance/report?${params}`
      );

      setVarianceData(response.data.data);
      setSummary(response.data.summary);
    } catch (err) {
      console.error("Failed to fetch variance report:", err);
      setError("Failed to load variance report");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvestigation = async (productId) => {
    setInvestigationLoading(true);
    try {
      const params = new URLSearchParams({ productId });

      if (dateRange.startDate) {
        params.append("startDate", dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append("endDate", dateRange.endDate);
      }

      const response = await axios.get(
        `${API_URL}/api/v1/stock-variance/investigation?${params}`
      );
      setInvestigationData(response.data);
    } catch (err) {
      console.error("Failed to fetch investigation:", err);
      setError("Failed to load investigation details");
    } finally {
      setInvestigationLoading(false);
    }
  };

  const handleInvestigate = (product) => {
    setSelectedProduct(product);
    setShowInvestigation(true);
    fetchInvestigation(product.productId);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (varianceData.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = [
      "Item Code",
      "Item Name",
      "Category",
      "Theoretical Stock",
      "Actual Stock",
      "Variance",
      "Variance %",
      "Variance Value",
      "Severity",
      "Cost per Unit",
      "Min Stock",
      "Max Stock",
    ];

    const rows = varianceData.map((item) => [
      item.itemcode,
      item.itemname,
      item.category,
      item.theoreticalStock,
      item.actualStock,
      item.variance,
      item.variancePercent,
      item.varianceValue.toFixed(2),
      item.severity,
      item.cost.toFixed(2),
      item.minStock,
      item.maxStock,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `stock_variance_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.click();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-300";
      case "WARNING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "MINOR":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return "🔴";
      case "WARNING":
        return "🟡";
      case "MINOR":
        return "🟠";
      default:
        return "🟢";
    }
  };

  if (showInvestigation && selectedProduct && investigationData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Eye className="w-8 h-8 text-blue-600" />
                Variance Investigation
              </h1>
              <p className="text-gray-600 mt-1">
                {investigationData.product.itemname} ({investigationData.product.itemcode})
              </p>
            </div>
            <button
              onClick={() => {
                setShowInvestigation(false);
                setSelectedProduct(null);
                setInvestigationData(null);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition"
            >
              Back to Report
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Theoretical Stock */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-600">Theoretical Stock</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {formatNumber(investigationData.theoreticalStock)}
              </p>
            </div>

            {/* Actual Stock */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-600">Actual Stock</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {formatNumber(investigationData.actualStock)}
              </p>
            </div>

            {/* Variance */}
            <div
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                investigationData.variance < 0 ? "border-red-500" : "border-orange-500"
              }`}
            >
              <p className="text-xs text-gray-600">Variance (Qty)</p>
              <p
                className={`text-3xl font-bold mt-2 ${
                  investigationData.variance < 0 ? "text-red-900" : "text-orange-900"
                }`}
              >
                {formatNumber(investigationData.variance)}
              </p>
            </div>

            {/* Period */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
              <p className="text-xs text-gray-600">Period</p>
              <p className="text-sm font-semibold text-gray-900 mt-2">
                {investigationData.periodStart}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                to {investigationData.periodEnd}
              </p>
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Stock Movements Timeline
              </h2>
              <p className="text-gray-600 text-sm">
                {investigationData.movements.length} movements recorded
              </p>
            </div>

            {investigationData.movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Running Balance
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Reference</th>
                      <th className="px-4 py-3 text-left font-semibold">Batch #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {investigationData.movements.map((movement) => (
                      <tr
                        key={movement._id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          {new Date(movement.documentDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              movement.movementType === "INBOUND"
                                ? "bg-green-100 text-green-800"
                                : movement.movementType === "OUTBOUND"
                                  ? "bg-red-100 text-red-800"
                                  : movement.movementType === "ADJUSTMENT"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {movement.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {movement.quantity > 0 ? "+" : ""}
                          {formatNumber(movement.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatNumber(movement.runningBalance)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {movement.reference || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {movement.batchNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No movements recorded for this product
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingDown className="w-8 h-8 text-blue-600" />
              Stock Variance Report
            </h1>
            <p className="text-gray-600 mt-1">
              Identify discrepancies between theoretical and actual inventory
            </p>
          </div>
          <button
            onClick={exportToCSV}
            disabled={varianceData.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Total Products */}
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-600">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary.totalProducts}
              </p>
            </div>

            {/* With Variance */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <p className="text-xs text-gray-600">With Variance</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {summary.productsWithVariance}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {((summary.productsWithVariance / summary.totalProducts) * 100).toFixed(
                  1
                )}
                %
              </p>
            </div>

            {/* Total Variance Value */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-600">Total Variance Value</p>
              <p className="text-2xl font-bold text-red-900 mt-2">
                {formatCurrency(summary.totalVarianceValue)}
              </p>
            </div>

            {/* Critical Items */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-600">
              <p className="text-xs text-gray-600">Critical</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {summary.bySeverity.critical}
              </p>
            </div>

            {/* Warning Items */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <p className="text-xs text-gray-600">Warnings</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {summary.bySeverity.warning}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Product
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Product name, code, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="WARNING">Warning</option>
                <option value="MINOR">Minor</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchVarianceReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Filter className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600 mt-3">Loading variance report...</p>
          </div>
        )}

        {/* Variance Table */}
        {!loading && varianceData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">
                Discrepancies Detected
              </h2>
              <p className="text-gray-600 text-sm">
                {varianceData.length} product(s) with stock variance
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Item Code</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-center font-semibold">Theoretical</th>
                    <th className="px-4 py-3 text-center font-semibold">Actual</th>
                    <th className="px-4 py-3 text-center font-semibold">Variance</th>
                    <th className="px-4 py-3 text-right font-semibold">Var %</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Variance Value
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Severity</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceData.map((item, idx) => (
                    <tr
                      key={item.productId}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-center text-gray-600">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {item.itemcode}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900">{item.itemname}</p>
                          <p className="text-xs text-gray-600">{item.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                          {formatNumber(item.theoreticalStock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold">
                          {formatNumber(item.actualStock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        <span
                          className={
                            item.variance < 0 ? "text-red-600" : "text-orange-600"
                          }
                        >
                          {item.variance > 0 ? "+" : ""}
                          {formatNumber(item.variance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span
                          className={
                            Math.abs(item.variancePercent) > 10
                              ? "text-red-600"
                              : "text-orange-600"
                          }
                        >
                          {item.variancePercent > 0 ? "+" : ""}
                          {item.variancePercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        {formatCurrency(Math.abs(item.varianceValue))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(
                            item.severity
                          )}`}
                        >
                          {getSeverityIcon(item.severity)} {item.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleInvestigate(item)}
                          className="text-blue-600 hover:text-blue-900 font-semibold transition"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && varianceData.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No variances found</p>
            <p className="text-gray-500 mt-1">
              All products have matching theoretical and actual stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockVarianceReport;


