# Device-Based Terminal ID System

## Overview
Prevent terminal cloning by generating device-bound Terminal IDs that combine device fingerprint with terminal number.

---

## Terminal ID Format

```
TERM-[DEVICE_FINGERPRINT]-[TERMINAL_NUMBER]
```

**Example:**
```
TERM-A1B2C3D4E5F6-001    ← Terminal 1 on Device A1B2C3D4E5F6
TERM-A1B2C3D4E5F6-002    ← Terminal 2 on Device A1B2C3D4E5F6
TERM-X9Y8Z7W6V5U4-001    ← Terminal 1 on Device X9Y8Z7W6V5U4
```

---

## How It Works

### 1️⃣ Device Registration (One-time)

When the Electron app first runs, it generates a unique **Device Fingerprint** from:
- CPU count
- Total memory
- Hostname
- Platform (Windows/Mac/Linux)
- Architecture (x64/arm64)

**Result:** Unique 12-character hash per device (stored locally)

```javascript
DEVICE-A1B2C3D4E5F6  ← Unique per hardware configuration
```

### 2️⃣ Terminal Creation

When creating a new terminal:

1. **Fetch Device Info**
   ```
   GET /api/v1/terminals/device-info?deviceFingerprint=A1B2C3D4E5F6
   ```
   Returns:
   - Existing terminals on this device
   - Next available terminal number (e.g., 3)

2. **Auto-Generate Terminal ID**
   ```javascript
   TERM-A1B2C3D4E5F6-003  ← Auto-generated, cannot be duplicated
   ```

3. **Validate Uniqueness**
   ```
   POST /api/v1/terminals/validate-id
   ```
   Checks database for duplicate Terminal IDs globally

4. **User Customizes Name**
   ```
   Terminal Name: "Counter 1"   ← User can customize
   Terminal ID: TERM-...-001    ← Device-bound, cannot change
   ```

### 3️⃣ Clone Prevention Mechanism

**Scenario: Someone copies terminal config to another device**

```
DEVICE A:
├── terminalId: TERM-A1B2C3D4E5F6-001
├── terminalName: "Counter 1"
└── Config copied to DEVICE B...

DEVICE B (Different Hardware):
├── deviceFingerprint: X9Y8Z7W6V5U4  ← DIFFERENT!
├── terminalId: TERM-A1B2C3D4E5F6-001  ← INVALID for this device
└── Validation FAILS ❌
    └── Message: "Terminal belongs to different device"
```

---

## Implementation Flow

### Frontend (React Component)

```javascript
// 1. Initialize - Get device fingerprint
const fingerprint = await window.electronAPI.device.getFingerprint()
// → DEVICE-A1B2C3D4E5F6

// 2. Fetch device terminals
GET /api/v1/terminals/device-info?deviceFingerprint=A1B2C3D4E5F6
// → { terminalCount: 2, nextTerminalNumber: 3, terminals: [...] }

// 3. Auto-generate Terminal ID
const terminalId = await window.electronAPI.device.generateTerminalId(3)
// → TERM-A1B2C3D4E5F6-003

// 4. User enters custom name
terminalName = "Counter 1"

// 5. Validate before save
POST /api/v1/terminals/validate-id
{ terminalId: "TERM-A1B2C3D4E5F6-003", excludeId: null }
// → { success: true, message: "Terminal ID is unique" }

// 6. Save to database
POST /api/v1/terminals
{
  terminalId: "TERM-A1B2C3D4E5F6-003",
  terminalName: "Counter 1",
  ...other fields
}
```

### Backend Validation

```javascript
// 1. Validate Terminal ID format
if (!terminalId.match(/^TERM-[A-F0-9]{12}-\d{3}$/)) {
  return error("Invalid Terminal ID format")
}

// 2. Check for duplicates globally
const existing = await terminals.findOne({ terminalId })
if (existing) {
  return error("Terminal ID already exists")
}

// 3. Verify device fingerprint matches (optional)
const [, deviceFp, terminalNum] = terminalId.split('-')
if (deviceFp !== currentDeviceFingerprint) {
  return error("Terminal belongs to different device")
}
```

---

## Database Schema

### Terminal Collection

```javascript
{
  _id: ObjectId,
  terminalId: "TERM-A1B2C3D4E5F6-001",  // Unique Index
  terminalName: "Counter 1",
  terminalType: "SALES",
  invoiceControls: { invoiceNumberPrefix: "C1" },
  formatMapping: { invoice: { templateId: ObjectId } },
  hardwareMapping: { invoicePrinter: {...} },
  deviceFingerprint: "A1B2C3D4E5F6",  // For tracking/audit
  createdAt: ISODate,
  updatedAt: ISODate,
}
```

### Database Indexes

```javascript
// Create unique index on terminalId
db.terminals.createIndex({ terminalId: 1 }, { unique: true })

// Create compound index for device tracking
db.terminals.createIndex({ deviceFingerprint: 1, terminalId: 1 })
```

---

## API Endpoints

### 1. Generate Terminal ID
```
GET /api/v1/terminals/device-info
Query: ?deviceFingerprint=A1B2C3D4E5F6

Response:
{
  "success": true,
  "deviceFingerprint": "A1B2C3D4E5F6",
  "terminalCount": 2,
  "nextTerminalNumber": 3,
  "terminals": [
    { terminalId: "TERM-A1B2C3D4E5F6-001", terminalName: "Counter 1" },
    { terminalId: "TERM-A1B2C3D4E5F6-002", terminalName: "Counter 2" }
  ]
}
```

### 2. Validate Terminal ID
```
POST /api/v1/terminals/validate-id
Body: {
  "terminalId": "TERM-A1B2C3D4E5F6-003",
  "excludeId": null  // Exclude current terminal if editing
}

Response (Success):
{
  "success": true,
  "message": "Terminal ID is available",
  "terminalId": "TERM-A1B2C3D4E5F6-003"
}

Response (Duplicate):
{
  "success": false,
  "code": "DUPLICATE_TERMINAL_ID",
  "message": "Terminal ID already exists",
  "details": {
    "existingTerminal": "Counter 1",
    "createdAt": "2026-04-18T10:00:00Z"
  }
}
```

---

## Electron IPC APIs

### Get Device Fingerprint
```javascript
const fingerprint = await window.electronAPI.device.getFingerprint()
// → "DEVICE-A1B2C3D4E5F6"
// Cached locally, generated once per device
```

### Generate Terminal ID
```javascript
const terminalId = await window.electronAPI.device.generateTerminalId(terminalNumber)
// → "TERM-A1B2C3D4E5F6-001"
```

### Validate Terminal ID
```javascript
const isValid = await window.electronAPI.device.validateTerminalId("TERM-A1B2C3D4E5F6-001")
// → true (belongs to this device)
// → false (belongs to different device)
```

### Get Device Config
```javascript
const config = await window.electronAPI.device.getConfig()
// → {
//     deviceFingerprint: "DEVICE-A1B2C3D4E5F6",
//     lastUpdated: "2026-04-18T10:30:00Z",
//     terminalCount: 3
//   }
```

---

## Security Features

### ✅ Clone Prevention
- Terminal ID includes unique device fingerprint
- Cannot be transferred between devices
- Validation checks device ownership

### ✅ Accidental Duplication Prevention
- Database unique constraint on terminalId
- API validates before accepting
- Frontend shows validation errors in real-time

### ✅ Audit Trail
- Terminal stores `deviceFingerprint` for tracking
- Can identify which device created terminal
- Can detect unauthorized terminal registration

### ✅ Rollback Safety
- Old terminal configs with invalid IDs detected
- Migration script can re-generate valid IDs
- Existing terminals unaffected

---

## Configuration Files

### Electron Store (Local)
**Path:** `~/.config/NEXIS-ERP/device-config.json`

```json
{
  "deviceFingerprint": "DEVICE-A1B2C3D4E5F6",
  "lastUpdated": "2026-04-18T09:00:00Z",
  "terminalCount": 3
}
```

### Terminal Configuration JSON
**Path:** `./config/terminals.json`

```json
{
  "metadata": {
    "version": "1.0.0",
    "environment": "development"
  },
  "device": {
    "fingerprint": "DEVICE-A1B2C3D4E5F6",
    "hostname": "SALES-PC-01"
  },
  "terminals": [
    {
      "terminalId": "TERM-A1B2C3D4E5F6-001",
      "terminalName": "Counter 1",
      "terminalType": "SALES"
    }
  ]
}
```

---

## Testing Checklist

- [ ] Device fingerprint generates consistently on same device
- [ ] Device fingerprint differs on different devices
- [ ] Terminal IDs auto-populate in new terminal form
- [ ] Cannot manually edit Terminal ID for new terminals
- [ ] Duplicate Terminal ID validation works
- [ ] Terminal created on Device A cannot load on Device B
- [ ] Editing existing terminal preserves Terminal ID
- [ ] Database unique index prevents duplicate inserts
- [ ] Device info endpoint returns correct terminal count
- [ ] Migration script handles legacy terminal configs

---

## Migration from Old System

```javascript
// For existing terminals without device fingerprint:
// 1. Detect old Terminal ID format
// 2. Prompt user if Terminal ID should be migrated
// 3. Auto-generate new Device-based ID
// 4. Store mapping for audit trail
// 5. Update database with new Terminal ID

Example:
Old: "TRM001"  →  New: "TERM-A1B2C3D4E5F6-001"
```

---

## Troubleshooting

### Device Fingerprint Not Generated
```javascript
// Check Electron store
console.log(store.get('deviceFingerprint'))

// Regenerate if missing
const fingerprint = generateDeviceFingerprint()
store.set('deviceFingerprint', fingerprint)
```

### Terminal ID Validation Fails
```
Error: "Terminal ID already exists"
→ Check database for duplicate
→ Verify Terminal ID format is correct
→ Check device fingerprint matches
```

### Device Changed (New CPU, RAM, etc.)
```
Old Device Fingerprint: A1B2C3D4E5F6
New Device Fingerprint: X9Y8Z7W6V5U4

Result:
- Old Terminal IDs become invalid
- Must create new terminals with new device fingerprint
- Old data preserved for audit trail
```

---

## Benefits

| Feature | Benefit |
|---------|---------|
| **Device-Bound IDs** | Prevents configuration cloning across devices |
| **Auto-Generation** | Eliminates manual ID management errors |
| **Unique Constraint** | Database ensures no duplicates |
| **Validation APIs** | Real-time duplicate detection |
| **Audit Trail** | Tracks which device owns each terminal |
| **Scalability** | Supports multiple devices and terminals |

---

## Related Files

- [TerminalFormModal.jsx](../client/src/components/settings/general/TerminalFormModal.jsx) - Frontend UI
- [deviceFingerprint.js](../server/utils/deviceFingerprint.js) - Core logic
- [deviceFingerprintHandler.js](../public/electron/handlers/deviceFingerprintHandler.js) - IPC handlers
- [terminalValidationRoute.js](../server/routes/terminalValidationRoute.js) - API routes
- [TERMINAL_CONFIGURATION_SCHEMA.md](./TERMINAL_CONFIGURATION_SCHEMA.md) - JSON schema
