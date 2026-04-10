import React, { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { API_URL } from '../../../config/config'

const UserForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: '',
    status: 'active',
    phone: '',
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [roles, setRoles] = useState([])

  // Fetch roles from backend
  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/roles`)
      if (response.ok) {
        const rolesData = await response.json()
        setRoles(rolesData)
        // Set default role to first role if creating new user
        if (!user && rolesData.length > 0) {
          setFormData((prev) => ({ ...prev, role: rolesData[0]._id }))
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || '',
        password: '',
        confirmPassword: '',
        role: typeof user.role === 'object' ? user.role._id : user.role || 'Staff',
        status: user.status || 'active',
        phone: user.phone || '',
      })
    }
  }, [user])

  const validateForm = () => {
    if (!formData.username.trim()) {
      toast.error('Username is required', { duration: 3000, position: 'top-center' })
      return false
    }
    if (!formData.email.trim()) {
      toast.error('Email is required', { duration: 3000, position: 'top-center' })
      return false
    }
    if (!formData.fullName.trim()) {
      toast.error('Full name is required', { duration: 3000, position: 'top-center' })
      return false
    }
    if (!formData.role) {
      toast.error('Role is required', { duration: 3000, position: 'top-center' })
      return false
    }
    if (!user && !formData.password) {
      toast.error('Password is required', { duration: 3000, position: 'top-center' })
      return false
    }
    if (!user && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match', { duration: 3000, position: 'top-center' })
      return false
    }
    return true
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const endpoint = user 
        ? `${API_URL}/users/${user._id}` 
        : `${API_URL}/users`
      const method = user ? 'PUT' : 'POST'

      // Prepare data - exclude password fields if updating
      const dataToSend = user
        ? {
            username: formData.username,
            email: formData.email,
            fullName: formData.fullName,
            role: formData.role,
            status: formData.status,
            phone: formData.phone,
          }
        : {
            username: formData.username,
            email: formData.email,
            fullName: formData.fullName,
            password: formData.password,
            role: formData.role,
            status: formData.status,
            phone: formData.phone,
          }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      })

      if (response.ok) {
        const savedUser = await response.json()
        toast.success(user ? 'User updated successfully!' : 'User created successfully!', { duration: 3000, position: 'top-center' })
        onSave(savedUser)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Error saving user', { duration: 3000, position: 'top-center' })
      }
    } catch (error) {
      toast.error('Error saving user', { duration: 3000, position: 'top-center' })
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
        {/* General Info */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">User Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="e.g., john.doe"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john@alarab.com"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+971 50 123 4567"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Role & Access */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Role & Access</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Password */}
        {!user && (
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Password</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm password"
                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
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
            {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    )
  }
  
  export default UserForm


