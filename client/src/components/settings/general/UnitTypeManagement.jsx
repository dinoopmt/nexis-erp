import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import UnitFormModal from './UnitFormModal';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const UnitTypeManagement = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [containerHeight, setContainerHeight] = useState('calc(100vh - 200px)');
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Calculate viewport height and items per page
  useEffect(() => {
    const calculateHeight = () => {
      // Fixed header offset: main header (~80px) + controls section (~70px)
      const fixedHeaderHeight = 80;
      const controlsHeight = 70;
      const totalHeaderHeight = fixedHeaderHeight + controlsHeight; // 150px
      
      // Fixed sizes for pagination and other elements
      const stickyHeaderHeight = 32; // Table sticky header
      const paginationFooterHeight = 56; // Pagination footer with padding
      
      // Calculate container height: viewport - headers - pagination footer
      const viewportHeight = window.innerHeight;
      const containerHeightPx = viewportHeight - totalHeaderHeight - paginationFooterHeight;
      setContainerHeight(`${containerHeightPx}px`);
      
      // Calculate items per page: container space - sticky header / row height
      const rowHeight = 36; // Row height with padding
      const availableTableSpace = containerHeightPx - stickyHeaderHeight;
      const calculatedItems = Math.max(5, Math.floor(availableTableSpace / rowHeight));
      setItemsPerPage(calculatedItems);
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

  // Fetch units
  useEffect(() => {
    fetchUnits();
    setCurrentPage(1); // Reset to page 1 when filter changes
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
    setEditingUnit(unit);
    setShowForm(true);
  };

  const handleSaveUnit = async (formData) => {
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
      setEditingUnit(null);
      setCurrentPage(1); // Reset to first page
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

  

  return (
    <div className="absolute inset-0 flex flex-col bg-gray-100 overflow-hidden">
      {/* Main Header */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-200 pb-4">
        <h2 className="text-1xl pt-5 font-bold text-gray-900 mb-1">Unit Type Management</h2>
       
      </div>

      {/* Controls Section - Sticky */}
      <div className="sticky top-20 bg-white z-10 space-y-3 pb-3 border-b border-gray-200">
        {/* Header */}
        <div className="p-3 rounded-lg">
          <div className="flex justify-end gap-2">


<div className="px-3">
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
            
            
            <div  >
              
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
        
      </div>

      {/* Table Section with Pagination */}
      <div className="flex flex-col space-y-0" style={{ height: containerHeight }}>
        {/* Table Container - Scrollable, takes remaining space before pagination */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border flex flex-col min-h-0 overflow-hidden" style={{ flex: '1 1 auto', minHeight: 0 }}>
          {/* Messages */}
          

          

          {/* Loading State */}
          {loading && units.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-sm">Loading units...</p>
            </div>
          ) : units.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-sm">No unit types found.</p>
            </div>
          ) : (
            <>
              {/* Table with Sticky Header */}
              <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-100 text-left sticky top-0 z-30" style={{ backgroundColor: '#f3f4f6' }}>
                  <tr>
                    <th className="p-2 border text-left font-semibold text-xs" style={{ width: '18%' }}>Unit Name</th>
                    <th className="p-2 border text-left font-semibold text-xs" style={{ width: '8%' }}>Symbol</th>
                    <th className="p-2 border text-left font-semibold text-xs" style={{ width: '15%' }}>Category</th>
                    <th className="p-2 border text-right font-semibold text-xs" style={{ width: '10%' }}>Factor</th>
                    <th className="p-2 border text-center font-semibold text-xs" style={{ width: '8%' }}>Decimal</th>
                    <th className="p-2 border text-left font-semibold text-xs" style={{ width: '25%' }}>Description</th>
                    <th className="p-2 border text-center font-semibold text-xs" style={{ width: '8%' }}>Base</th>
                    <th className="p-2 border text-center font-semibold text-xs" style={{ width: '8%' }}>Actions</th>
                  </tr>
                </thead>
              </table>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                  <tbody>
                    {(() => {
                      const totalPages = Math.ceil(units.length / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedUnits = units.slice(startIndex, endIndex);

                      return paginatedUnits.length > 0 ? (
                        paginatedUnits.map(unit => (
                          <tr key={unit._id} className="hover:bg-gray-50 border-b">
                            <td className="p-2 border text-left text-xs font-medium">{unit.unitName}</td>
                            <td className="p-2 border text-left text-xs font-semibold text-blue-600">{unit.unitSymbol}</td>
                            <td className="p-2 border text-left text-xs">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{unit.category}</span>
                            </td>
                            <td className="p-2 border text-right text-xs">{unit.factor}</td>
                            <td className="p-2 border text-center text-xs">{unit.unitDecimal}</td>
                            <td className="p-2 border text-left text-xs text-gray-600">{unit.description || ''}</td>
                            <td className="p-2 border text-center text-xs">
                              {unit.baseUnit ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Base</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 border text-center">
                              <button
                                onClick={() => handleOpenForm(unit)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition mr-1"
                                title="Edit"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(unit._id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="p-4 text-center text-gray-500 text-xs">
                            No units on this page
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination Footer - Always Visible */}
        {units.length > 0 && (
          <div className="flex-shrink-0 bg-white border-t shadow-sm" style={{ flex: '0 0 auto', minHeight: '56px' }}>
            <div className="px-4 py-2">
              <div className="flex items-center justify-between">
                {/* Page Info */}
                <div className="text-xs text-gray-600 font-medium whitespace-nowrap">
                  Page <span className="font-bold text-blue-600">{currentPage}/{Math.ceil(units.length / itemsPerPage) || 1}</span> | <span className="font-bold text-blue-600">{units.length}</span> units
                </div>

                {/* Pagination Controls */}
                <div className="flex gap-0.5 flex-wrap justify-center items-center">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium"
                  >
                    ⏮️
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium"
                  >
                    ◀️
                  </button>

                  {/* Page Numbers */}
                  <div className="flex gap-0.5">
                    {[...Array(Math.min(Math.ceil(units.length / itemsPerPage), 15))].map((_, i) => {
                      const totalPages = Math.ceil(units.length / itemsPerPage);
                      let pageNum;
                      if (totalPages <= 7) {
                        pageNum = i + 1;
                      } else if (currentPage <= 4) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i;
                      } else {
                        pageNum = currentPage - 3 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-1 py-0.5 border rounded text-xs font-medium ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(Math.ceil(units.length / itemsPerPage), currentPage + 1))}
                    disabled={currentPage === Math.ceil(units.length / itemsPerPage)}
                    className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium"
                  >
                    ▶️
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.ceil(units.length / itemsPerPage))}
                    disabled={currentPage === Math.ceil(units.length / itemsPerPage)}
                    className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium"
                  >
                    ⏭️
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unit Form Modal */}
      {showForm && (
        <UnitFormModal 
          unit={editingUnit} 
          onSave={handleSaveUnit} 
          onCancel={() => setShowForm(false)} 
        />
      )}
    </div>
  );
};

export default UnitTypeManagement;


