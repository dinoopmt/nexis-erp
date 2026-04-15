import React, { useState, useEffect } from 'react'
import { Plus, X, Edit, Trash2, Building2, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [formData, setFormData] = useState({
    code: '',
    type: 'HEAD_OFFICE',
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
      code: '',
      type: 'HEAD_OFFICE',
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

    if (!formData.code.trim()) {
      toast.error('Code is required', {
        duration: 4000,
        position: 'top-right'
      })
      return
    }

    // 🔐 Business Rule: First org must be HEAD_OFFICE
    if (isFirstOrg) {
      if (formData.type !== 'HEAD_OFFICE') {
        toast.error('⚠️ First organization must be Head Office', {
          duration: 4000,
          position: 'top-right'
        })
        return
      }
    } else {
      // 🔐 Prevent duplicate HEAD_OFFICE
      if (formData.type === 'HEAD_OFFICE' && !editingId) {
        const hasHeadOffice = flattenOrganizations(organizations).some(org => org.type === 'HEAD_OFFICE')
        if (hasHeadOffice) {
          toast.error('❌ Only one Head Office is allowed in the system', {
            duration: 4000,
            position: 'top-right'
          })
          return
        }
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
      code: org.code,
      type: org.type,
    })
    setEditingId(org._id)
    setShowForm(true)
  }

  // Generate next code based on organization type
  const generateNextCode = (type) => {
    const allOrgs = flattenOrganizations(organizations)
    if (type === 'HEAD_OFFICE') {
      return 'HO'
    } else if (type === 'BRANCH') {
      // Find highest branch number
      const branchCodes = allOrgs
        .filter(org => org.type === 'BRANCH')
        .map(org => {
          const match = org.code.match(/BR-(\d+)/)
          return match ? parseInt(match[1]) : 0
        })
      const nextNum = Math.max(...branchCodes, 0) + 1
      return `BR-${String(nextNum).padStart(3, '0')}`
    }
    return ''
  }

  // Open form with auto-generated code
  const openNewForm = (type = 'HEAD_OFFICE') => {
    const generateCode = type === 'HEAD_OFFICE' 
      ? (organizations.length === 0 ? 'HO' : '') 
      : generateNextCode('BRANCH')
    
    setFormData({
      code: generateCode,
      type: organizations.length === 0 ? 'HEAD_OFFICE' : type,
    })
    setEditingId(null)
    setShowForm(true)
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return '🏢'
      case 'BRANCH':
        return '🏪'
      default:
        return '📍'
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'HEAD_OFFICE':
        return 'bg-purple-100 text-purple-800'
      case 'BRANCH':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const organizationTypes = [
    { value: 'HEAD_OFFICE', label: 'Head Office' },
    { value: 'BRANCH', label: 'Branch' },
  ]

  const getValidTypes = (type) => {
    const hierarchy = {
      HEAD_OFFICE: ['BRANCH'],
      BRANCH: [],
    }
    return organizationTypes.filter((t) => hierarchy[type]?.includes(t.value) || t.value === 'HEAD_OFFICE')
  }

  // Check if HEAD_OFFICE already exists
  const getAvailableTypes = () => {
    const hasHeadOffice = flattenOrganizations(organizations).some(org => org.type === 'HEAD_OFFICE')
    if (hasHeadOffice) {
      return organizationTypes.filter((t) => t.value !== 'HEAD_OFFICE')
    }
    return organizationTypes
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

          {/* Type Icon & Code */}
          <span className="text-base">{getTypeIcon(node.type)}</span>
          <div className="flex-grow min-w-0">
            <p className="font-medium text-xs text-gray-900">{node.code}</p>
          </div>

          {/* Type Badge */}
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded text-sm ${getTypeColor(node.type)}`}>
            {node.type.replace(/_/g, ' ')}
          </span>

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
          onClick={() => openNewForm(organizations.length === 0 ? 'HEAD_OFFICE' : 'BRANCH')}
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

      {/* Modal Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          {/* Modal Box */}
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center border-b border-blue-200">
              <h3 className="text-lg font-bold text-white">
                {editingId ? '✏️ Edit Organization' : '➕ Create New Organization'}
              </h3>
              <button
                onClick={resetForm}
                className="text-white hover:bg-blue-500 rounded-full p-1 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Information Banner for First Organization */}
              {organizations.length === 0 && !editingId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-700 font-medium">
                    ℹ️ <strong>First Organization:</strong> Must be a Head Office. Branches can be created after.
                  </p>
                </div>
              )}

              {/* Information Banner for Creating Branch */}
              {organizations.length > 0 && !editingId && formData.type === 'BRANCH' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 font-medium">
                    ℹ️ <strong>Branch Creation:</strong> Will be automatically linked to Head Office.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Organization Code */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold text-gray-700">
                      Organization Code *
                    </label>
                    {!editingId && formData.code && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        🔄 Auto-generated
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder={formData.type === 'HEAD_OFFICE' ? 'HO' : 'BR-001'}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    {!editingId && formData.type === 'BRANCH' && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, code: generateNextCode('BRANCH') }))}
                        className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition"
                        title="Generate next code"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.type === 'HEAD_OFFICE' ? '💡 Format: HO' : '💡 Format: BR-001, BR-002, etc.'}
                  </p>
                </div>

                {/* Organization Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Organization Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={organizations.length === 0}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {organizations.length === 0 ? (
                      <option value="HEAD_OFFICE">🏢 Head Office (Required for first)</option>
                    ) : (
                      getAvailableTypes().map((type) => (
                        <option key={type.value} value={type.value}>
                          {getTypeIcon(type.value)} {type.label}
                        </option>
                      ))
                    )}
                  </select>
                  {flattenOrganizations(organizations).some(org => org.type === 'HEAD_OFFICE') && organizations.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">✓ Head Office exists - only Branch can be created</p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {loading ? '⏳ Saving...' : editingId ? '💾 Update' : '✓ Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
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


