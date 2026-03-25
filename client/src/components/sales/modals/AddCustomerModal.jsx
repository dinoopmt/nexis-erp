import React, { useState, useEffect } from "react";
import { X, Upload, Download, Trash2, Eye } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../../config/config";
import { useTaxMaster } from "../../../hooks/useTaxMaster";

export default function AddCustomerModal({
  show,
  onClose,
  onCustomerAdded,
  existingCustomers = [],
}) {
  const { company, taxMaster } = useTaxMaster();
  const isIndiaCompany = company?.countryCode === "IN";

  // Form state
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    gstNumber: "",
    taxType: isIndiaCompany ? "" : null,
    taxGroupId: isIndiaCompany ? "" : null,
    paymentType: "",
    paymentTerms: "",
    creditLimit: 0,
    status: "Active",
    image: null,
    documents: [],
    isSupplier: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [imagePreview, setImagePreview] = useState(null);
  const [previewPdf, setPreviewPdf] = useState(null);

  if (!show) return null;

  // Get filtered tax groups based on tax type
  const filteredTaxGroups = taxMaster?.filter(
    (tg) =>
      tg.isActive &&
      tg.countryCode === "IN" &&
      tg.taxType === newCustomer.taxType
  ) || [];

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!newCustomer.name.trim()) newErrors.name = "Name is required";
    if (!newCustomer.email.trim()) newErrors.email = "Email is required";
    if (!newCustomer.phone.trim()) newErrors.phone = "Phone is required";
    if (!newCustomer.paymentType.trim())
      newErrors.paymentType = "Payment Type is required";

    if (
      newCustomer.paymentType === "Credit Sale" &&
      !newCustomer.paymentTerms.trim()
    ) {
      newErrors.paymentTerms = "Payment Terms is required for Credit Sale";
    }

    if (isIndiaCompany && !newCustomer.taxType.trim()) {
      newErrors.taxType = "Tax Type is required";
    }

    if (isIndiaCompany && !newCustomer.taxGroupId.trim()) {
      newErrors.taxGroupId = "Tax Group is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setNewCustomer({ ...newCustomer, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setNewCustomer({ ...newCustomer, image: base64 });
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const files = e.target.files;
    if (files) {
      for (let file of files) {
        if (file.type !== "application/pdf") {
          alert("Only PDF files are accepted");
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          alert("File size must not exceed 10 MB");
          continue;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result;
          const doc = {
            name: file.name,
            data: base64,
            uploadedAt: new Date().toISOString(),
          };
          setNewCustomer({
            ...newCustomer,
            documents: [...(newCustomer.documents || []), doc],
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Remove document
  const removeDocument = (index) => {
    const updatedDocs = newCustomer.documents.filter((_, i) => i !== index);
    setNewCustomer({ ...newCustomer, documents: updatedDocs });
  };

  // Remove image
  const removeImage = () => {
    setNewCustomer({ ...newCustomer, image: null });
    setImagePreview(null);
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const companyCountry = company?.countryCode || "AE";
      const customerData = {
        ...newCustomer,
        country: companyCountry,
      };

      // Clean tax fields for non-India companies
      if (!isIndiaCompany) {
        customerData.taxGroupId = null;
        customerData.taxType = null;
      }

      const response = await axios.post(
        `${API_URL}/api/v1/customers/addcustomer`,
        customerData
      );

      // Success toast
      console.log("✓ Customer created:", response.data.customer);

      // Callback to parent
      if (onCustomerAdded) {
        onCustomerAdded(response.data.customer);
      }

      // Reset and close
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        gstNumber: "",
        taxType: isIndiaCompany ? "" : null,
        taxGroupId: isIndiaCompany ? "" : null,
        paymentType: "",
        paymentTerms: "",
        creditLimit: 0,
        status: "Active",
        image: null,
        documents: [],
        isSupplier: false,
      });
      setImagePreview(null);
      onClose();
    } catch (err) {
      console.error("Error creating customer:", err);
      alert(err.response?.data?.message || "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[75vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">➕ Add New Customer</h2>
            <p className="text-blue-100 text-sm mt-1">Create a new customer profile</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b bg-white flex-shrink-0">
          <div className="flex gap-0 px-6">
            <button
              onClick={() => setActiveTab("basic")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "basic"
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              📋 Basic Info
            </button>
            <button
              onClick={() => setActiveTab("image")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "image"
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              🖼️ Image
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "documents"
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-600 border-transparent hover:text-gray-800"
              }`}
            >
              📄 Documents
            </button>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB: Basic Info */}
          {activeTab === "basic" && (
            <div className="grid grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter customer name"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="email@example.com"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+971501234567"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.phone ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Street address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={newCustomer.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="City name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* GST/TRN Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID (GST/TRN)
                </label>
                <input
                  type="text"
                  value={newCustomer.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                  placeholder="Tax ID number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Tax Type (India only) */}
              {isIndiaCompany && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCustomer.taxType || ""}
                    onChange={(e) => {
                      handleInputChange("taxType", e.target.value);
                      handleInputChange("taxGroupId", ""); // Reset tax group
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                      errors.taxType ? "border-red-500" : "border-gray-300"
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
                  {errors.taxType && <p className="text-red-500 text-xs mt-1">{errors.taxType}</p>}
                </div>
              )}

              {/* Tax Group (India only) */}
              {isIndiaCompany && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Group <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newCustomer.taxGroupId || ""}
                    onChange={(e) => handleInputChange("taxGroupId", e.target.value)}
                    disabled={!newCustomer.taxType}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 ${
                      errors.taxGroupId ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Tax Group</option>
                    {filteredTaxGroups.map((tg) => (
                      <option key={tg._id} value={tg._id}>
                        {tg.name} ({tg.totalRate}%)
                      </option>
                    ))}
                  </select>
                  {errors.taxGroupId && <p className="text-red-500 text-xs mt-1">{errors.taxGroupId}</p>}
                </div>
              )}

              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newCustomer.paymentType}
                  onChange={(e) => {
                    handleInputChange("paymentType", e.target.value);
                    handleInputChange("paymentTerms", "");
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                    errors.paymentType ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Select Payment Type</option>
                  <option value="Credit Sale">Credit Sale</option>
                  <option value="Cash Sale">Cash Sale</option>
                </select>
                {errors.paymentType && <p className="text-red-500 text-xs mt-1">{errors.paymentType}</p>}
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  value={newCustomer.paymentTerms}
                  onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                  disabled={newCustomer.paymentType === "Cash Sale"}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 ${
                    errors.paymentTerms ? "border-red-500" : ""
                  }`}
                >
                  <option value="">Select Terms</option>
                  <option value="NET 30">NET 30</option>
                  <option value="NET 60">NET 60</option>
                  <option value="NET 90">NET 90</option>
                  <option value="COD">COD</option>
                </select>
                {errors.paymentTerms && <p className="text-red-500 text-xs mt-1">{errors.paymentTerms}</p>}
              </div>

              {/* Credit Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credit Limit
                </label>
                <input
                  type="number"
                  value={newCustomer.creditLimit}
                  onChange={(e) => handleInputChange("creditLimit", parseFloat(e.target.value))}
                  placeholder="0.00"
                  disabled={newCustomer.paymentType === "Cash Sale"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={newCustomer.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blacklisted">Blacklisted</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              {/* Supplier Checkbox - Full width */}
              <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isSupplier"
                  checked={newCustomer.isSupplier}
                  onChange={(e) => handleInputChange("isSupplier", e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isSupplier" className="text-sm font-medium text-gray-700 cursor-pointer">
                  ✓ Also a Supplier
                </label>
              </div>
            </div>
          )}

          {/* TAB: Image Upload */}
          {activeTab === "image" && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Customer"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <Upload size={48} className="mx-auto mb-2" />
                    <p className="text-sm">No image selected</p>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="imageInput"
              />

              <div className="flex gap-3">
                <label
                  htmlFor="imageInput"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition text-sm font-medium"
                >
                  Upload Image
                </label>
                {imagePreview && (
                  <button
                    onClick={removeImage}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                Supported formats: JPG, PNG, GIF. Max size: 5 MB
              </p>
            </div>
          )}

          {/* TAB: Documents Upload */}
          {activeTab === "documents" && (
            <div className="flex flex-col gap-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleDocumentUpload}
                  className="hidden"
                  id="documentInput"
                />
                <label
                  htmlFor="documentInput"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload size={48} className="text-gray-400 mb-2" />
                  <p className="font-medium text-gray-700">Click to upload PDF documents</p>
                  <p className="text-xs text-gray-500 mt-1">Max 10 MB per file</p>
                </label>
              </div>

              {/* Document List */}
              {newCustomer.documents && newCustomer.documents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-700">Uploaded Documents</h3>
                  {newCustomer.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-600 font-bold text-xs">
                          PDF
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(idx)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        <div className="border-t bg-gray-50 px-6 py-4 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
          >
            {loading ? "Saving..." : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
