import { useEffect, useState } from "react";
import { API_URL } from "../../config/config";
import Modal from "../shared/Model";
import useDecimalFormat from "../../hooks/useDecimalFormat";

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("JV");

  const [formData, setFormData] = useState({
    voucherType: "JV",
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    referenceNumber: "",
    lineItems: [
      { accountId: "", debitAmount: "", creditAmount: "", description: "" },
      { accountId: "", debitAmount: "", creditAmount: "", description: "" }
    ]
  });

  const voucherTypes = [
    { value: "JV", label: "Journal Voucher" },
    { value: "BV", label: "Bank Voucher" }
  ];

  const { formatNumber } = useDecimalFormat();

  const statusColors = {
    DRAFT: "bg-yellow-100 text-yellow-800",
    POSTED: "bg-green-100 text-green-800",
    REVERSE: "bg-red-100 text-red-800"
  };

  // Fetch Journal Entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStatus) query.append("status", filterStatus);
      if (filterType) query.append("voucherType", filterType);

      const response = await fetch(`${API_URL}/api/v1/journals/getjournalentries?${query}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      setEntries(data.journalEntries || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
      alert("Error fetching journal entries");
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
    fetchEntries();
    fetchAccounts();
  }, [filterStatus, filterType]);

  const handleOpenModal = (entry = null) => {
    if (entry) {
      setEditingId(entry._id);
      setFormData({
        voucherType: entry.voucherType || "JV",
        entryDate: entry.entryDate?.split("T")[0] || "",
        description: entry.description || "",
        referenceNumber: entry.referenceNumber || "",
        lineItems: entry.lineItems?.map(item => ({
          accountId: item.accountId?._id || "",
          debitAmount: item.debitAmount || "",
          creditAmount: item.creditAmount || "",
          description: item.description || ""
        })) || [
          { accountId: "", debitAmount: "", creditAmount: "", description: "" },
          { accountId: "", debitAmount: "", creditAmount: "", description: "" }
        ]
      });
    } else {
      setEditingId(null);
      setFormData({
        voucherType: "JV",
        entryDate: new Date().toISOString().split("T")[0],
        description: "",
        referenceNumber: "",
        lineItems: [
          { accountId: "", debitAmount: "", creditAmount: "", description: "" },
          { accountId: "", debitAmount: "", creditAmount: "", description: "" }
        ]
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

  const handleLineItemChange = (index, field, value) => {
    setFormData(prev => {
      const newLineItems = [...prev.lineItems];
      newLineItems[index] = {
        ...newLineItems[index],
        [field]: value
      };
      
      // If entering debit, clear credit and vice versa
      if (field === "debitAmount" && value) {
        newLineItems[index].creditAmount = "";
      } else if (field === "creditAmount" && value) {
        newLineItems[index].debitAmount = "";
      }
      
      return { ...prev, lineItems: newLineItems };
    });
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { accountId: "", debitAmount: "", creditAmount: "", description: "" }
      ]
    }));
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length <= 2) {
      alert("Minimum 2 line items required for a journal entry");
      return;
    }
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;
    formData.lineItems.forEach(item => {
      totalDebit += parseFloat(item.debitAmount) || 0;
      totalCredit += parseFloat(item.creditAmount) || 0;
    });
    return { totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { totalDebit, totalCredit, isBalanced } = calculateTotals();

    if (!formData.description) {
      alert("Description is required");
      return;
    }

    if (totalDebit === 0 && totalCredit === 0) {
      alert("Please enter amounts");
      return;
    }

    if (!isBalanced) {
      alert(`Entry is not balanced. Debit: ${formatNumber(totalDebit)}, Credit: ${formatNumber(totalCredit)}`);
      return;
    }

    // Validate all line items have accounts
    const invalidItems = formData.lineItems.filter(
      item => !item.accountId || (parseFloat(item.debitAmount || 0) === 0 && parseFloat(item.creditAmount || 0) === 0)
    );
    if (invalidItems.length > 0) {
      alert("Each line item must have an account and an amount");
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/api/v1/journals/updatejournalentry/${editingId}`
        : `${API_URL}/api/v1/journals/addjournalentry`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error saving entry");
        return;
      }

      alert(editingId ? "Entry updated successfully" : "Entry created successfully");
      handleCloseModal();
      fetchEntries();
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Error saving entry");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/deletejournalentry/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error deleting entry");
        return;
      }

      alert("Entry deleted successfully");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Error deleting entry");
    }
  };

  const handlePost = async (id) => {
    if (!confirm("Post this entry? This will update account balances.")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/journals/postjournalentry/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error posting entry");
        return;
      }

      alert("Entry posted successfully");
      fetchEntries();
    } catch (error) {
      console.error("Error posting entry:", error);
      alert("Error posting entry");
    }
  };

  const handleReverse = async (id) => {
    if (!confirm("Reverse this entry? This will create a reversing entry.")) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/journals/reversejournalentry/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Error reversing entry");
        return;
      }

      alert("Entry reversed successfully");
      fetchEntries();
    } catch (error) {
      console.error("Error reversing entry:", error);
      alert("Error reversing entry");
    }
  };

  // Filter entries by search
  const filteredEntries = entries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.voucherNumber?.toLowerCase().includes(searchLower) ||
      entry.description?.toLowerCase().includes(searchLower) ||
      entry.referenceNumber?.toLowerCase().includes(searchLower)
    );
  });

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
      currency: "AED",
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const { totalDebit, totalCredit, isBalanced } = calculateTotals();

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Journal Entries</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          + New Entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs w-64 focus:ring-1 focus:ring-purple-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
        >
          <option value="">All Types</option>
          <option value="JV">Journal Voucher</option>
          <option value="BV">Bank Voucher</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="REVERSE">Reversed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Voucher #</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Debit</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600">Credit</th>
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
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No entries found
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-purple-600">
                    {entry.voucherNumber}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {entry.voucherType}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {formatDate(entry.entryDate)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    <div className="truncate max-w-[200px]" title={entry.description}>
                      {entry.description}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {formatCurrency(entry.totalDebit)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">
                    {formatCurrency(entry.totalCredit)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      {entry.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => handleOpenModal(entry)}
                            className="text-blue-600 hover:text-blue-800 px-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handlePost(entry._id)}
                            className="text-green-600 hover:text-green-800 px-1"
                            title="Post"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDelete(entry._id)}
                            className="text-red-600 hover:text-red-800 px-1"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                      {entry.status === "POSTED" && (
                        <button
                          onClick={() => handleReverse(entry._id)}
                          className="text-orange-600 hover:text-orange-800 px-1"
                          title="Reverse"
                        >
                          ↩️
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
        title={editingId ? "Edit Journal Entry" : "New Journal Entry"}
        width="max-w-4xl"
        draggable={true}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Fields */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Voucher Type
              </label>
              <select
                name="voucherType"
                value={formData.voucherType}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                disabled={editingId}
              >
                {voucherTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Entry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="entryDate"
                value={formData.entryDate}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reference #
              </label>
              <input
                type="text"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleInputChange}
                placeholder="Invoice #, etc."
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Entry description"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-700">Line Items</label>
              <button
                type="button"
                onClick={addLineItem}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                + Add Line
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 w-1/3">Account</th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 w-1/5">Description</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600 w-1/6">Debit</th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600 w-1/6">Credit</th>
                    <th className="text-center px-2 py-1.5 font-medium text-gray-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1">
                        <select
                          value={item.accountId}
                          onChange={(e) => handleLineItemChange(index, "accountId", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="">Select Account</option>
                          {accounts.map((acc) => (
                            <option key={acc._id} value={acc._id}>
                              {acc.accountNumber} - {acc.accountName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          placeholder="Line description"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={item.debitAmount}
                          onChange={(e) => handleLineItemChange(index, "debitAmount", e.target.value)}
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={item.creditAmount}
                          onChange={(e) => handleLineItemChange(index, "creditAmount", e.target.value)}
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-500 hover:text-red-700"
                          title="Remove"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan="2" className="px-2 py-1.5 text-right text-gray-700">Totals:</td>
                    <td className="px-2 py-1.5 text-right text-gray-800">
                      {formatCurrency(totalDebit)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-800">
                      {formatCurrency(totalCredit)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan="2" className="px-2 py-1.5 text-right text-gray-700">Difference:</td>
                    <td colSpan="2" className={`px-2 py-1.5 text-center font-medium ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                      {isBalanced ? "✓ Balanced" : formatCurrency(Math.abs(totalDebit - totalCredit))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
              disabled={!isBalanced}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                isBalanced 
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {editingId ? "Update Entry" : "Create Entry"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


