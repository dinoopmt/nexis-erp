# NEXIS ERP - Enterprise Electron Architecture

## 🎯 Overview

This document describes the enterprise-grade Electron implementation for NEXIS ERP. The architecture follows industry best practices with:

- ✅ **Central MERN backend** - Single source of truth
- ✅ **Thin Electron clients** - No server bundled inside app
- ✅ **JSON configuration** - Terminal identity without rebuild
- ✅ **Multi-terminal support** - Same backend, different identities
- ✅ **Hardware integration** - Printers, scanners, POS devices
- ✅ **Security-first design** - Context isolation, sandbox mode

---

## 🧱 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│         🌐 CENTRAL MERN BACKEND                     │
│  ┌────────────────────────────────────────────┐    │
│  │ Node.js + Express + MongoDB               │    │
│  │ - RBAC + Multi-store support              │    │
│  │ - Validates terminal/store headers        │    │
│  │ - Centralized business logic              │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────┬──────────────────────────┘
                          │ HTTPS API
                          ▼
    ┌──────────────────────────────────────────┐
    │   📦 ELECTRON CLIENT (Thin Wrapper)     │
    ├──────────────────────────────────────────┤
    │  ┌─ main.js (Window + IPC)             │
    │  ├─ preload.js (Secure Bridge)         │
    │  ├─ config-loader.js (JSON Config)    │
    │  └─ React UI (Your existing app)       │
    └──────────────────────────────────────────┘
         │           │           │
         ▼           ▼           ▼
      🖨️ Printer  🔍 Scanner  💾 Storage
```

---

## 📁 Project Structure

```
client/
├── electron/                          ← Electron main process
│   ├── main.js                        ← Window creation + IPC handlers
│   ├── preload.js                     ← Secure API bridge
│   └── config-loader.js               ← Loads terminal.json
│
├── config/                            ← Configuration directory
│   └── terminal.json                  ← Terminal identity + settings
│
├── src/
│   ├── services/
│   │   ├── apiClient.js              ← Enhanced API with terminal headers
│   │   └── (other services)
│   ├── components/                    ← React components
│   ├── pages/                         ← Page components
│   └── App.jsx                        ← Main React app
│
├── package.json                       ← Scripts + build config
├── vite.config.js                     ← React build config
└── dist/                              ← Built React app (after npm run build)
```

---

## 🔑 Core Concepts

### 1. Terminal Identity

Each Electron instance has a **unique terminal identity** defined in `config/terminal.json`:

```json
{
  "terminal": {
    "terminalId": "TERM-001",
    "terminalName": "Cash Counter 1",
    "location": "Dubai Main Branch",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "https://api.yourerp.com"
  }
}
```

**Key Points:**
- `terminalId` - Unique identifier for this device
- `branch` - Store/branch this terminal belongs to
- `baseUrl` - API server URL (can change without rebuild!)

### 2. API Headers

Every API request automatically includes terminal identity:

```
GET /api/v1/products
Headers:
  terminal-id: TERM-001
  store-id: STORE-01
  client-timestamp: 2026-04-17T10:30:00Z
  client-version: 0.0.0
  Authorization: Bearer <jwt-token>
```

### 3. No Rebuild Strategy

Change server URL by editing JSON only:

```bash
# ✅ This works - NO REBUILD needed
{
  "api": {
    "baseUrl": "https://new-api.example.com"
  }
}
```

---

## ⚙️ Configuration File (`config/terminal.json`)

### Complete Reference

```json
{
  "terminal": {
    "terminalId": "TERM-001",
    "terminalName": "Cash Counter 1",
    "location": "Dubai Main Branch",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "https://api.yourerp.com",
    "timeout": 15000,
    "retryAttempts": 3,
    "retryDelay": 1000
  },
  "hardware": {
    "printer": {
      "enabled": true,
      "type": "thermal",
      "name": "XP-80C",
      "autoDetect": true
    },
    "scanner": {
      "enabled": true,
      "type": "usb",
      "autoDetect": true
    },
    "weighScale": {
      "enabled": false,
      "port": "COM3",
      "baudRate": 9600
    }
  },
  "ui": {
    "theme": "light",
    "language": "en",
    "currency": "AED",
    "autoSync": true,
    "offlineMode": true,
    "sessionTimeout": 3600000
  },
  "features": {
    "barcode": true,
    "invoicePrinting": true,
    "multiStore": true,
    "advancedReports": false,
    "paymentGateway": false
  }
}
```

### Field Descriptions

| Section | Field | Type | Purpose |
|---------|-------|------|---------|
| terminal | terminalId | string | Unique terminal identifier (required) |
| terminal | branch | string | Store/branch ID for isolation |
| api | baseUrl | string | Backend API URL (change without rebuild!) |
| api | timeout | number | Request timeout in ms |
| api | retryAttempts | number | Automatic retry on failure |
| hardware | printer.name | string | Printer device name for auto-detection |
| hardware | scanner.type | string | Scanner input method (usb = keyboard input) |
| ui | theme | string | UI theme: light/dark |
| ui | currency | string | Currency code for display |
| features | barcode | boolean | Enable/disable barcode features |

---

## 🚀 Development Setup

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Create Terminal Config

```bash
# Already created at: client/config/terminal.json
# Edit for your terminal:
{
  "terminal": {
    "terminalId": "TERM-DEV-001",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "http://localhost:5000"  ← Your backend server
  }
}
```

### 3. Run Development Mode

**Option A: Web Development (Without Electron)**

```bash
npm run dev
# Runs on http://localhost:5173
# Great for UI development
```

**Option B: Electron Development (With Hardware)**

```bash
npm run electron:dev-vite
# Requires: npm install concurrently wait-on
# Runs Vite dev server + Electron app
# Hot reload for React + Electron preload
```

**Option C: Electron Standalone

```bash
# First build React:
npm run build

# Then run Electron:
electron .
```

---

## 🏗️ Build & Deployment

### Build for Production

```bash
# Build React + Electron into .exe installer
npm run build:electron

# Output:
# dist-electron/
#   ├── NEXIS ERP Setup 0.0.0.exe   (NSIS installer)
#   └── NEXIS ERP-0.0.0-portable.exe (Portable)
```

### What Gets Packaged

✅ **Included:**
- React build (dist/)
- Electron files (electron/)
- Config file (config/terminal.json)
- Node modules (essential only)

❌ **NOT Included:**
- Server/backend code
- Database
- Business logic (stays on server)

### Deployment Steps

1. **Build on build server:**
   ```bash
   npm run build:electron
   ```

2. **Distribute installer:**
   - Share `.exe` file to users
   - Or use deployment service

3. **Update config without rebuild:**
   ```bash
   # Edit config file after installation
   # C:\Users\<user>\AppData\Local\NEXIS ERP\config\terminal.json
   {
     "api": {
       "baseUrl": "https://new-api.example.com"
     }
   }
   ```

---

## 🔐 Security Architecture

### Context Isolation (MOST IMPORTANT)

```javascript
// electron/main.js - SECURITY SETTINGS
webPreferences: {
  contextIsolation: true,      // ✅ Renderer can't access Node.js
  nodeIntegration: false,       // ✅ No require() in renderer
  sandbox: true,                // ✅ Sandboxed process
  preload: "preload.js"         // ✅ Controlled API exposure
}
```

### Preload Bridge

Preload script (`electron/preload.js`) is the **ONLY** way React can interact with Electron:

```javascript
// In React component
const config = await window.electronAPI.terminal.getConfig();
const printers = await window.electronAPI.printer.getPrinters();

// This is SAFE - all calls go through IPC and are controlled
```

### API Security

Backend MUST validate headers:

```javascript
// backend/middleware/terminalAuth.js
async function verifyTerminal(req, res, next) {
  const terminalId = req.headers['terminal-id'];
  const storeId = req.headers['store-id'];
  const token = req.headers.authorization;

  // 1. Validate JWT token
  const user = verifyJWT(token);
  
  // 2. Check if user has access to this terminal
  const terminal = await Terminal.findById(terminalId);
  if (terminal.storeId !== storeId || !terminal.isActive) {
    return res.status(403).json({ error: 'Terminal not authorized' });
  }

  // 3. Optionally check IP for LAN-only terminals
  if (terminal.ipWhitelist && !terminal.ipWhitelist.includes(req.ip)) {
    return res.status(403).json({ error: 'IP not whitelisted' });
  }

  req.terminal = terminal;
  next();
}
```

---

## 📡 API Integration

### Using Enhanced API Client

```javascript
import apiClient from '@/services/apiClient';

// GET request
const response = await apiClient.get('/products');
if (response.ok) {
  console.log(response.data);
} else {
  console.error(response.error);
}

// POST with data
const response = await apiClient.post('/grn', {
  invoiceNo: 'INV-001',
  vendorId: '123',
  items: [...]
});

// File upload
const response = await apiClient.uploadFile('/products/import', csvFile, {
  storeId: 'STORE-01'
});

// Batch requests
const responses = await apiClient.batch([
  { method: 'GET', endpoint: '/products' },
  { method: 'GET', endpoint: '/vendors' },
  { method: 'POST', endpoint: '/grn', data: {...} }
]);
```

### Auto-Attached Headers

Every request automatically includes:

```javascript
// These are added automatically by apiClient
headers: {
  'terminal-id': 'TERM-001',
  'store-id': 'STORE-01',
  'client-timestamp': '2026-04-17T10:30:00Z',
  'client-version': '0.0.0',
  'Authorization': 'Bearer <jwt-token>'
}
```

---

## 🖨️ Hardware Integration

### Printer Usage

```javascript
// React component
import { useEffect, useState } from 'react';

export function PrinterComponent() {
  const [printers, setPrinters] = useState([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.printer.getPrinters()
        .then(setPrinters);
    }
  }, []);

  const handlePrint = async (html) => {
    const result = await window.electronAPI.printer.printHTML(html);
    if (result.success) {
      toast.success('Printing...');
    }
  };

  return <button onClick={() => handlePrint(invoiceHtml)}>Print Invoice</button>;
}
```

### Scanner Input

USB scanners appear as keyboard input. Handle them like normal keyboard events:

```javascript
useEffect(() => {
  const handleKeyDown = (e) => {
    // Scanner emits Enter after barcode
    if (e.key === 'Enter' && barcodeInput.length > 5) {
      handleBarcodeScan(barcodeInput);
      setBarcodeInput('');
    } else if (e.key !== 'Enter') {
      setBarcodeInput(prev => prev + e.key);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [barcodeInput]);
```

---

## 🤔 Multi-Terminal Examples

### Scenario: Same Store, Multiple Terminals

**Terminal 1 - Cash Counter:**
```json
{
  "terminal": {
    "terminalId": "TERM-001",
    "terminalName": "Cash Counter",
    "branch": "STORE-01"
  }
}
```

**Terminal 2 - Warehouse:**
```json
{
  "terminal": {
    "terminalId": "TERM-002",
    "terminalName": "Warehouse",
    "branch": "STORE-01"
  }
}
```

**Backend Response (same for both):**
```javascript
// GET /api/v1/stock
// Backend sees terminal-id header
// Returns stock based on terminal permissions

if (terminalId === 'TERM-001') {
  // Sales terminal - show retail prices
} else if (terminalId === 'TERM-002') {
  // Warehouse - show warehouse info
}
```

### Scenario: Multiple Branches

**Branch Dubai:**
```json
{ "terminal": { "terminalId": "TERM-01-001", "branch": "STORE-01" } }
```

**Branch Abu Dhabi:**
```json
{ "terminal": { "terminalId": "TERM-02-001", "branch": "STORE-02" } }
```

Backend isolates data by store ID automatically.

---

## 🐛 Debugging

### Enable DevTools

In development, DevTools opens automatically. In production:

```javascript
// electron/main.js
if (process.env.NODE_ENV === "development") {
  mainWindow.webContents.openDevTools();
}
```

### Check Configuration

```javascript
// In browser console
window.electronAPI.terminal.getConfig()
  .then(config => console.log(JSON.stringify(config, null, 2)))

// Check if terminal headers are sent
window.electronAPI.terminal.getIdentityHeaders()
  .then(headers => console.log(headers))
```

### View Logs

```bash
# Electron main process logs
# Windows: C:\Users\<user>\AppData\Roaming\NEXIS ERP\logs

# Browser console
# Press F12 in app
```

### Common Issues

**Issue: "Config file not found"**
- Check if `client/config/terminal.json` exists
- Ensure build includes `config/` folder (check package.json build.files)

**Issue: "Can't connect to API"**
- Check `terminal.json` baseUrl
- Verify backend is running and accessible
- Check browser console for CORS errors

**Issue: "Terminal ID header not sent"**
- Check preload.js is loaded (should see "✅ Preload script loaded")
- Ensure apiClient is used (not direct fetch)
- Check that Electron initialized config (not web mode)

---

## 📊 Monitoring & Updates

### Checking for Updates

```javascript
// electron/main.js - implement auto-update
if (mainWindow && !isDev) {
  checkForUpdates();
}

function checkForUpdates() {
  fetch(`${API_URL}/app/version`)
    .then(res => res.json())
    .then(data => {
      if (data.version > app.getVersion()) {
        mainWindow.webContents.send('app:update-available', data);
      }
    });
}
```

### Terminal Status Reporting

Send heartbeat to track active terminals:

```javascript
// In React component
setInterval(async () => {
  await apiClient.post('/terminals/heartbeat', {
    terminalId: await window.electronAPI.terminal.getTerminalId(),
    timestamp: new Date()
  });
}, 30000); // Every 30 seconds
```

---

## ✅ Verification Checklist

- [ ] `config/terminal.json` created with unique terminalId
- [ ] `electron/` folder has main.js, preload.js, config-loader.js
- [ ] `package.json` has `"main": "electron/main.js"`
- [ ] Build section includes `electron/**/*` and `config/**/*`
- [ ] `apiClient.js` used for all API calls
- [ ] Backend validates terminal/store headers
- [ ] DevTools working in dev mode
- [ ] Printer/scanner hardware detected
- [ ] Config loads without errors (check main process logs)

---

## 🎓 Best Practices

1. **One config per terminal** - Each device gets its own terminal.json
2. **Centralize business logic** - Backend only, never in Electron
3. **Validate headers** - Backend MUST check terminal-id and store-id
4. **Use IPC for hardware** - Never direct Node.js access from React
5. **Secure storage** - Use electron.session for tokens, not localStorage
6. **Monitor terminals** - Track active terminals via heartbeat
7. **Version endpoints** - Always use /api/v1, /api/v2, etc.
8. **Gradual rollout** - Test on few terminals before full deployment

---

## 🔗 Related Files

- Backend validation: See `SECURITY_IMPLEMENTATION.md`
- API reference: See `API_DOCUMENTATION.md`
- Terminal management: See `TERMINAL_MANAGEMENT_GUIDE.md`
- Deployment: See `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

**Last Updated:** April 17, 2026  
**Status:** Production Ready  
**Version:** 1.0.0
