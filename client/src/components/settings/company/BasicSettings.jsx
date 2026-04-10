import React, { useState, useEffect } from 'react'
import { Save, ToggleRight, ToggleLeft } from 'lucide-react'
import { showToast } from '../../../components/shared/AnimatedCenteredToast.jsx'

const BasicSettings = () => {
  const [settings, setSettings] = useState({
    // System Settings
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '24',
    currency: 'AED',
    defaultLanguage: 'English',
    timezone: 'Asia/Dubai',
    
    // Features
    enableMultiCurrency: true,
    enableMultipleWarehouses: true,
    enableDiscounts: true,
    enableTaxes: true,
    enableNegativeStock: false,
    
    // Email Settings
    emailProvider: 'smtp',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: 'your-email@gmail.com',
    smtpPassword: '••••••••••',
    smtpFromEmail: 'noreply@alarabcomputersllc.com',
    
    // Invoice Settings
    invoicePrefix: 'INV',
    invoiceStartNumber: 1000,
    enableInvoiceSignature: true,
    enableInvoiceTerms: true,
    
    // Backup Settings
    enableAutoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    
    // Localization
    companyNameDisplay: true,
    showTaxId: true,
    showRegistrationNumber: true,
  })

  const [loading, setLoading] = useState(false)

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/v1/settings/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        showToast('success', 'Settings updated successfully!')
      } else {
        showToast('error', 'Error updating settings')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const ToggleSetting = ({ label, description, value, onChange }) => (
    <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
      <div>
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <button
        onClick={onChange}
        className="flex-shrink-0"
      >
        {value ? (
          <ToggleRight size={20} className="text-green-600" />
        ) : (
          <ToggleLeft size={20} className="text-gray-400" />
        )}
      </button>
    </div>
  )

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* STICKY HEADER */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Basic Store Settings</h2>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-2">
        {/* System Settings */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">System Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                name="dateFormat"
                value={settings.dateFormat}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>DD-MM-YYYY</option>
                <option>MM-DD-YYYY</option>
                <option>YYYY-MM-DD</option>
                <option>DD/MM/YYYY</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time Format
              </label>
              <select
                name="timeFormat"
                value={settings.timeFormat}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="24">24-Hour</option>
                <option value="12">12-Hour (AM/PM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Default Currency
              </label>
              <select
                name="currency"
                value={settings.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>AED</option>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>INR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>Asia/Dubai</option>
                <option>Asia/Kolkata</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Default Language
              </label>
              <select
                name="defaultLanguage"
                value={settings.defaultLanguage}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>English</option>
                <option>Arabic</option>
                <option>Urdu</option>
              </select>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Features</h3>
          <div className="space-y-2">
            <ToggleSetting
              label="Multi-Currency Support"
              description="Enable multiple currency handling"
              value={settings.enableMultiCurrency}
              onChange={() => handleToggle('enableMultiCurrency')}
            />
            <ToggleSetting
              label="Multiple Warehouses"
              description="Manage inventory across multiple locations"
              value={settings.enableMultipleWarehouses}
              onChange={() => handleToggle('enableMultipleWarehouses')}
            />
            <ToggleSetting
              label="Discounts"
              description="Allow discounts on sales transactions"
              value={settings.enableDiscounts}
              onChange={() => handleToggle('enableDiscounts')}
            />
            <ToggleSetting
              label="Taxes"
              description="Calculate and apply taxes automatically"
              value={settings.enableTaxes}
              onChange={() => handleToggle('enableTaxes')}
            />
            <ToggleSetting
              label="Allow Negative Stock"
              description="Allow sales even when stock is insufficient"
              value={settings.enableNegativeStock}
              onChange={() => handleToggle('enableNegativeStock')}
            />
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Invoice Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                name="invoicePrefix"
                value={settings.invoicePrefix}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Starting Invoice Number
              </label>
              <input
                type="number"
                name="invoiceStartNumber"
                value={settings.invoiceStartNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <ToggleSetting
              label="Invoice Signature"
              description="Require signature on invoices"
              value={settings.enableInvoiceSignature}
              onChange={() => handleToggle('enableInvoiceSignature')}
            />
            <ToggleSetting
              label="Invoice Terms & Conditions"
              description="Display terms and conditions on invoices"
              value={settings.enableInvoiceTerms}
              onChange={() => handleToggle('enableInvoiceTerms')}
            />
          </div>
        </div>

        {/* Backup Settings */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Backup Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <ToggleSetting
                label="Automatic Backups"
                description="Automatically backup database at scheduled intervals"
                value={settings.enableAutoBackup}
                onChange={() => handleToggle('enableAutoBackup')}
              />
            </div>

            {settings.enableAutoBackup && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Backup Frequency
                  </label>
                  <select
                    name="backupFrequency"
                    value={settings.backupFrequency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option>hourly</option>
                    <option>daily</option>
                    <option>weekly</option>
                    <option>monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Backup Time (24-hour)
                  </label>
                  <input
                    type="time"
                    name="backupTime"
                    value={settings.backupTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Localization Settings */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Localization</h3>
          <div className="space-y-2">
            <ToggleSetting
              label="Show Company Name"
              description="Display company name on printouts"
              value={settings.companyNameDisplay}
              onChange={() => handleToggle('companyNameDisplay')}
            />
            <ToggleSetting
              label="Show Tax ID"
              description="Display tax ID on documents"
              value={settings.showTaxId}
              onChange={() => handleToggle('showTaxId')}
            />
            <ToggleSetting
              label="Show Registration Number"
              description="Display registration number on documents"
              value={settings.showRegistrationNumber}
              onChange={() => handleToggle('showRegistrationNumber')}
            />
          </div>
        </div>

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
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}

export default BasicSettings


