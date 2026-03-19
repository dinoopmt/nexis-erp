/**
 * GrnBarcodeInput Component
 * Barcode scanner input with action buttons
 */
import React, { forwardRef } from "react";
import { Barcode, Plus } from "lucide-react";

const GrnBarcodeInput = forwardRef(
  ({ barcodeValue, onChange, onKeyDown }, ref) => {
    return (
      <div className="flex items-center justify-between gap-2 justify-self-end">
        {/* Barcode Input */}
        <div className="flex items-center gap-2 flex-1">
          <input
            ref={ref}
            type="text"
            value={barcodeValue}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Scan barcode here..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            title="Barcode Scanner"
          >
            <Barcode size={16} />
          </button>
        </div>

        {/* Create Product */}
        <button
          className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          title="Create Product"
        >
          <Plus size={16} />
        </button>
      </div>
    );
  },
);

GrnBarcodeInput.displayName = "GrnBarcodeInput";

export default GrnBarcodeInput;


