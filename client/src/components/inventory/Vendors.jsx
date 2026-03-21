import React, { useEffect, useState, useRef } from "react";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useTaxMaster } from "../../hooks/useTaxMaster";
import VendorForm from "../forms/VendorForm";

const Vendors = () => {
  // Get company data for country-based tax type control
  const { company, taxMaster } = useTaxMaster();
  const isIndiaCompany = company?.countryCode === 'IN';

  // ✅ FIX: Country code mapping (backend expects codes: IN, AE, OM)
  const countryCodeMap = {
    'India': 'IN',
    'UAE': 'AE',
    'Oman': 'OM',
  };
  
  const countryNameMap = {
    'IN': 'India',
    'AE': 'UAE',
    'OM': 'Oman',
  };

  // Convert company country to code for initial state
  const getCountryCode = (countryName) => countryCodeMap[countryName] || 'AE';
  const getCountryName = (countryCode) => countryNameMap[countryCode] || 'UAE';

  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalVendors, setTotalVendors] = useState(0);
  const itemsPerPage = 10;

  // ✅ Global Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // ✅ Fetch Vendors
  useEffect(() => {
    fetchVendors();
  }, [currentPage, search]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const url = `${API_URL}/vendors/getvendors?page=${currentPage}&limit=${itemsPerPage}${
        search ? `&search=${search}` : ""
      }`;
      const response = await axios.get(url);
      setVendors(response.data.vendors || []);
      setTotalVendors(response.data.total || 0);
      setError("");
    } catch (err) {
      setError("Failed to fetch vendors");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;

    try {
      setLoading(true);
      await axios.delete(`${API_URL}/vendors/deletevendor/${id}`);
      setVendors(vendors.filter((v) => v._id !== id));
      setError("");
    } catch (err) {
      setError("Failed to delete vendor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Open Form for Create
  const handleOpenForm = () => {
    setSelectedVendor(null);
    setIsFormOpen(true);
  };

  // ✅ Open Form for Edit
  const handleEditVendor = (vendor) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  // ✅ Handle Form Success
  const handleFormSuccess = () => {
    fetchVendors();
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name?.toLowerCase().includes(search.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalVendors / itemsPerPage);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 shadow-lg z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold">🏢 Vendors</h1>
          <button
            onClick={handleOpenForm}
            className="bg-white hover:bg-gray-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-md"
          >
            <Plus size={16} /> New Vendor
          </button>
        </div>
      </div>

      {/* DETAILS - Content Section - Scrollable */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        {/* Search Bar - Fixed */}
        <div className="flex-shrink-0 bg-white rounded-lg shadow-sm border p-2.5 mb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search vendors by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2 p-2 text-xs bg-red-100 text-red-700 rounded-lg border border-red-300 flex items-center gap-1.5">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && <div className="text-center py-4 text-gray-500 text-sm">Loading vendors...</div>}

        {/* Table - Scrollable */}
        {!loading && (
          <div className="flex-1 bg-white rounded-xl shadow-sm border flex flex-col min-h-0 overflow-hidden">
            {/* Table with Sticky Header */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10 border-b">
                  <tr>
                    <th className="px-2.5 py-1.5 text-left font-bold">Code</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">Name</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">Email</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">Phone</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">Country</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">City</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">Type</th>
                    <th className="px-2.5 py-1.5 text-left font-bold">Status</th>
                    <th className="px-2.5 py-1.5 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map((vendor) => (
                      <tr key={vendor._id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-2.5 py-1.5 text-gray-800 font-semibold text-xs">{vendor.vendorCode}</td>
                        <td className="px-2.5 py-1.5 text-gray-800 font-semibold text-xs">{vendor.name}</td>
                        <td className="px-2.5 py-1.5 text-gray-600 text-xs">{vendor.email}</td>
                        <td className="px-2.5 py-1.5 text-gray-600 text-xs">{vendor.phone}</td>
                        <td className="px-2.5 py-1.5 text-gray-600 text-xs font-semibold">
                          {vendor.country === 'IN' && '🇮🇳 India'}
                          {vendor.country === 'AE' && '🇦🇪 UAE'}
                          {vendor.country === 'OM' && '🇴🇲 Oman'}
                        </td>
                        <td className="px-2.5 py-1.5 text-gray-600 text-xs">{vendor.city || '-'}</td>
                        <td className="px-2.5 py-1.5 text-gray-800 text-xs">
                          <div className="flex gap-1">
                            {vendor.isSupplier && (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">
                                Supplier
                              </span>
                            )}
                            {vendor.isShipper && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">
                                Shipper
                              </span>
                            )}
                            {vendor.isCustomer && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-semibold">
                                Customer
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-gray-800">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              vendor.status === "Active"
                                ? "bg-green-100 text-green-800"
                                : vendor.status === "Inactive"
                                ? "bg-gray-100 text-gray-800"
                                : vendor.status === "Blacklisted"
                                ? "bg-red-100 text-red-800"
                                : vendor.status === "On Hold"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {vendor.status}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <button
                            onClick={() => handleEditVendor(vendor)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-2 py-1 rounded text-xs mr-1 transition inline-flex items-center gap-0.5 font-semibold"
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vendor._id)}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-2 py-1 rounded text-xs transition inline-flex items-center gap-0.5 font-semibold"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-gray-400">
                        <div className="text-sm">📭 No vendors found</div>
                        <div className="text-xs text-gray-400 mt-0.5">Try adjusting your search filters or add a new vendor</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER - Pagination & Info - Fixed at bottom */}
      {!loading && filteredVendors.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t shadow-lg z-10">
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              {/* Pagination Info */}
              <div className="text-xs text-gray-700">
                <span className="font-bold">📊 Showing</span>{" "}
                <span className="text-blue-700 font-bold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {" - "}
                <span className="text-blue-700 font-bold">
                  {Math.min(currentPage * itemsPerPage, totalVendors)}
                </span>
                {" of "}
                <span className="text-blue-700 font-bold">{totalVendors}</span>
                <span className="text-gray-600"> vendors (Page {currentPage}/{totalPages})</span>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ⏮️
                  </button>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ◀️
                  </button>

                  <div className="flex gap-0.5">
                    {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                      let page;
                      if (totalPages <= 7) {
                        page = i + 1;
                      } else if (currentPage <= 4) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        page = totalPages - 6 + i;
                      } else {
                        page = currentPage - 3 + i;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-1.5 py-1 rounded text-xs font-bold transition ${
                            currentPage === page
                              ? "bg-blue-600 text-white shadow-md border border-blue-700"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-blue-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ▶️
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ⏭️
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Vendor Form Component */}
      <VendorForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        initialData={selectedVendor}
      />
    </div>
  );
};

export default Vendors;


