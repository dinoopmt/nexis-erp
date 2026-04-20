import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { useTerminalPrinter, useTerminal } from '../../../context/TerminalContext';
import * as SmartPrintService from '../../../services/SmartPrintService';

/**
 * Invoice Preview Modal
 * Shows invoice preview with print and download options
 * Print routes to terminal-mapped printer (or browser print dialog)
 */
export default function InvoicePreviewModal({ 
  isOpen, 
  onClose, 
  invoiceData, 
  company,
  formatCurrency,
  round 
}) {
  const printRef = useRef(null);
  const terminalPrinter = useTerminalPrinter('invoicePrinter');

  if (!isOpen || !invoiceData) return null;

  // ========================================
  // CALCULATE TOTALS
  // ========================================
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let total = 0;

    invoiceData.items?.forEach(item => {
      const itemSubtotal = round(item.qty * item.rate);
      subtotal += itemSubtotal;
      
      const itemDiscount = item.itemDiscountAmount || 0;
      totalDiscount += itemDiscount;
      
      const itemTaxBase = round(itemSubtotal - itemDiscount);
      const itemTax = round(itemTaxBase * (item.tax / 100));
      totalTax += itemTax;
      
      total += round(itemTaxBase + itemTax);
    });

    // Apply invoice-level discount
    const invoiceDiscount = invoiceData.discountAmount || 0;
    totalDiscount += invoiceDiscount;
    total -= invoiceDiscount;

    return {
      subtotal: round(subtotal),
      totalDiscount: round(totalDiscount),
      totalTax: round(totalTax),
      total: round(total),
      itemCount: invoiceData.items?.length || 0,
    };
  };

  const totals = calculateTotals();

  // ========================================
  // HANDLE BROWSER PRINT
  // ========================================
  const handleBrowserPrint = () => {
    printRef.current?.print?.() || window.print();
  };

  // ========================================
  // HANDLE TERMINAL PRINT
  // ========================================
  const handleTerminalPrint = async () => {
    if (!terminalPrinter?.enabled) {
      console.warn('⚠️ Terminal printer not configured');
      // Fallback to browser print
      handleBrowserPrint();
      return;
    }

    try {
      console.log('📡 Sending to terminal printer:', terminalPrinter.printerName);
      
      // Get HTML content
      const printContent = printRef.current?.innerHTML || document.querySelector('[data-invoice-print]')?.innerHTML;
      
      if (!printContent) {
        console.error('❌ No print content found');
        handleBrowserPrint();
        return;
      }

      // Use SmartPrintService.printInvoice to send to terminal printer
      const response = await SmartPrintService.printInvoice(
        {
          id: invoiceData.invoiceNo,
          content: printContent,
        },
        terminalPrinter,
        { showDialog: false, documentType: 'invoice' }
      );

      if (response.success) {
        console.log('✅ Invoice sent to terminal printer');
        // Optional: Show success toast/notification
      } else {
        console.warn('⚠️ Print job may not have completed:', response.reason);
        // Fallback to browser print
        handleBrowserPrint();
      }
    } catch (error) {
      console.error('❌ Error sending to terminal printer:', error);
      // Fallback to browser print
      handleBrowserPrint();
    }
  };

  // ========================================
  // HANDLE DOWNLOAD PDF
  // ========================================
  const handleDownloadPDF = () => {
    try {
      const element = printRef.current;
      if (!element) {
        console.error('❌ Print element not found');
        return;
      }

      // Create canvas from HTML
      const opt = {
        margin: 10,
        filename: `invoice-${invoiceData.invoiceNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      // Dynamic import of html2pdf for PDF generation
      import('html2pdf.js').then((html2pdf) => {
        html2pdf.default().set(opt).from(element).save();
      }).catch(error => {
        console.error('❌ Error generating PDF:', error);
        // Fallback: Use browser print to PDF
        handleBrowserPrint();
      });
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      handleBrowserPrint();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h2 className="text-xl font-bold">Invoice Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            ref={printRef}
            data-invoice-print
            className="bg-white p-8 border border-gray-300"
            style={{ minHeight: '600px' }}
          >
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold">{company?.name || 'Company Name'}</h1>
                <p className="text-gray-600">{company?.address || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">INVOICE</p>
                <p className="text-gray-600">#{invoiceData.invoiceNo}</p>
                <p className="text-gray-600">{invoiceData.invoiceDate}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="font-semibold text-gray-700 mb-2">BILL TO:</p>
                <p className="font-bold">{invoiceData.partyName || 'Customer Name'}</p>
                <p className="text-gray-600">{invoiceData.partyPhone || ''}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-700 mb-2">Invoice Details:</p>
                <p><span className="font-semibold">Invoice Date:</span> {invoiceData.invoiceDate}</p>
                <p><span className="font-semibold">Payment Type:</span> {invoiceData.paymentType || 'N/A'}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8 border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-2 text-left">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Amount</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Tax %</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Tax</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items?.map((item, idx) => {
                  const itemAmount = round(item.qty * item.rate);
                  const itemTax = round(itemAmount * (item.tax / 100));
                  const itemTotal = round(itemAmount + itemTax);

                  return (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-4 py-2">{item.itemName}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{item.qty}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.rate)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(itemAmount)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{item.tax}%</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(itemTax)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold">{formatCurrency(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between py-2 border-b text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(totals.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span>Tax:</span>
                  <span>{formatCurrency(totals.totalTax)}</span>
                </div>
                <div className="flex justify-between py-2 text-xl font-bold text-blue-600">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div className="mb-8">
                <p className="font-semibold text-gray-700 mb-2">Notes:</p>
                <p className="text-gray-600 text-sm">{invoiceData.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-4 text-center text-gray-600 text-xs">
              <p>Thank you for your business!</p>
              <p>This is an electronically generated invoice</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50">
          {terminalPrinter?.enabled ? (
            <>
              <button
                onClick={handleTerminalPrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Printer size={18} />
                Print to Terminal
              </button>
              <button
                onClick={handleBrowserPrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
              >
                <Printer size={18} />
                Browser Print
              </button>
            </>
          ) : (
            <button
              onClick={handleBrowserPrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Printer size={18} />
              Print
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
