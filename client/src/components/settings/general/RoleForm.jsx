import React, { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import PermissionBuilder from './PermissionBuilder'

const RoleForm = ({ role, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activityLevel: 'Basic',
    permissions: [],
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        activityLevel: role.activityLevel || 'Basic',
        permissions: role.permissions || [],
      })
    }
  }, [role])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Role name is required'
    if (formData.permissions.length === 0) newErrors.permissions = 'Select at least one permission'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const endpoint = role ? `http://localhost:5000/api/v1/roles/${role._id}` : 'http://localhost:5000/api/v1/roles'
      const method = role ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const savedRole = await response.json()
        onSave(savedRole)
      } else {
        setErrors({ submit: 'Error saving role' })
      }
    } catch (error) {
      setErrors({ submit: 'Error saving role' })
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">
          {role ? 'Edit Role' : 'Create New Role'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Basic Info */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Role Information</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Sales Manager"
                className={`w-full px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-xs text-red-600 mt-0">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of this role's purpose"
                rows="2"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Activity Level *
              </label>
              <select
                name="activityLevel"
                value={formData.activityLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Basic">Basic - View Only</option>
                <option value="Intermediate">Intermediate - Create & Edit</option>
                <option value="Advanced">Advanced - Full Control</option>
                <option value="Full Admin">Full Admin - System Access</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity Level Guide */}
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <p className="text-xs font-medium text-blue-900 mb-1">Activity Level Guide:</p>
          <ul className="text-xs text-blue-800 space-y-0.5">
            <li>• <strong>Basic:</strong> View-only access to reports and dashboards</li>
            <li>• <strong>Intermediate:</strong> Can create and edit transactions</li>
            <li>• <strong>Advanced:</strong> Full module control with delete permissions</li>
            <li>• <strong>Full Admin:</strong> System-wide access including settings</li>
          </ul>
        </div>

        {/* Granular Permissions Builder */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Granular Permissions ({formData.permissions.length} selected)
          </h4>
          {errors.permissions && <p className="text-xs text-red-600 mb-2">{errors.permissions}</p>}
          
          <PermissionBuilder
            selectedPermissions={formData.permissions}
            onPermissionsChange={(perms) => {
              setFormData((prev) => ({ ...prev, permissions: perms }))
              if (errors.permissions) {
                setErrors((prev) => ({ ...prev, permissions: '' }))
              }
            }}
          />
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1 px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default RoleForm


