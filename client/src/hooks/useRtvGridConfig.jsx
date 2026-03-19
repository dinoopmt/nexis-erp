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
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-gray-100",
    },
    {
      headerName: "Product Name",
      field: "itemName",
      width: 200,
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-gray-100",
    },
    {
      headerName: "Original Qty",
      field: "originalQuantity",
      width: 110,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right",
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-gray-100 text-right",
    },
    {
      headerName: "Return Qty",
      field: "quantity",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right font-semibold",
      cellStyle: { "background-color": "#fef3c7" },
      headerClass: "ag-header-cell-compact font-bold text-xs bg-yellow-100 text-right",
    },
    {
      headerName: "Unit Cost",
      field: "unitCost",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right",
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-gray-100 text-right",
    },
    {
      headerName: "Batch #",
      field: "originalBatchNumber",
      width: 110,
      cellClass: "text-xs",
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-gray-100",
    },
    {
      headerName: "Tax Type",
      field: "taxType",
      width: 100,
      cellClass: "text-center text-xs",
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-purple-100 text-center",
      valueFormatter: (params) => {
        const taxTypes = {
          "exclusive": "Exclusive",
          "inclusive": "Inclusive",
          "notax": "No Tax",
        };
        return taxTypes[params.value] || params.value || "N/A";
      },
      tooltipField: "taxType",
    },
    {
      headerName: "Tax %",
      field: "taxPercent",
      width: 80,
      type: "numericColumn",
      valueFormatter: (params) => {
        const value = params.value || 0;
        return `${formatPercentage(value)}%`;
      },
      cellClass: "text-right font-semibold text-purple-700",
      cellStyle: { "background-color": "#ede9fe" },
      headerClass: "ag-header-cell-compact font-bold text-xs bg-purple-100 text-right",
    },
    {
      headerName: "Tax Amount",
      field: "taxAmount",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right font-semibold",
      cellStyle: { "background-color": "#ede9fe" },
      headerClass: "ag-header-cell-compact font-bold text-xs bg-purple-100 text-right",
    },
    {
      headerName: "Total Cost",
      field: "totalCost",
      width: 100,
      type: "numericColumn",
      valueFormatter: (params) => formatNumber(params.value || 0),
      cellClass: "text-right font-semibold",
      cellStyle: { "background-color": "#dbeafe" },
      headerClass: "ag-header-cell-compact font-bold text-xs bg-blue-100 text-right",
    },
    {
      headerName: "Action",
      field: "id",
      width: 80,
      pinned: "right",
      cellClass: "text-center",
      headerClass: "ag-header-cell-compact font-semibold text-xs bg-gray-100 text-center",
      filter: false,
      sortable: false,
      cellRenderer: DeleteButtonRenderer,
    },
  ], [formatNumber, formatPercentage, DeleteButtonRenderer]);

  return { columnDefs };
};


