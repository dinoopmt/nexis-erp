# Terminal-ID Header Validation - Complete Backend Middleware Reference

**Status**: Current implementation analysis  
**Last Updated**: April 18, 2026

---

## 📋 Summary

The NEXIS-ERP backend has a **partial implementation** of terminal-id header validation:

- ✅ **Client sends**: terminal-id header with all API requests via apiClient  
- ⚠️ **Backend validates**: Terminal ID uniqueness via dedicated validation endpoint  
- ❌ **MISSING**: Global middleware to validate terminal-id header on ALL routes

---

## 🔍 File Locations & Validation Logic

### 1. CLIENT-SIDE: Terminal ID Header Attachment

**File**: [client/src/services/apiClient.js](client/src/services/apiClient.js)

```javascript
// Lines 72-90: Build request headers including terminal identity
buildHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add authentication token
  if (this.authToken) {
    headers['Authorization'] = `Bearer ${this.authToken}`;
  }

  // Add terminal ID if available
  if (this.terminalId) {
    headers['terminal-id'] = this.terminalId;
  }

  // Add user agent
  headers['User-Agent'] = this.buildUserAgent();

  return headers;
}

// Lines 97-103: User agent for Electron terminals
buildUserAgent() {
  if (this.isElectron && this.terminalId) {
    return `NEXIS-ERP-Electron/${this.terminalId}`;
  }
  return 'NEXIS-ERP-Web';
}
```

**Key Flow**:
1. `initializeTerminalId()` loads terminal ID from Electron preload API
2. `buildHeaders()` automatically adds `terminal-id` header to all requests
3. All API calls use this client → terminal-id included automatically

---

### 2. BACKEND: Terminal Validation Endpoint

**File**: [server/routes/terminalValidationRoute.js](server/routes/terminalValidationRoute.js)

```javascript
// Lines 1-56: Validate Terminal ID Uniqueness
export const validateTerminalIdRoute = (app, db) => {
  app.post('/api/v1/terminals/validate-id', async (req, res) => {
    try {
      const { terminalId, excludeId } = req.body

      if (!terminalId) {
        return res.status(400).json({
          success: false,
          message: 'Terminal ID is required',
        })
      }

      // Check if Terminal ID already exists
      const existingTerminal = await db.collection('terminals').findOne({
        terminalId: terminalId,
        _id: { $ne: excludeId }, // Exclude current terminal if editing
      })

      if (existingTerminal) {
        return res.status(409).json({
          success: false,
          message: 'Terminal ID already exists',
          code: 'DUPLICATE_TERMINAL_ID',
          details: {
            existingTerminal: existingTerminal.terminalName,
            createdAt: existingTerminal.createdAt,
          },
        })
      }

      return res.json({
        success: true,
        message: 'Terminal ID is available',
        terminalId: terminalId,
      })
    } catch (error) {
      console.error('❌ Error validating terminal ID:', error)
      res.status(500).json({
        success: false,
        message: 'Error validating terminal ID',
        error: error.message,
      })
    }
  })
}

// Lines 62-100: Get Device Terminal Information
export const validateTerminalIdRoute = (app, db) => {
  app.get('/api/v1/terminals/device-info', async (req, res) => {
    try {
      const { deviceFingerprint } = req.query

      if (!deviceFingerprint) {
        return res.status(400).json({
          success: false,
          message: 'Device fingerprint is required',
        })
      }

      // Find all terminals for this device
      const deviceTerminals = await db.collection('terminals')
        .find({
          terminalId: {
            $regex: `^TERM-${deviceFingerprint}`,
          },
        })
        .toArray()

      return res.json({
        success: true,
        deviceFingerprint: deviceFingerprint,
        terminalCount: deviceTerminals.length,
        terminals: deviceTerminals.map(t => ({
          _id: t._id,
          terminalId: t.terminalId,
          terminalName: t.terminalName,
          terminalType: t.terminalType,
          createdAt: t.createdAt,
        })),
        nextTerminalNumber: deviceTerminals.length + 1,
      })
    } catch (error) {
      console.error('❌ Error getting device info:', error)
      res.status(500).json({
        success: false,
        message: 'Error getting device info',
        error: error.message,
      })
    }
  })
}
```

**Endpoints**:
- `POST /api/v1/terminals/validate-id` - Check for duplicate Terminal IDs
- `GET /api/v1/terminals/device-info?deviceFingerprint=...` - Get terminals for a device

---

### 3. BACKEND: Terminal Model/Schema

**File**: [server/Models/TerminalManagement.js](server/Models/TerminalManagement.js)

```javascript
// Lines 1-45: Terminal Identification Fields
const terminalManagementSchema = new mongoose.Schema({
  // ========================================
  // TERMINAL IDENTIFICATION
  // ========================================
  terminalId: {
    type: String,
    required: true,
    unique: true,          // ✅ Enforces uniqueness at DB level
    trim: true,
    description: "Unique terminal identifier (e.g., POS-001, TERMINAL-001)",
  },
  terminalName: {
    type: String,
    required: true,
    trim: true,
    description: "Friendly name for terminal (e.g., 'Main Counter', 'Billing Point 1')",
  },
  terminalType: {
    type: String,
    enum: ["SALES", "BACKOFFICE"],
    default: "SALES",
    description: "Terminal type - SALES for point-of-sale, BACKOFFICE for administrative",
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
    description: "Reference to store this terminal belongs to",
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    description: "Reference to organizational unit (branch, company)",
  },
  terminalStatus: {
    type: String,
    enum: ["ACTIVE", "INACTIVE", "MAINTENANCE", "OFFLINE"],
    default: "ACTIVE",
    description: "Current operational status of terminal",
  },
  // ... additional fields follow
});
```

**Database Indexes** (from server.js):
```javascript
// Lines 52-80: Terminal database indexes
try {
  await db.collection('terminals').createIndex({ terminalId: 1 }, { unique: true });
  console.log('✅ Terminal ID unique index created');
} catch (indexErr) {
  if (indexErr.code === 11000 || indexErr.message.includes('already exists')) {
    console.log('✅ Terminal ID unique index already exists');
  }
}

try {
  await db.collection('terminals').createIndex({ deviceFingerprint: 1 });
  console.log('✅ Device fingerprint index created');
} catch (indexErr) {
  if (indexErr.message.includes('already exists')) {
    console.log('✅ Device fingerprint index already exists');
  }
}
```

---

### 4. BACKEND: Terminal Management Controller

**File**: [server/modules/settings/controllers/terminalManagementController.js](server/modules/settings/controllers/terminalManagementController.js)

```javascript
// Lines 1-60: CREATE TERMINAL with validation
export const createTerminal = async (req, res) => {
  try {
    const {
      terminalId,
      terminalName,
      storeId,
      organizationId,
    } = req.body;

    // Validate required fields
    if (!terminalId || !terminalName || !storeId) {
      return res.status(400).json({
        success: false,
        message: "Terminal ID, name, and store ID are required",
      });
    }

    // Check if terminal already exists
    const existingTerminal = await TerminalManagement.findOne({ terminalId });
    if (existingTerminal) {
      return res.status(400).json({
        success: false,
        message: `Terminal with ID ${terminalId} already exists`,
      });
    }

    // Build structured terminal data - ONLY schema-defined fields
    const terminalData = {
      terminalId: terminalId.trim(),
      terminalName: terminalName.trim(),
      storeId,
      organizationId,
      terminalStatus: "ACTIVE",
      createdBy: req.user?._id || "SYSTEM",
      invoiceControls: {
        invoiceNumberPrefix: req.body?.invoiceNumberPrefix?.trim() || "",
        invoiceFormat: req.body?.invoiceFormat || "STANDARD",
      },
      printingFormats: req.body?.printingFormats || {},
      notes: req.body?.notes?.trim() || "",
    };

    // Create new terminal
    const terminal = await TerminalManagement.create(terminalData);

    console.log(`✅ Terminal created: ${terminalId}`);

    res.status(201).json({
      success: true,
      message: "Terminal created successfully",
      data: terminal,
    });
  } catch (error) {
    console.error("❌ Error creating terminal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create terminal",
      error: error.message,
    });
  }
};

// Lines 63-100: GET TERMINAL BY ID
export const getTerminalById = async (req, res) => {
  try {
    const { terminalId } = req.params;

    const terminal = await TerminalManagement.findOne({
      terminalId,
    }).populate("storeId organizationId");

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: "Terminal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: terminal,
    });
  } catch (error) {
    console.error("❌ Error fetching terminal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch terminal",
      error: error.message,
    });
  }
};
```

---

### 5. BACKEND: Terminal Management Routes

**File**: [server/modules/settings/routes/terminalManagementRoutes.js](server/modules/settings/routes/terminalManagementRoutes.js)

```javascript
// Lines 1-150: Route definitions
const router = express.Router();

// ========================================
// TERMINAL CRUD OPERATIONS
// ========================================

router.post("/create", createTerminal);
router.get("/store/:storeId", getStoreterminals);
router.get("/:terminalId", getTerminalById);
router.put("/:terminalId", updateTerminalConfig);
router.delete("/:terminalId", deleteTerminal);

// ========================================
// HARDWARE CONFIGURATION
// ========================================
router.put("/:terminalId/hardware", updateHardwareConfig);
router.post("/:terminalId/hardware/test-printer", testPrinterConnection);

// ========================================
// PRINTING FORMATS
// ========================================
router.put("/:terminalId/printing-formats", updatePrintingFormats);

// ========================================
// SALES CONTROLS
// ========================================
router.put("/:terminalId/sales-controls", updateSalesControls);

// ========================================
// INVOICE CONTROLS
// ========================================
router.put("/:terminalId/invoice-controls", updateInvoiceControls);
router.get("/:terminalId/invoice/next-number", getNextInvoiceNumber);

// ========================================
// TERMINAL STATUS & CONNECTIVITY
// ========================================
router.patch("/:terminalId/status", updateTerminalStatus);
router.patch("/:terminalId/connectivity", updateConnectivityStatus);
router.get("/:terminalId/health", getTerminalHealth);

// ========================================
// HARDWARE FAULT MANAGEMENT
// ========================================
// ... fault logging routes

export default router;
```

---

### 6. BACKEND: Authentication Middleware (Current)

**File**: [server/middleware/index.js](server/middleware/index.js)

```javascript
// Lines 70-83: Authentication middleware (PLACEHOLDER - NOT FULLY IMPLEMENTED)
/**
 * Authentication middleware (placeholder)
 * Should verify JWT tokens from request headers
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authentication token provided',
    });
  }
  
  // TODO: Verify JWT token
  // For now, just pass through
  next();
};

export {
  errorHandler,
  requestLogger,
  validateRequired,
  corsMiddleware,
  authenticateToken,
};
```

**Status**: This middleware does NOT validate terminal-id headers. It only checks for JWT tokens.

---

### 7. SERVER SETUP & Route Registration

**File**: [server/server.js](server/server.js)

```javascript
// Lines 1-100: Imports and database setup

// Lines 51-80: Terminal database indexes setup
try {
  db = await connectDB();
  console.log('🔑 Setting up terminal database indexes...');
  try {
    await db.collection('terminals').createIndex({ terminalId: 1 }, { unique: true });
    console.log('✅ Terminal ID unique index created');
  } catch (indexErr) {
    if (indexErr.code === 11000 || indexErr.message.includes('already exists')) {
      console.log('✅ Terminal ID unique index already exists');
    }
  }
  // ... device fingerprint index setup
}

// Lines 145-230: Route registration (NO terminal validation middleware)
const apiV1 = '/api/v1';

app.use(`${apiV1}/auth`, authRoutes.authRoutes);
app.use(`${apiV1}/users`, authRoutes.userRoutes);
app.use(`${apiV1}/roles`, authRoutes.roleRoutes);
app.use(`${apiV1}/sales-invoices`, salesRoutes.salesInvoiceRoutes);
// ... all other routes (NO terminal-id validation applied)
app.use(`${apiV1}/terminals`, settingsRoutes.terminalManagementRoutes);

// Terminal Validation API (Device-based Terminal ID system)
validateTerminalIdRoute(app, db);
```

**Issue**: Routes are registered **without global terminal-id header validation middleware**

---

## ⚠️ Missing Implementation: Global Terminal-ID Middleware

The documentation references a middleware that should exist but is NOT currently implemented:

From **MULTI_TERMINAL_DEPLOYMENT_GUIDE.md**:
```javascript
// This middleware is DOCUMENTED but NOT IMPLEMENTED in actual code
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

      req.terminal = terminal;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Apply to all routes
app.use('/api/v1/', authenticateRequest);
```

**Status**: ❌ **NOT IMPLEMENTED** - Only exists in documentation

---

## 📊 Current Implementation Status

| Component | Status | Location |
|-----------|--------|----------|
| Client sends terminal-id header | ✅ Done | apiClient.js |
| Terminal Model/Schema | ✅ Done | TerminalManagement.js |
| Terminal CRUD endpoints | ✅ Done | terminalManagementController.js |
| Terminal ID uniqueness validation | ✅ Done | terminalValidationRoute.js |
| Device fingerprint validation | ✅ Done | terminalValidationRoute.js |
| Database indexes (terminalId, deviceFingerprint) | ✅ Done | server.js |
| Global terminal-id header validation middleware | ❌ Missing | (should be in middleware/) |
| Terminal-based query filtering | ❌ Missing | (all routes) |
| Terminal authorization checks | ❌ Missing | (all routes) |

---

## 🎯 Next Steps to Complete Implementation

To fully implement terminal-id header validation:

### Step 1: Create Terminal Authentication Middleware

Create `/server/middleware/terminalAuth.js`:

```javascript
import jwt from 'jsonwebtoken';
import User from '../Models/User.js';
import TerminalManagement from '../Models/TerminalManagement.js';
import logger from '../config/logger.js';

/**
 * Terminal Authentication Middleware
 * Validates JWT token + terminal-id header + store association
 */
export async function authenticateAndValidateTerminal(req, res, next) {
  try {
    // 1. Extract headers
    const terminalId = req.headers['terminal-id'];
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    // 2. Validate JWT token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing authorization token',
      });
    }

    // 3. Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // 4. Get user from database
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // 5. Validate terminal (if provided in header)
    if (terminalId) {
      const terminal = await TerminalManagement.findOne({
        terminalId,
        terminalStatus: 'ACTIVE',
      }).populate('storeId');

      if (!terminal) {
        return res.status(403).json({
          success: false,
          message: 'Terminal not found or inactive',
          details: { terminalId },
        });
      }

      // 6. Attach to request for use in route handlers
      req.terminal = terminal;
      req.storeId = terminal.storeId._id; // For query filtering
    }

    // 7. Attach user to request
    req.user = user;
    req.userId = user._id;

    logger.info(`✅ Auth successful: User ${user.username}, Terminal ${terminalId || 'web'}`);
    next();
  } catch (error) {
    logger.error('❌ Terminal auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
}

export default authenticateAndValidateTerminal;
```

### Step 2: Apply Middleware in server.js

```javascript
import { authenticateAndValidateTerminal } from './middleware/terminalAuth.js';

// Apply terminal auth to all API v1 routes
app.use('/api/v1/', authenticateAndValidateTerminal);

// Then register all routes
app.use(`${apiV1}/auth`, authRoutes.authRoutes);
app.use(`${apiV1}/terminals`, settingsRoutes.terminalManagementRoutes);
// ... etc
```

### Step 3: Update All Route Handlers to Filter by storeId

Example for products route:
```javascript
export const getProducts = async (req, res) => {
  try {
    // Use storeId from terminal middleware
    const storeId = req.storeId || req.body.storeId;

    const products = await Product.find({ storeId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    // ... error handling
  }
};
```

---

## 📝 Summary of All Files

| # | File | Purpose | Status |
|----|------|---------|--------|
| 1 | [client/src/services/apiClient.js](client/src/services/apiClient.js#L72) | Client-side header builder | ✅ Complete |
| 2 | [server/routes/terminalValidationRoute.js](server/routes/terminalValidationRoute.js) | Terminal ID uniqueness validation | ✅ Complete |
| 3 | [server/Models/TerminalManagement.js](server/Models/TerminalManagement.js#L1) | Terminal schema definition | ✅ Complete |
| 4 | [server/modules/settings/controllers/terminalManagementController.js](server/modules/settings/controllers/terminalManagementController.js) | CRUD operations | ✅ Complete |
| 5 | [server/modules/settings/routes/terminalManagementRoutes.js](server/modules/settings/routes/terminalManagementRoutes.js) | Route definitions | ✅ Complete |
| 6 | [server/middleware/index.js](server/middleware/index.js#L70) | Auth middleware (stub) | ⚠️ Incomplete |
| 7 | [server/server.js](server/server.js) | Server setup & route registration | ✅ Partial |
| 8 | [server/middleware/terminalAuth.js](server/middleware/terminalAuth.js) | **MISSING** - Should validate terminal-id header | ❌ Not Found |

---

## 🔗 Related Documentation

- [MULTI_TERMINAL_DEPLOYMENT_GUIDE.md](MULTI_TERMINAL_DEPLOYMENT_GUIDE.md) - Deployment strategy
- [ELECTRON_ENTERPRISE_ARCHITECTURE.md](ELECTRON_ENTERPRISE_ARCHITECTURE.md) - Architecture design
- [ELECTRON_QUICK_START.md](ELECTRON_QUICK_START.md) - Quick start guide
- [DEVICE_BASED_TERMINAL_ID_GUIDE.md](DEVICE_BASED_TERMINAL_ID_GUIDE.md) - Device fingerprinting

