import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import UserForm from './UserForm'

const UserFormModal = ({ user, onSave, onCancel }) => {
  const [modalHeight, setModalHeight] = useState('90vh')

  useEffect(() => {
    const calculateHeight = () => {
      const maxHeight = window.innerHeight - 32
      setModalHeight(`${maxHeight}px`)
    }
    calculateHeight()
    window.addEventListener('resize', calculateHeight)
    return () => window.removeEventListener('resize', calculateHeight)
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-2xl flex flex-col"
        style={{ maxHeight: modalHeight, width: '90%', maxWidth: '600px' }}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start flex-shrink-0 z-20">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {user ? 'Edit User' : 'Add New User'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {user ? 'Update user information and permissions' : 'Create a new system user account'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 rounded flex items-center justify-center transition flex-shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ scrollbarGutter: 'stable' }}
        >
          <UserForm user={user} onSave={onSave} onCancel={onCancel} />
        </div>
      </div>
    </div>
  )
}

export default UserFormModal
