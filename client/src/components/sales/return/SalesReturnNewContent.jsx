/**
 * SalesReturnNewContent Component
 * Content section: Product search, Items being returned, quantities, return reasons
 */

import React, { useRef, useEffect } from "react";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";

const SalesReturnNewContent = ({
  returnData,
  itemSearch,
  showSearchDropdown,
  filteredProducts,
  focusedCell,
  config,
  decimalPlaces,
  getInputStep,
  formatNumber,
  onItemSearchChange,
  onAddItemFromSearch,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onReasonClick,
  onTableCellKeyDown,
  searchInputRef,
  itemInputRefs,
  setFocusedCell,
}) => {
  const searchDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        onItemSearchChange("");
      }
    };

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchDropdown, onItemSearchChange, searchInputRef]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md m-4">
        {/* PRODUCT SEARCH */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div ref={searchDropdownRef} className="relative mb-3">
            <Search size={14} className="absolute left-3 top-3 text-orange-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product by name, barcode, or SKU..."
              value={itemSearch}
              onChange={(e) => onItemSearchChange(e.target.value)}
              onFocus={() => onItemSearchChange(itemSearch)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 outline-none"
            />
            {/* Search Dropdown */}
            {showSearchDropdown && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => onAddItemFromSearch(product)}
                    className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer border-b last:border-b-0 text-xs"
                  >
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-gray-600 text-xs">
                      SKU: {product.itemcode} • {config.currency || 'AED'} {formatNumber(product.rate)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>

        {/* RETURNED ITEMS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-8">#</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-800 min-w-32">Item Name</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-20">Qty Returned</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-24">Unit Price</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-28">Return Reason</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-800 w-28">Total</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnData.items.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                    No items added yet. Search and add products to get started.
                  </td>
                </tr>
              ) : (
                returnData.items.map((item, idx) => {
                  const itemTotal = item.qty * item.rate;

                  return (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-gray-600">{idx + 1}</td>
                      <td className="px-2 py-2 text-left text-gray-800 font-medium">{item.itemName}</td>

                      {/* Quantity Returned */}
                      <td className="px-2 py-2 text-center">
                        <input
                          ref={(el) => {
                            if (el) itemInputRefs.current[`${item.id}_qty`] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          step={getInputStep()}
                          min="0"
                          value={item.qty || ""}
                          onChange={(e) =>
                            onItemChange(item.id, "qty", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() =>
                            setFocusedCell({ itemId: item.id, field: "qty" })
                          }
                          onKeyDown={(e) =>
                            onTableCellKeyDown(e, item.id, "qty", idx)
                          }
                          className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="px-2 py-2 text-center font-medium text-gray-800">
                        {formatNumber(item.rate)}
                      </td>

                      {/* Return Reason */}
                      <td className="px-2 py-2 text-center">
                        <input
                          ref={(el) => {
                            if (el)
                              itemInputRefs.current[`${item.id}_reason`] = el;
                          }}
                          type="text"
                          placeholder="Damaged, Defective, etc."
                          value={item.returnReason || ""}
                          onChange={(e) =>
                            onItemChange(item.id, "returnReason", e.target.value)
                          }
                          className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none text-xs"
                        />
                      </td>

                      {/* Total */}
                      <td className="px-2 py-2 text-right font-bold text-gray-900">
                        {formatNumber(itemTotal)}
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReturnNewContent;
