import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const PermissionBuilder = ({ selectedPermissions, onPermissionsChange }) => {
  const [expandedModules, setExpandedModules] = useState({})

  // Detailed permission structure by module and action
  const permissionStructure = {
    'Sales Module': {
      icon: '📊',
      color: 'blue',
      submodules: {
        'Sales Order': {
          'View Sales Orders': 'SALES_ORDER_VIEW',
          'Create Sales Order': 'SALES_ORDER_CREATE',
          'Edit Sales Order': 'SALES_ORDER_EDIT',
          'Delete Sales Order': 'SALES_ORDER_DELETE',
          'View Sales Order History': 'SALES_ORDER_HISTORY',
        },
        'Sales Invoice': {
          'View Sales Invoices': 'SALES_INVOICE_VIEW',
          'Create Sales Invoice': 'SALES_INVOICE_CREATE',
          'Edit Sales Invoice': 'SALES_INVOICE_EDIT',
          'Delete Sales Invoice': 'SALES_INVOICE_DELETE',
          'View Invoice History': 'SALES_INVOICE_HISTORY',
          'Print Invoice': 'SALES_INVOICE_PRINT',
        },
        'Sales Return': {
          'View Sales Returns': 'SALES_RETURN_VIEW',
          'Create Sales Return': 'SALES_RETURN_CREATE',
          'Edit Sales Return': 'SALES_RETURN_EDIT',
          'Delete Sales Return': 'SALES_RETURN_DELETE',
          'View Return History': 'SALES_RETURN_HISTORY',
        },
        'Delivery Notes': {
          'View Delivery Notes': 'DELIVERY_NOTE_VIEW',
          'Create Delivery Note': 'DELIVERY_NOTE_CREATE',
          'Edit Delivery Note': 'DELIVERY_NOTE_EDIT',
          'Delete Delivery Note': 'DELIVERY_NOTE_DELETE',
        },
        'Customers': {
          'View Customers': 'CUSTOMER_VIEW',
          'Create Customer': 'CUSTOMER_CREATE',
          'Edit Customer': 'CUSTOMER_EDIT',
          'Delete Customer': 'CUSTOMER_DELETE',
        },
      },
    },
    'Inventory Module': {
      icon: '📦',
      color: 'green',
      submodules: {
        'Products': {
          'View Products': 'PRODUCT_VIEW',
          'Create Product': 'PRODUCT_CREATE',
          'Edit Product': 'PRODUCT_EDIT',
          'Delete Product': 'PRODUCT_DELETE',
          'View Product History': 'PRODUCT_HISTORY',
        },
        'Stock Management': {
          'View Stock': 'STOCK_VIEW',
          'Adjust Stock': 'STOCK_ADJUST',
          'GRN (Good Received)': 'GRN_MANAGE',
          'GRV (Good Returned)': 'GRV_MANAGE',
        },
        'Warehouse': {
          'View Warehouse': 'WAREHOUSE_VIEW',
          'Manage Warehouse': 'WAREHOUSE_MANAGE',
          'Create Warehouse': 'WAREHOUSE_CREATE',
        },
      },
    },
    'Accounts Module': {
      icon: '💰',
      color: 'purple',
      submodules: {
        'Chart of Accounts': {
          'View Chart': 'CHART_VIEW',
          'Create Account': 'ACCOUNT_CREATE',
          'Edit Account': 'ACCOUNT_EDIT',
          'Delete Account': 'ACCOUNT_DELETE',
        },
        'Journal Entries': {
          'View Journal': 'JOURNAL_VIEW',
          'Create Entry': 'JOURNAL_CREATE',
          'Edit Entry': 'JOURNAL_EDIT',
          'Delete Entry': 'JOURNAL_DELETE',
          'Post Entry': 'JOURNAL_POST',
        },
        'Payments': {
          'View Payments': 'PAYMENT_VIEW',
          'Create Payment': 'PAYMENT_CREATE',
          'Edit Payment': 'PAYMENT_EDIT',
          'Delete Payment': 'PAYMENT_DELETE',
        },
        'Receipts': {
          'View Receipts': 'RECEIPT_VIEW',
          'Create Receipt': 'RECEIPT_CREATE',
          'Edit Receipt': 'RECEIPT_EDIT',
          'Delete Receipt': 'RECEIPT_DELETE',
        },
      },
    },
    'Reports': {
      icon: '📈',
      color: 'orange',
      submodules: {
        'Sales Reports': {
          'Sales Summary': 'REPORT_SALES_SUMMARY',
          'Sales By Product': 'REPORT_SALES_PRODUCT',
          'Sales By Customer': 'REPORT_SALES_CUSTOMER',
          'Invoice Analysis': 'REPORT_SALES_INVOICE',
        },
        'Inventory Reports': {
          'Stock Summary': 'REPORT_STOCK_SUMMARY',
          'Low Stock Alert': 'REPORT_LOW_STOCK',
          'Movement Report': 'REPORT_MOVEMENT',
        },
        'Financial Reports': {
          'Balance Sheet': 'REPORT_BALANCE_SHEET',
          'Income Statement': 'REPORT_INCOME',
          'Trial Balance': 'REPORT_TRIAL_BALANCE',
          'Profit & Loss': 'REPORT_PNL',
        },
      },
    },
    'User & Role Management': {
      icon: '👥',
      color: 'red',
      submodules: {
        'Users': {
          'View Users': 'USER_VIEW',
          'Create User': 'USER_CREATE',
          'Edit User': 'USER_EDIT',
          'Delete User': 'USER_DELETE',
          'Reset Password': 'USER_RESET_PASSWORD',
        },
        'Roles': {
          'View Roles': 'ROLE_VIEW',
          'Create Role': 'ROLE_CREATE',
          'Edit Role': 'ROLE_EDIT',
          'Delete Role': 'ROLE_DELETE',
        },
        'Permissions': {
          'Manage Permissions': 'PERMISSION_MANAGE',
          'View Activity Logs': 'ACTIVITY_LOG_VIEW',
        },
      },
    },
    'Settings': {
      icon: '⚙️',
      color: 'gray',
      submodules: {
        'Company Settings': {
          'View Company Info': 'COMPANY_VIEW',
          'Edit Company Info': 'COMPANY_EDIT',
          'Manage License': 'LICENSE_MANAGE',
        },
        'General Settings': {
          'System Configuration': 'SYSTEM_CONFIG',
          'Email Settings': 'EMAIL_CONFIG',
          'Backup Restore': 'BACKUP_RESTORE',
        },
      },
    },
  }

  const toggleModule = (module) => {
    setExpandedModules((prev) => ({
      ...prev,
      [module]: !prev[module],
    }))
  }

  const togglePermission = (permissionId) => {
    const newPermissions = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter((p) => p !== permissionId)
      : [...selectedPermissions, permissionId]
    onPermissionsChange(newPermissions)
  }

  const toggleModuleAll = (module, submodules) => {
    const modulePermissions = Object.values(submodules)
      .flatMap((sub) => Object.values(sub))

    const allSelected = modulePermissions.every((p) => selectedPermissions.includes(p))

    if (allSelected) {
      const newPermissions = selectedPermissions.filter((p) => !modulePermissions.includes(p))
      onPermissionsChange(newPermissions)
    } else {
      const newPermissions = [...new Set([...selectedPermissions, ...modulePermissions])]
      onPermissionsChange(newPermissions)
    }
  }

  return (
    <div className="space-y-2">
      {Object.entries(permissionStructure).map(([module, moduleData]) => {
        const isExpanded = expandedModules[module]
        const modulePermissions = Object.values(moduleData.submodules)
          .flatMap((sub) => Object.values(sub))
        const allSelected = modulePermissions.every((p) => selectedPermissions.includes(p))

        return (
          <div key={module} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Module Header */}
            <button
              type="button"
              onClick={() => toggleModule(module)}
              className="w-full bg-gray-50 hover:bg-gray-100 transition p-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{moduleData.icon}</span>
                <h5 className="text-sm font-semibold text-gray-900">{module}</h5>
                <span className="text-xs text-gray-600">
                  ({selectedPermissions.filter((p) => modulePermissions.includes(p)).length}/{modulePermissions.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleModuleAll(module, moduleData.submodules)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300"
                />
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>

            {/* Module Content */}
            {isExpanded && (
              <div className="bg-white border-t border-gray-200 p-2 space-y-2">
                {Object.entries(moduleData.submodules).map(([submodule, permissions]) => (
                  <div key={submodule} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <h6 className="text-xs font-semibold text-gray-900 mb-1.5 px-1">{submodule}</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 px-1">
                      {Object.entries(permissions).map(([label, permissionId]) => (
                        <label
                          key={permissionId}
                          className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permissionId)}
                            onChange={() => togglePermission(permissionId)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-xs text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PermissionBuilder


