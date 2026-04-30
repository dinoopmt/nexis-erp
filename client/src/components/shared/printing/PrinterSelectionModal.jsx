/**
 * Printer Selection Modal
 * Client-side: Gets printer list, submits print job
 * Server-side: Generates PDF from HTML
 * Used for LPO, GRN, RTV, and reports
 */

import React, { useState, useEffect } from 'react';
import { X, Printer as PrinterIcon, Loader } from 'lucide-react';
import { showToast } from '../AnimatedCenteredToast';
import axios from 'axios';
import { API_URL } from '../../../config/config';

const PrinterSelectionModal = ({ 
  isOpen, 
  onClose, 
  documentHtml,
  documentType,
  documentNumber,
  onPrintComplete 
}) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [orientation, setOrientation] = useState('portrait'); // portrait | landscape
  const [grayscale, setGrayscale] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  // Fetch available printers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPrinters();
    }
  }, [isOpen]);

  // Get printer list from Electron IPC (local detection only)
  const fetchPrinters = async () => {
    try {
      setIsLoadingPrinters(true);
      
      // Try Electron printer API for local detection
      if (window.electronAPI?.printer?.getPrinters) {
        try {
          const availablePrinters = await window.electronAPI.printer.getPrinters();
          console.log('✅ Printers from Electron printer API:', availablePrinters);
          
          // If printers found, use them
          if (availablePrinters && availablePrinters.length > 0) {
            setPrinters(availablePrinters);
            setSelectedPrinter(availablePrinters[0].name);
            return;
          }
        } catch (electronError) {
          console.warn('⚠️ Electron printer API failed:', electronError.message);
        }
      }

      // Try hardware API as fallback (has Windows PowerShell fallback)
      if (window.electronAPI?.hardware?.getPrinters) {
        try {
          console.log('📡 Trying hardware API...');
          const hardwareResponse = await window.electronAPI.hardware.getPrinters();
          console.log('✅ Hardware API response:', hardwareResponse);
          
          if (hardwareResponse?.debug) {
            console.log('🔍 Hardware detection debug:', hardwareResponse.debug);
          }
          
          const printerList = hardwareResponse?.printers || [];
          if (printerList && printerList.length > 0) {
            console.log('✅ Found printers via hardware API:', printerList);
            setPrinters(printerList);
            setSelectedPrinter(printerList[0].name);
            return;
          }
        } catch (hardwareError) {
          console.warn('⚠️ Hardware API failed:', hardwareError.message);
        }
      }

      // No printers detected - use defaults
      console.log('📋 No printers detected - using default printers');
      const defaultPrinters = [
        { name: 'Default Printer', displayName: 'System Default' },
        { name: 'PDF', displayName: 'Save as PDF' }
      ];
      setPrinters(defaultPrinters);
      setSelectedPrinter('Default Printer');

    } catch (error) {
      console.error('Error detecting printers:', error);
      showToast('error', 'Failed to detect printers');
      setPrinters([{ name: 'Default Printer', displayName: 'System Default' }]);
      setSelectedPrinter('Default Printer');
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  // Generate PDF on server
  const generatePdfOnServer = async () => {
    try {
      console.log('🖨️ Requesting server-side PDF generation...');
      
      // Validate HTML content
      if (!documentHtml) {
        throw new Error('Document HTML is empty or not loaded');
      }
      
      if (typeof documentHtml !== 'string') {
        throw new Error(`Invalid HTML format: expected string, got ${typeof documentHtml}`);
      }
      
      if (documentHtml.trim().length === 0) {
        throw new Error('Document HTML is empty after trimming');
      }
      
      setIsPrinting(true);
      
      console.log('📤 Sending to server:', {
        htmlSize: documentHtml.length,
        htmlType: typeof documentHtml,
        orientation,
        grayscale
      });

      const response = await axios.post(
        `${API_URL}/printer/generate-pdf`,
        {
          html: documentHtml,
          orientation: orientation,
          grayscale: grayscale,
          format: 'A4',
          margins: { top: 10, right: 10, bottom: 10, left: 10 }
        },
        {
          timeout: 60000 // 60 second timeout for PDF generation
        }
      );

      if (response.data?.success && response.data?.pdf) {
        console.log('✅ PDF generated on server:', { size: response.data.size });
        setGeneratedPdf(response.data.pdf);
        return response.data.pdf;
      } else {
        throw new Error(response.data?.message || 'PDF generation failed');
      }

    } catch (error) {
      console.error('❌ Server PDF generation failed:', error.message);
      showToast('error', `PDF generation failed: ${error.message}`);
      throw error;
    }
  };

  // Send PDF to printer via Electron
  const sendPdfToPrinterElectron = async (pdfBase64) => {
    try {
      // Check if printer API is available
      if (!window.electronAPI?.printer?.printPDF) {
        throw new Error('Electron printer API not available');
      }

      console.log('🖨️ Sending PDF to Electron printer:', selectedPrinter);

      // Create a data URL from base64
      const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

      // For now, we'll use the printHTML API to print the PDF
      // In production, you might want to save the PDF first and use printPDF
      const result = await window.electronAPI.printer.printHTML(dataUrl, selectedPrinter);

      if (result?.success) {
        showToast('success', `✅ Sent to printer: ${selectedPrinter}`);
        return true;
      } else {
        throw new Error(result?.message || 'Print failed');
      }

    } catch (error) {
      console.error('❌ Electron printing failed:', error.message);
      throw error;
    }
  };

  // Browser print fallback
  const printUsingBrowserDialog = async (pdfBase64) => {
    try {
      console.log('💻 Using browser print dialog...');
      
      // Decode base64 to blob
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      // Create object URL and open in iframe
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      
      document.body.appendChild(iframe);
      
      // Wait for iframe to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      };

      showToast('success', `Opening print dialog for: ${selectedPrinter}`);
      return true;

    } catch (error) {
      console.error('Browser print failed:', error);
      throw error;
    }
  };

  // Main print handler
  const handlePrint = async () => {
    try {
      if (!selectedPrinter) {
        showToast('warning', 'Please select a printer');
        return;
      }

      setIsPrinting(true);

      // Step 1: Generate PDF on server
      let pdf = generatedPdf;
      if (!pdf) {
        pdf = await generatePdfOnServer();
      }

      // Step 2: Try Electron printing
      if (window.electronAPI?.printer?.printHTML || window.electronAPI?.printer?.printPDF) {
        try {
          await sendPdfToPrinterElectron(pdf);
          if (onPrintComplete) onPrintComplete();
          onClose();
          return;
        } catch (electronError) {
          console.warn('⚠️ Electron printing failed, trying browser:', electronError.message);
        }
      }

      // Step 3: Fallback to browser print
      await printUsingBrowserDialog(pdf);
      if (onPrintComplete) onPrintComplete();
      onClose();

    } catch (error) {
      console.error('Print error:', error);
      showToast('error', `Print failed: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <PrinterIcon size={20} className="text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Print {documentType}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-200 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Document Info */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800">
              <strong>Document:</strong> {documentType} {documentNumber && `- ${documentNumber}`}
            </p>
          </div>

          {/* Printer Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Terminal Printer
            </label>
            {isLoadingPrinters ? (
              <div className="flex items-center justify-center p-3 bg-gray-100 rounded border">
                <Loader size={18} className="animate-spin text-gray-600 mr-2" />
                <span className="text-sm text-gray-600">Detecting printers...</span>
              </div>
            ) : (
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">-- Select a printer --</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.displayName || printer.name}
                  </option>
                ))}
              </select>
            )}
            {printers.length === 0 && !isLoadingPrinters && (
              <p className="text-xs text-amber-600 mt-1">⚠️ No printers detected on terminal</p>
            )}
          </div>

          {/* Page Orientation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Page Orientation
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="portrait"
                  checked={orientation === 'portrait'}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm text-gray-700">📄 Portrait</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="landscape"
                  checked={orientation === 'landscape'}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm text-gray-700">📋 Landscape</span>
              </label>
            </div>
          </div>

          {/* Grayscale Option */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
            <input
              type="checkbox"
              id="grayscale"
              checked={grayscale}
              onChange={(e) => setGrayscale(e.target.checked)}
              className="w-4 h-4 accent-purple-600 cursor-pointer"
            />
            <label htmlFor="grayscale" className="flex-1 text-sm text-gray-700 cursor-pointer">
              <strong>Print in Grayscale</strong>
              <p className="text-xs text-gray-600">Reduces ink usage</p>
            </label>
          </div>

          {/* Print Settings Summary */}
          <div className="bg-purple-50 border border-purple-200 rounded p-3 text-xs text-purple-800">
            <p>
              <strong>Settings:</strong> {orientation.charAt(0).toUpperCase() + orientation.slice(1)} • 
              {grayscale ? ' Grayscale' : ' Color'} • 
              {selectedPrinter ? ` ${selectedPrinter}` : ' Select printer'}
            </p>
          </div>

          {/* Generation Status */}
          {generatedPdf && (
            <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-800">
              ✅ PDF ready to print
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded font-medium hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={handlePrint}
            disabled={isPrinting || !selectedPrinter || isLoadingPrinters}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPrinting ? (
              <>
                <Loader size={18} className="animate-spin" />
                {generatedPdf ? 'Printing...' : 'Generating...'}
              </>
            ) : (
              <>
                <PrinterIcon size={18} />
                Print
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSelectionModal;
