import React, { useState, useEffect } from "react";
import {
  Package,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  Warehouse,
  ChevronDown,
  Search,
  Loader,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";

const StockTracking = () => {
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();

  // State management
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [currentStock, setCurrentStock] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("current"); // "current" or "history"

  // Fetch all products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/products/listProduct?country=${config?.country || "UAE"}`
        );
        setProducts(response.data);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError("Failed to load products");
      }
    };

    if (config?.country) {
      fetchProducts();
    }
  }, [config?.country]);

  // Fetch current stock and history when product selected
  useEffect(() => {
    if (!selectedProductId) return;

    const fetchStockData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch current stock
        const stockResponse = await axios.get(
          `${API_URL}/stock/current/${selectedProductId}`
        );
        setCurrentStock(stockResponse.data);

        // Fetch stock history
        const historyResponse = await axios.get(
          `${API_URL}/stock/history/${selectedProductId}`
        );
        setStockHistory(historyResponse.data);
      } catch (err) {
        console.error("Failed to fetch stock data:", err);
        setError("Failed to load stock data");
        setCurrentStock(null);
        setStockHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [selectedProductId]);

  // Filter products based on search term
  const filteredProducts = products.filter(
    (product) =>
      product.itemname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.itemcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selected product details
  const selectedProduct = products.find((p) => p._id === selectedProductId);

  // Get stock status color and text
  const getStockStatus = () => {
    if (!currentStock) return { status: "UNKNOWN", color: "gray", icon: "?" };
    
    const { status } = currentStock;
    const statusConfig = {
      CRITICAL: {
        color: "bg-red-100 text-red-800 border-red-300",
        icon: "🔴",
        description: "Stock critically low",
      },
      LOW: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: "🟡",
        description: "Stock below reorder level",
      },
      HEALTHY: {
        color: "bg-green-100 text-green-800 border-green-300",
        icon: "🟢",
        description: "Stock at healthy level",
      },
      OVERSTOCKED: {
        color: "bg-blue-100 text-blue-800 border-blue-300",
        icon: "🔵",
        description: "Excess stock above max level",
      },
    };

    return statusConfig[status] || statusConfig.UNKNOWN;
  };

  const stockStatusConfig = getStockStatus();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-blue-600" />
            Stock Tracking
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor product inventory levels, batch details, and movement history
          </p>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Product
          </label>

          {/* Search Input */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product name, code, or barcode..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setOpenDropdown(true);
                }}
                onFocus={() => setOpenDropdown(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ChevronDown
                className={`absolute right-3 top-3 w-5 h-5 text-gray-400 transition-transform ${
                  openDropdown ? "transform rotate-180" : ""
                }`}
              />
            </div>

            {/* Dropdown */}
            {openDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product._id}
                      onClick={() => {
                        setSelectedProductId(product._id);
                        setSearchTerm(product.itemname || "");
                        setOpenDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {product.itemname}
                          </p>
                          <p className="text-sm text-gray-500">
                            Code: {product.itemcode} | Barcode:{" "}
                            {product.barcode || "N/A"}
                          </p>
                        </div>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Stock: {product.stock}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-center">
                    No products found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Product Info & Tabs */}
        {selectedProduct && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Product Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedProduct.itemname}</h2>
                  <p className="text-blue-100 mt-1">
                    Code: {selectedProduct.itemcode} | Barcode:{" "}
                    {selectedProduct.barcode || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">Category</p>
                  <p className="text-xl font-semibold">{selectedProduct.category}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 flex">
              <button
                onClick={() => setActiveTab("current")}
                className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
                  activeTab === "current"
                    ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Package className="w-4 h-4 inline mr-2" />
                Current Stock
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-6 py-4 font-semibold text-center transition-colors ${
                  activeTab === "history"
                    ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <TrendingDown className="w-4 h-4 inline mr-2" />
                Movement History
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="ml-3 text-gray-600">Loading stock data...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Error</p>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Current Stock Tab */}
              {activeTab === "current" && currentStock && !loading && (
                <div className="space-y-6">
                  {/* Stock Status Alert */}
                  <div
                    className={`border-l-4 p-4 rounded-lg ${stockStatusConfig.color}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{stockStatusConfig.icon}</span>
                      <div>
                        <p className="font-bold text-lg">{currentStock.status}</p>
                        <p>{stockStatusConfig.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Current Stock */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Warehouse className="w-4 h-4" />
                        Current Stock
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {formatNumber(currentStock.currentStock)}
                      </p>
                    </div>

                    {/* Stock Value */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Stock Value
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {formatCurrency(currentStock.stockValue || 0)}
                      </p>
                    </div>

                    {/* Min Stock Level */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Min Stock Level</p>
                      <p className="text-3xl font-bold text-yellow-900 mt-2">
                        {formatNumber(selectedProduct.minStock || 0)}
                      </p>
                    </div>

                    {/* Max Stock Level */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Max Stock Level</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {formatNumber(selectedProduct.maxStock || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Batch Details */}
                  {currentStock.batches && currentStock.batches.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Active Batches (FIFO Order)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b-2 border-gray-300">
                            <tr>
                              <th className="px-4 py-3 text-left font-semibold">
                                Batch Number
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Purchase Date
                              </th>
                              <th className="px-4 py-3 text-right font-semibold">
                                Unit Cost
                              </th>
                              <th className="px-4 py-3 text-right font-semibold">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-right font-semibold">
                                Batch Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentStock.batches.map((batch, idx) => (
                              <tr
                                key={batch._id}
                                className={`border-b border-gray-200 hover:bg-gray-50 ${
                                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                              >
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {batch.batchNumber}
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                  {new Date(batch.purchaseDate).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                  {formatCurrency(batch.purchasePrice)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                                  {formatNumber(batch.quantityRemaining)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-900 font-bold">
                                  {formatCurrency(
                                    batch.purchasePrice * batch.quantityRemaining
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!currentStock.batches ||
                    (currentStock.batches.length === 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">
                          No active batches for this product
                        </p>
                      </div>
                    ))}
                </div>
              )}

              {/* Movement History Tab */}
              {activeTab === "history" && !loading && (
                <div>
                  {stockHistory && stockHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b-2 border-gray-300">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Movement Type
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Batch Number
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Reference
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Quantity
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Unit Cost
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Running Balance
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockHistory.map((movement, idx) => (
                            <tr
                              key={movement._id}
                              className={`border-b border-gray-200 hover:bg-gray-50 ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                            >
                              <td className="px-4 py-3 text-gray-900">
                                {new Date(movement.documentDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {movement.batchNumber || "-"}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {movement.reference || "-"}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">
                                <span
                                  className={
                                    movement.movementType === "OUTBOUND" ||
                                    (movement.movementType === "ADJUSTMENT" &&
                                      movement.quantity < 0)
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }
                                >
                                  {movement.movementType === "OUTBOUND" ||
                                  (movement.movementType === "ADJUSTMENT" &&
                                    movement.quantity < 0)
                                    ? "-"
                                    : "+"}
                                  {formatNumber(Math.abs(movement.quantity))}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-900">
                                {formatCurrency(movement.costingMethodUsed || 0)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900">
                                {formatNumber(movement.runningBalance || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                      <TrendingDown className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">No stock movements recorded</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedProduct && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">
              Select a product to view stock details
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockTracking;


