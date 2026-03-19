import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, AlertCircle, Info } from 'lucide-react';
import axios from 'axios';
import useDecimalFormat from '../../hooks/useDecimalFormat';

const StockBatchManagement = ({ productId, productName }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const { formatNumber, currency } = useDecimalFormat();

  // Form state for new batch
  const [formData, setFormData] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    quantity: '',
    costPerUnit: '',
    supplier: '',
    referenceNumber: '',
    notes: '',
  });

  // Fetch batches
  useEffect(() => {
    if (productId) {
      fetchBatches();
    }
  }, [productId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/stock-batches/product/${productId}`);
      if (response.data.success) {
        setBatches(response.data.data);
        setError('');
      }
    } catch (err) {
      setError('Failed to load batches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post('/api/v1/stock-batches', {
        productId,
        ...formData,
        quantity: parseInt(formData.quantity),
        costPerUnit: parseFloat(formData.costPerUnit),
      });

      if (response.data.success) {
        setFormData({
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          quantity: '',
          costPerUnit: '',
          supplier: '',
          referenceNumber: '',
          notes: '',
        });
        setShowForm(false);
        fetchBatches();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;

    try {
      setLoading(true);
      const response = await axios.delete(`/api/v1/stock-batches/${batchId}`);
      if (response.data.success) {
        fetchBatches();
      }
    } catch (err) {
      setError('Failed to delete batch');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (batch) => {
    if (batch.batchStatus === 'EXPIRED') return 'bg-red-100 text-red-800 border-red-300';
    if (batch.batchStatus === 'EXPIRING_SOON') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (batch.batchStatus === 'ACTIVE') return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (batch) => {
    if (batch.batchStatus === 'EXPIRED') return '❌';
    if (batch.batchStatus === 'EXPIRING_SOON') return '⚠️';
    if (batch.batchStatus === 'ACTIVE') return '✓';
    return '○';
  };

  return (
    <div className="space-y-3 p-2">
      {error && (
        <div className="p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-gray-800">Stock Batches for {productName}</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={14} /> New Batch
        </button>
      </div>

      {/* Create Batch Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-2">
          <h4 className="text-xs font-semibold text-gray-800 mb-2">Create New Batch</h4>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-700">Batch Number *</label>
                <input
                  type="text"
                  placeholder="e.g., BATCH-001"
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Supplier</label>
                <input
                  type="text"
                  placeholder="Supplier name"
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Mfg Date *</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.manufacturingDate}
                  onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Expiry Date *</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Quantity *</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Cost/Unit *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.costPerUnit}
                  onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-700">Reference Number</label>
                <input
                  type="text"
                  placeholder="PO, Invoice, etc."
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-700">Notes</label>
                <textarea
                  placeholder="Additional notes..."
                  className="w-full border rounded px-2 py-1 text-xs border-gray-300"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Batch'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-400 text-white px-2 py-1 rounded text-xs hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batches List */}
      <div className="space-y-2">
        {loading && batches.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">Loading batches...</p>
        ) : batches.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No batches created yet</p>
        ) : (
          batches.map((batch) => (
            <div
              key={batch._id}
              className={`border rounded p-2 space-y-1 ${getStatusColor(batch)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{getStatusIcon(batch)} {batch.batchNumber}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusColor(batch)}`}>
                      {batch.batchStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                    <div>
                      <span className="font-semibold">Mfg Date:</span> {new Date(batch.manufacturingDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-semibold">Expiry:</span> {new Date(batch.expiryDate).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-semibold">Qty:</span> {batch.quantity} (Used: {batch.usedQuantity}, Available: {batch.quantity - batch.usedQuantity})
                    </div>
                    <div>
                      <span className="font-semibold">Cost:</span> {currency}{formatNumber(batch.costPerUnit * batch.quantity)}
                    </div>
                    <div>
                      <span className="font-semibold">Days to Expiry:</span> {batch.daysToExpiry > 0 ? batch.daysToExpiry : 'Expired'}
                    </div>
                    {batch.supplier && (
                      <div>
                        <span className="font-semibold">Supplier:</span> {batch.supplier}
                      </div>
                    )}
                  </div>

                  {batch.notes && (
                    <div className="text-xs mt-1 p-1 bg-white bg-opacity-50 rounded">
                      <span className="font-semibold">Notes:</span> {batch.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setSelectedBatch(batch)}
                    className="p-1 hover:bg-opacity-75 text-gray-700"
                    title="View details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batch._id)}
                    disabled={loading}
                    className="p-1 hover:bg-opacity-75 text-red-700 disabled:opacity-50"
                    title="Delete batch"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-sm font-bold mb-3">Batch Details: {selectedBatch.batchNumber}</h3>

            <div className="space-y-2 text-xs mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold">Status:</span>
                  <span className="ml-1">{selectedBatch.batchStatus}</span>
                </div>
                <div>
                  <span className="font-semibold">Days to Expiry:</span>
                  <span className="ml-1">{selectedBatch.daysToExpiry}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold">Manufacturing Date:</span>{' '}
                {new Date(selectedBatch.manufacturingDate).toLocaleDateString()}
              </div>
              <div>
                <span className="font-semibold">Expiry Date:</span>{' '}
                {new Date(selectedBatch.expiryDate).toLocaleDateString()}
              </div>
              <div>
                <span className="font-semibold">Shelf Life Days:</span> {selectedBatch.shelfLifeDays}
              </div>

              <div className="border-t pt-2">
                <span className="font-semibold">Total Quantity:</span> {selectedBatch.quantity}
              </div>
              <div>
                <span className="font-semibold">Used Quantity:</span> {selectedBatch.usedQuantity}
              </div>
              <div>
                <span className="font-semibold">Available Quantity:</span>{' '}
                {selectedBatch.quantity - selectedBatch.usedQuantity}
              </div>

              <div className="border-t pt-2">
                <span className="font-semibold">Cost Per Unit:</span> {currency}{formatNumber(selectedBatch.costPerUnit)}
              </div>
              <div>
                <span className="font-semibold">Total Batch Cost:</span> {currency}{formatNumber(selectedBatch.quantity * selectedBatch.costPerUnit)}
              </div>

              {selectedBatch.supplier && (
                <div className="border-t pt-2">
                  <span className="font-semibold">Supplier:</span> {selectedBatch.supplier}
                </div>
              )}
              {selectedBatch.referenceNumber && (
                <div>
                  <span className="font-semibold">Reference:</span> {selectedBatch.referenceNumber}
                </div>
              )}
              {selectedBatch.notes && (
                <div className="border-t pt-2">
                  <span className="font-semibold">Notes:</span> {selectedBatch.notes}
                </div>
              )}

              <div className="border-t pt-2 text-gray-500">
                <span className="font-semibold">Created:</span> {new Date(selectedBatch.createdAt).toLocaleDateString()}
              </div>
            </div>

            <button
              onClick={() => setSelectedBatch(null)}
              className="w-full bg-gray-400 text-white px-3 py-1 rounded text-xs hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockBatchManagement;


