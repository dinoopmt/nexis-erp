/**
 * RtvListTable Component
 * Display list of RTVs with status and actions
 */
import React from "react";
import { Edit, Trash2, CheckCircle, Clock, Send, FileText } from "lucide-react";
import useDecimalFormat from "../../../hooks/useDecimalFormat";

const RtvListTable = ({
  rtvList,
  loading,
  onEdit,
  onSubmit,
  onApprove,
  onPost,
  onDelete,
}) => {
  const { formatCurrency, formatNumber } = useDecimalFormat();

  const getStatusBadge = (status) => {
    const statusConfig = {
      Draft: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "📝" },
      Submitted: { bg: "bg-blue-100", text: "text-blue-800", icon: "📤" },
      Approved: { bg: "bg-green-100", text: "text-green-800", icon: "✅" },
      Posted: { bg: "bg-purple-100", text: "text-purple-800", icon: "✔️" },
      Cancelled: { bg: "bg-red-100", text: "text-red-800", icon: "❌" },
    };

    const config = statusConfig[status] || statusConfig.Draft;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span>{config.icon}</span>
        {status}
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

  if (rtvList.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No RTVs found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-100 text-left sticky top-0 z-10">
            <tr>
              <th className="p-2 border text-left font-semibold">RTV #</th>
              <th className="p-2 border text-left font-semibold">Vendor</th>
              <th className="p-2 border text-left font-semibold">GRN Ref</th>
              <th className="p-2 border text-center font-semibold">Items</th>
              <th className="p-2 border text-right font-semibold">Amount</th>
              <th className="p-2 border text-left font-semibold">Credit Note</th>
              <th className="p-2 border text-center font-semibold">Status</th>
              <th className="p-2 border text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rtvList.map(rtv => (
              <tr key={rtv._id} className="hover:bg-gray-50 border-b">
                <td className="p-2 border text-left font-medium text-red-600">
                  {rtv.rtvNumber}
                </td>
                <td className="p-2 border text-left">{rtv.vendorName}</td>
                <td className="p-2 border text-left text-xs text-gray-600">
                  {rtv.grnNumber || "-"}
                </td>
                <td className="p-2 border text-center">
                  <span className="bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                    {rtv.items?.length || 0}
                  </span>
                </td>
                <td className="p-2 border text-right font-semibold">
                  {formatCurrency(rtv.netTotal || 0)}
                </td>
                <td className="p-2 border text-left text-xs">
                  {rtv.creditNoteNo ? (
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                      {rtv.creditNoteNo}
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="p-2 border text-center">
                  {getStatusBadge(rtv.status)}
                </td>
                <td className="p-2 border text-center">
                  <div className="flex justify-center gap-1">
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
                        className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition"
                        title="Submit for approval"
                      >
                        <Send size={14} />
                      </button>
                    )}

                    {/* Approve */}
                    {rtv.status === "Submitted" && (
                      <button
                        onClick={() => onApprove(rtv._id)}
                        className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1 rounded transition"
                        title="Approve RTV"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}

                    {/* Post */}
                    {rtv.status === "Approved" && (
                      <button
                        onClick={() => onPost(rtv._id)}
                        className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded transition"
                        title="Post RTV (Reverse Stock & GL)"
                      >
                        <FileText size={14} />
                      </button>
                    )}

                    {/* Delete (Draft only) */}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-600">
        Showing {rtvList.length} RTV(s)
      </div>
    </div>
  );
};

export default RtvListTable;


