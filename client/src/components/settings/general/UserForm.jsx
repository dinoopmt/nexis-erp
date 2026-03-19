import React, { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'

const UserForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'Staff',
    status: 'active',
    phone: '',
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const roles = ['Administrator', 'Manager', 'Sales Manager', 'Inventory Officer', 'Accountant', 'Staff']

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || '',
        password: '',
        confirmPassword: '',
        role: user.role || 'Staff',
        status: user.status || 'active',
        phone: user.phone || '',
      })
    }
  }, [user])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.username.trim()) newErrors.username = 'Username is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'

    if (!user && !formData.password) newErrors.password = 'Password is required'
    if (!user && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

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
      const endpoint = user ? `/api/v1/users/${user.id}` : '/api/v1/users'
      const method = user ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const savedUser = await response.json()
        onSave(savedUser)
      } else {
        setErrors({ submit: 'Error saving user' })
      }
    } catch (error) {
      setErrors({ submit: 'Error saving user' })
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">
          {user ? 'Edit User' : 'Create New User'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>

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
                className={`w-full px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.username && <p className="text-xs text-red-600 mt-0">{errors.username}</p>}
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
                className={`w-full px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-xs text-red-600 mt-0">{errors.email}</p>}
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
                className={`w-full px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fullName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.fullName && <p className="text-xs text-red-600 mt-0">{errors.fullName}</p>}
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
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
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
                  className={`w-full px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.password && <p className="text-xs text-red-600 mt-0">{errors.password}</p>}
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
                  className={`w-full px-3 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.confirmPassword && <p className="text-xs text-red-600 mt-0">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        )}

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
            {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default UserForm


