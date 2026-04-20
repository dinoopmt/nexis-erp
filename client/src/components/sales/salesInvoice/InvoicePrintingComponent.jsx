import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, Loader } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { API_URL } from '../../../config/config';
import axios from 'axios';
import { useTerminal } from '../../../context/TerminalContext';

const InvoicePrintingComponent = ({ invoiceId, onClose }) => {
  const { terminalConfig, isLoading: terminalLoading, error: terminalError, refetch: refetchTerminal } = useTerminal();
  
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templateId, setTemplateId] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [lastTerminalId, setLastTerminalId] = useState(null); // ✅ Track terminal ID changes
  const contentRef = useRef();

  // ✅ FORCE REFETCH when terminal changes - detects switching terminals
  useEffect(() => {
    const currentTerminalId = terminalConfig?.terminalId;
    
    // If terminal ID has changed, force refetch to get new template config
    if (currentTerminalId && currentTerminalId !== lastTerminalId) {
      console.log('🔄 Terminal switched from', lastTerminalId, 'to', currentTerminalId);
      setLastTerminalId(currentTerminalId);
      
      // Force refetch to get the new terminal's template configuration
      if (refetchTerminal) {
        console.log('🔄 Refetching terminal config for new terminal...');
        refetchTerminal(true); // forceRefresh = true
      }
    }
  }, [terminalConfig?.terminalId, lastTerminalId, refetchTerminal]);

  // ✅ OPTIMIZATION: No refetch needed - terminal config is cached for 30 minutes
  // Config is loaded on app startup and cached in localStorage
  // Modal will use cached config unless it's older than 30 minutes
  useEffect(() => {
    console.log('📂 Invoice modal opened - using cached terminal config');
    // Config already available from app startup
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
      return;
    }
    handlePreview();
  }, [invoiceId, templateId]);

  // Fetch HTML preview using terminal's template
  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📥 Fetching preview with templateId:', templateId);

      const terminalId = terminalConfig?.terminalId;
      const response = await axios.get(
        `${API_URL}/invoices/${invoiceId}/preview`,
        { 
          params: { templateId, _t: Date.now() }, // ✅ Cache buster - timestamp prevents browser caching
          headers: {
            'terminal-id': terminalId, // ✅ Pass terminal ID so store details are fetched
          }
        }
      );

      console.log('✅ Preview loaded successfully');
      setPreviewHtml(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load preview';
      setError(errorMsg);
      console.error('❌ Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download PDF using terminal's template
  const handleDownloadPdf = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!templateId) {
        setError('Template ID not available');
        return;
      }

      console.log('📄 Generating PDF with templateId:', templateId);

      const terminalId = terminalConfig?.terminalId;
      const response = await axios.post(
        `${API_URL}/invoices/${invoiceId}/generate-pdf`,
        {},
        {
          params: { templateId, _t: Date.now() }, // ✅ Cache buster - timestamp prevents browser caching
          responseType: 'blob',
          headers: {
            'terminal-id': terminalId, // ✅ Pass terminal ID so store details are fetched
          }
        }
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✅ PDF downloaded successfully');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate PDF';
      setError(errorMsg);
      console.error('❌ PDF error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Print functionality
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: `Invoice_${new Date().toISOString().split('T')[0]}`,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h1 className="text-xl font-bold text-gray-800">Invoice Preview</h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Loading Terminal Config */}
        {(terminalLoading || templateLoading) && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
            <Loader size={18} className="animate-spin text-blue-500" />
            <p className="text-blue-700 text-sm">Loading terminal configuration...</p>
          </div>
        )}

        {/* Template Error */}
        {!templateLoading && error && !previewHtml && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
            <div
              ref={contentRef}
              className="bg-white p-8 rounded-lg shadow-sm"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Action Buttons Panel - Fixed at Bottom */}
        {!templateLoading && templateId && (
          <div className="border-t bg-white p-4 flex items-center justify-end gap-3 flex-wrap">
            {/* Error Message */}
            {error && previewHtml && (
              <div className="flex-1 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={loading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              {loading ? 'Downloading...' : 'Download PDF'}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              disabled={loading || !previewHtml}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePrintingComponent;
