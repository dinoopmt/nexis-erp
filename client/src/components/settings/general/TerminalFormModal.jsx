import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const TerminalFormModal = ({ terminal, onSave, onCancel }) => {
  const [modalHeight, setModalHeight] = useState('90vh')
  const [formData, setFormData] = useState({
    terminalId: '',
    terminalName: '',
    invoiceNumberPrefix: '',
    invoiceFormat: 'STANDARD',
  })

  useEffect(() => {
    const calculateHeight = () => {
      const maxHeight = window.innerHeight - 32
      setModalHeight(`${maxHeight}px`)
    }
    calculateHeight()
    window.addEventListener('resize', calculateHeight)
    return () => window.removeEventListener('resize', calculateHeight)
  }, [])

  useEffect(() => {
    if (terminal) {
      // Merge terminal data with default state to ensure all fields stay defined
      setFormData(prev => ({
        ...prev,
        ...terminal
      }))
    }
  }, [terminal])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

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
              {terminal ? 'Edit Terminal' : 'Add New Terminal'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {terminal ? 'Update terminal configuration' : 'Create a new terminal configuration'}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Terminal Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Terminal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Terminal ID *
                  </label>
                  <input
                    type="text"
                    name="terminalId"
                    value={formData.terminalId}
                    onChange={handleInputChange}
                    placeholder="e.g., TRM001"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Terminal Name *
                  </label>
                  <input
                    type="text"
                    name="terminalName"
                    value={formData.terminalName}
                    onChange={handleInputChange}
                    placeholder="e.g., Counter 1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Invoice Settings */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Invoice Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    name="invoiceNumberPrefix"
                    value={formData.invoiceNumberPrefix}
                    onChange={handleInputChange}
                    placeholder="e.g., C1"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Format
                  </label>
                  <select
                    name="invoiceFormat"
                    value={formData.invoiceFormat}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="THERMAL">Thermal (58mm)</option>
                    <option value="THERMAL80">Thermal (80mm)</option>
                    <option value="A4">A4</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Save size={16} />
                Save Terminal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TerminalFormModal
