/**
 * RtvItemsTable Component
 * AG Grid table for RTV items with return reason and quantity editing
 */
import React, { useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const RtvItemsTable = ({
  items,
  columnDefs,
  onUpdateQuantity,
  onUpdateReturnReason,
  onRemoveItem,
}) => {
  const gridRef = useRef(null);

  // ✅ Handle cell value changes
  const handleCellValueChange = (event) => {
    const { data, colDef, newValue } = event;
    
    if (colDef.field === "quantity") {
      onUpdateQuantity(data.id, newValue);
    }
  };

  // ✅ Quantity cell editor
  const QuantityCellEditor = (props) => {
    const { value, onValueChange } = props;
    const [inputValue, setInputValue] = React.useState(value || 0);

    return (
      <input
        type="number"
        style={{ width: "100%", height: "100%", padding: "4px" }}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => onValueChange(Math.max(0, parseFloat(inputValue) || 0))}
        autoFocus
        min="0"
      />
    );
  };

  // ✅ Enhanced columnDefs with editors
  const enhancedColumnDefs = columnDefs.map(col => {
    if (col.field === "quantity") {
      return {
        ...col,
        editable: true,
        cellEditor: "agLargeTextCellEditor",
        cellEditorParams: {
          maxLength: 6,
        },
      };
    }
    return col;
  });

  const defaultColDef = {
    resizable: true,
    sortable: true,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
      <div
        className="ag-theme-quartz"
        style={{
          height: "384px",
          width: "100%",
        }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={items}
          columnDefs={enhancedColumnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={handleCellValueChange}
          theme="legacy"
          domLayout="autoHeight"
          suppressMovableColumns={false}
          enableBrowserTooltips={true}
          pagination={false}
          rowHeight={36}
          headerHeight={32}
        />
      </div>
    </div>
  );
};

export default RtvItemsTable;


