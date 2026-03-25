import React, { useState, useEffect } from 'react'
import { Save, Upload, X } from 'lucide-react'
import useTaxMaster from '../../../hooks/useTaxMaster'
import { useCostingMaster } from '../../../hooks/useCostingMaster'

const CompanyMaster = () => {
  const { company, taxMaster, loading: contextLoading, updateCompany } = useTaxMaster()
  const { costingMethod, switchCostingMethod, updateCostingConfig } = useCostingMaster()

  const [formData, setFormData] = useState({
    companyName: 'Al Arab Computers LLC',
    registrationNumber: 'CR123456789',
    taxId: 'TAX123456',
    email: 'info@alarabcomputers.com',
    phone: '+971554507149',
    website: 'www.alarabcomputersllc.com',
    address: 'Dubai Business Centre',
    city: 'Dubai',
    state: 'Dubai',
    postalCode: '12345',
    country: 'UAE',
    countryCode: 'AE',
    currency: 'AED',
    taxType: 'VAT',
    taxRate: 5.00,
    costingMethod: 'FIFO',
    decimalPlaces: 2,
    logoUrl: '',
    industry: 'Technology',
    fiscalYearEnd: '12-31',
  })

  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [logoPreview, setLogoPreview] = useState(null)
  const [countriesLoading, setCountriesLoading] = useState(true)

  useEffect(() => {
    fetchCountries()
    // Load company data from context
    if (company && company.companyName) {
      setFormData((prev) => ({
        ...prev,
        ...company,
      }))
    }
    // Sync costing method from hook
    if (costingMethod) {
      setFormData((prev) => ({
        ...prev,
        costingMethod,
      }))
    }
  }, [company, costingMethod])

  const fetchCountries = async () => {
    try {
      setCountriesLoading(true)
      const response = await fetch('/api/v1/countries')

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data) {
        setCountries(data.data)
      }
    } catch (error) {
      console.error('Error fetching countries:', error)
      setMessage(`Failed to load country configurations: ${error.message}`)
    } finally {
      setCountriesLoading(false)
    }
  }

  // Create a mapping for easier access to country configs
  const getCountryConfig = (countryName) => {
    return countries.find((c) => c.countryName === countryName)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'country') {
      // Auto-update tax type, tax rate, country code, and decimal places based on country selection
      const config = getCountryConfig(value)
      if (config) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          countryCode: config.countryCode,
          taxType: config.taxSystem,
          taxRate: config.taxRate,
          currency: config.currency,
          decimalPlaces: config.defaultDecimals || 2, // Auto-set decimal places from country config
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
        setFormData((prev) => ({
          ...prev,
          logoUrl: reader.result,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Basic client-side validation
    if (!formData.companyName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.country || !formData.countryCode) {
      setMessage('Please fill in all required fields marked with *')
      setLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const dataToSubmit = {
        ...formData,
        country: formData.countryCode,  // ✅ Send country CODE (AE) not name (UAE)
        taxRate: parseFloat(formData.taxRate) || 0,
      }

      // Use context's updateCompany method
      await updateCompany(dataToSubmit)
      
      // Update costing method if it changed
      if (formData.costingMethod) {
        switchCostingMethod(formData.costingMethod)
        // Also update backend configuration
        await updateCostingConfig({
          defaultCostingMethod: formData.costingMethod,
          description: `Default costing method for ${formData.companyName}`
        })
      }
      
      setMessage('Company information and costing method updated successfully!')
    } catch (error) {
      setMessage(`Error updating company information: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="space-y-1">
        {/* Logo Section */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Company Logo</h3>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs">No Logo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block mb-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                <span className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 transition font-medium text-sm">
                  <Upload size={16} />
                  Upload Logo
                </span>
              </label>
              <p className="text-xs text-gray-600">Max: 5MB, 200x200px</p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Registration Number
              </label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Tax ID
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Industry
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fiscal Year End (MM-DD)
              </label>
              <input
                type="text"
                name="fiscalYearEnd"
                value={formData.fiscalYearEnd}
                onChange={handleInputChange}
                placeholder="12-31"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Website
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="e.g., www.alarabcomputers.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Country Selection */}
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Country Selection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Operating Country *
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                required
                disabled={countriesLoading}
              >
                <option value="">Select a Country</option>
                {countries.map((country) => (
                  <option key={country.countryCode} value={country.countryName}>
                    {country.flagEmoji} {country.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                Changing country will automatically update tax and compliance requirements
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Country Code *
              </label>
              <input
                type="text"
                name="countryCode"
                value={formData.countryCode}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-100 font-semibold"
                readOnly
                required
              />
              <p className="text-xs text-gray-600 mt-2">Auto-populated based on country selection</p>
            </div>
          </div>
        </div>

        {/* Country-Specific Information */}
        <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-200">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">
            {getCountryConfig(formData.country)?.label} - Regulations & Tax Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            {/* Tax Type and Rate */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tax Type
              </label>
              <div className="px-2 py-1 bg-white border border-indigo-300 rounded-lg">
                <p className="text-sm font-bold text-indigo-900">{formData.taxType}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              <div className="px-2 py-1 bg-white border border-indigo-300 rounded-lg">
                <p className="text-sm font-bold text-indigo-900">{formData.taxRate}%</p>
              </div>
            </div>

            {/* Costing Method Selection */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Inventory Costing Method <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-600 mb-2">
                This method will be used for entire application inventory valuation
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['FIFO', 'LIFO', 'WAC'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, costingMethod: method }))}
                    className={`py-1 px-2 rounded-lg font-semibold text-sm transition-all border-2 ${
                      formData.costingMethod === method
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700">
                <p className="font-semibold mb-1">
                  {formData.costingMethod === 'FIFO' &&
                    '📦 FIFO (First In First Out) - First items purchased are first to be sold'}
                  {formData.costingMethod === 'LIFO' &&
                    '📦 LIFO (Last In First Out) - Last items purchased are first to be sold'}
                  {formData.costingMethod === 'WAC' &&
                    '📦 WAC (Weighted Average Cost) - Uses average cost of all available inventory'}
                </p>
              </div>
            </div>

            {/* Decimal Places Control */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Decimal Places Control <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Used for all financial calculations and display across the application
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4].map((decimals) => (
                  <button
                    key={decimals}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, decimalPlaces: decimals }))}
                    className={`py-2 px-2 rounded-lg font-semibold text-sm transition-all border-2 ${
                      formData.decimalPlaces === decimals
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {decimals}
                    <span className="block text-xs mt-0.5">
                      {decimals === 0 && '(1000)'}
                      {decimals === 1 && '(100.0)'}
                      {decimals === 2 && '(100.00)'}
                      {decimals === 3 && '(100.000)'}
                      {decimals === 4 && '(100.0000)'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-gray-700">
                <p className="font-semibold">
                  ✓ Current Selection: {formData.decimalPlaces} decimal places
                </p>
                <p className="text-xs mt-1 text-gray-600">
                  All prices, amounts, and calculations will display with {formData.decimalPlaces} decimal {'place' + (formData.decimalPlaces !== 1 ? 's' : '')}
                </p>
              </div>
            </div>
          </div>
          {/* Country-Specific Info */}
          {getCountryConfig(formData.country) && (
            <div className="bg-white rounded p-2 border border-indigo-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {getCountryConfig(formData.country)?.label} Requirements
              </h4>
              <ul className="text-xs text-gray-700 space-y-1">
                {getCountryConfig(formData.country)?.regulations?.map((reg, index) => (
                  <li key={index}>
                    ✓ <strong>{reg.title}:</strong> {reg.description}
                  </li>
                ))}
              </ul>
              {getCountryConfig(formData.country)?.complianceRequirements?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-indigo-100">
                  <p className="text-xs font-semibold text-gray-900 mb-2">Key Compliance Requirements:</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {getCountryConfig(formData.country)?.complianceRequirements?.map((req, index) => (
                      <li key={index}>
                        • <strong>{req.name}:</strong> {req.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Address Information */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Address Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.street || 'Street Address'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.city || 'City'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                State / Province
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.state || 'State / Province'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.postalCode || 'Postal Code'}
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">Tax Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tax Type
              </label>
              <div className="px-2 py-1 bg-white border border-yellow-300 rounded-lg">
                <p className="text-sm font-semibold text-yellow-900">{formData.taxType}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-600 mt-1">Editable for custom rates</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {getCountryConfig(formData.country)?.taxNumberLabel || 'Tax ID'} / Registration Number
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-sm border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.taxNumberLabel || 'Tax ID / Registration'}
              />
            </div>
          </div>
          <div className="mt-3 p-2 bg-white border border-yellow-300 rounded-lg">
            <p className="text-xs text-gray-600">Current Configuration:</p>
            <p className="text-sm font-bold text-yellow-900">
              {formData.taxType} at {formData.taxRate}% for {getCountryConfig(formData.country)?.label}
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-2 rounded-lg text-sm font-medium ${
              message.includes('successfully')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : message.includes('required') || message.includes('valid')
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            type="reset"
            className="px-4 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1 px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CompanyMaster


