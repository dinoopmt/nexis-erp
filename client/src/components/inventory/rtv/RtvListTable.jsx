/**
 * RtvListTable Component
 * Display list of RTVs with pagination (MATCHING GrnListTable structure)
 */
import React, { useState, useEffect } from "react";
import { Edit, Eye, Trash2, CheckCircle, Send, FileText } from "lucide-react";
import useDecimalFormat from "../../../hooks/useDecimalFormat";

const RtvListTable = ({
  rtvList,
  loading,
  onEdit,
  onView,
  onSubmit,
  onApprove,
  onPost,
  onDelete,
}) => {
  const { formatNumber } = useDecimalFormat();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ Reset to page 1 when rtvList changes
  useEffect(() => {
    const totalPages = Math.ceil(rtvList.length / itemsPerPage);
    setCurrentPage(1);
    console.log("📊 RtvListTable Updated:", {
      rtvListLength: rtvList?.length || 0,
      totalPages,
      firstRtvNumber: rtvList?.[0]?.rtvNumber,
    });
  }, [rtvList.length]);

  // Calculate pagination info
  const totalPages = Math.ceil(rtvList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRtvs = rtvList.slice(startIndex, endIndex);

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

  const getStatusBadge = (status) => {
    const statusConfig = {
      Draft: { bg: "bg-yellow-100", text: "text-yellow-800" },
      Submitted: { bg: "bg-blue-100", text: "text-blue-800" },
      Approved: { bg: "bg-green-100", text: "text-green-800" },
      Posted: { bg: "bg-purple-100", text: "text-purple-800" },
      Cancelled: { bg: "bg-red-100", text: "text-red-800" },
    };

    const config = statusConfig[status] || statusConfig.Draft;

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold inline-block ${config.bg} ${config.text}`}
      >
        {status || "Draft"}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        <span className="ml-2">Loading RTVs...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-white rounded-lg border border-gray-200">
      {/* Table - Always Visible (Scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 border-b border-gray-200">
        {/* Table with Sticky Header and Fixed Column Widths */}
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-gray-100 text-left sticky top-0 z-10">
              <tr>
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '15%' }}>
                  RTV No.
                </th>
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '15%' }}>
                  Vendor
                </th>
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '12%' }}>
                  GRN Ref
                </th>
                <th className="p-1 lg:p-2 border text-center font-semibold text-xs" style={{ width: '8%' }}>
                  Items
                </th>
                <th className="p-1 lg:p-2 border text-right font-semibold text-xs" style={{ width: '12%' }}>
                  Amount
                </th>
                <th className="p-1 lg:p-2 border text-left font-semibold text-xs" style={{ width: '12%' }}>
                  Credit Note
                </th>
                <th className="p-1 lg:p-2 border text-center font-semibold text-xs" style={{ width: '12%' }}>
                  Status
                </th>
                <th className="p-1 lg:p-2 border text-center font-semibold text-xs" style={{ width: '14%' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ Show empty message if no RTVs */}
              {rtvList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    <p className="text-lg">No RTVs created yet. Click "New RTV" to create one.</p>
                  </td>
                </tr>
              ) : paginatedRtvs && paginatedRtvs.length > 0 ? (
                // ✅ Show data rows
                paginatedRtvs.map((rtv) => (
                  <tr key={rtv._id} className="hover:bg-gray-50">
                    <td className="p-1 lg:p-2 border text-left text-xs font-medium" style={{ width: '15%' }}>
                      {rtv.rtvNumber}
                    </td>
                    <td className="p-1 lg:p-2 border text-left text-xs" style={{ width: '15%' }}>
                      {rtv.vendorName}
                    </td>
                    <td className="p-1 lg:p-2 border text-left text-xs" style={{ width: '12%' }}>
                      {rtv.grnNumber || "-"}
                    </td>
                    <td className="p-1 lg:p-2 border text-center text-xs" style={{ width: '8%' }}>
                      {rtv.items?.length || 0}
                    </td>
                    <td className="p-1 lg:p-2 border text-right text-xs font-semibold" style={{ width: '12%' }}>
                      {formatNumber(
                        typeof rtv.netTotal === "number" && !isNaN(rtv.netTotal)
                          ? rtv.netTotal
                          : 0
                      )}
                    </td>
                    <td className="p-1 lg:p-2 border text-left text-xs" style={{ width: '12%' }}>
                      {rtv.creditNoteNo ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          {rtv.creditNoteNo}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-1 lg:p-2 border text-center" style={{ width: '12%' }}>
                      {getStatusBadge(rtv.status)}
                    </td>
                    <td className="p-1 lg:p-2 border text-center" style={{ width: '14%' }}>
                      <div className="flex justify-center gap-1">
                        {/* View */}
                        <button
                          onClick={() => onView?.(rtv)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit */}
                        {["Draft", "Submitted"].includes(rtv.status) && (
                          <button
                            onClick={() => onEdit(rtv)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                        )}

                        {/* Submit */}
                        {rtv.status === "Draft" && (
                          <button
                            onClick={() => onSubmit(rtv._id)}
                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 p-1 rounded transition"
                            title="Submit"
                          >
                            <Send size={14} />
                          </button>
                        )}

                        {/* Approve */}
                        {rtv.status === "Submitted" && (
                          <button
                            onClick={() => onApprove(rtv._id)}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1 rounded transition"
                            title="Approve"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}

                        {/* Post */}
                        {rtv.status === "Approved" && (
                          <button
                            onClick={() => onPost(rtv._id)}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded transition"
                            title="Post"
                          >
                            <FileText size={14} />
                          </button>
                        )}

                        {/* Delete */}
                        {rtv.status === "Draft" && (
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this RTV?")) {
                                onDelete(rtv._id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // ✅ Show "no data on this page" if paginated list is empty but total list has data
                <tr>
                  <td colSpan="8" className="p-4 text-center text-gray-500">
                    <p>Current page is empty</p>
                    <p className="text-xs mt-1">Total RTVs: {rtvList.length} | Page: {currentPage}/{totalPages || 1}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                {rtvList.length}
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
                      className={`px-1.5 py-0.5 border rounded text-xs font-medium transition ${
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

export default RtvListTable;


