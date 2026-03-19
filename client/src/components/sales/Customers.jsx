import React, { useEffect, useState } from "react";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import { useTaxMaster } from "../../hooks/useTaxMaster";

const Customers = () => {
  // Get company data for country-based tax type control
  const { company, taxMaster } = useTaxMaster();
  const isIndiaCompany = company?.countryCode === 'IN';
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalCustomers, setTotalCustomers] = useState(0);
  const itemsPerPage = 10;

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
    isSupplier: false, // ✅ ADDED - Customer can also be a supplier
  });

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("basic");
  const [previewPdf, setPreviewPdf] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ✅ Fetch Customers
  useEffect(() => {
    fetchCustomers();
  }, [currentPage, search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Country isolation: Always filter by company's country (NOT international sales)
      const companyCountry = company?.countryCode || 'AE';
      const url = `${API_URL}/api/v1/customers/getcustomers?page=${currentPage}&limit=${itemsPerPage}&country=${companyCountry}${
        search ? `&search=${search}` : ""
      }`;
      const response = await axios.get(url);
      setCustomers(response.data.customers || []);
      setTotalCustomers(response.data.total || 0);
      setError("");
    } catch (err) {
      setError("Failed to fetch customers");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    if (!newCustomer.name.trim()) newErrors.name = "Name is required";
    if (!newCustomer.email.trim()) newErrors.email = "Email is required";
    if (!newCustomer.phone.trim()) newErrors.phone = "Phone is required";
    if (!newCustomer.paymentType.trim()) newErrors.paymentType = "Payment Type is required";
    if (newCustomer.paymentType === "Credit Sale" && !newCustomer.paymentTerms.trim()) {
      newErrors.paymentTerms = "Payment Terms is required for Credit Sale";
    }
    setErrors(newErrors);
    
    // Show validation errors as toast if there are any
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join(" • ");
      showToast(errorMessages, "error");
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle Add/Edit Customer
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      // Country isolation: Always set customer's country to company's country
      const companyCountry = company?.countryCode || 'AE';
      const customerData = {
        ...newCustomer,
        country: companyCountry,  // Enforce country isolation
      };

      // ✅ Clean up invalid reference IDs - Only include taxGroupId for India companies
      if (!isIndiaCompany) {
        customerData.taxGroupId = null;
        customerData.taxType = null;
      } else {
        // For India, taxGroupId must be valid or empty
        if (!customerData.taxGroupId || customerData.taxGroupId.trim() === "") {
          customerData.taxGroupId = null;
        }
      }

      if (isEdit && editId) {
        // Update
        const response = await axios.put(
          `${API_URL}/api/v1/customers/updatecustomer/${editId}`,
          customerData
        );
        setCustomers(
          customers.map((c) => (c._id === editId ? response.data.customer : c))
        );
      } else {
        // Add
        const response = await axios.post(
          `${API_URL}/api/v1/customers/addcustomer`,
          customerData
        );
        setCustomers([response.data.customer, ...customers]);
      }
      resetForm();
      setIsModalOpen(false);
      setError("");
      showToast(isEdit ? "Customer updated successfully" : "Customer created successfully", "success");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to save customer";
      setError(errorMsg);
      showToast(errorMsg, "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;

    try {
      setLoading(true);
      await axios.delete(`${API_URL}/api/v1/customers/deletecustomer/${id}`);
      setCustomers(customers.filter((c) => c._id !== id));
      setError("");
    } catch (err) {
      setError("Failed to delete customer");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Edit
  const handleEdit = (customer) => {
    const editData = {
      customerCode: customer.customerCode || "",
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || "",
      city: customer.city || "",
      gstNumber: customer.gstNumber || "",
      paymentType: customer.paymentType || "",
      paymentTerms: customer.paymentTerms || "",
      creditLimit: customer.creditLimit || 0,
      status: customer.status || "Active",
      image: customer.image || null,
      documents: customer.documents || [],
      isSupplier: customer.isSupplier || false,
    };

    // Only include tax fields for India companies
    if (isIndiaCompany) {
      editData.taxType = customer.taxType || "";
      editData.taxGroupId = customer.taxGroupId || "";
    } else {
      editData.taxType = null;
      editData.taxGroupId = null;
    }

    setNewCustomer(editData);
    setEditId(customer._id);
    setIsEdit(true);
    setIsModalOpen(true);
    setActiveTab("basic");
    setPreviewPdf(null);
  };

  // ✅ Reset Form
  const resetForm = () => {
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
      isSupplier: false, // ✅ ADDED
    });
    setErrors({});
    setIsEdit(false);
    setEditId(null);
    setActiveTab("basic");
    setPreviewPdf(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalCustomers / itemsPerPage);

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 shadow-lg z-10">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">👥 Customers</h1>
          <button
            onClick={handleOpenModal}
            className="bg-white hover:bg-gray-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-md"
          >
            <Plus size={20} /> New Customer
          </button>
        </div>
      </div>

      {/* DETAILS - Content Section - Scrollable */}
      <div className="flex-1 flex flex-col p-4 min-h-0 overflow-hidden">
        {/* Search Bar - Fixed */}
        <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border p-4 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search customers by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 text-sm bg-red-100 text-red-700 rounded-lg border border-red-300 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && <div className="text-center py-8 text-gray-500">Loading customers...</div>}

        {/* Table - Scrollable */}
        {!loading && (
          <div className="flex-1 bg-white rounded-xl shadow-sm border flex flex-col min-h-0 overflow-hidden">
            {/* Table with Sticky Header */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs sticky top-0 z-10 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Code</th>
                    <th className="px-4 py-3 text-left font-bold">Name</th>
                    <th className="px-4 py-3 text-left font-bold">Email</th>
                    <th className="px-4 py-3 text-left font-bold">Phone</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-left font-bold">Type</th>
                    <th className="px-4 py-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <tr key={customer._id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 text-gray-800 font-semibold">{customer.customerCode}</td>
                        <td className="px-4 py-3 text-gray-800 font-semibold">{customer.name}</td>
                        <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                        <td className="px-4 py-3 text-gray-600">{customer.phone}</td>
                        <td className="px-4 py-3 text-gray-800">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            customer.status === 'Active' ? 'bg-green-100 text-green-800' :
                            customer.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                            customer.status === 'Blacklisted' ? 'bg-red-100 text-red-800' :
                            customer.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800 text-xs">
                          <div className="flex gap-1">
                            {customer.isSupplier && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">
                                Supplier
                              </span>
                            )}
                            {!customer.isSupplier && (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1.5 rounded text-xs mr-1.5 transition inline-flex items-center gap-1 font-semibold"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(customer._id)}
                            className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded text-xs transition inline-flex items-center gap-1 font-semibold"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-gray-400">
                        <div className="text-lg">📭 No customers found</div>
                        <div className="text-sm text-gray-400 mt-1">Try adjusting your search filters or add a new customer</div>
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
      {!loading && filteredCustomers.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t shadow-lg z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Pagination Info */}
              <div className="text-sm text-gray-700">
                <span className="font-bold">📊 Showing</span>{" "}
                <span className="text-blue-700 font-bold">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>
                {" - "}
                <span className="text-blue-700 font-bold">
                  {Math.min(currentPage * itemsPerPage, totalCustomers)}
                </span>
                {" of "}
                <span className="text-blue-700 font-bold">{totalCustomers}</span>
                <span className="text-gray-600"> customers (Page {currentPage}/{totalPages})</span>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-gray-700"
                  >
                    ⏮️ First
                  </button>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-gray-700"
                  >
                    ◀️ Prev
                  </button>

                  <div className="flex gap-1">
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
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
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
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-gray-700"
                  >
                    Next ▶️
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-gray-700"
                  >
                    Last ⏭️
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[70vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 rounded-t-2xl flex-shrink-0">
              <h2 className="text-2xl font-bold">
                {isEdit ? "✏️ Edit Customer" : "➕ Add New Customer"}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {isEdit ? "Update customer details" : "Create a new customer profile"}
              </p>
            </div>

            {/* Modal Content with Tabs */}
            <div className="border-b bg-white flex-shrink-0">
              <div className="flex gap-0 px-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("basic")}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                    activeTab === "basic"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  📋 Basic Info
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                    activeTab === "image"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  🖼️ Image
                </button>
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`px-6 py-3 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
                    activeTab === "documents"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-800"
                  }`}
                >
                  📄 Documents
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-scroll">
              {/* BASIC INFO TAB */}
              {activeTab === "basic" && (
                <>
                  {/* Customer Code - Display Only */}
                  {isEdit && newCustomer.customerCode && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Customer Code
                      </label>
                      <div className="text-sm font-bold text-blue-700">{newCustomer.customerCode}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newCustomer.name}
                        onChange={(e) => {
                          setNewCustomer({ ...newCustomer, name: e.target.value });
                          clearFieldError('name');
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Customer Name"
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
                        value={newCustomer.email}
                        onChange={(e) => {
                          setNewCustomer({ ...newCustomer, email: e.target.value });
                          clearFieldError('email');
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                        value={newCustomer.phone}
                        onChange={(e) => {
                          setNewCustomer({ ...newCustomer, phone: e.target.value });
                          clearFieldError('phone');
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Phone Number"
                      />
                      {errors.phone && (
                        <span className="text-red-500 text-xs mt-1 block">{errors.phone}</span>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={newCustomer.address}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, address: e.target.value })
                        }
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                        value={newCustomer.city}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, city: e.target.value })
                        }
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="City"
                      />
                    </div>

                    {/* GST Number */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Trn/GST Number
                      </label>
                      <input
                        type="text"
                        value={newCustomer.gstNumber}
                        onChange={(e) =>
                          setNewCustomer({ ...newCustomer, gstNumber: e.target.value })
                        }
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="GST Number"
                      />
                    </div>

                    {/* Tax Type (India only) */}
                    {isIndiaCompany && (
                      <div>
                        <label className="block text-gray-700 text-xs font-semibold mb-1">
                          Tax Type (GST Act 2017)
                        </label>
                        <select
                          value={newCustomer.taxType || ""}
                          onChange={(e) => {
                            setNewCustomer({
                              ...newCustomer,
                              taxType: e.target.value,
                              taxGroupId: "", // Reset tax group when tax type changes
                            });
                          }}
                          className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
                        >
                          <option value="" disabled className="text-gray-400">Select Tax Type</option>
                          <option value="Registered">Registered</option>
                          <option value="Unregistered">Unregistered</option>
                          <option value="Non-resident">Non-resident</option>
                          <option value="SEZ">SEZ</option>
                          <option value="Government Entity">Government Entity</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}

                    {/* Tax Group (India only, filtered by tax type) */}
                    {isIndiaCompany && newCustomer.taxType && (
                      <div>
                        <label className="block text-gray-700 text-xs font-semibold mb-1">
                          Tax Group
                        </label>
                        <select
                          value={newCustomer.taxGroupId || ""}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              taxGroupId: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
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
                      </div>
                    )}

                    {!isIndiaCompany && (
                      <div className="col-span-2 text-xs text-gray-500 italic">
                        Tax type and group fields are available for India companies only.
                      </div>
                    )}

                    {/* Payment Type */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${
                        errors.paymentType ? "text-red-600" : "text-gray-700"
                      }`}>
                        Payment Type
                      </label>
                      <select
                        value={newCustomer.paymentType}
                        onChange={(e) => {
                          setNewCustomer({
                            ...newCustomer,
                            paymentType: e.target.value,
                            paymentTerms: "", // Reset payment terms when payment type changes
                          });
                          clearFieldError('paymentType');
                          clearFieldError('paymentTerms');
                        }}
                        className={`w-full border px-3 py-2 rounded text-xs outline-none ${
                          errors.paymentType
                            ? "border-red-500 bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                      >
                        <option value="" disabled className="text-gray-400">Select Payment Type</option>
                        <option value="Credit Sale">Credit Sale</option>
                        <option value="Cash Sale">Cash Sale</option>
                      </select>
                      {errors.paymentType && (
                        <p className="text-red-600 text-xs mt-1">{errors.paymentType}</p>
                      )}
                    </div>

                    {/* Payment Terms */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${
                        newCustomer.paymentType === "Cash Sale"
                          ? "text-gray-400"
                          : errors.paymentTerms ? "text-red-600" : "text-gray-700"
                      }`}>
                        Payment Terms
                      </label>
                      <select
                        disabled={newCustomer.paymentType === "Cash Sale"}
                        value={newCustomer.paymentTerms}
                        onChange={(e) => {
                          setNewCustomer({
                            ...newCustomer,
                            paymentTerms: e.target.value,
                          });
                          setErrors({ ...errors, paymentTerms: "" });
                        }}
                        className={`w-full border px-3 py-2 rounded text-xs outline-none ${
                          newCustomer.paymentType === "Cash Sale"
                            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                            : errors.paymentTerms
                            ? "border-red-500 bg-white text-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                      >
                        <option value="" disabled className="text-gray-400">Select Payment Terms</option>
                        <option value="NET 30">NET 30</option>
                        <option value="NET 60">NET 60</option>
                        <option value="NET 90">NET 90</option>
                        <option value="COD">COD</option>
                      </select>
                      {errors.paymentTerms && (
                        <p className="text-red-600 text-xs mt-1">{errors.paymentTerms}</p>
                      )}
                    </div>

                    {/* Credit Limit */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${
                        newCustomer.paymentType === "Cash Sale"
                          ? "text-gray-400"
                          : "text-gray-700"
                      }`}>
                        Credit Limit (AED)
                      </label>
                      <input
                        type="number"
                        disabled={newCustomer.paymentType === "Cash Sale"}
                        value={newCustomer.creditLimit}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            creditLimit: parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`w-full border px-3 py-2 rounded text-xs outline-none ${
                          newCustomer.paymentType === "Cash Sale"
                            ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                            : "border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        }`}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-gray-700 text-xs font-semibold mb-1">
                        Status
                      </label>
                      <select
                        value={newCustomer.status}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            status: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value={newCustomer.status}>{newCustomer.status}</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Blacklisted">Blacklisted</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </div>

                    {/* Supplier Flag */}
                    <div className="flex items-center gap-2 h-full pt-5">
                      <input
                        type="checkbox"
                        id="isSupplier"
                        checked={newCustomer.isSupplier || false}
                        onChange={(e) => {
                          setNewCustomer({
                            ...newCustomer,
                            isSupplier: e.target.checked,
                          });
                        }}
                        className="w-4 h-4 accent-green-600 cursor-pointer rounded border-gray-300"
                      />
                      <label htmlFor="isSupplier" className="text-gray-700 text-xs font-semibold cursor-pointer whitespace-nowrap">
                        Also a Supplier
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* IMAGE TAB */}
              {activeTab === "image" && (
                <div className="flex flex-col items-center justify-center gap-4">
                  {/* Image Preview */}
                  {newCustomer.image ? (
                    <div className="mt-4">
                      <img
                        src={newCustomer.image}
                        alt="Customer"
                        className="w-48 h-48 object-cover rounded-lg border-2 border-blue-300 shadow-lg"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 w-48 h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <span className="text-gray-400 text-2xl">📷 No Image</span>
                    </div>
                  )}

                  {/* File Input */}
                  <div className="w-full max-w-xs">
                    <label className="block text-gray-700 text-xs font-semibold mb-2">
                      Upload Customer Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewCustomer({
                              ...newCustomer,
                              image: reader.result,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <p className="text-gray-500 text-xs mt-2">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
                  </div>

                  {/* Clear Button */}
                  {newCustomer.image && (
                    <button
                      onClick={() =>
                        setNewCustomer({
                          ...newCustomer,
                          image: null,
                        })
                      }
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === "documents" && (
                <div className="flex flex-col gap-4">
                  {/* Document Upload Section */}
                  <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">📄 Upload Security Documents</h3>
                    <p className="text-xs text-gray-600 mb-4">Upload documents like business registration, tax certificates, and credit references for credit sale customers.</p>
                    
                    <div className="flex flex-col gap-3">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              alert("File size exceeds 10MB limit");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const newDoc = {
                                name: file.name,
                                data: reader.result,
                                uploadedAt: new Date().toISOString(),
                              };
                              setNewCustomer({
                                ...newCustomer,
                                documents: [...(newCustomer.documents || []), newDoc],
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <p className="text-gray-500 text-xs">Supported format: PDF only (Max 10MB per file)</p>
                    </div>
                  </div>

                  {/* Uploaded Documents List */}
                  {newCustomer.documents && newCustomer.documents.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b">
                        <p className="text-sm font-bold text-gray-700">📋 Uploaded Documents ({newCustomer.documents.length})</p>
                      </div>
                      <div className="divide-y max-h-96 overflow-y-auto">
                        {newCustomer.documents.map((doc, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                              <p className="text-xs text-gray-500">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => setPreviewPdf(doc)}
                                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold transition"
                              >
                                👁️ View
                              </button>
                              <button
                                onClick={() => {
                                  setNewCustomer({
                                    ...newCustomer,
                                    documents: newCustomer.documents.filter((_, i) => i !== idx),
                                  });
                                  if (previewPdf === doc) {
                                    setPreviewPdf(null);
                                  }
                                }}
                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-400 text-sm">📭 No documents uploaded yet</p>
                      <p className="text-gray-400 text-xs mt-1">Upload PDF documents for credit sale verification</p>
                    </div>
                  )}

                  {/* PDF Preview Modal */}
                  {previewPdf && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-96 flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
                          <h3 className="font-bold">{previewPdf.name}</h3>
                          <button
                            onClick={() => setPreviewPdf(null)}
                            className="text-white hover:bg-blue-800 px-3 py-1 rounded transition"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="flex-1 overflow-hidden bg-gray-50">
                          <embed
                            src={previewPdf.data}
                            type="application/pdf"
                            width="100%"
                            height="100%"
                            className="w-full h-full"
                          />
                        </div>
                        <div className="border-t bg-gray-50 px-6 py-3 flex gap-3 justify-end">
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = previewPdf.data;
                              link.download = previewPdf.name;
                              link.click();
                            }}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-semibold transition text-xs"
                          >
                            ⬇️ Download
                          </button>
                          <button
                            onClick={() => setPreviewPdf(null)}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold transition text-xs"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t bg-gray-50 px-6 py-3 rounded-b-2xl flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition disabled:opacity-50 text-xs"
              >
                {loading ? "Saving..." : isEdit ? "Update Customer" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default Customers;


