import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const UnitTypeManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    unitName: '',
    unitSymbol: '',
    factor: 1,
    unitDecimal: 2,
    category: 'QUANTITY',
    baseUnit: false,
    description: '',
    conversionNote: ''
  });

  const categories = ['WEIGHT', 'LENGTH', 'VOLUME', 'QUANTITY', 'AREA', 'OTHER'];

  // Fetch units
  useEffect(() => {
    fetchUnits();
  }, [filterCategory]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const params = filterCategory ? `?category=${filterCategory}` : '';
      const response = await axios.get(`${API_URL}/unit-types${params}`);
      setUnits(response.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
    }));
  };

  const handleOpenForm = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        unitName: unit.unitName,
        unitSymbol: unit.unitSymbol,
        factor: unit.factor,
        unitDecimal: unit.unitDecimal,
        category: unit.category,
        baseUnit: unit.baseUnit,
        description: unit.description || '',
        conversionNote: unit.conversionNote || ''
      });
    } else {
      setEditingUnit(null);
      setFormData({
        unitName: '',
        unitSymbol: '',
        factor: 1,
        unitDecimal: 2,
        category: 'QUANTITY',
        baseUnit: false,
        description: '',
        conversionNote: ''
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUnit) {
        // Update
        const response = await axios.put(
          `${API_URL}/unit-types/update/${editingUnit._id}`,
          formData
        );
        setUnits(units.map(u => u._id === editingUnit._id ? response.data.data : u));
        setSuccess('Unit type updated successfully');
      } else {
        // Create
        const response = await axios.post(
          `${API_URL}/unit-types/create`,
          formData
        );
        setUnits([...units, response.data.data]);
        setSuccess('Unit type created successfully');
      }
      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving unit type');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit type?')) return;

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/unit-types/delete/${id}`);
      setUnits(units.filter(u => u._id !== id));
      setSuccess('Unit type deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete unit type');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefaults = async () => {
    if (!window.confirm('This will create all default units. Continue?')) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/unit-types/default/create`);
      setSuccess('Default units created successfully');
      fetchUnits();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create default units');
    } finally {
      setLoading(false);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-2">
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingUnit ? 'Edit Unit Type' : 'Create New Unit Type'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Name *</label>
                <input
                  type="text"
                  name="unitName"
                  value={formData.unitName}
                  onChange={handleInputChange}
                  placeholder="e.g., Kilogram"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Symbol *</label>
                <input
                  type="text"
                  name="unitSymbol"
                  value={formData.unitSymbol}
                  onChange={handleInputChange}
                  placeholder="e.g., KG"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength="10"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Factor *</label>
                <input
                  type="number"
                  name="factor"
                  value={formData.factor}
                  onChange={handleInputChange}
                  step="0.0001"
                  min="0.0001"
                  placeholder="e.g., 1"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Decimal Places *</label>
                <input
                  type="number"
                  name="unitDecimal"
                  value={formData.unitDecimal}
                  onChange={handleInputChange}
                  min="0"
                  max="5"
                  placeholder="e.g., 2"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer pt-5">
                  <input
                    type="checkbox"
                    name="baseUnit"
                    checked={formData.baseUnit}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  Base Unit
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description"
                rows="1"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Conversion Note</label>
              <textarea
                name="conversionNote"
                value={formData.conversionNote}
                onChange={handleInputChange}
                placeholder="e.g., 1 KG = 1000 G"
                rows="1"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="p-2 bg-red-100 text-red-700 rounded-lg text-xs flex justify-between items-center">
                {error}
                <button onClick={() => setError('')} className="text-red-900">
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingUnit ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900">Unit Type Management</h3>
          <div className="flex gap-2">
            <button
              onClick={handleCreateDefaults}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Load Defaults
            </button>
            <button
              onClick={() => handleOpenForm()}
              className="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={14} />
              New Unit
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-lg shadow">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full md:w-64 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded-lg text-xs flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
          <button onClick={() => setError('')} className="text-red-900">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="p-2 bg-green-100 text-green-700 rounded-lg text-xs flex justify-between items-center">
          {success}
          <button onClick={() => setSuccess('')} className="text-green-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && units.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-600">Loading...</div>
        ) : units.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-600">
            No unit types found. Create one or load defaults.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Unit Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Symbol</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Category</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs">Factor</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Decimal</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Base</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {units.map(unit => (
                  <tr key={unit._id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{unit.unitName}</td>
                    <td className="px-3 py-2 font-medium text-blue-600">{unit.unitSymbol}</td>
                    <td className="px-3 py-2">{unit.category}</td>
                    <td className="px-3 py-2 text-right">{unit.factor}</td>
                    <td className="px-3 py-2 text-center">{unit.unitDecimal}</td>
                    <td className="px-3 py-2 text-center">
                      {unit.baseUnit ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleOpenForm(unit)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(unit._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitTypeManagement;


