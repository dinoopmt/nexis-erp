import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, Loader, CheckCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { API_URL } from '../../../config/config';
import axios from 'axios';
import { useTerminal } from '../../../context/TerminalContext';
import { showToast } from '../../shared/AnimatedCenteredToast';
import ClientPdfGeneratorService from '../../../services/ClientPdfGeneratorService'; // ✅ Client-side PDF

const InvoicePrintingComponent = ({ invoiceId, onClose }) => {
  const { terminalConfig, isLoading: terminalLoading, error: terminalError } = useTerminal();
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [invoiceHtml, setInvoiceHtml] = useState(''); // ✅ Store invoice HTML for preview
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false); // ✅ Track PDF generation separately
  const [error, setError] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [lastTerminalId, setLastTerminalId] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine); // ✅ Track online status
  const [pdfSource, setPdfSource] = useState(''); // ✅ Track if 'server' or 'client'
  const contentRef = useRef();

  // ✅ OPTIMIZATION: No refetch needed - terminal config is cached in localStorage
  // When terminal changes, the TerminalContext will auto-update with cached or freshly-fetched config
  // This effect is NO LONGER NEEDED - removed to prevent unnecessary API calls
  useEffect(() => {
    const currentTerminalId = terminalConfig?.terminalId;
    
    // Just track terminal changes - don't force refetch
    if (currentTerminalId && currentTerminalId !== lastTerminalId) {
      console.log('🔄 Terminal switched from', lastTerminalId, 'to', currentTerminalId);
      setLastTerminalId(currentTerminalId);
      console.log('📂 Using cached terminal config for:', currentTerminalId);
    }
  }, [terminalConfig?.terminalId, lastTerminalId]);

  // ✅ OPTIMIZATION: No refetch needed - terminal config is cached in localStorage
  // Config is loaded on app startup and cached per terminal ID in localStorage
  // Modal will use cached config - no fresh API calls needed
  useEffect(() => {
    console.log('📂 Invoice modal opened - using cached terminal config');
    // Config already available from app startup or app context
  }, [invoiceId]); // Run when modal opens

  // Extract template ID from terminal config
  useEffect(() => {
    if (terminalLoading) {
      console.log('⏳ Waiting for terminal config...');
      return;
    }

    if (terminalError) {
      console.error('❌ Terminal config error:', terminalError);
      setError(terminalError);
      setTemplateLoading(false);
      return;
    }

    if (!terminalConfig) {
      console.warn('⚠️ Terminal config not available');
      setError('Terminal configuration not available');
      setTemplateLoading(false);
      return;
    }

    // Get template ID from terminal's format mapping
    const invoiceTemplateId = terminalConfig?.formatMapping?.invoice?.templateId;
    
    if (invoiceTemplateId) {
      console.log('✅ Template ID from terminal config:', invoiceTemplateId);
      // Only update if templateId actually changed
      if (templateId !== invoiceTemplateId) {
        console.log('🔄 Template ID changed! Updating preview...');
        setTemplateId(invoiceTemplateId);
      }
      setError(null);
    } else {
      console.warn('⚠️ No invoice template ID configured in terminal');
      setError('No invoice template configured for this terminal');
    }

    setTemplateLoading(false);
  }, [terminalConfig, terminalLoading, terminalError, templateId]);

  // Clear preview when templateId changes (to show loading state for new template)
  useEffect(() => {
    if (templateId) {
      console.log('🔄 Template changed - clearing old preview for:', templateId);
      setPreviewHtml(''); // Clear old preview to show loading state
    }
  }, [templateId]);

  // Fetch preview whenever invoice ID or templateId changes
  useEffect(() => {
    if (!invoiceId || !templateId || templateLoading) {
      if (!invoiceId) {
        console.warn('⚠️ No invoiceId provided to InvoicePrintingComponent');
        setError('No invoice ID provided');
      }
      if (!templateId) {
        console.warn('⚠️ No templateId available yet', { templateLoading, templateId });
      }
      return;
    }
    console.log('🔄 [Effect] Calling handlePreview - invoiceId or templateId changed');
    handlePreview();
  }, [invoiceId, templateId]);

  // ✅ Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ Fetch PDF with hybrid approach (server-side Puppeteer, fallback to client-side)
  const handlePreview = async () => {
    try {
      console.log(`\n========== HANDLE PREVIEW CALLED ==========`);
      setLoading(true);
      setError(null);
      setPdfBlob(null); // Clear old PDF

      console.log('📥 Fetching invoice with templateId:', templateId);

      const terminalId = terminalConfig?.terminalId;
      console.log('📥 Terminal ID:', terminalId);
      
      try {
        // ✅ STEP 1: Fetch invoice HTML for preview - SHOW IMMEDIATELY
        console.log('📄 [Server] Fetching invoice HTML...');
        console.log(`   Terminal ID: ${terminalId}`);
        console.log(`   Template ID: ${templateId}`);
        console.log(`   Invoice ID: ${invoiceId}`);
        const htmlResponse = await axios.get(
          `${API_URL}/invoices/${invoiceId}/html`,
          {
            params: { templateId, terminalId }
          }
        );
        
        const invoiceHtmlContent = htmlResponse.data;
        setInvoiceHtml(invoiceHtmlContent);
        setPreviewHtml('loaded'); // Signal preview is ready
        console.log('✅ Invoice HTML fetched - Preview shown');
        
        setLoading(false);
        return;

      } catch (serverErr) {
        console.warn('⚠️ Server fetch failed:', serverErr.message);
        
        // Fallback: Show error or use simple HTML
        setInvoiceHtml(`
          <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
            <h1>Invoice #${invoiceId.substring(0, 8)}</h1>
            <p style="color: #666;">Generated: ${new Date().toLocaleDateString()}</p>
            <p style="margin-top: 20px; color: #999;">
              ⚠️ Could not load full invoice details.<br/>
              Server is temporarily unavailable.
            </p>
          </div>
        `);
        setPreviewHtml('loaded');
        
        setError('Could not load full invoice HTML');
        showToast('warning', '⚠️ Showing basic invoice');
        setLoading(false);
      }
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load invoice';
      setError(errorMsg);
      console.error('❌ Invoice error:', err);
      showToast('error', errorMsg);
      setLoading(false);
    }
  };

  // ✅ Download PDF (already generated and stored in pdfBlob)
  const handleDownloadPdf = async () => {
    try {
      // ✅ Generate PDF on-demand when user clicks Download
      console.log('📄 User clicked Download PDF - generating on-demand...');
      setPdfLoading(true);

      const pdfResponse = await axios.post(
        `${API_URL}/invoices/${invoiceId}/generate-pdf`,
        {},
        {
          params: { templateId, terminalId: terminalConfig.terminalId, _t: Date.now() },
          responseType: 'blob'
        }
      );

      const blob = pdfResponse.data;
      setPdfBlob(blob);
      setPdfSource('server');
      console.log('✅ PDF generated on-demand');

      const fileName = `Invoice_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // ✅ Use blob download for all cases (works in both Electron and browser)
      // No file dialogs, auto-downloads to Downloads folder in Electron
      downloadViaBlob(blob, fileName);
    } catch (err) {
      const errorMsg = err.message || 'Failed to download PDF';
      setError(errorMsg);
      console.error('❌ Download error:', err);
      showToast('error', errorMsg);
    } finally {
      setPdfLoading(false);
    }
  };

  // Helper function for browser-based blob download
  const downloadViaBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ PDF downloaded successfully');
    showToast('success', 'PDF downloaded successfully');
  };

  // Print functionality with simple ref
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: `Invoice_${new Date().toISOString().split('T')[0]}`,
    onBeforePrint: () => {
      console.log('🖨️ Print dialog opening...');
    },
    onAfterPrint: () => {
      console.log('✅ Print completed');
    },
    onPrintError: (error) => {
      console.error('❌ Print error:', error);
      showToast('error', 'Failed to print invoice');
    },
  });

  // ✅ BEST APPROACH: A4 Silent Print using HTML rendering (ERP Production Standard)
  const handlePrintSafe = async () => {
    try {
      if (!invoiceId) {
        showToast('error', '❌ Invoice ID not available');
        return;
      }

      // Get configuration from terminal settings
      const printerName = terminalConfig?.hardwareMapping?.invoicePrinter?.printerName;
      const terminalId = terminalConfig?.terminalId;  // ✅ Extract terminalId from config
      console.log('🖨️ Starting A4 silent print...');
      console.log(`   Invoice: ${invoiceId}`);
      console.log(`   Template: ${templateId}`);
      console.log(`   Terminal: ${terminalId}`);
      console.log(`   Printer: ${printerName || 'DEFAULT'}`);
      
      // Check if Electron API is available
      if (!window.electronAPI?.pdf?.printInvoiceA4Silent) {
        console.error('❌ Electron API not available');
        showToast('error', '❌ Print only available in Electron app. Please download PDF and print manually.');
        return;
      }

      // Call new A4 silent print handler (uses BrowserWindow + HTML rendering)
      const result = await window.electronAPI.pdf.printInvoiceA4Silent(
        invoiceId,
        templateId,
        terminalId,  // ✅ ADD: Pass terminalId for store-specific header
        printerName || 'default', // Pass printer name (system will use default if exact match not found)
        API_URL
      );
      
      if (result.success) {
        console.log('✅ Print job sent successfully');
        showToast('success', `🖨️ Invoice printing on ${printerName || 'default printer'}...`);
        
        // Close modal after brief delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(result.message || 'Print failed');
      }
    } catch (error) {
      console.error('❌ Print error:', error);
      showToast('error', '❌ Failed to print. Please download PDF and print manually.');
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 print:bg-white print:inset-auto print:p-0 print:flex-none">
      <div className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden print:rounded-none print:shadow-none" style={{ width: '850px', height: '95vh', maxHeight: '1200px', aspectRatio: '210 / 297' }}>
        {/* Header - Hidden in print */}
        <div className="flex items-center justify-between px-3 py-1 border-b bg-gradient-to-r from-blue-50 to-indigo-50 print:hidden">
          <h1 className="text-xl font-bold text-gray-800">Invoice Preview</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading Terminal Config - Hidden in print */}
        {(terminalLoading || templateLoading) && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 flex items-center gap-3 print:hidden">
            <Loader size={18} className="animate-spin text-blue-500" />
            <p className="text-blue-700 text-sm">Loading terminal configuration...</p>
          </div>
        )}

        {/* Template Error - Hidden in print */}
        {!templateLoading && error && !previewHtml && (
          <div className="p-4 bg-red-50 border-b border-red-200 print:hidden">
            <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Preview Area - A4 Fit */}
        <div className="flex-1 overflow-y-auto bg-gray-50 print:p-0 print:bg-white print:overflow-visible" style={{ padding: '8px' }}>
          {terminalLoading || templateLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-gray-600">Loading terminal configuration...</p>
              </div>
            </div>
          ) : !templateId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-white rounded-lg">
                <p className="text-gray-600 text-lg mb-2">❌ Template Not Configured</p>
                <p className="text-gray-500 text-sm">
                  Please configure an invoice template for this terminal in Terminal Settings
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader className="animate-spin mx-auto mb-2" size={32} />
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          ) : previewHtml ? (
            // ✅ Display invoice HTML in an iframe
            <iframe
              ref={contentRef}
              srcDoc={invoiceHtml}
              className="w-full h-full border-0 print:border-0"
              title="Invoice Preview"
              style={{ display: 'block', background: '#fff', margin: 0, padding: 0 }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Action Buttons Panel - Fixed at Bottom, Hidden in print */}
        {!templateLoading && templateId && (
          <div className="border-t bg-white px-3 py-2 flex items-center justify-end gap-3 flex-wrap">
            {/* Error Message */}
            {error && previewHtml && (
              <div className="flex-1 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            {/* PDF Loading Status */}
            {previewHtml && pdfLoading && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <Loader size={14} className="animate-spin" />
                <span>Preparing PDF...</span>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={loading || pdfLoading || !previewHtml}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pdfLoading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfLoading ? 'PDF Preparing...' : 'Download PDF'}
            </button>

            {/* Print Button - No need to wait for PDF, HTML is ready */}
            <button
              onClick={handlePrintSafe}
              disabled={loading || !previewHtml}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              {loading ? 'Loading...' : 'Print Invoice'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePrintingComponent;
