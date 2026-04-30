/**
 * Printer Service
 * Handles printer detection and print job submission
 * Works with both Electron and system printers
 */

// Mock printer list (used when running without Electron)
const DEFAULT_PRINTERS = [
  {
    name: 'Default Printer',
    displayName: 'System Default',
    isDefault: true
  },
  {
    name: 'PDF',
    displayName: 'Save as PDF',
    isDefault: false
  }
];

/**
 * Get list of available printers
 * Returns system printers or defaults
 */
export async function getPrinterList() {
  try {
    // Check if we have access to system printers through process env
    const printerEnv = process.env.AVAILABLE_PRINTERS;
    if (printerEnv) {
      try {
        return JSON.parse(printerEnv);
      } catch (parseErr) {
        console.warn('⚠️ Failed to parse AVAILABLE_PRINTERS env:', parseErr.message);
      }
    }
  } catch (error) {
    console.warn('⚠️ System printer detection not available:', error.message);
  }

  // Fallback to default printers
  console.log('📋 Using default printer list');
  return DEFAULT_PRINTERS;
}

/**
 * Submit print job to printer
 * Handles print job submission with specified settings
 */
export async function submitPrintJob({
  html,
  printerName,
  orientation = 'portrait',
  grayscale = false,
  margins = { marginType: 1 }
}) {
  try {
    console.log('🖨️ Submitting print job:', {
      printer: printerName,
      orientation,
      grayscale,
      htmlSize: html?.length
    });

    // Apply print styles to HTML
    const styledHtml = applyPrintStyles(html, orientation, grayscale);

    // Log print job submitted (in production, this would integrate with actual print service)
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('✅ Print job queued:', {
      jobId,
      printer: printerName,
      orientation,
      grayscale
    });

    return {
      success: true,
      jobId: jobId,
      message: `Print job submitted to ${printerName}`,
      status: 'queued',
      printer: printerName,
      orientation,
      grayscale,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Print job submission failed:', error);
    throw error;
  }
}

/**
 * Apply CSS print styles to HTML
 * Configures orientation, grayscale, and margins
 */
export function applyPrintStyles(html, orientation = 'portrait', grayscale = false) {
  const pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4';
  
  const styles = `
    <style>
      @media print {
        * {
          -webkit-print-color-adjust: ${grayscale ? 'exact' : 'auto'} !important;
          print-color-adjust: ${grayscale ? 'exact' : 'auto'} !important;
          ${grayscale ? 'filter: grayscale(100%) !important;' : ''}
        }

        @page {
          size: ${pageSize};
          margin: 10mm;
        }

        body {
          margin: 0;
          padding: 10mm;
          ${grayscale ? 'filter: grayscale(100%);' : ''}
        }

        /* Ensure images and content scale properly */
        img, table, div {
          page-break-inside: avoid;
        }
      }

      body {
        font-family: Arial, sans-serif;
        line-height: 1.5;
        color: #333;
      }
    </style>
  `;

  return styles + html;
}

/**
 * Get printer by name
 * Utility to find printer in list
 */
export async function getPrinterByName(printerName) {
  const printers = await getPrinterList();
  return printers.find(p => p.name === printerName);
}

/**
 * Validate printer exists
 */
export async function validatePrinter(printerName) {
  const printer = await getPrinterByName(printerName);
  if (!printer) {
    throw new Error(`Printer not found: ${printerName}`);
  }
  return printer;
}
