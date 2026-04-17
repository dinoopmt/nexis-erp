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
  
  /**
   * Print HTML content
   * @param {string} html - HTML to print
   * @param {string} printerName - Printer device name (optional)
   * Returns: Promise<{ success, message }>
   */
  printHTML: (html, printerName) =>
    ipcRenderer.invoke("printer:print-html", html, printerName),
  
  /**
   * Print PDF file
   * @param {string} filePath - Path to PDF file
   * @param {string} printerName - Printer device name (optional)
   * Returns: Promise<{ success, message }>
   */
  printPDF: (filePath, printerName) =>
    ipcRenderer.invoke("printer:print-pdf", filePath, printerName),
  
  /**
   * Test print - Print a test page
   * @param {string} printerName - Printer device name (optional)
   * Returns: Promise<{ success, message }>
   */
  testPrint: (printerName) =>
    ipcRenderer.invoke("printer:test-print", printerName),

  /**
   * Listen for printer status changes
   */
  onStatusChange: (callback) => {
    ipcRenderer.on("printer:status-changed", (_, data) => callback(data));
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

// ================== EXPOSE API TO RENDERER ==================
// All communication is sandboxed and secure
contextBridge.exposeInMainWorld("electronAPI", {
  terminal: terminalAPI,
  printer: printerAPI,
  scanner: scannerAPI,
  file: fileAPI,
  window: windowAPI,
  storage: storageAPI,
  app: appAPI,
  
  // Utility to check if running in Electron
  isElectron: true,
  
  // Get all available APIs (for debugging)
  getAvailableAPIs: () => ({
    terminal: Object.keys(terminalAPI),
    printer: Object.keys(printerAPI),
    scanner: Object.keys(scannerAPI),
    file: Object.keys(fileAPI),
    window: Object.keys(windowAPI),
    storage: Object.keys(storageAPI),
    app: Object.keys(appAPI),
  }),
});

console.log("✅ Preload script loaded - electronAPI available to renderer");
