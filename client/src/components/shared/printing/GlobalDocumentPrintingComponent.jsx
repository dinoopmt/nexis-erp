/**
 * GlobalDocumentPrintingComponent
 * 
 * Universal printing component for all sales documents (Invoice, Quotation, Order, Delivery, Return)
 * 
 * Features:
 * - Terminal-mapped template: formatMapping?.[documentType]?.templateId
 * - Terminal-mapped printer: hardwareMapping?.documentPrinter?.printerName
 * - Preview, Print, PDF Download
 * - Server-side PDF with client-side fallback
 * - Online/Offline support
 * 
 * Usage:
 * <GlobalDocumentPrintingComponent 
 *   documentType="INVOICE|QUOTATION|SALES_ORDER|DELIVERY_NOTE|SALES_RETURN"
 *   documentId={invoiceId}
 *   onClose={handleClose}
 * />
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, Loader, CheckCircle, RefreshCw } from 'lucide-react';
import { API_URL } from '../../../config/config';
import axios from 'axios';
import { useTerminal } from '../../../context/TerminalContext';
import { showToast } from '../AnimatedCenteredToast';
import ClientPdfGeneratorService from '../../../services/ClientPdfGeneratorService';

const GlobalDocumentPrintingComponent = ({ documentType, documentId, onClose }) => {
  // documentType: 'INVOICE' | 'QUOTATION' | 'SALES_ORDER' | 'DELIVERY_NOTE' | 'SALES_RETURN'
  
  const { terminalConfig, isLoading: terminalLoading, error: terminalError } = useTerminal();
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [documentHtml, setDocumentHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [lastTerminalId, setLastTerminalId] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pdfSource, setPdfSource] = useState('');
  const contentRef = useRef();

  // ✅ Clear terminal config cache and refresh
  const handleRefreshTerminalConfig = () => {
    try {
      const terminalId = terminalConfig?.terminalId;
      if (terminalId) {
        // Clear the cached terminal config from localStorage
        const cacheKey = `terminalConfig_${terminalId}`;
        localStorage.removeItem(cacheKey);
        console.log('🔄 Cleared terminal config cache');
        
        // Reload the page to fetch fresh config
        window.location.reload();
      }
    } catch (err) {
      console.error('❌ Failed to refresh config:', err);
      showToast('error', 'Failed to refresh terminal config');
    }
  };

  // Get correct API endpoint based on documentType
  const getDocumentEndpoint = (docType = documentType) => {
    const endpointMap = {
      'INVOICE': '/invoices',
      'QUOTATION': '/quotations',
      'SALES_ORDER': '/sales-orders',
      'DELIVERY_NOTE': '/delivery-notes',
      'SALES_RETURN': '/sales-returns',
      'GRN': '/grn',
      'RTV': '/rtv',
      'LPO': '/lpo',
    };
    return endpointMap[docType] || '/documents';
  };

  // Get printer name from terminal config based on documentType
  const getPrinterName = (docType = documentType) => {
    const printerMap = {
      'INVOICE': terminalConfig?.hardwareMapping?.invoicePrinter?.printerName,
      'QUOTATION': terminalConfig?.hardwareMapping?.quotationPrinter?.printerName,
      'SALES_ORDER': terminalConfig?.hardwareMapping?.salesOrderPrinter?.printerName,
      'DELIVERY_NOTE': terminalConfig?.hardwareMapping?.deliveryNotePrinter?.printerName,
      'SALES_RETURN': terminalConfig?.hardwareMapping?.salesReturnPrinter?.printerName,
      'GRN': terminalConfig?.hardwareMapping?.grnPrinter?.printerName,
      'RTV': terminalConfig?.hardwareMapping?.rtvPrinter?.printerName,
      'LPO': terminalConfig?.hardwareMapping?.lpoPrinter?.printerName,
    };
    // Try document-specific printer first, fallback to generic documentPrinter
    return printerMap[docType] || terminalConfig?.hardwareMapping?.documentPrinter?.printerName;
  };

  // Map documentType to the correct key in formatMapping
  const getFormatMappingKey = (docType = documentType) => {
    const typeMap = {
      'INVOICE': 'invoice',
      'QUOTATION': 'quotation',
      'SALES_ORDER': 'salesOrder',
      'DELIVERY_NOTE': 'deliveryNote',
      'SALES_RETURN': 'salesReturn',
      'GRN': 'grn',
      'RTV': 'rtv',
      'LPO': 'lpo',
    };
    return typeMap[docType] || docType.toLowerCase();
  };

  // Track terminal changes
  useEffect(() => {
    const currentTerminalId = terminalConfig?.terminalId;
    
    if (currentTerminalId && currentTerminalId !== lastTerminalId) {
      console.log(`🔄 Terminal switched from ${lastTerminalId} to ${currentTerminalId}`);
      setLastTerminalId(currentTerminalId);
      console.log(`📂 Using cached terminal config for: ${currentTerminalId}`);
    }
  }, [terminalConfig?.terminalId, lastTerminalId]);

  // Modal opened - using cached config
  useEffect(() => {
    console.log(`📂 ${documentType} preview modal opened - using cached terminal config`);
  }, [documentId, documentType]);

  // Extract template ID from terminal config based on documentType
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
    // Example: formatMapping.invoice.templateId or formatMapping.quotation.templateId
    const mappingKey = getFormatMappingKey();
    const docTemplateId = terminalConfig?.formatMapping?.[mappingKey]?.templateId;
    
    if (docTemplateId) {
      console.log(`✅ Template ID from terminal config (${documentType}):`, docTemplateId);
      if (templateId !== docTemplateId) {
        console.log(`🔄 Template ID changed! Updating preview...`);
        setTemplateId(docTemplateId);
      }
      setError(null);
    } else {
      console.warn(`⚠️ No ${documentType} template ID configured in terminal`);
      setError(`No ${documentType} template configured for this terminal`);
    }

    setTemplateLoading(false);
  }, [terminalConfig, terminalLoading, terminalError, documentType]);

  // Clear preview when templateId changes
  useEffect(() => {
    if (templateId) {
      console.log(`🔄 Template changed - clearing old preview for: ${templateId}`);
      setPreviewHtml('');
    }
  }, [templateId]);

  // Fetch preview whenever document ID or templateId changes
  useEffect(() => {
    if (!documentId || !templateId) {
      if (!documentId) {
        console.warn(`⚠️ No ${documentType} ID provided to GlobalDocumentPrintingComponent`);
        setError(`No ${documentType} ID provided`);
      }
      // Only warn about missing templateId if we're NOT still loading the template
      if (!templateId && !templateLoading) {
        console.warn(`⚠️ Template failed to load for ${documentType}`);
        setError(`Template configuration not found for ${documentType}`);
      }
      return;
    }
    console.log(`🔄 [Effect] Calling handlePreview - ${documentType}Id or templateId changed`);
    handlePreview();
  }, [documentId, templateId, documentType, templateLoading]);

  // Online/Offline listener
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

  // Fetch preview with hybrid PDF approach
  const handlePreview = async () => {
    try {
      console.log(`\n========== HANDLE PREVIEW CALLED (${documentType}) ==========`);
      setLoading(true);
      setError(null);
      setPdfBlob(null);

      console.log(`📥 Fetching ${documentType} with templateId:`, templateId);

      const terminalId = terminalConfig?.terminalId;
      console.log('📥 Terminal ID:', terminalId);
      
      try {
        // STEP 1: Fetch document HTML for preview - SHOW IMMEDIATELY
        console.log(`📄 [Server] Fetching ${documentType} HTML...`);
        console.log(`   Terminal ID: ${terminalId}`);
        console.log(`   Template ID: ${templateId}`);
        console.log(`   Document ID: ${documentId}`);

        const endpoint = getDocumentEndpoint(documentType);
        const htmlResponse = await axios.get(
          `${API_URL}${endpoint}/${documentId}/html`,
          {
            params: { templateId, terminalId }
          }
        );
        
        const docHtmlContent = htmlResponse.data;
        setDocumentHtml(docHtmlContent);
        setPreviewHtml('loaded');
        console.log(`✅ ${documentType} HTML fetched - Preview shown`);
        
        setLoading(false);
        return;

      } catch (serverErr) {
        console.warn('⚠️ Server fetch failed:', serverErr.message);
        
        // Fallback: Show basic info
        setDocumentHtml(`
          <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
            <h1>${documentType} #${documentId.substring(0, 8)}</h1>
            <p style="color: #666;">Generated: ${new Date().toLocaleDateString()}</p>
            <p style="margin-top: 20px; color: #999;">
              ⚠️ Could not load full ${documentType} details.<br/>
              Server is temporarily unavailable.
            </p>
          </div>
        `);
        setPreviewHtml('loaded');
        
        setError(`Could not load full ${documentType} HTML`);
        showToast('warning', `⚠️ Showing basic ${documentType}`);
        setLoading(false);
      }
      
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || `Failed to load ${documentType}`;
      setError(errorMsg);
      console.error(`❌ ${documentType} error:`, err);
      showToast('error', errorMsg);
      setLoading(false);
    }
  };


  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      // ✅ Generate PDF on-demand when user clicks Download
      console.log(`📄 User clicked Download PDF - generating ${documentType} on-demand...`);
      setPdfLoading(true);

      const endpoint = getDocumentEndpoint();
      const pdfResponse = await axios.post(
        `${API_URL}${endpoint}/${documentId}/generate-pdf`,
        {},
        {
          params: { templateId, terminalId: terminalConfig.terminalId, _t: Date.now() },
          responseType: 'blob'
        }
      );

      const blob = pdfResponse.data;
      setPdfBlob(blob);
      setPdfSource('server');
      console.log(`✅ ${documentType} PDF generated on-demand`);

      const fileName = `${documentType}_${new Date().toISOString().split('T')[0]}.pdf`;
      
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

  // Browser-based blob download
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

  // Print functionality - use window.print() instead of react-to-print (works better with HTML content)
  const handlePrint = () => {
    console.log('🖨️ Opening browser print dialog...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Silent print to terminal-mapped printer
  const handlePrintSafe = async () => {
    try {
      if (!documentId) {
        showToast('error', `❌ ${documentType} ID not available`);
        return;
      }

      // Get printer name using document-type-specific lookup
      const printerName = getPrinterName(documentType);
      const terminalId = terminalConfig?.terminalId;
      
      console.log('🖨️ Starting A4 silent print...');
      console.log(`   Document: ${documentType} ${documentId}`);
      console.log(`   Template: ${templateId}`);
      console.log(`   Terminal: ${terminalId}`);
      console.log(`   Printer: ${printerName || 'SYSTEM DEFAULT'}`);
      
      // Generic Electron handler - all document types use same method
      if (!window.electronAPI?.pdf?.printDocumentA4Silent) {
        console.warn(`⚠️ Electron silent print not available`);
        console.warn('💡 Falling back to browser print dialog...');
        
        // Fallback to browser print
        handlePrint();
        return;
      }

      const result = await window.electronAPI.pdf.printDocumentA4Silent(
        documentType,
        documentId,
        templateId,
        terminalId,
        printerName,
        API_URL
      );
      
      if (result.success) {
        console.log('✅ Print job sent successfully');
        showToast('success', `🖨️ ${documentType} printing on ${printerName || 'system default printer'}...`);
        
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error(result.message || 'Print failed');
      }
    } catch (error) {
      console.error('❌ Print error:', error);
      showToast('error', `❌ Failed to print. Please download PDF and print manually.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 print:bg-white print:inset-auto print:p-0 print:flex-none" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden print:rounded-none print:shadow-none" style={{ width: '850px', height: '95vh', maxHeight: '1200px', aspectRatio: '210 / 297' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1 border-b bg-gradient-to-r from-blue-50 to-indigo-50 print:hidden">
          <h1 className="text-xl font-bold text-gray-800">{documentType} Preview</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading Terminal Config */}
        {(terminalLoading || templateLoading) && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 flex items-center gap-3 print:hidden">
            <Loader size={18} className="animate-spin text-blue-500" />
            <p className="text-blue-700 text-sm">Loading terminal configuration...</p>
          </div>
        )}

        {/* Error */}
        {!templateLoading && error && !previewHtml && (
          <div className="p-4 bg-red-50 border-b border-red-200 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
              <button
                onClick={handleRefreshTerminalConfig}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition font-medium flex items-center gap-1 whitespace-nowrap"
              >
                <RefreshCw size={14} />
                Refresh Config
              </button>
            </div>
          </div>
        )}

        {/* Preview Area */}
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
                  Please configure a {documentType} template for this terminal in Terminal Settings
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
            <iframe
              ref={contentRef}
              srcDoc={documentHtml}
              className="w-full h-full border-0 print:border-0"
              title={`${documentType} Preview`}
              style={{ display: 'block', background: '#fff', margin: 0, padding: 0 }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!templateLoading && templateId && (
          <div className="border-t bg-white px-3 py-2 flex items-center justify-end gap-3 flex-wrap">
            {error && previewHtml && (
              <div className="flex-1 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            {previewHtml && pdfLoading && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <Loader size={14} className="animate-spin" />
                <span>Preparing PDF...</span>
              </div>
            )}

            <button
              onClick={handleDownloadPdf}
              disabled={loading || pdfLoading || !previewHtml}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pdfLoading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              {pdfLoading ? 'PDF Preparing...' : 'Download PDF'}
            </button>

            <button
              onClick={handlePrintSafe}
              disabled={loading || !previewHtml}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              {loading ? 'Loading...' : `Print ${documentType}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalDocumentPrintingComponent;
