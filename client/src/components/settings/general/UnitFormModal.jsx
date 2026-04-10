import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const UnitFormModal = ({ unit, onSave, onCancel }) => {
  const [modalHeight, setModalHeight] = useState('90vh')
  const [formData, setFormData] = useState({
    unitName: '',
    unitSymbol: '',
    factor: 1,
    unitDecimal: 2,
    category: 'QUANTITY',
    baseUnit: false,
    description: '',
    conversionNote: ''
  })

  const categories = ['WEIGHT', 'LENGTH', 'VOLUME', 'QUANTITY', 'AREA', 'OTHER']

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
    if (unit) {
      setFormData({
        unitName: unit.unitName,
        unitSymbol: unit.unitSymbol,
        factor: unit.factor,
        unitDecimal: unit.unitDecimal,
        category: unit.category,
        baseUnit: unit.baseUnit,
        description: unit.description || '',
        conversionNote: unit.conversionNote || ''
      })
    }
  }, [unit])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
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
              {unit ? 'Edit Unit Type' : 'Create New Unit Type'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {unit ? 'Update unit information' : 'Enter unit details and specifications'}
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
            {/* Unit Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Unit Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    name="unitName"
                    value={formData.unitName}
                    onChange={handleInputChange}
                    placeholder="e.g., Kilogram"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    name="unitSymbol"
                    value={formData.unitSymbol}
                    onChange={handleInputChange}
                    placeholder="e.g., KG"
                    maxLength="10"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category & Conversion */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Category & Conversion</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {['WEIGHT', 'LENGTH', 'VOLUME', 'QUANTITY', 'AREA', 'OTHER'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Factor *
                  </label>
                  <input
                    type="number"
                    name="factor"
                    value={formData.factor}
                    onChange={handleInputChange}
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Decimal Places
                </label>
                <input
                  type="number"
                  name="unitDecimal"
                  value={formData.unitDecimal}
                  onChange={handleInputChange}
                  min="0"
                  max="6"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Description & Notes */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of the unit"
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Conversion Note
                  </label>
                  <textarea
                    name="conversionNote"
                    value={formData.conversionNote}
                    onChange={handleInputChange}
                    placeholder="e.g., 1 KG = 1000 G"
                    rows="2"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Base Unit Option */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="baseUnit"
                  checked={formData.baseUnit}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                Mark as Base Unit
              </label>
              <p className="text-xs text-gray-600 mt-1">Base unit is used as reference for conversions</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end border-t border-gray-200 pt-4">
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
                {unit ? 'Update Unit' : 'Create Unit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UnitFormModal
