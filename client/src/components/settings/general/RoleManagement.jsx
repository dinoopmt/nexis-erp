import React, { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import RoleForm from './RoleForm'

const RoleManagement = () => {
  const [roles, setRoles] = useState([
    {
      id: 1,
      name: 'Administrator',
      description: 'Full system access',
      activityLevel: 'Full Admin',
      permissions: [
        'MANAGE_USERS',
        'MANAGE_ROLES',
        'VIEW_SALES',
        'CREATE_SALES_INVOICE',
        'VIEW_INVENTORY',
        'MANAGE_PRODUCTS',
        'VIEW_ACCOUNTS',
        'CREATE_JOURNAL_ENTRY',
        'VIEW_REPORTS',
        'MANAGE_COMPANY_SETTINGS',
      ],
      userCount: 1,
    },
    {
      id: 2,
      name: 'Sales Manager',
      description: 'Sales and customer management',
      activityLevel: 'Advanced',
      permissions: ['VIEW_SALES', 'CREATE_SALES_INVOICE', 'VIEW_REPORTS'],
      userCount: 1,
    },
    {
      id: 3,
      name: 'Inventory Officer',
      description: 'Inventory management only',
      activityLevel: 'Intermediate',
      permissions: ['VIEW_INVENTORY', 'MANAGE_PRODUCTS'],
      userCount: 1,
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAddRole = () => {
    setEditingRole(null)
    setShowForm(true)
  }

  const handleEditRole = (role) => {
    setEditingRole(role)
    setShowForm(true)
  }

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setRoles(roles.filter((r) => r.id !== roleId))
        setMessage('Role deleted successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('Error deleting role')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRole = (updatedRole) => {
    if (editingRole) {
      setRoles(roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)))
    } else {
      setRoles([...roles, { ...updatedRole, id: roles.length + 1, userCount: 0 }])
    }
    setShowForm(false)
    setMessage(editingRole ? 'Role updated successfully!' : 'Role created successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  if (showForm) {
    return <RoleForm role={editingRole} onSave={handleSaveRole} onCancel={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-2">
      {/* Message */}
      {message && (
        <div className="p-2 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
          {message}
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">Available Roles</h3>
        <button
          onClick={handleAddRole}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Add Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {roles.map((role) => (
          <div key={role.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-sm font-bold text-gray-900">{role.name}</h4>
                <p className="text-xs text-gray-600">{role.description}</p>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                      role.activityLevel === 'Full Admin'
                        ? 'bg-red-100 text-red-700'
                        : role.activityLevel === 'Advanced'
                        ? 'bg-orange-100 text-orange-700'
                        : role.activityLevel === 'Intermediate'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {role.activityLevel}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditRole(role)}
                  className="p-1 hover:bg-blue-50 rounded transition"
                  title="Edit"
                >
                  <Edit size={14} className="text-blue-600" />
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  disabled={loading}
                  className="p-1 hover:bg-red-50 rounded transition disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={14} className="text-red-600" />
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-2">
              <p className="text-xs font-medium text-gray-700 mb-1">Permissions ({role.permissions.length})</p>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 3).map((perm) => (
                  <span key={perm} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                    {perm.replace(/_/g, ' ')}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                    +{role.permissions.length - 3}
                  </span>
                )}
              </div>
            </div>

            {/* User Count */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <span className="font-medium">{role.userCount}</span> user(s) assigned
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total Roles</p>
          <p className="text-lg font-bold text-blue-900">{roles.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
          <p className="text-xs text-green-700 font-medium">Total Users</p>
          <p className="text-lg font-bold text-green-900">{roles.reduce((sum, r) => sum + r.userCount, 0)}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
          <p className="text-xs text-purple-700 font-medium">Permissions</p>
          <p className="text-lg font-bold text-purple-900">10</p>
        </div>
      </div>
    </div>
  )
}

export default RoleManagement


