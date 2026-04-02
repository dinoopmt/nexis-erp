/**
 * RtvForm Component - List View with Modal Form
 * Displays list of RTVs with option to create/edit via modal
 * Matches GRN UX pattern - persistent list + modal overlay
 */
import React, { useState, useEffect } from "react";
import { Plus, Download, Edit2, Trash2, X } from "lucide-react";
import { showToast } from "../shared/AnimatedCenteredToast.jsx";
import RtvListTable from "./rtv/RtvListTable";
import RtvFormHeader from "./rtv/RtvFormHeader";
import RtvItemsTable from "./rtv/RtvItemsTable";
import RtvSelectionModal from "./rtv/RtvSelectionModal";
import { useRtvFormData } from "../../hooks/useRtvFormData";
import { useRtvItemManagement } from "../../hooks/useRtvItemManagement";
import { useRtvApi } from "../../hooks/useRtvApi";
import { useRtvGridConfig } from "../../hooks/useRtvGridConfig.jsx";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";

const RtvForm = ({ onNavigate }) => {
  const { formatCurrency, formatNumber } = useDecimalFormat();
  
  // Main list state
  const [rtvList, setRtvList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal state
  const [showNewRtvModal, setShowNewRtvModal] = useState(false);
  const [showGrnSelectionModal, setShowGrnSelectionModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [grnList, setGrnList] = useState([]);
  
  // Form hooks
  const { formData, setFormData, fetchNextRtvNo } = useRtvFormData();
  const itemMgmt = useRtvItemManagement(formData, setFormData);
  const api = useRtvApi();
  const { columnDefs } = useRtvGridConfig((id) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== id)
    });
  });

  // Load RTV list on mount
  useEffect(() => {
    loadRtvList();
  }, [statusFilter]);

  // ✅ Calculate remaining quantity available for return (same as GRN reversal)
  const calculateRemainingQty = (item) => {
    if (!item) return 0;
    const originalQty = item.originalQuantity || item.quantity || 0;
    const alreadyReturnedQty = item.rtvReturnedQuantity || item.returnedQuantity || 0;
    return Math.max(0, originalQty - alreadyReturnedQty);
  };

  // Load RTV list
  const loadRtvList = async () => {
    try {
      setIsLoading(true);
      const response = await api.fetchRtvList({
        status: statusFilter === "all" ? undefined : statusFilter,
        searchTerm: searchTerm || undefined
      });
      setRtvList(Array.isArray(response) ? response : response?.data || []);
    } catch (error) {
      showToast('error', "Failed to load RTV list");
      setRtvList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize new RTV
  const handleNewRtv = async () => {
    try {
      const rtvNo = await fetchNextRtvNo();
      setFormData(prev => ({
        ...prev,
        rtvNumber: rtvNo,
        rtvDate: new Date().toISOString().split('T')[0],
        items: [],
        status: "Draft"
      }));
      setEditingId(null);
      setShowNewRtvModal(true);
    } catch (error) {
      showToast('error', "Failed to create new RTV");
    }
  };

  // Edit existing RTV
  const handleEditRtv = async (rtvIdOrObject) => {
    try {
      setIsLoading(true);
      const rtvId = typeof rtvIdOrObject === "string" ? rtvIdOrObject : rtvIdOrObject._id;
      const data = await api.fetchRtvById(rtvId);
      setFormData(data);
      setEditingId(rtvId);
      setShowNewRtvModal(true);
    } catch (error) {
      showToast('error', "Failed to load RTV");
    } finally {
      setIsLoading(false);
    }
  };

  // Open GRN selection modal
  const handleOpenGrnSelection = async () => {
    // Validate vendor is selected
    if (!formData.vendorId) {
      showToast('error', "Please select a supplier first");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Fetching GRN list for vendor:", formData.vendorId);
      const grns = await api.fetchGrnList(formData.vendorId);
      console.log("GRN list received:", grns);
      setGrnList(Array.isArray(grns) ? grns : []);
      setShowGrnSelectionModal(true);
    } catch (error) {
      console.error("Failed to fetch GRN list:", error);
      showToast('error', "Failed to fetch GRN list");
    } finally {
      setIsLoading(false);
    }
  };

  // Save RTV (new or update)
  const handleSaveRtv = async () => {
    if (!formData.vendorId) {
      showToast('error', "Please select a vendor");
      return;
    }
    if (formData.items.length === 0) {
      showToast('error', "Add at least one item to return");
      return;
    }

    // ✅ STOCK VALIDATION: Check available quantities before saving
    // Using same calculation as GRN reversal: Available = Received - Already Returned
    const stockErrors = [];
    const quantityWarnings = [];

    formData.items.forEach(item => {
      const remainingQty = calculateRemainingQty(item);
      const returnQty = item.quantity || 0;
      
      // Check if trying to return more than available
      if (returnQty > remainingQty) {
        stockErrors.push({
          itemCode: item.itemCode,
          itemName: item.itemName,
          requested: returnQty,
          available: remainingQty,
          alreadyReturned: item.rtvReturnedQuantity || item.returnedQuantity || 0,
          message: `Can only return ${remainingQty} (already returned: ${item.rtvReturnedQuantity || item.returnedQuantity || 0})`
        });
      }
      
      // Warning if returning the full remaining quantity
      if (returnQty === remainingQty && remainingQty > 0) {
        quantityWarnings.push(`${item.itemCode}: Returning full remaining amount (${remainingQty})`);
      }
    });

    if (stockErrors.length > 0) {
      showToast('error', "Return Quantity Exceeds Available Stock - Check details above");
      return;
    }

    try {
      setIsLoading(true);
      if (editingId) {
        await api.updateRtv(editingId, formData);
        showToast('success', "RTV updated successfully");
      } else {
        await api.createRtv(formData);
        showToast('success', "RTV created as draft");
      }
      setShowNewRtvModal(false);
      loadRtvList();
    } catch (error) {
      // If backend returns stock validation errors, show them
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        showToast('error', "Stock Validation Failed - " + errors.map(e => e.message).join(", "));
      } else {
        showToast('error', error.response?.data?.message || "Failed to save RTV");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setShowNewRtvModal(false);
    setEditingId(null);
  };

  // Delete RTV
  const handleDeleteRtv = async (rtvId) => {
    if (!window.confirm("Delete this RTV? This action cannot be undone.")) {
      return;
    }
    try {
      setIsLoading(true);
      await api.deleteRtv(rtvId);
      showToast('success', "RTV deleted successfully");
      loadRtvList();
    } catch (error) {
      showToast('error', "Failed to delete RTV");
    } finally {
      setIsLoading(false);
    }
  };

  // Workflow actions
  const handleWorkflowAction = async (rtvId, action) => {
    try {
      setIsLoading(true);
      
      switch(action) {
        case "submit":
          await api.submitRtv(rtvId);
          showToast('success', "RTV submitted successfully");
          break;
        case "approve":
          await api.approveRtv(rtvId);
          showToast('success', "RTV approved successfully");
          break;
        case "post":
          if (!window.confirm("This will reverse stock and create journal entries. Proceed?")) {
            return;
          }
          await api.postRtv(rtvId);
          showToast('success', "RTV posted - Stock and GL reversed successfully");
          break;
        case "cancel":
          if (!window.confirm("This will cancel the RTV and reverse any posted entries. Proceed?")) {
            return;
          }
          await api.cancelRtv(rtvId);
          showToast('success', "RTV cancelled successfully");
          break;
      }
      
      loadRtvList();
    } catch (error) {
      showToast('error', `Failed to ${action} RTV`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter RTVs for display
  const filteredRtvs = rtvList.filter(rtv => {
    const matchesSearch = !searchTerm || 
      rtv.rtvNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rtv.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rtv.grnNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Modal totals
  const totals = itemMgmt.calculateTotals(formData.items);
  const isEditable = formData.status === "Draft";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Return to Vendor</h1>
            <p className="text-sm text-gray-600">Manage goods returns to suppliers</p>
          </div>
          <button
            onClick={handleNewRtv}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            <Plus size={18} />
            New RTV
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search RTV #, Vendor, GRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Approved">Approved</option>
              <option value="Posted">Posted</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              onClick={loadRtvList}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && rtvList.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <RtvListTable
              rtvList={filteredRtvs}
              loading={false}
              onEdit={handleEditRtv}
              onDelete={handleDeleteRtv}
              onSubmit={(id) => handleWorkflowAction(id, "submit")}
              onApprove={(id) => handleWorkflowAction(id, "approve")}
              onPost={(id) => handleWorkflowAction(id, "post")}
            />
          </div>
        )}
      </div>

      {/* New/Edit RTV Modal */}
      {showNewRtvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-4/5 max-h-screen overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit RTV" : "Create New RTV"}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">{formData.rtvNumber}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {/* Form Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <RtvFormHeader
                  formData={formData}
                  setFormData={setFormData}
                  isEditable={isEditable}
                  onOpenSelectionModal={handleOpenGrnSelection}
                />
              </div>

              {/* Items Section */}
              <div className="px-4 py-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-semibold text-gray-900">Items to Return</h3>
                  <button
                    onClick={handleOpenGrnSelection}
                    disabled={!isEditable}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <Plus size={14} />
                    Add Items
                  </button>
                </div>

                {formData.items.length > 0 ? (
                  <RtvItemsTable
                    items={formData.items}
                    columnDefs={columnDefs}
                    isEditable={isEditable}
                    onUpdateQuantity={(id, qty) => {
                      const item = formData.items.find(i => i.id === id);
                      if (item) {
                        // ✅ Calculate max return quantity and enforce it
                        const remainingQty = calculateRemainingQty(item);
                        const limitedQty = Math.min(qty, remainingQty);
                        
                        if (qty > remainingQty) {
                          showToast('warning',
                            `⚠️ ${item.itemCode}: Cannot return ${formatNumber(qty)}. Max available: ${formatNumber(remainingQty)} (Already returned: ${formatNumber(item.rtvReturnedQuantity || item.returnedQuantity || 0)})`
                          );
                        }
                        
                        item.quantity = limitedQty;
                        setFormData({ ...formData });
                      }
                    }}
                    onUpdateReturnReason={(id, reason) => {
                      const item = formData.items.find(i => i.id === id);
                      if (item) {
                        item.returnReason = reason;
                        setFormData({ ...formData });
                      }
                    }}
                    onUpdateNotes={(id, notes) => {
                      const item = formData.items.find(i => i.id === id);
                      if (item) {
                        item.returnReasonNotes = notes;
                        setFormData({ ...formData });
                      }
                    }}
                    onRemoveItem={(id) => {
                      setFormData({
                        ...formData,
                        items: formData.items.filter(i => i.id !== id)
                      });
                    }}
                  />
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">No items selected. Click "Add Items" to get started.</p>
                  </div>
                )}
              </div>

              {/* Return Reason & Notes Section */}
              {formData.items.length > 0 && (
                <div className="bg-blue-50 border-t border-blue-200 px-4 py-2">
                  <p className="text-xs font-semibold text-blue-900 mb-2">📝 Return Reason & Notes</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.items.map((item) => (
                      <div key={item.id} className="text-xs bg-white p-2 rounded border border-blue-100">
                        <p className="font-medium text-gray-800">{item.itemCode} - {item.itemName}</p>
                        <div className="flex gap-4 mt-1">
                          <div>
                            <span className="text-gray-600">Reason: </span>
                            <span className="font-semibold text-blue-700">
                              {item.returnReason === "DAMAGE" ? "🔴 Damage" :
                               item.returnReason === "DEFECTIVE" ? "❌ Defective" :
                               item.returnReason === "EXCESS" ? "📦 Excess" :
                               item.returnReason === "WRONG_ITEM" ? "❓ Wrong Item" :
                               item.returnReason === "NOT_REQUIRED" ? "❌ Not Required" :
                               item.returnReason === "QUALITY_ISSUE" ? "⚠️ Quality" :
                               "📝 Other"}
                            </span>
                          </div>
                          {item.returnReasonNotes && (
                            <div>
                              <span className="text-gray-600">Notes: </span>
                              <span className="text-gray-700 italic">{item.returnReasonNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ Remaining Quantities Section */}
              {formData.items.length > 0 && (
                <div className="bg-green-50 border-t border-green-200 px-4 py-2">
                  <p className="text-xs font-semibold text-green-900 mb-2">📊 Return Quantity Status</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.items.map((item) => {
                      const remainingQty = calculateRemainingQty(item);
                      const returnQty = item.quantity || 0;
                      const alreadyReturned = item.rtvReturnedQuantity || item.returnedQuantity || 0;
                      const isAtMax = returnQty === remainingQty;
                      const exceedsMax = returnQty > remainingQty;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`text-xs p-2 rounded border ${
                            exceedsMax ? 'bg-red-100 border-red-300' : 
                            isAtMax ? 'bg-yellow-100 border-yellow-300' : 
                            'bg-white border-green-100'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-medium text-gray-800">
                              {item.itemCode} - {item.itemName}
                            </p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              exceedsMax ? 'bg-red-600 text-white' :
                              isAtMax ? 'bg-yellow-600 text-white' :
                              'bg-green-600 text-white'
                            }`}>
                              {exceedsMax ? '⚠️ Exceeds' : isAtMax ? '⚡ Full Amount' : '✓ OK'}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Requesting:</span>
                              <p className="font-bold text-gray-900">{formatNumber(returnQty)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Available:</span>
                              <p className="font-bold text-green-700">{formatNumber(remainingQty)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Already Returned:</span>
                              <p className="font-bold text-orange-700">{formatNumber(alreadyReturned)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Originally Received:</span>
                              <p className="font-bold text-blue-700">{formatNumber(item.originalQuantity || item.quantity || 0)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subtotal Details & Totals */}
              {formData.items.length > 0 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Total Items</p>
                        <p className="text-base font-bold text-gray-900">{totals.itemCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Total Quantity</p>
                        <p className="text-base font-bold text-gray-900">
                          {formatNumber(totals.quantity || totals.totalQty)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Subtotal (Ex Tax)</p>
                        <p className="text-base font-bold text-gray-900">
                          {formatCurrency(totals.subtotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">💰 Total Tax</p>
                        <p className="text-base font-bold text-purple-600">
                          {formatCurrency(totals.totalTax || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">💰 Total Amount (Inc. Tax)</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(totals.total || totals.subtotal)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRtv}
                disabled={isLoading || formData.items.length === 0}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition"
              >
                {editingId ? "Update RTV" : "Save as Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Selection Modal */}
      {showGrnSelectionModal && (
        <RtvSelectionModal
          grnList={grnList}
          formData={formData}
          setFormData={setFormData}
          onClose={() => setShowGrnSelectionModal(false)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default RtvForm;



