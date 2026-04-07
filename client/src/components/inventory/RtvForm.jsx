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
import { useGrnGridDimensions } from "../../hooks/useGrnGridDimensions";

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
  
  // ✅ Grid display state using dimensions hook
  const { gridContainerRef, gridHeight } = useGrnGridDimensions(showNewRtvModal);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [editTargetItemId, setEditTargetItemId] = useState(null);
  
  // Form hooks
  const { formData, setFormData, fetchNextRtvNo } = useRtvFormData();
  const itemMgmt = useRtvItemManagement(formData, setFormData);
  const api = useRtvApi();
  const { columns, gridConfig } = useRtvGridConfig((id) => {
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
    <div className="absolute inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-white text-gray-900 px-3 py-2 shadow-md z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Return to Vendor</h1>
            <p className="text-xs text-gray-600 mt-0.5">Manage goods returned to vendors</p>
          </div>
          <button
            onClick={handleNewRtv}
            className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700 transition font-medium"
          >
            <Plus size={12} /> New RTV
          </button>
        </div>
      </div>

      {/* CONTENT - Scrollable */}
      <div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden">
        {/* Search & Filters Bar */}
        <div className="flex-shrink-0 flex flex-col lg:flex-row gap-1.5 mb-1.5 items-stretch lg:items-center lg:justify-between">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search RTV #, Vendor, GRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded px-2 text-xs bg-white h-7 w-64 outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 text-xs bg-white flex-shrink-0 h-7 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Posted">Posted</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadRtvList}
            className="border border-gray-300 rounded px-2 text-xs bg-white h-7 hover:bg-gray-50 flex-shrink-0 font-medium transition"
          >
            Refresh
          </button>
        </div>

        {/* RTV List Table - Takes remaining space */}
        {isLoading && rtvList.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <RtvListTable
            rtvList={filteredRtvs}
            loading={false}
            onEdit={handleEditRtv}
            onDelete={handleDeleteRtv}
            onSubmit={(id) => handleWorkflowAction(id, "submit")}
            onApprove={(id) => handleWorkflowAction(id, "approve")}
            onPost={(id) => handleWorkflowAction(id, "post")}
          />
        )}
      </div>

      {/* New/Edit RTV Modal */}
      {showNewRtvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg flex flex-col max-h-[95vh]" style={{ width: "90vw" }}>
            {/* Modal Header - Fixed */}
            <div className="sticky top-0 flex justify-between items-center gap-3 px-3 py-1.5 border-b bg-gray-50 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editingId ? "Edit RTV" : "Create New RTV"}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">{formData.rtvNumber}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 p-2 min-h-0">
              {/* Form Header - Non-scrolling */}
              <div className="bg-gray-50 border border-gray-200 px-3 py-2 rounded flex-shrink-0">
                <RtvFormHeader
                  formData={formData}
                  setFormData={setFormData}
                  isEditable={isEditable}
                  onOpenSelectionModal={handleOpenGrnSelection}
                />
              </div>

              {/* Items Section Header */}
              <div className="flex justify-between items-center px-1 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-900">Items to Return</h3>
                <button
                  onClick={handleOpenGrnSelection}
                  disabled={!isEditable}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Plus size={12} />
                  Add Items
                </button>
              </div>

              {/* Items Table - Takes remaining space */}
              <div className="flex-1 min-h-0 border border-gray-200 rounded bg-white">
                {formData.items.length > 0 ? (
                  <RtvItemsTable
                    items={formData.items}
                    columns={columns}
                    gridConfig={gridConfig}
                    gridHeight={gridHeight}
                    gridContainerRef={gridContainerRef}
                    highlightedItemId={highlightedItemId}
                    editTargetItemId={editTargetItemId}
                    onEditTargetHandled={() => setEditTargetItemId(null)}
                    isViewMode={!isEditable}
                    onCellValueChanged={(event) => {
                      const { data, colDef, newValue } = event;
                      if (colDef.field === "quantity") {
                        const item = formData.items.find(i => i.id === data.id);
                        if (item) {
                          const remainingQty = calculateRemainingQty(item);
                          const limitedQty = Math.min(newValue, remainingQty);
                          
                          if (newValue > remainingQty) {
                            showToast('warning',
                              `⚠️ ${item.itemCode}: Cannot return ${formatNumber(newValue)}. Max available: ${formatNumber(remainingQty)}`
                            );
                          }
                          
                          item.quantity = limitedQty;
                          setFormData({ ...formData });
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    <p className="text-xs">No items selected. Click "Add Items" to get started.</p>
                  </div>
                )}
              </div>

              {/* Return Reason & Notes Section - Not scrolling */}
              {formData.items.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 px-2 py-1.5 rounded max-h-24 overflow-y-auto flex-shrink-0">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Return Reason & Notes</p>
                  <div className="space-y-0.5 text-xs">
                    {formData.items.map((item) => (
                      <div key={item.id} className="bg-white p-1 rounded border border-blue-100">
                        <p className="font-medium text-gray-800">{item.itemCode}</p>
                        <span className="text-blue-700  font-semibold">{item.returnReason || "N/A"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remaining Quantities Section - Not scrolling */}
              {formData.items.length > 0 && (
                <div className="bg-green-50 border border-green-200 px-2 py-1.5 rounded max-h-24 overflow-y-auto flex-shrink-0">
                  <p className="text-xs font-semibold text-green-900 mb-1">Return Qty Status</p>
                  <div className="space-y-0.5 text-xs">
                    {formData.items.map((item) => {
                      const remainingQty = calculateRemainingQty(item);
                      const returnQty = item.quantity || 0;
                      const isAtMax = returnQty === remainingQty;
                      const exceedsMax = returnQty > remainingQty;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={`p-1 rounded border line ${
                            exceedsMax ? 'bg-red-100 border-red-300' : 
                            isAtMax ? 'bg-yellow-100 border-yellow-300' : 
                            'bg-white border-green-100'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{item.itemCode}</span>
                            <span className="text-xs font-bold">
                              {!exceedsMax && !isAtMax && '✓'} {formatNumber(returnQty)}/{formatNumber(remainingQty)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Totals Section - Not scrolling */}
              {formData.items.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded flex-shrink-0">
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600 mb-0.5">Total Items</p>
                      <p className="text-sm font-bold text-gray-900">{totals.itemCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-0.5">Total Quantity</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatNumber(totals.quantity || totals.totalQty)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-0.5">Subtotal (Ex Tax)</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(totals.subtotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-0.5">Total (Inc. Tax)</p>
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(totals.total || totals.subtotal)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Fixed at Bottom with Summary Values */}
            <div className="bg-gray-50 border-t border-gray-200 px-2 py-1 flex items-center justify-between gap-2 flex-shrink-0">
              {/* Summary Values - Left Side */}
              {formData.items.length > 0 && (
                <div className="flex items-center gap-1 flex-1">
                  {/* Total Items */}
                  <div className="flex items-center justify-between gap-0.5 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                    <span className="font-semibold">Items:</span>
                    <span className="font-bold text-blue-600">{totals.itemCount}</span>
                  </div>

                  {/* Total Quantity */}
                  <div className="flex items-center justify-between gap-0.5 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                    <span className="font-semibold">Qty:</span>
                    <span className="font-bold text-blue-600">{formatNumber(totals.quantity || totals.totalQty)}</span>
                  </div>

                  {/* Subtotal */}
                  <div className="flex items-center justify-between gap-0.5 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                    <span className="font-semibold">Subtotal (Ex.Tax):</span>
                    <span className="font-bold text-blue-600">{formatCurrency(totals.subtotal)}</span>
                  </div>

                  {/* Total Tax */}
                  <div className="flex items-center justify-between gap-0.5 bg-white px-2 py-1 rounded border border-gray-200 text-xs">
                    <span className="font-semibold">Tax:</span>
                    <span className="font-bold text-purple-600">{formatCurrency(totals.totalTax || 0)}</span>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-center justify-between gap-0.5 bg-yellow-100 px-2 py-1 rounded border border-yellow-300 text-xs">
                    <span className="font-semibold">Total (Inc.Tax):</span>
                    <span className="font-bold text-yellow-700">{formatCurrency(totals.total || totals.subtotal)}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons - Right Side */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleCloseModal}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded-lg font-medium hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRtv}
                  disabled={isLoading || formData.items.length === 0}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium disabled:opacity-50 transition"
                >
                  {editingId ? "Update RTV" : "Save as Draft"}
                </button>
              </div>
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



