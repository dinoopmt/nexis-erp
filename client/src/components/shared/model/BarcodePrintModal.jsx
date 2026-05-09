import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "../../shared/Model";
import { showToast } from "../AnimatedCenteredToast.jsx";
import { Printer } from "lucide-react";
import { useTerminal } from "../../../context/TerminalContext";
import useDecimalFormat from "../../../hooks/useDecimalFormat";
import { API_URL } from "../../../config/config";

/**
 * BarcodePrintModal.jsx - Enhanced barcode printing functionality
 * Features:
 * - Unit variant barcode selection
 * - Multiple format options (Price Tag, Shelf Edge Label)
 * - Terminal-mapped printer display (barcode & shelf printer)
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
  const { terminalConfig } = useTerminal();
  const { formatNumber } = useDecimalFormat();

  const [settings, setSettings] = useState({
    quantity: 1,
    selectedBarcodeIndex: 0,
  });

  const [templates, setTemplates] = useState([]);
  const [barcodeTemplates, setBarcodeTemplates] = useState([]);
  const [shelfTemplates, setShelfTemplates] = useState([]);
  const [selectedBarcodeTemplate, setSelectedBarcodeTemplate] = useState(null);
  const [selectedShelfTemplate, setSelectedShelfTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Reset settings to default when modal opens
  useEffect(() => {
    if (isOpen) {
      setSettings({
        quantity: 1,
        selectedBarcodeIndex: 0,
      });
      // Set to first/default templates
      if (barcodeTemplates.length > 0) {
        const defaultBarcode =
          barcodeTemplates.find((t) => t.isDefault) || barcodeTemplates[0];
        setSelectedBarcodeTemplate(defaultBarcode._id);
      }
      if (shelfTemplates.length > 0) {
        const defaultShelf =
          shelfTemplates.find((t) => t.isDefault) || shelfTemplates[0];
        setSelectedShelfTemplate(defaultShelf._id);
      }
    }
  }, [isOpen, barcodeTemplates, shelfTemplates]);

  // Fetch barcode templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await axios.get(`${API_URL}/barcode-templates`);
        const allTemplates = response.data?.data || response.data || [];
        setTemplates(allTemplates);

        // Filter by template type
        const barcode = allTemplates.filter(
          (t) => t.templateType === "barcode_label",
        );
        const shelf = allTemplates.filter(
          (t) => t.templateType === "shelf_label",
        );
        setBarcodeTemplates(barcode);
        setShelfTemplates(shelf);

        // Set default selections
        if (barcode.length > 0) setSelectedBarcodeTemplate(barcode[0]._id);
        if (shelf.length > 0) setSelectedShelfTemplate(shelf[0]._id);
      } catch (err) {
        console.warn("Failed to fetch barcode templates:", err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, []);

  // Get terminal-mapped printers
  const barcodePrinter = terminalConfig?.hardwareMapping?.barcodePrinter;
  const shelfPrinter = terminalConfig?.hardwareMapping?.shelfLabelPrinter;

  // Get selected barcode and unit info
  const selectedBarcode = pricingLines[settings.selectedBarcodeIndex];
  const selectedBarcode_value = selectedBarcode?.barcode || barcode;
  const selectedUnit = selectedBarcode?.unit
    ? units.find((u) => String(u._id) === String(selectedBarcode.unit))
    : null;

  // Get selected template data
  const getSelectedBarcodeTemplate = () => {
    return barcodeTemplates.find((t) => t._id === selectedBarcodeTemplate);
  };

  const getSelectedShelfTemplate = () => {
    return shelfTemplates.find((t) => t._id === selectedShelfTemplate);
  };

  // Extract label size from template config (e.g., "SIZE 38 mm, 25 mm")
  const extractLabelSize = (configTxt) => {
    const sizeMatch = configTxt?.match(
      /SIZE\s+([\d.]+)\s*(\w+),\s*([\d.]+)\s*(\w+)/i,
    );
    if (sizeMatch) {
      return `${sizeMatch[1]} ${sizeMatch[2]} × ${sizeMatch[3]} ${sizeMatch[4]}`;
    }
    return "Size not specified";
  };

  // Extract variables from template config (e.g., {BARCODE}, {PRICE}, etc.)
  const extractVariables = (configTxt) => {
    const regex = /\{([A-Z_]+)\}/g;
    const matches = new Set();
    let match;
    while ((match = regex.exec(configTxt)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches).sort();
  };

  // Replace handlebars variables: {{BARCODE}}, {{ITEM_NAME}}, {{PRICE}}, {{LABEL_QUANTITY}}
  const replaceHandlebars = (rawTemplate, variables) => {
    let processed = rawTemplate;
    processed = processed.replace(/\{\{BARCODE\}\}/g, variables.barcode);
    processed = processed.replace(/\{\{ITEM_NAME\}\}/g, variables.itemName);
    processed = processed.replace(/\{\{PRICE\}\}/g, variables.price);
    processed = processed.replace(
      /\{\{LABEL_QUANTITY\}\}/g,
      variables.quantity,
    );
    return processed;
  };

  const handlePrint = async (labelType) => {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`🖨️  PRINT CLICKED: ${labelType.toUpperCase()}`);
    console.log(`${"═".repeat(60)}`);

    // Validate barcode selected
    if (!selectedBarcode_value) {
      showToast("error", "Please select a barcode to print");
      return;
    }

    // Determine template and printer based on label type
    let selectedTemplate = null;
    let selectedPrinterName = "";
    let templateId = null;

    if (labelType === "barcode") {
      if (!selectedBarcodeTemplate) {
        showToast("error", "Please select a barcode template");
        return;
      }
      templateId = selectedBarcodeTemplate;
      selectedTemplate = getSelectedBarcodeTemplate();
      if (!barcodePrinter?.enabled || !barcodePrinter?.printerName) {
        showToast("error", "Barcode printer not configured");
        return;
      }
      selectedPrinterName = barcodePrinter.printerName;
      console.log(`📦 Label Type: BARCODE`);
      console.log(`🖨️  Printer: ${selectedPrinterName}`);
    } else if (labelType === "shelf") {
      if (!selectedShelfTemplate) {
        showToast("error", "Please select a shelf template");
        return;
      }
      templateId = selectedShelfTemplate;
      selectedTemplate = getSelectedShelfTemplate();
      if (!shelfPrinter?.enabled || !shelfPrinter?.printerName) {
        showToast("error", "Shelf printer not configured");
        return;
      }
      selectedPrinterName = shelfPrinter.printerName;
      console.log(`🏷️  Label Type: SHELF`);
      console.log(`🖨️  Printer: ${selectedPrinterName}`);
    } else {
      showToast("error", "Invalid label type");
      return;
    }

    if (!selectedTemplate) {
      showToast("error", "Template not found");
      return;
    }

    try {
      // Get raw template command from the template object (already loaded)
      const rawTemplate = selectedTemplate?.configTxt;
      if (!rawTemplate) {
        showToast("error", "Template has no command data");
        return;
      }

      console.log(`📝 Template: ${selectedTemplate?.templateName}`);
      console.log(`📊 Raw template size: ${rawTemplate.length} bytes`);

      // Prepare variables for handlebars replacement
      const variables = {
        barcode: selectedBarcode_value,
        itemName: productName || "N/A",
        price:
          selectedBarcode?.price !== undefined
            ? formatNumber(selectedBarcode.price)
            : "N/A",
        quantity: settings.quantity,
      };

      console.log(`\n📋 Variables:`);
      console.log(`  {{BARCODE}}: ${variables.barcode}`);
      console.log(`  {{ITEM_NAME}}: ${variables.itemName}`);
      console.log(`  {{PRICE}}: ${variables.price}`);
      console.log(`  {{LABEL_QUANTITY}}: ${variables.quantity}`);

      // Replace handlebars in template
      const processedRawData = replaceHandlebars(rawTemplate, variables);

      console.log(`\n✅ Processed raw data: ${processedRawData.length} bytes`);
      console.log(`\n📄 FINAL RAW DATA TO PRINTER:`);
      console.log(`${"─".repeat(60)}`);
      console.log(processedRawData);
      console.log(`${"─".repeat(60)}\n`);

      // Send to Electron IPC
      console.log(`📱 Sending to Electron IPC: print:raw-thermal`);
      const result = await window.electronAPI.ipc.invoke("print:raw-thermal", {
        printerName: selectedPrinterName,
        rawData: processedRawData,
        quantity: settings.quantity,
      });

      if (result?.success) {
        console.log(`✅ Print successful: ${result.message}`);
        showToast(
          "success",
          `✅ Sent ${settings.quantity} ${labelType} label(s) to printer`,
        );
      } else {
        console.error(`❌ Print failed: ${result?.message}`);
        showToast("error", result?.message || "Print failed");
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      showToast("error", `Print error: ${error.message}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="max-w-4xl">
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
                    ? units.find((u) => String(u._id) === String(line.unit))
                    : null;
                  const unitName = unit?.unitName || `Unit ${idx}`;
                  const unitSymbol = unit?.unitSymbol || "";
                  return (
                    <option key={idx} value={idx}>
                      {idx === 0 ? "📦 Base Unit" : `📦 ${unitName}`} (
                      {unitSymbol})
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

            {/* Terminal-Mapped Printers Display */}
            <div className="flex flex-col gap-1.5 p-3 bg-green-50 border border-green-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                Terminal-Mapped Printers
              </label>

              <div className="space-y-2">
                {/* Barcode Printer */}
                <div className="p-2 bg-white border border-green-300 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-3 h-3 rounded-full ${barcodePrinter?.enabled ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <div className="text-xs font-semibold text-gray-700">
                      🖨️ Barcode Printer
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 ml-5">
                    {barcodePrinter?.enabled && barcodePrinter?.printerName ? (
                      <>
                        <div className="font-mono text-green-700">
                          {barcodePrinter.printerName}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          Status: Ready
                        </div>
                      </>
                    ) : (
                      <div className="text-red-600">Not Configured</div>
                    )}
                  </div>
                </div>

                {/* Shelf Label Printer */}
                <div className="p-2 bg-white border border-green-300 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-3 h-3 rounded-full ${shelfPrinter?.enabled ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <div className="text-xs font-semibold text-gray-700">
                      🏷️ Shelf Label Printer
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 ml-5">
                    {shelfPrinter?.enabled && shelfPrinter?.printerName ? (
                      <>
                        <div className="font-mono text-green-700">
                          {shelfPrinter.printerName}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">
                          Status: Ready
                        </div>
                      </>
                    ) : (
                      <div className="text-orange-600">Not Configured</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Template Preview */}
          <div className="col-span-1 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase">
              Label Preview
            </label>
            <div className="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-4 flex flex-col items-center justify-center flex-1 min-h-96">
              {/* Show only values */}
              {(selectedBarcodeTemplate || selectedShelfTemplate) &&
                selectedBarcode &&
                (() => {
                  const itemName = productName || "N/A";
                  const barcode =
                    selectedBarcode?.barcode || selectedBarcode_value || "N/A";
                  const priceValue = selectedBarcode?.price;
                  const price =
                    priceValue !== undefined &&
                    priceValue !== null &&
                    priceValue !== ""
                      ? priceValue
                      : "N/A";
                  const unitSymbol = selectedUnit?.unitSymbol || "PC";

                  return (
                    <div className="bg-white border-2 border-blue-300 rounded-lg p-6 w-full max-w-sm">
                      <div className="flex flex-col items-center justify-center gap-4">
                        {/* Item Name */}
                        <div className="text-base text-sm font-bold text-gray-800 text-center break-words">
                          {itemName}
                        </div>

                        {/* Barcode / Price / Unit in one line */}
                        <div className="text-sm font-bold text-blue-700 text-center space-y-1">
                          <div>{unitSymbol}</div>
                          <div>{barcode}</div>
                          <div className="flex justify-center gap-3">
                            <span>
                              Price:{" "}
                              {price === "N/A" ? "N/A" : formatNumber(price)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* No Template Selected */}
              {!selectedBarcodeTemplate && !selectedShelfTemplate && (
                <div className="text-center text-gray-500 text-xs">
                  Select a template above to preview label
                </div>
              )}

              {/* No Barcode Selected */}
              {(selectedBarcodeTemplate || selectedShelfTemplate) &&
                !selectedBarcode && (
                  <div className="text-center text-gray-500 text-xs">
                    Select a barcode above to see preview
                  </div>
                )}
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="col-span-1 flex flex-col gap-3">
            {/* Barcode Label Template Selection */}
            <div className="flex flex-col gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                📦 Barcode Label Template
              </label>
              <select
                value={selectedBarcodeTemplate || ""}
                onChange={(e) => setSelectedBarcodeTemplate(e.target.value)}
                disabled={loadingTemplates || barcodeTemplates.length === 0}
                className="border border-blue-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
              >
                <option value="">Select Template...</option>
                {barcodeTemplates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.templateName} {template.isDefault ? "⭐" : ""}
                  </option>
                ))}
              </select>
              {barcodeTemplates.length === 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  No barcode templates found
                </div>
              )}
            </div>

            {/* Shelf Label Template Selection */}
            <div className="flex flex-col gap-1.5 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="text-xs font-bold text-gray-700 uppercase">
                📋 Shelf Label Template
              </label>
              <select
                value={selectedShelfTemplate || ""}
                onChange={(e) => setSelectedShelfTemplate(e.target.value)}
                disabled={loadingTemplates || shelfTemplates.length === 0}
                className="border border-yellow-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white disabled:bg-gray-100"
              >
                <option value="">Select Template...</option>
                {shelfTemplates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.templateName} {template.isDefault ? "⭐" : ""}
                  </option>
                ))}
              </select>
              {shelfTemplates.length === 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  No shelf templates found
                </div>
              )}
            </div>

            {/* Print Quantity */}
            <div className="grid grid-cols-2 gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="text-xs font-semibold text-gray-700">
                 Label Quantity
              </label>
              <input
                type="number"
                max="1000"
                value={settings.quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setSettings({
                      ...settings,
                      quantity: "",
                    });
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num > 0) {
                      setSettings({
                        ...settings,
                        quantity: num,
                      });
                    }
                  }
                }}
                onBlur={(e) => {
                  if (
                    e.target.value === "" ||
                    parseInt(e.target.value) < 1
                  ) {
                    setSettings({
                      ...settings,
                      quantity: 1,
                    });
                  }
                }}
                className="border border-red-500 rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => handlePrint("barcode")}
            disabled={!selectedBarcodeTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            Barcode Labels
          </button>
          <button
            onClick={() => handlePrint("shelf")}
            disabled={!selectedShelfTemplate}
            className="px-4 py-2 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            Shelf Labels
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodePrintModal;
