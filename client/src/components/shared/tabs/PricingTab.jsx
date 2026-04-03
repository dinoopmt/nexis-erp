import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * PricingTab Component
 * Displays and manages pricing lines for different units with cost, selling price, margin calculations
 */
const PricingTab = ({
  pricingLines,
  newProduct,
  units,
  errors,
  onAddPriceLine,
  onUpdatePriceLine,
  onRemovePriceLine,
  onCalculatePricingFields,
}) => {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
      {/* Pricing Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gradient-to-r from-blue-100 to-blue-50 text-left sticky top-0 z-10">
            <tr>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-center w-20">Unit</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-center w-16">Factor</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-right w-20">Cost</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-right w-24">Cost + Tax</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-right w-20">Price</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-right w-20">Margin %</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-right w-20">Margin Amt</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-right w-20">Tax Amt</th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-center w-24">Barcode </th>
              <th className="p-1 border border-gray-300 font-semibold text-xs text-center w-12">Del</th>
            </tr>
          </thead>
          <tbody>
            {pricingLines.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-4 text-center text-gray-500 text-xs">
                  No pricing lines added. Click "➕ Add Pricing Line" to add one.
                </td>
              </tr>
            ) : (
              pricingLines.map((line, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-blue-50">
                  {/* Unit Dropdown */}
                  <td className="p-1 border border-gray-300 text-center">
                    <select
                      value={line.unit || ""}
                      onChange={(e) => onUpdatePriceLine(index, "unit", e.target.value)}
                      className={`w-full border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[index]?.unit ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Unit</option>
                      {units.map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Factor (Conversion) */}
                  <td className="p-1 border border-gray-300 text-center">
                    <input
                      type="number"
                      value={line.factor || (index === 0 ? 1 : "")}
                      onChange={(e) => onUpdatePriceLine(index, "factor", e.target.value)}
                      disabled={index === 0}
                      placeholder="1"
                      className={`w-full border rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        index === 0 ? "bg-gray-100 cursor-not-allowed" : ""
                      } ${errors[index]?.factor ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                      title={index === 0 ? "Base unit - cannot change" : "Conversion factor to base unit"}
                    />
                  </td>

                  {/* Cost Price */}
                  <td className="p-1 border border-gray-300 text-right">
                    <input
                      type="number"
                      value={line.cost || ""}
                      onChange={(e) => {
                        onUpdatePriceLine(index, "cost", e.target.value);
                        onCalculatePricingFields(index, "cost", e.target.value);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      className={`w-full border rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors[index]?.cost ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>

                  {/* Cost Including Tax */}
                  <td className="p-1 border border-gray-300 text-right">
                    <input
                      type="number"
                      value={line.costIncludetax || ""}
                      onChange={(e) => {
                        onUpdatePriceLine(index, "costIncludetax", e.target.value);
                        onCalculatePricingFields(index, "costIncludetax", e.target.value);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Cost price including tax (optional)"
                    />
                  </td>

                  {/* Selling Price */}
                  <td className="p-1 border border-gray-300 text-right">
                    <input
                      type="number"
                      value={line.price || ""}
                      onChange={(e) => {
                        onUpdatePriceLine(index, "price", e.target.value);
                        onCalculatePricingFields(index, "price", e.target.value);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      className={`w-full border rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700 ${
                        errors[index]?.price ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>

                  {/* Margin % */}
                  <td className="p-1 border border-gray-300 text-right">
                    <input
                      type="number"
                      value={line.margin || ""}
                      onChange={(e) => {
                        onUpdatePriceLine(index, "margin", e.target.value);
                        onCalculatePricingFields(index, "margin", e.target.value);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>

                  {/* Margin Amount */}
                  <td className="p-1 border border-gray-300 text-right">
                    <input
                      type="number"
                      value={line.marginAmount || ""}
                      onChange={(e) => {
                        onUpdatePriceLine(index, "marginAmount", e.target.value);
                        onCalculatePricingFields(index, "marginAmount", e.target.value);
                      }}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </td>

                  {/* Tax Amount */}
                  <td className="p-1 border border-gray-300 text-right bg-yellow-50">
                    <input
                      type="number"
                      value={line.taxAmount || ""}
                      onChange={(e) => onUpdatePriceLine(index, "taxAmount", e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      disabled
                      className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs text-right bg-gray-100 cursor-not-allowed font-semibold"
                      title="Auto-calculated based on tax percentage"
                    />
                  </td>

                  {/* Barcode */}
                  <td className="p-1 border border-gray-300 text-center">
                    <input
                      type="text"
                      value={line.barcode || ""}
                      onChange={(e) => onUpdatePriceLine(index, "barcode", e.target.value)}
                      placeholder="Auto"
                      className="w-full border border-gray-300 rounded px-1 py-0.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700"
                    />
                  </td>

                  {/* Delete Button */}
                  <td className="p-1 border border-gray-300 text-center">
                    {pricingLines.length > 1 && (
                      <button
                        onClick={() => onRemovePriceLine(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded px-1 py-0.5 transition"
                        title="Delete this pricing line"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Pricing Line Button */}
      <div className="flex-shrink-0 p-2 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onAddPriceLine}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition font-semibold"
        >
          <Plus size={14} /> Add Pricing Line
        </button>
        <p className="text-xs text-gray-600 mt-1">
          💡 Tip: Enter cost + selling price, or cost + margin % and we'll auto-calculate the rest.
        </p>
      </div>
    </div>
  );
};

export default PricingTab;


