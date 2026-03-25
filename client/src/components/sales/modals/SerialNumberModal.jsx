import React from "react";
import { Hash, X, Trash2 } from "lucide-react";

export default function SerialNumberModal({
  show,
  selectedItemSerial,
  serialNumbers,
  newSerialInput,
  onNewSerialInputChange,
  onAddSerial,
  onRemoveSerial,
  onClose,
}) {
  if (!show || !selectedItemSerial) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Hash size={18} className="text-blue-600" />
            Manage Serial Numbers
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 flex-1 overflow-y-auto max-h-64">
          {/* Current Serial Numbers List */}
          {serialNumbers[selectedItemSerial]?.length > 0 ? (
            <div className="space-y-2">
              {serialNumbers[selectedItemSerial].map((serial, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {serial}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveSerial(selectedItemSerial, idx);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No serial numbers added yet
            </p>
          )}
        </div>

        {/* Add New Serial Number */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newSerialInput}
              onChange={(e) => onNewSerialInputChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && newSerialInput.trim()) {
                  onAddSerial(selectedItemSerial, newSerialInput.trim());
                }
              }}
              placeholder="Enter serial number..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (newSerialInput.trim()) {
                  onAddSerial(selectedItemSerial, newSerialInput.trim());
                }
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
