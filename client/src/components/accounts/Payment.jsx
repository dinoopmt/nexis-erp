import { useEffect, useState } from "react";
import { API_URL } from "../../config/config";
import Modal from "../shared/Model";

export default function Payment() {
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    payFromAccountId: "",
    payToAccountId: "",
    amount: "",
    paymentMethod: "CASH",
    referenceNumber: "",
    description: "",
    chequeNumber: "",
    chequeDate: "",
    bankName: ""
  });

  const paymentMethods = [
    { value: "CASH", label: "Cash" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CARD", label: "Card" },
    { value: "ONLINE", label: "Online Payment" }
  ];

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    BOUNCED: "bg-orange-100 text-orange-800"
  };

  // Fetch Payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus) query.append("status", filterStatus);

      const response = await fetch(`${API_URL}/api/v1/payments?${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      alert("Error fetching payments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Accounts for dropdowns
  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/chart-of-accounts/getchartofaccounts`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      setAccounts(data.chartOfAccounts || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchAccounts();
  }, [filterStatus]);

  const handleOpenModal = (payment = null) => {
    if (payment) {
      setEditingId(payment._id);
      setFormData({
        paymentDate: payment.paymentDate?.split("T")[0] || "",
        payFromAccountId: payment.payFromAccountId?._id || "",
        payToAccountId: payment.payToAccountId?._id || "",
        amount: payment.amount || "",
        paymentMethod: payment.paymentMethod || "CASH",
        referenceNumber: payment.referenceNumber || "",
        description: payment.description || "",
        chequeNumber: payment.chequeNumber || "",
        chequeDate: payment.chequeDate?.split("T")[0] || "",
        bankName: payment.bankName || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        paymentDate: new Date().toISOString().split("T")[0],
        payFromAccountId: "",
        payToAccountId: "",
        amount: "",
        paymentMethod: "CASH",
        referenceNumber: "",
        description: "",
        chequeNumber: "",
        chequeDate: "",
        bankName: ""
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.payFromAccountId || !formData.payToAccountId || !formData.amount) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/api/v1/payments/${editingId}`
        : `${API_URL}/api/v1/payments`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error saving payment");
        return;
      }

      alert(editingId ? "Payment updated successfully" : "Payment created successfully");
      handleCloseModal();
      fetchPayments();
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Error saving payment");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/payments/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error deleting payment");
        return;
      }

      alert("Payment deleted successfully");
      fetchPayments();
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Error deleting payment");
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/payments/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || `Error ${action} payment`);
        return;
      }

      alert(data.message);
      fetchPayments();
    } catch (error) {
      console.error(`Error ${action} payment:`, error);
      alert(`Error ${action} payment`);
    }
  };

  // Filter payments by search
  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.paymentNumber?.toLowerCase().includes(searchLower) ||
      payment.payFromAccountId?.accountName?.toLowerCase().includes(searchLower) ||
      payment.payToAccountId?.accountName?.toLowerCase().includes(searchLower) ||
      payment.description?.toLowerCase().includes(searchLower)
    );
  });

  // Get cash/bank accounts for Pay From dropdown
  const payFromAccounts = accounts.filter(acc => 
    acc.isBank || acc.accountGroupId?.name?.toLowerCase().includes("cash")
  );

  // Get expense accounts for Pay To dropdown
  const payToAccounts = accounts.filter(acc => 
    acc.accountGroupId?.type === "EXPENSE"
  );

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Payment Vouchers</h2>
          <p className="text-xs text-gray-500">Manage payment vouchers and transactions</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium"
        >
          + New Payment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search payments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Voucher No</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pay From</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pay To</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-xs text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center text-xs text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium text-blue-600">
                      {payment.paymentNumber}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {payment.payFromAccountId?.accountName || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {payment.payToAccountId?.accountName || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">
                      {paymentMethods.find(m => m.value === payment.paymentMethod)?.label || payment.paymentMethod}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 text-right font-medium">
                      {payment.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[payment.status] || "bg-gray-100 text-gray-800"}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {payment.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleOpenModal(payment)}
                              className="text-blue-600 hover:text-blue-800 text-xs px-1"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleStatusChange(payment._id, "approve")}
                              className="text-green-600 hover:text-green-800 text-xs px-1"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDelete(payment._id)}
                              className="text-red-600 hover:text-red-800 text-xs px-1"
                              title="Delete"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {payment.status === "APPROVED" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(payment._id, "pay")}
                              className="text-green-600 hover:text-green-800 text-xs px-1"
                              title="Mark as Paid"
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => handleStatusChange(payment._id, "cancel")}
                              className="text-red-600 hover:text-red-800 text-xs px-1"
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(payment.status === "PAID" || payment.status === "CANCELLED") && (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
          <p className="text-xs text-yellow-600">Pending</p>
          <p className="text-sm font-semibold text-yellow-800">
            {payments.filter(p => p.status === "PENDING").length}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-xs text-blue-600">Approved</p>
          <p className="text-sm font-semibold text-blue-800">
            {payments.filter(p => p.status === "APPROVED").length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <p className="text-xs text-green-600">Paid</p>
          <p className="text-sm font-semibold text-green-800">
            {payments.filter(p => p.status === "PAID").length}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded p-2">
          <p className="text-xs text-gray-600">Total Amount</p>
          <p className="text-sm font-semibold text-gray-800">
            {payments
              .filter(p => p.status === "PAID")
              .reduce((sum, p) => sum + (p.amount || 0), 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? "Edit Payment" : "New Payment"}
        draggable={true}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Payment Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          {/* Pay From Account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pay From (Cash/Bank) <span className="text-red-500">*</span>
            </label>
            <select
              name="payFromAccountId"
              value={formData.payFromAccountId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">Select Account</option>
              {payFromAccounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountNumber} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* Pay To Account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Pay To (Expense) <span className="text-red-500">*</span>
            </label>
            <select
              name="payToAccountId"
              value={formData.payToAccountId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              required
            >
              <option value="">Select Expense Account</option>
              {payToAccounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountNumber} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cheque Details (conditional) */}
          {formData.paymentMethod === "CHEQUE" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cheque Number
                </label>
                <input
                  type="text"
                  name="chequeNumber"
                  value={formData.chequeNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cheque Date
                </label>
                <input
                  type="date"
                  name="chequeDate"
                  value={formData.chequeDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              placeholder="Invoice/PO number"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="2"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              placeholder="Payment description..."
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              {editingId ? "Update Payment" : "Create Payment"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


