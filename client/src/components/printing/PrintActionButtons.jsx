/**
 * PrintActionButtons Component
 * 
 * Provides UI buttons for A4 Invoice and Thermal Receipt printing
 * Shows printer status and loading state
 * 
 * Props:
 * - invoiceId (required): Invoice MongoDB ObjectId
 * - templateId (required): Template MongoDB ObjectId  
 * - terminalId (optional): Terminal ID for auto-detection
 * - documentType (optional): Document type (default: SALES_INVOICE)
 * - onPrintSuccess (optional): Callback after successful print
 * - onPrintError (optional): Callback on print error
 * - compact (optional): Show compact button layout (default: false)
 */

import React, { useState, useEffect } from 'react';
import usePrint from '../../hooks/usePrint';

export const PrintActionButtons = ({
  invoiceId,
  templateId,
  terminalId = null,
  documentType = 'SALES_INVOICE',
  onPrintSuccess = null,
  onPrintError = null,
  compact = false,
}) => {
  const {
    printA4Invoice,
    printThermalReceipt,
    getTerminalPrinterConfig,
    loading,
    error,
    successMessage,
    setError,
    setSuccessMessage,
  } = usePrint();

  const [printerConfig, setPrinterConfig] = useState(null);
  const [printingType, setPrintingType] = useState(null); // 'a4' or 'thermal'

  // Load printer config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (terminalId) {
        try {
          const config = await getTerminalPrinterConfig(terminalId);
          setPrinterConfig(config);
        } catch (err) {
          console.warn('Could not load printer config:', err.message);
        }
      }
    };
    loadConfig();
  }, [terminalId, getTerminalPrinterConfig]);

  /**
   * Handle A4 Invoice Print
   */
  const handlePrintA4 = async () => {
    if (!invoiceId) {
      setError('Invoice not yet saved. Please save invoice first.');
      return;
    }

    try {
      setPrintingType('a4');
      await printA4Invoice(invoiceId, templateId, documentType, terminalId);
      setSuccessMessage('✅ A4 invoice sent to printer');
      onPrintSuccess?.('a4');
    } catch (err) {
      setError(err.message);
      onPrintError?.('a4', err);
    } finally {
      setPrintingType(null);
    }
  };

  /**
   * Handle Thermal Receipt Print
   */
  const handlePrintThermal = async () => {
    if (!invoiceId) {
      setError('Invoice not yet saved. Please save invoice first.');
      return;
    }

    try {
      setPrintingType('thermal');
      await printThermalReceipt(invoiceId, templateId, documentType, terminalId);
      setSuccessMessage('✅ Thermal receipt sent to printer');
      onPrintSuccess?.('thermal');
    } catch (err) {
      setError(err.message);
      onPrintError?.('thermal', err);
    } finally {
      setPrintingType(null);
    }
  };

  // Disable if no invoice
  const isDisabled = !invoiceId || loading;

  if (compact) {
    return (
      <div className="flex gap-2">
        {/* A4 Print Button */}
        <button
          onClick={handlePrintA4}
          disabled={isDisabled || !printerConfig?.a4Printer.enabled}
          className={`px-3 py-2 rounded text-sm font-medium transition ${
            isDisabled || !printerConfig?.a4Printer.enabled
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          title={!printerConfig?.a4Printer.enabled ? 'A4 printer not configured' : 'Print A4 Invoice'}
        >
          {printingType === 'a4' ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">⏳</span> Printing A4...
            </span>
          ) : (
            <span>📄 A4</span>
          )}
        </button>

        {/* Thermal Print Button */}
        <button
          onClick={handlePrintThermal}
          disabled={isDisabled || !printerConfig?.thermalPrinter.enabled}
          className={`px-3 py-2 rounded text-sm font-medium transition ${
            isDisabled || !printerConfig?.thermalPrinter.enabled
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600'
          }`}
          title={!printerConfig?.thermalPrinter.enabled ? 'Thermal printer not configured' : 'Print Thermal Receipt'}
        >
          {printingType === 'thermal' ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">⏳</span> Printing...
            </span>
          ) : (
            <span>🧾 Thermal</span>
          )}
        </button>
      </div>
    );
  }

  // Full layout
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b pb-3">
        <h3 className="text-lg font-semibold">🖨️ Print Options</h3>
        {printerConfig && (
          <p className="text-xs text-gray-600 mt-1">
            A4: {printerConfig.a4Printer.printerName || 'Not configured'} • 
            Thermal: {printerConfig.thermalPrinter.printerName || 'Not configured'}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">❌ {error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Print Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {/* A4 Print Card */}
        <div className={`border rounded p-4 transition ${
          printerConfig?.a4Printer.enabled ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="text-2xl mb-2">📄</div>
          <h4 className="font-semibold text-blue-900 mb-2">A4 Invoice</h4>
          <p className="text-xs text-gray-600 mb-4">Standard invoice PDF with pagination and design</p>
          <button
            onClick={handlePrintA4}
            disabled={isDisabled || !printerConfig?.a4Printer.enabled}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              isDisabled || !printerConfig?.a4Printer.enabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {printingType === 'a4' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Printing...
              </span>
            ) : (
              'Print A4'
            )}
          </button>
          {printerConfig?.a4Printer.printerName && (
            <p className="text-xs text-blue-600 mt-2">▸ {printerConfig.a4Printer.printerName}</p>
          )}
        </div>

        {/* Thermal Print Card */}
        <div className={`border rounded p-4 transition ${
          printerConfig?.thermalPrinter.enabled ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'
        }`}>
          <div className="text-2xl mb-2">🧾</div>
          <h4 className="font-semibold text-orange-900 mb-2">Thermal Receipt</h4>
          <p className="text-xs text-gray-600 mb-4">Supermarket POS thermal format (58/80mm)</p>
          <button
            onClick={handlePrintThermal}
            disabled={isDisabled || !printerConfig?.thermalPrinter.enabled}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              isDisabled || !printerConfig?.thermalPrinter.enabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}
          >
            {printingType === 'thermal' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Printing...
              </span>
            ) : (
              'Print Thermal'
            )}
          </button>
          {printerConfig?.thermalPrinter.printerName && (
            <p className="text-xs text-orange-600 mt-2">▸ {printerConfig.thermalPrinter.printerName}</p>
          )}
        </div>
      </div>

      {/* Disabled State Message */}
      {!invoiceId && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded text-sm">
          ⚠️ Save invoice first to enable printing
        </div>
      )}
    </div>
  );
};

export default PrintActionButtons;
