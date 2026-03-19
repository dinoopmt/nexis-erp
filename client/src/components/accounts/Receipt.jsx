import { useEffect, useState } from "react";
import { API_URL } from "../../config/config";
import Modal from "../shared/Model";

export default function Receipt() {
  const [receipts, setReceipts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [formData, setFormData] = useState({
    receiptDate: new Date().toISOString().split("T")[0],
    receiveFromAccountId: "",
    receiveIntoAccountId: "",
    amount: "",
    receiptMethod: "CASH",
    referenceNumber: "",
    description: "",
    chequeNumber: "",
    chequeDate: "",
    bankName: ""
  });

  const receiptMethods = [
    { value: "CASH", label: "Cash" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CARD", label: "Card" },
    { value: "ONLINE", label: "Online Payment" }
  ];

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    RECEIVED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    BOUNCED: "bg-orange-100 text-orange-800"
  };

  // Fetch Receipts
  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus) query.append("status", filterStatus);

      const response = await fetch(`${API_URL}/api/v1/receipts?${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      setReceipts(data.receipts || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      alert("Error fetching receipts");
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
    fetchReceipts();
    fetchAccounts();
  }, [filterStatus]);

  const handleOpenModal = (receipt = null) => {
    if (receipt) {
      setEditingId(receipt._id);
      setFormData({
        receiptDate: receipt.receiptDate?.split("T")[0] || "",
        receiveFromAccountId: receipt.receiveFromAccountId?._id || "",
        receiveIntoAccountId: receipt.receiveIntoAccountId?._id || "",
        amount: receipt.amount || "",
        receiptMethod: receipt.receiptMethod || "CASH",
        referenceNumber: receipt.referenceNumber || "",
        description: receipt.description || "",
        chequeNumber: receipt.chequeNumber || "",
        chequeDate: receipt.chequeDate?.split("T")[0] || "",
        bankName: receipt.bankName || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        receiptDate: new Date().toISOString().split("T")[0],
        receiveFromAccountId: "",
        receiveIntoAccountId: "",
        amount: "",
        receiptMethod: "CASH",
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

    if (!formData.receiveFromAccountId || !formData.receiveIntoAccountId || !formData.amount) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/api/v1/receipts/${editingId}`
        : `${API_URL}/api/v1/receipts`;

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
        alert(data.message || "Error saving receipt");
        return;
      }

      alert(editingId ? "Receipt updated successfully" : "Receipt created successfully");
      handleCloseModal();
      fetchReceipts();
    } catch (error) {
      console.error("Error saving receipt:", error);
      alert("Error saving receipt");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this receipt?")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/receipts/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error deleting receipt");
        return;
      }

      alert("Receipt deleted successfully");
      fetchReceipts();
    } catch (error) {
      console.error("Error deleting receipt:", error);
      alert("Error deleting receipt");
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/receipts/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || `Error ${action} receipt`);
        return;
      }

      alert(data.message);
      fetchReceipts();
    } catch (error) {
      console.error(`Error ${action} receipt:`, error);
      alert(`Error ${action} receipt`);
    }
  };

  // Filter receipts by search
  const filteredReceipts = receipts.filter(receipt => {
    const searchLower = searchTerm.toLowerCase();
    return (
      receipt.receiptNumber?.toLowerCase().includes(searchLower) ||
      receipt.receiveFromAccountId?.accountName?.toLowerCase().includes(searchLower) ||
      receipt.receiveIntoAccountId?.accountName?.toLowerCase().includes(searchLower) ||
      receipt.description?.toLowerCase().includes(searchLower)
    );
  });

  // Get cash/bank accounts for Receive Into dropdown
  const receiveIntoAccounts = accounts.filter(acc => 
    acc.isBank || acc.accountGroupId?.name?.toLowerCase().includes("cash")
  );

  // Get income accounts for Receive From dropdown
  const receiveFromAccounts = accounts.filter(acc => 
    acc.accountGroupId?.type === "INCOME" || 
    acc.accountGroupId?.type === "ASSET" // Include receivables
  );

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Receipt Vouchers</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-700 transition-colors"
        >
          + New Receipt
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search receipts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs w-64 focus:ring-1 focus:ring-green-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="BOUNCED">Bounced</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Receipt #</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Receive From</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Receive Into</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Method</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Status</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No receipts found
                </td>
              </tr>
            ) : (
              filteredReceipts.map((receipt) => (
                <tr key={receipt._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-green-600">
                    {receipt.receiptNumber}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(receipt.receiptDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div className="truncate max-w-[150px]" title={receipt.receiveFromAccountId?.accountName}>
                      {receipt.receiveFromAccountId?.accountNumber} - {receipt.receiveFromAccountId?.accountName}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div className="truncate max-w-[150px]" title={receipt.receiveIntoAccountId?.accountName}>
                      {receipt.receiveIntoAccountId?.accountNumber} - {receipt.receiveIntoAccountId?.accountName}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {receipt.receiptMethod?.replace("_", " ")}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {formatCurrency(receipt.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[receipt.status]}`}>
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {receipt.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleOpenModal(receipt)}
                            className="text-blue-600 hover:text-blue-800 px-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleStatusChange(receipt._id, "approve")}
                            className="text-green-600 hover:text-green-800 px-1"
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleStatusChange(receipt._id, "cancel")}
                            className="text-red-600 hover:text-red-800 px-1"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      {receipt.status === "APPROVED" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(receipt._id, "receive")}
                            className="text-green-600 hover:text-green-800 px-1"
                            title="Mark Received"
                          >
                            💰
                          </button>
                          <button
                            onClick={() => handleStatusChange(receipt._id, "cancel")}
                            className="text-red-600 hover:text-red-800 px-1"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      {receipt.status === "PENDING" && (
                        <button
                          onClick={() => handleDelete(receipt._id)}
                          className="text-red-600 hover:text-red-800 px-1"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                      {receipt.receiptMethod === "CHEQUE" && receipt.status !== "BOUNCED" && receipt.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleStatusChange(receipt._id, "bounced")}
                          className="text-orange-600 hover:text-orange-800 px-1"
                          title="Mark Bounced"
                        >
                          ⚠️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingId ? "Edit Receipt" : "New Receipt"}
        draggable={true}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Receipt Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Receipt Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="receiptDate"
              value={formData.receiptDate}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          {/* Receive From Account (Income/Receivable) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Receive From (Income Account) <span className="text-red-500">*</span>
            </label>
            <select
              name="receiveFromAccountId"
              value={formData.receiveFromAccountId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
              required
            >
              <option value="">Select Income Account</option>
              {receiveFromAccounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountNumber} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* Receive Into Account (Cash/Bank) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Receive Into (Cash/Bank) <span className="text-red-500">*</span>
            </label>
            <select
              name="receiveIntoAccountId"
              value={formData.receiveIntoAccountId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
              required
            >
              <option value="">Select Cash/Bank Account</option>
              {receiveIntoAccounts.map((acc) => (
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          {/* Receipt Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Receipt Method
            </label>
            <select
              name="receiptMethod"
              value={formData.receiptMethod}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
            >
              {receiptMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cheque Details (conditional) */}
          {formData.receiptMethod === "CHEQUE" && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cheque #
                </label>
                <input
                  type="text"
                  name="chequeNumber"
                  value={formData.chequeNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
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
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
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
              placeholder="Transaction ID, Invoice #, etc."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500"
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
            >
              {editingId ? "Update Receipt" : "Create Receipt"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


