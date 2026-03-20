import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Calendar, Percent, Gift } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../config/config';
import Modal from '../shared/Model';

const Promotion = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    promotionName: '',
    promotionType: 'BOGO', // BOGO, PERCENTAGE, PERIOD_WISE
    productId: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    bogoDetails: {
      buyQuantity: 1,
      getQuantity: 1,
      applicableToAll: false,
    },
    percentageDetails: {
      discountPercent: 0,
      minPurchaseQuantity: 1,
    },
    periodWiseDetails: {
      periods: [{ periodName: '', discountPercent: 0, startDate: '', endDate: '' }],
    },
    status: 'active',
  });

  // Fetch promotions
  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, [currentPage]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/promotions?page=${currentPage}&limit=${itemsPerPage}`);
      setPromotions(response.data.promotions || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch promotions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/getproducts?limit=1000`);
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handlePeriodChange = (index, field, value) => {
    const updatedPeriods = [...formData.periodWiseDetails.periods];
    updatedPeriods[index] = { ...updatedPeriods[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      periodWiseDetails: { periods: updatedPeriods }
    }));
  };

  const addPeriod = () => {
    setFormData(prev => ({
      ...prev,
      periodWiseDetails: {
        periods: [
          ...prev.periodWiseDetails.periods,
          { periodName: '', discountPercent: 0, startDate: '', endDate: '' }
        ]
      }
    }));
  };

  const removePeriod = (index) => {
    setFormData(prev => ({
      ...prev,
      periodWiseDetails: {
        periods: prev.periodWiseDetails.periods.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.promotionName) {
      alert('Promotion name is required');
      return;
    }

    if (!formData.productId && !formData.bogoDetails.applicableToAll) {
      alert('Please select a product or make it applicable to all');
      return;
    }

    try {
      setLoading(true);
      const url = isEdit
        ? `${API_URL}/promotions/updatepromotion/${editId}`
        : `${API_URL}/promotions/addpromotion`;

      const method = isEdit ? 'put' : 'post';
      const response = await axios[method](url, formData);

      setPromotions(isEdit
        ? promotions.map(p => p._id === editId ? response.data.promotion : p)
        : [response.data.promotion, ...promotions]
      );

      resetForm();
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save promotion');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promotion) => {
    setFormData(promotion);
    setEditId(promotion._id);
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;

    try {
      setLoading(true);
      await axios.delete(`${API_URL}/promotions/deletepromotion/${id}`);
      setPromotions(promotions.filter(p => p._id !== id));
      setError('');
    } catch (err) {
      setError('Failed to delete promotion');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      promotionName: '',
      promotionType: 'BOGO',
      productId: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      bogoDetails: { buyQuantity: 1, getQuantity: 1, applicableToAll: false },
      percentageDetails: { discountPercent: 0, minPurchaseQuantity: 1 },
      periodWiseDetails: { periods: [{ periodName: '', discountPercent: 0, startDate: '', endDate: '' }] },
      status: 'active',
    });
    setIsEdit(false);
    setEditId(null);
  };

  const getPromotionTypeIcon = (type) => {
    switch (type) {
      case 'BOGO': return <Gift size={16} />;
      case 'PERCENTAGE': return <Percent size={16} />;
      case 'PERIOD_WISE': return <Calendar size={16} />;
      default: return null;
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p._id === productId);
    return product ? product.name : 'All Products';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className='text-2xl lg:text-3xl font-bold text-gray-900'>Promotion Management</h1>
          <p className='text-gray-600 mt-1'>Create and manage promotions for your products</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          New Promotion
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg flex justify-between items-center">
          {error}
          <button onClick={() => setError('')} className="text-red-900 hover:text-red-600">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Promotions Table */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-600">Loading promotions...</div>
        ) : promotions.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No promotions created yet. Click "New Promotion" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Period</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Details</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map(promo => (
                  <tr key={promo._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{promo.promotionName}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full w-fit">
                        {getPromotionTypeIcon(promo.promotionType)}
                        <span className="text-xs font-semibold">
                          {promo.promotionType === 'BOGO' ? 'BOGO' : 
                           promo.promotionType === 'PERCENTAGE' ? 'Percentage' : 'Period-Wise'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {promo.bogoDetails?.applicableToAll ? 'All Products' : getProductName(promo.productId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(promo.startDate).toLocaleDateString()} - {new Date(promo.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {promo.promotionType === 'BOGO' && `Buy ${promo.bogoDetails?.buyQuantity || 1} Get ${promo.bogoDetails?.getQuantity || 1}`}
                      {promo.promotionType === 'PERCENTAGE' && `${promo.percentageDetails?.discountPercent || 0}% Off`}
                      {promo.promotionType === 'PERIOD_WISE' && `${promo.periodWiseDetails?.periods?.length || 0} periods`}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        promo.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {promo.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button
                        onClick={() => handleEdit(promo)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(promo._id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} draggable={true}>
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Promotion' : 'Create New Promotion'}
            </h2>
            <button onClick={() => setIsModalOpen(false)} className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm">
              ✕
            </button>
          </div>

          {/* Basic Details */}
          <div className="space-y-4 mb-6">
            <input
              type="text"
              name="promotionName"
              placeholder="Promotion Name"
              value={formData.promotionName}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Promotion Type</label>
                <select
                  name="promotionType"
                  value={formData.promotionType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BOGO">Buy One Get One</option>
                  <option value="PERCENTAGE">Percentage Discount</option>
                  <option value="PERIOD_WISE">Period-Wise Offer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Product Selection */}
          {formData.promotionType !== 'BOGO' || !formData.bogoDetails.applicableToAll ? (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Product</label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a product...</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* BOGO Details */}
          {formData.promotionType === 'BOGO' && (
            <div className="bg-blue-50 p-6 rounded-lg mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Buy One Get One Details</h3>

              <div className="flex items-center gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bogoDetails.applicableToAll}
                    onChange={(e) => handleDetailChange('bogoDetails', 'applicableToAll', e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Applicable to All Products</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Buy Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.bogoDetails.buyQuantity}
                    onChange={(e) => handleDetailChange('bogoDetails', 'buyQuantity', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Get Quantity (Free)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.bogoDetails.getQuantity}
                    onChange={(e) => handleDetailChange('bogoDetails', 'getQuantity', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Percentage Discount Details */}
          {formData.promotionType === 'PERCENTAGE' && (
            <div className="bg-green-50 p-6 rounded-lg mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Percentage Discount Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentageDetails.discountPercent}
                    onChange={(e) => handleDetailChange('percentageDetails', 'discountPercent', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Purchase Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.percentageDetails.minPurchaseQuantity}
                    onChange={(e) => handleDetailChange('percentageDetails', 'minPurchaseQuantity', parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Period-Wise Details */}
          {formData.promotionType === 'PERIOD_WISE' && (
            <div className="bg-purple-50 p-6 rounded-lg mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Period-Wise Details</h3>
                <button
                  onClick={addPeriod}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
                >
                  <Plus size={16} />
                  Add Period
                </button>
              </div>

              {formData.periodWiseDetails.periods.map((period, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-purple-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900">Period {index + 1}</h4>
                    {formData.periodWiseDetails.periods.length > 1 && (
                      <button
                        onClick={() => removePeriod(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Period Name (e.g., Summer Sale)"
                    value={period.periodName}
                    onChange={(e) => handlePeriodChange(index, 'periodName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={period.discountPercent}
                        onChange={(e) => handlePeriodChange(index, 'discountPercent', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={period.startDate}
                        onChange={(e) => handlePeriodChange(index, 'startDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={period.endDate}
                        onChange={(e) => handlePeriodChange(index, 'endDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Promotion;


