/**
 * RtvSelectionModal Component
 * Modal to select GRN and items to return
 * ✅ Batch Expiry Validation + Cost Tracking
 */
import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle, AlertTriangle, Calendar } from "lucide-react";
import useDecimalFormat from "../../../hooks/useDecimalFormat";

const RtvSelectionModal = ({
  grnList,
  onSelect,
  onClose,
  formData,
  setFormData,
  isLoading = false,
}) => {
  const { formatNumber, formatCurrency } = useDecimalFormat();
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [warningItems, setWarningItems] = useState(new Set()); // Track expired items
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("active"); // "all", "active", "partial"

  // ✅ Calculate remaining stock for RTV: Available = Received - RTV Already Returned
  // (Independent of sales - only tracks what's been returned to vendor)
  const getItemRemainingStock = (item) => {
    if (!item.quantity) return 0;
    const rtvReturnedQty = item.rtvReturnedQuantity || 0; // Only track RTV returns
    const availableForRtv = Math.max(0, item.quantity - rtvReturnedQty);
    
    // Debug logging
    console.log(`[RTV Stock] ${item.itemCode}:`, {
      received: item.quantity,
      alreadyRtvReturned: rtvReturnedQty,
      formula: `${item.quantity} - ${rtvReturnedQty}`,
      availableForRtv: availableForRtv,
      returnPercentage: item.quantity > 0 ? Math.round((rtvReturnedQty / item.quantity) * 100) : 0,
      note: "Independent of sales - only tracks vendor returns"
    });
    
    return availableForRtv;
  };

  // ✅ Calculate total remaining stock for a GRN
  const getGrnRemainingStock = (grn) => {
    if (!grn.items || grn.items.length === 0) return 0;
    return grn.items.reduce((sum, item) => sum + getItemRemainingStock(item), 0);
  };

  // ✅ Get GRN status: "FULL_STOCK", "PARTIAL", "SOLD_OUT"
  const getGrnStatus = (grn) => {
    if (!grn.items || grn.items.length === 0) return "NO_ITEMS";
    
    const totalQty = grn.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const remainingQty = getGrnRemainingStock(grn);
    
    if (remainingQty === 0) return "SOLD_OUT";
    if (remainingQty < totalQty) return "PARTIAL";
    return "FULL_STOCK";
  };

  // ✅ Filter and sort GRNs
  const getFilteredGrnList = () => {
    if (!grnList || grnList.length === 0) return [];
    
    let filtered = grnList;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(grn => 
        (grn.grnNumber || "").toLowerCase().includes(term) ||
        (grn.vendorName || "").toLowerCase().includes(term)
      );
    }
    
    // Filter by stock status
    if (filterType === "active") {
      filtered = filtered.filter(grn => getGrnStatus(grn) !== "SOLD_OUT");
    } else if (filterType === "partial") {
      filtered = filtered.filter(grn => getGrnStatus(grn) === "PARTIAL");
    }
    
    // Sort by date (recent first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.grnDate || 0);
      const dateB = new Date(b.grnDate || 0);
      return dateB - dateA;
    });
    
    return filtered;
  };

  // ✅ Calculate expiry status
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: "NO_BATCH", label: "No Batch", color: "gray" };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { status: "EXPIRED", label: "EXPIRED", color: "red", daysLeft };
    if (daysLeft <= 7) return { status: "EXPIRING_SOON", label: "Expiring Soon", color: "yellow", daysLeft };
    return { status: "ACTIVE", label: "Active", color: "green", daysLeft };
  };

  // ✅ Format date for display
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Debug: Log grnList data
  useEffect(() => {
    console.log("RtvSelectionModal received grnList:", grnList);
    if (grnList && grnList.length > 0) {
      console.log("First GRN structure:", grnList[0]);
    }
  }, [grnList]);

  const handleSelectGrn = (grn) => {
    console.log("Selected GRN:", grn);
    setSelectedGrn(grn);
    setSelectedItems([]);
    setWarningItems(new Set());
  };

  const handleToggleItem = (item) => {
    const expiryStatus = getExpiryStatus(item.expiryDate);
    const itemKey = `${item.productId}-${item.batchNumber || "no-batch"}`;
    
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.productId === item.productId && (i.batchNumber || "") === (item.batchNumber || ""));
      if (isSelected) {
        return prev.filter(i => !(i.productId === item.productId && (i.batchNumber || "") === (item.batchNumber || "")));
      } else {
        // Warn if expired
        if (expiryStatus.status === "EXPIRED") {
          setWarningItems(prev => new Set(prev).add(itemKey));
          console.warn("⚠️ Warning: Selecting expired batch:", itemKey);
        }
        return [...prev, { ...item, quantity: item.quantity || 0 }];
      }
    });
  };

  const handleConfirmSelection = () => {
    if (selectedGrn && selectedItems.length > 0) {
      console.log("Confirming selection:", selectedGrn, selectedItems);
      
      // Check for expired items
      const expiredCount = selectedItems.filter(item => {
        const status = getExpiryStatus(item.expiryDate);
        return status.status === "EXPIRED";
      }).length;
      
      if (expiredCount > 0) {
        const proceed = window.confirm(
          `⚠️ You're returning ${expiredCount} expired item(s). This is unusual but allowed for quality/disposal reasons. Proceed?`
        );
        if (!proceed) return;
      }

      // Add selected items to form
      setFormData(prev => ({
        ...prev,
        grnNumber: selectedGrn.grnNumber,
        grnId: selectedGrn._id,
        items: [
          ...prev.items,
          ...selectedItems.map((item, idx) => ({
            ...item,
            id: `${item.productId}-${Date.now()}-${idx}`,
            returnReason: "OTHER",
            returnReasonNotes: "",
            originalBatchNumber: item.batchNumber || "",
            // ✅ Preserve expiry info for GL reversal at correct cost
            originalExpiryDate: item.expiryDate || null,
          }))
        ]
      }));
      onClose();
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading GRN list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Select GRN & Items to Return</h2>
            <p className="text-xs text-gray-600">Supplier: {formData.vendorName || "N/A"}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* GRN Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">1. Select GRN</h3>
            
            {/* Search & Filter Controls */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search by GRN number or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">With Stock</option>
                <option value="partial">Partial Stock</option>
                <option value="all">All GRNs</option>
              </select>
            </div>
            
            {/* Empty State */}
            {getFilteredGrnList().length === 0 ? (
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 text-center justify-center">
                <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {grnList?.length === 0 ? "No GRNs Available" : "No GRNs Match Filters"}
                  </p>
                  <p className="text-xs text-yellow-700">
                    {grnList?.length === 0 
                      ? "Create and post a GRN first before creating returns" 
                      : "Try adjusting your search or filter"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {getFilteredGrnList().map(grn => {
                  const status = getGrnStatus(grn);
                  const remaining = getGrnRemainingStock(grn);
                  const total = grn.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                  
                  return (
                    <div
                      key={grn._id}
                      onClick={() => handleSelectGrn(grn)}
                      className={`p-3 cursor-pointer border-l-4 transition ${
                        selectedGrn?._id === grn._id
                          ? "bg-blue-50 border-l-blue-500"
                          : status === "SOLD_OUT"
                          ? "bg-red-50 border-l-red-300 opacity-60 cursor-not-allowed"
                          : status === "PARTIAL"
                          ? "bg-yellow-50 border-l-yellow-400 hover:bg-yellow-100"
                          : "bg-gray-50 border-l-green-400 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{grn.grnNumber || "N/A"}</p>
                          <p className="text-xs text-gray-600">{grn.vendorName || "Unknown Vendor"}</p>
                          <p className="text-xs text-gray-500">
                            {grn.items?.length || 0} items | {formatCurrency(grn.netTotal || 0)}
                          </p>
                        </div>
                        
                        {/* Stock Status Section */}
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            status === "SOLD_OUT" ? "bg-red-100 text-red-700" :
                            status === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {status === "SOLD_OUT" ? "✓ Sold Out" :
                             status === "PARTIAL" ? "⚠️ Partial" :
                             "✓ Full Stock"}
                          </span>
                          <span className="text-xs text-gray-600">
                            {remaining} of {total} remain
                          </span>
                          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            {grn.grnDate ? new Date(grn.grnDate).toLocaleDateString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items Selection */}
          {selectedGrn && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">2. Select Items to Return</h3>
              {(!selectedGrn.items || selectedGrn.items.length === 0) ? (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600">No items found in this GRN</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {selectedGrn.items.map((item, idx) => {
                      const expiryStatus = getExpiryStatus(item.expiryDate);
                      const itemKey = `${item.productId}-${item.batchNumber || "no-batch"}`;
                      const isExpired = expiryStatus.status === "EXPIRED";
                      const isExpiringSoon = expiryStatus.status === "EXPIRING_SOON";
                      
                      // ✅ Show remaining stock
                      const remainingQty = getItemRemainingStock(item);
                      const isFullySold = remainingQty === 0;
                      
                      if (isFullySold) return null; // Skip fully sold items
                      
                      return (
                        <div
                          key={`${item.productId}-${idx}`}
                          onClick={() => handleToggleItem(item)}
                          className={`p-3 cursor-pointer border-l-4 transition ${
                            selectedItems.some(i => i.productId === item.productId && (i.batchNumber || "") === (item.batchNumber || ""))
                              ? "bg-green-50 border-l-green-500"
                              : isExpired
                              ? "bg-red-50 border-l-red-400 opacity-75"
                              : isExpiringSoon
                              ? "bg-yellow-50 border-l-yellow-400"
                              : "bg-gray-50 border-l-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {item.itemCode} - {item.itemName}
                                </p>
                                {/* ✅ Expiry Status Badge */}
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  isExpired ? "bg-red-100 text-red-700" :
                                  isExpiringSoon ? "bg-yellow-100 text-yellow-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {expiryStatus.label}
                                </span>
                              </div>
                              
                              {/* ✅ Stock Info: Shows RTV calculation breakdown (independent of sales) */}
                              <div className="bg-blue-50 p-2 rounded mt-1 border border-blue-200">
                                <p className="text-xs text-gray-700 font-semibold mb-1">📊 RTV Stock Calculation (Independent):</p>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <p>• Received from GRN: <span className="font-mono font-semibold">{formatNumber(item.quantity)}</span> units</p>
                                  <p>• Already Returned to Vendor: <span className="font-mono font-semibold">-{formatNumber(item.rtvReturnedQuantity || 0)}</span> units</p>
                                  <p className="border-t border-blue-200 pt-0.5">• <strong>Available for RTV:</strong> <span className="font-mono bg-green-100 px-1 rounded text-green-700 font-bold">{formatNumber(remainingQty)}</span> units</p>
                                  <p className="text-xs text-gray-500 italic mt-1">Note: Not affected by sales - only tracks vendor returns</p>
                                </div>
                              </div>
                              
                              {/* ✅ Item Details: Cost Calculation on Available Qty */}
                              <p className="text-xs text-gray-600 mt-1">
                                💰 Return Value: {formatNumber(remainingQty)} @ {formatCurrency(item.unitCost || 0)} = <span className="font-semibold text-green-700">{formatCurrency((remainingQty) * (item.unitCost || 0))}</span>
                              </p>
                              
                              {/* ✅ Batch Info */}
                              {item.batchNumber && (
                                <p className="text-xs text-gray-500 mt-1">
                                  📦 Batch: {item.batchNumber}
                                </p>
                              )}
                              
                              {/* ✅ Expiry Date Info */}
                              {item.expiryDate && (
                                <p className={`text-xs mt-1 ${isExpired ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                  <Calendar size={12} className="inline mr-1" />
                                  Exp: {formatDate(item.expiryDate)} {expiryStatus.daysLeft !== undefined && `(${expiryStatus.daysLeft} days)`}
                                </p>
                              )}
                              
                              {/* ⚠️ Expired Warning */}
                              {isExpired && (
                                <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                                  <AlertTriangle size={12} />
                                  Expired - unusual to return
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                {formatCurrency(item.totalCost || 0)}
                              </p>
                              <input
                                type="checkbox"
                                checked={selectedItems.some(i => i.productId === item.productId && (i.batchNumber || "") === (item.batchNumber || ""))}
                                onChange={() => {}}
                                className="mt-2 w-4 h-4 text-green-600 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Selected: {selectedItems.length} item(s) for return
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={!selectedGrn || selectedItems.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={16} />
            Add Selected Items
          </button>
        </div>
      </div>
    </div>
  );
};

export default RtvSelectionModal;


