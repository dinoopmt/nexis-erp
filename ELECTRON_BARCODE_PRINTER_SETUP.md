# 🖨️ Electron Barcode Printer Integration Setup Guide

## Overview

This guide explains how to set up and use the Electron-based barcode printing system with direct local printer communication.

---

## 📁 File Structure

```
NEXIS-ERP/
├── electron/
│   ├── main.js                    ✨ NEW - Electron entry point
│   ├── preload.js                 ✨ NEW - IPC security layer
│   └── electronPrinterHandler.js  ✅ Already exists - IPC handlers
├── client/
│   └── src/components/
│       ├── modals/
│       │   └── GlobalBarcodePrintModal.jsx  (Uses Electron IPC)
│       └── settings/general/
│           ├── PrinterConfigurationManagement.jsx  (Manage templates)
│           └── PrinterConfigurationForm.jsx        (Create/Edit templates)
└── server/
    ├── Models/
    │   └── PrinterConfiguration.js     (MongoDB schema)
    └── modules/settings/
        ├── controllers/printerConfigurationController.js
        ├── services/PrinterConfigurationService.js
        └── routes/printerConfigurationRoutes.js
```

---

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
# If not already installed
npm install electron serialport --save-dev
```

### Step 2: Update package.json (Root)

Add Electron configuration to your root `package.json`:

```json
{
  "main": "electron/main.js",
  "homepage": "./",
  "scripts": {
    "electron-dev": "cross-env NODE_ENV=development electron .",
    "electron-build": "npm run build && electron-builder",
    "build": "vite build"
  },
  "devDependencies": {
    "electron": "^latest",
    "electron-builder": "^latest",
    "serialport": "^latest"
  }
}
```

### Step 3: Update package.json (Client)

Ensure client package.json has Vite dev server on port 5173:

```bash
cd client
npm install
```

The dev server runs on `http://localhost:5173` by default.

---

## 🔧 How It Works

### Architecture Flow

```
React App (Browser/Electron)
       ↓
[GlobalBarcodePrintModal.jsx]
   - Fetches printer templates from DB
   - Lets user select template & printer
   - Calls electronAPI.invoke('app:print-barcode', {...})
       ↓
[Preload.js] - IPC Security Layer
   - Validates channel ('app:print-barcode' allowed)
   - Routes safe invoke to main process
       ↓
[Electron IPC Main - electronPrinterHandler.js]
   - Receives print command
   - Routes by printer type (NETWORK/SERIAL/USB)
       ↓
Local Hardware
   - Network Printer (TCP/IP port 9100)
   - Serial Port (COM1, COM3, /dev/ttyUSB0)
   - USB Printer
   - Windows Print Spooler
```

### Data Flow Example

**1. Backend (Node.js) processes template:**
```javascript
// Server receives request to prepare print command
GET /api/v1/settings/printer-configurations/:id/prepare-print
Body: { product, quantity }

// Response: Template with replaced variables
{
  success: true,
  data: {
    command: "SIZE 38 MM, 25 MM\nTEXT 10,20,\"ARIAL.TTF\",0,1,1,\"Product ABC\"\nBARCODE 10,60,\"CODE128\",100,1,0,2,4,\"123456789\"\n..."
  }
}
```

**2. Frontend sends to Electron:**
```javascript
// React modal calls Electron IPC
const result = await electronAPI.invoke('app:print-barcode', {
  command: "SIZE 38 MM, 25 MM\nTEXT...",
  printerType: "NETWORK",
  printerAddress: "192.168.1.100:9100",
  quantity: 1
});
```

**3. Electron sends to printer:**
```
Host: 192.168.1.100
Port: 9100
Data: [Print Command Bytes]
✅ Printer receives and prints
```

---

## 🎯 Running the Application

### Development Mode

**Terminal 1: Start Backend**
```bash
cd server
npm run dev
```
Runs on `http://localhost:5000`

**Terminal 2: Start Meilisearch** (if needed)
```bash
cd meilisearch
./meilisearch
```

**Terminal 3: Start Electron**
```bash
npm run electron-dev
```
- Electron window opens
- Loads React app from `http://localhost:5173`
- IPC handlers ready for printer communication

### Production Mode

```bash
# Build React app
npm run build

# Package as Electron app
npm run electron-build
```

---

## 🖨️ Printer Configuration

### Step 1: Access Printer Settings

1. Open NEXIS-ERP app
2. Go to **General Settings** → **Printer Config** tab
3. Click **Add Template**

### Step 2: Create Printer Template

**Form Fields:**

| Field | Example | Notes |
|-------|---------|-------|
| **Template Name** | `TSC_BARCODE_38x25` | Internal ID (no spaces) |
| **Display Name** | `TSC Printer - 38x25mm` | User-visible dropdown text |
| **Printer Model** | `TSC` | TSC, ZEBRA, BROTHER, SATO, etc. |
| **Label Width (mm)** | `38` | Physical label width |
| **Label Height (mm)** | `25` | Physical label height |
| **Configuration Template** | `SIZE 38 MM, 25 MM...` | Printer-specific command format |

### Step 3: Add Variables

**Manual Method:**
- Type variable name (e.g., `ITEM_NAME`)
- Click "Add"
- Repeat for all needed variables

**Auto-Extract Method:**
- Paste printer command template
- Click **🔍 Extract from Template**
- System finds all `{VARIABLE_NAME}` patterns

**Supported Variables:**
```
{ITEM_NAME}           - Product name
{BARCODE}            - Product barcode
{NUMBER_ITEM_PRICE}  - Price (decimal format: 10.50)
{DECIMAL_ITEM_PRICE} - Price with region formatting
{UNIT_NAME}          - Unit variant name
{LABEL_QUANTITY}     - Number of labels to print
```

### Step 4: Example Templates

#### TSC Printer
```
SIZE 38 MM, 25 MM
DIRECTION 1
REFERENCE 0,0
OFFSET 0 MM
SET TEAR ON
SET CUTTER OFF
MEDIA ROLL

TEXT 10,20,"ARIAL.TTF",0,1,1,"{ITEM_NAME}"
BARCODE 10,60,"CODE128",100,1,0,2,4,"{BARCODE}"
TEXT 10,150,"ARIAL.TTF",0,1,1,"Price: {NUMBER_ITEM_PRICE}"

PRINT 1,1
```

#### Zebra Printer (ZPL)
```
^XA
^MMT
^PW832
^LL200
^LS0
^BY3,3,50^FT50,80^BCN,,Y,N
^FD{BARCODE}^FS
^FT50,150^A0N,28,28
^FD{ITEM_NAME}^FS
^FT50,200^A0N,20,20
^FDPrice: {NUMBER_ITEM_PRICE}^FS
^XZ
```

#### Brother Printer (QL)
```
^XA
^FT10,20^A0N,20,20^FD{ITEM_NAME}^FS
^FT10,50^BQN,2,5^FDQA,{BARCODE}^FS
^FT10,80^A0N,15,15^FD{NUMBER_ITEM_PRICE}^FS
^XZ
```

---

## 🖨️ Printer Connection Types

### 1. Network Printer (TCP/IP)
**Used for:** Shared network printers (TSC Pro, Zebra Network models)

**Configuration:**
```
Printer Type: NETWORK
Address Format: hostname:port or IP:port
Examples: 
  - 192.168.1.100:9100
  - printer.company.com:9100
  - localhost:9100
```

**How it works:**
- Opens TCP socket to printer's IP on port 9100 (standard)
- Sends raw printer command as byte stream
- Closes connection

### 2. Serial Port (RS-232/COM)
**Used for:** Direct serial connection (older TSC models, serial COM ports)

**Configuration:**
```
Printer Type: SERIAL
Address Format: COM port or device path
Examples:
  - COM1      (Windows)
  - COM3      (Windows)
  - /dev/ttyUSB0  (Linux)
  - /dev/ttyS0    (Linux)
```

**Settings:**
- Baud Rate: 9600 (typical)
- Data Bits: 8
- Stop Bits: 1
- Parity: None

### 3. USB Printer
**Used for:** Direct USB connection

**Configuration:**
```
Printer Type: USB
Address: Device path or USB identifier
```

### 4. Windows Print Spooler
**Used for:** Windows System printer (generic fallback)

**Configuration:**
```
Printer Type: WINDOWS
Address: Printer name from "Devices and Printers"
```

---

## ⚡ Using GlobalBarcodePrintModal

### In Product Component

```jsx
// Already integrated in src/components/product/Product.jsx

// Button that opens modal
<button onClick={() => setShowBarcodePrintPopup(true)}>
  <Printer size={14} /> Print Barcodes
</button>

// Modal component
<GlobalBarcodePrintModal
  isOpen={showBarcodePrintPopup}
  onClose={() => setShowBarcodePrintPopup(false)}
  products={[currentProduct]} // Pass product array
/>
```

### Modal Workflow

1. **User clicks "Print Barcodes"** button
   
2. **Modal loads printer templates** from database
   ```
   GET /api/v1/settings/printer-configurations
   ```

3. **Modal discovers available printers** via Electron IPC
   ```javascript
   await electronAPI.invoke('app:get-available-printers')
   ```

4. **User selects:**
   - Printer template (dropdown)
   - Printer type (NETWORK/SERIAL/USB)
   - Printer address/port
   - Quantity per product

5. **Modal sends print command:**
   ```javascript
   const result = await electronAPI.invoke('app:print-barcode', {
     command: readyCommand,
     printerType,
     printerAddress,
     quantity
   });
   ```

6. **Electron sends to local printer**
7. **Success toast** shows or error message

---

## 🛠️ Troubleshooting

### Problem: "Electron not available"

**Cause:** Running in browser dev mode, not Electron

**Solution:**
```bash
# Stop Vite dev server
# Run Electron instead
npm run electron-dev
```

### Problem: "Printer configuration not found"

**Cause:** No templates created in database

**Solution:**
1. Go to **General Settings → Printer Config**
2. Click **Add Template**
3. Fill in form and save

### Problem: Printer not responding

**Cause:** Wrong address/port or printer offline

**Check:**
1. Verify printer IP: `ping 192.168.1.100`
2. Check port: `telnet 192.168.1.100 9100`
3. Confirm template variables match product data

### Problem: IPC handler not initializing

**Cause:** Missing Node modules or wrong import

**Solution:**
```bash
npm install serialport
# Check console for errors
npm run electron-dev
```

---

## 📊 Testing Guide

### Manual Test (Browser - Without Printing)

1. Open browser console
2. Click "Print Barcodes" button
3. Check console logs:
   ```
   [MODAL] Electron not available, using default printer
   [MODAL] Discovered printers: [...]
   [PRINT] Electron not available. Command prepared in console.
   ```
4. Command is logged and ready for testing

### Full Test (Electron + Actual Printer)

1. **Start Electron:** `npm run electron-dev`
2. **Navigate to Product** management
3. **Select a product** with barcode
4. **Click "Print Barcodes"** button
5. **Modal shows:**
   - Available printers
   - Template options
   - Printer selection
6. **Select printer type** and address
7. **Click "Send to Printer"**
8. **Check printer** for output

---

## 📝 Advanced: Custom Printer Support

To add a new printer model:

1. **Update PrinterConfigurationManagement.jsx** (if new model):
   ```javascript
   const printerModels = [
     'TSC', 'ZEBRA', 'BROTHER', 'SATO', 'DATAMAX', 'GENERIC', 'NEW_MODEL'
   ];
   ```

2. **Create template** in Printer Config settings
3. **Test template** variables and formatting
4. **Document template** for team

---

## 🔒 Security Considerations

### IPC Whitelist (preload.js)
Only these channels are allowed:
- `app:print-barcode` - Send print command
- `app:get-available-printers` - Discover printers

Unauthorized channels are blocked.

### Input Validation
- Template variables validated server-side
- Print commands escaped before execution
- Printer addresses validated for format

---

## 📚 Reference

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/settings/printer-configurations` | GET | List all templates |
| `/api/v1/settings/printer-configurations` | POST | Create template |
| `/api/v1/settings/printer-configurations/:id` | PUT | Update template |
| `/api/v1/settings/printer-configurations/:id` | DELETE | Delete template |
| `/api/v1/settings/printer-configurations/:id/prepare-print` | POST | Get ready command |

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `app:print-barcode` | Invoke | Send command to printer |
| `app:get-available-printers` | Invoke | Discover connected printers |
| `printer:discovery-update` | Emit | Notify of printer changes |

---

## ✅ Checklist

- [ ] Installed `electron` and `serialport` packages
- [ ] Main Electron files created (main.js, preload.js)
- [ ] Backend printer config API working
- [ ] Printer templates created in settings
- [ ] GlobalBarcodePrintModal integrated
- [ ] Tested in development (electron-dev)
- [ ] Tested actual printer printing
- [ ] Documented custom templates for team

---

**Last Updated:** March 21, 2026  
**Status:** ✅ Complete and Ready for Use
