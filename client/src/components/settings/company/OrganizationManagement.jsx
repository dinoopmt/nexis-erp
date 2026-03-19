import React, { useState, useEffect } from 'react'
import { Plus, X, Edit, Trash2, Building2, FileText, MapPin, Phone, Mail, MapPinIcon, AlertCircle, Check } from 'lucide-react'
import axios from 'axios'

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'HEAD_OFFICE',
    parentId: null,
    address: '',
    city: '',
    country: 'UAE',
    postalCode: '',
    phone: '',
    email: '',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    taxNumber: '',
    allowInventoryTransfer: true,
  })

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get('/api/v1/organizations/tree')
      if (response.data.success) {
        // Ensure data is always an array
        const data = Array.isArray(response.data.data) ? response.data.data : []
        setOrganizations(data)
      }
    } catch (err) {
      // Treat "No organizations found" as empty list, not an error
      if (err.response?.data?.message?.includes('No organizations found')) {
        setOrganizations([])
      } else {
        setError('Failed to load organizations: ' + (err.response?.data?.message || err.message))
      }
      console.error('Error fetching organizations:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'HEAD_OFFICE',
      parentId: null,
      address: '',
      city: '',
      country: 'UAE',
      postalCode: '',
      phone: '',
      email: '',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      taxNumber: '',
      allowInventoryTransfer: true,
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and Code are required')
      return
    }

    try {
      setLoading(true)
      let response

      if (editingId) {
        // Update
        response = await axios.put(`/api/v1/organizations/${editingId}`, formData)
      } else {
        // Create
        response = await axios.post('/api/v1/organizations', formData)
      }

      if (response.data.success) {
        setSuccess(editingId ? 'Organization updated successfully!' : 'Organization created successfully!')
        resetForm()
        fetchOrganizations()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving organization')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (orgId) => {
    if (!window.confirm('Are you sure you want to delete this organization?')) {
      return
    }

    try {
      setLoading(true)
      const response = await axios.delete(`/api/v1/organizations/${orgId}`)
      if (response.data.success) {
        setSuccess('Organization deleted successfully!')
        fetchOrganizations()
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting organization')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (org) => {
    setFormData({
      name: org.name,
      code: org.code,
      type: org.type,
      parentId: org.parentId || null,
      address: org.address || '',
      city: org.city || '',
      country: org.country || 'UAE',
      postalCode: org.postalCode || '',
      phone: org.phone || '',
      email: org.email || '',
      currency: org.currency || 'AED',
      timezone: org.timezone || 'Asia/Dubai',
      taxNumber: org.taxNumber || '',
      allowInventoryTransfer: org.allowInventoryTransfer !== false,
    })
    setEditingId(org._id)
    setShowForm(true)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return '🏢'
      case 'REGIONAL':
        return '🏭'
      case 'BRANCH':
        return '🏪'
      case 'STORE':
        return '🛒'
      default:
        return '📍'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return 'bg-purple-100 text-purple-800'
      case 'REGIONAL':
        return 'bg-blue-100 text-blue-800'
      case 'BRANCH':
        return 'bg-green-100 text-green-800'
      case 'STORE':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const organizationTypes = [
    { value: 'HEAD_OFFICE', label: 'Head Office' },
    { value: 'REGIONAL', label: 'Regional Office' },
    { value: 'BRANCH', label: 'Branch' },
    { value: 'STORE', label: 'Store' },
  ]

  const countries = ['UAE', 'Oman', 'India']

  const currencies = {
    UAE: 'AED',
    Oman: 'OMR',
    India: 'INR',
  }

  const timezones = {
    UAE: 'Asia/Dubai',
    Oman: 'Asia/Muscat',
    India: 'Asia/Kolkata',
  }

  const getValidTypes = (type) => {
    const hierarchy = {
      HEAD_OFFICE: ['REGIONAL', 'BRANCH', 'STORE'],
      REGIONAL: ['BRANCH', 'STORE'],
      BRANCH: ['STORE'],
      STORE: [],
    }
    return organizationTypes.filter((t) => hierarchy[type]?.includes(t.value) || t.value === 'HEAD_OFFICE')
  }

  // Flatten organizations for parent selection
  const flattenOrganizations = (orgs) => {
    let flat = []
    orgs.forEach((org) => {
      flat.push(org)
      if (org.children && org.children.length > 0) {
        flat = flat.concat(flattenOrganizations(org.children))
      }
    })
    return flat
  }

  const RecursiveOrgNode = ({ node, onEdit, onDelete }) => {
    const isExpanded = expandedId === node._id
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node._id} className="ml-4 border-l-2 border-gray-300">
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 my-1 hover:shadow-md transition">
          {/* Expand/Collapse */}
          {hasChildren && (
            <button
              onClick={() => setExpandedId(isExpanded ? null : node._id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="flex-shrink-0 w-5" />}

          {/* Type Icon & Name */}
          <span className="text-lg">{getTypeIcon(node.type)}</span>
          <div className="flex-grow min-w-0">
            <p className="font-medium text-sm text-gray-900">{node.name}</p>
            <p className="text-xs text-gray-500">{node.code}</p>
          </div>

          {/* Type Badge */}
          <span className={`text-xs font-medium px-2 py-1 rounded ${getTypeColor(node.type)}`}>
            {node.type.replace(/_/g, ' ')}
          </span>

          {/* City */}
          {node.city && <span className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded">{node.city}</span>}

          {/* Country */}
          <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded">{node.country}</span>

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onEdit(node)}
              className="p-1 hover:bg-blue-100 text-blue-600 rounded"
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(node._id)}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {node.children.map((child) => (
              <RecursiveOrgNode key={child._id} node={child} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Create Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          New Organization
        </button>
        <button
          onClick={fetchOrganizations}
          disabled={loading}
          className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-semibold text-gray-900">
              {editingId ? 'Edit Organization' : 'Create New Organization'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Head Office Dubai"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Organization Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., HO-001"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Organization Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {organizationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Parent Organization
                  </label>
                  <select
                    name="parentId"
                    value={formData.parentId || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        parentId: e.target.value || null,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- None (Head Office) --</option>
                    {flattenOrganizations(organizations)
                      .filter((org) => org._id !== editingId && org.type !== 'STORE')
                      .map((org) => (
                        <option key={org._id} value={org._id}>
                          {getTypeIcon(org.type)} {org.name} ({org.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Location Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={(e) => {
                      const country = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        country,
                        currency: currencies[country] || prev.currency,
                        timezone: timezones[country] || prev.timezone,
                      }))
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g., Dubai"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="12345"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+971-4-1234567"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contact@example.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="AED">AED - United Arab Emirates Dirham</option>
                    <option value="USD">USD - United States Dollar</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="OMR">OMR - Omani Rial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                    <option value="Asia/Muscat">Asia/Muscat (Oman)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tax Number
                  </label>
                  <input
                    type="text"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleInputChange}
                    placeholder="VAT/GST/Tax ID"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2 p-2 bg-white border border-gray-300 rounded-lg">
                  <input
                    type="checkbox"
                    id="allowTransfer"
                    name="allowInventoryTransfer"
                    checked={formData.allowInventoryTransfer}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="allowTransfer" className="text-xs font-medium text-gray-700 flex-grow">
                    Allow Inventory Transfer
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FileText size={16} />
                {editingId ? 'Update' : 'Create'} Organization
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations List */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Organization Hierarchy</h3>

        {loading && !organizations.length ? (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-4">
            <Building2 className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 text-sm">No organizations created yet. Create your first head office above.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {organizations.map((org) => (
              <RecursiveOrgNode
                key={org._id}
                node={org}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizationManagement


