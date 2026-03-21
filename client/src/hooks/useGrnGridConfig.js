/**
 * useGrnGridConfig Hook
 * Manages AG Grid column definitions and configuration
 * ✅ Uses global decimal formatter from useDecimalFormat
 */
import React, { useMemo } from "react";
import { Trash2, Package, Edit2 } from "lucide-react";
import useDecimalFormat from "./useDecimalFormat";

export const useGrnGridConfig = (removeItemFromGrn, taxType = 'exclusive', onEditProduct = null) => {
  // ✅ Get global decimal formatter (respects company settings)
  const { formatNumber, formatPercentage } = useDecimalFormat();
  /**
   * AG Grid Column Definitions
   * All CSS and alignment preserved for pixel-perfect layout
   */
  const columns = useMemo(() => {
    // ✅ Dynamic Cost header based on tax type
    const getCostHeaderName = () => {
      if (taxType === 'exclusive') {
        return 'Cost\n(Excl. Tax)';
      } else if (taxType === 'inclusive') {
        return 'Cost\n(Incl. Tax)';
      } else {
        return 'Cost\n(No Tax)';
      }
    };
    return [
      {
        headerName: "S.No",
        flex: 0.8,
        minWidth: 70,
        cellStyle: { textAlign: "center" },
        headerClass: "ag-center-aligned-header ",
        headerStyle: { fontSize: '12px' }, // ✅ correct
        cellRenderer: function (params) {
          // ✅ Display index number with Edit button
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                gap: '3px',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '8px',
                width: '100%',
              },
            },
            // Index Number
            React.createElement(
              'span',
              {
                style: {
                  fontSize: '12px',
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
        headerStyle: { fontSize: '12px' }, // ✅ correct
      },
      {
        headerName: "Unit",
        field: "unitType",
        flex: 0.6,
        minWidth: 55,
        cellStyle: { fontSize: '12px' },
        headerStyle: { fontSize: '12px' }, // ✅ correct
      },
      {
        headerName: "Qty",
        field: "qty",
        flex: 0.7,
        minWidth: 40,
        cellStyle: { textAlign: "right", fontSize: '13px',fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header" ,
        headerStyle: { fontSize: '13px' }, // ✅ correct
        editable: true,
      },
      {
        headerName: "FOC",
        field: "foc",
        flex: 0.4,
        minWidth: 55,
        editable: true,
        cellStyle: { textAlign: "center", fontSize: '12px' },
        headerClass: "ag-center-aligned-header",
        headerStyle: { fontSize: '11px' }, // ✅ correct

      },
      {
        headerName: "F-Qty",
        field: "focQty",
        flex: 0.5,
        minWidth: 70,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px' },
        // ✅ Allow editing only when FOC checkbox is enabled
        editable: (params) => params.data?.foc === true,
      },
      {
        headerName: taxType === 'exclusive' ? 'Cost (Ex.Tax)' : taxType === 'inclusive' ? 'Cost (Incl.Tax)' : 'Cost (No Tax)',
        field: "cost",
        flex: 0.8,
        minWidth: 100,
        cellStyle: { textAlign: "right", fontSize: '12px',fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '10px' },
        editable: true,
        valueFormatter: (params) => formatNumber(params.value || 0),  // ✅ Uses global formatter
      },
      {
        headerName: "Disc",
        field: "discount",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
          headerStyle: { fontSize: '12px' },
        editable: true,
        valueFormatter: (params) => formatNumber(params.value || 0),  // ✅ Uses global formatter
      },
      {
        headerName: "Net Amt",
        field: "netCost",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px' },
        valueFormatter: (params) => formatNumber(params.value || 0),  // ✅ Uses global formatter
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
        valueFormatter: (params) => formatPercentage(params.value || 0),  // ✅ Uses global formatter
      },
      {
        headerName: "Tax Amt",
        field: "taxAmount",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '12px' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '12px' },
        valueFormatter: (params) => formatNumber(params.value || 0),  // ✅ Uses global formatter
      },
      {
        headerName: "Total",
        field: "finalCost",
        flex: 0.8,
        minWidth: 65,
        cellStyle: { textAlign: "right", fontSize: '13px', fontWeight: 'bold' },
        headerClass: "ag-right-aligned-header",
        headerStyle: { fontSize: '14px', fontWeight: 'bold' },
        valueFormatter: (params) => formatNumber(params.value || 0),  // ✅ Uses global formatter
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
          // ✅ Always show both buttons with icons only
          const isTrackingExpiry = params.data?.trackExpiry === true;
          
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
            // ✅ Batch Icon Button Wrapper
            React.createElement(
              'div',
              {
                style: {
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                },
              },
              React.createElement(
                'button',
                {
                  onClick: () => {
                    // ✅ Check trackExpiry - handle both boolean and string values
                    const hasTrackExpiry = params.data?.trackExpiry === true || params.data?.trackExpiry === 'true' || params.data?.trackExpiry;
                    if (hasTrackExpiry && params.context?.onBatchExpiryClick) {
                      params.context.onBatchExpiryClick(params.data);
                    }
                  },
                  disabled: !(params.data?.trackExpiry === true || params.data?.trackExpiry === 'true' || params.data?.trackExpiry),
                  style: {
                    padding: '2px 4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: (params.data?.trackExpiry === true || params.data?.trackExpiry === 'true' || params.data?.trackExpiry) ? 'pointer' : 'not-allowed',
                    opacity: (params.data?.trackExpiry === true || params.data?.trackExpiry === 'true' || params.data?.trackExpiry) ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  title: (params.data?.trackExpiry === true || params.data?.trackExpiry === 'true' || params.data?.trackExpiry) ? 'Edit Batch & Expiry' : 'Product does not track expiry',
                },
                React.createElement(Package, { size: 16, color: '#3b82f6' })
              )
            ),
            // ✅ Delete Icon Button
            React.createElement(
              'button',
              {
                onClick: () => removeItemFromGrn(params.data.id),
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
      // ✅ Hidden column to ensure trackExpiry is always available in params.data
      {
        headerName: "trackExpiry",
        field: "trackExpiry",
        hide: true,
        sortable: false,
        filter: false,
      },
    ];
  }, [removeItemFromGrn, taxType, formatNumber, formatPercentage]);  // ✅ Added formatters to dependencies

  const gridConfig = useMemo(() => {
    return {
      domLayout: "normal",
      animateRows: true,
      defaultColDef: {
        resizable: true,
        sortable: false,
        filter: false,
      },
      rowHeight: 36,
      headerHeight: 44,
      suppressMenuHide: true,
      stopEditingWhenCellsLoseFocus: true,
    };
  }, []);

  // ✅ Create rowClassRules getter function (called dynamically on every row)
  const getRowClass = (params) => {
    // This is now handled in GrnItemsTable component
    return '';
  };

  return {
    columns,
    gridConfig,
  };
};

export default useGrnGridConfig;


