/**
 * Printing Routes - API endpoint registration
 * 
 * Routes:
 * POST   /api/v1/print/generate-a4-invoice-pdf
 * POST   /api/v1/print/generate-thermal-receipt
 * GET    /api/v1/print/terminal-config/:terminalId
 * GET    /api/v1/print/invoice-data/:invoiceId
 * GET    /api/v1/print/available-templates
 * POST   /api/v1/print/test-printer
 */

import express from 'express';
import * as printController from '../modules/printing/printController.js';

const router = express.Router();

// ============================================
// PRINTING ROUTES
// ============================================

// 1. Generate A4 Invoice PDF
router.post('/generate-a4-invoice-pdf', printController.generateA4InvoicePDF);

// 2. Generate Thermal Receipt HTML
router.post('/generate-thermal-receipt', printController.generateThermalReceipt);

// 3. Get Terminal Printer Configuration
router.get('/terminal-config/:terminalId', printController.getTerminalPrinterConfig);

// 4. Get Invoice Data
router.get('/invoice-data/:invoiceId', printController.getInvoiceData);

// 5. Get Available Templates
router.get('/available-templates', printController.getAvailableTemplates);

// 6. Test Printer Connection
router.post('/test-printer', printController.testPrinterConnection);

export default router;
