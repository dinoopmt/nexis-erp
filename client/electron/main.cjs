const { app, BrowserWindow, ipcMain, Menu, dialog, webContents, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { loadConfig, validateConfig } = require("./config-loader.cjs");

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

// ================== APP LIFECYCLE ==================
app.on("ready", () => {
  // Show splash immediately
  createSplash();

  // Load config and create main window
  initializeConfig();
  createWindow();
  setupIPC();
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

// ================== SETUP ALL IPC ==================
function setupIPC() {
  console.log("📡 Setting up IPC handlers...");
  setupTerminalIPC();
  setupPrinterIPC();
  setupScannerIPC();
  setupFileIPC();
  setupWindowIPC();
  setupStorageIPC();
  setupAppIPC();
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
