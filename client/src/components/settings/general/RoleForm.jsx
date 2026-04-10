import React, { useState, useEffect, useCallback } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import PermissionBuilder from './PermissionBuilder'
import { API_URL } from '../../../config/config'

const RoleForm = ({ role, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activityLevel: 'Basic',
    permissions: [],
  })

  const [expandedSections, setExpandedSections] = useState({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const previousRoleIdRef = React.useRef(null)
  const hasInitializedRef = React.useRef(false)
  const expandedSectionsRef = React.useRef({})

  useEffect(() => {
    const currentRoleId = role?._id
    const hasRoleChanged = previousRoleIdRef.current !== currentRoleId
    
    if (!hasRoleChanged) return
    
    // Role changed - reset tracking
    previousRoleIdRef.current = currentRoleId
    
    // Load form data
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        activityLevel: role.activityLevel || 'Basic',
        permissions: role.permissions || [],
      })
    } else {
      setFormData({ name: '', description: '', activityLevel: 'Basic', permissions: [] })
    }
    
    // Clear expanded sections when switching roles
    setExpandedSections({})
    expandedSectionsRef.current = {}
  }, [role?._id])

  const handleExpandedSectionsChange = useCallback((newExpanded) => {
    setExpandedSections(newExpanded)
    expandedSectionsRef.current = newExpanded
  }, [])

  const handlePermissionsChange = useCallback((perms) => {
    setFormData((prev) => ({ ...prev, permissions: perms }))
    if (errors.permissions) {
      setErrors((prev) => ({ ...prev, permissions: '' }))
    }
  }, [errors.permissions])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) newErrors.name = 'Role name is required'
    if (formData.permissions.length === 0) newErrors.permissions = 'Select at least one permission'

    setErrors(newErrors)
    
    // Show toast for first validation error
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0]
      toast.error(firstError)
    }
    
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
      const endpoint = role ? `${API_URL}/roles/${role._id}` : `${API_URL}/roles`
      const method = role ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const savedRole = await response.json()
        toast.success(role ? 'Role updated successfully!' : 'Role created successfully!', {
          duration: 3000,
          position: 'top-center'
        })
        // Update parent state but don't close modal - user will close manually
        onSave(savedRole)
      } else {
        toast.error('Error saving role', {
          duration: 3000,
          position: 'top-center'
        })
        setErrors({ submit: 'Error saving role' })
      }
    } catch (error) {
      toast.error('Error saving role', {
        duration: 3000,
        position: 'top-center'
      })
      setErrors({ submit: 'Error saving role' })
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
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

    
       

        {/* Granular Permissions Builder */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Granular Permissions  ({formData.permissions.length} selected)
          </h4>
          {errors.permissions && <p className="text-xs text-red-600 mb-2">{errors.permissions}</p>}
          
          <PermissionBuilder
            roleId={role?._id}
            selectedPermissions={formData.permissions}
            onPermissionsChange={handlePermissionsChange}
            expandedSections={expandedSections}
            setExpandedSections={handleExpandedSectionsChange}
         
            isNewRole={!role}
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


