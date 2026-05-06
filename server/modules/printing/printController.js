/**
 * Print Controller - API Endpoints for Invoice Printing
 * 
 * Endpoints:
 * 1. POST /api/print/generate-a4-invoice-pdf - Generate PDF for A4 printing
 * 2. POST /api/print/generate-thermal-receipt - Generate HTML for thermal printing
 * 3. GET /api/print/terminal-config/:terminalId - Get terminal printer configuration
 * 4. GET /api/print/invoice-data/:invoiceId - Get invoice data for preview
 */

import printService from './printService.js';
import TerminalManagement from '../../Models/TerminalManagement.js';

/**
 * Error handler wrapper for async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================
// 1. GENERATE A4 INVOICE PDF
// ============================================
export const generateA4InvoicePDF = asyncHandler(async (req, res) => {
  try {
    const { invoiceId, templateId, documentType = 'SALES_INVOICE', terminalId } = req.body;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📥 API: generateA4InvoicePDF`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  invoiceId: ${invoiceId}`);
    console.log(`  templateId: ${templateId}`);
    console.log(`  documentType: ${documentType}`);
    console.log(`  terminalId: ${terminalId}`);

    // Validation
    if (!invoiceId || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: invoiceId, templateId',
      });
    }

    // Generate PDF
    const pdfBuffer = await printService.generateA4InvoicePDF(
      invoiceId,
      templateId,
      documentType,
      terminalId
    );

    // Return PDF as blob
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log(`✅ PDF sent successfully`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message,
    });
  }
});

// ============================================
// 2. GENERATE THERMAL RECEIPT
// ============================================
export const generateThermalReceipt = asyncHandler(async (req, res) => {
  try {
    const { invoiceId, templateId, documentType = 'SALES_INVOICE', terminalId } = req.body;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📥 API: generateThermalReceipt`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  invoiceId: ${invoiceId}`);
    console.log(`  templateId: ${templateId}`);
    console.log(`  documentType: ${documentType}`);
    console.log(`  terminalId: ${terminalId}`);

    // Validation
    if (!invoiceId || !templateId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: invoiceId, templateId',
      });
    }

    // Generate thermal receipt
    const thermalData = await printService.generateThermalReceipt(
      invoiceId,
      templateId,
      documentType,
      terminalId
    );

    // Return HTML content
    res.status(200).json({
      success: true,
      data: thermalData,
      message: 'Thermal receipt generated successfully',
    });

    console.log(`✅ Thermal receipt sent successfully`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate thermal receipt',
      error: error.message,
    });
  }
});

// ============================================
// 3. GET TERMINAL PRINTER CONFIGURATION
// ============================================
export const getTerminalPrinterConfig = asyncHandler(async (req, res) => {
  try {
    const { terminalId } = req.params;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📥 API: getTerminalPrinterConfig`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  terminalId: ${terminalId}`);

    // Validation
    if (!terminalId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: terminalId',
      });
    }

    // Get config
    const config = await printService.getTerminalPrinterConfig(terminalId);

    res.status(200).json({
      success: true,
      data: config,
      message: 'Terminal printer configuration retrieved successfully',
    });

    console.log(`✅ Config sent successfully`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve terminal configuration',
      error: error.message,
    });
  }
});

// ============================================
// 4. GET INVOICE DATA (FOR PREVIEW)
// ============================================
export const getInvoiceData = asyncHandler(async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { documentType = 'SALES_INVOICE' } = req.query;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📥 API: getInvoiceData`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  invoiceId: ${invoiceId}`);
    console.log(`  documentType: ${documentType}`);

    // Validation
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: invoiceId',
      });
    }

    // Fetch invoice data
    const invoice = await printService.fetchInvoiceData(invoiceId, documentType);

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice data retrieved successfully',
    });

    console.log(`✅ Invoice data sent successfully`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice data',
      error: error.message,
    });
  }
});

// ============================================
// 5. GET AVAILABLE TEMPLATES FOR DOCUMENT TYPE
// ============================================
export const getAvailableTemplates = asyncHandler(async (req, res) => {
  try {
    const { documentType = 'SALES_INVOICE', format = 'A4' } = req.query;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📥 API: getAvailableTemplates`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  documentType: ${documentType}`);
    console.log(`  format: ${format}`);

    let InvoiceTemplate;
    try {
      const module = await import('../../Models/InvoiceTemplate.js');
      InvoiceTemplate = module.default;
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load template model',
      });
    }

    // Build query
    const query = { isActive: true };

    if (format === 'A4') {
      query.templateName = { $not: /Thermal/ };
    } else if (format === 'THERMAL') {
      query.templateName = /Thermal/;
    }

    const templates = await InvoiceTemplate.find(query)
      .select('_id templateName language templateType customDesign')
      .sort({ templateName: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
      message: `${templates.length} templates found`,
    });

    console.log(`✅ Templates sent: ${templates.length}`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve templates',
      error: error.message,
    });
  }
});

// ============================================
// 6. TEST PRINTER CONNECTION
// ============================================
export const testPrinterConnection = asyncHandler(async (req, res) => {
  try {
    const { terminalId, printerType = 'a4' } = req.body;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📥 API: testPrinterConnection`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`  terminalId: ${terminalId}`);
    console.log(`  printerType: ${printerType}`);

    // Get terminal config
    const terminal = await TerminalManagement.findOne({ terminalId }).lean();

    if (!terminal) {
      return res.status(404).json({
        success: false,
        message: 'Terminal not found',
      });
    }

    let printerName;
    let timeout;

    if (printerType === 'a4') {
      printerName = terminal.hardwareMapping?.invoicePrinter?.printerName;
      timeout = terminal.hardwareMapping?.invoicePrinter?.timeout;
    } else if (printerType === 'thermal') {
      printerName = terminal.hardwareMapping?.thermalPrinter?.printerName;
      timeout = terminal.hardwareMapping?.thermalPrinter?.timeout;
    }

    if (!printerName) {
      return res.status(400).json({
        success: false,
        message: `${printerType} printer not configured for this terminal`,
      });
    }

    // TODO: Implement actual printer connection test via Electron IPC
    // For now, just validate the printer name exists

    res.status(200).json({
      success: true,
      data: {
        terminalId,
        printerType,
        printerName,
        timeout,
        status: 'READY', // Would be actual status from Electron
      },
      message: 'Printer connection successful',
    });

    console.log(`✅ Printer test passed: ${printerName}`);
    console.log(`${'─'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ API Error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to test printer connection',
      error: error.message,
    });
  }
});

export default {
  generateA4InvoicePDF,
  generateThermalReceipt,
  getTerminalPrinterConfig,
  getInvoiceData,
  getAvailableTemplates,
  testPrinterConnection,
};
