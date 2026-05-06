const { contextBridge, ipcRenderer } = require("electron");

/**
 * Preload script - Secure bridge between React UI and Electron Main
 * 
 * This creates a secure window.electronAPI object that the React app can use
 * Only the methods defined here are exposed to the renderer process
 * All communication goes through IPC (Inter-Process Communication)
 * 
 * Security: contextIsolation: true prevents direct access to Node.js APIs
 */

// ================== TERMINAL API ==================
// Exposes terminal configuration and identification
const terminalAPI = {
  /**
   * Get terminal configuration loaded on startup
   * This includes terminalId, branch, API base URL, etc.
   */
  getConfig: () => ipcRenderer.invoke("terminal:get-config"),
  
  /**
   * Get terminal identity headers for API requests
   * Returns { terminalId, timestamp }
   * Store info will be fetched from backend on login
   */
  getIdentityHeaders: () => ipcRenderer.invoke("terminal:get-identity-headers"),
  
  /**
   * Get current terminal ID
   */
  getTerminalId: () => ipcRenderer.invoke("terminal:get-id"),
  
  /**
   * Get API base URL
   */
  getApiUrl: () => ipcRenderer.invoke("terminal:get-api-url"),

  /**
   * Get debug information
   */
  debugInfo: () => ipcRenderer.invoke("app:get-debug-info"),
};

// ================== PRINTER API ==================
// Hardware-level printer operations
const printerAPI = {
  /**
   * Get list of available printers
   * Returns: Promise<Array<{ name, isDefault }>>
   */
  getPrinters: () => ipcRenderer.invoke("printer:get-list"),
  
  /**
   * Get currently configured printer
   * Returns: Promise<{ name, type }>
   */
  getConfigured: () => ipcRenderer.invoke("printer:get-configured"),

  // [DEPRECATED] Old printer APIs - replaced by sendPrintPdf
  // OLD: printHTML() - REMOVED (use sendPrintPdf instead)
  // OLD: printPDF() - REMOVED (use sendPrintPdf instead)
  // OLD: testPrint() - REMOVED (use sendPrintPdf for testing)
  
  /**
   * Listen for printer status changes
   */
  onStatusChange: (callback) => {
    ipcRenderer.on("printer:status-changed", (_, data) => callback(data));
  },

  /**
   * Send PDF buffer to print (one-way, no response)
   * Used for local client printer printing
   * @param {ArrayBuffer} pdfBuffer - PDF file as ArrayBuffer
   * @param {string} printerName - Local printer name
   * @param {string} documentName - Document name for temp file
   */
  sendPrintPdf: (pdfBuffer, printerName, documentName) => {
    ipcRenderer.send("print-pdf", {
      pdfBuffer,
      printerName,
      documentName,
    });
  },
};

// ================== SCANNER API ==================
// Hardware-level scanner operations
const scannerAPI = {
  /**
   * Check if scanner is available
   * Returns: Promise<boolean>
   */
  isAvailable: () => ipcRenderer.invoke("scanner:is-available"),
  
  /**
   * Start listening to scanner input
   * Emits as keyboard input by default (USB scanners act as HID devices)
   */
  startListening: () => ipcRenderer.invoke("scanner:start-listening"),
  
  /**
   * Stop listening to scanner input
   */
  stopListening: () => ipcRenderer.invoke("scanner:stop-listening"),
  
  /**
   * Listen for barcode scans
   * Callback receives: { barcode, timestamp, scannerId }
   */
  onBarcodeScan: (callback) => {
    ipcRenderer.on("scanner:barcode-scanned", (_, data) => callback(data));
  },
};

// ================== FILE SYSTEM API ==================
// Restricted file system access for printing, exports, etc.
const fileAPI = {
  /**
   * Save file to user's Documents folder
   * @param {string} filename - File name
   * @param {Buffer} data - File content
   * Returns: Promise<{ success, filePath }>
   */
  saveFile: (filename, data) =>
    ipcRenderer.invoke("file:save", filename, data),
  
  /**
   * Open file dialog and read selected file
   * @param {Array<string>} filters - File type filters (e.g., ['pdf', 'txt'])
   * Returns: Promise<{ success, filePath, content }>
   */
  openFile: (filters) =>
    ipcRenderer.invoke("file:open", filters),
  
  /**
   * Get application data directory for storing user files
   * Returns: Promise<string>
   */
  getDataDirectory: () =>
    ipcRenderer.invoke("file:get-data-directory"),
};

// ================== WINDOW API ==================
// Window management operations
const windowAPI = {
  /**
   * Get current window dimensions
   * Returns: Promise<{ width, height }>
   */
  getSize: () => ipcRenderer.invoke("window:get-size"),
  
  /**
   * Minimize window
   */
  minimize: () => ipcRenderer.send("window:minimize"),
  
  /**
   * Maximize window
   */
  maximize: () => ipcRenderer.send("window:maximize"),
  
  /**
   * Close window
   */
  close: () => ipcRenderer.send("window:close"),
};

// ================== STORAGE API ==================
// Persistent storage for terminal configuration
const storageAPI = {
  /**
   * Get value from persistent storage
   * @param {string} key
   * Returns: Promise<any>
   */
  get: (key) => ipcRenderer.invoke("storage:get", key),
  
  /**
   * Set value in persistent storage
   * @param {string} key
   * @param {any} value
   * Returns: Promise<void>
   */
  set: (key, value) => ipcRenderer.invoke("storage:set", key, value),
  
  /**
   * Remove value from storage
   * @param {string} key
   */
  remove: (key) => ipcRenderer.invoke("storage:remove", key),
  
  /**
   * Clear all storage
   */
  clear: () => ipcRenderer.invoke("storage:clear"),
};

// ================== HARDWARE API ==================
// Local system hardware detection (printers, COM ports, etc.)
// Only available in Electron - for direct hardware communication
const hardwareAPI = {
  /**
   * Get list of available COM ports / Serial devices
   * Returns: Promise<Array<{ path, manufacturer?, serialNumber?, productId?, vendorId? }>>
   */
  getComPorts: () => ipcRenderer.invoke("hardware:get-com-ports"),
  
  /**
   * Get list of available printers
   * Returns: Promise<Array<{ name, displayName, isDefault, type }>>
   */
  getPrinters: () => ipcRenderer.invoke("hardware:get-printers"),
  
  /**
   * Combined method to get all hardware devices at once
   * Returns: Promise<{ printers: [...], comPorts: [...], debug: [...], error: null }>
   */
  getAllDevices: async () => {
    try {
      console.log("\n📡 [PRELOAD] getAllDevices() called");
      console.log("📡 [PRELOAD] Invoking hardware:get-printers...");
      
      const printersResponse = await ipcRenderer.invoke("hardware:get-printers");
      
      console.log("📡 [PRELOAD] printersResponse received:");
      console.log("   Type:", typeof printersResponse);
      console.log("   Keys:", Object.keys(printersResponse));
      console.log("   Full object:", JSON.stringify(printersResponse, null, 2));
      console.log("   printers prop:", printersResponse.printers);
      console.log("   debug prop:", printersResponse.debug);
      console.log("   debug is array?", Array.isArray(printersResponse.debug));
      console.log("   error prop:", printersResponse.error);
      
      console.log("📡 [PRELOAD] Invoking hardware:get-com-ports...");
      const comPorts = await ipcRenderer.invoke("hardware:get-com-ports");
      console.log("📡 [PRELOAD] comPorts received:", comPorts.length, "ports");
      
      // Log all debug messages if available
      if (printersResponse.debug && Array.isArray(printersResponse.debug) && printersResponse.debug.length > 0) {
        console.log("🖨️  [PRELOAD] PRINTER DETECTION DEBUG OUTPUT:");
        printersResponse.debug.forEach((msg, i) => console.log(`   [${i}] ${msg}`));
      } else {
        console.warn("⚠️ [PRELOAD] No debug messages in response");
      }
      
      const result = { 
        printers: printersResponse.printers || [],
        comPorts: comPorts || [],
        debug: printersResponse.debug || [],
        error: printersResponse.error || null
      };
      
      console.log("📡 [PRELOAD] Final result object:", result);
      console.log("═══════════════════════════════════════════════════════\n");
      return result;
    } catch (error) {
      console.error("❌ [PRELOAD] Error getting hardware devices:", error);
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      return { printers: [], comPorts: [], debug: [`❌ Error: ${error.message}`], error: error.message };
    }
  },
};

// ================== APP API ==================
// Application-level operations
const appAPI = {
  /**
   * Get application version
   */
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  
  /**
   * Get application environment (dev/prod)
   */
  getEnvironment: () => ipcRenderer.invoke("app:get-environment"),
  
  /**
   * Check for updates
   */
  checkForUpdates: () => ipcRenderer.invoke("app:check-updates"),
  
  /**
   * Listen for app update available event
   */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("app:update-available", (_, data) => callback(data));
  },
};

// ================== DEVICE FINGERPRINTING API ==================
// Device-based Terminal ID generation and validation
const deviceAPI = {
  /**
   * Get or create device fingerprint
   * Stored locally to ensure consistency across sessions
   * Returns: Promise<string> - Device fingerprint (DEVICE-ABC123DEF456)
   */
  getFingerprint: () => ipcRenderer.invoke("device:getFingerprint"),
  
  /**
   * Generate Terminal ID for new terminal on this device
   * Prevents accidental duplicate IDs across different devices
   * @param {number} terminalNumber - Terminal number (1, 2, 3...)
   * Returns: Promise<string> - Terminal ID (TERM-ABC123DEF456-001)
   */
  generateTerminalId: (terminalNumber = 1) =>
    ipcRenderer.invoke("device:generateTerminalId", terminalNumber),
  
  /**
   * Validate that Terminal ID belongs to this device
   * Used to prevent importing terminals from other devices
   * @param {string} terminalId - Terminal ID to validate
   * Returns: Promise<boolean> - true if valid for this device
   */
  validateTerminalId: (terminalId) =>
    ipcRenderer.invoke("device:validateTerminalId", terminalId),
  
  /**
   * Get device configuration including fingerprint and terminal count
   * Returns: Promise<{ deviceFingerprint, lastUpdated, terminalCount }>
   */
  getConfig: () => ipcRenderer.invoke("device:getConfig"),
};

// ================== CONFIG API ==================
// Configuration file management
const configAPI = {
  /**
   * Update terminal configuration file
   * @param {object} newValues - Values to update (terminalType, terminalId, etc)
   * @returns {Promise<{success: boolean, config?: object, error?: string}>}
   */
  updateConfig: (newValues) => ipcRenderer.invoke("config:update-config", newValues),
};

// ================== PDF API ==================
// PDF printing and handling
const pdfAPI = {
  /**
   * ✅ BEST: Print A4 invoice using HTML silent print (BrowserWindow approach)
   * This is the production-grade approach for ERP systems
   * 
   * @param {string} invoiceId - Invoice ID to print
   * @param {string} templateId - Template ID for rendering
   * @param {string} terminalId - Terminal ID for store-specific header
   * @param {string} printerName - Printer name from terminal settings
   * @param {string} apiUrl - API base URL
   * Returns: Promise<{ success, message }>
   */
  // ⚠️ DEPRECATED: Old handlers removed
  // Use new dual printing system with usePrint hook instead
  // The new system uses:
  //   - POST /api/v1/print/generate-a4-invoice-pdf for server-side PDF generation
  //   - window.ipcRenderer.send('print-a4-invoice') for Electron printing
};

// ================== EXPOSE API TO RENDERER ==================
// All communication is sandboxed and secure
contextBridge.exposeInMainWorld("electronAPI", {
  terminal: terminalAPI,
  printer: printerAPI,
  scanner: scannerAPI,
  file: fileAPI,
  hardware: hardwareAPI,
  window: windowAPI,
  storage: storageAPI,
  app: appAPI,
  device: deviceAPI,
  config: configAPI,
  pdf: pdfAPI,
  
  // Utility to check if running in Electron
  isElectron: true,
  
  // Get all available APIs (for debugging)
  getAvailableAPIs: () => ({
    terminal: Object.keys(terminalAPI),
    printer: Object.keys(printerAPI),
    scanner: Object.keys(scannerAPI),
    file: Object.keys(fileAPI),
    hardware: Object.keys(hardwareAPI),
    file: Object.keys(fileAPI),
    window: Object.keys(windowAPI),
    storage: Object.keys(storageAPI),
    app: Object.keys(appAPI),
    device: Object.keys(deviceAPI),
    config: Object.keys(configAPI),
  }),
});

console.log("✅ Preload script loaded - electronAPI available to renderer");
