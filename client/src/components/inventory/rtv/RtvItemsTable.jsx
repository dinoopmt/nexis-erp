/**
 * RtvItemsTable Component
 * Displays AG Grid table with RTV items (MATCHING GrnItemsTable structure)
 * ✅ Supports highlighting newly added items and auto-scroll
 */
import React, { useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const RtvItemsTable = ({
  items,
  columns,
  gridConfig,
  gridHeight,
  gridContainerRef,
  onCellValueChanged,
  gridContext,
  highlightedItemId,
  editTargetItemId,
  onEditTargetHandled,
  isViewMode = false, // ✅ NEW: Read-only mode
}) => {
  const gridRef = useRef(null);

  // ✅ Auto-scroll to newly added/highlighted item
  useEffect(() => {
    if (highlightedItemId && gridRef.current?.api) {
      const rowIndex = items.findIndex((item) => item.id === highlightedItemId);
      
      if (rowIndex >= 0) {
        setTimeout(() => {
          try {
            const rowNode = gridRef.current.api.getRowNode(highlightedItemId);
            
            // Refresh rows to apply highlight class
            gridRef.current.api.redrawRows({ rowNodes: [rowNode] });
            
            // Scroll to row
            gridRef.current.api.ensureIndexVisible(rowIndex, 'top');
            setTimeout(() => {
              gridRef.current.api.ensureNodeVisible(rowNode, 'middle');
            }, 50);
          } catch (error) {
            // Silent error handling
          }
        }, 100);
      }
    }
  }, [highlightedItemId, items]);

  useEffect(() => {
    if (!editTargetItemId || isViewMode || !gridRef.current?.api) {
      return;
    }

    const rowIndex = items.findIndex((item) => item.id === editTargetItemId);

    if (rowIndex < 0) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        gridRef.current.api.ensureIndexVisible(rowIndex, 'middle');
        gridRef.current.api.setFocusedCell(rowIndex, 'quantity');
        gridRef.current.api.startEditingCell({
          rowIndex,
          colKey: 'quantity',
        });
      } catch (error) {
        // Silent error handling
      } finally {
        onEditTargetHandled?.();
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [editTargetItemId, isViewMode, items, onEditTargetHandled]);

  return (
    <div
      ref={gridContainerRef}
      className="bg-white rounded-lg border border-gray-300"
      style={{
        height: `${gridHeight}px`,
        width: "100%",
      }}
    >
      <div
        className="ag-theme-quartz"
        style={{
          height: "100%",
          width: "100%",
        }}
      >
        <style>{`
          .ag-row-highlight {
            background-color: #fef3c7 !important;
            box-shadow: inset 4px 0 0 #fbbf24 !important;
            animation: pulse-highlight 0.6s ease-in-out 2 forwards !important;
          }
          .ag-row-highlight .ag-cell {
            background-color: transparent !important;
          }
          @keyframes pulse-highlight {
            0%, 100% { 
              background-color: #fef3c7 !important;
              box-shadow: inset 4px 0 0 #fbbf24 !important;
            }
            50% { 
              background-color: #fef08a !important;
              box-shadow: inset 4px 0 0 #fbbf24 !important;
            }
          }
        `}</style>
        <AgGridReact
          ref={gridRef}
          columnDefs={columns}
          rowData={items || []}
          onCellValueChanged={!isViewMode ? onCellValueChanged : undefined} // ✅ Disable cell changes in view mode
          context={gridContext}
          theme="legacy"
          domLayout={gridConfig.domLayout}
          animateRows={gridConfig.animateRows}
          defaultColDef={{
            ...gridConfig.defaultColDef,
            editable: !isViewMode, // ✅ Disable editing in view mode
          }}
          rowHeight={gridConfig.rowHeight}
          headerHeight={gridConfig.headerHeight}
          suppressMenuHide={gridConfig.suppressMenuHide}
          stopEditingWhenCellsLoseFocus={gridConfig.stopEditingWhenCellsLoseFocus}
          suppressClickEdit={isViewMode} // ✅ Prevent edit mode on cell click when read-only
          getRowClass={(params) => {
            const rowId = params.data?.id;
            const shouldHighlight = highlightedItemId && rowId === highlightedItemId;
            return shouldHighlight ? 'ag-row-highlight' : '';
          }}
          getRowId={(params) => params.data.id}
        />
      </div>
    </div>
  );
};

export default RtvItemsTable;


