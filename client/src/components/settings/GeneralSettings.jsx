import React, { useState } from 'react'
import { Users, Shield, Clock, Store, Ruler, Upload } from 'lucide-react'
import UserManagement from './general/UserManagement'
import RoleManagement from './general/RoleManagement'
import ActivityLog from './general/ActivityLog'
import StoreSettings from './general/StoreSettings'
import UnitTypeManagement from './general/UnitTypeManagement'
import BulkProductUpload from './general/BulkProductUpload'

const GeneralSettings = () => {
  const [activeTab, setActiveTab] = useState('users')

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'roles', label: 'Role Management', icon: Shield },
    { id: 'store', label: 'Store Settings', icon: Store },
    { id: 'units', label: 'Unit Types', icon: Ruler },
    { id: 'bulk-products', label: 'Bulk Product Upload', icon: Upload },
    { id: 'activity', label: 'Activity Log', icon: Clock },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />
      case 'roles':
        return <RoleManagement />
      case 'store':
        return <StoreSettings />
      case 'units':
        return <UnitTypeManagement />
      case 'bulk-products':
        return <BulkProductUpload />
      case 'activity':
        return <ActivityLog />
      default:
        return <UserManagement />
    }
  }

  return (
    <div className="p-2 space-y-2">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-lg font-bold text-gray-900">General Settings</h1>
        <p className="text-gray-600 text-xs mt-0">Manage users, roles, store settings, unit types, bulk product uploads and permissions</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
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

export default GeneralSettings


