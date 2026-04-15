import React, { useState, useEffect } from 'react'
import { Save, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react'
import { API_URL } from '../../../config/config'

const LicenseManagement = () => {
  const [licenseData, setLicenseData] = useState({
    licenseKey: 'NEXIS-PRO-2024-ABC123XYZ789',
    licensePlan: 'Professional',
    companyName: 'Al Arab Computers LLC',
    issuedDate: '2024-01-15',
    expiryDate: '2025-01-15',
    maxUsers: 50,
    maxProducts: 10000,
    maxInvoices: 'Unlimited',
    maxReports: 'Unlimited',
    features: {
      invoicing: true,
      inventory: true,
      accounting: true,
      sales: true,
      multiCurrency: true,
      advancedReports: true,
      customization: true,
      support: true,
    },
  })

  const [newLicense, setNewLicense] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyLicense = () => {
    navigator.clipboard.writeText(licenseData.licenseKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleValidateLicense = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/settings/license/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: newLicense }),
      })

      if (response.ok) {
        const data = await response.json()
        setLicenseData(data.data || data)
        setNewLicense('')
        setMessage('License validated successfully!')
      } else {
        setMessage('Invalid license key')
      }
    } catch (error) {
      setMessage('Error validating license')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDaysRemaining = () => {
    const expiry = new Date(licenseData.expiryDate)
    const today = new Date()
    const diff = expiry - today
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const daysRemaining = calculateDaysRemaining()
  const isExpired = daysRemaining < 0
  const isExpiringSoon = daysRemaining < 30 && daysRemaining >= 0

  return (
    <div className="space-y-2">
      {/* License Status */}
      <div className={`rounded-lg p-3 border-2 ${
        isExpired
          ? 'bg-red-50 border-red-300'
          : isExpiringSoon
          ? 'bg-yellow-50 border-yellow-300'
          : 'bg-green-50 border-green-300'
      }`}>
        <div className="flex items-start gap-2">
          {isExpired ? (
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          ) : (
            <CheckCircle className={`flex-shrink-0 ${isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`} size={20} />
          )}
          <div className="flex-1">
            <h3 className={`text-base font-semibold ${
              isExpired ? 'text-red-900' : isExpiringSoon ? 'text-yellow-900' : 'text-green-900'
            }`}>
              {isExpired ? 'License Expired' : isExpiringSoon ? 'License Expiring Soon' : 'License Active'}
            </h3>
            <p className={`text-xs mt-0 ${
              isExpired ? 'text-red-700' : isExpiringSoon ? 'text-yellow-700' : 'text-green-700'
            }`}>
              {isExpired
                ? 'Your license has expired. Please renew to continue using the system.'
                : isExpiringSoon
                ? `Your license expires in ${daysRemaining} days. Please renew soon.`
                : `Your license is active and valid for ${daysRemaining} days.`}
            </p>
          </div>
        </div>
      </div>

      {/* Current License Details */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Current License</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* License Key */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              License Key
            </label>
            <div className="flex items-center gap-1">
              <div className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded-lg font-mono text-xs text-gray-600 select-all">
                {licenseData.licenseKey}
              </div>
              <button
                onClick={handleCopyLicense}
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 text-sm ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              License Plan
            </label>
            <p className="text-sm text-gray-900 font-semibold">{licenseData.licensePlan}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Issued Date
            </label>
            <p className="text-sm text-gray-900">{new Date(licenseData.issuedDate).toLocaleDateString()}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <p className={`font-semibold text-sm ${isExpired || isExpiringSoon ? 'text-red-600' : 'text-green-600'}`}>
              {new Date(licenseData.expiryDate).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Users
            </label>
            <p className="text-sm text-gray-900">{licenseData.maxUsers}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Products
            </label>
            <p className="text-sm text-gray-900">{licenseData.maxProducts.toLocaleString()}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Invoices
            </label>
            <p className="text-sm text-gray-900">{licenseData.maxInvoices}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Reports
            </label>
            <p className="text-sm text-gray-900">{licenseData.maxReports}</p>
          </div>
        </div>
      </div>

      {/* Enabled Features */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Enabled Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(licenseData.features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
              <div className={`w-5 h-5 rounded flex items-center justify-center ${
                enabled ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {enabled && <Check size={16} className="text-green-600" />}
              </div>
              <span className={enabled ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                {feature.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activate New License */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Activate New License</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Enter License Key
            </label>
            <input
              type="text"
              value={newLicense}
              onChange={(e) => setNewLicense(e.target.value)}
              placeholder="NEXIS-PRO-XXXX-XXXXX..."
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {message && (
            <div
              className={`p-2 rounded-lg text-sm ${
                message.includes('successfully')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <button
            onClick={handleValidateLicense}
            disabled={!newLicense || loading}
            className="w-full px-4 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating...' : 'Activate License'}
          </button>
        </div>
      </div>

      {/* Support Information */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <h3 className="text-base font-semibold text-blue-900 mb-1">Need Help?</h3>
        <p className="text-blue-800 text-xs mb-2">
          For license renewal, upgrades, or technical support, please contact our support team.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="mailto:support@alarabcomputersllc.com"
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Email Support
          </a>
          <a
            href="tel:+971554507149"
            className="px-3 py-1 text-sm bg-white border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
          >
            Call Support
          </a>
        </div>
      </div>
    </div>
  )
}

export default LicenseManagement


