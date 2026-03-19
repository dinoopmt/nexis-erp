/**
 * LpoForm Component - List View with Modal Form
 * Displays list of Local Purchase Orders with option to create/edit via modal
 * Matches GRN/RTV UX pattern - persistent list + modal overlay
 */
import React, { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useDecimalFormat } from "../../hooks/useDecimalFormat";

const LpoForm = ({ onNavigate }) => {
  const { formatCurrency, formatNumber } = useDecimalFormat();
  
  // Main list state
  const [lpoList, setLpoList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal state
  const [showNewLpoModal, setShowNewLpoModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    lpoNumber: "",
    lpoDate: new Date().toISOString().split('T')[0],
    vendorId: "",
    vendorName: "",
    referenceNumber: "",
    deliveryDate: "",
    items: [],
    notes: "",
    status: "Draft"
  });

  // Load LPO list on mount
  useEffect(() => {
    loadLpoList();
  }, [statusFilter]);

  const loadLpoList = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - replace with actual API call
      const mockLpos = [
        {
          _id: "lpo1",
          lpoNumber: "LPO-000001",
          lpoDate: "2026-03-18",
          vendorName: "ABC Suppliers",
          totalAmount: 50000,
          status: "Draft",
          itemCount: 5
        },
        {
          _id: "lpo2",
          lpoNumber: "LPO-000002",
          lpoDate: "2026-03-17",
          vendorName: "XYZ Trading",
          totalAmount: 75000,
          status: "Approved",
          itemCount: 3
        }
      ];
      setLpoList(mockLpos);
    } catch (error) {
      toast.error("Failed to load LPO list");
      setLpoList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Create new LPO
  const handleNewLpo = () => {
    setFormData({
      lpoNumber: "LPO-000003", // Mock - replace with API call
      lpoDate: new Date().toISOString().split('T')[0],
      vendorId: "",
      vendorName: "",
      referenceNumber: "",
      deliveryDate: "",
      items: [],
      notes: "",
      status: "Draft"
    });
    setEditingId(null);
    setShowNewLpoModal(true);
  };

  // Edit LPO
  const handleEditLpo = (lpoIdOrObject) => {
    const lpoId = typeof lpoIdOrObject === "string" ? lpoIdOrObject : lpoIdOrObject._id;
    // Mock - replace with actual API call
    setFormData(prev => ({
      ...prev,
      lpoNumber: "LPO-000001",
      vendorName: "ABC Suppliers"
    }));
    setEditingId(lpoId);
    setShowNewLpoModal(true);
  };

  // Delete LPO
  const handleDeleteLpo = async (lpoId) => {
    if (!window.confirm("Are you sure you want to delete this LPO?")) return;
    try {
      toast.success("LPO deleted successfully");
      loadLpoList();
    } catch (error) {
      toast.error("Failed to delete LPO");
    }
  };

  // Save LPO
  const handleSaveLpo = async () => {
    if (!formData.vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    try {
      setIsLoading(true);
      // Mock save - replace with actual API call
      toast.success(editingId ? "LPO updated successfully" : "LPO created successfully");
      setShowNewLpoModal(false);
      loadLpoList();
    } catch (error) {
      toast.error("Failed to save LPO");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowNewLpoModal(false);
    setEditingId(null);
  };

  // Filter LPOs
  const filteredLpos = lpoList.filter(lpo => {
    const matchesSearch = 
      lpo.lpoNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lpo.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lpo.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Local Purchase Orders</h1>
              <p className="text-sm text-gray-600 mt-1">Manage LPOs and track procurement</p>
            </div>
            <button
              onClick={handleNewLpo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <Plus size={20} />
              New LPO
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by LPO number or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            onClick={loadLpoList}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading && lpoList.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">LPO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLpos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No LPOs found
                    </td>
                  </tr>
                ) : (
                  filteredLpos.map(lpo => (
                    <tr key={lpo._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{lpo.lpoNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lpo.lpoDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lpo.vendorName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lpo.itemCount} items</td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(lpo.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          lpo.status === "Draft" ? "bg-yellow-100 text-yellow-800" :
                          lpo.status === "Approved" ? "bg-green-100 text-green-800" :
                          lpo.status === "Received" ? "bg-blue-100 text-blue-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {lpo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center space-x-2">
                        <button
                          onClick={() => handleEditLpo(lpo)}
                          className="text-blue-600 hover:text-blue-800 inline-flex"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLpo(lpo._id)}
                          className="text-red-600 hover:text-red-800 inline-flex"
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
        )}
      </div>

      {/* New/Edit LPO Modal */}
      {showNewLpoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-4/5 max-h-screen overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "Edit LPO" : "Create New LPO"}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">{formData.lpoNumber}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {/* LPO Header Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-3">📋 LPO Details</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">LPO Number</label>
                      <input
                        type="text"
                        value={formData.lpoNumber}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">LPO Date</label>
                      <input
                        type="date"
                        value={formData.lpoDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, lpoDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">Vendor</label>
                      <select
                        value={formData.vendorId}
                        onChange={(e) => setFormData(prev => ({ ...prev, vendorId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Vendor</option>
                        <option value="v1">ABC Suppliers</option>
                        <option value="v2">XYZ Trading</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">Reference Number</label>
                      <input
                        type="text"
                        value={formData.referenceNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional vendor ref"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 font-semibold mb-1 block">Delivery Date</label>
                      <input
                        type="date"
                        value={formData.deliveryDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-semibold text-gray-900">📦 Items (0)</p>
                    <button
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium transition"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="text-center py-8 bg-white rounded-lg">
                    <p className="text-sm text-gray-500">No items added yet. Click "Add Item" to get started.</p>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <label className="text-xs text-gray-600 font-semibold mb-1 block">📝 Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Totals */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 rounded-lg">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Total Items</p>
                      <p className="text-base font-bold text-gray-900">0</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Subtotal</p>
                      <p className="text-base font-bold text-gray-900">{formatCurrency(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Tax</p>
                      <p className="text-base font-bold text-purple-600">{formatCurrency(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-0.5">Total</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex justify-end gap-2">
              <button
                onClick={handleCloseModal}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLpo}
                disabled={isLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition"
              >
                {editingId ? "Update LPO" : "Save as Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LpoForm;


