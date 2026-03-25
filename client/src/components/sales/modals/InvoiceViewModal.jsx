import React from "react";
import { Printer, X } from "lucide-react";

export default function InvoiceViewModal({ viewedInvoice, onClose, config, formatNumber }) {
  if (!viewedInvoice) return null;

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

        {/* Invoice Content - Scrollable */}
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

              {/* Invoice Details */}
              <div className="text-center">
                <h1 className="text-3xl font-bold text-blue-600">
                  INVOICE
                </h1>
                <p className="text-sm text-gray-600 mt-2">
                  Invoice #:{" "}
                  <span className="font-bold">
                    {viewedInvoice.invoiceNumber}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Date:{" "}
                  <span className="font-bold">
                    {new Date(viewedInvoice.date).toLocaleDateString()}
                  </span>
                </p>
              </div>

              {/* QR Code Area */}
              <div className="text-right">
                <p className="text-xs text-gray-600">
                  Financial Year: {viewedInvoice.financialYear}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Status:{" "}
                  <span className="font-bold text-green-600">
                    {viewedInvoice.status || "Saved"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* CUSTOMER INFO */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            {/* Bill To */}
            <div>
              <p className="text-xs font-bold text-gray-800 mb-2">
                BILL TO:
              </p>
              <p className="text-sm font-bold text-gray-800">
                {viewedInvoice.customerName}
              </p>
              {viewedInvoice.customerAddress && (
                <p className="text-xs text-gray-600">
                  {viewedInvoice.customerAddress}
                </p>
              )}
              {viewedInvoice.customerPhone && (
                <p className="text-xs text-gray-600">
                  Phone: {viewedInvoice.customerPhone}
                </p>
              )}
              {viewedInvoice.customerTRN && (
                <p className="text-xs text-gray-600">
                  TRN: {viewedInvoice.customerTRN}
                </p>
              )}
            </div>

            {/* Summary on Right */}
            <div className="text-right">
              <p className="text-xs text-gray-600">
                Total Items:{" "}
                <span className="font-bold">
                  {viewedInvoice.totalItems || viewedInvoice.items?.length}
                </span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Total Qty:{" "}
                <span className="font-bold">
                  {viewedInvoice.totalItemQty ||
                    viewedInvoice.items?.reduce(
                      (sum, item) => sum + (item.quantity || 0),
                      0,
                    )}
                </span>
              </p>
            </div>
          </div>

          {/* ITEMS TABLE */}
          <div className="mb-8">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-200 border-b">
                  <th className="px-2 py-2 text-left">Item</th>
                  <th className="px-2 py-2 text-center">Qty</th>
                  <th className="px-2 py-2 text-right">Rate</th>
                  <th className="px-2 py-2 text-right">Discount %</th>
                  <th className="px-2 py-2 text-right">Disc Amt</th>
                  <th className="px-2 py-2 text-right">Tax %</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewedInvoice.items?.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-2">{item.itemName}</td>
                    <td className="px-2 py-2 text-center">
                      {item.quantity}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {config.currency || 'AED'} {formatNumber(item.unitPrice)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {item.discountPercentage}%
                    </td>
                    <td className="px-2 py-2 text-right">
                      {config.currency || 'AED'} {formatNumber(item.discountAmount || 0)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {item.vatPercentage}%
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {config.currency || 'AED'} {formatNumber(item.total || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER - TOTALS */}
          <div className="mb-8 pb-8 border-t-2 border-gray-300">
            <div className="grid grid-cols-3 gap-8 mt-6">
              {/* Left - Notes */}
              <div>
                <p className="text-xs font-bold text-gray-800 mb-2">
                  NOTES:
                </p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">
                  {viewedInvoice.notes || "N/A"}
                </p>
              </div>

              {/* Right - Financial Summary */}
              <div className="col-span-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">
                      {config.currency || 'AED'} {formatNumber(viewedInvoice.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      Discount ({viewedInvoice.discountPercentage || 0}%):
                    </span>
                    <span className="font-semibold text-red-600">
                      -{config.currency || 'AED'}{" "}
                      {formatNumber(viewedInvoice.discountAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      Total After Discount:
                    </span>
                    <span className="font-semibold">
                      {config.currency || 'AED'}{" "}
                      {formatNumber(viewedInvoice.totalAfterDiscount)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between text-xs">
                    <span className="text-gray-600">
                      VAT ({viewedInvoice.vatPercentage || 0}%):
                    </span>
                    <span className="font-semibold">
                      {config.currency || 'AED'} {formatNumber(viewedInvoice.vatAmount)}
                    </span>
                  </div>
                  <div className="bg-blue-100 px-4 py-3 rounded mt-4 flex justify-between">
                    <span className="font-bold text-gray-800">TOTAL:</span>
                    <span className="font-bold text-blue-600 text-lg">
                      {config.currency || 'AED'}{" "}
                      {formatNumber(
                        viewedInvoice.totalIncludeVat ||
                          viewedInvoice.totalAmount
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost & Profit Info (if available) */}
          {viewedInvoice.totalCost !== undefined && (
            <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-800 mb-3">
                Profitability Analysis:
              </p>
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-gray-600">Total Cost</p>
                  <p className="font-semibold">
                    {config.currency || 'AED'} {formatNumber(viewedInvoice.totalCost)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Gross Profit</p>
                  <p className="font-semibold text-green-600">
                    {config.currency || 'AED'} {formatNumber(viewedInvoice.grossProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Gross Margin</p>
                  <p className="font-semibold">
                    {formatNumber(viewedInvoice.grossProfitMargin)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Net Profit</p>
                  <p className="font-semibold text-green-600">
                    {config.currency || 'AED'} {formatNumber(viewedInvoice.netProfit)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Text */}
          <div className="text-center text-xs text-gray-500 mt-8 pt-8 border-t border-gray-200">
            <p>Thank you for your business!</p>
            <p className="mt-2">This is a computer-generated document</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={() => {
              window.print();
            }}
            className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded text-xs font-medium hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
