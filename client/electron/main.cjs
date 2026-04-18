const { app, BrowserWindow, ipcMain, Menu, dialog, webContents, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { loadConfig, validateConfig, updateConfig } = require("./config-loader.cjs");

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
 * Load configuration on app startup
 */
function initializeConfig() {
  try {
    terminalConfig = loadConfig();
    
    if (!validateConfig(terminalConfig)) {
      console.warn("⚠️ Config validation failed, using defaults");
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
  } catch (error) {
    console.error("❌ Config initialization failed:", error);
    app.quit();
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
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:5173"],
          styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:5173"],
          connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5173", "ws://localhost:5173"],
          imgSrc: ["'self'", "data:", "http:", "https:"],
          fontSrc: ["'self'", "data:"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
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
      
      // Set CSP headers (using system fonts - no internet required)
      const cspPolicy = isDev
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173; connect-src 'self' http://localhost:5000 http://localhost:5173 ws://localhost:5173; img-src 'self' data: http: https:; font-src 'self' data:; object-src 'none'; frame-src 'none';"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:5000; img-src 'self' data: https:; font-src 'self'; object-src 'none'; frame-src 'none'; upgrade-insecure-requests";
      
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

  // Load config and create main window
  initializeConfig();
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

// ================== IPC HANDLERS - PRINTER API ==================
function setupPrinterIPC() {
  // Get list of available printers
  ipcMain.handle("printer:get-list", async () => {
    try {
      if (!mainWindow) return [];
      
      const printers = await mainWindow.webContents.getPrinters();
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

  // Print HTML
  ipcMain.handle("printer:print-html", async (event, html, printerName) => {
    try {
      if (!mainWindow) return { success: false, message: "Window not available" };

      mainWindow.webContents.print(
        {
          silent: true,
          deviceName: printerName || undefined,
        },
        (success) => {
          if (!success) console.error("❌ Print failed");
        }
      );

      return { success: true, message: "Print job sent to printer" };
    } catch (error) {
      console.error("❌ Print error:", error);
      return { success: false, message: error.message };
    }
  });

  // Print PDF
  ipcMain.handle("printer:print-pdf", async (event, filePath, printerName) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, message: "File not found" };
      }

      mainWindow.webContents.print(
        {
          silent: true,
          deviceName: printerName || undefined,
        },
        (success) => {
          if (!success) console.error("❌ Print failed");
        }
      );

      return { success: true, message: "PDF print job sent to printer" };
    } catch (error) {
      console.error("❌ PDF print error:", error);
      return { success: false, message: error.message };
    }
  });

  // Test print
  ipcMain.handle("printer:test-print", async (event, printerName) => {
    try {
      console.log(`🖨️ Sending test print`);
      
      // In real implementation, you would print a test page
      return { success: true, message: "Test print job sent" };
    } catch (error) {
      console.error("❌ Test print error:", error);
      return { success: false, message: error.message };
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
  setupPrinterIPC();
  setupHardwareIPC();
  setupScannerIPC();
  setupFileIPC();
  setupWindowIPC();
  setupStorageIPC();
  setupAppIPC();
  await setupDeviceFingerprintIPC();
  console.log("✅ IPC handlers ready");
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
