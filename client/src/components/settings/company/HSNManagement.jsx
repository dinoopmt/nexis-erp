import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Trash2, AlertCircle, CheckCircle, X, Loader } from 'lucide-react'
import useTaxMaster from '../../../hooks/useTaxMaster'

const HSNManagement = () => {
  const { company } = useTaxMaster()
  
  // Check if company is India-based
  const isIndiaCompany = company?.countryCode === 'IN'
  // State Management
  const [hsnList, setHsnList] = useState([])
  const [filteredHSN, setFilteredHSN] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedGSTRate, setSelectedGSTRate] = useState('')
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [editingHSN, setEditingHSN] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    category: '',
    gstRate: 5,
  })

  // Fetch HSN List
  const fetchHSNList = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: pageSize,
        page: page,
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory) params.append('category', selectedCategory)
      if (selectedGSTRate) params.append('gstRate', selectedGSTRate)

      const response = await fetch(`/api/v1/hsn/list?${params.toString()}`)  
      const data = await response.json()

      if (data.success) {
        setHsnList(data.data)
        setTotalItems(data.pagination.total)
        setFilteredHSN(data.data)
      } else {
        setMessage('Failed to fetch HSN codes')
        setMessageType('error')
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/hsn/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Load on Mount
  useEffect(() => {
    fetchCategories()
    fetchHSNList()
  }, [])

  // Search/Filter Effect
  useEffect(() => {
    setPage(1)
    fetchHSNList()
  }, [searchQuery, selectedCategory, selectedGSTRate])

  // Pagination Effect
  useEffect(() => {
    if (page > 1) {
      fetchHSNList()
    }
  }, [page, pageSize])

  // Clear Message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'gstRate' ? parseInt(value) : value,
    }))
  }

  // Create HSN
  const handleCreateHSN = async () => {
    if (!formData.code || !formData.description || !formData.category) {
      setMessage('Please fill all required fields')
      setMessageType('error')
      return
    }

    if (!/^\d{6}$/.test(formData.code.toString())) {
      setMessage('HSN code must be exactly 6 digits')
      setMessageType('error')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/v1/hsn/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('HSN code created successfully')
        setMessageType('success')
        setFormData({ code: '', description: '', category: '', gstRate: 5 })
        setShowModal(false)
        fetchHSNList()
      } else {
        setMessage(data.error || 'Failed to create HSN code')
        setMessageType('error')
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  // Edit HSN
  const handleEditClick = async (hsn) => {
    setEditingHSN(hsn)
    setFormData({
      code: hsn.code,
      description: hsn.description,
      category: hsn.category,
      gstRate: hsn.gstRate,
    })
    setShowModal(true)
  }

  // Update HSN
  const handleUpdateHSN = async () => {
    if (!formData.description || !formData.category) {
      setMessage('Please fill all required fields')
      setMessageType('error')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/v1/hsn/update/${editingHSN.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          category: formData.category,
          gstRate: formData.gstRate,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('HSN code updated successfully')
        setMessageType('success')
        setShowModal(false)
        setEditingHSN(null)
        fetchHSNList()
      } else {
        setMessage(data.error || 'Failed to update HSN code')
        setMessageType('error')
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  // Delete HSN
  const handleDeleteHSN = async (code) => {
    if (!confirm(`Are you sure you want to repeal HSN code ${code}?`)) return

    try {
      setLoading(true)
      const response = await fetch(`/api/v1/hsn/repeal/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Repealed through frontend interface',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage('HSN code repealed successfully')
        setMessageType('success')
        fetchHSNList()
      } else {
        setMessage(data.error || 'Failed to repeal HSN code')
        setMessageType('error')
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  // Modal Close
  const closeModal = () => {
    setShowModal(false)
    setEditingHSN(null)
    setFormData({ code: '', description: '', category: '', gstRate: 5 })
  }

  // Total Pages
  const totalPages = Math.ceil(totalItems / pageSize)

  return (
    <div className="flex flex-col h-full">
      {/* Alerts and Controls */}
      <div className="space-y-3 flex-shrink-0">
      {!isIndiaCompany && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm flex-shrink-0">
          <AlertCircle size={18} />
          <div>
            <strong>HSN Management Not Available</strong>
            <p className="text-xs mt-1">HSN (Harmonized System of Nomenclature) is only applicable for India-based companies using GST. Your company is currently configured for <strong>{company?.countryName || 'Unknown'}</strong>. Please update your company settings to India if you want to use HSN management.</p>
          </div>
        </div>
      )}

      {/* Message Alert */}
      {message && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-shrink-0 ${
            messageType === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {messageType === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {message}
          <button
            onClick={() => setMessage('')}
            className="ml-auto hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}
      </div>

      {/* Search and Filter Section - Only show for India companies */}
      {isIndiaCompany && (
        <>
      <div className="bg-white rounded-lg shadow-md p-3 space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search HSN code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* GST Rate Filter */}
          <select
            value={selectedGSTRate}
            onChange={(e) => setSelectedGSTRate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All GST Rates</option>
            <option value="0">0%</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
            <option value="28">28%</option>
          </select>

          {/* Create Button */}
          <button
            onClick={() => {
              setEditingHSN(null)
              setFormData({ code: '', description: '', category: '', gstRate: 5 })
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Add HSN
          </button>
        </div>
      </div>
        </>
      )}

      {/* HSN List Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col flex-1 min-h-0">
        {loading && hsnList.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader size={24} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Table Container */}
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Code
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Category
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">
                      GST Rate
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHSN.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-4 text-center text-gray-500">
                        No HSN codes found
                      </td>
                    </tr>
                  ) : (
                    filteredHSN.map((hsn) => (
                      <tr key={hsn.code} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold text-blue-600">
                          {hsn.code}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {hsn.description}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {hsn.category}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                            {hsn.gstRate}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {hsn.repealed ? (
                            <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                              Repealed
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(hsn)}
                              disabled={hsn.repealed || loading}
                              className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteHSN(hsn.code)}
                              disabled={hsn.repealed || loading}
                              className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination - Sticky at bottom */}
      {isIndiaCompany && totalPages > 1 && !loading && (
        <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 flex items-center justify-between px-3 py-2 shadow-lg">
          <div className="text-xs text-gray-600">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, totalItems)} of {totalItems}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="px-2 py-1 text-xs text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal - Only for India companies */}
      {showModal && isIndiaCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4 space-y-3">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingHSN ? 'Edit HSN Code' : 'Create New HSN Code'}
              </h2>
              <button
                onClick={closeModal}
                className="text-white bg-gray-600 hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <div className="space-y-2">
              {/* Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HSN Code (6 digits) *
                </label>
                <input
                  type="text"
                  maxLength="6"
                  name="code"
                  value={formData.code}
                  onChange={handleFormChange}
                  disabled={!!editingHSN}
                  placeholder="090111"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  placeholder="Product description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* GST Rate Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Rate *
                </label>
                <select
                  name="gstRate"
                  value={formData.gstRate}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingHSN ? handleUpdateHSN : handleCreateHSN}
                disabled={loading}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {loading ? (
                  <Loader size={14} className="animate-spin" />
                ) : editingHSN ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HSNManagement


