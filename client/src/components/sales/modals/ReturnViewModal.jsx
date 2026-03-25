import React from "react";
import { Printer, X } from "lucide-react";

export default function ReturnViewModal({ viewedReturn, onClose, config, formatNumber }) {
  if (!viewedReturn) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <div className="flex justify-end p-4 border-b">
          <button
            onClick={onClose}
            className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Return Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {/* HEADER */}
          <div className="mb-8 pb-8 border-b-2 border-gray-300">
            <div className="grid grid-cols-3 gap-8">
              {/* Company Info */}
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  NEXIS ERP
                </h3>
                <p className="text-xs text-gray-600 mt-2">Dubai, UAE</p>
                <p className="text-xs text-gray-600">TRN: 123456789</p>
              </div>

              {/* Return Details */}
              <div className="text-center">
                <h1 className="text-3xl font-bold text-red-600">
                  RETURN
                </h1>
                <p className="text-sm text-gray-600 mt-2">
                  Return #:{" "}
                  <span className="font-bold">
                    {viewedReturn.returnNumber}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Date:{" "}
                  <span className="font-bold">
                    {new Date(viewedReturn.date).toLocaleDateString()}
                  </span>
                </p>
              </div>

              {/* Customer Info */}
              <div className="text-right">
                <h4 className="text-sm font-bold text-gray-800 mb-1">Bill To</h4>
                <p className="text-xs text-gray-700 font-semibold">
                  {viewedReturn.customerName}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Phone: {viewedReturn.customerPhone || "-"}
                </p>
                <p className="text-xs text-gray-600">
                  TRN: {viewedReturn.customerTRN || "-"}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Address: {viewedReturn.customerAddress || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Return Items</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 px-2 font-semibold text-gray-800">
                    Item
                  </th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-800">
                    Code
                  </th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-800">
                    Qty
                  </th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-800">
                    Unit Price
                  </th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-800">
                    Amount
                  </th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-800">
                    VAT %
                  </th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-800">
                    VAT
                  </th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-800">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {viewedReturn.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 px-2 text-gray-700">{item.itemName}</td>
                    <td className="py-2 px-2 text-center text-gray-700 text-xs bg-gray-50">
                      {item.itemcode}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {config.currency || 'AED'} {formatNumber(item.unitPrice)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {config.currency || 'AED'} {formatNumber(item.lineAmount)}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {item.vatPercentage}%
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {config.currency || 'AED'} {formatNumber(item.vatAmount)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-gray-800">
                      {config.currency || 'AED'} {formatNumber(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SUMMARY */}
          <div className="flex justify-end mb-4">
            <div className="w-64">
              <div className="flex justify-between py-1 text-xs">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-800">
                  {config.currency || 'AED'} {formatNumber(viewedReturn.subtotal || 0)}
                </span>
              </div>
              {viewedReturn.discountAmount > 0 && (
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-gray-800">
                    - {config.currency || 'AED'} {formatNumber(viewedReturn.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 text-xs">
                <span className="text-gray-600">Taxable Amount:</span>
                <span className="font-semibold text-gray-800">
                  {config.currency || 'AED'} {formatNumber(viewedReturn.totalAfterDiscount || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="text-gray-600">VAT ({viewedReturn.vatPercentage || 5}%):</span>
                <span className="font-semibold text-gray-800">
                  {config.currency || 'AED'} {formatNumber(viewedReturn.vatAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between py-2 px-2 mt-2 bg-gray-900 text-white rounded border-t-2 border-gray-400">
                <span className="font-bold">Total</span>
                <span className="font-bold text-lg">
                  {config.currency || 'AED'} {formatNumber(viewedReturn.totalIncludeVat || viewedReturn.total || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {viewedReturn.notes && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-gray-800 mb-1">Notes</h4>
              <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                {viewedReturn.notes}
              </p>
            </div>
          )}
        </div>

        {/* Print Button */}
        <div className="px-4 py-3 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition"
          >
            <Printer size={14} />
            Print Return
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded text-xs font-semibold hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
