import React from "react";
import { Clock, X, Printer, Edit2, Eye } from "lucide-react";

export default function HistoryModal({
  show,
  onClose,
  invoices,
  historyDateFilter,
  onHistoryDateFilterChange,
  historySearch,
  onHistorySearchChange,
  filteredHistoryInvoices,
  onEditInvoice,
  onViewInvoice,
  formatNumber,
}) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            Invoice History
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
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Search Filter */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Search
              </label>
              <input
                type="text"
                placeholder="Customer or Invoice #"
                value={historySearch}
                onChange={(e) => onHistorySearchChange(e.target.value)}
                className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredHistoryInvoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {invoices.length === 0
                ? "No invoices found"
                : historySearch.trim()
                  ? `No invoices found for "${historySearch}" on ${historyDateFilter}`
                  : `No invoices found for ${historyDateFilter}`}
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
                      Invoice No
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800">
                      Invoice Date
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-800">
                      Customer
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-800">
                      Item
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
                  {filteredHistoryInvoices.map((invoice, idx) => (
                    <tr
                      key={invoice._id}
                      className="border-b border-gray-200 hover:bg-blue-50 transition"
                    >
                      <td className="px-3 py-2 text-center text-gray-700 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-semibold text-blue-600">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {invoice.customerName}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">
                        {invoice.totalItems || invoice.items?.length || 0}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-800">
                        {invoice.totalItemQty ||
                          invoice.items?.reduce(
                            (sum, item) => sum + (item.quantity || 0),
                            0,
                          ) ||
                          0}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatNumber(invoice.subtotal || 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {formatNumber(invoice.vatAmount || 0)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-green-600">
                        {formatNumber(
                          invoice.totalIncludeVat ||
                            invoice.totalAmount ||
                            0,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              window.print();
                            }}
                            title="Print"
                            className="flex items-center justify-center gap-1 px-1.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition"
                          >
                            <Printer size={11} />
                            Print
                          </button>
                          <button
                            onClick={() => {
                              onEditInvoice(invoice);
                              onClose();
                            }}
                            title="Update"
                            className="flex items-center justify-center gap-1 px-1.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded text-xs font-medium transition"
                          >
                            <Edit2 size={11} />
                            Update
                          </button>
                          <button
                            onClick={() => {
                              onViewInvoice(invoice);
                            }}
                            title="View"
                            className="flex items-center justify-center gap-1 px-1.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded text-xs font-medium transition"
                          >
                            <Eye size={11} />
                            View
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
