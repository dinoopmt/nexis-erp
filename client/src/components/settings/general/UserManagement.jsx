import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import UserForm from './UserForm'

const UserManagement = () => {
  const [users, setUsers] = useState([
    {
      id: 1,
      username: 'admin@alarab.com',
      email: 'admin@alarab.com',
      fullName: 'Admin User',
      role: 'Administrator',
      status: 'active',
      lastLogin: '2024-03-03 10:30 AM',
    },
    {
      id: 2,
      username: 'sales@alarab.com',
      email: 'sales@alarab.com',
      fullName: 'Sales Manager',
      role: 'Sales Manager',
      status: 'active',
      lastLogin: '2024-03-02 02:15 PM',
    },
    {
      id: 3,
      username: 'inventory@alarab.com',
      email: 'inventory@alarab.com',
      fullName: 'Inventory Staff',
      role: 'Inventory Officer',
      status: 'inactive',
      lastLogin: '2024-02-28 09:00 AM',
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleAddUser = () => {
    setEditingUser(null)
    setShowForm(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== userId))
        setMessage('User deleted successfully!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('Error deleting user')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = (updatedUser) => {
    if (editingUser) {
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
    } else {
      setUsers([...users, { ...updatedUser, id: users.length + 1 }])
    }
    setShowForm(false)
    setMessage(editingUser ? 'User updated successfully!' : 'User created successfully!')
    setTimeout(() => setMessage(''), 3000)
  }

  if (showForm) {
    return <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setShowForm(false)} />
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
        <h3 className="text-base font-semibold text-gray-900">Active Users</h3>
        <button
          onClick={handleAddUser}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-1 text-left font-medium text-gray-700">Username</th>
              <th className="px-3 py-1 text-left font-medium text-gray-700">Full Name</th>
              <th className="px-3 py-1 text-left font-medium text-gray-700">Role</th>
              <th className="px-3 py-1 text-left font-medium text-gray-700">Status</th>
              <th className="px-3 py-1 text-left font-medium text-gray-700">Last Login</th>
              <th className="px-3 py-1 text-center font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-3 py-2 text-gray-900">{user.username}</td>
                <td className="px-3 py-2 text-gray-700">{user.fullName}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    {user.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{user.lastLogin}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1 hover:bg-blue-50 rounded transition"
                      title="Edit"
                    >
                      <Edit size={16} className="text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={loading}
                      className="p-1 hover:bg-red-50 rounded transition disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total Users</p>
          <p className="text-lg font-bold text-blue-900">{users.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
          <p className="text-xs text-green-700 font-medium">Active</p>
          <p className="text-lg font-bold text-green-900">{users.filter((u) => u.status === 'active').length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
          <p className="text-xs text-red-700 font-medium">Inactive</p>
          <p className="text-lg font-bold text-red-900">{users.filter((u) => u.status === 'inactive').length}</p>
        </div>
      </div>
    </div>
  )
}

export default UserManagement


