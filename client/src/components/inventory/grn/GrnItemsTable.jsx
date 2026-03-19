/**
 * GrnItemsTable Component
 * Displays AG Grid table with GRN items
 * Preserves all CSS alignment and AG Grid configuration
 */
import React, { useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const GrnItemsTable = ({
  items,
  columns,
  gridConfig,
  gridHeight,
  gridContainerRef,
  onCellValueChanged,
  gridContext,
}) => {
  const gridRef = useRef(null);

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
        <AgGridReact
          ref={gridRef}
          columnDefs={columns}
          rowData={items || []}
          onCellValueChanged={onCellValueChanged}
          context={gridContext}
          theme="legacy"
          domLayout={gridConfig.domLayout}
          animateRows={gridConfig.animateRows}
          defaultColDef={gridConfig.defaultColDef}
          rowHeight={gridConfig.rowHeight}
          headerHeight={gridConfig.headerHeight}
          suppressMenuHide={gridConfig.suppressMenuHide}
          stopEditingWhenCellsLoseFocus={gridConfig.stopEditingWhenCellsLoseFocus}
          getRowId={(params) => params.data.id}
        />
      </div>
    </div>
  );
};

export default GrnItemsTable;


