import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Printer, Loader } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { API_URL } from '../../../config/config';
import axios from 'axios';

const InvoicePrintingComponent = ({ invoiceId, onClose }) => {
  const [language, setLanguage] = useState('EN');
  const [withLogo, setWithLogo] = useState(true);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef();

  // Fetch preview whenever language or logo preference changes
  useEffect(() => {
    handlePreview();
  }, [language, withLogo]);

  // Fetch HTML preview
  const handlePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${API_URL}/invoices/${invoiceId}/preview`,
        {
          params: {
            language: language,
            withLogo: withLogo
          }
        }
      );

      setPreviewHtml(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load preview');
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${API_URL}/invoices/${invoiceId}/generate-pdf`,
        {},
        {
          params: {
            language: language,
            withLogo: withLogo
          },
          responseType: 'blob'
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate PDF');
      console.error('PDF error:', err);
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
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-800">Invoice Printing & Download</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Options Panel */}
        <div className="sticky top-0 p-4 bg-white border-b space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Language Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EN">🇬🇧 English</option>
                <option value="AR">🇸🇦 العربية</option>
              </select>
            </div>

            {/* Logo Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo
              </label>
              <select
                value={withLogo ? 'true' : 'false'}
                onChange={(e) => setWithLogo(e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">With Logo</option>
                <option value="false">Without Logo</option>
              </select>
            </div>

            {/* Download Button */}
            <div className="flex items-end">
              <button
                onClick={handleDownloadPdf}
                disabled={loading}
                className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                {loading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>

            {/* Print Button */}
            <div className="flex items-end">
              <button
                onClick={handlePrint}
                disabled={loading || !previewHtml}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
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
              style={{
                direction: language === 'AR' ? 'rtl' : 'ltr',
                textAlign: language === 'AR' ? 'right' : 'left'
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No preview available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintingComponent;
