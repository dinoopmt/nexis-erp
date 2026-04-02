/**
 * GlobalBarcodePrintModal.jsx
 * Enhanced modal for local printer communication with template-based printing
 * Integrates with Electron IPC for direct printer access
 */

import React, { useState, useEffect } from "react";
import Modal from "../shared/Model";
import { showToast } from "../shared/AnimatedCenteredToast.jsx";
import { Printer, Send, Loader } from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config/config";

/**
 * GlobalBarcodePrintModal Component
 * Template-based barcode printing with Electron IPC
 * Props:
 *   - isOpen: Boolean to show/hide modal
 *   - onClose: Function to call when closing
 *   - products: Array of products to print [(name, barcode, price, etc)]
 */
const GlobalBarcodePrintModal = ({ isOpen, onClose, products = [] }) => {
  const [printerConfigs, setPrinterConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("NETWORK");
  const [printerAddress, setPrinterAddress] = useState("localhost:9100");

  // Check if Electron is available
  const isElectron = window.electronAPI || typeof window.electron !== "undefined";
  const electronAPI = window.electronAPI || window.electron;

  /**
   * Fetch printer configurations from backend
   */
  useEffect(() => {
    if (isOpen) {
      fetchPrinterConfigurations();
      discoverAvailablePrinters();
    }
  }, [isOpen]);

  const fetchPrinterConfigurations = async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${API_URL}/settings/printer-configurations`);

      if (response.data.success) {
        setPrinterConfigs(response.data.data);

        // Select first config by default
        if (response.data.data.length > 0) {
          setSelectedConfig(response.data.data[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching printer configurations:", error);
      showToast('error', "Failed to load printer configurations");
    } finally {
      setIsFetching(false);
    }
  };

  /**
   * Discover available printers via Electron IPC
   */
  const discoverAvailablePrinters = async () => {
    if (!isElectron) {
      console.warn("[MODAL] Electron not available, using default printer");
      return;
    }

    try {
      const result = await electronAPI.invoke("app:get-available-printers");

      if (result.success && result.data && result.data.length > 0) {
        setAvailablePrinters(result.data);
        console.log("[MODAL] Discovered printers:", result.data);
      }
    } catch (error) {
      console.warn("[MODAL] Printer discovery failed:", error);
    }
  };

  /**
   * Handle print action
   */
  const handlePrint = async () => {
    try {
      if (!selectedConfig) {
        showToast('error', "Please select a printer template");
        return;
      }

      if (!products || products.length === 0) {
        showToast('error', "No products to print");
        return;
      }

      if (quantity < 1 || !Number.isInteger(parseInt(quantity))) {
        showToast('error', "Quantity must be a positive integer");
        return;
      }

      setLoading(true);

      // Print for each product
      for (const product of products) {
        await printProduct(product);
      }

      showToast('success', `Successfully sent print command for ${products.length} product(s)`);

      onClose();
    } catch (error) {
      console.error("Print error:", error);
      showToast('error', error.message || "Failed to print");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Print single product
   */
  const printProduct = async (product) => {
    try {
      // Get prepared print command from backend
      const response = await axios.post(
        `${API_URL}/settings/printer-configurations/${selectedConfig}/prepare-print`,
        {
          product,
          quantity: parseInt(quantity),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to prepare print command");
      }

      const { command } = response.data.data;

      // Send to Electron IPC if available
      if (isElectron && electronAPI) {
        const result = await electronAPI.invoke("app:print-barcode", {
          command,
          printerType: selectedPrinter,
          printerAddress,
          quantity: parseInt(quantity),
        });

        if (!result.success) {
          throw new Error(result.message || "Electron print failed");
        }

        console.log(`[PRINT SUCCESS] ${product.name}:`, result.message);
      } else {
        console.warn("[PRINT] Electron not available, command prepared:");
        console.log(command);
        showToast('info', "Electron not available. Command prepared in console.");
      }
    } catch (error) {
      console.error(`Error printing ${product.name}:`, error);
      throw error;
    }
  };

  const selectedConfigData = printerConfigs.find((c) => c._id === selectedConfig);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="max-w-2xl">
      <div className="bg-white rounded-lg p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b pb-4">
          <Printer size={24} className="text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">🖨️ Barcode Print</h2>
            <p className="text-xs text-gray-500">
              {products.length} product(s) selected for printing
            </p>
          </div>
        </div>

        {/* Loading */}
        {isFetching && (
          <div className="flex items-center justify-center py-6">
            <Loader size={24} className="animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading printer configurations...</span>
          </div>
        )}

        {!isFetching && printerConfigs.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ No printer configurations found. Please add configurations in General Settings →
              Printer Configuration.
            </p>
          </div>
        )}

        {!isFetching && printerConfigs.length > 0 && (
          <>
            {/* Printer Configuration Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">📋 Printer Template</label>
              <select
                value={selectedConfig || ""}
                onChange={(e) => setSelectedConfig(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">Select a printer template...</option>
                {printerConfigs.map((config) => (
                  <option key={config._id} value={config._id}>
                    {config.legends} ({config.printerModel})
                  </option>
                ))}
              </select>

              {selectedConfigData && (
                <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
                  <p className="font-semibold">Template Details:</p>
                  <p>Label Size: {selectedConfigData.labelWidth}mm × {selectedConfigData.labelHeight}mm</p>
                  <p>Variables: {selectedConfigData.variables?.join(", ") || "None"}</p>
                </div>
              )}
            </div>

            {/* Printer Type Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">🖥️ Printer Type</label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="NETWORK">Network Printer (TCP/IP)</option>
                <option value="SERIAL">Serial Port (COM)</option>
                <option value="USB">USB Printer</option>
              </select>
            </div>

            {/* Printer Address/Port */}
            {selectedPrinter === "NETWORK" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">🌐 Printer Address</label>
                <input
                  type="text"
                  value={printerAddress}
                  onChange={(e) => setPrinterAddress(e.target.value)}
                  placeholder="e.g., 192.168.1.100:9100 or localhost:9100"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-xs text-gray-500">Format: hostname:port (default port: 9100)</p>
              </div>
            )}

            {selectedPrinter === "SERIAL" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">⚙️ Serial Port</label>
                {availablePrinters.length > 0 ? (
                  <select
                    value={printerAddress}
                    onChange={(e) => setPrinterAddress(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    {availablePrinters
                      .filter((p) => p.type === "SERIAL")
                      .map((p) => (
                        <option key={p.path} value={p.path}>
                          {p.name} - {p.description}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={printerAddress}
                    onChange={(e) => setPrinterAddress(e.target.value)}
                    placeholder="e.g., COM1, COM3, /dev/ttyUSB0"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700"># Quantity per Product</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <p className="text-xs text-gray-500">
                Total labels: {products.length} product(s) × {quantity} label(s) = {products.length * quantity} labels
              </p>
            </div>

            {/* Preview Section */}
            {selectedConfigData && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">📝 Print Preview (First 200 chars):</p>
                <div className="bg-white p-2 rounded text-xs text-gray-600 font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                  {selectedConfigData.configTxt.substring(0, 200)}...
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition disabled:opacity-50 font-medium text-sm"
          >
            Cancel
          </button>
          {printerConfigs.length > 0 && (
            <button
              onClick={handlePrint}
              disabled={loading || !selectedConfig || printerConfigs.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium text-sm"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send to Printer
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default GlobalBarcodePrintModal;
