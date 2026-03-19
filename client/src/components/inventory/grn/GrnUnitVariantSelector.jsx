/**
 * GrnUnitVariantSelector Component
 * Modal for selecting unit variant when adding item to GRN
 */
import React, { useState } from "react";
import { X } from "lucide-react";

const GrnUnitVariantSelector = ({
  product,
  isOpen,
  onSelect,
  onClose,
}) => {
  const [selectedVariant, setSelectedVariant] = useState(null);

  if (!isOpen) return null;

  // Get packing units (unit variants) from product
  const packingUnits = product?.packingUnits || [];
  
  // Create options: base unit + packing units
  const unitOptions = [
    {
      id: "base",
      name: "Base Unit",
      barcode: product?.barcode || "",
      unit: product?.unitType?.unitSymbol || "PC",
      factor: 1,
      cost: product?.cost || 0,
      price: product?.price || 0,
    },
    ...packingUnits.map((pu, idx) => ({
      id: `variant-${idx}`,
      name: pu.unit?.unitName || `Unit ${idx + 1}`,  // ✅ FIXED: Use unit.unitName instead of pu.name
      barcode: pu.barcode || "",
      unit: pu.unit?.unitSymbol || pu.unitSymbol || "PC",
      factor: pu.factor || 1,
      cost: pu.cost || product?.cost || 0,
      price: pu.price || product?.price || 0,
    })),
  ];

  const handleSelect = () => {
    if (selectedVariant !== null) {
      const selected = unitOptions[selectedVariant];
      onSelect(selected);
      setSelectedVariant(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* ✅ FIXED HEIGHT: 420px modal prevents height jumping for 4 variants */}
      <div className="bg-white rounded-lg shadow-xl p-4 max-w-lg w-full mx-4 h-fit flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-semibold text-gray-900">
            Select Unit Variant
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-3 p-2 bg-blue-50 rounded">
          <p className="font-semibold text-sm text-gray-900 truncate">{product?.name || "Product"}</p>
          <p className="text-xs text-gray-600 truncate">Code: {product?.itemcode || "-"}</p>
        </div>

        {/* Unit Options - FIXED HEIGHT for 4 variants, NO SCROLL */}
        <div className="flex flex-col gap-2 mb-4" style={{ minHeight: '280px' }}>
          {unitOptions.map((option, idx) => (
            <div
              key={option.id}
              onClick={() => setSelectedVariant(idx)}
              className={`p-2 border-2 rounded-lg cursor-pointer transition ${
                selectedVariant === idx
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              {/* ✅ Top row: Unit Name (left) | Barcode (right) */}
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="font-semibold text-sm text-gray-900 truncate flex-1">
                  {option.name}
                </div>
                {option.barcode && (
                  <div className="text-xs text-blue-600 font-medium whitespace-nowrap">
                    {option.barcode}
                  </div>
                )}
              </div>
              
              {/* ✅ Bottom row: Unit, Factor, Cost, Price in 4-column grid */}
              <div className="grid grid-cols-4 gap-1 text-xs text-gray-600 min-w-0">
                <div className="min-w-0">
                  <span className="text-gray-500 block text-[9px] truncate">Unit</span>
                  <div className="font-medium text-gray-800 truncate">{option.unit}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-gray-500 block text-[9px] truncate">Factor</span>
                  <div className="font-medium text-gray-800 truncate">{option.factor}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-gray-500 block text-[9px] truncate">Cost</span>
                  <div className="font-medium text-gray-800 truncate">{option.cost}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-gray-500 block text-[9px] truncate">Price</span>
                  <div className="font-medium text-gray-800 truncate">{option.price}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={selectedVariant === null}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrnUnitVariantSelector;


