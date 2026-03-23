/**
 * GrnVendorSearch Component
 * Searchable vendor dropdown with selection
 */
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

const GrnVendorSearch = ({ vendors, selectedVendorId, selectedVendorName, isViewMode = false, onVendorSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredVendors, setFilteredVendors] = useState([]);
  const containerRef = useRef(null);

  // Get selected vendor name - use fallback name if vendor not in array yet
  const selectedVendor = vendors?.find((v) => v._id === selectedVendorId);
  const displayName = selectedVendor?.name || selectedVendorName || "";

  // Update filtered vendors when vendors change or search term changes
  useEffect(() => {
    if (!vendors || vendors.length === 0) {
      setFilteredVendors([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(
        (v) =>
          (v.name && v.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.code && v.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (v.phone && v.phone.toLowerCase().includes(searchTerm.toLowerCase())),
      );
      setFilteredVendors(filtered);
    }
  }, [searchTerm, vendors]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVendorSelect = (vendor) => {
    onVendorSelect(vendor);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onVendorSelect(null);
    setSearchTerm("");
  };

  if (!vendors || vendors.length === 0) {
    // ✅ Loading state - vendors not yet fetched (normal during initial load)
    console.debug("🔄 GrnVendorSearch: Vendors loading...");
    return (
      <div className="relative w-full" ref={containerRef}>
        <div className="relative flex items-center px-3 py-2 border border-blue-200 rounded text-sm bg-blue-50">
          <input
            type="text"
            placeholder="Loading vendors..."
            disabled
            className="flex-1 outline-none text-sm bg-transparent text-gray-400"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Vendor Input */}
      <div
        className={`relative flex items-center px-3 py-2 border border-gray-300 rounded text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer ${
          isViewMode ? "bg-gray-100 opacity-60" : "bg-white hover:border-blue-400"
        } transition`}
        onClick={() => !isViewMode && setIsOpen(!isOpen)}
      >
        <input
          type="text"
          value={isOpen ? searchTerm : displayName}
          onChange={(e) => {
            if (!isViewMode) {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }
          }}
          onClick={() => !isViewMode && setIsOpen(true)}
          placeholder="Search vendor..."
          disabled={isViewMode} // ✅ Disable in view mode
          className={`flex-1 outline-none text-sm bg-transparent ${
            isViewMode ? "cursor-not-allowed" : ""
          }`}
        />

        {selectedVendorId && !isOpen && (
          <button
            onClick={handleClear}
            className="ml-2 text-gray-400 hover:text-gray-600"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        )}

        <ChevronDown
          size={16}
          className={`ml-2 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown List - Hidden in view mode */}
      {isOpen && !isViewMode && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
          {filteredVendors && filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => (
              <div
                key={vendor._id}
                onClick={() =>
                  handleVendorSelect(vendor)
                }
                className={`px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition ${
                  selectedVendorId === vendor._id ? "bg-blue-100" : ""
                }`}
              >
                <div className="font-semibold text-sm text-gray-900">
                  {vendor.name}
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  {vendor.code && <span>Code: {vendor.code}</span>}
                  {vendor.email && <span>{vendor.email}</span>}
                  {vendor.phone && <span>{vendor.phone}</span>}
                </div>
                {/* Payment Info Badge */}
                <div className="mt-1 flex gap-2 flex-wrap">
                  {vendor.paymentType === "Cash" || vendor.paymentTerms === "Immediate" ? (
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
                      💵 Cash
                    </span>
                  ) : vendor.paymentType === "Credit" ? (
                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                      💳 Credit {vendor.creditDays ? `${vendor.creditDays}d` : ""}
                    </span>
                  ) : vendor.paymentTerms ? (
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded font-medium">
                      {vendor.paymentTerms}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500 text-center">
              No vendors found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GrnVendorSearch;


