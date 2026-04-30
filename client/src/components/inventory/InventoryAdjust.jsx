import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Loader,
  Package,
  TrendingDown,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";

const InventoryAdjust = () => {
  const { round, formatCurrency, formatNumber, config } = useDecimalFormat();

  // State management
  const [products, setProducts] = useState([]);
  const [adjustmentList, setAdjustmentList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewAdjustmentModal, setShowNewAdjustmentModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  
  // Modal form state
  const [formData, setFormData] = useState({
    productId: "",
    productName: "",
    currentStock: 0,
    quantity: "",
    reason: "Damage",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const adjustmentReasons = [
    { value: "Damage", label: "Damage/Defect", color: "red" },
    { value: "Shrinkage", label: "Shrinkage/Evaporation", color: "orange" },
    { value: "Loss", label: "Loss/Missing", color: "red" },
    { value: "Correction", label: "Inventory Correction", color: "blue" },
    { value: "Return", label: "Return from Customer", color: "green" },
    { value: "Adjustment", label: "Manual Adjustment", color: "purple" },
    { value: "Other", label: "Other", color: "gray" },
  ];

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/products/listProduct?country=${config?.country || "UAE"}`
        );
        setProducts(response.data || []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    if (config?.country) {
      fetchProducts();
    }
  }, [config?.country]);

  // Load adjustment list on mount
  useEffect(() => {
    loadAdjustmentList();
  }, [reasonFilter]);

  const loadAdjustmentList = async () => {
    try {
      setIsLoading(true);
      // Mock data - replace with actual API call
      const mockAdjustments = [
        {
          _id: "adj1",
          productName: "Product A",
          productCode: "PROD001",
          quantity: 5,
          reason: "Damage",
          notes: "Damaged during transport",
          date: "2026-03-18",
          newStock: 95,
        },
        {
          _id: "adj2",
          productName: "Product B",
          productCode: "PROD002",
          quantity: -10,
          reason: "Return",
          notes: "Customer returned goods",
          date: "2026-03-17",
          newStock: 110,
        },
      ];
      setAdjustmentList(mockAdjustments);
    } catch (error) {
      console.error("Failed to load adjustments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new adjustment
  const handleNewAdjustment = () => {
    setFormData({
      productId: "",
      productName: "",
      currentStock: 0,
      quantity: "",
      reason: "Damage",
      notes: "",
    });
    setEditingId(null);
    setShowNewAdjustmentModal(true);
    setError(null);
  };

  // Handle product selection
  const handleProductSelect = async (productId) => {
    const product = products.find((p) => p._id === productId);
    if (!product) return;

    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_URL}/stock/current/${productId}`
      );
      setFormData(prev => ({
        ...prev,
        productId: productId,
        productName: product.itemname,
        currentStock: response.data?.currentStock || 0,
      }));
    } catch (err) {
      console.error("Failed to fetch stock:", err);
      setFormData(prev => ({
        ...prev,
        productId: productId,
        productName: product.itemname,
        currentStock: 0,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Submit adjustment
  const handleSaveAdjustment = async () => {
    if (!formData.productId) {
      setError("Please select a product");
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) === 0) {
      setError("Please enter adjustment quantity");
      return;
    }

    if (!formData.reason) {
      setError("Please select adjustment reason");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        productId: formData.productId,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        notes: formData.notes,
      };

      // Replace with actual API call
      // const response = await axios.post(`${API_URL}/stock/adjustment`, payload);

      // Mock success
      const newAdjustment = {
        _id: `adj${Date.now()}`,
        productName: formData.productName,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        notes: formData.notes,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        newStock: formData.currentStock - parseInt(formData.quantity),
      };

      setAdjustmentList([newAdjustment, ...adjustmentList]);
      setSuccess("Adjustment recorded successfully");
      setShowNewAdjustmentModal(false);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteAdjustment = async (adjustmentId) => {
    if (!window.confirm("Are you sure you want to delete this adjustment?")) return;
    
    try {
      setAdjustmentList(adjustmentList.filter(a => a._id !== adjustmentId));
    } catch (error) {
      setError("Failed to delete adjustment");
    }
  };

  // Filter adjustments
  const filteredAdjustments = adjustmentList.filter(adj => {
    const matchesSearch = 
      adj.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      adj.productCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesReason = reasonFilter === "all" || adj.reason === reasonFilter;
    
    return matchesSearch && matchesReason;
  });

  // Get reason color
  const getReasonColor = (reason) => {
    const reasonConfig = adjustmentReasons.find(r => r.value === reason);
    const colorMap = {
      red: "bg-red-100 text-red-800",
      orange: "bg-orange-100 text-orange-800",
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      purple: "bg-purple-100 text-purple-800",
      gray: "bg-gray-100 text-gray-800",
    };
    return colorMap[reasonConfig?.color] || colorMap.gray;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Adjustments</h1>
              <p className="text-sm text-gray-600 mt-1">Record stock adjustments for damage, loss, shrinkage, or corrections</p>
            </div>
            <button
              onClick={handleNewAdjustment}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <Plus size={20} />
              New Adjustment
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reasons</option>
            {adjustmentReasons.map(reason => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
          <button
            onClick={loadAdjustmentList}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
            <Package size={18} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading && adjustmentList.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Adjustment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Notes</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">New Stock</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No adjustments found
                    </td>
                  </tr>
                ) : (
                  filteredAdjustments.map(adj => (
                    <tr key={adj._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{adj.productName}</p>
                          {adj.productCode && (
                            <p className="text-xs text-gray-500">{adj.productCode}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-semibold ${adj.quantity > 0 ? "text-red-600" : "text-green-600"}`}>
                          {adj.quantity > 0 ? "-" : "+"}{formatNumber(Math.abs(adj.quantity))}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getReasonColor(adj.reason)}`}>
                          {adjustmentReasons.find(r => r.value === adj.reason)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {adj.notes || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatNumber(adj.newStock)}</p>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-600">{adj.date}</td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button
                          onClick={() => handleDeleteAdjustment(adj._id)}
                          className="text-red-600 hover:text-red-800 inline-flex"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New/Edit Adjustment Modal */}
      {showNewAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-4/5 max-h-screen overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Record New Adjustment</h2>
              <button
                onClick={() => setShowNewAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4 max-w-3xl">
                {/* Product Selection */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <label className="text-xs font-semibold text-blue-900 mb-2 block">📦 Select Product *</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a product...</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.itemname} ({product.itemcode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Current Stock Info */}
                {formData.productId && (
                  <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Product</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">{formData.productName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Current Stock</p>
                        <p className="text-sm font-bold text-green-700 mt-1">{formatNumber(formData.currentStock)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Stock After Adjustment</p>
                        <p className="text-sm font-bold text-blue-700 mt-1">
                          {formatNumber(formData.currentStock - (parseInt(formData.quantity) || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adjustment Details */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-900 mb-3">📝 Adjustment Details</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">Quantity *</label>
                      <input
                        type="number"
                        placeholder="Enter quantity (positive to reduce)"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          quantity: e.target.value
                        }))}
                        disabled={submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">Reason *</label>
                      <select
                        value={formData.reason}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          reason: e.target.value
                        }))}
                        disabled={submitting}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {adjustmentReasons.map(reason => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 font-semibold mb-1 block">Notes</label>
                    <textarea
                      placeholder="Add details about this adjustment..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      disabled={submitting}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Error message in modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-800">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex justify-end gap-2">
              <button
                onClick={() => setShowNewAdjustmentModal(false)}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={submitting || !formData.productId}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Record Adjustment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAdjust;


