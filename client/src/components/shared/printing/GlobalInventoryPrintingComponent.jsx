/**
 * Global Inventory Printing Component
 * For LPO, GRN, RTV - documents without terminal-wise template configuration
 * Features:
 * - Custom printer selection modal
 * - Preview, Print, PDF Download
 * - Online/Offline support
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, Loader, RefreshCw } from 'lucide-react';
import { API_URL } from '../../../config/config';
import axios from 'axios';
import { useTerminal } from '../../../context/TerminalContext';
import { showToast } from '../AnimatedCenteredToast';
import PrinterSelectionModal from './PrinterSelectionModal';

const GlobalInventoryPrintingComponent = ({ documentType, documentId, documentNumber, onClose }) => {
  // documentType: 'LPO' | 'GRN' | 'RTV'
  
  const { terminalConfig, isLoading: terminalLoading } = useTerminal();
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [documentHtml, setDocumentHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const contentRef = useRef();

  // Get correct API endpoint based on documentType
  const getDocumentEndpoint = (docType = documentType) => {
    const endpointMap = {
      'LPO': '/lpo',
      'GRN': '/grn',
      'RTV': '/rtv',
    };
    return endpointMap[docType] || '/documents';
  };

  // Fetch printers from terminal config
  useEffect(() => {
    if (terminalConfig?.hardwareMapping?.availablePrinters) {
      const printerList = terminalConfig.hardwareMapping.availablePrinters;
      setPrinters(printerList);
      
      // Set default printer
      const documentPrinter = 
        terminalConfig?.hardwareMapping?.[`${documentType.toLowerCase()}Printer`]?.printerName ||
        terminalConfig?.hardwareMapping?.documentPrinter?.printerName ||
        printerList[0]?.name;
      
      setSelectedPrinter(documentPrinter);
      console.log(`✅ [${documentType} Printing] Available printers:`, printerList);
    }
  }, [terminalConfig, documentType]);

  // Fetch preview HTML
  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      const terminalId = terminalConfig?.terminalId || localStorage.getItem("terminalId") || "";
      console.log(`📄 [${documentType} Print] Fetching HTML - ID: ${documentId}`);

      // Retry logic for newly created documents
      let response;
      let lastError;
      const maxRetries = 8;
      const retryDelay = 500;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const endpoint = getDocumentEndpoint();
          response = await axios.get(`${API_URL}${endpoint}/${documentId}/html`, {
            headers: { "terminal-id": terminalId },
            responseType: "text",
          });
          
          if (!response.data || response.data.trim().length === 0) {
            throw new Error("Empty response from server");
          }
          
          console.log(`✅ [${documentType} Print] HTML fetched on attempt ${attempt} (${response.data.length} bytes)`);
          setDocumentHtml(response.data);
          setPreviewHtml('loaded');
          setError(null);
          setLoading(false);
          return;
          
        } catch (err) {
          lastError = err;
          const statusCode = err.response?.status;
          
          if (statusCode === 404 && attempt < maxRetries) {
            console.warn(`⚠️ [${documentType} Print] Attempt ${attempt}/${maxRetries} - Document not ready, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            throw err;
          }
        }
      }
      
      throw lastError;
      
    } catch (err) {
      console.error(`❌ [${documentType} Print] Error:`, err);
      const errorMsg = err.response?.data?.message || err.message || "Failed to load document";
      setError(errorMsg);
      showToast("error", `Failed to load ${documentType}: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load preview on mount
  useEffect(() => {
    if (documentId) {
      handlePreview();
    }
  }, [documentId, documentType]);

  // Handle print - Open printer selection modal
  const handlePrint = () => {
    if (!documentHtml || documentHtml.trim().length === 0) {
      showToast("error", "Document not ready for printing");
      return;
    }
    setShowPrinterModal(true);
  };

  // Handle print completion
  const handlePrintComplete = () => {
    showToast('success', `Printing ${documentType} ${documentNumber} completed`);
  };

  // Handle PDF download
  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);

      const { default: html2pdf } = await import("html2pdf.js");

      const element = document.createElement("div");
      element.innerHTML = documentHtml;

      const opt = {
        margin: 10,
        filename: `${documentType}-${documentNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      html2pdf().set(opt).from(element).save();
      showToast("success", `${documentType} PDF downloaded successfully`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showToast("error", "Failed to download PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 print:fixed print:inset-0 print:bg-white print:p-0 print:flex-none print:z-auto" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden print:rounded-none print:shadow-none print:fixed print:inset-0 print:w-full print:h-full" style={{ width: '850px', height: '95vh', maxHeight: '1200px', aspectRatio: '210 / 297' }}>
        
        {/* Header - Hidden on print */}
        <div className="flex items-center justify-between px-3 py-1 border-b bg-gradient-to-r from-blue-50 to-indigo-50 print:hidden">
          <h1 className="text-xl font-bold text-gray-800">{documentType} #{documentNumber} - Preview</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Printer Selection - Hidden on print */}
        {!loading && previewHtml && printers.length > 0 && (
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 print:hidden flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Printer:</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.displayName || printer.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 bg-red-50 border-b border-red-200 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
              <button
                onClick={handlePreview}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Preview Area - Full document only on print */}
        <div className="flex-1 overflow-auto bg-gray-200 print:bg-white print:p-0 print:overflow-visible print:m-0" style={{ padding: '12px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full w-full print:hidden">
              <div className="text-center">
                <Loader className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-gray-600">Loading {documentType}...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full w-full print:hidden">
              <div className="text-center p-8 bg-white rounded-lg">
                <p className="text-gray-600 text-lg mb-2">❌ Failed to Load</p>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            </div>
          ) : previewHtml ? (
            <div className="relative bg-white shadow-lg print:shadow-none print:relative print:bg-white print:w-full print:h-auto" style={{ 
              width: '210mm', 
              minHeight: '297mm',
              overflow: 'visible',
              flexShrink: 0
            }}>
              <iframe
                ref={contentRef}
                srcDoc={documentHtml}
                className="w-full border-0 print:border-0 print:w-full print:h-auto"
                title={`${documentType} Preview`}
                style={{ 
                  display: 'block', 
                  background: '#fff',
                  margin: 0, 
                  padding: 0,
                  border: 'none',
                  height: '100%',
                  minHeight: '297mm'
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full w-full print:hidden">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Hidden on print */}
        {!loading && previewHtml && (
          <div className="border-t bg-white px-3 py-2 flex items-center justify-end gap-3 flex-wrap print:hidden">
            {pdfLoading && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <Loader size={14} className="animate-spin" />
                <span>Preparing PDF...</span>
              </div>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pdfLoading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfLoading ? 'PDF Preparing...' : 'Download PDF'}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        )}
      </div>

      {/* ✅ Printer Selection Modal with orientation & grayscale options */}
      <PrinterSelectionModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
        documentHtml={documentHtml}
        documentType={documentType}
        documentNumber={documentNumber}
        onPrintComplete={handlePrintComplete}
      />
    </div>
  );
};

export default GlobalInventoryPrintingComponent;
