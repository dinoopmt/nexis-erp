/**
 * DocumentUploadModal Component
 * Modal for uploading and viewing PDF documents
 */
import React, { useState, useRef } from "react";
import { Upload, X, Eye } from "lucide-react";
import { showToast } from "../../shared/AnimatedCenteredToast.jsx";

const DocumentUploadModal = ({ isOpen, onClose, onFileUpload, documents = [], onDocumentRemove }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUploadFiles(files);
    }
  };

  const validateAndUploadFiles = (files) => {
    const pdfFiles = Array.from(files).filter((file) => {
      if (file.type !== "application/pdf") {
        showToast('error', `${file.name} - Only PDF files allowed`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        showToast('error', `${file.name} - File size cannot exceed 10MB`);
        return false;
      }
      return true;
    });

    if (pdfFiles.length > 0) {
      onFileUpload(pdfFiles);
      showToast('success', `${pdfFiles.length} PDF(s) uploaded successfully`);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUploadFiles(e.target.files);
      e.target.value = ""; // Reset input
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900">📄 Document Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Section */}
            <div className="lg:col-span-1">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Upload PDF</h3>

              {/* Drag Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="mx-auto mb-2 text-blue-500" />
                <p className="text-xs font-medium text-gray-700">Drag & drop PDF files</p>
                <p className="text-[10px] text-gray-500 mt-1">or click to browse</p>
                <p className="text-[10px] text-gray-400 mt-2">Max 10MB per file</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Uploaded Documents List */}
              <div className="mt-6">
                <h4 className="text-xs font-semibold text-gray-900 mb-3">
                  Uploaded Files ({documents.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.length > 0 ? (
                    documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-3 bg-gray-100 rounded hover:bg-gray-200 transition group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-red-500">📄</span>
                          <span className="text-xs text-gray-700 truncate">{doc.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => setSelectedPdf(doc)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              onDocumentRemove(idx);
                              if (selectedPdf?.name === doc.name) {
                                setSelectedPdf(null);
                              }
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 text-center py-4">
                      No documents uploaded yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PDF Viewer Section */}
            <div className="lg:col-span-2">
              <h3 className="text-base font-semibold text-gray-900 mb-4">PDF Preview</h3>
              {selectedPdf ? (
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="bg-white rounded p-2 mb-3 text-xs font-medium text-gray-700">
                    📄 {selectedPdf.name}
                  </div>
                  <iframe
                    src={selectedPdf.url || URL.createObjectURL(selectedPdf)}
                    className="w-full h-96 rounded border border-gray-300"
                    title="PDF Viewer"
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-12 text-center">
                  <p className="text-gray-500 text-xs">Select a PDF to view</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 p-6 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;


