import React, { useState, useEffect } from 'react'
import { Eye, Filter, Download } from 'lucide-react'

const ActivityLog = () => {
  const [activities, setActivities] = useState([
    {
      id: 1,
      username: 'admin@alarab.com',
      action: 'LOGIN',
      module: 'Users',
      resource: 'Authentication',
      description: 'User logged in successfully',
      permission: 'LOGIN_ACCESS',
      timestamp: '2024-03-03 10:30:00',
      status: 'success',
      ipAddress: '192.168.1.100',
    },
    {
      id: 2,
      username: 'sales@alarab.com',
      action: 'CREATE',
      module: 'Sales',
      resource: 'Sales Invoice #INV001',
      description: 'Created new sales invoice',
      permission: 'CREATE_SALES_INVOICE',
      timestamp: '2024-03-03 10:15:00',
      status: 'success',
      ipAddress: '192.168.1.101',
    },
    {
      id: 3,
      username: 'inventory@alarab.com',
      action: 'UPDATE',
      module: 'Inventory',
      resource: 'Product #PROD123',
      description: 'Updated product stock quantity',
      permission: 'MANAGE_PRODUCTS',
      timestamp: '2024-03-03 09:45:00',
      status: 'success',
      ipAddress: '192.168.1.102',
    },
    {
      id: 4,
      username: 'accounts@alarab.com',
      action: 'DELETE',
      module: 'Accounts',
      resource: 'Journal Entry #JE001',
      description: 'Attempted to delete journal entry',
      permission: 'MANAGE_CHART_ACCOUNTS',
      timestamp: '2024-03-02 05:20:00',
      status: 'failed',
      ipAddress: '192.168.1.103',
    },
  ])

  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    status: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)

  const modules = ['Users', 'Roles', 'Sales', 'Inventory', 'Accounts', 'Reports', 'Settings']
  const actions = ['LOGIN', 'LOGOUT', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT']
  const statuses = ['success', 'failed', 'pending']

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const filteredActivities = activities.filter((activity) => {
    return (
      (filters.module === '' || activity.module === filters.module) &&
      (filters.action === '' || activity.action === filters.action) &&
      (filters.status === '' || activity.status === filters.status)
    )
  })

  const handleExport = () => {
    const csv = [
      ['Username', 'Action', 'Module', 'Resource', 'Permission', 'Status', 'IP Address', 'Timestamp'],
      ...filteredActivities.map((a) => [
        a.username,
        a.action,
        a.module,
        a.resource,
        a.permission,
        a.status,
        a.ipAddress,
        a.timestamp,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-2">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">Activity Log</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            <Filter size={16} />
            Filter
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Module</label>
              <select
                name="module"
                value={filters.module}
                onChange={handleFilterChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Modules</option>
                {modules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Actions</option>
                {actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                {statuses.map((stat) => (
                  <option key={stat} value={stat}>
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Activity Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Timestamp</th>
              <th className="px-2 py-1 text-left font-medium text-gray-700">User</th>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Action</th>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Module</th>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Resource</th>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Permission</th>
              <th className="px-2 py-1 text-left font-medium text-gray-700">Status</th>
              <th className="px-2 py-1 text-center font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.map((activity) => (
              <tr key={activity.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-2 py-1 text-gray-900">{activity.timestamp}</td>
                <td className="px-2 py-1 text-gray-700">{activity.username}</td>
                <td className="px-2 py-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      activity.action === 'LOGIN'
                        ? 'bg-green-100 text-green-700'
                        : activity.action === 'DELETE'
                        ? 'bg-red-100 text-red-700'
                        : activity.action === 'UPDATE'
                        ? 'bg-yellow-100 text-yellow-700'
                        : activity.action === 'CREATE'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {activity.action}
                  </span>
                </td>
                <td className="px-2 py-1 text-gray-700">{activity.module}</td>
                <td className="px-2 py-1 text-gray-700">{activity.resource}</td>
                <td className="px-2 py-1">
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    {activity.permission}
                  </span>
                </td>
                <td className="px-2 py-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      activity.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : activity.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {activity.status}
                  </span>
                </td>
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => setSelectedActivity(activity)}
                    className="p-0.5 hover:bg-blue-50 rounded transition"
                    title="View Details"
                  >
                    <Eye size={14} className="text-blue-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-3 max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-sm font-bold text-gray-900 mb-2">Activity Details</h4>

            <div className="space-y-2 text-xs">
              <div>
                <p className="font-medium text-gray-700">Timestamp:</p>
                <p className="text-gray-600">{selectedActivity.timestamp}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">User:</p>
                <p className="text-gray-600">{selectedActivity.username}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Action:</p>
                <p className="text-gray-600">{selectedActivity.action}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Module:</p>
                <p className="text-gray-600">{selectedActivity.module}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Resource:</p>
                <p className="text-gray-600">{selectedActivity.resource}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Description:</p>
                <p className="text-gray-600">{selectedActivity.description}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Permission:</p>
                <p className="text-gray-600">{selectedActivity.permission}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Status:</p>
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                    selectedActivity.status === 'success'
                      ? 'bg-green-100 text-green-700'
                      : selectedActivity.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {selectedActivity.status}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-700">IP Address:</p>
                <p className="text-gray-600">{selectedActivity.ipAddress}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedActivity(null)}
              className="mt-3 w-full px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <p className="text-xs text-blue-700 font-medium">Total Activities</p>
          <p className="text-lg font-bold text-blue-900">{filteredActivities.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
          <p className="text-xs text-green-700 font-medium">Successful</p>
          <p className="text-lg font-bold text-green-900">{filteredActivities.filter((a) => a.status === 'success').length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
          <p className="text-xs text-red-700 font-medium">Failed</p>
          <p className="text-lg font-bold text-red-900">{filteredActivities.filter((a) => a.status === 'failed').length}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
          <p className="text-xs text-purple-700 font-medium">Logins</p>
          <p className="text-lg font-bold text-purple-900">{filteredActivities.filter((a) => a.action === 'LOGIN').length}</p>
        </div>
      </div>
    </div>
  )
}

export default ActivityLog


