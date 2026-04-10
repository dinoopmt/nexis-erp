import React, { useState, useEffect } from 'react'
import { Plus, X, Edit, Trash2, Building2, FileText, MapPin, Phone, Mail, MapPinIcon, AlertCircle, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
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
    country: 'AE',
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
        toast.error(`Failed to load organizations: ${err.response?.data?.message || err.message}`, {
          duration: 4000,
          position: 'top-right'
        })
        console.error('Error fetching organizations:', err)
      }
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
      country: 'AE',
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

    // Check if this is first organization
    const isFirstOrg = organizations.length === 0

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Name and Code are required', {
        duration: 4000,
        position: 'top-right'
      })
      return
    }

    // 🔐 Business Rule: First org must be HEAD_OFFICE with no parent
    if (isFirstOrg) {
      if (formData.type !== 'HEAD_OFFICE') {
        toast.error('⚠️ First organization must be Head Office', {
          duration: 4000,
          position: 'top-right'
        })
        return
      }
      if (formData.parentId) {
        toast.error('⚠️ First organization cannot have a parent', {
          duration: 4000,
          position: 'top-right'
        })
        return
      }
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
        toast.success(editingId ? 'Organization updated successfully!' : 'Organization created successfully!', {
          duration: 4000,
          position: 'top-right'
        })
        resetForm()
        fetchOrganizations()
      }
    } catch (err) {
      toast.error(`Error saving organization: ${err.response?.data?.message || err.message}`, {
        duration: 4000,
        position: 'top-right'
      })
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
        toast.success('Organization deleted successfully!', {
          duration: 4000,
          position: 'top-right'
        })
        fetchOrganizations()
      }
    } catch (err) {
      toast.error(`Error deleting organization: ${err.response?.data?.message || err.message}`, {
        duration: 4000,
        position: 'top-right'
      })
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
      country: org.country || 'AE',
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

  const getCountryName = (countryCode) => {
    const country = countries.find(c => c.code === countryCode)
    return country ? country.name : countryCode
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

  // Country codes matching Organization model enum: ['AE', 'OM', 'IN']
  const countries = [
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'OM', name: 'Oman' },
    { code: 'IN', name: 'India' },
  ]

  const currencies = {
    AE: 'AED',
    OM: 'OMR',
    IN: 'INR',
  }

  const timezones = {
    AE: 'Asia/Dubai',
    OM: 'Asia/Muscat',
    IN: 'Asia/Kolkata',
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
      <div key={node._id} className="ml-2 border-l-2 border-gray-300">
        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-gray-200 my-0.5 hover:shadow-md transition">
          {/* Expand/Collapse */}
          {hasChildren && (
            <button
              onClick={() => setExpandedId(isExpanded ? null : node._id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xs"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="flex-shrink-0 w-3" />}

          {/* Type Icon & Name */}
          <span className="text-base">{getTypeIcon(node.type)}</span>
          <div className="flex-grow min-w-0">
            <p className="font-medium text-xs text-gray-900">{node.name}</p>
            <p className="text-xs text-gray-500">{node.code}</p>
          </div>

          {/* Type Badge */}
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded text-sm ${getTypeColor(node.type)}`}>
            {node.type.replace(/_/g, ' ')}
          </span>

          {/* City */}
          {node.city && <span className="text-xs text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded text-xs">{node.city}</span>}

          {/* Country */}
          <span className="text-xs font-medium px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{getCountryName(node.country)}</span>

          {/* Actions */}
          <div className="flex gap-0.5 flex-shrink-0">
            <button
              onClick={() => onEdit(node)}
              className="p-0.5 hover:bg-blue-100 text-blue-600 rounded"
              title="Edit"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => onDelete(node._id)}
              className="p-0.5 hover:bg-red-100 text-red-600 rounded"
              title="Delete"
            >
              <Trash2 size={14} />
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
    <div className="space-y-2">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white mb-2 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Organization Management</h1>
        </div>
        <p className="text-xs text-gray-600">Create and manage your organization hierarchy</p>
      </div>

      {/* Create Button */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={14} />
          New Organization
        </button>
        <button
          onClick={fetchOrganizations}
          disabled={loading}
          className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-300 rounded-lg p-2 space-y-2">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingId ? 'Edit Organization' : 'Create New Organization'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          {/* Information Banner for First Organization */}
          {organizations.length === 0 && !editingId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
              <p className="text-xs text-amber-700 font-medium">
                ℹ️ <strong>First Organization Requirement:</strong> The first organization must be a Head Office with no parent. Hierarchy creation will be available after this is created.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-900 mb-1">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Head Office Dubai"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Organization Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., HO-001"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Organization Type * {organizations.length === 0 && <span className="text-amber-600 text-xs">(First org must be Head Office)</span>}
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={organizations.length === 0}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {organizations.length === 0 ? (
                      <option value="HEAD_OFFICE">Head Office (Required for first organization)</option>
                    ) : (
                      organizationTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Only show Parent Organization if NOT first organization */}
                {organizations.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                )}
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-900 mb-1">Location Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Country *
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={(e) => {
                      const countryCode = e.target.value
                      setFormData((prev) => ({
                        ...prev,
                        country: countryCode,
                        currency: currencies[countryCode] || prev.currency,
                        timezone: timezones[countryCode] || prev.timezone,
                      }))
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g., Dubai"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="12345"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-900 mb-1">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+971-4-1234567"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contact@example.com"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-900 mb-1">Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="AED">AED - United Arab Emirates Dirham</option>
                    <option value="USD">USD - United States Dollar</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="OMR">OMR - Omani Rial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Asia/Dubai">Asia/Dubai (UAE)</option>
                    <option value="Asia/Muscat">Asia/Muscat (Oman)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (India)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-0.5">
                    Tax Number
                  </label>
                  <input
                    type="text"
                    name="taxNumber"
                    value={formData.taxNumber}
                    onChange={handleInputChange}
                    placeholder="VAT/GST/Tax ID"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-white border border-gray-300 rounded-lg">
                  <input
                    type="checkbox"
                    id="allowTransfer"
                    name="allowInventoryTransfer"
                    checked={formData.allowInventoryTransfer}
                    onChange={handleInputChange}
                    className="w-3 h-3 rounded"
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
                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FileText size={14} />
                {editingId ? 'Update' : 'Create'} Organization
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations List */}
      <div className="bg-white border border-gray-200 rounded-lg p-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Organization Hierarchy</h3>

        {loading && !organizations.length ? (
          <div className="text-center py-2">
            <p className="text-gray-500 text-xs">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-2">
            <Building2 className="mx-auto text-gray-300 mb-1" size={24} />
            <p className="text-gray-500 text-xs">No organizations created yet. Create your first head office above.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
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


