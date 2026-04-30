/**
 * Printer Management API
 * Handles printer list, PDF generation, and print job management
 */

import express from 'express';
import { getPrinterList, submitPrintJob } from '../services/PrinterService.js';
import pdfGenerationService from '../services/PdfGenerationService.js';

const router = express.Router();

/**
 * GET /printer/list
 * Get list of available printers
 */
router.get('/list', async (req, res) => {
  try {
    const printers = await getPrinterList();
    res.json({
      success: true,
      printers: printers,
      count: printers.length
    });
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch printers',
      message: error.message
    });
  }
});

/**
 * POST /printer/generate-pdf
 * Generate PDF from HTML (server-side)
 * Request body:
 * {
 *   html: string (required) - HTML content to convert to PDF
 *   orientation: 'portrait' | 'landscape' (default: 'portrait')
 *   grayscale: boolean (default: false)
 *   format: 'A4', 'A3', etc. (default: 'A4')
 *   margins: { top, right, bottom, left } (default: 10mm each)
 * }
 * Response: PDF as base64 string
 */
router.post('/generate-pdf', async (req, res) => {
  try {
    const {
      html,
      orientation = 'portrait',
      grayscale = false,
      format = 'A4',
      margins = { top: 10, right: 10, bottom: 10, left: 10 }
    } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: html'
      });
    }

    console.log('📄 Generating PDF on server:', {
      orientation,
      grayscale,
      format,
      htmlSize: html.length,
      htmlType: typeof html,
      isString: typeof html === 'string'
    });

    // Validate HTML is a string
    if (typeof html !== 'string') {
      console.error('❌ HTML is not a string:', typeof html);
      return res.status(400).json({
        success: false,
        error: 'Invalid HTML format - must be a string',
        received: typeof html
      });
    }

    // Generate PDF using PdfGenerationService singleton
    const pdfBuffer = await pdfGenerationService.generatePdfFromHtml(html, {
      pageSize: format,
      landscape: orientation === 'landscape',
      margins: {
        top: margins.top,
        right: margins.right,
        bottom: margins.bottom,
        left: margins.left
      },
      printBackground: true,
      pdfOptions: grayscale ? { scale: 1 } : {}
    });

    // Convert to base64
    const base64Pdf = pdfBuffer.toString('base64');

    res.json({
      success: true,
      pdf: base64Pdf,
      size: pdfBuffer.length,
      message: 'PDF generated successfully'
    });

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      message: error.message,
      details: error.stack
    });
  }
});

/**
 * POST /printer/submit
 * Submit print job to printer
 */
router.post('/submit', async (req, res) => {
  try {
    const {
      html,
      printerName,
      orientation = 'portrait',
      grayscale = false,
      margins = { marginType: 1 }
    } = req.body;

    if (!html || !printerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: html, printerName'
      });
    }

    const result = await submitPrintJob({
      html,
      printerName,
      orientation,
      grayscale,
      margins
    });

    res.json({
      success: result.success,
      jobId: result.jobId,
      message: result.message
    });
  } catch (error) {
    console.error('Error submitting print job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit print job',
      message: error.message
    });
  }
});

export default router;
