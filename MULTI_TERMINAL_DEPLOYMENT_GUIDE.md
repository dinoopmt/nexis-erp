# Multi-Terminal Deployment Guide

## 📦 Step-by-Step Deployment

### Phase 1: Pre-Deployment Preparation

#### 1.1 Backend Setup

**Ensure backend has terminal validation:**

```javascript
// server/middleware/authentication.js
export async function authenticateRequest(req, res, next) {
  try {
    // 1. Extract headers
    const terminalId = req.headers['terminal-id'];
    const storeId = req.headers['store-id'];
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    // 2. Validate JWT token
    if (!authToken) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).populate('roles');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // 3. Validate terminal (if provided)
    if (terminalId && storeId) {
      const terminal = await Terminal.findOne({
        terminalId,
        storeId,
        isActive: true
      });

      if (!terminal) {
        return res.status(403).json({ 
          error: 'Terminal not authorized',
          details: { terminalId, storeId }
        });
      }

      // 4. Optional: Check IP whitelist
      if (terminal.ipWhitelist?.length > 0) {
        const clientIp = req.ip || req.connection.remoteAddress;
        if (!terminal.ipWhitelist.includes(clientIp)) {
          return res.status(403).json({ 
            error: 'IP address not whitelisted for this terminal'
          });
        }
      }

      req.terminal = terminal;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
```

**Apply to all routes:**

```javascript
// server/routes/api.js
import { authenticateRequest } from '../middleware/authentication.js';

app.use('/api/v1/', authenticateRequest);

// All routes now have req.user and req.terminal
app.get('/api/v1/products', (req, res) => {
  // Use req.terminal.storeId to filter results
  const products = await Product.find({ 
    storeId: req.terminal.storeId 
  });
});
```

#### 1.2 Test Terminal Configuration

Create test configurations:

```json
// test-config-counter.json
{
  "terminal": {
    "terminalId": "TEST-001",
    "terminalName": "Test Cash Counter",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "http://staging-api.yourerp.com"
  }
}

// test-config-warehouse.json
{
  "terminal": {
    "terminalId": "TEST-002",
    "terminalName": "Test Warehouse",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "http://staging-api.yourerp.com"
  }
}
```

---

### Phase 2: Test Deployment

#### 2.1 Deploy to Staging Server

```bash
# Build Electron app for Windows
npm run build:electron

# Outputs: dist-electron/NEXIS\ ERP\ Setup\ 0.0.0.exe
```

#### 2.2 Test on Single Terminal

1. Install on test machine
2. Update config/terminal.json:
   ```json
   {
     "terminal": { "terminalId": "TEST-001" },
     "api": { "baseUrl": "http://staging-api.yourerp.com" }
   }
   ```
3. Run app and verify:
   - Backend receives terminal-id header ✅
   - User can login ✅
   - Can access products ✅
   - Can create transactions ✅
   - Can print ✅

#### 2.3 Test Multi-Terminal Scenario

Install on 2-3 machines with different configs:

```
Machine 1: TERM-001 (Cash Counter) → STORE-01
Machine 2: TERM-002 (Warehouse)    → STORE-01
Machine 3: TERM-003 (Branch)       → STORE-02
```

Verify:
- Each terminal sees only their store's data
- Transactions from Terminal 1 appear in Terminal 2
- Terminal 3 doesn't see STORE-01 data

---

### Phase 3: Production Deployment

#### 3.1 Create Production Configs

For each physical location/device:

```bash
# Create directory for each terminal config
mkdir -p /deployment/terminals

# Terminal 1 - Dubai Cash Counter
cat > /deployment/terminals/term-01-config.json << 'EOF'
{
  "terminal": {
    "terminalId": "TERM-01-001",
    "terminalName": "Dubai Cash Counter 1",
    "location": "Dubai Mall",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "https://api.nexiserp.com"
  },
  "hardware": {
    "printer": {
      "enabled": true,
      "type": "thermal",
      "name": "Zebra TLP2844"
    }
  }
}
EOF

# Terminal 2 - Dubai Warehouse
cat > /deployment/terminals/term-01-warehouse.json << 'EOF'
{
  "terminal": {
    "terminalId": "TERM-01-002",
    "terminalName": "Dubai Warehouse",
    "location": "Dubai Warehouse",
    "branch": "STORE-01"
  },
  "api": {
    "baseUrl": "https://api.nexiserp.com"
  },
  "hardware": {
    "printer": { "enabled": false },
    "scanner": { "enabled": true }
  }
}
EOF

# Terminal 3 - Abu Dhabi Branch
cat > /deployment/terminals/term-02-config.json << 'EOF'
{
  "terminal": {
    "terminalId": "TERM-02-001",
    "terminalName": "Abu Dhabi Counter",
    "location": "Abu Dhabi Mall",
    "branch": "STORE-02"
  },
  "api": {
    "baseUrl": "https://api.nexiserp.com"
  }
}
EOF
```

#### 3.2 Distribute Installers

**Option A: Manual Installation**

1. Copy `NEXIS ERP Setup 0.0.0.exe` to each location
2. Users run installer
3. IT updates config file post-installation at:
   ```
   C:\Users\<username>\AppData\Local\NEXIS ERP\config\terminal.json
   ```

**Option B: Pre-configured Distribution (Recommended)**

1. Build once
2. Create installer with embedded config:
   ```bash
   # Create custom installer script
   # It modifies terminal.json during installation
   ```

**Option C: Cloud-based Config (Advanced)**

```javascript
// electron/main.js - Load config from server
async function loadConfig() {
  try {
    const response = await fetch(
      'https://config.nexiserp.com/terminals/TERM-01-001'
    );
    return response.json();
  } catch (error) {
    // Fallback to local config
    return loadLocalConfig();
  }
}
```

#### 3.3 First Day Checklist

**For each terminal:**

- [ ] App installed successfully
- [ ] terminal.json has correct terminalId and branch
- [ ] User can login with credentials
- [ ] Appears in backend terminal list
- [ ] API requests include terminal-id header
- [ ] Can perform basic operations (view products, etc.)
- [ ] Printer detected and tested
- [ ] Scanner detected and tested

```bash
# Verify terminal registration on backend
curl -H "Authorization: Bearer $TOKEN" \
  https://api.nexiserp.com/api/v1/terminals

# Should see all active terminals
[
  { "terminalId": "TERM-01-001", "status": "active", "lastSeen": "2026-04-17T..." },
  { "terminalId": "TERM-01-002", "status": "active", "lastSeen": "2026-04-17T..." },
  { "terminalId": "TERM-02-001", "status": "active", "lastSeen": "2026-04-17T..." }
]
```

---

### Phase 4: Post-Deployment Management

#### 4.1 Monitor Terminal Health

**Dashboard to track:**

```javascript
// backend/routes/terminal-dashboard.js
app.get('/api/v1/admin/terminal-status', async (req, res) => {
  const terminals = await Terminal.find({}).select(
    'terminalId terminalName storeId lastHeartbeat isActive'
  );

  const status = terminals.map(t => ({
    terminalId: t.terminalId,
    name: t.terminalName,
    store: t.storeId,
    status: isRecentlyActive(t.lastHeartbeat) ? 'online' : 'offline',
    lastSeen: t.lastHeartbeat,
    uptime: calculateUptime(t)
  }));

  res.json(status);
});
```

#### 4.2 Update Server URL (Zero Downtime!)

Change API endpoint without rebuilding app:

```bash
# 1. Update config on all terminals
# Option A: Manual SSH to each machine
ssh user@terminal-01 "
  cat > /home/user/.local/share/NEXIS\ ERP/config/terminal.json << 'EOF'
  {
    \"api\": { \"baseUrl\": \"https://new-api.example.com\" }
  }
  EOF
"

# Option B: Cloud-based config (if implemented)
curl -X POST https://config.nexiserp.com/terminals/TERM-01-001 \
  -d '{"api": {"baseUrl": "https://new-api.example.com"}}' \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. Restart apps (or just reload when next opened)
# 3. All terminals now connect to new server
```

#### 4.3 Deploy App Updates

```bash
# Build new version
npm run build:electron

# Users:
# Option A: Uninstall old, install new
# Option B: Auto-update (if implemented)

# Data is preserved because:
# - User settings in localStorage
# - Terminal config in local file
# - Database on central server
```

---

## 🎯 Multi-Store Scenario

### Setup

```
Company: XYZ Retail
├── STORE-01: Dubai Mall
│   ├── TERM-01-001: Cash Counter 1
│   ├── TERM-01-002: Cash Counter 2
│   ├── TERM-01-003: Warehouse
│   └── TERM-01-004: Manager Console
│
├── STORE-02: Abu Dhabi Mall
│   ├── TERM-02-001: Cash Counter 1
│   ├── TERM-02-002: Warehouse
│   └── TERM-02-003: Manager Console
│
└── STORE-03: Al Ain Mall
    ├── TERM-03-001: Cash Counter 1
    └── TERM-03-002: Warehouse
```

### Configuration

Each terminal's config points to same backend:

```json
// TERM-01-001
{ "terminal": { "terminalId": "TERM-01-001", "branch": "STORE-01" },
  "api": { "baseUrl": "https://api.nexiserp.com" } }

// TERM-02-001
{ "terminal": { "terminalId": "TERM-02-001", "branch": "STORE-02" },
  "api": { "baseUrl": "https://api.nexiserp.com" } }

// TERM-03-001
{ "terminal": { "terminalId": "TERM-03-001", "branch": "STORE-03" },
  "api": { "baseUrl": "https://api.nexiserp.com" } }
```

### Backend Behavior

```javascript
// All queries filtered by store
app.get('/api/v1/products', (req, res) => {
  // req.terminal.storeId = "STORE-01"
  const products = await Product.find({
    storeId: req.terminal.storeId  // ← Automatic filtering!
  });
  res.json(products);
});

// Sales only for this store
app.post('/api/v1/sales', (req, res) => {
  const sale = new Sale({
    storeId: req.terminal.storeId,  // ← Force store from header
    terminalId: req.headers['terminal-id'],
    items: req.body.items
  });
  await sale.save();
  res.json(sale);
});

// Transactions from other stores don't interfere
app.get('/api/v1/sales', (req, res) => {
  // Terminal in STORE-01 never sees STORE-02 sales
  const sales = await Sale.find({
    storeId: req.terminal.storeId
  });
  res.json(sales);
});
```

---

## 🔍 Validation Checklist

Before declaring deployment complete:

**Backend**
- [ ] Terminal middleware validates headers
- [ ] All queries filtered by storeId
- [ ] Terminal list updated correctly
- [ ] API logs show terminal-id header
- [ ] Rate limiting per terminal ID (optional)

**Electron Clients**
- [ ] Config file loads successfully
- [ ] Terminal ID appears in requests
- [ ] Users can login
- [ ] Transactions process correctly
- [ ] Offline mode works (if enabled)

**Hardware**
- [ ] Printers detected automatically
- [ ] Scanners receive input
- [ ] Scale detects weight (if applicable)
- [ ] Network stable on all locations

**Network**
- [ ] All terminals reach API
- [ ] No firewall blocking
- [ ] SSL certificates valid
- [ ] Response times acceptable (<2s)

---

## ✅ Production Checklist

- [ ] All terminals tested in staging
- [ ] Backend validates terminal headers
- [ ] Config templates prepared for each location
- [ ] Installer ready and tested
- [ ] Monitoring dashboard active
- [ ] Support team trained
- [ ] Rollback plan documented
- [ ] Database backups scheduled
- [ ] SSL certificates renewed
- [ ] API rate limits configured

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Verified By:** _____________
