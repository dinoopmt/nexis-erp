/**
 * electron/main.js
 * Electron main process entry point
 * Initializes the application window and IPC handlers
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Import printer handlers
import('./electronPrinterHandler.js').then((module) => {
  module.initializePrinterHandlers();
  console.log('[MAIN] Printer IPC handlers initialized');
}).catch((error) => {
  console.error('[MAIN] Failed to initialize printer handlers:', error);
});

let mainWindow;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  // Load URL from dev server or built files
  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../client/dist/index.html')}`; // Production build

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log process info
  console.log(`[MAIN] Window created`);
  console.log(`[MAIN] Environment: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`[MAIN] Loading URL: ${startUrl}`);
}

/**
 * Handle app ready event
 */
app.on('ready', () => {
  console.log(`[MAIN] Electron app ready`);
  createWindow();
});

/**
 * Handle app closed on macOS
 */
app.on('window-all-closed', () => {
  // On macOS, keep app active until user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Handle app reactivated on macOS
 */
app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Handle any uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('[MAIN] Uncaught exception:', error);
});

/**
 * Log startup information
 */
console.log(`[MAIN] Electron version: ${app.getVersion()}`);
console.log(`[MAIN] Platform: ${process.platform}`);
console.log(`[MAIN] App path: ${app.getAppPath()}`);
