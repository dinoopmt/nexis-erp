/**
 * Smart Print Service
 * 
 * Handles intelligent printing decisions based on terminal configuration
 * - Auto-print if printer is configured and enabled
 * - Show dialog if no printer configured
 * - Route to specific printer on backend
 */

/**
 * Check if should auto-print
 */
export function shouldAutoPrint(printerConfig) {
  return printerConfig && printerConfig.enabled && printerConfig.printerName;
}

/**
 * Get print job config for terminal
 */
export function getPrintJobConfig(terminalConfig, invoiceData, documentType = 'invoice') {
  if (!terminalConfig) {
    return null;
  }

  const printerConfig = terminalConfig.hardwareMapping?.invoicePrinter;
  const templateId = terminalConfig.formatMapping?.[documentType];

  return {
    autoPrint: shouldAutoPrint(printerConfig),
    printerName: printerConfig?.printerName || null,
    printerEnabled: printerConfig?.enabled || false,
    timeout: printerConfig?.timeout || 5000,
    templateId: templateId || null,
    documentType: documentType,
  };
}

/**
 * Send print job to backend
 */
export async function sendPrintJob(invoiceData, printConfig) {
  try {
    if (!printConfig || !printConfig.printerName) {
      console.warn('⚠️ No printer configured, skipping backend print');
      return { success: false, reason: 'No printer configured' };
    }

    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No auth token available');
    }

    // Get terminal ID from config
    const configRes = await fetch('/config/terminal.json');
    const { terminalId, apiBaseUrl } = await configRes.json();
    const baseUrl = apiBaseUrl || 'http://localhost:5000/api/v1';

    // Send to backend print endpoint
    const response = await fetch(`${baseUrl}/print/invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'terminal-id': terminalId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceId: invoiceData.id || invoiceData._id,
        printerName: printConfig.printerName,
        templateId: printConfig.templateId,
        autoPrint: printConfig.autoPrint,
        timeout: printConfig.timeout,
      }),
    });

    if (!response.ok) {
      throw new Error(`Print job failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Print job sent to backend:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error sending print job:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle invoice printing (main entry point)
 */
export async function printInvoice(invoiceData, terminalConfig, options = {}) {
  const {
    showDialog = true,
    documentType = 'invoice',
  } = options;

  try {
    // Get print configuration
    const printConfig = getPrintJobConfig(terminalConfig, invoiceData, documentType);

    // If auto-print is enabled, send to backend
    if (printConfig?.autoPrint) {
      console.log('📠 Auto-printing invoice to:', printConfig.printerName);
      const result = await sendPrintJob(invoiceData, printConfig);

      if (result.success) {
        return { success: true, method: 'auto-print', data: result.data };
      }
      // Fall through to browser print if backend print fails
    }

    // Fall back to browser print dialog
    if (showDialog) {
      console.log('🖨️ Showing browser print dialog');
      window.print();
      return { success: true, method: 'browser-print' };
    }

    return { success: false, reason: 'No print method available' };
  } catch (error) {
    console.error('❌ Error printing invoice:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test printer connectivity
 */
export async function testPrinter(printerName) {
  try {
    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const configRes = await fetch('/config/terminal.json');
    const { terminalId, apiBaseUrl } = await configRes.json();
    const baseUrl = apiBaseUrl || 'http://localhost:5000/api/v1';

    const response = await fetch(`${baseUrl}/print/test-printer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'terminal-id': terminalId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ printerName }),
    });

    if (!response.ok) {
      throw new Error(`Printer test failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Printer test result:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error testing printer:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get printer status
 */
export async function getPrinterStatus(printerName) {
  try {
    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No auth token available');
    }

    const configRes = await fetch('/config/terminal.json');
    const { terminalId, apiBaseUrl } = await configRes.json();
    const baseUrl = apiBaseUrl || 'http://localhost:5000/api/v1';

    const response = await fetch(
      `${baseUrl}/print/printer-status?printerName=${encodeURIComponent(printerName)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'terminal-id': terminalId,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get printer status: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Error getting printer status:', error);
    return { success: false, error: error.message };
  }
}
