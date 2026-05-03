/**
 * LpoFormHeader Component
 * Main form fields (GRN No, Invoice No, Vendor, Date, etc.)
 */
import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import LpoVendorSearch from "./LpoVendorSearch";

const LpoFormHeader = ({
  formData,
  vendors,
  isViewMode = false, // ✅ NEW: Read-only mode
  isLocked = false, // 🔒 NEW: Locked when status is Requested
  onFormChange,
  onVendorChange,
  onFileUpload,
  onDocumentRemove,
}) => {
  const fileInputRef = useRef(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  return (
    <div className={`bg-blue-50 p-2 rounded-lg border flex-shrink-0 ${
      isLocked ? "border-red-300 bg-red-50" : "border-blue-200"
    }`}>
      {/* Lock Status Banner */}
      {isLocked && (
        <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs font-semibold flex items-center gap-2">
          🔒 <span>This LPO is LOCKED - Status is Requested. Cannot edit.</span>
        </div>
      )}
      {/* First Row - LPO No, Invoice, LPO, Date, Tax, Documents */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-2">
        {/* LPO No */}
        <div className="relative">
          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-gray-600">
            LPO No. <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lpoNo}
            placeholder={formData.lpoNo ? "" : "Generated on Save"}
            disabled
            className={`w-full px-3 py-2 border rounded text-sm focus:outline-none ${
              formData.lpoNo
                ? "bg-gray-100 border-gray-300 text-gray-900 font-semibold"
                : "bg-blue-50 border-blue-300 text-blue-500 italic"
            }`}
          />
        </div>

        
        

        

        {/* Date */}
        <div className="relative">
          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-gray-600">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.lpoDate}
            onChange={(e) => onFormChange("lpoDate", e.target.value)}
            disabled={isViewMode || isLocked} // ✅ Disable in view mode or when locked
            className={`w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none ${
              isViewMode || isLocked ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500"
            }`}
          />
        </div>

       
        

        
        
      </div>

      {/* Second Row - Vendor, Payment Terms, Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
        {/* Vendor Search */}
        <div className="relative">
          
          <LpoVendorSearch
            vendors={vendors}
            selectedVendorId={formData.vendorId}
            selectedVendorName={formData.vendorName}
            isViewMode={isViewMode} // ✅ Pass view mode
            onVendorSelect={(vendor) => {
              if (isViewMode) return; // Prevent selection in view mode
              if (!vendor) {
                // Clear selection
                onVendorChange({
                  target: { value: "" },
                  vendorName: "",
                });
                onFormChange("paymentTerms", "due_on_receipt");
              } else {
                // Set vendor and auto-populate payment terms
                onVendorChange({
                  target: { value: vendor._id },
                  vendorName: vendor.name,
                });
                
                // Auto-populate payment terms based on vendor's payment type
                let mappedTerms = "due_on_receipt";
                
                // Handle payment type: Cash vs Credit
                if (vendor.paymentType === "Cash" || vendor.paymentTerms === "Immediate") {
                  // Cash payment - due immediately
                  mappedTerms = "due_on_receipt";
                  console.log("💵 Cash payment selected:", {
                    vendor: vendor.name,
                    paymentType: vendor.paymentType,
                    mapped: mappedTerms,
                  });
                } else if (vendor.paymentType === "Credit" && vendor.creditDays) {
                  // Credit payment with specific days
                  const daysMap = {
                    30: "net_30",
                    60: "net_60",
                    90: "net_90",
                  };
                  mappedTerms = daysMap[vendor.creditDays] || `net_${vendor.creditDays}`;
                  console.log("💳 Credit payment selected:", {
                    vendor: vendor.name,
                    paymentType: vendor.paymentType,
                    creditDays: vendor.creditDays,
                    mapped: mappedTerms,
                  });
                } else if (vendor.paymentTerms) {
                  // Fallback: Map existing payment terms format
                  const paymentTermsMap = {
                    "Due on Receipt": "due_on_receipt",
                    "Immediate": "due_on_receipt",
                    "Net 30": "net_30",
                    "NET 30": "net_30",
                    "Net 60": "net_60",
                    "NET 60": "net_60",
                    "Net 90": "net_90",
                    "NET 90": "net_90",
                  };
                  mappedTerms = paymentTermsMap[vendor.paymentTerms] || vendor.paymentTerms;
                  console.log("📋 Payment terms auto-populated from vendor:", {
                    vendor: vendor.name,
                    paymentTerms: vendor.paymentTerms,
                    mapped: mappedTerms,
                  });
                }
                
                onFormChange("paymentTerms", mappedTerms);
              }
            }}
          />
        </div>

        {/* Payment Terms */}
        <div className="relative">
          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-gray-600">
            Payment Terms
          </label>
          <select
            value={formData.paymentTerms}
            onChange={(e) => onFormChange("paymentTerms", e.target.value)}
            disabled={isViewMode} // ✅ Disable in view mode
            className={`w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none ${
              isViewMode ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500"
            }`}
          >
            <option value="">-- Select Payment Terms --</option>
            <option value="due_on_receipt">Due on Receipt (Cash)</option>
            <option value="net_30">Net 30 (Credit)</option>
            <option value="net_60">Net 60 (Credit)</option>
            <option value="net_90">Net 90 (Credit)</option>
          </select>
        </div>

        {/* Notes */}
        <div className="relative">
          <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-semibold text-gray-600">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => onFormChange("notes", e.target.value)}
            placeholder="Additional notes..."
            disabled={isViewMode || isLocked} // ✅ Disable in view mode or when locked
            className={`w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none resize-none ${
              isViewMode || isLocked ? "bg-gray-100 text-gray-600 cursor-not-allowed" : "focus:ring-2 focus:ring-blue-500"
            }`}
            rows="2"
          />
        </div>
      </div>

      
      
    </div>
  );
};

export default LpoFormHeader;


