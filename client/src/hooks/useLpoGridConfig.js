/**
 * useLpoGridConfig Hook
 * Manages AG Grid column definitions and configuration for LPO items
 * ✅ Uses global decimal formatter from useDecimalFormat
 * ✅ Mirrors useGrnGridConfig structure (simplified without FOC/batch expiry)
 */
import React, { useMemo } from "react";
import { Trash2, Edit2 } from "lucide-react";
import useDecimalFormat from "./useDecimalFormat";

export const useLpoGridConfig = (removeItemFromLpo, onEditProduct = null) => {
  // ✅ Get global decimal formatter (respects company settings)
  const { formatNumber, formatPercentage } = useDecimalFormat();

  /**
   * AG Grid Column Definitions
   * All CSS and alignment preserved for pixel-perfect layout
   */
  const columns = useMemo(() => {
    return [
      {
        headerName: "S.No",
        flex: 0.8,
        minWidth: 70,
        cellStyle: { textAlign: "center" },
        headerClass: "ag-center-aligned-header",
        headerStyle: { fontSize: '12px' },
        cellRenderer: function (params) {
          // ✅ Display index number with Edit button
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '2px',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '4px',
                width: '100%',
              },
            },
            // Index Number
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '11px',
                  color: '#374151',
                  minWidth: '16px',
                  textAlign: 'center',
                },
              },
              params.node?.rowIndex !== undefined ? params.node.rowIndex + 1 : ""
            ),
            // Edit Product Button
            React.createElement(
              'button',
              {
                onClick: () => {
                  if (onEditProduct && params.data?.productId) {
                    onEditProduct(params.data.productId);
                  }
                },
                style: {
                  padding: '2px 2px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                },
                onMouseEnter: (e) => { e.target.style.opacity = '1'; },
                onMouseLeave: (e) => { e.target.style.opacity = '0.6'; },
                title: 'Edit Product',
              },
              React.createElement(Edit2, { size: 13, color: '#8b5cf6' })
            )
          );
        },
      },
      {
        headerName: "Item Name",
        field: "productName",
        flex: 2,
        minWidth: 300,
        cellStyle: { fontSize: '12px' },
        headerStyle: { fontSize: '12px' },
      },
      {
        headerName: "Unit",
        field: "unit",
        flex: 0.6,
        minWidth: 55,
        cellStyle: { fontSize: '12px' },
        headerStyle: { fontSize: '12px' },
      },
      {
        headerName: "Qty",
        field: "qty",
        flex: 0.7,
        minWidth: 60,
        cellStyle: { textAlign: "right", fontSize: '11px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '11px' },
        editable: true,
      },
      {
        headerName: "Cost",
        field: "cost",
        flex: 0.8,
        minWidth: 100,
        cellStyle: { textAlign: "right", fontSize: '12px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px' },
        editable: true,
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Net Amt",
        field: "netCost",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Tax %",
        field: "taxPercent",
        flex: 0.7,
        minWidth: 55,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px' },
        editable: true,
        valueFormatter: (params) => formatPercentage(params.value || 0),
      },
      {
        headerName: "Tax Amt",
        field: "taxAmount",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Total",
        field: "finalCost",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '11px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px', fontWeight: 'bold' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Action",
        headerStyle: { fontSize: '12px' },
        field: "id",
        flex: 0.6,
        minWidth: 80,
        sortable: false,
        filter: false,
        cellRenderer: function (params) {
          // ✅ Delete Icon Button Only
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'flex-start',
              },
            },
            React.createElement(
              'button',
              {
                onClick: () => removeItemFromLpo(params.data.id),
                style: {
                  padding: '2px 4px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                title: 'Delete',
                onMouseEnter: (e) => e.target.style.color = '#991b1b',
                onMouseLeave: (e) => e.target.style.color = '#dc2626',
              },
              React.createElement(Trash2, { size: 16 })
            )
          );
        },
      },
    ];
  }, [removeItemFromLpo, formatNumber, formatPercentage]);

  const gridConfig = useMemo(() => {
    return {
      domLayout: "normal",
      animateRows: true,
      defaultColDef: {
        resizable: true,
        sortable: false,
        filter: false,
      },
      rowHeight: 32,
      headerHeight: 36,
      suppressMenuHide: true,
      stopEditingWhenCellsLoseFocus: true,
    };
  }, []);

  return {
    columns,
    gridConfig,
  };
};

export default useLpoGridConfig;
