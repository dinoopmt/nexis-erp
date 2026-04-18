#!/bin/bash
# Integration Checklist - Device-Based Terminal ID System
# Execute these steps to fully integrate the clone prevention system

echo "🚀 NEXIS ERP - Device-Based Terminal ID System Integration"
echo "=========================================================="
echo ""

# Step 1: Backend Integration
echo "📋 STEP 1: Backend Integration"
echo "-------------------------------"
echo "[ ] 1. Update server/server.js:"
echo "    - Import terminalValidationRoute"
echo "    - Add route registration"
echo "    - Create MongoDB indexes"
echo ""
echo "    CODE TO ADD:"
echo "    import { validateTerminalIdRoute } from './routes/terminalValidationRoute.js'"
echo "    validateTerminalIdRoute(app, db)"
echo "    db.terminals.createIndex({ terminalId: 1 }, { unique: true })"
echo ""

# Step 2: Electron Integration
echo "📋 STEP 2: Electron Integration"
echo "--------------------------------"
echo "[ ] 1. Update public/electron/main.js:"
echo "    - Import deviceFingerprintHandler"
echo "    - Register IPC handlers"
echo ""
echo "    CODE TO ADD:"
echo "    import { registerDeviceFingerprintHandlers } from './handlers/deviceFingerprintHandler.js'"
echo "    registerDeviceFingerprintHandlers()"
echo ""
echo "[ ] 2. Verify preload.js includes preload-device-api.js"
echo "    - Ensure BrowserWindow preload points to updated preload script"
echo ""

# Step 3: Frontend Verification
echo "📋 STEP 3: Frontend Verification"
echo "--------------------------------"
echo "[ ] 1. TerminalFormModal.jsx - Already Updated ✅"
echo "    - Device fingerprint initialization"
echo "    - Auto-generate Terminal IDs"
echo "    - Real-time duplicate validation"
echo ""

# Step 4: Database Setup
echo "📋 STEP 4: Database Setup"
echo "------------------------"
echo "[ ] 1. Create unique index on terminals collection:"
echo "    db.terminals.createIndex({ terminalId: 1 }, { unique: true })"
echo ""
echo "[ ] 2. Add optional index for device tracking:"
echo "    db.terminals.createIndex({ deviceFingerprint: 1 })"
echo ""

# Step 5: Testing
echo "📋 STEP 5: Testing"
echo "------------------"
echo "[ ] 1. Start server and Electron app"
echo "[ ] 2. Create new terminal - should auto-generate Terminal ID"
echo "[ ] 3. Device fingerprint should display in form"
echo "[ ] 4. Try to create duplicate Terminal ID - should show error"
echo "[ ] 5. Edit existing terminal - Terminal ID should be read-only"
echo "[ ] 6. Check browser console for debug logs"
echo ""

# Step 6: Files Created
echo "📋 FILES CREATED"
echo "----------------"
echo "✅ server/utils/deviceFingerprint.js"
echo "✅ public/electron/handlers/deviceFingerprintHandler.js"
echo "✅ public/electron/preload-device-api.js"
echo "✅ server/routes/terminalValidationRoute.js"
echo "✅ client/src/components/settings/general/TerminalFormModal.jsx (updated)"
echo ""

# Step 7: Documentation
echo "📋 DOCUMENTATION"
echo "----------------"
echo "✅ DEVICE_BASED_TERMINAL_ID_GUIDE.md"
echo "✅ TERMINAL_CONFIGURATION_SCHEMA.md"
echo ""

# Step 8: Configuration
echo "📋 CONFIGURATION"
echo "----------------"
echo "No additional config needed!"
echo "System uses:"
echo "  - Local Electron Store for device fingerprint"
echo "  - MongoDB for terminal validation"
echo "  - API endpoints for communication"
echo ""

echo "=========================================================="
echo "✅ Integration Checklist Complete"
echo "=========================================================="
echo ""
echo "Next: Run tests and verify device-based Terminal IDs work correctly"
echo ""
