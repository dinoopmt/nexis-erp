/**
 * RtvFormHeader Component
 * Header section with vendor, GRN selection, and basic info
 */
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../../config/config";

const RtvFormHeader = ({
  formData,
  setFormData,
  isEditable,
  onOpenSelectionModal,
}) => {
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoadingVendors(true);
        const response = await axios.get(`${API_URL}/api/v1/vendors/getvendors?limit=1000`);
        setVendors(response.data?.vendors || response.data?.data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        setVendors([]);
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* RTV No */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          RTV No. <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.rtvNumber || ""}
          disabled
          className="w-full px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs"
        />
        <p className="text-xs text-gray-500 mt-0.5">Auto-generated</p>
      </div>

      {/* RTV Date */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          RTV Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={formData.rtvDate || ""}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, rtvDate: e.target.value }))
          }
          disabled={!isEditable}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-700"
        />
      </div>

      {/* Vendor */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Vendor <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.vendorId || ""}
          onChange={(e) => {
            const vendor = vendors.find(v => v._id === e.target.value);
            setFormData(prev => ({
              ...prev,
              vendorId: e.target.value,
              vendorName: vendor?.name || "",
            }));
          }}
          disabled={!isEditable}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-700"
        >
          <option value="">Select Vendor</option>
          {!loadingVendors && vendors.length > 0 ? (
            vendors.map(vendor => (
              <option key={vendor._id} value={vendor._id}>
                {vendor.name}
              </option>
            ))
          ) : (
            <option disabled>Loading vendors...</option>
          )}
        </select>
      </div>

      {/* GRN Reference */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Link to GRN (Optional)
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={formData.grnNumber || ""}
            disabled
            placeholder="Select GRN to return items"
            className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs"
          />
          <button
            type="button"
            onClick={onOpenSelectionModal}
            disabled={!isEditable}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Credit Note No */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Credit Note #
        </label>
        <input
          type="text"
          value={formData.creditNoteNo || ""}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, creditNoteNo: e.target.value }))
          }
          placeholder="Auto-generated on approval"
          disabled={!isEditable}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-700"
        />
      </div>

      {/* RMA No */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Return Auth. # (RMA)
        </label>
        <input
          type="text"
          value={formData.returnAuthNo || ""}
          onChange={(e) =>
            setFormData(prev => ({ ...prev, returnAuthNo: e.target.value }))
          }
          placeholder="Vendor RMA #"
          disabled={!isEditable}
          className="w-full px-2 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:text-gray-700"
        />
      </div>
    </div>
  );
};

export default RtvFormHeader;


