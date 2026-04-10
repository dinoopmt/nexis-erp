import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, Edit2, Trash2, AlertCircle, X, Loader } from 'lucide-react'
import useTaxMaster from '../../../hooks/useTaxMaster'
import { showToast } from '../../../components/shared/AnimatedCenteredToast.jsx'

const HSNManagement = () => {
  const { company } = useTaxMaster()
  const tableContainerRef = useRef(null)
  
  // Check if company is India-based
  const isIndiaCompany = company?.country === 'IN'
  // State Management
  const [allHsnList, setAllHsnList] = useState([]) // All HSN data
  const [filteredHSN, setFilteredHSN] = useState([]) // Filtered data
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedGSTRate, setSelectedGSTRate] = useState('')
  const [categories, setCategories] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [editingHSN, setEditingHSN] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    category: '',
    gstRate: 5,
  })

  // Fetch ALL HSN codes at once (no server-side pagination)
  const fetchAllHSNList = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/hsn/list?limit=10000&page=1&isActive=true')
      const data = await response.json()

      if (data.success) {
        setAllHsnList(data.data || [])
        setFilteredHSN(data.data || [])
      } else {
        showToast('error', 'Failed to fetch HSN codes')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
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
    fetchAllHSNList()
  }, [])

  // Apply filters to fetched data (client-side)
  useEffect(() => {
    let filtered = allHsnList

    if (searchQuery) {
      filtered = filtered.filter(hsn =>
        hsn.code.toString().includes(searchQuery) ||
        hsn.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter(hsn => hsn.category === selectedCategory)
    }

    if (selectedGSTRate) {
      filtered = filtered.filter(hsn => hsn.gstRate === parseInt(selectedGSTRate))
    }

    setFilteredHSN(filtered)
    setCurrentPage(1) // Reset to page 1
  }, [allHsnList, searchQuery, selectedCategory, selectedGSTRate])



  // Auto-fit items per page based on viewport height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (tableContainerRef.current) {
        const container = tableContainerRef.current
        const availableHeight = container.clientHeight
        const rowHeight = 32 // ~32px per row (padding + borders)
        const headerHeight = 40 // Table header height
        const calculatedItems = Math.max(5, Math.floor((availableHeight - headerHeight) / rowHeight))
        setItemsPerPage(calculatedItems)
        console.log(`📏 Auto-fit: ${calculatedItems} items (height: ${availableHeight}px)`)
      }
    }

    calculateItemsPerPage()
    const resizeObserver = new ResizeObserver(calculateItemsPerPage)
    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current)
    }

    window.addEventListener('resize', calculateItemsPerPage)
    return () => {
      window.removeEventListener('resize', calculateItemsPerPage)
      resizeObserver.disconnect()
    }
  }, [])

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
      showToast('error', 'Please fill all required fields')
      return
    }

    if (!/^\d{6}$/.test(formData.code.toString())) {
      showToast('error', 'HSN code must be exactly 6 digits')
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
        showToast('success', 'HSN code created successfully')
        setFormData({ code: '', description: '', category: '', gstRate: 5 })
        setShowModal(false)
        fetchAllHSNList()
      } else {
        showToast('error', data.error || 'Failed to create HSN code')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
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
      showToast('error', 'Please fill all required fields')
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
        showToast('success', 'HSN code updated successfully')
        setShowModal(false)
        setEditingHSN(null)
        fetchAllHSNList()
      } else {
        showToast('error', data.error || 'Failed to update HSN code')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
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
        showToast('success', 'HSN code repealed successfully')
        fetchAllHSNList()
      } else {
        showToast('error', data.error || 'Failed to repeal HSN code')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
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

  // Total Pages and Pagination
  const totalPages = Math.ceil(filteredHSN.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedHSN = filteredHSN.slice(startIndex, endIndex)

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* HEADER - Fixed at top */}
      <div className="flex-shrink-0 bg-white border-b">
        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">HSN Management</h1>
            {allHsnList.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">✓ Loaded {allHsnList.length} | Showing {filteredHSN.length} | Auto-fit: <span className="font-bold">{itemsPerPage} items/page</span></p>
            )}
          </div>

          {/* Alert - Non-India */}
          {!isIndiaCompany && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
              <AlertCircle size={18} />
              <div>
                <strong>HSN Management</strong>
                <p className="text-xs">Only for India companies. Current: {company?.country || 'Not set'}</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          {isIndiaCompany && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input type="text" placeholder="Search code or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Categories</option>
                {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              <select value={selectedGSTRate} onChange={(e) => setSelectedGSTRate(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Rates</option>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
              <button onClick={() => { setEditingHSN(null); setFormData({ code: '', description: '', category: '', gstRate: 5 }); setShowModal(true) }} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                <Plus size={16} /> Add HSN
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABLE - Scrollable content */}
      <div ref={tableContainerRef} className="flex-1 overflow-hidden flex flex-col min-h-0 border-b">
        {loading && allHsnList.length === 0 ? (
          <div className="flex items-center justify-center flex-1"><Loader size={24} className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="p-2 border text-left font-semibold" style={{ width: '15%' }}>Code</th>
                  <th className="p-2 border text-left font-semibold" style={{ width: '35%' }}>Description</th>
                  <th className="p-2 border text-left font-semibold" style={{ width: '20%' }}>Category</th>
                  <th className="p-2 border text-center font-semibold" style={{ width: '10%' }}>GST Rate</th>
                  <th className="p-2 border text-center font-semibold" style={{ width: '10%' }}>Status</th>
                  <th className="p-2 border text-center font-semibold" style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHSN.length === 0 ? (
                  <tr><td colSpan="6" className="p-4 text-center text-gray-500">No HSN codes found</td></tr>
                ) : (
                  paginatedHSN.map((hsn) => (
                    <tr key={hsn.code} className="border-b hover:bg-gray-50">
                      <td className="p-2 border font-mono font-semibold text-blue-600">{hsn.code}</td>
                      <td className="p-2 border text-gray-700">{hsn.description}</td>
                      <td className="p-2 border text-gray-600">{hsn.category}</td>
                      <td className="p-2 border text-center"><span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">{hsn.gstRate}%</span></td>
                      <td className="p-2 border text-center"><span className={`inline-block px-2 py-1 rounded text-xs font-bold ${hsn.repealed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{hsn.repealed ? 'Repealed' : 'Active'}</span></td>
                      <td className="p-2 border text-center">
                        <button onClick={() => handleEditClick(hsn)} disabled={!isIndiaCompany || hsn.repealed || loading} className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 p-1" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteHSN(hsn.code)} disabled={!isIndiaCompany || hsn.repealed || loading} className="text-red-600 hover:text-red-800 disabled:text-gray-400 p-1" title="Delete"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION FOOTER - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600 font-medium">Page <span className="font-bold text-purple-700">{currentPage}/{totalPages || 1}</span> | <span className="font-bold text-purple-700">{filteredHSN.length}</span> items | Auto-fit: <span className="font-bold text-purple-700">{itemsPerPage}</span> per page</div>
          <div className="flex gap-0.5">
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium">⏮️</button>
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium">◀️</button>
            <div className="flex gap-0.5">
              {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                let pageNum = currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-1 py-0.5 border rounded text-xs font-medium ${currentPage === pageNum ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-gray-100'}`}>{pageNum}</button>
                )
              })}
            </div>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium">▶️</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium">⏭️</button>
          </div>
        </div>
      </div>

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


