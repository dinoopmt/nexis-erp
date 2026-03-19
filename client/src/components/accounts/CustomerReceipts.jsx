import React, { useState, useEffect } from "react";
import { Plus, Trash2, Eye, Filter, Download, CheckCircle, Clock, AlertCircle } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";
import useDecimalFormat from "../../hooks/useDecimalFormat";
import { useTaxMaster } from "../../hooks/useTaxMaster";

const CustomerReceipts = () => {
  // Get company data for country-based filtering
  const { company } = useTaxMaster();
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [customerAdvances, setCustomerAdvances] = useState({});
  const [selectedCustomerAdvances, setSelectedCustomerAdvances] = useState(null);
  const itemsPerPage = 15;
  const { formatNumber, currency } = useDecimalFormat();

  // Filters
  const [filters, setFilters] = useState({
    customerId: "",
    receiptType: "All",
    status: "All",
    search: "",
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversingId, setReversingId] = useState(null);

  // Form states
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]); // Array for multiple invoice selection
  const [selectedAdvance, setSelectedAdvance] = useState(null); // Selected advance to apply
  const [appliedAdvanceAmount, setAppliedAdvanceAmount] = useState(0); // Amount of advance applied
  const [formData, setFormData] = useState({
    customerId: "",
    invoiceId: "", // Keep for backward compatibility
    receiptType: "Against Invoice",
    amountPaid: "",
    paymentMode: "Cash",
    receiptDate: new Date().toISOString().split("T")[0],
    bankName: "",
    chequeNumber: "",
    chequeDate: "",
    referenceNumber: "",
    narration: "",
  });


  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch receipts
  useEffect(() => {
    fetchReceipts();
  }, [currentPage, filters]);

  const fetchCustomers = async () => {
    try {
      // Country isolation: Always filter by company's country
      const countryCode = company?.countryCode || 'AE';
      const response = await axios.get(`${API_URL}/api/v1/customers/getcustomers?limit=1000&country=${countryCode}`);
      setCustomers(response.data.customers || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/api/v1/customer-receipts/getcustomer-receipts?page=${currentPage}&limit=${itemsPerPage}`;

      if (filters.customerId) url += `&customerId=${filters.customerId}`;
      if (filters.receiptType !== "All") url += `&receiptType=${filters.receiptType}`;

      const response = await axios.get(url);
      setReceipts(response.data.receipts || []);
      setTotalReceipts(response.data.total || 0);
      setError("");
    } catch (err) {
      setError("Failed to fetch receipts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customerId) => {
    setFormData({ ...formData, customerId, invoiceId: "" });
    setSelectedInvoice(null);
    setSelectedInvoices([]); // Clear selected invoices when customer changes

    if (!customerId) {
      setInvoices([]);
      setSelectedCustomerAdvances(null);
      return;
    }

    try {
      // Fetch outstanding invoices
      const invoiceResponse = await axios.get(
        `${API_URL}/api/v1/customer-receipts/getcustomer-outstanding/${customerId}`
      );
      setInvoices(invoiceResponse.data.outstanding || []);

      // Fetch customer advances
      const advanceResponse = await axios.get(
        `${API_URL}/api/v1/customer-receipts/getcustomer-advances/${customerId}`
      );
      console.log("Advances Response:", advanceResponse.data);
      setSelectedCustomerAdvances(advanceResponse.data || {});
    } catch (err) {
      console.error("Error fetching customer data:", err);
      setSelectedCustomerAdvances({ advances: [] });
    }
  };

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      ...formData,
      invoiceId: invoice.invoiceId,
      amountPaid: formatNumber(invoice.balance),
    });
  };

  // Toggle invoice selection for multiple invoice payment
  const handleToggleInvoiceSelection = (invoice) => {
    const isSelected = selectedInvoices.some(inv => inv.invoiceId === invoice.invoiceId);
    
    if (isSelected) {
      setSelectedInvoices(selectedInvoices.filter(inv => inv.invoiceId !== invoice.invoiceId));
    } else {
      setSelectedInvoices([...selectedInvoices, invoice]);
    }
  };

  // Calculate total outstanding across selected invoices
  const calculateTotalOutstanding = () => {
    return selectedInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  };

  const handleSaveReceipt = async () => {
    if (!formData.customerId) {
      setError("Please select a customer");
      return;
    }

    if (formData.receiptType === "Against Invoice" && selectedInvoices.length === 0) {
      setError("Please select at least one invoice");
      return;
    }

    // Allow zero amount if an advance is being applied, otherwise amount must be > 0
    const amountPaidValue = parseFloat(formData.amountPaid || 0);
    const isAdvanceBeingApplied = selectedAdvance && appliedAdvanceAmount > 0;
    
    if (!isAdvanceBeingApplied && amountPaidValue <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amountPaidValue < 0) {
      setError("Amount paid cannot be negative");
      return;
    }

    // Validate total payment (cash + advance) covers at least the invoices
    if (formData.receiptType === "Against Invoice" && selectedInvoices.length > 0) {
      const totalOutstandingAmount = parseFloat(calculateTotalOutstanding());
      const totalPaymentAmount = amountPaidValue + appliedAdvanceAmount;
      
      if (totalPaymentAmount < totalOutstandingAmount) {
        setError(
          `Total payment (${currency}${formatNumber(totalPaymentAmount)}) must cover invoice balance (${currency}${formatNumber(totalOutstandingAmount)})`
        );
        return;
      }
    }

    try {
      setLoading(true);
      const amountPaid = parseFloat(formData.amountPaid);
      
      // Build invoice allocations for multiple invoices
      let invoiceAllocations = [];
      if (formData.receiptType === "Against Invoice" && selectedInvoices.length > 0) {
        // Total payment = cash + advance
        const totalPayment = amountPaid + appliedAdvanceAmount;
        let remainingAmount = totalPayment;
        
        // Allocate total payment to invoices in selected order
        for (const invoice of selectedInvoices) {
          if (remainingAmount <= 0) break;
          
          const allocatedAmount = Math.min(remainingAmount, invoice.balance);
          invoiceAllocations.push({
            invoiceId: invoice.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            invoiceAmount: invoice.invoiceAmount,
            allocatedAmount: parseFloat(allocatedAmount.toFixed(2))
          });
          
          remainingAmount = parseFloat((remainingAmount - allocatedAmount).toFixed(2));
        }
      }

      const payload = {
        customerId: formData.customerId,
        invoiceId: selectedInvoices.length === 1 ? selectedInvoices[0].invoiceId : null,
        invoiceAllocations: invoiceAllocations.length > 0 ? invoiceAllocations : undefined,
        receiptType: formData.receiptType,
        amountPaid: amountPaid,
        paymentMode: formData.paymentMode,
        receiptDate: formData.receiptDate,
        bankName: formData.bankName,
        chequeNumber: formData.chequeNumber,
        chequeDate: formData.chequeDate,
        referenceNumber: formData.referenceNumber,
        narration: formData.narration,
        financialYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1).toString().slice(-2),
        // Advance application
        appliedAdvanceId: selectedAdvance ? selectedAdvance._id : null,
        advanceAmountApplied: appliedAdvanceAmount || 0,
      };

      await axios.post(`${API_URL}/api/v1/customer-receipts/addcustomer-receipt`, payload);

      setError("");
      setIsModalOpen(false);
      resetForm();
      fetchReceipts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReceipt = async (id) => {
    if (!window.confirm("Are you sure you want to delete this receipt?")) return;

    try {
      await axios.delete(`${API_URL}/api/v1/customer-receipts/deletecustomer-receipt/${id}`);
      fetchReceipts();
    } catch (err) {
      setError("Failed to delete receipt");
      console.error(err);
    }
  };

  const handleReverseReceipt = async () => {
    if (!reversingId) return;

    if (!reversalReason.trim()) {
      setError("Please provide a reason for reversal");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/api/v1/customer-receipts/reverse-receipt/${reversingId}`, {
        reversalReason: reversalReason.trim(),
      });

      setError("");
      setIsReverseModalOpen(false);
      setReversalReason("");
      setReversingId(null);
      fetchReceipts();
      setIsViewModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reverse receipt");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: "",
      invoiceId: "",
      receiptType: "Against Invoice",
      amountPaid: "",
      paymentMode: "Cash",
      receiptDate: new Date().toISOString().split("T")[0],
      bankName: "",
      chequeNumber: "",
      chequeDate: "",
      referenceNumber: "",
      narration: "",
    });
    setSelectedInvoice(null);
    setSelectedInvoices([]);
    setInvoices([]);
    setSelectedAdvance(null);
    setAppliedAdvanceAmount(0);
  };

  // Apply advance to selected invoices
  const handleApplyAdvance = (advance) => {
    if (selectedInvoices.length === 0) {
      setError("Please select at least one invoice first");
      return;
    }

    setSelectedAdvance(advance);
    // Apply full advance amount (can be adjusted later)
    const totalOutstanding = parseFloat(calculateTotalOutstanding());
    const amountToApply = Math.min(advance.balanceAmount, totalOutstanding);
    setAppliedAdvanceAmount(amountToApply);
    
    // Set amountPaid to remaining balance after advance
    const remainingBalance = Math.max(0, totalOutstanding - amountToApply);
    setFormData({
      ...formData,
      amountPaid: remainingBalance,
    });
  };

  // Get adjusted invoice balance after advance applied
  const getAdjustedInvoiceBalance = (invoice) => {
    if (!selectedAdvance || appliedAdvanceAmount === 0) {
      return invoice.balance;
    }
    
    // For now, apply to first selected invoice
    const adjustedBalance = Math.max(0, invoice.balance - appliedAdvanceAmount);
    return adjustedBalance;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      Paid: "bg-green-100 text-green-800",
      Full: "bg-green-100 text-green-800",
      Partial: "bg-yellow-100 text-yellow-800",
      Unpaid: "bg-red-100 text-red-800",
      Advance: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getTypeIcon = (type) => {
    const icons = {
      "Against Invoice": "📄",
      "On Account": "💰",
      Advance: "⏳",
    };
    return icons[type] || "📋";
  };

  const totalPages = Math.ceil(totalReceipts / itemsPerPage);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-b-lg shadow-lg">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold">Customer Receipts</h1>
            <p className="text-blue-100 text-xs mt-0.5">Manage customer payments and collections</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-semibold flex items-center gap-1 hover:bg-blue-50 transition whitespace-nowrap"
          >
            <Plus size={16} /> New Receipt
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 p-4 min-h-0">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-3">
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Customer</label>
              <select
                value={filters.customerId}
                onChange={(e) => {
                  setFilters({ ...filters, customerId: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Type</label>
              <select
                value={filters.receiptType}
                onChange={(e) => {
                  setFilters({ ...filters, receiptType: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All">All Types</option>
                <option value="Against Invoice">Against Invoice</option>
                <option value="On Account">On Account</option>
                <option value="Advance">Advance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Status</label>
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters({ ...filters, status: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Full">Full</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700">Search</label>
              <input
                type="text"
                placeholder="Receipt #"
                value={filters.search}
                onChange={(e) => {
                  setFilters({ ...filters, search: e.target.value });
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ customerId: "", receiptType: "All", status: "All", search: "" });
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded text-xs font-semibold transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Customer Advance Summary */}
        {filters.customerId && selectedCustomerAdvances && selectedCustomerAdvances.totalAvailableAdvance > 0 && (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-green-900 flex items-center gap-1 mb-1">
                  <AlertCircle size={14} /> Available Advances
                </h3>
                <p className="text-green-800 text-xs">
                  Total: <span className="font-bold">{currency}{formatNumber(selectedCustomerAdvances.totalAvailableAdvance)}</span>
                  <span className="text-xs ml-1">({selectedCustomerAdvances.advanceCount})</span>
                </p>
                <p className="text-xs text-gray-700 mt-0.5">
                  View and manage available advance receipts
                </p>
              </div>
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition whitespace-nowrap"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}

        {/* Receipts Table */}
        <div className="bg-white rounded-lg shadow flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Receipt #</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Invoice</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Amount Paid</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold">Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold">Date</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-3 py-3 text-center text-gray-500 text-xs">
                      Loading receipts...
                    </td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-3 py-3 text-center text-gray-500 text-xs">
                      No receipts found
                    </td>
                  </tr>
                ) : (
                  receipts.map((receipt) => (
                    <tr key={receipt._id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-blue-600 text-xs">{receipt.receiptNumber}</td>
                      <td className="px-3 py-2 text-xs">{receipt.customerName}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="text-base">{getTypeIcon(receipt.receiptType)}</span>
                        <span className="ml-1">{receipt.receiptType}</span>
                      </td>
                      <td className="px-3 py-2 text-xs">{receipt.invoiceNumber || "-"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600 text-xs">
                        {formatNumber(receipt.amountPaid)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-orange-600 text-xs">
                        {formatNumber(receipt.balanceAmount)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadgeColor(receipt.status)}`}>
                          {receipt.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {new Date(receipt.receiptDate).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedReceipt(receipt);
                            setIsViewModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {receipt.status !== "Reversed" && (
                          <button
                            onClick={() => {
                              setReversingId(receipt._id);
                              setReversalReason("");
                              setIsReverseModalOpen(true);
                            }}
                            className="text-orange-600 hover:text-orange-800 transition"
                            title="Reverse"
                          >
                            ↩️
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReceipt(receipt._id)}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalReceipts > itemsPerPage && (
            <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-3 py-2 border-t bg-gray-50 text-xs shadow-lg z-40">
              <span className="text-gray-600">
                Page {currentPage} of {totalPages} ({totalReceipts} total)
              </span>
              <div className="flex gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50 hover:bg-gray-100 transition"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className="px-3 py-1 bg-white border rounded text-xs disabled:opacity-50 hover:bg-gray-100 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add padding to account for fixed pagination */}
      {totalReceipts > itemsPerPage && <div className="h-12"></div>}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-hidden">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex-shrink-0">
              <h2 className="text-lg font-bold">New Receipt</h2>
              <p className="text-blue-100 text-xs mt-0.5">Record customer payment or collection</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="space-y-2">
                {/* Customer Selection */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">
                    Customer *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Outstanding Amount Summary */}
                {formData.customerId && invoices && (
                  <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold">Selected Customer</p>
                        <p className="text-xs font-bold text-gray-900">
                          {customers.find(c => c._id === formData.customerId)?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Outstanding</p>
                        <p className="text-sm font-bold text-red-600">
                          {currency}{formatNumber(invoices.reduce((sum, inv) => sum + inv.balance, 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Receipt Type */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">
                    Receipt Type *
                  </label>
                  <div className="flex gap-3">
                    {["Against Invoice", "On Account", "Advance"].map((type) => (
                      <label key={type} className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="receiptType"
                          value={type}
                          checked={formData.receiptType === type}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              receiptType: e.target.value,
                              invoiceId: "",
                            });
                            setSelectedInvoice(null);
                            setSelectedInvoices([]);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-xs">{type}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Receipt Type Info */}
                  {formData.receiptType === "Against Invoice" && (
                    <p className="text-xs text-blue-600 mt-1">💡 Manually select which invoices to pay</p>
                  )}
                  {formData.receiptType === "On Account" && (
                    <p className="text-xs text-green-600 mt-1">💡 Amount will be auto-allocated to outstanding invoices (oldest first)</p>
                  )}
                </div>

                {/* Available Advances Section - Show for against invoice before invoices */}
                {formData.receiptType === "Against Invoice" && formData.customerId && selectedCustomerAdvances && (
                  <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                    {selectedCustomerAdvances.advances && selectedCustomerAdvances.advances.length > 0 ? (
                      <>
                        <p className="text-xs font-semibold text-green-900 mb-1">
                          💰 Available Advances: {currency}{formatNumber(selectedCustomerAdvances.totalAvailableAdvance) || 0}
                        </p>
                        <div className="space-y-1">
                          {selectedCustomerAdvances.advances.map((advance) => (
                            <div key={advance._id} className="flex items-start gap-2 text-xs p-1 bg-white rounded">
                              <span className="flex-1">
                                {advance.receiptNumber} - {currency}{formatNumber(advance.balanceAmount || 0)} available
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApplyAdvance(advance)}
                                disabled={selectedInvoices.length === 0 || advance.balanceAmount === 0}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-xs font-semibold transition whitespace-nowrap"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-green-700">ℹ️ No advances available for this customer</p>
                    )}
                  </div>
                )}

                {/* Applied Advance Info */}
                {selectedAdvance && appliedAdvanceAmount > 0 && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <p className="font-semibold text-yellow-900">✓ Advance Applied: {currency}{formatNumber(appliedAdvanceAmount)}</p>
                        <p className="text-yellow-700 text-xs">From {selectedAdvance.receiptNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdvance(null);
                          setAppliedAdvanceAmount(0);
                          setFormData({ ...formData, amountPaid: calculateTotalOutstanding() });
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Invoice Display for On Account - Shows how amount will be allocated */}
                {formData.receiptType === "On Account" && formData.customerId && formData.amountPaid && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">
                      💡 Outstanding Invoices (Auto-Allocated - Oldest First)
                    </label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-300 rounded p-2 text-sm bg-blue-50">
                      {invoices.length === 0 ? (
                        <p className="text-gray-500 text-xs">No outstanding invoices</p>
                      ) : (
                        (() => {
                          let remaining = parseFloat(formData.amountPaid) || 0;
                          return invoices.map((inv) => {
                            if (remaining <= 0) return null;
                            const allocatedAmount = Math.min(remaining, inv.balance);
                            const newBalance = inv.balance - allocatedAmount;
                            remaining -= allocatedAmount;
                            
                            return (
                              <div key={inv.invoiceId} className="p-2 border border-blue-200 rounded bg-white text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-xs">{inv.invoiceNumber}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(inv.invoiceDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right whitespace-nowrap text-xs">
                                    <p>Balance: <span className="font-semibold">{currency}{formatNumber(inv.balance)}</span></p>
                                    <p className="text-green-600 font-semibold">
                                      ✓ CR {currency}{formatNumber(allocatedAmount)}
                                    </p>
                                    <p className="text-gray-600">Remaining: {currency}{formatNumber(newBalance)}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }).filter(Boolean);
                        })()
                      )}
                    </div>
                    
                    {/* Showing remaining unallocated as advance */}
                    {(() => {
                      let remaining = parseFloat(formData.amountPaid) || 0;
                      for (const inv of invoices) {
                        remaining -= Math.min(remaining, inv.balance);
                      }
                      return remaining > 0 ? (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <p className="font-semibold text-yellow-900 mb-1">
                            💾 Remaining Amount (Held as Advance): {currency}{formatNumber(remaining)}
                          </p>
                          <p className="text-yellow-700">This amount will be available for future invoice allocations</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Invoice Selection (for Against Invoice) */}
                {formData.receiptType === "Against Invoice" && formData.customerId && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">
                      Outstanding Invoices * (Check one or more)
                    </label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-300 rounded p-2 text-sm">
                      {invoices.length === 0 ? (
                        <p className="text-gray-500 text-xs">No outstanding invoices</p>
                      ) : (
                        invoices.map((inv) => {
                          const isSelected = selectedInvoices.some(s => s.invoiceId === inv.invoiceId);
                          return (
                            <div
                              key={inv.invoiceId}
                              className={`p-2 border rounded cursor-pointer transition text-xs ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-300 hover:border-blue-300"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleInvoiceSelection(inv)}
                                  className="mt-0.5 w-3 h-3 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0" onClick={() => handleToggleInvoiceSelection(inv)}>
                                  <p className="font-semibold text-xs">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(inv.invoiceDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                  <p className="text-xs">
                                    Amt: <span className="font-semibold">{formatNumber(inv.invoiceAmount)}</span>
                                  </p>
                                  <p className="text-xs text-orange-600">
                                    Bal: <span className="font-semibold">{formatNumber(inv.balance)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Invoices Summary */}
                    {selectedInvoices.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="font-semibold text-blue-900 mb-1">
                          Selected: {selectedInvoices.length} inv(s) | 
                          {selectedAdvance ? (
                            <>
                              Total: {currency}{formatNumber(calculateTotalOutstanding())} | After Advance: {currency}{formatNumber(Math.max(0, calculateTotalOutstanding() - appliedAdvanceAmount))}
                            </>
                          ) : (
                            <>Total: {currency}{formatNumber(calculateTotalOutstanding())}</>
                          )}
                        </p>
                        <div className="text-blue-700 space-y-0.5">
                          {selectedInvoices.map((inv) => (
                            <div key={inv.invoiceId} className="flex justify-between">
                              <span>{inv.invoiceNumber}</span>
                              <span className="font-semibold">
                                {currency}{formatNumber(inv.balance)}
                                {selectedAdvance && (
                                  <span className="text-xs text-gray-600">
                                    {" → " + currency}{formatNumber(Math.max(0, inv.balance - appliedAdvanceAmount))}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">
                      Amount Paid {selectedAdvance && "(Cash Only)"} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0.00"
                    />
                    {selectedAdvance && (
                      <p className="text-xs text-green-600 mt-1">
                        + {currency}{formatNumber(appliedAdvanceAmount)} (advance) = {currency}{formatNumber(parseFloat(formData.amountPaid || 0) + appliedAdvanceAmount)} total
                      </p>
                    )}
                  </div>

                  {selectedInvoices.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">
                        Total Outstanding
                      </label>
                      <input
                        type="text"
                        disabled
                        value={calculateTotalOutstanding()}
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600 font-semibold"
                      />
                    </div>
                  )}
                </div>

                {/* Allocation Preview - Show only if amount entered and invoices selected */}
                {formData.receiptType === "Against Invoice" && selectedInvoices.length > 0 && formData.amountPaid && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <p className="font-semibold text-blue-900 mb-1">Payment Allocation</p>
                    <div className="text-blue-800 space-y-0.5">
                      {(() => {
                        let remaining = parseFloat(formData.amountPaid) || 0;
                        return selectedInvoices.map((inv) => {
                          if (remaining <= 0) return null;
                          const allocated = Math.min(remaining, inv.balance);
                          remaining -= allocated;
                          return (
                            <div key={inv.invoiceId} className="flex justify-between">
                              <span>{inv.invoiceNumber}</span>
                              <span className="font-semibold">{currency}{formatNumber(allocated)} of {currency}{formatNumber(inv.balance)}</span>
                            </div>
                          );
                        });
                      })()}
                      {formData.amountPaid > calculateTotalOutstanding() && (
                        <div className="mt-1 pt-1 border-t border-blue-300">
                          <p className="text-blue-700 text-xs font-semibold">Excess Amount: {currency}{formatNumber(parseFloat(formData.amountPaid) - calculateTotalOutstanding())}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Transaction Summary - Shows accounting impact */}
                {formData.amountPaid && (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                    <p className="font-semibold text-purple-900 mb-1">📊 Transaction Impact</p>
                    <div className="space-y-1 text-purple-800">
                      <div className="flex justify-between">
                        <span>💳 DR Bank/Cash (Receive)</span>
                        <span className="font-semibold text-green-600">{currency}{formatNumber(parseFloat(formData.amountPaid || 0) + appliedAdvanceAmount)}</span>
                      </div>
                      {formData.receiptType === "Against Invoice" && selectedInvoices.length > 0 && (
                        <div className="flex justify-between">
                          <span>👤 CR Customer Account (Reduce Receivable)</span>
                          <span className="font-semibold text-blue-600">{currency}{formatNumber(parseFloat(formData.amountPaid || 0) + appliedAdvanceAmount)}</span>
                        </div>
                      )}
                      {formData.receiptType === "On Account" && formData.amountPaid && (
                        <div>
                          <div className="flex justify-between">
                            <span>👤 CR Customer Account (FIFO)</span>
                            <span className="font-semibold text-blue-600">
                              {currency}{(() => {
                                let remaining = parseFloat(formData.amountPaid) || 0;
                                let allocated = 0;
                                for (const inv of invoices) {
                                  const alloc = Math.min(remaining, inv.balance);
                                  allocated += alloc;
                                  remaining -= alloc;
                                }
                                return formatNumber(allocated);
                              })()}
                            </span>
                          </div>
                          {(() => {
                            let remaining = parseFloat(formData.amountPaid) || 0;
                            for (const inv of invoices) {
                              remaining -= Math.min(remaining, inv.balance);
                            }
                            return remaining > 0 ? (
                              <div className="flex justify-between">
                                <span>🔖 Held as Advance</span>
                                <span className="font-semibold text-amber-600">{currency}{formatNumber(remaining)}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                      {formData.receiptType === "Advance" && (
                        <div className="flex justify-between">
                          <span>🔖 Held as Advance (Future Use)</span>
                          <span className="font-semibold text-amber-600">{currency}{formatNumber(parseFloat(formData.amountPaid || 0))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">
                      Payment Mode *
                    </label>
                    <select
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Online">Online</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">
                      Receipt Date *
                    </label>
                    <input
                      type="date"
                      value={formData.receiptDate}
                      onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Bank Details (if Cheque) */}
                {formData.paymentMode === "Cheque" && (
                  <div className="grid grid-cols-3 gap-2 bg-blue-50 p-2 rounded text-xs">
                    <div>
                      <label className="block font-semibold mb-1 text-gray-700">
                        Cheque Number
                      </label>
                      <input
                        type="text"
                        value={formData.chequeNumber}
                        onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-gray-700">
                        Cheque Date
                      </label>
                      <input
                        type="date"
                        value={formData.chequeDate}
                        onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-gray-700">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700">
                    Narration
                  </label>
                  <textarea
                    value={formData.narration}
                    onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="2"
                    placeholder="Add notes..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex justify-end gap-2 px-4 py-2 border-t bg-gray-50 rounded-b">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReceipt}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {isViewModalOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 overflow-hidden">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold">Receipt #{selectedReceipt.receiptNumber}</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Customer</p>
                  <p className="text-sm font-semibold">{selectedReceipt.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Receipt Type</p>
                  <p className="font-semibold text-xs">{selectedReceipt.receiptType}</p>
                </div>
                {selectedReceipt.invoiceNumber && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Invoice</p>
                      <p className="font-semibold text-sm">{selectedReceipt.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Invoice Amount</p>
                      <p className="font-semibold text-sm text-green-600">
                        {formatNumber(selectedReceipt.invoiceNetAmount)}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase">Amount Paid</p>
                  <p className="font-semibold text-sm text-blue-600">
                    {formatNumber(selectedReceipt.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Balance</p>
                  <p className="font-semibold text-sm text-orange-600">
                    {formatNumber(selectedReceipt.balanceAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadgeColor(selectedReceipt.status)}`}>
                    {selectedReceipt.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">payment Mode</p>
                  <p className="font-semibold text-sm">{selectedReceipt.paymentMode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Receipt Date</p>
                  <p className="font-semibold text-sm">
                    {new Date(selectedReceipt.receiptDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Applied Advance Info */}
              {selectedReceipt.advanceAmountApplied > 0 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs font-semibold text-green-900 mb-1">Advance Applied</p>
                  <p className="text-xs text-green-700">
                    Amount: {currency}{formatNumber(selectedReceipt.advanceAmountApplied || 0)}
                  </p>
                </div>
              )}

              {/* Invoice Allocations */}
              {selectedReceipt.invoiceAllocations?.length > 0 && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs font-semibold text-blue-900 mb-1">Invoice Allocations</p>
                  <div className="space-y-1">
                    {selectedReceipt.invoiceAllocations.map((alloc, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-semibold">{alloc.invoiceNumber}</span>
                        <span className="text-blue-700">{currency}{formatNumber(alloc.allocatedAmount || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReceipt.narration && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 uppercase">Narration</p>
                  <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                    {selectedReceipt.narration}
                  </p>
                </div>
              )}

              {selectedReceipt.status === "Reversed" && (
                <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded">
                  <p className="text-xs text-red-600 uppercase font-semibold">Reversal Details</p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Reversal Date</p>
                      <p className="text-xs font-semibold text-gray-800">
                        {selectedReceipt.reversalDate 
                          ? new Date(selectedReceipt.reversalDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 uppercase">Reversal Reason</p>
                      <p className="text-xs text-gray-700 bg-white p-2 rounded mt-1">
                        {selectedReceipt.reversalReason || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex justify-end gap-2 px-4 py-2 border-t bg-gray-50 rounded-b-lg">
              {selectedReceipt.status !== "Reversed" && (
                <button
                  onClick={() => {
                    setReversingId(selectedReceipt._id);
                    setReversalReason("");
                    setIsReverseModalOpen(true);
                  }}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-semibold transition"
                >
                  Reverse Receipt
                </button>
              )}
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Summary Modal */}
      {isAdvanceModalOpen && selectedCustomerAdvances && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-hidden">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 flex-shrink-0">
              <h2 className="text-lg font-bold">Available Advances</h2>
              <p className="text-green-100 mt-0.5 text-xs">Advance receipts held for this customer</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="space-y-2">
                {/* Total Summary */}
                <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-gray-600 uppercase">Total Available</p>
                      <p className="text-sm font-bold text-green-600">
                        {currency}{formatNumber(selectedCustomerAdvances.totalAvailableAdvance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase\">Number of Advances</p>
                      <p className="text-sm font-bold text-green-600\">
                        {selectedCustomerAdvances.advanceCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase\">Status</p>
                      <p className="text-xs font-bold text-green-700 mt-0.5\">Active</p>
                    </div>
                  </div>
                </div>

                {/* Advances List */}
                {selectedCustomerAdvances.advances.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-xs">No advances available</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomerAdvances.advances.map((advance, idx) => (
                      <div key={advance._id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              {advance.receiptNumber} - {advance.receiptType}
                            </p>
                            <p className="text-xs text-gray-500">
                              Date: {new Date(advance.receiptDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            {advance.paymentMode}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-xs text-gray-600">Original Amount</p>
                            <p className="font-semibold text-gray-900">
                              {currency}{formatNumber(advance.amountPaid)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Applied</p>
                            <p className="font-semibold text-gray-900">
                              {currency}{formatNumber(advance.amountPaid - advance.balanceAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Available</p>
                            <p className="font-bold text-green-600">
                              {currency}{formatNumber(advance.balanceAmount)}
                            </p>
                          </div>
                        </div>
                        {advance.narration && (
                          <p className="text-xs text-gray-600 mt-1 italic">{advance.narration}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                  <p className="text-xs text-blue-900">
                    <strong>What are advances?</strong> These are payments received from customers for future invoices or general account credits. Use these to manually adjust outstanding invoices as needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex justify-end gap-2 px-6 py-3 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reversal Modal */}
      {isReverseModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden p-2">
          <div className="bg-white rounded shadow-lg w-full max-w-md p-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Reverse Receipt</h3>
            
            {selectedReceipt && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="text-gray-700">
                  <strong>Receipt #:</strong> {selectedReceipt.receiptNumber}
                </p>
                <p className="text-gray-700">
                  <strong>Amount:</strong> {currency}{formatNumber(selectedReceipt.amountPaid || 0)}
                </p>
              </div>
            )}

            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reversal Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Enter reason for reversal (e.g., Duplicate entry, Wrong amount, Customer request)"
                className="w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-xs"
                rows="3"
              />\n              {!reversalReason && <p className="text-red-500 text-xs mt-0.5">Reason is required</p>}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsReverseModalOpen(false);
                  setReversingId(null);
                  setReversalReason("");
                }}
                className="px-3 py-1 bg-gray-300 text-gray-800 text-xs rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReverseReceipt}
                disabled={!reversalReason.trim()}
                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerReceipts;


