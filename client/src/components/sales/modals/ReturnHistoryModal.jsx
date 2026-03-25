import React from "react";
import { Clock, X, Edit2, Eye } from "lucide-react";

export default function ReturnHistoryModal({
  show,
  onClose,
  returns,
  historyDateFilter,
  onHistoryDateFilterChange,
  historySearch,
  onHistorySearchChange,
  filteredHistoryReturns,
  onEditReturn,
  onViewReturn,
  formatNumber,
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Clock size={16} className="text-red-600" />
            Return History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters Grid */}
        <div className="px-4 py-2 border-b bg-white flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {/* Date Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Date
              </label>
              <input
                type="date"
                value={historyDateFilter}
                onChange={(e) => onHistoryDateFilterChange(e.target.value)}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            {/* Search Filter */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Search
              </label>
              <input
                type="text"
                placeholder="Customer or Return #"
                value={historySearch}
                onChange={(e) => onHistorySearchChange(e.target.value)}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredHistoryReturns.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {returns.length === 0
                ? "No returns found"
                : historySearch.trim()
                  ? `No returns found for "${historySearch}" on ${historyDateFilter}`
                  : `No returns found for ${historyDateFilter}`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 border-b border-gray-300 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800">
                      SL
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">
                      Return No
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800">
                      Return Date
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">
                      Customer
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800">
                      Items
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-800">
                      Total
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-800">
                      VAT
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-800">
                      Net Total
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800 w-48">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryReturns.map((returnItem, idx) => (
                    <tr
                      key={returnItem._id}
                      className="border-b border-gray-200 hover:bg-red-50 transition"
                    >
                      <td className="px-3 py-2 text-center text-gray-700 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-red-600">
                        #{returnItem.returnNumber}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {new Date(returnItem.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {returnItem.customerName}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">
                        {returnItem.totalItems || returnItem.items?.length || 0}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-800">
                        {returnItem.totalItemQty ||
                          returnItem.items?.reduce(
                            (sum, item) => sum + (item.quantity || 0),
                            0,
                          ) ||
                          0}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatNumber(returnItem.subtotal || 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatNumber(returnItem.vatAmount || 0)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-600">
                        {formatNumber(
                          returnItem.totalIncludeVat ||
                            (returnItem.subtotal || 0) +
                              (returnItem.vatAmount || 0),
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => onViewReturn(returnItem)}
                            title="View return details"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 p-1.5 rounded transition"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              onEditReturn(returnItem);
                              onClose();
                            }}
                            title="Edit return"
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 p-1.5 rounded transition"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
