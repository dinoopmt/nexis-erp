import React, { useEffect, useState, useRef } from "react";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useTaxMaster } from "../../hooks/useTaxMaster";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalVendors, setTotalVendors] = useState(0);
  const itemsPerPage = 10;

  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: company?.countryCode || 'AE',
    taxRegistered: false,
    paymentType: "Credit",
    creditDays: 30,
    paymentTerms: "NET 30",
    taxNumber: "",
    gstNumber: "",
    vatId: "",
    taxType: isIndiaCompany ? "" : null,
    taxGroupId: isIndiaCompany ? "" : null,
    status: "Active",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    isSupplier: true,  // ✅ ADDED
    isShipper: false,  // ✅ ADDED
    isCustomer: false, // ✅ ADDED - Vendor can also be a customer
  });

  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState("basic");
  
  // ✅ Drag Modal State with Performance Optimization
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  // ✅ Use refs to avoid reattaching event listeners on every state change
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isModalOpenRef = useRef(isModalOpen);
  
  // Update ref when modal state changes
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // ✅ Fetch Vendors
  useEffect(() => {
    fetchVendors();
  }, [currentPage, search]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const url = `${API_URL}/api/v1/vendors/getvendors?page=${currentPage}&limit=${itemsPerPage}${
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

  // ✅ Country-Based Tax Number Validation
  const validateTaxNumber = (taxNum, country) => {
    if (!taxNum || !taxNum.trim()) return false;
    
    const patterns = {
      'AE': /^\d{15}$/, // 15 digits for UAE TR Number
      'OM': /^\d{11}$/, // 11 digits for Oman TRN
      'IN': /^[0-9A-Z]{15}$/, // 15 characters for Indian GSTIN
    };
    
    const pattern = patterns[country];
    return pattern ? pattern.test(taxNum.toUpperCase()) : true;
  };

  // ✅ Toast Notification
  const showToast = (message, type = "error", duration = 4000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // ✅ Clear Field Error on User Interaction
  const clearFieldError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // ✅ Validation
  const validateForm = () => {
    const newErrors = {};
    if (!newVendor.name.trim()) newErrors.name = "Name is required";
    if (!newVendor.email.trim()) newErrors.email = "Email is required";
    if (!newVendor.phone.trim()) newErrors.phone = "Phone is required";
    if (!newVendor.country) newErrors.country = "Country is required";
    // Tax Number validation if Tax Registered is checked
    if (newVendor.taxRegistered) {
      if (!newVendor.taxNumber.trim()) {
        newErrors.taxNumber = `Tax Number is required for registered vendors in ${getCountryName(newVendor.country)}`;
      } else if (!validateTaxNumber(newVendor.taxNumber, newVendor.country)) {
        if (newVendor.country === 'AE') {
          newErrors.taxNumber = "Valid UAE TR Number required (15 digits)";
        } else if (newVendor.country === 'OM') {
          newErrors.taxNumber = "Valid Oman TRN required (11 digits)";
        } else if (newVendor.country === 'IN') {
          newErrors.taxNumber = "Valid Indian GSTIN required (15 characters)";
        }
      }
    }
    // Payment Terms required only for credit payments
    if (newVendor.paymentType === "Credit" && !newVendor.paymentTerms.trim()) 
      newErrors.paymentTerms = "Payment Terms is required for credit payments";
    if (newVendor.paymentType === "Credit" && !newVendor.creditDays) 
      newErrors.creditDays = "Credit Days are required for credit payment";
    // Validate tax type for India vendors
    if (newVendor.country === 'IN' && !newVendor.taxType) newErrors.taxType = "Tax Type is required for India";
    if (newVendor.country === 'IN' && newVendor.taxType && !newVendor.taxGroupId) newErrors.taxGroupId = "Tax Group is required";
    setErrors(newErrors);
    
    // Show validation errors as toast if there are any
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join(" • ");
      showToast(errorMessages, "error");
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle Add/Edit Vendor
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const vendorData = { ...newVendor };
      
      // Ensure country is in code format for backend
      if (typeof vendorData.country === 'string' && vendorData.country.length > 2) {
        vendorData.country = getCountryCode(vendorData.country);
      }

      // ✅ Clean up invalid tax reference IDs - Only include taxGroupId for India companies
      if (!isIndiaCompany) {
        vendorData.taxGroupId = null;
        vendorData.taxType = null;
      } else {
        // For India, taxGroupId must be valid or empty
        if (!vendorData.taxGroupId || vendorData.taxGroupId.trim() === "") {
          vendorData.taxGroupId = null;
        }
      }
      
      // Debug: Log what we're sending
      console.log("📤 Sending vendor data:", {
        paymentType: vendorData.paymentType,
        creditDays: vendorData.creditDays,
        paymentTerms: vendorData.paymentTerms,
      });
      
      if (isEdit && editId) {
        // Update
        const response = await axios.put(
          `${API_URL}/api/v1/vendors/updatevendor/${editId}`,
          vendorData
        );
        console.log("✅ Vendor updated, response:", {
          paymentType: response.data.vendor.paymentType,
          creditDays: response.data.vendor.creditDays,
          paymentTerms: response.data.vendor.paymentTerms,
        });
        setVendors(
          vendors.map((v) => (v._id === editId ? response.data.vendor : v))
        );
        showToast("Vendor updated successfully", "success");
      } else {
        // Add
        const response = await axios.post(
          `${API_URL}/api/v1/vendors/addvendor`,
          vendorData
        );
        console.log("✅ Vendor created, response:", {
          paymentType: response.data.vendor.paymentType,
          creditDays: response.data.vendor.creditDays,
          paymentTerms: response.data.vendor.paymentTerms,
        });
        setVendors([response.data.vendor, ...vendors]);
        showToast("Vendor created successfully", "success");
      }
      resetForm();
      setIsModalOpen(false);
      setError("");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to save vendor";
      setError(errorMsg);
      showToast(errorMsg, "error");
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
      await axios.delete(`${API_URL}/api/v1/vendors/deletevendor/${id}`);
      setVendors(vendors.filter((v) => v._id !== id));
      setError("");
    } catch (err) {
      setError("Failed to delete vendor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Edit
  const handleEdit = (vendor) => {
    const editData = {
      vendorCode: vendor.vendorCode || "",
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address || "",
      city: vendor.city || "",
      country: vendor.country || company?.countryCode || 'AE',
      taxRegistered: !!vendor.taxRegistered,
      paymentType: vendor.paymentType || "Credit",
      creditDays: vendor.creditDays || 30,
      paymentTerms: vendor.paymentTerms || "NET 30",
      taxNumber: vendor.taxNumber || "",
      gstNumber: vendor.gstNumber || "",
      vatId: vendor.vatId || "",
      status: vendor.status || "Active",
      bankName: vendor.bankName || "",
      accountNumber: vendor.accountNumber || "",
      accountHolder: vendor.accountHolder || "",
      isSupplier: vendor.isSupplier !== false,
      isShipper: vendor.isShipper || false,
      isCustomer: vendor.isCustomer || false,
    };

    // Only include tax fields for India companies
    if (isIndiaCompany) {
      editData.taxType = vendor.taxType || "";
      editData.taxGroupId = vendor.taxGroupId || "";
    } else {
      editData.taxType = null;
      editData.taxGroupId = null;
    }

    setNewVendor(editData);
    setEditId(vendor._id);
    setIsEdit(true);
    setIsModalOpen(true);
    setActiveTab("basic");
  };

  // ✅ Reset Form
  const resetForm = () => {
    setNewVendor({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: company?.countryCode || 'AE',
      taxRegistered: false,
      paymentType: "Credit",
      creditDays: 30,
      paymentTerms: "NET 30",
      taxNumber: "",
      gstNumber: "",
      vatId: "",
      taxType: isIndiaCompany ? "" : null,
      taxGroupId: isIndiaCompany ? "" : null,
      status: "Active",
      bankName: "",
      accountNumber: "",
      accountHolder: "",
      isSupplier: true,  // ✅ ADDED
      isShipper: false,  // ✅ ADDED
      isCustomer: false, // ✅ ADDED
    });
    setErrors({});
    setIsEdit(false);
    setEditId(null);
    setActiveTab("basic");
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
    setModalPosition({ x: 0, y: 0 });
  };

  // ✅ Drag Modal Handlers - Optimized for Performance
  const handleModalMouseDown = (e) => {
    // Only drag from header
    if (!e.currentTarget.classList.contains('modal-header')) return;
    
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y,
    };
  };

  // ✅ Single effect for drag - only attaches/detaches once
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId;

    const handleMouseMove = (e) => {
      // Use RAF for smooth dragging without excessive repaints
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setModalPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      cancelAnimationFrame(animationFrameId);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]); // Only depends on isDragging, not internal calculations

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
            onClick={handleOpenModal}
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
                            onClick={() => handleEdit(vendor)}
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

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Floating Toast Notifications */}
          {toasts.length > 0 && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] flex flex-col gap-2 max-w-md">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-start gap-3 shadow-lg ${
                    toast.type === "success"
                      ? "bg-green-500 text-white"
                      : toast.type === "error"
                      ? "bg-red-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                  style={{
                    animation: "slideDown 0.3s ease-out"
                  }}
                >
                  <span className="text-lg font-bold flex-shrink-0">
                    {toast.type === "error" ? "⚠️" : toast.type === "success" ? "✓" : "ℹ️"}
                  </span>
                  <span className="flex-1">{toast.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Modal Overlay and Content */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 p-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
            style={{
              position: 'fixed',
              left: `calc(50% + ${modalPosition.x}px)`,
              top: `calc(50% + ${modalPosition.y}px)`,
              transform: 'translate(-50%, -50%)',
              transition: isDragging ? 'none' : 'all 0.2s ease-out',
              maxHeight: '90vh',
              minHeight: '500px',
            }}
          >
            {/* Modal Header - DRAGGABLE */}
            <div 
              className="modal-header bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3.5 rounded-t-xl flex-shrink-0 cursor-move hover:from-blue-700 hover:to-blue-800 transition user-select-none flex items-center justify-between"
              onMouseDown={handleModalMouseDown}
              style={{ userSelect: 'none', touchAction: 'none' }}
            >
              <div>
                <h2 className="text-base lg:text-lg font-bold">
                  {isEdit ? "✏️ Edit Vendor" : "➕ Add New Vendor"}
                </h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  {isEdit ? "Update vendor details" : "Create a new vendor profile"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Content with Tabs */}
            <div className="border-b bg-white flex-shrink-0">
              <div className="flex gap-0 px-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("basic")}
                  className={`px-4 py-2 font-semibold text-xs border-b-2 transition whitespace-nowrap ${
                    activeTab === "basic"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  📋 Basic Info
                </button>
                <button
                  onClick={() => setActiveTab("tax")}
                  className={`px-4 py-2 font-semibold text-xs border-b-2 transition whitespace-nowrap ${
                    activeTab === "tax"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  💰 Tax Info
                </button>
                <button
                  onClick={() => setActiveTab("banking")}
                  className={`px-4 py-2 font-semibold text-xs border-b-2 transition whitespace-nowrap ${
                    activeTab === "banking"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  🏦 Banking Details
                </button>
                <button
                  onClick={() => setActiveTab("accounting")}
                  className={`px-4 py-2 font-semibold text-xs border-b-2 transition whitespace-nowrap ${
                    activeTab === "accounting"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  📊 Accounting
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 flex-1 overflow-y-auto min-h-0">
              {/* BASIC INFO TAB */}
              {activeTab === "basic" && (
                <>
                  {/* Vendor Code - Display Only */}
                  {isEdit && newVendor.vendorCode && (
                    <div className="mb-2.5 p-2.5 bg-blue-50 rounded border border-blue-200">
                      <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                        Vendor Code
                      </label>
                      <div className="text-xs font-bold text-blue-700">{newVendor.vendorCode}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Name */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newVendor.name}
                        onChange={(e) => {
                          setNewVendor({ ...newVendor, name: e.target.value });
                          clearFieldError("name");
                        }}
                        className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Vendor Name"
                      />
                      {errors.name && (
                        <span className="text-red-500 text-xs mt-0.5 block">{errors.name}</span>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={newVendor.email}
                        onChange={(e) => {
                          setNewVendor({ ...newVendor, email: e.target.value });
                          clearFieldError("email");
                        }}
                        className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Email Address"
                      />
                      {errors.email && (
                        <span className="text-red-500 text-xs mt-0.5 block">{errors.email}</span>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={newVendor.phone}
                        onChange={(e) => {
                          setNewVendor({ ...newVendor, phone: e.target.value });
                          clearFieldError("phone");
                        }}
                        className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Phone Number"
                      />
                      {errors.phone && (
                        <span className="text-red-500 text-xs mt-0.5 block">{errors.phone}</span>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                        Address
                      </label>
                      <input
                        type="text"
                        value={newVendor.address}
                        onChange={(e) => {
                          setNewVendor({ ...newVendor, address: e.target.value });
                          clearFieldError("address");
                        }}
                        className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Street Address"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                        City
                      </label>
                      <input
                        type="text"
                        value={newVendor.city}
                        onChange={(e) => {
                          setNewVendor({ ...newVendor, city: e.target.value });
                          clearFieldError("city");
                        }}
                        className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="City"
                      />
                    </div>

                    {/* Country */}
                    <div>
                      <label className={`block text-xs font-semibold mb-0.5 ${
                        errors.country ? "text-red-600" : "text-gray-700"
                      }`}>
                        Country *
                      </label>
                      <select
                        value={newVendor.country}
                        onChange={(e) => {
                          setNewVendor({
                            ...newVendor,
                            country: e.target.value,
                            taxType: e.target.value === 'India' ? "" : null,
                            taxGroupId: e.target.value === 'India' ? "" : null,
                          });
                          clearFieldError("country");
                        }}
                        className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none ${
                          errors.country
                            ? "border-red-500 bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                      >
                        <option value="UAE">🇦🇪 UAE</option>
                        <option value="Oman">🇴🇲 Oman</option>
                        <option value="India">🇮🇳 India</option>
                      </select>
                      {errors.country && (
                        <span className="text-red-500 text-xs mt-0.5 block">{errors.country}</span>
                      )}
                    </div>

                    {/* Payment type*/  }

                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Payment type *
                      </label>
                      <select
                        value={newVendor.paymentType}
                        onChange={(e) => {
                          const paymentType = e.target.value;
                          // When switching to Cash, clear payment terms to null
                          setNewVendor({
                            ...newVendor,
                            paymentType: paymentType,
                            paymentTerms: paymentType === "Cash" ? null : newVendor.paymentTerms,
                            creditDays: paymentType === "Cash" ? 0 : newVendor.creditDays,
                          });
                          clearFieldError("paymentTerms");
                          clearFieldError("creditDays");
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="" disabled className="text-gray-400">Select Payment Type</option>
                        <option value="Credit">Credit</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    {/* Credit Days - Only for Credit Payments */}
                    {newVendor.paymentType === "Credit" && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${
                          errors.creditDays ? "text-red-600" : "text-gray-700"
                        }`}>
                          Credit Days *
                        </label>
                        <select
                          value={newVendor.creditDays !== undefined && newVendor.creditDays !== null ? newVendor.creditDays : ""}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              creditDays: parseInt(e.target.value) || 30,
                            });
                            clearFieldError("creditDays");
                          }}
                          className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                        >
                          <option value="30">30 Days</option>
                          <option value="60">60 Days</option>
                          <option value="90">90 Days</option>
                          <option value="120">120 Days</option>
                        </select>
                        {errors.creditDays && (
                          <span className="text-red-500 text-xs mt-0.5 block">{errors.creditDays}</span>
                        )}
                      </div>
                    )}

                    {/* Payment Terms */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${
                        errors.paymentTerms ? "text-red-600" : "text-gray-700"
                      }`}>
                        Payment Terms {newVendor.paymentType === "Credit" && "*"}
                      </label>
                      <select
                        value={newVendor.paymentTerms}
                        onChange={(e) => {
                          setNewVendor({
                            ...newVendor,
                            paymentTerms: e.target.value,
                          });
                          clearFieldError("paymentTerms");
                        }}
                        disabled={newVendor.paymentType === "Cash"}
                        className={`w-full border px-3 py-2 rounded text-xs outline-none transition ${
                          newVendor.paymentType === "Cash"
                            ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-60"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                      >
                        <option value="" disabled className="text-gray-400">Select Payment Terms</option>
                        <option value="NET 30">NET 30</option>
                        <option value="NET 60">NET 60</option>
                        <option value="NET 90">NET 90</option>
                        <option value="Immediate">Immediate</option>
                        <option value="Custom">Custom</option>
                      </select>
                      {newVendor.paymentType === "Cash" && (
                        <p className="text-gray-500 text-xs mt-1 italic">ℹ️ Not required for cash payments</p>
                      )}
                    </div>
                   

                    {/* Status */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Status
                      </label>
                      <select
                        value={newVendor.status || "Active"}
                        onChange={(e) => {
                          setNewVendor({
                            ...newVendor,
                            status: e.target.value,
                          });
                          clearFieldError("status");
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Blacklisted">Blacklisted</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>

                    {/* Checkboxes Grid */}
                    <div className="col-span-3 grid grid-cols-4 gap-4">
                      {/* Supplier */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isSupplier"
                          checked={newVendor.isSupplier !== false}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              isSupplier: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer rounded border-gray-300"
                        />
                        <label htmlFor="isSupplier" className="text-gray-700 text-xs font-semibold cursor-pointer">
                          Supplier
                        </label>
                      </div>

                      {/* Shipper/Logistics */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isShipper"
                          checked={newVendor.isShipper || false}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              isShipper: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 accent-green-600 cursor-pointer rounded border-gray-300"
                        />
                        <label htmlFor="isShipper" className="text-gray-700 text-xs font-semibold cursor-pointer">
                          Shipper/Logistics
                        </label>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isCustomer"
                          checked={newVendor.isCustomer || false}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              isCustomer: e.target.checked,
                            });
                          }}
                          className="w-4 h-4 accent-orange-600 cursor-pointer rounded border-gray-300"
                        />
                        <label htmlFor="isCustomer" className="text-gray-700 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          Also a Customer
                        </label>
                      </div>

                      {/* Tax Registered */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="taxRegistered"
                          checked={newVendor.taxRegistered}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              taxRegistered: e.target.checked,
                            });
                            clearFieldError("taxNumber");
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer rounded border-gray-300"
                        />
                        <label htmlFor="taxRegistered" className="text-gray-700 text-xs font-semibold cursor-pointer whitespace-nowrap">
                          Tax Registered
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TAX INFO TAB */}
              {activeTab === "tax" && (
                <>
                  {/* Country Display */}
                  <div className="mb-2.5 p-2.5 bg-blue-50 rounded border border-blue-200">
                    <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                      Operating Country
                    </label>
                    <div className="text-xs font-bold text-blue-700">
                      {newVendor.country === 'IN' && '🇮🇳 India'}
                      {newVendor.country === 'AE' && '🇦🇪 UAE'}
                      {newVendor.country === 'OM' && '🇴🇲 Oman'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Tax Registered Status */}
                    <div className="col-span-2 flex items-center gap-2 p-2.5 bg-amber-50 rounded border border-amber-200">
                      <span className={`text-xs font-semibold ${
                        newVendor.taxRegistered ? 'text-amber-700' : 'text-gray-600'
                      }`}>
                        {newVendor.taxRegistered ? '✓ Tax Registered' : 'ℹ️ Not Tax Registered'}
                      </span>
                    </div>

                    {/* Tax Number (All Countries) - Conditional */}
                    {newVendor.taxRegistered && (
                      <div className="col-span-2">
                        <label className={`block text-xs font-semibold mb-0.5 ${
                          errors.taxNumber ? "text-red-600" : "text-gray-700"
                        }`}>
                          {newVendor.country === 'IN' ? 'GSTIN' : 'VAT/Tax Number'} *
                        </label>
                        <input
                          type="text"
                          value={newVendor.taxNumber}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              taxNumber: e.target.value.toUpperCase(),
                            });
                            clearFieldError("taxNumber");
                          }}
                          placeholder={
                            newVendor.country === 'AE' ? 'Enter 15-digit TR Number (e.g., 123456789012345)' :
                            newVendor.country === 'OM' ? 'Enter 11-digit TRN (e.g., 12345678901)' :
                            newVendor.country === 'IN' ? 'Enter 15-char GSTIN (e.g., 18AABCR5055K1Z0)' :
                            'Enter Tax Number'
                          }
                          className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none ${
                            errors.taxNumber
                              ? "border-red-500 bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          }`}
                        />
                        {errors.taxNumber && (
                          <span className="text-red-500 text-xs mt-0.5 block">✗ {errors.taxNumber}</span>
                        )}
                      </div>
                    )}

                    {/* GST Number (India only) */}
                    {newVendor.country === 'IN' && (
                      <div>
                        <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                          Alternate GSTIN
                        </label>
                        <input
                          type="text"
                          value={newVendor.gstNumber}
                          onChange={(e) => {
                            setNewVendor({ ...newVendor, gstNumber: e.target.value });
                            clearFieldError("gstNumber");
                          }}
                          className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Secondary GSTIN (optional)"
                        />
                      </div>
                    )}

                    {/* VAT ID (UAE/Oman) */}
                    {(newVendor.country === 'AE' || newVendor.country === 'OM') && (
                      <div>
                        <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                          VAT Registration ID
                        </label>
                        <input
                          type="text"
                          value={newVendor.vatId}
                          onChange={(e) => {
                            setNewVendor({ ...newVendor, vatId: e.target.value });
                            clearFieldError("vatId");
                          }}
                          className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="VAT Registration ID (optional)"
                        />
                      </div>
                    )}

                    {/* Tax Type (India only) */}
                    {newVendor.country === 'IN' && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${
                          errors.taxType ? "text-red-600" : "text-gray-700"
                        }`}>
                          Tax Type (GST Act 2017) *
                        </label>
                        <select
                          value={newVendor.taxType || ""}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              taxType: e.target.value,
                              taxGroupId: "",
                            });
                            clearFieldError("taxType");
                          }}
                          className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none ${
                            errors.taxType
                              ? "border-red-500 bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          }`}
                        >
                          <option value="" disabled className="text-gray-400">Select Tax Type</option>
                          <option value="Registered">Registered</option>
                          <option value="Unregistered">Unregistered</option>
                          <option value="Non-resident">Non-resident</option>
                          <option value="SEZ">SEZ</option>
                          <option value="Government Entity">Government Entity</option>
                          <option value="Other">Other</option>
                        </select>
                        {errors.taxType && (
                          <span className="text-red-500 text-xs mt-0.5 block">{errors.taxType}</span>
                        )}
                      </div>
                    )}

                    {/* Tax Group (India only, after tax type selected) */}
                    {newVendor.country === 'IN' && newVendor.taxType && (
                      <div>
                        <label className={`block text-xs font-semibold mb-1 ${
                          errors.taxGroupId ? "text-red-600" : "text-gray-700"
                        }`}>
                          Tax Group *
                        </label>
                        <select
                          value={newVendor.taxGroupId || ""}
                          onChange={(e) => {
                            setNewVendor({
                              ...newVendor,
                              taxGroupId: e.target.value,
                            });
                            clearFieldError("taxGroupId");
                          }}
                          className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none ${
                            errors.taxGroupId
                              ? "border-red-500 bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          }`}
                        >
                          <option value="" disabled className="text-gray-400">Select Tax Group</option>
                          {taxMaster && taxMaster
                            .filter(tg => tg.isActive && tg.countryCode === 'IN')
                            .map((group) => (
                              <option key={group._id} value={group._id}>
                                {group.taxName} - {group.taxType} ({group.totalRate}%)
                              </option>
                            ))}
                        </select>
                        {errors.taxGroupId && (
                          <span className="text-red-500 text-xs mt-0.5 block">{errors.taxGroupId}</span>
                        )}
                      </div>
                    )}

                    {/* Tax Info Summary */}
                    {(newVendor.country === 'UAE' || newVendor.country === 'Oman') && (
                      <div className="col-span-2 text-xs text-gray-500 italic p-2.5 bg-blue-50 rounded border border-blue-200">
                        ✓ VAT is automatically applied at {newVendor.country === 'UAE' ? '5%' : '5%'} for standard rate
                      </div>
                    )}

                    {newVendor.country === 'IN' && !newVendor.taxType && (
                      <div className="col-span-2 text-xs text-gray-500 italic p-2.5 bg-yellow-50 rounded border border-yellow-200">
                        ℹ️ Select tax type to configure GST rate and group
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* BANKING DETAILS TAB */}
              {activeTab === "banking" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Bank Name */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={newVendor.bankName}
                      onChange={(e) => {
                        setNewVendor({ ...newVendor, bankName: e.target.value });
                        clearFieldError("bankName");
                      }}
                      className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Bank Name"
                    />
                  </div>

                  {/* Account Holder */}
                  <div>
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={newVendor.accountHolder}
                      onChange={(e) => {
                        setNewVendor({ ...newVendor, accountHolder: e.target.value });
                        clearFieldError("accountHolder");
                      }}
                      className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Account Holder Name"
                    />
                  </div>

                  {/* Account Number */}
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={newVendor.accountNumber}
                      onChange={(e) => {
                        setNewVendor({ ...newVendor, accountNumber: e.target.value });
                        clearFieldError("accountNumber");
                      }}
                      className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Account Number"
                    />
                  </div>
                </div>
              )}

              {/* ACCOUNTING TAB */}
              {activeTab === "accounting" && (
                <div className="space-y-4">
                  {/* GL Account Info - Read Only */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-xs text-blue-900 mb-3">📊 GL Account Mapping</h3>
                    
                    {/* Supplier Account */}
                    <div className="mb-3 pb-3 border-b border-blue-200">
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Supplier Account (Sundry Creditors)</label>
                      <input
                        type="text"
                        value={newVendor.accountPayableId ? `Linked (ObjId: ${newVendor.accountPayableId.slice(0, 8)}...)` : "Not linked"}
                        disabled
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-600 mt-1">Account: 2210 (Auto-created when vendor added)</p>
                    </div>

                    {/* Dual Role Account */}
                    {newVendor.isCustomer && (
                      <div className="mb-3 pb-3 border-b border-green-200 bg-green-50 p-3 rounded">
                        <label className="text-xs font-semibold text-green-900 block mb-1">✓ Dual-Role Account (Related Parties)</label>
                        <input
                          type="text"
                          value={newVendor.dualRoleAccountId ? `Linked (ObjId: ${newVendor.dualRoleAccountId.slice(0, 8)}...)` : "Pending activation"}
                          disabled
                          className="w-full border border-green-300 px-3 py-2 rounded text-xs bg-green-100 text-green-800 cursor-not-allowed font-semibold"
                        />
                        <p className="text-xs text-green-700 mt-1">Account: 2250 (Enabled because vendor is also a Customer)</p>
                      </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-100 border border-blue-300 rounded p-2.5 mt-3">
                      <p className="text-xs text-blue-900 leading-relaxed">
                        <strong>ℹ️ How It Works:</strong><br/>
                        • <strong>Supplier Only:</strong> Posts to Sundry Creditors (2210)<br/>
                        • <strong>Supplier + Customer:</strong> Posts to Related Parties (2250) for unified tracking<br/>
                        • Balance shows net payable/receivable position
                      </p>
                    </div>
                  </div>

                  {/* Account Usage Guide */}
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                    <h3 className="font-semibold text-xs text-gray-800 mb-3">💡 Account Usage Guide</h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-1 px-2 bg-gray-100">Transaction</th>
                          <th className="text-left py-1 px-2 bg-gray-100">Account Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="py-1.5 px-2 text-gray-700">Purchase from Vendor (GRN)</td>
                          <td className="py-1.5 px-2 text-blue-700 font-semibold">
                            {newVendor.isCustomer ? "Related Parties (2250)" : "Sundry Creditors (2210)"}
                          </td>
                        </tr>
                        {newVendor.isCustomer && (
                          <tr className="border-b border-gray-200 bg-green-50">
                            <td className="py-1.5 px-2 text-gray-700">Sales to this Vendor (Invoice)</td>
                            <td className="py-1.5 px-2 text-green-700 font-semibold">Related Parties - Receivable (1250)</td>
                          </tr>
                        )}
                        <tr className="bg-gray-50">
                          <td className="py-1.5 px-2 text-gray-700">Payment to Vendor</td>
                          <td className="py-1.5 px-2 text-purple-700 font-semibold">
                            {newVendor.isCustomer ? "Related Parties (2250)" : "Sundry Creditors (2210)"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="border-t bg-gray-50 px-4 py-2.5 rounded-b-xl flex gap-2.5 justify-end flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition disabled:opacity-50 text-xs"
              >
                {loading ? "Saving..." : isEdit ? "Update Vendor" : "Save Vendor"}
              </button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default Vendors;


