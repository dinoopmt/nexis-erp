import React from 'react';
import { Edit, Lock, Unlock, Check, X } from 'lucide-react';
import { FY_VIEW_MODES, STATUS_CONFIG } from './constants';

const FinancialYearView = ({
  financialYears,
  viewMode,
  searchTerm,
  onEdit,
  onSetCurrent,
  onDelete,
  onClose,
  onLock,
  onReopen,
}) => {
  // Filter financial years based on search
  const filteredYears = financialYears.filter((fy) =>
    fy.yearCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fy.yearName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // LIST VIEW
  if (viewMode === FY_VIEW_MODES.LIST) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {filteredYears.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-sm">No financial years found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cyan-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Current</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredYears.map((fy) => (
                  <tr key={fy._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-cyan-700">{fy.yearCode}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fy.yearName}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatDate(fy.startDate)} to {formatDate(fy.endDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[fy.status]?.badge}`}>
                        {STATUS_CONFIG[fy.status]?.icon} {STATUS_CONFIG[fy.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {fy.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          <Check size={14} /> Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => onEdit(fy)}
                          disabled={fy.status === 'LOCKED'}
                          title={fy.status === 'LOCKED' ? 'Cannot edit locked year' : 'Edit'}
                          className={`p-1.5 rounded transition ${
                            fy.status === 'LOCKED'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        >
                          <Edit size={16} />
                        </button>
                        {!fy.isCurrent && fy.status === 'OPEN' && (
                          <button
                            onClick={() => onSetCurrent(fy._id)}
                            title="Set as Current"
                            className="p-1.5 rounded bg-green-100 text-green-600 hover:bg-green-200 transition"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {fy.status === 'OPEN' && (
                          <button
                            onClick={() => onLock(fy._id)}
                            title="Lock Year"
                            className="p-1.5 rounded bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition"
                          >
                            <Lock size={16} />
                          </button>
                        )}
                        {fy.status === 'LOCKED' && (
                          <button
                            onClick={() => onReopen(fy._id)}
                            title="Unlock Year"
                            className="p-1.5 rounded bg-purple-100 text-purple-600 hover:bg-purple-200 transition"
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(fy._id)}
                          disabled={fy.isCurrent}
                          title={fy.isCurrent ? 'Cannot delete current year' : 'Delete'}
                          className={`p-1.5 rounded transition ${
                            fy.isCurrent
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // SUMMARY VIEW
  if (viewMode === FY_VIEW_MODES.SUMMARY) {
    const stats = {
      total: financialYears.length,
      open: financialYears.filter((fy) => fy.status === 'OPEN').length,
      closed: financialYears.filter((fy) => fy.status === 'CLOSED').length,
      locked: financialYears.filter((fy) => fy.status === 'LOCKED').length,
      current: financialYears.find((fy) => fy.isCurrent)?.yearCode || 'None',
    };

    return (
      <div className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-gray-600 text-xs font-semibold uppercase">Total Years</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-gray-600 text-xs font-semibold uppercase">Open Years</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-xs font-semibold uppercase">Closed Years</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.closed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-gray-600 text-xs font-semibold uppercase">Locked Years</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.locked}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-cyan-500">
            <p className="text-gray-600 text-xs font-semibold uppercase">Current Year</p>
            <p className="text-lg font-bold text-cyan-600 mt-2">{stats.current}</p>
          </div>
        </div>

        {/* Years List */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">All Financial Years</h3>
          <div className="space-y-2">
            {filteredYears.map((fy) => (
              <div
                key={fy._id}
                className={`p-4 rounded-lg border-l-4 ${
                  fy.isCurrent
                    ? 'bg-cyan-50 border-cyan-500'
                    : fy.status === 'OPEN'
                    ? 'bg-green-50 border-green-500'
                    : fy.status === 'CLOSED'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{fy.yearCode}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[fy.status]?.badge}`}>
                        {STATUS_CONFIG[fy.status]?.label}
                      </span>
                      {fy.isCurrent && (
                        <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{fy.yearName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(fy.startDate)} → {formatDate(fy.endDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => onEdit(fy)}
                    disabled={fy.status === 'LOCKED'}
                    className={`ml-2 px-3 py-1.5 rounded text-xs font-medium transition ${
                      fy.status === 'LOCKED'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // TIMELINE VIEW
  if (viewMode === FY_VIEW_MODES.TIMELINE) {
    const sortedYears = [...filteredYears].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate)
    );

    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-6">Financial Years Timeline</h3>
        <div className="space-y-4">
          {sortedYears.map((fy, index) => (
            <div key={fy._id} className="flex gap-4">
              {/* Timeline Line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    fy.isCurrent
                      ? 'bg-cyan-500 border-cyan-600'
                      : fy.status === 'OPEN'
                      ? 'bg-green-500 border-green-600'
                      : fy.status === 'CLOSED'
                      ? 'bg-yellow-500 border-yellow-600'
                      : 'bg-red-500 border-red-600'
                  }`}
                />
                {index < sortedYears.length - 1 && (
                  <div className="w-0.5 h-16 bg-gray-300 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{fy.yearCode}</p>
                    <p className="text-sm text-gray-600">{fy.yearName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(fy.startDate)} to {formatDate(fy.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[fy.status]?.badge}`}>
                      {STATUS_CONFIG[fy.status]?.label}
                    </span>
                    {fy.isCurrent && (
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onEdit(fy)}
                  disabled={fy.status === 'LOCKED'}
                  className={`mt-2 px-3 py-1 rounded text-xs font-medium transition ${
                    fy.status === 'LOCKED'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default FinancialYearView;
