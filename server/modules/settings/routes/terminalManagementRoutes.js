/**
 * Terminal Management Routes
 * 
 * ✅ CRUD operations for terminals
 * ✅ Hardware configuration endpoints
 * ✅ Printing format configuration
 * ✅ Sales controls management
 * ✅ Terminal health monitoring
 */

import express from "express";
import {
  createTerminal,
  getStoreterminals,
  getTerminalById,
  updateTerminalConfig,
  updateHardwareConfig,
  updatePrintingFormats,
  updateSalesControls,
  updateInvoiceControls,
  getNextInvoiceNumber,
  testPrinterConnection,
  updateTerminalStatus,
  updateConnectivityStatus,
  deleteTerminal,
  getTerminalHealth,
  logHardwareFault,
  resolveHardwareFault,
} from "../controllers/terminalManagementController.js";

const router = express.Router();

// ========================================
// TERMINAL CRUD OPERATIONS
// ========================================

/**
 * POST /terminals/create
 * Create a new terminal configuration
 */
router.post("/create", createTerminal);

/**
 * GET /terminals/store/:storeId
 * Get all terminals for a store
 */
router.get("/store/:storeId", getStoreterminals);

/**
 * GET /terminals/:terminalId
 * Get specific terminal configuration
 */
router.get("/:terminalId", getTerminalById);

/**
 * PUT /terminals/:terminalId
 * Update entire terminal configuration
 */
router.put("/:terminalId", updateTerminalConfig);

/**
 * DELETE /terminals/:terminalId
 * Delete terminal configuration
 */
router.delete("/:terminalId", deleteTerminal);

// ========================================
// HARDWARE CONFIGURATION
// ========================================

/**
 * PUT /terminals/:terminalId/hardware
 * Update hardware configuration (printers, scanners, scales, etc.)
 */
router.put("/:terminalId/hardware", updateHardwareConfig);

/**
 * POST /terminals/:terminalId/hardware/test-printer
 * Test printer connection
 * Body: { printerType: "primaryPrinter" | "labelPrinter" }
 */
router.post("/:terminalId/hardware/test-printer", testPrinterConnection);

// ========================================
// PRINTING FORMATS
// ========================================

/**
 * PUT /terminals/:terminalId/printing-formats
 * Update printing formats (receipt, invoice, label)
 */
router.put("/:terminalId/printing-formats", updatePrintingFormats);

// ========================================
// SALES CONTROLS
// ========================================

/**
 * PUT /terminals/:terminalId/sales-controls
 * Update sales controls (credit sales, returns, discounts, etc.)
 */
router.put("/:terminalId/sales-controls", updateSalesControls);

// ========================================
// INVOICE CONTROLS
// ========================================

/**
 * PUT /terminals/:terminalId/invoice-controls
 * Update invoice numbering and controls
 */
router.put("/:terminalId/invoice-controls", updateInvoiceControls);

/**
 * GET /terminals/:terminalId/invoice/next-number
 * Get next invoice number (auto-increments counter)
 */
router.get("/:terminalId/invoice/next-number", getNextInvoiceNumber);

// ========================================
// TERMINAL STATUS & CONNECTIVITY
// ========================================

/**
 * PATCH /terminals/:terminalId/status
 * Update terminal status (ACTIVE, INACTIVE, MAINTENANCE, OFFLINE)
 * Body: { terminalStatus: "ACTIVE" }
 */
router.patch("/:terminalId/status", updateTerminalStatus);

/**
 * PATCH /terminals/:terminalId/connectivity
 * Update connectivity status (heartbeat, online/offline)
 * Body: { isOnline: true, ipAddress: "192.168.1.100", macAddress: "..." }
 */
router.patch("/:terminalId/connectivity", updateConnectivityStatus);

/**
 * GET /terminals/:terminalId/health
 * Get terminal health status and diagnostics
 */
router.get("/:terminalId/health", getTerminalHealth);

// ========================================
// HARDWARE FAULT MANAGEMENT
// ========================================

/**
 * POST /terminals/:terminalId/faults
 * Log a hardware fault
 * Body: { hardwareType: "PRINTER", faultDescription: "...", notes: "..." }
 */
router.post("/:terminalId/faults", logHardwareFault);

/**
 * PATCH /terminals/:terminalId/faults/:faultId/resolve
 * Mark a fault as resolved
 */
router.patch("/:terminalId/faults/:faultId/resolve", resolveHardwareFault);

export default router;
