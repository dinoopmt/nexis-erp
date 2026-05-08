const { app, BrowserWindow, ipcMain, Menu, dialog, webContents, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { loadConfig, validateConfig, updateConfig, verifyTerminalExists } = require("./config-loader.cjs");
const PdfGeneratorService = require("./services/PdfGeneratorService.cjs"); // ✅ PDF Generator Service

// ================== GLOBAL VARIABLES ==================
let mainWindow;
let splash;
let terminalConfig;
let isDev = process.env.NODE_ENV === "development";

// Disable default menu
Menu.setApplicationMenu(null);

// ================== SINGLE INSTANCE LOCK ==================
// Prevent multiple app instances
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ================== INITIALIZATION ==================
/**
 * Load configuration on app startup - STRICT VALIDATION
 * Returns true if config is valid, false otherwise
 */
function initializeConfig() {
  try {
    terminalConfig = loadConfig();
    const validation = validateConfig(terminalConfig);
    
    if (!validation.isValid) {
      console.error(`❌ CONFIG VALIDATION FAILED: ${validation.error}`);
      // Store error for splash screen to display
      global.configError = validation.error;
      return false;
    }
    
    console.log(`
  ╔════════════════════════════════════════════╗
  ║       NEXIS ERP - ELECTRON CLIENT          ║
  ╠════════════════════════════════════════════╣
  ║ Terminal ID: ${String(terminalConfig.terminalId).padEnd(26)} ║
  ║ API Base: ${String(terminalConfig.apiBaseUrl).padEnd(31)} ║
  ║ Environment: ${String(isDev ? "Development" : "Production").padEnd(27)} ║
  ╚════════════════════════════════════════════╝
  `);
    return true;
  } catch (error) {
    console.error("❌ Config initialization failed:", error);
    global.configError = `❌ CONFIG ERROR\n\n${error.message}`;
    return false;
  }
}

// ================== SPLASH SCREEN ==================
/**
 * Create and show splash screen (instant)
 */
function createSplash() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    resizable: false,
    show: true,
  });

  splash.loadFile(path.join(__dirname, "splash.html"));
  console.log("🎬 Splash screen shown");
}

// ================== WINDOW CREATION ==================
/**
 * Create main application window
 */
function createWindow() {
  let startUrl;
  let indexPath;

  if (isDev) {
    startUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    console.log("📱 Dev mode:", startUrl);
  } else {
    const resourcesPath = process.resourcesPath;
    const possiblePaths = [
      path.join(resourcesPath, "app.asar.unpacked/dist/index.html"),
      path.join(resourcesPath, "dist/index.html"),
      path.join(app.getAppPath(), "dist/index.html"),
      path.join(__dirname, "../dist/index.html"),
    ];

    indexPath = possiblePaths.find(fs.existsSync);

    if (!indexPath) {
      console.error("❌ FATAL: Could not find index.html");
      dialog.showErrorBox("Startup Error", "Application files not found. Please reinstall.");
      app.quit();
      return;
    }

    console.log("✅ Found index.html at:", indexPath);
  }

  // Create window (moved OUTSIDE the path logic)
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, "../assets/icon.png"),
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      v8CacheOptions: "code",
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "blob:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:5173"],
          styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:5173"],
          connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5173", "ws://localhost:5173"],
          imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
          fontSrc: ["'self'", "data:"],
          mediaSrc: ["'self'", "blob:"],
          objectSrc: ["'self'", "blob:"],
          frameSrc: ["'self'", "blob:", "data:"], // ✅ Allow blob: and data: for PDF iframes
          formAction: ["'self'"],
          upgradeInsecureRequests: isDev ? [] : ["'self'"],
        },
      },
    },
  });

  console.log("🚀 Loading UI from:", isDev ? startUrl : indexPath);
  
  if (isDev) {
    mainWindow.loadURL(startUrl).catch(err => {
      console.error("❌ Dev load failed:", err.message);
    });
  } else {
    // Use loadFile for production - it handles file:// correctly
    mainWindow.loadFile(indexPath).catch(err => {
      console.error("❌ Production load failed:", err.message);
    });
  }

  mainWindow.once("ready-to-show", () => {
    // Close splash screen
    if (splash && !splash.isDestroyed()) {
      splash.destroy();
      splash = null;
      console.log("✅ Splash screen closed");
    }

    // Show main window maximized
    mainWindow.show();
    mainWindow.maximize();
    console.log("✅ Main window displayed (maximized)");
  });

  // Enable DevTools for debugging
  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("crashed", () => {
    console.error("❌ Renderer crashed");
    dialog.showErrorBox("Error", "Application crashed. Please restart.");
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error(`❌ Load error: ${errorDescription} (Code: ${errorCode})`);
    dialog.showErrorBox("Load Error", errorDescription);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("✅ UI loaded successfully");
  });

  // ✅ Log API requests ONLY (not assets)
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["*://*/api/*"] },
    (details, callback) => {
      console.log(`📡 API Request: ${details.method} ${details.url}`);
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // ✅ Add CSP headers to responses
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      const headers = details.responseHeaders;
      const url = details.url;
      
      // Don't apply CSP to chrome-extension URLs (they manage their own security)
      if (url.startsWith('chrome-extension://')) {
        return callback({ responseHeaders: headers });
      }
      
      // Set CSP headers (using system fonts - no internet required)
      const cspPolicy = isDev
        ? "default-src 'self' chrome-extension:; script-src 'self' 'unsafe-inline' http://localhost:5173 chrome-extension:; style-src 'self' 'unsafe-inline' http://localhost:5173; connect-src 'self' http://localhost:5000 http://localhost:5173 ws://localhost:5173; img-src 'self' data: http: https:; font-src 'self' data:; object-src 'none'; frame-src 'none';"
        : "default-src 'self' chrome-extension:; script-src 'self' chrome-extension:; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:5000; img-src 'self' data: https:; font-src 'self'; object-src 'none'; frame-src 'none'; upgrade-insecure-requests";
      
      headers["content-security-policy"] = [cspPolicy];
      
      // Additional security headers
      headers["x-content-type-options"] = ["nosniff"];
      headers["x-frame-options"] = ["DENY"];
      headers["x-xss-protection"] = ["1; mode=block"];
      
      callback({ responseHeaders: headers });
    }
  );

  // ✅ Log API responses
  mainWindow.webContents.session.webRequest.onCompleted(
    { urls: ["*://*/api/*"] },
    (details) => {
      const status = details.statusCode;
      const emoji = status === 200 ? "✅" : status >= 400 ? "❌" : "⚠️";
      console.log(`${emoji} ${details.method} ${details.url.split("?")[0]} -> ${status}`);
    }
  );

  // ✅ Log API errors
  mainWindow.webContents.session.webRequest.onErrorOccurred(
    { urls: ["*://*/api/*"] },
    (details) => {
      console.error(`❌ API Error: ${details.method} ${details.url}`);
      console.error(`   Error: ${details.error}`);
    }
  );
}

// ================== SECURITY SETUP ==================
/**
 * Apply security best practices
 */
function setupSecurity() {
  // Disable navigation to external sites
  app.on("web-contents-created", (event, contents) => {
    contents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      // Only allow navigation to localhost in dev, file:// in prod
      if (isDev) {
        if (parsedUrl.origin !== "http://localhost:5173") {
          event.preventDefault();
          console.warn(`⚠️ Navigation blocked: ${navigationUrl}`);
        }
      } else {
        if (parsedUrl.protocol !== "file:") {
          event.preventDefault();
          console.warn(`⚠️ Navigation blocked: ${navigationUrl}`);
        }
      }
    });

    // Block external scripts
    contents.on("preload-error", (event, preloadPath, error) => {
      console.error(`❌ Preload error in ${preloadPath}:`, error);
    });
  });

  // Disable permission requests (camera, microphone, etc.)
  if (mainWindow) {
    mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      console.warn(`⚠️ Permission request denied: ${permission} from ${requestingOrigin}`);
      return false; // Deny all permissions
    });
  }

  console.log("🔒 Security measures applied");
}

// ================== APP LIFECYCLE ==================
app.on("ready", async () => {
  // Apply security first
  setupSecurity();
  
  // Show splash immediately
  createSplash();

  // Load and validate config - STRICT
  const configValid = initializeConfig();
  
  if (!configValid) {
    // Config validation failed - show error dialog (blocks until user clicks OK)
    console.error("❌ Config validation failed, showing error dialog");
    
    // Destroy splash window completely to ensure dialog appears on top
    if (splash && !splash.isDestroyed()) {
      splash.destroy();
    }
    
    // Show error dialog and wait for user to close it before quitting
    const configErrorPromise = dialog.showErrorBox(
      "Configuration Error",
      global.configError || "Configuration validation failed. Please fix the configuration file and restart the application."
    );
    
    if (configErrorPromise && typeof configErrorPromise.then === "function") {
      configErrorPromise.then(() => {
        console.log("User closed error dialog, quitting app");
        app.quit();
      }).catch(() => {
        app.quit();
      });
    } else {
      setTimeout(() => {
        app.quit();
      }, 100);
    }
    
    return;
  }
  
  // Verify terminal exists in database AND type matches
  console.log("🔒 Verifying terminal registration and type match...");
  const verification = await verifyTerminalExists(terminalConfig.terminalId, terminalConfig.terminalType, terminalConfig.apiBaseUrl);
  
  if (!verification.valid) {
    // Terminal verification failed - show error dialog
    console.error("❌ Terminal verification failed");
    
    // Destroy splash window
    if (splash && !splash.isDestroyed()) {
      splash.destroy();
    }
    
    // Show error dialog and handle response properly
    const errorPromise = dialog.showErrorBox(
      "Terminal Verification Error",
      verification.error || "Terminal verification failed. Please check your configuration."
    );
    
    // Handle promise if available, otherwise quit directly
    if (errorPromise && typeof errorPromise.then === "function") {
      errorPromise.then(() => {
        console.log("User closed error dialog, quitting app");
        app.quit();
      }).catch(() => {
        app.quit();
      });
    } else {
      // Fallback for older Electron versions
      setTimeout(() => {
        console.log("Error dialog closed, quitting app");
        app.quit();
      }, 100);
    }
    
    return;
  }
  
  // Config is valid and terminal verified - create main window
  createWindow();
  await setupIPC();
  // Menu disabled - using DevTools F12 instead
  // createMenu();
  
  // Register global keyboard shortcuts for debugging
  
  globalShortcut.register("Ctrl+Alt+D", () => {
    if (mainWindow) {
      console.log("\n╔════════════════════════════════════════════╗");
      console.log("║           DEBUG SHORTCUT (Ctrl+Alt+D)      ║");
      console.log("╠════════════════════════════════════════════╣");
      console.log(`║ Terminal ID: ${String(terminalConfig.terminalId).padEnd(30)} ║`);
      console.log(`║ API URL: ${String(terminalConfig.apiBaseUrl).padEnd(35)} ║`);
      console.log(`║ Environment: ${String(isDev ? "DEV" : "PROD").padEnd(31)} ║`);
      console.log("╚════════════════════════════════════════════╝\n");
    }
  });

  console.log("⌨️ Global shortcuts registered (Ctrl+Alt+D for debug)");
});

app.on("window-all-closed", () => {
  // macOS: keep app running even with no windows
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // macOS: re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

// ================== IPC HANDLERS - TERMINAL API ==================
function setupTerminalIPC() {
  // Get full configuration
  ipcMain.handle("terminal:get-config", () => {
    console.log("📝 Config requested:", terminalConfig);
    return terminalConfig;
  });

  // Get identity headers for API requests
  ipcMain.handle("terminal:get-identity-headers", () => {
    const headers = {
      "terminal-id": terminalConfig.terminalId,
      "timestamp": new Date().toISOString(),
      "client-version": app.getVersion(),
    };
    console.log("🔐 Identity headers:", headers);
    return headers;
  });

  // Get terminal ID only
  ipcMain.handle("terminal:get-id", () => {
    console.log("📱 Terminal ID requested:", terminalConfig.terminalId);
    return terminalConfig.terminalId;
  });

  // Get API base URL
  ipcMain.handle("terminal:get-api-url", () => {
    console.log("🌐 API URL requested:", terminalConfig.apiBaseUrl);
    return terminalConfig.apiBaseUrl;
  });

  // Debug endpoint - get full config for debugging
  ipcMain.handle("terminal:debug-info", () => {
    const debugInfo = {
      terminal: terminalConfig,
      environment: isDev ? "DEVELOPMENT" : "PRODUCTION",
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      userDataPath: app.getPath("userData"),
    };
    console.log("🔍 Debug Info:", JSON.stringify(debugInfo, null, 2));
    return debugInfo;
  });

  // Update configuration (terminal type or ID)
  ipcMain.handle("config:update-config", (event, newValues) => {
    try {
      console.log("🔄 Updating config with:", newValues);
      const success = updateConfig(newValues);
      
      if (success) {
        // Reload config in memory
        terminalConfig = loadConfig();
        console.log("✅ Config updated successfully");
        console.log(`   Terminal Type: ${terminalConfig.terminalType}`);
        console.log(`   Terminal ID: ${terminalConfig.terminalId}`);
        
        // Notify all windows about config update
        webContents.getAllWebContents().forEach(contents => {
          contents.send("config:updated", terminalConfig);
        });
        
        return { success: true, config: terminalConfig };
      } else {
        console.error("❌ Failed to update config");
        return { success: false, error: "Failed to write config file" };
      }
    } catch (error) {
      console.error("❌ Error updating config:", error.message);
      return { success: false, error: error.message };
    }
  });
}

// ================== IPC HANDLERS - PDF GENERATOR ==================
// ================== IPC HANDLERS - PRINTER API ==================
function setupPrinterIPC() {
  // Get list of available printers
  ipcMain.handle("printer:get-list", async () => {
    try {
      if (!mainWindow) return [];
      
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map(p => ({
        name: p.name,
        isDefault: p.isDefault,
        displayName: p.displayName,
      }));
    } catch (error) {
      console.error("❌ Error getting printers:", error);
      return [];
    }
  });

  // Get configured printer
  ipcMain.handle("printer:get-configured", () => {
    return {
      name: "Default Printer",  // Will be configured via backend
      type: "thermal",
    };
  });

  // [DEPRECATED] Old printer handlers - replaced by new print-pdf IPC event listener
  // These are kept commented for reference only, use the IPC event handler instead
  // OLD: ipcMain.handle("printer:print-html", ...) - REMOVED
  // OLD: ipcMain.handle("printer:print-pdf", ...) - REMOVED
  // OLD: ipcMain.handle("printer:test-print", ...) - REMOVED
}

// ================== IPC HANDLERS - RAW THERMAL PRINTER ==================
/**
 * Send raw thermal/barcode printer commands (EPL, ZPL, TSPL, etc)
 * Channel: print:raw-thermal
 * Input: { printerName, rawData, quantity }
 * Output: { success, method, message }
 * 
 * Usage:
 *   const result = await window.electronAPI.ipc.invoke('print:raw-thermal', {
 *     printerName: 'ZEBRA_TC25',
 *     rawData: '..EPL commands..',
 *     quantity: 1
 *   })
 */
function setupRawPrinterIPC() {
  ipcMain.handle('print:raw-thermal', async (event, data) => {
    const { printerName, rawData, quantity = 1 } = data;
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🖨️  [IPC] print:raw-thermal - Direct Printer Communication`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`  Printer: ${printerName}`);
    console.log(`  Quantity: ${quantity}`);
    console.log(`  Data size: ${rawData.length} bytes`);

    try {
      const path = require('path');
      const os = require('os');
      const fs = require('fs');
      const { exec } = require('child_process');

      // Create temp directory if not exists
      const tempDir = path.join(os.tmpdir(), 'nexis-printer');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Create temp file
      const tempFile = path.join(tempDir, `print-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, rawData, 'utf8');
      console.log(`  📄 Temp file: ${tempFile}`);

      // Try PowerShell Out-Printer (most reliable for local printers)
      return new Promise((resolve) => {
        // Escape file path for PowerShell
        const escapedFile = tempFile.replace(/\\/g, '\\\\');
        const psCmd = `powershell -NoProfile -Command "Get-Content -Path '${escapedFile}' -Raw | Out-Printer -Name '${printerName}'"`;
        console.log(`  🚀 Executing PowerShell Out-Printer command...`);

        exec(psCmd, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
          // Cleanup temp file after 2 seconds
          setTimeout(() => {
            try {
              fs.unlinkSync(tempFile);
              console.log(`  🗑️  Temp file cleaned up`);
            } catch (e) {
              console.warn(`  ⚠️  Failed to cleanup: ${e.message}`);
            }
          }, 2000);

          if (!error) {
            console.log(`  ✅ PowerShell Out-Printer successful`);
            console.log(`${'═'.repeat(60)}\n`);
            resolve({
              success: true,
              method: 'POWERSHELL_OUT_PRINTER',
              message: `Sent ${quantity} label(s) to ${printerName}`,
            });
          } else {
            // Fallback to direct copy to printer port (legacy method)
            console.log(`  ⚠️  PowerShell failed, trying direct COPY command fallback...`);
            console.log(`    Error: ${error.message}`);
            
            // Escape the file path for DOS copy command
            const dosCmd = `copy /b "${tempFile}" lpt1:`;
            console.log(`  🚀 Executing direct COPY to LPT1 fallback...`);
            
            exec(dosCmd, { shell: 'cmd.exe' }, (copyError) => {
              if (!copyError) {
                console.log(`  ✅ Direct COPY to LPT1 successful`);
                console.log(`${'═'.repeat(60)}\n`);
                resolve({
                  success: true,
                  method: 'COPY_LPT1',
                  message: `Sent ${quantity} label(s) to printer (LPT1 method)`,
                });
              } else {
                console.error(`  ❌ All methods failed`);
                console.error(`    PowerShell error: ${error.message}`);
                console.error(`    COPY LPT1 error: ${copyError.message}`);
                console.log(`${'═'.repeat(60)}\n`);
                resolve({
                  success: false,
                  method: 'NONE',
                  message: `Failed to send to printer. Try: 1) Install printer locally, 2) Enable printer sharing, 3) Use USB/Network direct connection`,
                });
              }
            });
          }
        });
      });

    } catch (error) {
      console.error(`  ❌ Exception: ${error.message}`);
      console.log(`${'═'.repeat(60)}\n`);
      return {
        success: false,
        method: 'ERROR',
        message: `Exception: ${error.message}`,
      };
    }
  });
}

// ================== IPC HANDLERS - PDF API (Printing) ==================
// ================== IPC HANDLERS - DUAL PRINTING SYSTEM ==================
/**
 * NEW PRINT HANDLERS for Dual A4 PDF + Thermal Receipt System
 */
function setupDualPrintingIPC() {
  // ============================================
  // 1. PRINT A4 INVOICE (PDF FROM BLOB)
  // ============================================
  ipcMain.on("print-a4-invoice", async (event, data) => {
    try {
      console.log(`\n${'═'.repeat(60)}`);
      console.log('📥 [IPC] print-a4-invoice - A4 Invoice PDF Printing');
      console.log(`${'═'.repeat(60)}`);
      console.log(`  invoiceId: ${data.invoiceId}`);
      console.log(`  terminalId: ${data.terminalId}`);

      const { BrowserWindow } = require('electron');

      // Create hidden window for PDF printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          sandbox: true,
        },
      });

      // Handle PDF blob
      const pdfBuffer = Buffer.from(data.pdfBlob);

      // Write PDF to temp file
      const tempPdfPath = path.join(os.tmpdir(), `invoice-${Date.now()}.pdf`);
      fs.writeFileSync(tempPdfPath, pdfBuffer);
      console.log(`✅ PDF written to temp: ${tempPdfPath}`);

      // Load PDF file
      await printWindow.webContents.loadFile(tempPdfPath);

      // Wait for content to load, then print
      printWindow.webContents.on('did-finish-load', () => {
        console.log('🖨️ Printing A4 invoice...');
        
        const printerName = data.printerName || 'default';
        const timeout = data.timeout || 5000;

        printWindow.webContents.print({
          silent: true,
          deviceName: printerName,
          pageSize: 'A4',
          margins: { marginType: 'none' },
          color: true,
        }, (success) => {
          console.log(success ? '✅ A4 Print job sent successfully' : '⚠️ Print job may have failed');
          
          // Cleanup
          setTimeout(() => {
            printWindow.close();
            try {
              fs.unlinkSync(tempPdfPath);
              console.log('🗑️ Temp PDF cleaned up');
            } catch (err) {
              console.warn('⚠️ Could not delete temp PDF:', err.message);
            }
          }, 1000);

          // Send response back to renderer
          event.sender.send('print-a4-invoice-response', {
            success: success,
            message: success ? 'Print job sent to A4 printer' : 'Print job failed',
            printerName: printerName,
          });
        });
      });

      printWindow.webContents.on('crashed', () => {
        console.error('❌ Print window crashed');
        event.sender.send('print-a4-invoice-response', {
          success: false,
          message: 'Print window crashed',
        });
      });

    } catch (error) {
      console.error('❌ A4 Print error:', error);
      event.sender.send('print-a4-invoice-response', {
        success: false,
        message: error.message,
      });
    }
  });

  // ============================================
  // 2. PRINT THERMAL RECEIPT (HTML DIRECT)
  // ============================================
  ipcMain.on("print-thermal-receipt", async (event, data) => {
    try {
      console.log(`\n${'═'.repeat(60)}`);
      console.log('📥 [IPC] print-thermal-receipt - Thermal Receipt Printing');
      console.log(`${'═'.repeat(60)}`);
      console.log(`  format: ${data.format}`);
      console.log(`  language: ${data.language}`);
      console.log(`  templateName: ${data.templateName}`);
      console.log(`  invoiceId: ${data.invoiceId}`);
      console.log(`  terminalId: ${data.terminalId}`);

      const { BrowserWindow } = require('electron');

      // Create hidden window for thermal receipt printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          sandbox: true,
        },
      });

      // Create HTML with CSS
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${data.templateName || 'Thermal Receipt'}</title>
            <style>
              ${data.css || ''}
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${data.html}
          </body>
        </html>
      `;

      // Write HTML to temp file
      const tempHtmlPath = path.join(os.tmpdir(), `receipt-${Date.now()}.html`);
      fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8');
      console.log(`✅ Thermal HTML written to temp: ${tempHtmlPath}`);

      // Load HTML file
      await printWindow.webContents.loadFile(tempHtmlPath);

      // Wait for content to load, then print
      printWindow.webContents.on('did-finish-load', () => {
        console.log('🖨️ Printing thermal receipt...');
        
        const printerName = data.printerName || 'default';
        const timeout = data.timeout || 3000;
        const format = data.format || '58mm';

        // Thermal printer options
        printWindow.webContents.print({
          silent: true,
          deviceName: printerName,
          pageSize: 'A5', // Thermal receipts use small page size
          margins: { marginType: 'none' },
          color: false, // Thermal usually black & white
          landscape: false,
        }, (success) => {
          console.log(success ? '✅ Thermal print job sent successfully' : '⚠️ Print job may have failed');
          
          // Cleanup
          setTimeout(() => {
            printWindow.close();
            try {
              fs.unlinkSync(tempHtmlPath);
              console.log('🗑️ Temp HTML cleaned up');
            } catch (err) {
              console.warn('⚠️ Could not delete temp HTML:', err.message);
            }
          }, 500);

          // Send response back to renderer
          event.sender.send('print-thermal-receipt-response', {
            success: success,
            message: success ? `Thermal receipt (${format}) sent to printer` : 'Thermal print job failed',
            format: format,
            printerName: printerName,
          });
        });
      });

      printWindow.webContents.on('crashed', () => {
        console.error('❌ Print window crashed');
        event.sender.send('print-thermal-receipt-response', {
          success: false,
          message: 'Print window crashed',
        });
      });

    } catch (error) {
      console.error('❌ Thermal print error:', error);
      event.sender.send('print-thermal-receipt-response', {
        success: false,
        message: error.message,
      });
    }
  });

  // ============================================
  // 3. PRINT PDF BUFFER (LOCAL CLIENT PRINTER)
  // ============================================
  /**
   * Handle print-pdf from renderer process
   * Client receives PDF from server and prints to local printer
   * 
   * Flow:
   * 1. Client requests PDF from server
   * 2. Server generates PDF and sends blob
   * 3. Client sends PDF buffer via IPC to main process
   * 4. Main process prints to local configured printer
   */
  ipcMain.on('print-pdf', async (event, data) => {
    try {
      const { pdfBuffer, printerName, documentName } = data;

      console.log(`\n${'═'.repeat(60)}`);
      console.log('📥 [IPC] print-pdf - Local Client Printer');
      console.log(`${'═'.repeat(60)}`);
      console.log(`  Document: ${documentName}`);
      console.log(`  Printer: ${printerName}`);
      console.log(`  Buffer size: ${pdfBuffer.byteLength} bytes`);

      if (!mainWindow || mainWindow.isDestroyed()) {
        console.error('❌ Main window not available');
        return;
      }

      if (!pdfBuffer || pdfBuffer.byteLength === 0) {
        console.error('❌ Invalid PDF buffer');
        return;
      }

      // Step 1: Save PDF buffer to temp file
      console.log(`📄 Step 1: Saving PDF to temp file...`);
      const tempDir = require('os').tmpdir();
      const tempFileName = `${documentName || 'document'}-${Date.now()}.pdf`;
      const tempFilePath = require('path').join(tempDir, tempFileName);
      
      // Handle both ArrayBuffer and Buffer inputs
      let buffer;
      if (pdfBuffer instanceof ArrayBuffer) {
        buffer = Buffer.from(pdfBuffer);
      } else if (Buffer.isBuffer(pdfBuffer)) {
        buffer = pdfBuffer;
      } else {
        buffer = Buffer.from(new Uint8Array(pdfBuffer));
      }
      
      require('fs').writeFileSync(tempFilePath, buffer);
      console.log(`✅ PDF saved: ${tempFilePath}`);
      console.log(`   File size: ${buffer.length} bytes`);
      
      // Verify file was written
      const stats = require('fs').statSync(tempFilePath);
      console.log(`✅ Verified file exists: ${stats.size} bytes`);

      // Step 2: Create hidden window for printing
      console.log(`📄 Step 2: Creating print window...`);
      const { BrowserWindow } = require('electron');
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          sandbox: true,
          plugins: false,  // IMPORTANT: Disable PDF viewer extension
        },
      });

      // BEST FIX: Use loadFile() instead of loadURL()
      // loadFile() bypasses extension loading and uses native Chromium handling
      console.log(`📄 Step 3: Loading PDF file (bypassing extension pipeline)...`);
      await printWindow.loadFile(tempFilePath);
      console.log(`✅ PDF file loaded successfully`);

      // Important render delay - ensures content is fully rendered before printing
      console.log(`📄 Step 4: Waiting for full render (500ms)...`);
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`📄 Step 5: Sending to printer: ${printerName || 'DEFAULT'}`);
      
      // Print with proper settings
      printWindow.webContents.print(
        {
          silent: true,
          deviceName: printerName || undefined,
          printBackground: true,
          margins: {
            marginType: 'none',
          },
        },
        (success, errorType) => {
          if (success) {
            console.log(`✅ Print job sent to printer: ${printerName}`);
          } else {
            console.error(`❌ Print job failed: ${errorType}`);
          }
          
          // Clean up: Close window after printing
          setTimeout(() => {
            if (!printWindow.isDestroyed()) {
              printWindow.close();
            }
            
            // Clean up temp file
            try {
              require('fs').unlinkSync(tempFilePath);
              console.log(`🧹 Cleaned up temp file`);
            } catch (err) {
              console.warn(`⚠️ Failed to delete temp file: ${err.message}`);
            }
          }, 500);
        }
      );

    } catch (error) {
      console.error('❌ PDF print error:', error);
      console.error('   Stack:', error.stack);
    }
  });
}

// ================== IPC HANDLERS - HARDWARE API (System Devices) ==================
function setupHardwareIPC() {
  // Get list of available COM ports / Serial devices
  ipcMain.handle("hardware:get-com-ports", async () => {
    try {
      // Try to use serialport if available, otherwise use common ports
      try {
        const { SerialPort } = require("serialport");
        const ports = await SerialPort.list();
        return ports.map(port => ({
          path: port.path,
          manufacturer: port.manufacturer,
          serialNumber: port.serialNumber,
          productId: port.productId,
          vendorId: port.vendorId,
        }));
      } catch (err) {
        // serialport not installed, return common ports with detection
        const commonPorts = ["COM1", "COM2", "COM3", "COM4", "LPT1"];
        if (process.platform === "linux") {
          commonPorts.splice(0, 5, "/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0");
        } else if (process.platform === "darwin") {
          commonPorts.splice(0, 5, "/dev/tty.usbserial-*", "/dev/cu.usbserial-*");
        }
        return commonPorts.map(port => ({ path: port }));
      }
    } catch (error) {
      console.error("❌ Error getting COM ports:", error);
      return [];
    }
  });

  // Get list of available printers
  ipcMain.handle("hardware:get-printers", async (event) => {
    const response = { printers: [], debug: [], error: null };
    
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('🖨️  [MAIN] PRINTER DETECTION STARTED');
    console.log('══════════════════════════════════════════════════════════');
    
    try {
      response.debug.push("🖨️ Attempting to detect printers via Electron API...");
      response.debug.push(`Platform: ${process.platform}`);
      response.debug.push(`mainWindow exists: ${!!mainWindow}`);
      
      console.log('[MAIN] Initial state:');
      console.log('   Platform:', process.platform);
      console.log('   mainWindow:', !!mainWindow);
      console.log('   response object:', response);
      
      if (!mainWindow) {
        response.debug.push("❌ mainWindow not available");
        response.error = "mainWindow not available";
        console.warn("⚠️ [MAIN] mainWindow not available");
        console.log('[MAIN] RETURNING (no mainWindow):', response);
        console.log('══════════════════════════════════════════════════════════\n');
        return response;
      }
      
      response.debug.push(`webContents exists: ${!!mainWindow.webContents}`);
      console.log('[MAIN] webContents:', !!mainWindow.webContents);
      
      // ✅ Use getPrintersAsync() - the correct Electron API
      response.debug.push("📡 Calling webContents.getPrintersAsync()...");
      console.log('[MAIN] Calling getPrintersAsync()...');
      
      let printers;
      try {
        printers = await mainWindow.webContents.getPrintersAsync();
        console.log('[MAIN] getPrintersAsync() succeeded');
      } catch (apiErr) {
        response.debug.push(`❌ getPrintersAsync() threw error: ${apiErr.message}`);
        response.error = apiErr.message;
        console.error('[MAIN] getPrintersAsync() error:', apiErr);
        printers = [];
      }
      
      response.debug.push(`✓ Result type: ${typeof printers}`);
      response.debug.push(`✓ Is array: ${Array.isArray(printers)}`);
      response.debug.push(`✓ Length: ${printers?.length || 0}`);
      
      console.log('[MAIN] Result:');
      console.log('   Type:', typeof printers);
      console.log('   Is array:', Array.isArray(printers));
      console.log('   Length:', printers?.length);
      if (printers && printers.length > 0) {
        console.log('   First printer:', JSON.stringify(printers[0], null, 2));
      }
      
      if (printers && printers.length > 0) {
        response.debug.push(`✅ Found ${printers.length} printer(s) via Electron API`);
        response.printers = printers.map(p => ({
          name: p.name || p.displayName,
          displayName: p.displayName || p.name || p,
          isDefault: p.isDefault,
          type: (p.name || p.displayName || '').toLowerCase().includes("label") ? "label" : "invoice",
        }));
        console.log('[MAIN] Mapped printers:');
        response.printers.forEach((p, i) => console.log(`   [${i}] ${p.displayName}`));
        console.log('[MAIN] RETURNING (printers found):', response);
        console.log('══════════════════════════════════════════════════════════\n');
        return response;
      }
      
      response.debug.push("⚠️ Electron API returned 0 printers");
      response.debug.push("🔍 Trying Windows PowerShell fallback...");
      console.log('[MAIN] No printers from API, trying PowerShell...');
      
      // Fallback for Windows
      if (process.platform === "win32") {
        try {
          const { execSync } = require("child_process");
          
          response.debug.push("💻 Executing PowerShell Get-Printer...");
          console.log('[MAIN] Executing PowerShell command...');
          
          try {
            const psExePath = "powershell.exe";
            const psCommand = 'Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name';
            
            const fullCmd = `"${psExePath}" -Command "${psCommand}"`;
            response.debug.push(`Executing: ${fullCmd}`);
            console.log('[MAIN] Command:', fullCmd);
            
            const psOutput = execSync(fullCmd, {
              encoding: "utf8",
              stdio: ["pipe", "pipe", "pipe"],
              shell: true,
              timeout: 10000,
              maxBuffer: 10 * 1024 * 1024
            });
            
            console.log('[MAIN] PowerShell output length:', psOutput.length);
            console.log('[MAIN] Output:', psOutput);
            
            if (psOutput && psOutput.trim()) {
              const printerNames = psOutput
                .split("\n")
                .map(line => line.trim())
                .filter(line => line && line.length > 0);
              
              response.debug.push(`✅ Found ${printerNames.length} printer(s) via PowerShell`);
              printerNames.forEach((name, i) => {
                response.debug.push(`   [${i}] "${name}"`);
              });
              
              console.log('[MAIN] Parsed printer names:', printerNames);
              
              response.printers = printerNames.map(name => ({
                name: name,
                displayName: name,
                isDefault: false,
                type: name.toLowerCase().includes("label") || name.toLowerCase().includes("zebra") ? "label" : "invoice",
              }));
              
              console.log('[MAIN] RETURNING (PowerShell success):', response);
              console.log('══════════════════════════════════════════════════════════\n');
              return response;
            } else {
              response.debug.push("⚠️ PowerShell returned empty output");
              console.log('[MAIN] PowerShell output was empty');
            }
          } catch (psErr) {
            response.debug.push(`❌ PowerShell error: ${psErr.message}`);
            console.log('[MAIN] PowerShell error:', psErr.message);
          }
          
        } catch (error) {
          response.debug.push(`❌ Windows fallback error: ${error.message}`);
          console.log('[MAIN] Windows fallback error:', error.message);
        }
      }
      
      response.debug.push("❌ All detection methods failed");
      console.log('[MAIN] RETURNING (all methods failed):', response);
      console.log('══════════════════════════════════════════════════════════\n');
      return response;
      
    } catch (error) {
      response.debug.push(`❌ EXCEPTION: ${error.message}`);
      response.debug.push(`Stack: ${error.stack}`);
      response.error = error.message;
      console.error("❌ [MAIN] EXCEPTION in printer handler:");
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      console.log('[MAIN] RETURNING (exception):', response);
      console.log('══════════════════════════════════════════════════════════\n');
      return response;
    }
  });
}

// ================== IPC HANDLERS - SCANNER API ==================
function setupScannerIPC() {
  // Check if scanner is available
  ipcMain.handle("scanner:is-available", () => {
    // USB scanners appear as HID keyboards
    // Return true - will be configured via backend
    return true;
  });

  // Start listening
  ipcMain.handle("scanner:start-listening", () => {
    console.log("🔍 Scanner listening started");
    return { success: true };
  });

  // Stop listening
  ipcMain.handle("scanner:stop-listening", () => {
    console.log("🔍 Scanner listening stopped");
    return { success: true };
  });

  // Note: Actual barcode detection happens through keyboard events
  // USB scanners act as HID devices and emit keyboard input
}

// ================== IPC HANDLERS - FILE API ==================
function setupFileIPC() {
  const dataDir = path.join(app.getPath("userData"), "terminal-data");

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save file
  ipcMain.handle("file:save", async (event, filename, data) => {
    try {
      const filePath = path.join(app.getPath("downloads"), filename);
      
      // Convert to buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      fs.writeFileSync(filePath, buffer);
      return { success: true, filePath };
    } catch (error) {
      console.error("❌ File save error:", error);
      return { success: false, message: error.message };
    }
  });

  // Open file
  ipcMain.handle("file:open", async (event, filters) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: filters?.map(ext => ({
          name: ext.toUpperCase(),
          extensions: [ext],
        })) || [],
      });

      if (result.canceled) {
        return { success: false, message: "Cancelled" };
      }

      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, "utf-8");

      return { success: true, filePath, content };
    } catch (error) {
      console.error("❌ File open error:", error);
      return { success: false, message: error.message };
    }
  });

  // Get data directory
  ipcMain.handle("file:get-data-directory", () => {
    return dataDir;
  });
}

// ================== IPC HANDLERS - WINDOW API ==================
function setupWindowIPC() {
  ipcMain.handle("window:get-size", () => {
    if (!mainWindow) return { width: 0, height: 0 };
    const [width, height] = mainWindow.getSize();
    return { width, height };
  });

  ipcMain.on("window:minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window:maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("window:close", () => {
    if (mainWindow) mainWindow.close();
  });
}

// ================== IPC HANDLERS - STORAGE API ==================
function setupStorageIPC() {
  const storageFile = path.join(app.getPath("userData"), "terminal-storage.json");
  let storageCache = {};
  let saveTimer;

  // Load storage on startup
  function loadStorage() {
    try {
      if (fs.existsSync(storageFile)) {
        storageCache = JSON.parse(fs.readFileSync(storageFile, "utf-8"));
        console.log("✅ Storage loaded from disk");
      }
    } catch (error) {
      console.error("❌ Storage load error:", error);
    }
    return storageCache;
  }

  // Save storage to disk with debounce (prevents rapid I/O for ERP)
  function saveStorage() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        fs.writeFileSync(storageFile, JSON.stringify(storageCache, null, 2));
        console.log("💾 Storage saved to disk");
      } catch (error) {
        console.error("❌ Storage save error:", error);
      }
    }, 200); // Debounce: 200ms
  }

  // Load on init
  loadStorage();

  ipcMain.handle("storage:get", (_, key) => {
    return storageCache[key];
  });

  ipcMain.handle("storage:set", (_, key, value) => {
    storageCache[key] = value;
    saveStorage();
    return true;
  });

  ipcMain.handle("storage:remove", (_, key) => {
    delete storageCache[key];
    saveStorage();
    return true;
  });

  ipcMain.handle("storage:clear", () => {
    storageCache = {};
    saveStorage();
    return true;
  });
}

// ================== IPC HANDLERS - APP API ==================
function setupAppIPC() {
  ipcMain.handle("app:get-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("app:get-environment", () => {
    return isDev ? "development" : "production";
  });

  ipcMain.handle("app:check-updates", () => {
    // Implement your update checking logic here
    return { available: false };
  });

  // Debug endpoint
  ipcMain.handle("app:get-debug-info", () => {
    return {
      terminal: terminalConfig,
      environment: isDev ? "DEVELOPMENT" : "PRODUCTION",
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      userDataPath: app.getPath("userData"),
    };
  });
}

// ================== IPC HANDLERS - DEVICE FINGERPRINTING API ==================
async function setupDeviceFingerprintIPC() {
  // ✅ Import electron-store as ES module
  const { default: Store } = await import("electron-store");
  const deviceUtils = require("./utils/deviceFingerprint.cjs");
  
  // Persistent store for device configuration
  const store = new Store({
    name: "device-config",
  });

  /**
   * Get or create device fingerprint
   * Stored locally to ensure consistency
   */
  ipcMain.handle("device:getFingerprint", () => {
    try {
      let fingerprint = store.get("deviceFingerprint");

      if (!fingerprint) {
        fingerprint = deviceUtils.generateDeviceFingerprint();
        store.set("deviceFingerprint", fingerprint);
        console.log("✅ New device fingerprint generated:", fingerprint);
      } else {
        console.log("✅ Device fingerprint retrieved:", fingerprint);
      }

      return fingerprint;
    } catch (error) {
      console.error("❌ Error getting device fingerprint:", error);
      return null;
    }
  });

  /**
   * Generate Terminal ID for new terminal
   * Prevents accidental duplicate IDs across devices
   */
  ipcMain.handle("device:generateTerminalId", (event, terminalNumber = 1) => {
    try {
      const terminalId = deviceUtils.generateTerminalId(terminalNumber);
      console.log("✅ Terminal ID generated:", terminalId);
      return terminalId;
    } catch (error) {
      console.error("❌ Error generating terminal ID:", error);
      return null;
    }
  });

  /**
   * Validate Terminal ID belongs to this device
   */
  ipcMain.handle("device:validateTerminalId", (event, terminalId) => {
    try {
      const parsed = deviceUtils.parseTerminalId(terminalId);
      if (!parsed) return false;

      const currentFingerprint = store.get("deviceFingerprint");
      if (!currentFingerprint) {
        // Generate and store if not exists
        const newFingerprint = deviceUtils.generateDeviceFingerprint();
        store.set("deviceFingerprint", newFingerprint);
        return parsed.deviceFingerprint === newFingerprint;
      }

      return parsed.deviceFingerprint === currentFingerprint;
    } catch (error) {
      console.error("❌ Error validating terminal ID:", error);
      return false;
    }
  });

  /**
   * Get device configuration
   */
  ipcMain.handle("device:getConfig", () => {
    try {
      let fingerprint = store.get("deviceFingerprint");
      if (!fingerprint) {
        fingerprint = deviceUtils.generateDeviceFingerprint();
        store.set("deviceFingerprint", fingerprint);
      }

      return {
        deviceFingerprint: fingerprint,
        lastUpdated: store.get("lastUpdated"),
        terminalCount: store.get("terminalCount", 0),
      };
    } catch (error) {
      console.error("❌ Error getting device config:", error);
      return null;
    }
  });

  console.log("✅ Device fingerprinting IPC handlers registered");
}

// ================== SETUP ALL IPC ==================
async function setupIPC() {
  console.log("📡 Setting up IPC handlers...");
  setupTerminalIPC();
  // ✅ NEW DUAL PRINTING SYSTEM: A4 PDF + Thermal Receipts
  setupDualPrintingIPC();
  setupPrinterIPC();
  setupRawPrinterIPC();
  setupHardwareIPC();
  setupScannerIPC();
  setupFileIPC();
  setupWindowIPC();
  setupStorageIPC();
  setupAppIPC();
  await setupDeviceFingerprintIPC();
  console.log("✅ IPC handlers ready (NEW DUAL PRINTING SYSTEM ACTIVE)");
}

// ================== APPLICATION MENU ==================
function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Redo", accelerator: "CmdOrCtrl+Y", role: "redo" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { role: "forceReload", accelerator: "CmdOrCtrl+Shift+R" },
        { role: "toggleDevTools", accelerator: "F12" },
        { type: "separator" },
        { role: "resetZoom", accelerator: "CmdOrCtrl+0" },
        { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { role: "zoomOut", accelerator: "CmdOrCtrl+-" },
      ],
    },
    {
      label: "Debug",
      submenu: [
        {
          label: "Show Config (F11)",
          accelerator: "F11",
          click: () => {
            if (mainWindow) {
              console.log("\n╔════════════════════════════════════════════╗");
              console.log("║         CURRENT CONFIGURATION               ║");
              console.log("╠════════════════════════════════════════════╣");
              console.log(`║ Terminal ID: ${String(terminalConfig.terminalId).padEnd(30)} ║`);
              console.log(`║ API URL: ${String(terminalConfig.apiBaseUrl).padEnd(35)} ║`);
              console.log(`║ Environment: ${String(isDev ? "DEVELOPMENT" : "PRODUCTION").padEnd(30)} ║`);
              console.log("╚════════════════════════════════════════════╝\n");
              mainWindow.webContents.executeJavaScript(`
                console.group('📝 NEXIS ERP Configuration');
                console.log('Terminal ID: ${terminalConfig.terminalId}');
                console.log('API Base URL: ${terminalConfig.apiBaseUrl}');
                console.log('Environment: ${isDev ? "DEVELOPMENT" : "PRODUCTION"}');
                console.groupEnd();
              `);
            }
          },
        },
        {
          label: "Check API Connection (F10)",
          accelerator: "F10",
          click: async () => {
            if (mainWindow) {
              console.log("\n🔌 Checking API connection...");
              const url = terminalConfig.apiBaseUrl;
              try {
                const response = await fetch(url + "/health", { timeout: 5000 });
                console.log(`✅ API Connection OK (${response.status})`);
                mainWindow.webContents.executeJavaScript(`
                  console.log('✅ API is reachable at ${url}');
                `);
              } catch (err) {
                console.error(`❌ API Connection Failed: ${err.message}`);
                mainWindow.webContents.executeJavaScript(`
                  console.error('❌ Cannot reach API at ${url}');
                  console.error('Error: ${err.message}');
                `);
              }
            }
          },
        },
        {
          label: "Get Debug Info",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript(`
                (async () => {
                  const debugInfo = await window.electronAPI?.terminal?.debugInfo?.() || {};
                  console.group('🔍 Debug Information');
                  console.log('Platform:', debugInfo.platform);
                  console.log('App Version:', debugInfo.appVersion);
                  console.log('Electron:', debugInfo.electronVersion);
                  console.log('Node:', debugInfo.nodeVersion);
                  console.log('Terminal:', debugInfo.terminal);
                  console.groupEnd();
                })()
              `);
            }
          },
        },
        { type: "separator" },
        {
          label: "Clear Cache",
          click: async () => {
            if (mainWindow) {
              await mainWindow.webContents.session.clearCache();
              console.log("✅ Cache cleared");
            }
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About NEXIS ERP",
              message: "NEXIS ERP - Enterprise POS System",
              detail: `Version: ${app.getVersion()}\nTerminal: ${terminalConfig.terminalId}\nAPI: ${terminalConfig.apiBaseUrl}`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { terminalConfig };
