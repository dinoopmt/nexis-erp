import React, { useState, useEffect } from 'react'
import RoleForm from './RoleForm'

const RoleFormModal = ({ role, onSave, onCancel, isOpen }) => {
  const [modalHeight, setModalHeight] = useState('85vh')

  // Calculate fixed modal height on mount and window resize
  useEffect(() => {
    const calculateHeight = () => {
      const padding = 32 // p-4 on both sides
      const maxHeight = window.innerHeight - padding
      setModalHeight(`${maxHeight}px`)
    }

    calculateHeight()
    window.addEventListener('resize', calculateHeight)
    return () => window.removeEventListener('resize', calculateHeight)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full flex flex-col"
        style={{ height: modalHeight }}
      >
        {/* Modal Header - Fixed */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              {role ? 'Edit Role' : 'Create New Role'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {role ? 'Update role details and permissions' : 'Define a new role with specific permissions'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="ml-4 bg-gray-600 hover:bg-gray-700 text-white w-8 h-8 flex items-center justify-center rounded transition-colors text-sm flex-shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ scrollbarGutter: 'stable' }}
        >
          <RoleForm role={role} onSave={onSave} onCancel={onCancel} />
        </div>
      </div>
    </div>
  )
}

export default RoleFormModal
