/**
 * useRtvGridConfig Hook
 * AG Grid column definitions for RTV items table
 */
import React, { useMemo, useCallback } from "react";
import { Trash2 } from "lucide-react";
import useDecimalFormat from "./useDecimalFormat";

export const useRtvGridConfig = (onRemoveItem) => {
  // ✅ Get decimal formatting hook
  const { formatNumber, formatPercentage } = useDecimalFormat();

  // ✅ Custom cell renderer for delete button (returns JSX, not DOM element)
  const DeleteButtonRenderer = useCallback((params) => {
    return (
      <button
        onClick={() => onRemoveItem?.(params.data.id)}
        className="text-red-600 hover:text-red-800 font-bold text-lg cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition"
        title="Remove from return"
      >
        ✕
      </button>
    );
  }, [onRemoveItem]);

  // ✅ Column definitions for RTV items table
  const columnDefs = useMemo(() => [
    {
      headerName: "Product Code",
      field: "itemCode",
      width: 120,
      pinned: "left",
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Product Name",
      field: "itemName",
      width: 200,
      filter: "agTextColumnFilter",
    },
    {
      headerName: "Original Qty",
      field: "originalQuantity",
      width: 110,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right",
    },
    {
      headerName: "Return Qty",
      field: "quantity",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right font-semibold",
      cellStyle: { "background-color": "#fef3c7" }, // Editable column highlight
    },
    {
      headerName: "Unit Cost",
      field: "unitCost",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right",
    },
    {
      headerName: "Return Reason",
      field: "returnReason",
      width: 120,
      cellClass: "text-center text-sm",
      valueFormatter: (params) => {
        const reasons = {
          "DAMAGE": "🔴 Damage",
          "DEFECTIVE": "❌ Defective",
          "EXCESS": "📦 Excess",
          "WRONG_ITEM": "❓ Wrong Item",
          "NOT_REQUIRED": "❌ Not Required",
          "QUALITY_ISSUE": "⚠️ Quality",
          "OTHER": "📝 Other",
        };
        return reasons[params.value] || params.value;
      },
    },
    {
      headerName: "Notes",
      field: "returnReasonNotes",
      width: 150,
      cellClass: "text-xs text-gray-600",
      tooltipField: "returnReasonNotes",
    },
    {
      headerName: "Batch #",
      field: "originalBatchNumber",
      width: 110,
      filter: "agTextColumnFilter",
      cellClass: "text-xs",
    },
    {
      headerName: "Total Cost",
      field: "totalCost",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right font-semibold",
      cellStyle: { "background-color": "#dbeafe" },
    },
    {
      headerName: "Action",
      field: "id",
      width: 80,
      pinned: "right",
      cellClass: "text-center",
      cellRenderer: DeleteButtonRenderer,
    },
  ], [formatNumber, formatPercentage, DeleteButtonRenderer]);

  return { columnDefs };
};


