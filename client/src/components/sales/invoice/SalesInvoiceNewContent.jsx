/**
 * SalesInvoiceNewDetails Component
 * Content section: Product search, Items table, Tax breakdown
 */

import React, { useRef, useEffect } from "react";
import { Plus, Search, Trash2, Hash, Edit2 } from "lucide-react";

const SalesInvoiceNewDetails = ({
  invoiceData,
  itemSearch,
  showSearchDropdown,
  filteredProducts,
  focusedCell,
  totals,
  config,
  decimalPlaces,
  getInputStep,
  onItemSearchChange,
  onAddItemFromSearch,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSerialClick,
  onNoteClick,
  onTableCellKeyDown,
  formatNumber,
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
      {/* CONTENT AREA */}
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md m-4">
        {/* PRODUCT SEARCH */}
        <div className="border-b border-gray-200 px-4 py-3">
          <div ref={searchDropdownRef} className="relative mb-3">
            <Search size={14} className="absolute left-3 top-3 text-blue-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product by name, barcode, or SKU..."
              value={itemSearch}
              onChange={(e) => onItemSearchChange(e.target.value)}
              onFocus={() => onItemSearchChange(itemSearch)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {/* Search Dropdown */}
            {showSearchDropdown && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    onClick={() => onAddItemFromSearch(product)}
                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-xs"
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition"
          >
            <Plus size={14} />
            Add Item
          </button>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-8">#</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-800 min-w-32">Item Name</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-20">Qty</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-24">Rate</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-20">Disc %</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-20">Disc Amt</th>
                <th className="px-1 py-2 text-center font-semibold text-gray-800 w-12">Tax %</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-800 w-28">Total</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-800 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                    No items added yet. Search and add products to get started.
                  </td>
                </tr>
              ) : (
                invoiceData.items.map((item, idx) => {
                  const itemAmount = item.qty * item.rate;
                  const itemPercentDiscount = (itemAmount * (item.itemDiscount ?? 0)) / 100;
                  const itemAmountDiscount = item.itemDiscountAmount ?? 0;
                  const itemDiscountedAmount = itemAmount - itemPercentDiscount - itemAmountDiscount;
                  const itemVat = (itemDiscountedAmount * (item.tax || 0)) / 100;
                  const total = itemDiscountedAmount + itemVat;

                  return (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-gray-600">{idx + 1}</td>
                      <td className="px-2 py-2 text-left text-gray-800 font-medium">{item.itemName}</td>
                      
                      {/* Quantity */}
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
                          className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      {/* Rate */}
                      <td className="px-2 py-2 text-center">
                        <input
                          ref={(el) => {
                            if (el) itemInputRefs.current[`${item.id}_rate`] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          step={getInputStep()}
                          min="0"
                          value={item.rate || ""}
                          onChange={(e) =>
                            onItemChange(item.id, "rate", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() =>
                            setFocusedCell({ itemId: item.id, field: "rate" })
                          }
                          onKeyDown={(e) =>
                            onTableCellKeyDown(e, item.id, "rate", idx)
                          }
                          className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="px-2 py-2 text-center">
                        <input
                          ref={(el) => {
                            if (el)
                              itemInputRefs.current[`${item.id}_itemDiscount`] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          step={getInputStep()}
                          min="0"
                          value={item.itemDiscount ?? 0}
                          onChange={(e) =>
                            onItemChange(item.id, "itemDiscount", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() =>
                            setFocusedCell({
                              itemId: item.id,
                              field: "itemDiscount",
                            })
                          }
                          onKeyDown={(e) =>
                            onTableCellKeyDown(e, item.id, "itemDiscount", idx)
                          }
                          className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      {/* Discount Amount */}
                      <td className="px-2 py-2 text-center">
                        <input
                          ref={(el) => {
                            if (el)
                              itemInputRefs.current[`${item.id}_itemDiscountAmount`] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          step={getInputStep()}
                          min="0"
                          value={item.itemDiscountAmount ?? 0}
                          onChange={(e) =>
                            onItemChange(item.id, "itemDiscountAmount", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() =>
                            setFocusedCell({
                              itemId: item.id,
                              field: "itemDiscountAmount",
                            })
                          }
                          onKeyDown={(e) =>
                            onTableCellKeyDown(e, item.id, "itemDiscountAmount", idx)
                          }
                          className="w-full text-center border border-gray-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>

                      {/* Tax */}
                      <td className="px-1 py-2 text-center font-medium text-gray-800">
                        {item.tax || 0}%
                      </td>

                      {/* Total */}
                      <td className="px-2 py-2 text-right font-bold text-gray-900">
                        {formatNumber(total)}
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onSerialClick(item.id)}
                            className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition"
                            title="Manage serial numbers"
                          >
                            <Hash size={14} />
                          </button>
                          <button
                            onClick={() => onNoteClick(item.id)}
                            className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition"
                            title="Add item note"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TAX DETAILS SECTION */}
      {invoiceData.items.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-t border-gray-200 px-4 py-3 m-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Subtotal */}
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">SUBTOTAL</p>
              <p className="text-lg font-bold text-gray-800">
                {config.currency || 'AED'} {totals.subtotal}
              </p>
            </div>

            {/* Discounts */}
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">TOTAL DISCOUNT</p>
              <p className="text-lg font-bold text-orange-600">
                -{config.currency || 'AED'} {totals.discount}
              </p>
            </div>

            {/* Taxable Amount */}
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium">TAXABLE AMOUNT</p>
              <p className="text-lg font-bold text-blue-600">
                {config.currency || 'AED'} {totals.totalAfterDiscount}
              </p>
            </div>

            {/* Tax Details */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold mb-1">
                {totals.taxLabel} @ {totals.taxRate}%
              </p>
              {totals.taxBreakdown ? (
                <>
                  <p className="text-xs text-gray-600">
                    CGST: {config.currency || 'AED'} {formatNumber(parseFloat(totals.tax) * (totals.taxBreakdown.cgst / totals.taxRate))}
                  </p>
                  <p className="text-xs text-gray-600">
                    SGST: {config.currency || 'AED'} {formatNumber(parseFloat(totals.tax) * (totals.taxBreakdown.sgst / totals.taxRate))}
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-green-700">
                  {config.currency || 'AED'} {totals.tax}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInvoiceNewDetails;
