import React from 'react';
import { X } from 'lucide-react';
import { STATUS_CONFIG } from './constants';

const FinancialYearFormModal = ({
  show,
  onClose,
  onSubmit,
  formData,
  onFormChange,
  loading,
  editingId,
  isLocked,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            {editingId ? 'Edit Financial Year' : 'Create Financial Year'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Status Badge (Edit Mode) */}
          {editingId && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-2">Status</p>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${STATUS_CONFIG[formData.status]?.badge || 'bg-gray-100 text-gray-800'}`}>
                {STATUS_CONFIG[formData.status]?.icon} {STATUS_CONFIG[formData.status]?.label || formData.status}
              </span>
            </div>
          )}

          {/* Year Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Financial Year Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., FY2025-26"
              value={formData.yearCode}
              onChange={(e) => onFormChange('yearCode', e.target.value.toUpperCase())}
              disabled={isLocked}
              className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Year Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Financial Year Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Year 2025-26"
              value={formData.yearName}
              onChange={(e) => onFormChange('yearName', e.target.value)}
              disabled={isLocked}
              className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => onFormChange('startDate', e.target.value)}
              disabled={isLocked}
              className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => onFormChange('endDate', e.target.value)}
              disabled={isLocked}
              className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Allow Posting */}
          {editingId && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="allowPosting"
                checked={formData.allowPosting}
                onChange={(e) => onFormChange('allowPosting', e.target.checked)}
                disabled={isLocked}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="allowPosting" className="text-xs font-medium text-gray-700 cursor-pointer">
                Allow Posting in this Year
              </label>
            </div>
          )}

          {/* Set as Current (Create Mode) */}
          {!editingId && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isCurrent"
                checked={formData.isCurrent}
                onChange={(e) => onFormChange('isCurrent', e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="isCurrent" className="text-xs font-medium text-gray-700 cursor-pointer">
                Set as Current Financial Year
              </label>
            </div>
          )}

          {/* Locked Warning */}
          {isLocked && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 font-medium">
                🔒 This financial year is locked and cannot be edited. Contact administrator to unlock.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isLocked}
              className="flex-1 px-4 py-2 text-sm font-medium bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialYearFormModal;
