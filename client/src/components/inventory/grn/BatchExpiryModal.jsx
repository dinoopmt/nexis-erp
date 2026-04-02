/**
 * BatchExpiryModal Component
 * Modal for entering batch number and expiry date for products that track expiry
 */
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { showToast } from "../../shared/AnimatedCenteredToast.jsx";

const BatchExpiryModal = ({ isOpen, item, onClose, onSave }) => {
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // ✅ Initialize from item data when modal opens
  useEffect(() => {
    if (isOpen && item) {
      setBatchNumber(item.batchNumber || "");
      setExpiryDate(item.expiryDate ? item.expiryDate.split('T')[0] : "");
    }
  }, [isOpen, item]);

  const handleSave = () => {
    // ✅ Validate batch number
    if (!batchNumber.trim()) {
      showToast('error', "Batch number is required");
      return;
    }

    // ✅ Validate expiry date
    if (!expiryDate) {
      showToast('error', "Expiry date is required");
      return;
    }

    // ✅ Validate expiry date is in future
    const selectedDate = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      showToast('error', "Expiry date must be in the future");
      return;
    }

    // ✅ Call parent callback with updated data
    onSave({
      itemId: item.id,
      batchNumber: batchNumber.trim(),
      expiryDate: expiryDate,
    });

    // ✅ Reset form
    setBatchNumber("");
    setExpiryDate("");
    onClose();
  };

  const handleClose = () => {
    setBatchNumber("");
    setExpiryDate("");
    onClose();
  };

  if (!isOpen || !item) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Batch & Expiry Details</h2>
            <p className="text-xs text-gray-600 mt-0.5">{item.productName}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-3 space-y-3">
          {/* Batch Number */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Batch Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Enter batch number"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-0.5">
              SKU: {item.itemCode}
            </p>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-0.5">
              Future date required
            </p>
          </div>

          {/* Display existing expiry info if available */}
          {expiryDate && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="text-xs text-blue-800">
                Expires: <strong>{new Date(expiryDate).toLocaleDateString('en-IN')}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchExpiryModal;


