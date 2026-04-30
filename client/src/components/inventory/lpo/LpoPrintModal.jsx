/**
 * LPO Print Preview Modal
 * Displays LPO as HTML for printing/PDF export
 * ✅ MATCHES GlobalDocumentPrintingComponent pattern (working perfectly in all environments)
 */
import React, { useEffect, useRef, useState } from "react";
import { X, Download, Printer, Loader } from "lucide-react";
import { showToast } from "../../shared/AnimatedCenteredToast.jsx";
import axios from "axios";
import { API_URL } from "../../../config/config";

const LpoPrintModal = ({ lpoId, lpoNumber, isOpen, onClose, onContentLoaded }) => {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");
  const [error, setError] = useState(null);
  const [showContent, setShowContent] = useState(false);

  // ✅ Auto-load LPO HTML when modal opens (matching GlobalDocumentPrintingComponent)
  useEffect(() => {
    if (isOpen && lpoId) {
      loadLpoHtml();
    }
  }, [isOpen, lpoId]);

  const loadLpoHtml = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setHtmlContent("");
      
      const terminalId = localStorage.getItem("terminalId") || "";
      console.log(`📄 [LPO Print] Fetching LPO HTML - ID: ${lpoId}, Terminal: ${terminalId}`);
      
      // ✅ Retry logic for newly created LPOs (may not be immediately available)
      let response;
      let lastError;
      const maxRetries = 8;
      const retryDelay = 500; // ms - increased from 300ms
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          response = await axios.get(`${API_URL}/lpo/${lpoId}/html`, {
            headers: { "terminal-id": terminalId },
            responseType: "text",
          });
          
          console.log(`📥 [LPO Print] Response received on attempt ${attempt}:`, {
            status: response.status,
            dataType: typeof response.data,
            dataLength: response.data?.length || 0,
            dataPreview: response.data?.substring(0, 100) || ''
          });
          
          if (!response.data || response.data.trim().length === 0) {
            throw new Error("Empty response from server");
          }
          
          console.log(`✅ [LPO Print] HTML fetched on attempt ${attempt} (${response.data.length} bytes)`);
          setHtmlContent(response.data);
          setError(null);
          setShowContent(true);
          onContentLoaded?.();
          return;
          
        } catch (err) {
          lastError = err;
          const statusCode = err.response?.status;
          
          console.error(`❌ [LPO Print] Attempt ${attempt} failed:`, {
            status: statusCode,
            message: err.message,
            responseData: err.response?.data
          });
          
          // Retry on 404 (not found - LPO still being created) up to maxRetries
          if (statusCode === 404 && attempt < maxRetries) {
            console.warn(`⚠️ [LPO Print] Attempt ${attempt}/${maxRetries} - LPO not ready yet (404), retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            // Don't retry on other errors or final attempt reached
            throw err;
          }
        }
      }
      
      // If all retries failed, throw the last error
      throw lastError;
      
    } catch (error) {
      console.error("❌ [LPO Print] Error loading LPO HTML:", error);
      console.error("  Status:", error.response?.status);
      console.error("  Data:", error.response?.data);
      console.error("  Message:", error.message);
      
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      setError(errorMsg);
      setHtmlContent("");
      showToast("error", `Failed to load LPO for printing: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.print();
      } else {
        showToast("error", "Print window not ready");
      }
    } catch (error) {
      console.error("Error printing:", error);
      showToast("error", "Failed to open print dialog");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsLoading(true);

      // ✅ Import html2pdf dynamically
      const { default: html2pdf } = await import("html2pdf.js");

      // Create element for PDF generation
      const element = document.createElement("div");
      element.innerHTML = htmlContent;

      // PDF options
      const opt = {
        margin: 10,
        filename: `LPO-${lpoNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      // Generate and download PDF
      html2pdf().set(opt).from(element).save();

      showToast("success", "LPO PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showToast("error", "Failed to download PDF");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // ✅ Show modal while loading/error/content (always visible when isOpen)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">Print LPO - {lpoNumber}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="border-b border-gray-200 px-6 py-3 flex gap-2 bg-gray-50">
          <button
            onClick={handlePrint}
            disabled={isLoading || !htmlContent}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isLoading || !htmlContent}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading LPO for printing...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                  <div className="text-red-600 font-semibold mb-2">Failed to Load LPO</div>
                  <p className="text-red-600 text-sm mb-4">{error}</p>
                  <button
                    onClick={() => {
                      setShowContent(false);
                      setError(null);
                      setHtmlContent("");
                      loadLpoHtml();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : htmlContent ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              className="w-full h-full bg-white border-0 rounded-lg"
              title="LPO Print Preview"
              style={{ display: 'block', background: '#fff', margin: 0, padding: 0 }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No content to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LpoPrintModal;
