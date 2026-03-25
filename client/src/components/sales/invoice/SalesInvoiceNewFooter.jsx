/**
 * SalesInvoiceNewFooter Component
 * Footer section: Notes, Summary, Totals, Save/Print buttons
 */

import React from "react";
import { Save, Printer } from "lucide-react";

const SalesInvoiceNewFooter = ({
  invoiceData,
  totals,
  config,
  loading,
  decimalPlaces,
  getInputStep,
  formatNumber,
  onNotesChange,
  onDiscountChange,
  onDiscountAmountChange,
  onSave,
  onPrint,
}) => {
  return (
    <div className="flex-shrink-0 bg-white border-t shadow-lg z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Notes */}
          <div className="flex-1 max-w-md">
            <textarea
              rows="2"
              name="notes"
              value={invoiceData.notes ?? ""}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notes / Remarks..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Summary Row */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-xs">
              {/* Items Count */}
              <div className="text-center">
                <p className="text-gray-400 text-xs">Items</p>
                <p className="font-bold text-gray-800">
                  {invoiceData.items.length}
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>

              {/* Subtotal */}
              <div className="text-center">
                <p className="text-gray-400 text-xs">Subtotal</p>
                <p className="font-semibold text-gray-700">
                  {config.currency || 'AED'} {totals.subtotal}
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>

              {/* Discount % */}
              <div className="text-center">
                <p className="text-gray-400 text-xs">Discount</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={getInputStep()}
                    min="0"
                    name="discount"
                    value={invoiceData.discount ?? 0}
                    onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                    className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-gray-400 text-xs">%</span>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200"></div>

              {/* Discount Amount */}
              <div className="text-center">
                <p className="text-gray-400 text-xs">Disc Amt</p>
                <input
                  type="number"
                  inputMode="decimal"
                  step={getInputStep()}
                  min="0"
                  name="discountAmount"
                  value={invoiceData.discountAmount ?? 0}
                  onChange={(e) => onDiscountAmountChange(parseFloat(e.target.value) || 0)}
                  className="w-12 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="h-8 w-px bg-gray-200"></div>

              {/* Tax */}
              <div className="text-center group relative">
                <p className="text-gray-400 text-xs">{totals.taxLabel}</p>
                <p className="font-semibold text-gray-700">
                  {config.currency || 'AED'} {totals.tax}
                </p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                  {totals.taxLabel} @ {totals.taxRate}%
                  {totals.taxBreakdown && (
                    <>
                      <br />
                      CGST @ {formatNumber(totals.taxBreakdown.cgst)}%
                      <br />
                      SGST @ {formatNumber(totals.taxBreakdown.sgst)}%
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Grand Total */}
            <div className="bg-gray-900 text-white px-4 py-2 rounded-lg">
              <p className="text-gray-400 text-[10px]">Grand Total</p>
              <p className="text-base font-bold text-green-400">
                {config.currency || 'AED'} {totals.total}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSave}
                disabled={loading}
              >
                <Save size={14} /> {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={onPrint}
                disabled={loading}
                className="flex items-center gap-1.5 bg-purple-600 text-white px-3 py-2.5 rounded text-xs font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={14} />
                {loading ? "Saving..." : "Save & Print"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceNewFooter;
