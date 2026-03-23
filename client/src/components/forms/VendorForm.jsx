import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useTaxMaster } from "../../hooks/useTaxMaster";

/**
 * Global Vendor Form Component
 * Reusable vendor creation/editing form with complete validation
 * 
 * Usage:
 * const [showForm, setShowForm] = useState(false);
 * <VendorForm 
 *   isOpen={showForm} 
 *   onClose={() => setShowForm(false)}
 *   onSuccess={() => refreshVendorsList()}
 *   initialData={vendorToEdit}
 * />
 */
const VendorForm = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const { company, taxMaster } = useTaxMaster();
  const isIndiaCompany = company?.countryCode === 'IN';

  // ✅ Country Code Mapping
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

  const getCountryCode = (countryName) => countryCodeMap[countryName] || 'AE';
  const getCountryName = (countryCode) => countryNameMap[countryCode] || 'UAE';

  // ✅ Form State
  const [vendor, setVendor] = useState({
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
    isSupplier: true,
    isShipper: false,
    isCustomer: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [isDragging, setIsDragging] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: -100 }); // ✅ Start slightly above center
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isEditMode = !!initialData;

  // ✅ Initialize form with data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setVendor({
          vendorCode: initialData.vendorCode || "",
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
          city: initialData.city || "",
          country: initialData.country || company?.countryCode || 'AE',
          taxRegistered: !!initialData.taxRegistered,
          paymentType: initialData.paymentType || "Credit",
          creditDays: initialData.creditDays || 30,
          paymentTerms: initialData.paymentTerms || "NET 30",
          taxNumber: initialData.taxNumber || "",
          gstNumber: initialData.gstNumber || "",
          vatId: initialData.vatId || "",
          taxType: isIndiaCompany ? (initialData.taxType || "") : null,
          taxGroupId: isIndiaCompany ? (initialData.taxGroupId || "") : null,
          status: initialData.status || "Active",
          bankName: initialData.bankName || "",
          accountNumber: initialData.accountNumber || "",
          accountHolder: initialData.accountHolder || "",
          isSupplier: initialData.isSupplier !== false,
          isShipper: initialData.isShipper || false,
          isCustomer: initialData.isCustomer || false,
          _id: initialData._id,
        });
      } else {
        resetForm();
      }
      setActiveTab("basic");
    }
  }, [isOpen, initialData]);

  // ✅ Tax Number Validation
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

  // ✅ Form Validation
  const validateForm = () => {
    const newErrors = {};

    if (!vendor.name.trim()) newErrors.name = "Name is required";
    if (!vendor.email.trim()) newErrors.email = "Email is required";
    if (!vendor.phone.trim()) newErrors.phone = "Phone is required";
    if (!vendor.country) newErrors.country = "Country is required";

    if (vendor.taxRegistered) {
      if (!vendor.taxNumber.trim()) {
        newErrors.taxNumber = `Tax Number is required for registered vendors`;
      } else if (!validateTaxNumber(vendor.taxNumber, vendor.country)) {
        if (vendor.country === 'AE') {
          newErrors.taxNumber = "Valid UAE TR Number required (15 digits)";
        } else if (vendor.country === 'OM') {
          newErrors.taxNumber = "Valid Oman TRN required (11 digits)";
        } else if (vendor.country === 'IN') {
          newErrors.taxNumber = "Valid Indian GSTIN required (15 characters)";
        }
      }
    }

    if (vendor.paymentType === "Credit" && !vendor.paymentTerms?.trim()) {
      newErrors.paymentTerms = "Payment Terms is required for credit payments";
    }
    if (vendor.paymentType === "Credit" && !vendor.creditDays) {
      newErrors.creditDays = "Credit Days are required for credit payment";
    }

    if (vendor.country === 'IN' && !vendor.taxType) {
      newErrors.taxType = "Tax Type is required for India";
    }
    if (vendor.country === 'IN' && vendor.taxType && !vendor.taxGroupId) {
      newErrors.taxGroupId = "Tax Group is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Clear Field Error
  const clearFieldError = (fieldName) => {
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // ✅ Reset Form
  const resetForm = () => {
    setVendor({
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
      isSupplier: true,
      isShipper: false,
      isCustomer: false,
    });
    setErrors({});
  };

  // ✅ Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const vendorData = { ...vendor };

      // Clean up for backend
      if (typeof vendorData.country === 'string' && vendorData.country.length > 2) {
        vendorData.country = getCountryCode(vendorData.country);
      }

      if (!isIndiaCompany) {
        vendorData.taxGroupId = null;
        vendorData.taxType = null;
      } else {
        if (!vendorData.taxGroupId || vendorData.taxGroupId.trim() === "") {
          vendorData.taxGroupId = null;
        }
      }

      if (isEditMode && vendor._id) {
        await axios.put(
          `${API_URL}/vendors/updatevendor/${vendor._id}`,
          vendorData
        );
      } else {
        await axios.post(
          `${API_URL}/vendors/addvendor`,
          vendorData
        );
      }

      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error) {
      const errorMsg = error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} vendor`;
      setErrors({ submit: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Drag Modal - Optimized with Center Position
  const handleModalMouseDown = (e) => {
    if (e.currentTarget.classList.contains('modal-header')) {
      setIsDragging(true);
      dragOffsetRef.current = {
        x: e.clientX - modalPosition.x - window.innerWidth / 2,
        y: e.clientY - modalPosition.y - window.innerHeight / 2,
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId;

    const handleMouseMove = (e) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setModalPosition({
          x: e.clientX - window.innerWidth / 2 - dragOffsetRef.current.x,
          y: e.clientY - window.innerHeight / 2 - dragOffsetRef.current.y,
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
  }, [isDragging]);

  // ✅ Handle Close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="fixed bg-white rounded-lg shadow-2xl z-50 flex flex-col max-h-[90vh] w-[600px] max-w-[90vw]"
        style={{
          left: `calc(50% + ${modalPosition.x}px)`,
          top: `calc(50% + ${modalPosition.y}px)`,
          transform: 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : 'box-shadow 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          className="modal-header flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg cursor-grab active:cursor-grabbing"
          onMouseDown={handleModalMouseDown}
        >
          <h2 className="text-lg font-bold">
            {isEditMode ? `✏️ Edit Vendor` : `➕ New Vendor`}
          </h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white/20 p-1 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
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
              🏦 Banking
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          {/* Error Message */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-xs">
              ❌ {errors.submit}
            </div>
          )}

          {/* BASIC INFO TAB */}
          {activeTab === "basic" && (
            <div className="space-y-3">
              {/* Vendor Code - Display Only */}
              {isEditMode && vendor.vendorCode && (
                <div className="p-2.5 bg-blue-50 rounded border border-blue-200">
                  <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                    Vendor Code
                  </label>
                  <div className="text-xs font-bold text-blue-700">{vendor.vendorCode}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={vendor.name}
                    onChange={(e) => {
                      setVendor({ ...vendor, name: e.target.value });
                      clearFieldError("name");
                    }}
                    className={`w-full border px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-2 ${
                      errors.name
                        ? "border-red-500 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Vendor Name"
                  />
                  {errors.name && (
                    <span className="text-red-500 text-xs mt-0.5 block">{errors.name}</span>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={vendor.email}
                    onChange={(e) => {
                      setVendor({ ...vendor, email: e.target.value });
                      clearFieldError("email");
                    }}
                    className={`w-full border px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-2 ${
                      errors.email
                        ? "border-red-500 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Email Address"
                  />
                  {errors.email && (
                    <span className="text-red-500 text-xs mt-0.5 block">{errors.email}</span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={vendor.phone}
                    onChange={(e) => {
                      setVendor({ ...vendor, phone: e.target.value });
                      clearFieldError("phone");
                    }}
                    className={`w-full border px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-2 ${
                      errors.phone
                        ? "border-red-500 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Phone Number"
                  />
                  {errors.phone && (
                    <span className="text-red-500 text-xs mt-0.5 block">{errors.phone}</span>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={vendor.address}
                    onChange={(e) => {
                      setVendor({ ...vendor, address: e.target.value });
                      clearFieldError("address");
                    }}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street Address"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={vendor.city}
                    onChange={(e) => {
                      setVendor({ ...vendor, city: e.target.value });
                      clearFieldError("city");
                    }}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${
                    errors.country ? "text-red-600" : "text-gray-700"
                  }`}>
                    Country *
                  </label>
                  <select
                    value={vendor.country}
                    onChange={(e) => {
                      setVendor({
                        ...vendor,
                        country: e.target.value,
                        taxType: e.target.value === 'IN' ? "" : null,
                        taxGroupId: e.target.value === 'IN' ? "" : null,
                      });
                      clearFieldError("country");
                    }}
                    className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 ${
                      errors.country
                        ? "border-red-500 bg-red-50 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  >
                    <option value="AE">🇦🇪 UAE</option>
                    <option value="OM">🇴🇲 Oman</option>
                    <option value="IN">🇮🇳 India</option>
                  </select>
                  {errors.country && (
                    <span className="text-red-500 text-xs mt-0.5 block">{errors.country}</span>
                  )}
                </div>

                {/* Payment Type */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Payment Type *
                  </label>
                  <select
                    value={vendor.paymentType}
                    onChange={(e) => {
                      const paymentType = e.target.value;
                      setVendor({
                        ...vendor,
                        paymentType,
                        paymentTerms: paymentType === "Cash" ? null : vendor.paymentTerms,
                        creditDays: paymentType === "Cash" ? 0 : vendor.creditDays,
                      });
                      clearFieldError("paymentTerms");
                      clearFieldError("creditDays");
                    }}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Credit">Credit</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* Credit Days */}
                {vendor.paymentType === "Credit" && (
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${
                      errors.creditDays ? "text-red-600" : "text-gray-700"
                    }`}>
                      Credit Days *
                    </label>
                    <select
                      value={vendor.creditDays || ""}
                      onChange={(e) => {
                        setVendor({
                          ...vendor,
                          creditDays: parseInt(e.target.value) || 30,
                        });
                        clearFieldError("creditDays");
                      }}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
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
                    Payment Terms {vendor.paymentType === "Credit" && "*"}
                  </label>
                  <select
                    value={vendor.paymentTerms || ""}
                    onChange={(e) => {
                      setVendor({ ...vendor, paymentTerms: e.target.value });
                      clearFieldError("paymentTerms");
                    }}
                    disabled={vendor.paymentType === "Cash"}
                    className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 ${
                      vendor.paymentType === "Cash"
                        ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-60"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                  >
                    <option value="">Select Payment Terms</option>
                    <option value="NET 30">NET 30</option>
                    <option value="NET 60">NET 60</option>
                    <option value="NET 90">NET 90</option>
                    <option value="Immediate">Immediate</option>
                    <option value="Custom">Custom</option>
                  </select>
                  {vendor.paymentType === "Cash" && (
                    <p className="text-gray-500 text-xs mt-1 italic">ℹ️ Not required for cash payments</p>
                  )}
                  {errors.paymentTerms && (
                    <span className="text-red-500 text-xs mt-0.5 block">{errors.paymentTerms}</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Status
                  </label>
                  <select
                    value={vendor.status}
                    onChange={(e) => {
                      setVendor({ ...vendor, status: e.target.value });
                      clearFieldError("status");
                    }}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blacklisted">Blacklisted</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Type Checkboxes */}
              <div className="grid grid-cols-4 gap-3 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSupplier"
                    checked={vendor.isSupplier}
                    onChange={(e) => setVendor({ ...vendor, isSupplier: e.target.checked })}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="isSupplier" className="text-gray-700 text-xs font-semibold cursor-pointer">
                    Supplier
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isShipper"
                    checked={vendor.isShipper}
                    onChange={(e) => setVendor({ ...vendor, isShipper: e.target.checked })}
                    className="w-4 h-4 accent-green-600 cursor-pointer"
                  />
                  <label htmlFor="isShipper" className="text-gray-700 text-xs font-semibold cursor-pointer">
                    Shipper
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCustomer"
                    checked={vendor.isCustomer}
                    onChange={(e) => setVendor({ ...vendor, isCustomer: e.target.checked })}
                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                  />
                  <label htmlFor="isCustomer" className="text-gray-700 text-xs font-semibold cursor-pointer">
                    Also Customer
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="taxRegistered"
                    checked={vendor.taxRegistered}
                    onChange={(e) => {
                      setVendor({ ...vendor, taxRegistered: e.target.checked });
                      clearFieldError("taxNumber");
                    }}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="taxRegistered" className="text-gray-700 text-xs font-semibold cursor-pointer">
                    Tax Registered
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAX INFO TAB */}
          {activeTab === "tax" && (
            <div className="space-y-3">
              {/* Country Display */}
              <div className="p-2.5 bg-blue-50 rounded border border-blue-200">
                <label className="block text-gray-700 text-xs font-semibold mb-0.5">
                  Operating Country
                </label>
                <div className="text-xs font-bold text-blue-700">
                  {vendor.country === 'IN' && '🇮🇳 India'}
                  {vendor.country === 'AE' && '🇦🇪 UAE'}
                  {vendor.country === 'OM' && '🇴🇲 Oman'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tax Registered Status */}
                <div className="col-span-2 flex items-center gap-2 p-2.5 bg-amber-50 rounded border border-amber-200">
                  <span className={`text-xs font-semibold ${
                    vendor.taxRegistered ? 'text-amber-700' : 'text-gray-600'
                  }`}>
                    {vendor.taxRegistered ? '✓ Tax Registered' : 'ℹ️ Not Tax Registered'}
                  </span>
                </div>

                {/* Tax Number */}
                {vendor.taxRegistered && (
                  <div className="col-span-2">
                    <label className={`block text-xs font-semibold mb-1 ${
                      errors.taxNumber ? "text-red-600" : "text-gray-700"
                    }`}>
                      {vendor.country === 'IN' ? 'GSTIN' : 'VAT/Tax Number'} *
                    </label>
                    <input
                      type="text"
                      value={vendor.taxNumber}
                      onChange={(e) => {
                        setVendor({ ...vendor, taxNumber: e.target.value.toUpperCase() });
                        clearFieldError("taxNumber");
                      }}
                      placeholder={
                        vendor.country === 'AE' ? 'Enter 15-digit TR Number' :
                        vendor.country === 'OM' ? 'Enter 11-digit TRN' :
                        'Enter 15-char GSTIN'
                      }
                      className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 ${
                        errors.taxNumber
                          ? "border-red-500 bg-red-50 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                    {errors.taxNumber && (
                      <span className="text-red-500 text-xs mt-0.5 block">✗ {errors.taxNumber}</span>
                    )}
                  </div>
                )}

                {/* GST Number - India Only */}
                {vendor.country === 'IN' && (
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      Alternate GSTIN
                    </label>
                    <input
                      type="text"
                      value={vendor.gstNumber}
                      onChange={(e) => {
                        setVendor({ ...vendor, gstNumber: e.target.value });
                        clearFieldError("gstNumber");
                      }}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Secondary GSTIN (optional)"
                    />
                  </div>
                )}

                {/* VAT ID - UAE/Oman */}
                {(vendor.country === 'AE' || vendor.country === 'OM') && (
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-xs font-semibold mb-1">
                      VAT Registration ID
                    </label>
                    <input
                      type="text"
                      value={vendor.vatId}
                      onChange={(e) => {
                        setVendor({ ...vendor, vatId: e.target.value });
                        clearFieldError("vatId");
                      }}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="VAT Registration ID (optional)"
                    />
                  </div>
                )}

                {/* Tax Type - India Only */}
                {vendor.country === 'IN' && (
                  <>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${
                        errors.taxType ? "text-red-600" : "text-gray-700"
                      }`}>
                        Tax Type *
                      </label>
                      <select
                        value={vendor.taxType || ""}
                        onChange={(e) => {
                          setVendor({ ...vendor, taxType: e.target.value });
                          clearFieldError("taxType");
                        }}
                        className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 ${
                          errors.taxType
                            ? "border-red-500 bg-red-50 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                      >
                        <option value="">Select Tax Type</option>
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

                    {/* Tax Group - India Only */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${
                        errors.taxGroupId ? "text-red-600" : "text-gray-700"
                      }`}>
                        Tax Group *
                      </label>
                      <select
                        value={vendor.taxGroupId || ""}
                        onChange={(e) => {
                          setVendor({ ...vendor, taxGroupId: e.target.value });
                          clearFieldError("taxGroupId");
                        }}
                        className={`w-full border px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 ${
                          errors.taxGroupId
                            ? "border-red-500 bg-red-50 focus:ring-red-500"
                            : "border-gray-300 focus:ring-blue-500"
                        }`}
                      >
                        <option value="">Select Tax Group</option>
                        {taxMaster?.map((tax) => (
                          <option key={tax._id} value={tax._id}>
                            {tax.taxName} ({tax.countryCode})
                          </option>
                        ))}
                      </select>
                      {errors.taxGroupId && (
                        <span className="text-red-500 text-xs mt-0.5 block">{errors.taxGroupId}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* BANKING TAB */}
          {activeTab === "banking" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {/* Bank Name */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={vendor.bankName}
                    onChange={(e) => setVendor({ ...vendor, bankName: e.target.value })}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Bank Name"
                  />
                </div>

                {/* Account Holder */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Account Holder
                  </label>
                  <input
                    type="text"
                    value={vendor.accountHolder}
                    onChange={(e) => setVendor({ ...vendor, accountHolder: e.target.value })}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Account Holder Name"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={vendor.accountNumber}
                    onChange={(e) => setVendor({ ...vendor, accountNumber: e.target.value })}
                    className="w-full border border-gray-300 px-2.5 py-1.5 rounded text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Account Number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNTING TAB */}
          {activeTab === "accounting" && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-700 font-semibold mb-2">ℹ️ Accounting Information</p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li>GL Account (Accounts Payable) is auto-created on save</li>
                  <li>Dual-role account linked if marked as Customer</li>
                  <li>Bank details linked to payment tracking</li>
                </ul>
              </div>
            </div>
          )}
        </form>

        {/* Footer - Actions */}
        <div className="border-t bg-white p-4 flex items-center justify-end gap-2.5 flex-shrink-0 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? "Saving..." : isEditMode ? "Update" : "Create"} Vendor
          </button>
        </div>
      </div>
    </>
  );
};

export default VendorForm;
