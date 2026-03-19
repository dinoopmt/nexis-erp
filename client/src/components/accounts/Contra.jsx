import { useEffect, useState } from "react";
import { API_URL } from "../../config/config";
import Modal from "../shared/Model";

export default function Contra() {
  const [contras, setContras] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const [formData, setFormData] = useState({
    contraDate: new Date().toISOString().split("T")[0],
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    transferType: "CASH_TO_BANK",
    referenceNumber: "",
    description: "",
    chequeNumber: "",
    chequeDate: ""
  });

  const transferTypes = [
    { value: "CASH_TO_BANK", label: "Cash to Bank (Deposit)" },
    { value: "BANK_TO_CASH", label: "Bank to Cash (Withdrawal)" },
    { value: "BANK_TO_BANK", label: "Bank to Bank Transfer" }
  ];

  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800"
  };

  // Fetch Contras
  const fetchContras = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus) query.append("status", filterStatus);
      if (filterType) query.append("transferType", filterType);

      const response = await fetch(`${API_URL}/api/v1/contras?${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      setContras(data.contras || []);
    } catch (error) {
      console.error("Error fetching contras:", error);
      alert("Error fetching contra vouchers");
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
    fetchContras();
    fetchAccounts();
  }, [filterStatus, filterType]);

  const handleOpenModal = (contra = null) => {
    if (contra) {
      setEditingId(contra._id);
      setFormData({
        contraDate: contra.contraDate?.split("T")[0] || "",
        fromAccountId: contra.fromAccountId?._id || "",
        toAccountId: contra.toAccountId?._id || "",
        amount: contra.amount || "",
        transferType: contra.transferType || "CASH_TO_BANK",
        referenceNumber: contra.referenceNumber || "",
        description: contra.description || "",
        chequeNumber: contra.chequeNumber || "",
        chequeDate: contra.chequeDate?.split("T")[0] || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        contraDate: new Date().toISOString().split("T")[0],
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        transferType: "CASH_TO_BANK",
        referenceNumber: "",
        description: "",
        chequeNumber: "",
        chequeDate: ""
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

    // Reset accounts when transfer type changes
    if (name === "transferType") {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        fromAccountId: "",
        toAccountId: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromAccountId || !formData.toAccountId || !formData.amount) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      alert("From and To accounts cannot be the same");
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/api/v1/contras/${editingId}`
        : `${API_URL}/api/v1/contras`;

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
        alert(data.message || "Error saving contra");
        return;
      }

      alert(editingId ? "Contra updated successfully" : "Contra created successfully");
      handleCloseModal();
      fetchContras();
    } catch (error) {
      console.error("Error saving contra:", error);
      alert("Error saving contra");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this contra voucher?")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/contras/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error deleting contra");
        return;
      }

      alert("Contra deleted successfully");
      fetchContras();
    } catch (error) {
      console.error("Error deleting contra:", error);
      alert("Error deleting contra");
    }
  };

  const handleStatusChange = async (id, action) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/contras/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || `Error ${action} contra`);
        return;
      }

      alert(data.message);
      fetchContras();
    } catch (error) {
      console.error(`Error ${action} contra:`, error);
      alert(`Error ${action} contra`);
    }
  };

  // Filter contras by search
  const filteredContras = contras.filter(contra => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contra.contraNumber?.toLowerCase().includes(searchLower) ||
      contra.fromAccountId?.accountName?.toLowerCase().includes(searchLower) ||
      contra.toAccountId?.accountName?.toLowerCase().includes(searchLower) ||
      contra.description?.toLowerCase().includes(searchLower)
    );
  });

  // Get cash accounts
  const cashAccounts = accounts.filter(acc => 
    acc.accountGroupId?.name?.toLowerCase().includes("cash") ||
    acc.accountGroupId?.name?.toLowerCase().includes("current assets")
  );

  // Get bank accounts
  const bankAccounts = accounts.filter(acc => acc.isBank);

  // Get from accounts based on transfer type
  const getFromAccounts = () => {
    if (formData.transferType === "CASH_TO_BANK") return cashAccounts;
    if (formData.transferType === "BANK_TO_CASH") return bankAccounts;
    if (formData.transferType === "BANK_TO_BANK") return bankAccounts;
    return [];
  };

  // Get to accounts based on transfer type
  const getToAccounts = () => {
    if (formData.transferType === "CASH_TO_BANK") return bankAccounts;
    if (formData.transferType === "BANK_TO_CASH") return cashAccounts;
    if (formData.transferType === "BANK_TO_BANK") return bankAccounts.filter(acc => acc._id !== formData.fromAccountId);
    return [];
  };

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

  const getTransferTypeLabel = (type) => {
    const found = transferTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Contra Vouchers (Fund Transfer)</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Contra
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search contras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs w-64 focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          {transferTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Contra #</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">From</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">To</th>
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
            ) : filteredContras.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No contra vouchers found
                </td>
              </tr>
            ) : (
              filteredContras.map((contra) => (
                <tr key={contra._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-indigo-600">
                    {contra.contraNumber}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(contra.contraDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                      {contra.transferType?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div className="truncate max-w-[120px]" title={contra.fromAccountId?.accountName}>
                      {contra.fromAccountId?.accountNumber} - {contra.fromAccountId?.accountName}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div className="truncate max-w-[120px]" title={contra.toAccountId?.accountName}>
                      {contra.toAccountId?.accountNumber} - {contra.toAccountId?.accountName}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {formatCurrency(contra.amount)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[contra.status]}`}>
                      {contra.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {contra.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleOpenModal(contra)}
                            className="text-blue-600 hover:text-blue-800 px-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleStatusChange(contra._id, "approve")}
                            className="text-green-600 hover:text-green-800 px-1"
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleStatusChange(contra._id, "cancel")}
                            className="text-red-600 hover:text-red-800 px-1"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      {contra.status === "APPROVED" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(contra._id, "complete")}
                            className="text-green-600 hover:text-green-800 px-1"
                            title="Complete"
                          >
                            💰
                          </button>
                          <button
                            onClick={() => handleStatusChange(contra._id, "cancel")}
                            className="text-red-600 hover:text-red-800 px-1"
                            title="Cancel"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      {contra.status === "PENDING" && (
                        <button
                          onClick={() => handleDelete(contra._id)}
                          className="text-red-600 hover:text-red-800 px-1"
                          title="Delete"
                        >
                          🗑️
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
        title={editingId ? "Edit Contra Voucher" : "New Contra Voucher"}
        draggable={true}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Transfer Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Transfer Type <span className="text-red-500">*</span>
            </label>
            <select
              name="transferType"
              value={formData.transferType}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              {transferTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contra Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="contraDate"
              value={formData.contraDate}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* From Account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              From Account <span className="text-red-500">*</span>
            </label>
            <select
              name="fromAccountId"
              value={formData.fromAccountId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
              required
            >
              <option value="">Select Account</option>
              {getFromAccounts().map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.accountNumber} - {acc.accountName}
                </option>
              ))}
            </select>
          </div>

          {/* To Account */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              To Account <span className="text-red-500">*</span>
            </label>
            <select
              name="toAccountId"
              value={formData.toAccountId}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
              required
            >
              <option value="">Select Account</option>
              {getToAccounts().map((acc) => (
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Cheque Details (for bank transactions) */}
          {(formData.transferType === "BANK_TO_CASH" || formData.transferType === "BANK_TO_BANK") && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cheque #
                </label>
                <input
                  type="text"
                  name="chequeNumber"
                  value={formData.chequeNumber}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
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
              placeholder="Transaction ID, etc."
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500"
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
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 resize-none"
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
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
            >
              {editingId ? "Update Contra" : "Create Contra"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


