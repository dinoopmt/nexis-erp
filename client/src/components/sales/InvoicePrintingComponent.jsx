import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Download, Printer, Eye, X, Loader } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../config/config';

const InvoicePrintingComponent = ({ invoiceId, invoiceNumber, onClose }) => {
  const [language, setLanguage] = useState('EN');
  const [withLogo, setWithLogo] = useState(true);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef();

  // Load preview on mount and when language/logo changes
  useEffect(() => {
    handlePreview();
  }, [language, withLogo]);

  // Fetch preview HTML
  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_URL}/invoices/${invoiceId}/preview`,
        {
          params: {
            language,
            withLogo
          }
        }
      );
      setPreviewHtml(response.data);
    } catch (err) {
      console.error('Preview error:', err);
      setError(`Failed to load preview: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API_URL}/invoices/${invoiceId}/generate-pdf`,
        {},
        {
          params: {
            language,
            withLogo
          },
          responseType: 'blob'
        }
      );

      // Create blob URL and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}_${language}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Failed to download PDF: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Print using react-to-print
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle: `Invoice_${invoiceNumber}`,
    onAfterPrint: () => {
      console.log('✓ Print completed');
    },
    onBeforePrint: () => {
      console.log('🖨️ Preparing to print...');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-4 border-b bg-white shadow-sm z-10">
          <h2 className="text-lg font-bold text-gray-800">
            Invoice #{invoiceNumber} - Print & Download
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Options Panel */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b sticky top-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language / اللغة
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="EN">🇬🇧 English</option>
                <option value="AR">🇸🇦 العربية</option>
              </select>
            </div>

            {/* Logo Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo
              </label>
              <select
                value={withLogo ? 'yes' : 'no'}
                onChange={(e) => setWithLogo(e.target.value === 'yes')}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="yes">✅ With Logo</option>
                <option value="no">❌ Without Logo</option>
              </select>
            </div>

            {/* Download Button */}
            <div className="flex items-end">
              <button
                onClick={handleDownloadPdf}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download PDF
                  </>
                )}
              </button>
            </div>

            {/* Print Button */}
            <div className="flex items-end">
              <button
                onClick={handlePrint}
                disabled={loading || !previewHtml}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 p-8 bg-gray-100 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
                <p className="text-gray-600 font-medium">Loading preview...</p>
              </div>
            </div>
          ) : previewHtml ? (
            <div
              ref={contentRef}
              className="bg-white rounded-lg shadow-lg p-8"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              style={{
                direction: language === 'AR' ? 'rtl' : 'ltr',
                textAlign: language === 'AR' ? 'right' : 'left'
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Terminal Settings Footer */}
        <div className="border-t bg-gray-50 p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <Settings size={18} className="text-blue-600" />
            <span>Terminal Settings:</span>
          </div>

          {/* Language Setting */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Language:</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg">
              <span className="text-sm font-medium">
                {language === 'EN' ? '🇬🇧 English' : '🇸🇦 العربية'}
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="ml-2 px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EN">English</option>
                <option value="AR">العربية</option>
              </select>
            </div>
          </div>

          {/* Logo Setting */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Logo:</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-lg">
              <span className="text-sm font-medium">
                {withLogo ? '✓ With Logo' : '✗ Without Logo'}
              </span>
              <select
                value={withLogo ? 'yes' : 'no'}
                onChange={(e) => setWithLogo(e.target.value === 'yes')}
                className="ml-2 px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="yes">With Logo</option>
                <option value="no">Without Logo</option>
              </select>
            </div>
          </div>

          {/* Terminal ID Display */}
          {terminalSettings?.terminalId && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-gray-600">Terminal:</span>
              <span className="text-xs font-medium text-blue-600">{terminalSettings.terminalId}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintingComponent;
