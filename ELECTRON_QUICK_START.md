# 🚀 Electron Enterprise - Quick Start (5 Minutes)

## What Is This?

A **thin Electron client** that connects to a **central MERN backend**. Each device gets a unique terminal ID. Same backend, different devices = different data automatically.

---

## 🎯 TL;DR - How It Works

```
┌─ Central Server (your backend)
│
├─ Terminal 1 (Dubai)    terminalId: "TERM-01"  storeId: "STORE-01"
├─ Terminal 2 (Abu Dhabi) terminalId: "TERM-02" storeId: "STORE-02"  
└─ Terminal 3 (Warehouse) terminalId: "TERM-03" storeId: "STORE-01"

All terminals → Same API
Each terminal → Different data (isolated by storeId)
```

---

## 📦 Installation (1 minute)

```bash
cd client

# Install dependencies (if not done)
npm install

# Development mode
npm run dev              # Web only (no Electron)
npm run electron:dev-vite  # With Electron + DevTools

# Production build
npm run build:electron   # Creates .exe installer
```

---

## ⚙️ Configuration (1 minute)

**File:** `client/config/terminal.json`

```json
{
  "terminal": {
    "terminalId": "TERM-001",    ← Unique per device
    "branch": "STORE-01"          ← Store/location
  },
  "api": {
    "baseUrl": "https://api.yourserver.com"  ← Change here (no rebuild!)
  }
}
```

### Change server URL without rebuild:
```json
// Just edit this, restart app, done!
"baseUrl": "https://new-api.com"
```

---

## 🔌 Use API Client (2 minutes)

```javascript
import apiClient from '@/services/apiClient';

// GET
const res = await apiClient.get('/products');
if (res.ok) console.log(res.data);

// POST
const res = await apiClient.post('/grn', { data });

// Automatically sends headers:
// Headers: {
//   'terminal-id': 'TERM-001',
//   'store-id': 'STORE-01',
//   'Authorization': 'Bearer <token>'
// }
```

---

## 🖨️ Hardware Access (1 minute)

```javascript
// Only works in Electron!
if (window.electronAPI) {
  // Printer
  const printers = await window.electronAPI.printer.getPrinters();
  await window.electronAPI.printer.printHTML('<h1>Invoice</h1>');

  // Terminal info
  const terminalId = await window.electronAPI.terminal.getTerminalId();
  console.log('Running on:', terminalId);

  // File save
  await window.electronAPI.file.saveFile('report.pdf', data);
}
```

---

## 🔐 Backend Validation (Required!)

```javascript
// server/middleware/terminal.js
export async function validateTerminal(req, res, next) {
  const terminalId = req.headers['terminal-id'];
  const storeId = req.headers['store-id'];
  const token = req.headers.authorization?.replace('Bearer ', '');

  // 1. Verify JWT
  const user = jwt.verify(token, process.env.JWT_SECRET);

  // 2. Verify terminal exists and is active
  const terminal = await Terminal.findOne({ terminalId, storeId, isActive: true });
  if (!terminal) {
    return res.status(403).json({ error: 'Terminal not authorized' });
  }

  // 3. Force storeId in all queries!
  req.terminal = terminal;
  next();
}

// Apply to all routes
app.use('/api/v1/', validateTerminal);

// Now all queries are filtered by storeId
app.get('/api/v1/products', (req, res) => {
  // req.terminal.storeId is already set
  const products = await Product.find({ storeId: req.terminal.storeId });
  res.json(products);
});
```

---

## 🧪 Quick Test (1 minute)

```bash
# 1. Start backend
cd ../server
npm start  # Usually runs on http://localhost:5000

# 2. Start Electron dev (in another terminal)
cd ../client
npm run electron:dev-vite

# 3. Open DevTools (F12)
# 4. Check Network tab - look for terminal-id header
# 5. Try to login and view products
```

---

## 🐛 Debugging

```javascript
// In browser console (F12)

// Check terminal info
await window.electronAPI.terminal.getTerminalId()
await window.electronAPI.terminal.getIdentityHeaders()

// Check if terminal headers are sent
// Go to Network tab → Find any API request → Headers section
// Should see: terminal-id, store-id, Authorization

// Check available APIs
window.electronAPI.getAvailableAPIs()
```

---

## 📋 Common Tasks

### Change API URL (no rebuild!)
```bash
# Edit this file
client/config/terminal.json

# Change this:
"baseUrl": "https://new-url.com"

# Restart app
# Done! No rebuild needed
```

### Add new API endpoint
```javascript
// client/src/services/apiClient.js
// Already has get(), post(), put(), patch(), delete(), upload()

// Usage:
const res = await apiClient.get('/my-endpoint');
const res = await apiClient.post('/my-endpoint', data);
```

### Enable printer
```json
// config/terminal.json
"hardware": {
  "printer": {
    "enabled": true,
    "name": "Zebra LP2844"
  }
}
```

### Multi-store setup
```json
// Terminal in Dubai Store
{ "terminal": { "terminalId": "TERM-01", "branch": "STORE-01" } }

// Terminal in Abu Dhabi Store
{ "terminal": { "terminalId": "TERM-02", "branch": "STORE-02" } }

// Backend automatically isolates data by branch!
```

---

## ⚡ Performance Tips

```javascript
// Batch requests
const [products, vendors] = await apiClient.batch([
  { method: 'GET', endpoint: '/products' },
  { method: 'GET', endpoint: '/vendors' }
]);

// Cache results
async function getCachedProducts() {
  const cached = localStorage.getItem('products_cache');
  if (cached) return JSON.parse(cached);
  
  const res = await apiClient.get('/products');
  localStorage.setItem('products_cache', JSON.stringify(res.data));
  return res.data;
}

// Debounce search
const debouncedSearch = debounce(
  (query) => apiClient.get(`/search?q=${query}`),
  300
);
```

---

## 🚀 Deploy to Production

```bash
# 1. Build
npm run build:electron

# 2. Output: dist-electron/NEXIS\ ERP\ Setup\ 0.0.0.exe
# 3. Share .exe with users
# 4. After installation, users edit:
#    C:\Users\<user>\AppData\Local\NEXIS ERP\config\terminal.json
# 5. Each terminal gets unique terminalId
# 6. Done!
```

---

## ✅ Checklist Before Production

- [ ] Backend validates terminal-id and store-id headers
- [ ] All queries filtered by storeId
- [ ] config/terminal.json has correct terminalId
- [ ] config/terminal.json has correct branch
- [ ] API baseUrl points to production server
- [ ] Tested on 2+ machines with different configs
- [ ] Printer detected and working
- [ ] Users can login
- [ ] Transactions appear in correct store

---

## 🤔 FAQ

**Q: Do I need to rebuild if I change the API URL?**  
A: No! Edit `config/terminal.json` and restart.

**Q: Can one backend serve multiple terminals?**  
A: Yes! Each device sends terminalId header. Backend isolates data by storeId.

**Q: What happens if two terminals are in same store?**  
A: They see same data (correct!). Backend filters by store, not terminal.

**Q: Can I use this without Electron (web only)?**  
A: Yes! Run `npm run dev` for web-only development.

**Q: How do I update all terminals?**  
A: Just update API URL in config → all terminals auto-connect to new server!

---

## 📚 More Info

- **Full Architecture Guide:** See `ELECTRON_ENTERPRISE_ARCHITECTURE.md`
- **Deployment Guide:** See `MULTI_TERMINAL_DEPLOYMENT_GUIDE.md`
- **API Reference:** See `API_CLIENT_REFERENCE.md`
- **Implementation Status:** See `ELECTRON_IMPLEMENTATION_CHECKLIST.md`

---

## 🎓 Key Concepts

| Concept | Meaning | Example |
|---------|---------|---------|
| **terminalId** | Unique device ID | TERM-01-001 |
| **storeId** | Store/location ID | STORE-01 |
| **Config file** | JSON with settings | terminal.json |
| **API Client** | Helper for requests | apiClient.get() |
| **Preload** | Secure bridge | window.electronAPI |
| **IPC** | Electron communication | printer/scanner calls |

---

## 🎉 You're Ready!

1. ✅ Understand the architecture
2. ✅ Know how to configure terminals
3. ✅ Can use the API client
4. ✅ Know how backend validates

Start building! Questions? Check the full documentation. 🚀

---

**Last Updated:** April 17, 2026  
**Time to understand:** ~5 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Easy)
