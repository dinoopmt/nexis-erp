import React from 'react';
import { User, Clock } from 'lucide-react';

/**
 * HistoryTab Component
 * Displays product history, activity log, and audit trail
 */
const HistoryTab = ({ product }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-3 p-4">
      {/* Audit Trail Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Clock size={16} />
          Audit Trail
        </h3>
        
        <div className="space-y-3">
          {/* Created Section */}
          <div className="flex items-start gap-3 pb-3 border-b border-blue-100">
            <User size={16} className="text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-600">Created</p>
              <p className="text-xs text-gray-500">
                By: <span className="font-semibold text-gray-900">{product?.createdBy || 'System'}</span>
              </p>
              {product?.createdate && (
                <p className="text-xs text-gray-500 mt-1">
                  📅 {formatDate(product.createdate)}
                </p>
              )}
            </div>
          </div>

          {/* Last Updated Section */}
          {product?.updatedBy && (
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600">Last Updated</p>
                <p className="text-xs text-gray-500">
                  By: <span className="font-semibold text-gray-900">{product.updatedBy}</span>
                </p>
                {product?.updateDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    📅 {formatDate(product.updateDate)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Log Section - Placeholder for future enhancements */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Activity Log</h3>
        <p className="text-gray-500 text-xs">
          Detailed activity log coming soon
        </p>
      </div>
    </div>
  );
};

export default HistoryTab;


