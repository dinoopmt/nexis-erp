import React, { useState, useEffect } from 'react'
import { Save, Upload, X, Building, Plus, Trash2, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import useTaxMaster from '../../../hooks/useTaxMaster'
import { useCostingMaster } from '../../../hooks/useCostingMaster'
import { API_URL } from '../../../config/config'
import FinancialYearManager from './financialYear/FinancialYearManager';

const CompanyMaster = () => {
  const { company, taxMaster, loading: contextLoading, updateCompany } = useTaxMaster()
  const { costingMethod, switchCostingMethod, updateCostingConfig } = useCostingMaster()

  const [formData, setFormData] = useState({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    countryCode: '',
    currency: '',
    taxType: '',
    taxRate: 0,
    costingMethod: 'FIFO',
    decimalPlaces: 2,
    logoUrl: '',
    industry: '',
    fiscalYearEnd: '',
  })

  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [isDataLoaded, setIsDataLoaded] = useState(false)



  // Load countries on mount
  useEffect(() => {
    fetchCountries()
  }, [])

  // Sync company data from context when available
  useEffect(() => {
    // Only load data when: company exists, countries are loaded, and data not yet loaded
    if (company && Object.keys(company).length > 0 && !isDataLoaded && !countriesLoading && countries.length > 0) {
      // Find country name from countries list based on country code
      const countryCode = company.country || company.countryCode
      const countryObj = countries.find(c => c.countryCode === countryCode)
      const countryName = countryObj?.countryName || company.countryName || company.country || ''
      
      // Populate form with company data
      const dataToLoad = {
        companyName: company.companyName || '',
        registrationNumber: company.registrationNumber || '',
        taxId: company.taxId || '',
        email: company.email || '',
        phone: company.phone || '',
        website: company.website || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        postalCode: company.postalCode || '',
        country: countryName, // Use full country name for dropdown
        countryCode: countryCode, // Store country code separately
        currency: company.currency || '',
        taxType: company.taxSystem || company.taxType || '',
        taxRate: company.taxRate || 0,
        industry: company.industry || '',
        fiscalYearEnd: company.fiscalYearEnd || '',
        logoUrl: company.logoUrl || ''
      }

      setFormData((prev) => ({
        ...prev,
        ...dataToLoad,
      }))

      if (company.logoUrl) {
        setLogoPreview(company.logoUrl)
      }

      setIsDataLoaded(true)
    }
  }, [company, countries, countriesLoading, isDataLoaded])

  // Sync costing method when available
  useEffect(() => {
    if (costingMethod) {
      setFormData((prev) => ({
        ...prev,
        costingMethod,
      }))
    }
  }, [costingMethod])



  const fetchCountries = async () => {
    try {
      setCountriesLoading(true)
      const response = await fetch(`${API_URL}/countries`)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data) {
        setCountries(data.data)
      } else if (Array.isArray(data)) {
        // Handle case where response is directly an array
        setCountries(data)
      }
    } catch (error) {
      console.error('Error fetching countries:', error)
      toast.error(`Failed to load country configurations: ${error.message}`, {
        duration: 4000,
        position: 'top-right'
      })
    } finally {
      setCountriesLoading(false)
    }
  }

  // Fetch countries on component mount
  useEffect(() => {
    fetchCountries()
  }, [])

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

    // Basic client-side validation
    if (!formData.companyName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.country || !formData.countryCode) {
      toast.error('Please fill in all required fields marked with *', {
        duration: 4000,
        position: 'top-right'
      })
      setLoading(false)
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address', {
        duration: 4000,
        position: 'top-right'
      })
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
      
      toast.success('Company information and costing method updated successfully!', {
        duration: 4000,
        position: 'top-right'
      })
    } catch (error) {
      toast.error(`Error updating company information: ${error.message}`, {
        duration: 4000,
        position: 'top-right'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <Building size={24} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Company Master</h1>
        </div>
        <p className="text-sm text-gray-600">Manage your company's core information, contact details, location, and operational settings</p>
      </div>

      {/* Loading State */}
      {contextLoading && !isDataLoaded && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600">Loading company details...</p>
          </div>
        </div>
      )}

      {/* Form - Show when data is loaded or after timeout */}
      {(isDataLoaded || !contextLoading) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Section */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-900">Company Logo</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-xs text-center">Logo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block mb-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition font-semibold text-sm">
                  <Upload size={18} />
                  Upload Logo
                </span>
              </label>
              <p className="text-xs text-gray-600">PNG, JPG up to 5MB • Recommended: 200x200px</p>
            </div>
          </div>
        </div>

        {/* Section 1: Company Identification */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-900">Company Identification</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Legal company name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Registration Number
              </label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CR or License number"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tax ID / VAT Number
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tax identification"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Industry Type
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Retail, Technology"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Fiscal Year End<span className="text-gray-500 text-xs font-normal ml-1">(MM-DD format)</span>
              </label>
              <input
                type="text"
                name="fiscalYearEnd"
                value={formData.fiscalYearEnd}
                onChange={handleInputChange}
                placeholder="12-31"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="w-1 h-6 bg-green-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-900">Contact Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="company@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="+971 (55) 450-7149"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://www.example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Address Information */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-900">Address Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.street || 'Street address or building name'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.city || 'City or emirate'}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                State / Province / Region
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.state || 'State or region'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Postal Code / ZIP
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={getCountryConfig(formData.country)?.addressPlaceholder?.postalCode || 'Postal code'}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Location, Compliance & Tax */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="w-1 h-6 bg-amber-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-900">Location, Compliance & Tax</h2>
          </div>

          {/* Country Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 pb-5 border-b border-gray-100">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Operating Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
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
                Changing country will automatically update tax type, rate, currency and decimal settings
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Country Code
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">{formData.countryCode || '—'}</p>
              </div>
            </div>
          </div>

          {/* Tax Type, Rate & Tax ID Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 pb-5 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tax Type
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">{formData.taxType}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Tax Registration
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="VAT/Registration number"
              />
            </div>
          </div>

          {/* Country Requirements Summary */}
          {getCountryConfig(formData.country) && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 mb-2">
                {getCountryConfig(formData.country)?.label} Requirements
              </p>
              <ul className="text-xs text-gray-700 space-y-1">
                {getCountryConfig(formData.country)?.regulations?.map((reg, index) => (
                  <li key={index}>✓ <strong>{reg.title}:</strong> {reg.description}</li>
                ))}
              </ul>
              {getCountryConfig(formData.country)?.complianceRequirements?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs font-semibold text-amber-900 mb-2">Compliance Requirements:</p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {getCountryConfig(formData.country)?.complianceRequirements?.map((req, index) => (
                      <li key={index}>• <strong>{req.name}:</strong> {req.description}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Operational Settings */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
            <h2 className="text-sm font-bold text-gray-900">Operational Settings</h2>
          </div>

          {/* Costing Method */}
          <div className="mb-5 pb-5 border-b border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-2.5">
              Inventory Costing Method <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">
              This method applies to all inventory valuation across the application
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {['FIFO', 'LIFO', 'WAC'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, costingMethod: method }))}
                  className={`py-2 px-2 rounded-lg font-semibold text-sm transition-all border-2 ${
                    formData.costingMethod === method
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-gray-700">
              <p className="font-semibold text-indigo-900 mb-1">
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
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2.5">
              Decimal Places Control <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Controls decimal precision for all financial calculations and display
            </p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[0, 1, 2, 3, 4].map((decimals) => (
                <button
                  key={decimals}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, decimalPlaces: decimals }))}
                  className={`py-2 px-2 rounded-lg font-semibold text-sm transition-all border-2 text-center ${
                    formData.decimalPlaces === decimals
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <span className="block text-sm">{decimals}</span>
                  <span className="block text-xs mt-0.5 font-normal">
                    {decimals === 0 && '1000'}
                    {decimals === 1 && '100.0'}
                    {decimals === 2 && '100.00'}
                    {decimals === 3 && '100.000'}
                    {decimals === 4 && '100.0000'}
                  </span>
                </button>
              ))}
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-gray-700">
              <p className="font-semibold text-green-900 mb-1">
                ✓ {formData.decimalPlaces} decimal place{formData.decimalPlaces !== 1 ? 's' : ''} selected
              </p>
              <p className="text-gray-600">
                Sample: {(1000.5555).toFixed(formData.decimalPlaces)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="reset"
            className="px-5 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      )}

      {/* Section 6: Financial Year Management - Outside form to avoid nested forms */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <FinancialYearManager />
      </div>

    </div>
  )
}

export default CompanyMaster