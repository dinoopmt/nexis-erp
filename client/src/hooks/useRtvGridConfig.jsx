/**
 * useRtvGridConfig Hook
 * AG Grid column definitions for RTV items table (MATCHING GrnGridConfig structure)
 */
import React, { useMemo } from "react";
import { Trash2, Package, Edit2 } from "lucide-react";
import useDecimalFormat from "./useDecimalFormat";

export const useRtvGridConfig = (removeItemFromRtv, onEditProduct = null) => {
  // ✅ Get global decimal formatter (respects company settings)
  const { formatNumber, formatPercentage } = useDecimalFormat();

  /**
   * AG Grid Column Definitions
   * Matching GrnItemsTable structure with flex sizing
   */
  const columns = useMemo(() => {
    return [
      {
        headerName: "S.No",
        flex: 0.6,
        minWidth: 50,
        cellStyle: { textAlign: "center", fontSize: '10px' },
        headerClass: "ag-center-aligned-header",
        headerStyle: { fontSize: '10px' },
        cellRenderer: function (params) {
          // ✅ Display index number with Edit button
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '1px',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '2px',
                width: '100%',
              },
            },
            // Index Number
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '9px',
                  color: '#374151',
                  minWidth: '14px',
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
                  padding: '1px 1px',
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
              React.createElement(Edit2, { size: 11, color: '#8b5cf6' })
            )
          );
        },
      },
      {
        headerName: "Product Name",
        field: "itemName",
        flex: 2,
        minWidth: 250,
        cellStyle: { fontSize: '10px' },
        headerStyle: { fontSize: '10px' },
      },
      {
        headerName: "Unit",
        field: "unitType",
        flex: 0.5,
        minWidth: 45,
        cellStyle: { fontSize: '10px' },
        headerStyle: { fontSize: '10px' },
      },
      {
        headerName: "Orig Qty",
        field: "originalQuantity",
        flex: 0.6,
        minWidth: 60,
        cellStyle: { textAlign: "right", fontSize: '10px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Return Qty",
        field: "quantity",
        flex: 0.6,
        minWidth: 60,
        cellStyle: { textAlign: "right", fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fef3c7', padding: '2px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px', backgroundColor: '#fef3c7', fontWeight: 'bold' },
        editable: true,
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Unit Cost",
        field: "unitCost",
        flex: 0.7,
        minWidth: 80,
        cellStyle: { textAlign: "right", fontSize: '10px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Tax %",
        field: "taxPercent",
        flex: 0.5,
        minWidth: 50,
        cellStyle: { textAlign: "right", fontSize: '10px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px' },
        valueFormatter: (params) => formatPercentage(params.value || 0),
      },
      {
        headerName: "Tax Amt",
        field: "taxAmount",
        flex: 0.6,
        minWidth: 60,
        cellStyle: { textAlign: "right", fontSize: '10px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Total",
        field: "totalCost",
        flex: 0.6,
        minWidth: 60,
        cellStyle: { textAlign: "right", fontSize: '10px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px', fontWeight: 'bold' },
        valueFormatter: (params) => formatNumber(params.value || 0),
      },
      {
        headerName: "Action",
        headerStyle: { fontSize: '10px' },
        field: "id",
        flex: 0.5,
        minWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: function (params) {
          // ✅ Delete button
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '2px',
                alignItems: 'center',
                justifyContent: 'flex-start',
              },
            },
            React.createElement(
              'button',
              {
                onClick: () => removeItemFromRtv(params.data.id),
                style: {
                  padding: '1px 2px',
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
              React.createElement(Trash2, { size: 14 })
            )
          );
        },
      },
    ];
  }, [removeItemFromRtv, formatNumber, formatPercentage]);

  const gridConfig = useMemo(() => {
    return {
      domLayout: "normal",
      animateRows: true,
      defaultColDef: {
        resizable: true,
        sortable: false,
        filter: false,
      },
      rowHeight: 24,
      headerHeight: 28,
      suppressMenuHide: true,
      stopEditingWhenCellsLoseFocus: true,
    };
  }, []);

  return {
    columns,
    gridConfig,
  };
};

export default useRtvGridConfig;