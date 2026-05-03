/**
 * LpoListTable Component
 * Displays list of existing LPOs with pagination
 */
import React, { useState, useEffect } from "react";
import { Edit, Eye, Printer } from "lucide-react";
import useDecimalFormat from "../../../hooks/useDecimalFormat";

const LpoListTable = ({ lpoList, onEdit, onView, onDelete, onPrint }) => {
  // ✅ Country-based Decimal Format Hook
  const {  formatNumber } = useDecimalFormat();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ NEW: Reset to page 1 when lpoList changes (e.g., after creating new LPO)
  // ✅ DEBUG: Log data status
  useEffect(() => {
    const totalPages = Math.ceil(lpoList.length / itemsPerPage);
    setCurrentPage(1);
    console.log("📊 LpoListTable Updated:", {
      lpoListLength: lpoList?.length || 0,
      totalPages,
      firstLpoNumber: lpoList?.[0]?.lpoNumber,
    });
  }, [lpoList.length]);

  // Calculate pagination info
  const totalPages = Math.ceil(lpoList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLpos = lpoList.slice(startIndex, endIndex);

  // Handle page navigation
  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handlePageSelect = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Table - Always Visible (Scrollable) */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border flex flex-col min-h-0 overflow-hidden">
        {/* Table with Sticky Header and Fixed Column Widths */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-gray-100 text-left sticky top-0 z-10">
              <tr>
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '25%' }}>
                  LPO No.
                </th>
               
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '20%' }}>
                  Vendor
                </th>
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '12%' }}>
                  Date
                </th>
                <th className="p-1 lg:p-2 border text-center font-semibold text-xs" style={{ width: '8%' }}>
                  Items
                </th>
                <th className="p-1 lg:p-2 border text-right font-semibold text-xs" style={{ width: '12%' }}>
                  Net Total
                </th>
                <th className="p-1 lg:p-2 border text-center font-semibold text-xs" style={{ width: '12%' }}>
                  Status
                </th>
                <th className="p-1 lg:p-2 border text-center font-semibold text-xs" style={{ width: '12%' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ Show empty message if no LPOs */}
              {lpoList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    <p className="text-lg">No LPOs created yet. Click "New LPO" to create one.</p>
                  </td>
                </tr>
              ) : paginatedLpos && paginatedLpos.length > 0 ? (
                // ✅ Show data rows
                paginatedLpos.map((lpo) => (
                  <tr key={lpo._id} className="hover:bg-gray-50">
                    <td className="p-1 lg:p-2 border text-left text-xs font-medium" style={{ width: '12%' }}>
                      {lpo.lpoNumber}
                    </td>
                   
                    <td className="p-1 lg:p-2 border text-left text-xs" style={{ width: '20%' }}>
                      {lpo.vendorName}
                    </td>
                    <td className="p-1 lg:p-2 border text-left text-xs" style={{ width: '12%' }}>
                      {new Date(lpo.lpoDate).toLocaleDateString()}
                    </td>
                    <td className="p-1 lg:p-2 border text-center text-xs" style={{ width: '8%' }}>
                      {lpo.items?.length || 0}
                    </td>
                    <td className="p-1 lg:p-2 border text-right text-xs font-semibold" style={{ width: '12%' }}>
                      {formatNumber(
                        typeof lpo.netTotal === "number" && !isNaN(lpo.netTotal) 
                          ? lpo.netTotal 
                          : 0
                      )}
                    </td>
                    <td className="p-1 lg:p-2 border text-center" style={{ width: '12%' }}>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                          lpo.status === "Posted"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {lpo.status || "Draft"}
                      </span>
                    </td>
                    <td className="p-1 lg:p-2 border text-center" style={{ width: '12%' }}>
                      <button
                        onClick={() => onView?.(lpo)}
                        className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition mr-1"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onEdit(lpo)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition mr-1"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => onPrint?.(lpo)}
                        className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1 rounded transition"
                        title="Print"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                // ✅ Show "no data on this page" if paginated list is empty but total list has data
                <tr>
                  <td colSpan="8" className="p-4 text-center text-gray-500">
                    <p>Current page is empty</p>
                    <p className="text-xs mt-1">Total LPOs: {lpoList.length} | Page: {currentPage}/{totalPages || 1}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination & Info Footer - Always Visible */}
      <div className="flex-shrink-0 bg-white border-t shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Page Info */}
            <div className="text-xs text-gray-600 font-medium whitespace-nowrap">
              Page{" "}
              <span className="font-bold text-purple-700">
                {currentPage}/{totalPages || 1}
              </span>{" "}
              |{" "}
              <span className="font-bold text-purple-700">
                {lpoList.length}
              </span>{" "}
              items
            </div>

            {/* Controls */}
            <div className="flex gap-0.5 flex-wrap justify-center items-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium"
              >
                ⏮️
              </button>
              <button
                onClick={handlePrevious}
                className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium disabled:cursor-not-allowed"
                disabled={currentPage === 1}
              >
                ◀️
              </button>

              {/* Page Numbers */}
              <div className="flex gap-0.5">
                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageSelect(pageNum)}
                      className={`px-1 py-0.5 border rounded text-xs font-medium ${
                        currentPage === pageNum
                          ? "bg-purple-600 text-white border-purple-600"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNext}
                className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium disabled:cursor-not-allowed"
                disabled={currentPage === totalPages}
              >
                ▶️
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-1.5 py-0.5 border rounded hover:bg-gray-100 text-xs disabled:opacity-40 font-medium"
              >
                ⏭️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LpoListTable;

