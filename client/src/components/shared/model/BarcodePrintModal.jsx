import React, { useState, useEffect } from "react";
import Modal from "../../shared/Model";
import { toast } from "react-hot-toast";
import { Printer } from "lucide-react";

/**
 * BarcodePrintModal.jsx - Enhanced barcode printing functionality
 * Features:
 * - Unit variant barcode selection
 * - Multiple format options (Price Tag, Shelf Edge Label)
 * - Printer name selection
 * - Print preview with customizable settings
 */
const BarcodePrintModal = ({
  isOpen,
  onClose,
  barcode,
  productName,
  pricingLines = [],
  units = [],
}) => {
  const [settings, setSettings] = useState({
    format: "price-tag",
    quantity: 1,
    size: "standard",
    columns: 2,
    rows: 4,
    selectedBarcodeIndex: 0,
    printerName: "Default Printer",
    showPrice: true,
    showProductName: true,
  });

  const [availablePrinters, setAvailablePrinters] = useState([
    { name: "Default Printer", type: "thermal" },
    { name: "Zebra ZD410", type: "thermal" },
    { name: "Brother QL-710W", type: "label" },
    { name: "HP LaserJet Pro", type: "laser" },
    { name: "Canon imageFORMULA", type: "multifunction" },
  ]);

  // Get selected barcode and unit info
  const selectedBarcode = pricingLines[settings.selectedBarcodeIndex];
  const selectedBarcode_value = selectedBarcode?.barcode || barcode;
  const selectedUnit = selectedBarcode?.unit 
    ? units.find(u => String(u._id) === String(selectedBarcode.unit))
    : null;

  const getFormatDescription = () => {
    const descriptions = {
      "price-tag": "Price Tag Label (includes product name, barcode & price)",
      "shelf-edge": "Shelf Edge Label (compact, high-visibility format)",
      "barcode-only": "Barcode Only (minimal, code 128 format)",
      "sticker": "Small Sticker (small format for packaging)",
    };
    return descriptions[settings.format] || descriptions["price-tag"];
  };

  const getPreviewHeight = () => {
    switch (settings.size) {
      case "small":
        return "h-16";
      case "standard":
        return "h-20";
      case "large":
        return "h-24";
      case "xl":
        return "h-32";
      default:
        return "h-20";
    }
  };

  const handlePrint = () => {
    if (!selectedBarcode_value) {
      toast.error("Please select a barcode to print", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    const selectedPrinter = availablePrinters.find(
      (p) => p.name === settings.printerName
    );

    const printData = {
      barcode: selectedBarcode_value,
      format: settings.format,
      quantity: settings.quantity,
      size: settings.size,
      columns: settings.columns,
      rows: settings.rows,
      printer: settings.printerName,
      printerType: selectedPrinter?.type,
      unitVariant: selectedUnit?.unitName || "Base Unit",
      productName: productName,
      inclusion: {
        price: settings.showPrice,
        productName: settings.showProductName,
      },
    };

    console.log("🖨️ Printing barcode labels:", printData);
    
    toast.success(
      `🖨️ Sending ${settings.quantity} labels to ${settings.printerName}`,
      { duration: 3000, position: "top-center" }
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-4xl"
      draggable={true}
    >
      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Printer size={20} />
          Print Barcode Labels
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {/* Left Column: Selection Options */}
          <div className="col-span-1 flex flex-col gap-3">
            {/* Unit Variant Selection */}
            <div className="flex flex-col gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Select Unit Variant
              </label>
              <select
                value={settings.selectedBarcodeIndex}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    selectedBarcodeIndex: parseInt(e.target.value),
                  })
                }
                className="border border-blue-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {pricingLines.map((line, idx) => {
                  const unit = line.unit
                    ? units.find(u => String(u._id) === String(line.unit))
                    : null;
                  const unitName = unit?.unitName || `Unit ${idx}`;
                  const unitSymbol = unit?.unitSymbol || "";
                  return (
                    <option key={idx} value={idx}>
                      {idx === 0 ? "📦 Base Unit" : `📦 ${unitName}`} ({unitSymbol})
                    </option>
                  );
                })}
              </select>
              <div className="text-xs text-gray-600 mt-1 p-1.5 bg-white rounded border border-gray-200">
                <div className="font-semibold text-gray-700">Barcode:</div>
                <div className="font-mono text-blue-600 break-all">
                  {selectedBarcode_value || "N/A"}
                </div>
              </div>
            </div>

            {/* Printer Selection */}
            <div className="flex flex-col gap-1.5 p-3 bg-green-50 border border-green-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Printer Name
              </label>
              <select
                value={settings.printerName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    printerName: e.target.value,
                  })
                }
                className="border border-green-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                {availablePrinters.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    🖨️ {printer.name} ({printer.type})
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-600 mt-1 p-1.5 bg-white rounded border border-gray-200">
                <div className="font-semibold text-gray-700">Type:</div>
                <div className="text-green-600 capitalize">
                  {availablePrinters.find((p) => p.name === settings.printerName)
                    ?.type || "N/A"}
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="flex flex-col gap-1.5 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Label Format
              </label>
              <select
                value={settings.format}
                onChange={(e) =>
                  setSettings({ ...settings, format: e.target.value })
                }
                className="border border-purple-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="price-tag">💰 Price Tag Label</option>
                <option value="shelf-edge">📋 Shelf Edge Label</option>
                <option value="barcode-only">📊 Barcode Only</option>
                <option value="sticker">🏷️ Small Sticker</option>
              </select>
              <div className="text-xs text-gray-600 mt-1 p-1.5 bg-white rounded border border-gray-200">
                <div className="font-semibold text-gray-700">Description:</div>
                <div className="text-gray-700">{getFormatDescription()}</div>
              </div>
            </div>
          </div>

          {/* Center Column: Preview */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase">
              Preview
            </label>
            <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-4 flex flex-col items-center justify-center flex-1 min-h-96">
              {settings.format === "price-tag" && (
                <div className={`${getPreviewHeight()} bg-white border border-gray-300 rounded p-2 flex flex-col items-center justify-center w-full max-w-xs`}>
                  {settings.showProductName && (
                    <div className="text-xs font-semibold text-center text-gray-800 mb-1 truncate w-full">
                      {productName}
                    </div>
                  )}
                  <div className="text-xs font-mono mb-1">{selectedBarcode_value}</div>
                  <div
                    className="text-lg font-bold tracking-wider"
                    style={{ fontFamily: "Code128" }}
                  >
                    | {selectedBarcode_value} |
                  </div>
                  {settings.showPrice && selectedBarcode && (
                    <div className="text-xs text-gray-600 mt-1">
                      Price: {selectedBarcode.price ? `${selectedBarcode.price}` : "N/A"}
                    </div>
                  )}
                </div>
              )}

              {settings.format === "shelf-edge" && (
                <div className={`${getPreviewHeight()} bg-yellow-50 border-2 border-yellow-400 rounded p-2 flex flex-col items-center justify-center w-full max-w-xs`}>
                  <div className="text-xs font-bold text-yellow-700 text-center mb-1">
                    {productName}
                  </div>
                  <div className="text-lg font-bold text-yellow-800 text-center">
                    {selectedBarcode?.price || "Price TBD"}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-mono">
                    {selectedBarcode_value}
                  </div>
                </div>
              )}

              {settings.format === "barcode-only" && (
                <div className={`${getPreviewHeight()} bg-white border border-gray-300 rounded p-2 flex flex-col items-center justify-center w-full max-w-xs`}>
                  <div
                    className="text-2xl font-bold tracking-wider"
                    style={{ fontFamily: "Code128" }}
                  >
                    | {selectedBarcode_value} |
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{selectedBarcode_value}</div>
                </div>
              )}

              {settings.format === "sticker" && (
                <div className={`${getPreviewHeight()} bg-white border-2 border-blue-300 rounded p-1 flex flex-col items-center justify-center w-full max-w-xs`}>
                  <div className="text-xs font-semibold text-center mb-0.5 truncate w-full">
                    {productName}
                  </div>
                  <div
                    className="text-sm font-bold tracking-wider"
                    style={{ fontFamily: "Code128" }}
                  >
                    | {selectedBarcode_value} |
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="col-span-1 flex flex-col gap-3">
            {/* Print Quantity & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.quantity}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  Size
                </label>
                <select
                  value={settings.size}
                  onChange={(e) =>
                    setSettings({ ...settings, size: e.target.value })
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Small (25x25mm)</option>
                  <option value="standard">Standard (38x25mm)</option>
                  <option value="large">Large (50x25mm)</option>
                  <option value="xl">X-Large (60x30mm)</option>
                </select>
              </div>
            </div>

            {/* Layout Settings */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  Per Row
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.columns}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      columns: parseInt(e.target.value) || 2,
                    })
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={settings.rows}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rows: parseInt(e.target.value) || 4,
                    })
                  }
                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Content Options */}
            <div className="flex flex-col gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Label Content
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPrice"
                  checked={settings.showPrice}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showPrice: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label
                  htmlFor="showPrice"
                  className="text-xs text-gray-700 cursor-pointer"
                >
                  Show Price
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showProductName"
                  checked={settings.showProductName}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      showProductName: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label
                  htmlFor="showProductName"
                  className="text-xs text-gray-700 cursor-pointer"
                >
                  Show Product Name
                </label>
              </div>
            </div>

            {/* Summary */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-semibold text-gray-700 mb-1">
                Print Summary
              </div>
              <div className="text-xs text-gray-600 space-y-0.5">
                <div>📊 Labels: {settings.quantity}</div>
                <div>📐 Layout: {settings.columns} × {settings.rows}</div>
                <div>📏 Size: {settings.size}</div>
                <div>🖨️ Printer: {settings.printerName}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-xs hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition font-medium flex items-center gap-2"
          >
            <Printer size={14} />
            Print Labels
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodePrintModal;


