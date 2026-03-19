import React, { useState, useEffect } from 'react'
import { Building, Lock, Settings, Barcode, AlertCircle, Building2 } from 'lucide-react'
import { useTaxMaster } from '../../hooks/useTaxMaster'
import CompanyMaster from './company/CompanyMaster'
import LicenseManagement from './company/LicenseManagement'
import BasicSettings from './company/BasicSettings'
import HSNManagement from './company/HSNManagement'
import OrganizationManagement from './company/OrganizationManagement'

const CompanySettings = () => {
  const { company } = useTaxMaster()
  const [activeTab, setActiveTab] = useState('company')

  // India is the only country that currently supports HSN (GST based)
  const isIndiaCompany = company?.countryCode === 'IN'

  const baseTabs = [
    { id: 'company', label: 'Company Master', icon: Building, enabled: true },
    { id: 'license', label: 'License Management', icon: Lock, enabled: true },
    { id: 'basic', label: 'Basic Settings', icon: Settings, enabled: true },
    { 
      id: 'organization', 
      label: 'Branches & Locations', 
      icon: Building2, 
      enabled: true,
      tooltip: 'Manage head offices, regional offices, branches, and stores'
    },
    { 
      id: 'hsn', 
      label: 'HSN Management', 
      icon: Barcode, 
      enabled: isIndiaCompany,
      tooltip: isIndiaCompany ? 'Manage HSN codes' : 'HSN Management is only available for India companies (GST based)'
    },
  ]

  const tabs = baseTabs

  // Reset to company tab if active tab becomes disabled
  useEffect(() => {
    if (activeTab === 'hsn' && !isIndiaCompany) {
      setActiveTab('company')
    }
  }, [isIndiaCompany, activeTab])

  const renderContent = () => {
    switch (activeTab) {
      case 'company':
        return <CompanyMaster />
      case 'license':
        return <LicenseManagement />
      case 'basic':
        return <BasicSettings />
      case 'organization':
        return <OrganizationManagement />
      case 'hsn':
        return <HSNManagement />
      default:
        return <CompanyMaster />
    }
  }

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-xs mt-0">Manage company information, licensing, and system settings</p>
      </div>

      {/* Warning: HSN not available for non-India companies */}
      {!isIndiaCompany && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs">
          <AlertCircle size={16} />
          <span><strong>Note:</strong> HSN Management is only available for India-based companies. Your current company is in <strong>{company?.countryName || 'Not set'}</strong>.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isDisabled = !tab.enabled
            
            return (
              <div key={tab.id} className="relative group">
                <button
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  title={tab.tooltip}
                  className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id && !isDisabled
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  } ${
                    isDisabled 
                      ? 'opacity-50 cursor-not-allowed text-gray-400' 
                      : 'cursor-pointer'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {isDisabled && tab.id === 'hsn' && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      India only
                    </span>
                  )}
                </button>
                
                {/* Tooltip for disabled tab */}
                {isDisabled && (
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                    {tab.tooltip}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-md p-3">
        {renderContent()}
      </div>
    </div>
  )
}

export default CompanySettings


