/**
 * GrnListTable Component
 * Displays list of existing GRNs with pagination
 */
import React, { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import useDecimalFormat from "../../../hooks/useDecimalFormat";

const GrnListTable = ({ grnList, onEdit, onDelete }) => {
  // ✅ Country-based Decimal Format Hook
  const {  formatNumber } = useDecimalFormat();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination info
  const totalPages = Math.ceil(grnList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGrns = grnList.slice(startIndex, endIndex);

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
      {grnList.length === 0 ? (
        <div className="p-8 text-center flex-grow flex items-center justify-center">
          <p className="text-gray-600 text-lg">
            No GRNs created yet. Click "New GRN" to create one.
          </p>
        </div>
      ) : (
        <>
          {/* Table - Scrollable */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border flex flex-col min-h-0 overflow-hidden">
            {/* Table with Sticky Header */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-100 text-left sticky top-0 z-10">
                  <tr>
                    <th className="p-1 lg:p-2 border text-left font-semibold text-xs">
                      GRN No.
                    </th>
                    <th className="p-1 lg:p-2 border text-left font-semibold text-xs">
                      Invoice No.
                    </th>
                    <th className="p-1 lg:p-2 border text-left font-semibold text-xs">
                      Vendor
                    </th>
                    <th className="p-1 lg:p-2 border text-left font-semibold text-xs">
                      Date
                    </th>
                    <th className="p-1 lg:p-2 border text-center font-semibold text-xs">
                      Items
                    </th>
                    <th className="p-1 lg:p-2 border text-right font-semibold text-xs">
                      Net Total
                    </th>
                    <th className="p-1 lg:p-2 border text-center font-semibold text-xs">
                      Status
                    </th>
                    <th className="p-1 lg:p-2 border text-center font-semibold text-xs">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGrns.map((grn) => (
                    <tr key={grn._id} className="hover:bg-gray-50">
                      <td className="p-1 lg:p-2 border text-left text-xs font-medium">
                        {grn.grnNumber}
                      </td>
                      <td className="p-1 lg:p-2 border text-left text-xs">
                        {grn.invoiceNo || "-"}
                      </td>
                      <td className="p-1 lg:p-2 border text-left text-xs">
                        {grn.vendorName}
                      </td>
                      <td className="p-1 lg:p-2 border text-left text-xs">
                        {new Date(grn.grnDate).toLocaleDateString()}
                      </td>
                      <td className="p-1 lg:p-2 border text-center text-xs">
                        {grn.items?.length || 0}
                      </td>
                      <td className="p-1 lg:p-2 border text-right text-xs font-semibold">
                        {formatNumber(
                          typeof grn.netTotal === "number" && !isNaN(grn.netTotal) 
                            ? grn.netTotal 
                            : 0
                        )}
                      </td>
                      <td className="p-1 lg:p-2 border text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold inline-block ${
                            grn.status === "Posted"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {grn.status || "Draft"}
                        </span>
                      </td>
                      <td className="p-1 lg:p-2 border text-center">
                        <button
                          onClick={() => onEdit(grn)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER - Pagination & Info - Fixed at bottom */}
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
                    {grnList.length}
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
        </>
      )}
    </div>
  );
};

export default GrnListTable;


