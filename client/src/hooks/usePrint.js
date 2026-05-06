/**
 * usePrint Hook - Frontend Print Handler
 * 
 * Handles:
 * 1. A4 Invoice PDF generation and printing
 * 2. Thermal Receipt HTML generation and printing
 * 3. Printer configuration retrieval
 * 4. Error handling and user feedback
 * 
 * Usage:
 * const { printA4Invoice, printThermalReceipt, loading, error } = usePrint();
 * 
 * // Print A4 Invoice
 * await printA4Invoice(invoiceId, templateId, terminalId);
 * 
 * // Print Thermal Receipt
 * await printThermalReceipt(invoiceId, templateId, terminalId);
 */

import { useState, useCallback, useEffect } from 'react';
import apiClient from '../../api/apiClient';

export const usePrint = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Setup IPC listeners for print responses
  useEffect(() => {
    if (!window.ipcRenderer) {
      console.warn('⚠️ Electron IPC not available');
      return;
    }

    // Listen for A4 print response
    window.ipcRenderer.on('print-a4-invoice-response', (data) => {
      console.log('📥 Received A4 print response:', data);
      if (data.success) {
        setSuccessMessage(`✅ ${data.message}`);
      } else {
        setError(`❌ ${data.message}`);
      }
    });

    // Listen for thermal print response
    window.ipcRenderer.on('print-thermal-receipt-response', (data) => {
      console.log('📥 Received thermal print response:', data);
      if (data.success) {
        setSuccessMessage(`✅ ${data.message}`);
      } else {
        setError(`❌ ${data.message}`);
      }
    });

    // Cleanup listeners
    return () => {
      window.ipcRenderer.removeAllListeners('print-a4-invoice-response');
      window.ipcRenderer.removeAllListeners('print-thermal-receipt-response');
    };
  }, []);

  /**
   * PRINT A4 INVOICE (PDF METHOD)
   * Generates PDF on server and sends to client for printing
   */
  const printA4Invoice = useCallback(
    async (invoiceId, templateId, documentType = 'SALES_INVOICE', terminalId = null) => {
      try {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        console.log('🖨️ Starting A4 Invoice PDF print...');
        console.log('  invoiceId:', invoiceId);
        console.log('  templateId:', templateId);
        console.log('  documentType:', documentType);
        console.log('  terminalId:', terminalId);

        // Validation
        if (!invoiceId || !templateId) {
          throw new Error('Invoice ID and Template ID are required');
        }

        // Call API to generate PDF
        console.log('📥 Requesting PDF from server...');
        const response = await apiClient.post('/print/generate-a4-invoice-pdf', {
          invoiceId,
          templateId,
          documentType,
          terminalId,
        }, {
          responseType: 'blob', // Important: Get response as blob for PDF
        });

        // Create blob URL from PDF response
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        console.log('✅ PDF received from server');
        console.log('📄 PDF Size:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

        // Send to Electron IPC for printing
        if (window.ipcRenderer) {
          console.log('📡 Sending to Electron IPC...');
          window.ipcRenderer.send('print-a4-invoice', {
            pdfBlob: blob,
            blobUrl: blobUrl,
            invoiceId: invoiceId,
            terminalId: terminalId,
          });

          setSuccessMessage('Printing A4 invoice...');
          console.log('✅ Sent to Electron printer');
        } else {
          // Fallback: Open in browser for preview/print
          console.warn('⚠️ Electron IPC not available, opening in browser');
          window.open(blobUrl, '_blank');
          setSuccessMessage('PDF opened in new window. Use browser print function.');
        }

        setLoading(false);
        return { success: true, blob, blobUrl };

      } catch (err) {
        console.error('❌ Error printing A4 invoice:', err);
        setError(err.message || 'Failed to print invoice');
        setLoading(false);
        throw err;
      }
    },
    []
  );

  /**
   * PRINT THERMAL RECEIPT (DIRECT HTML METHOD)
   * Gets HTML directly from server and prints to thermal printer
   */
  const printThermalReceipt = useCallback(
    async (invoiceId, templateId, documentType = 'SALES_INVOICE', terminalId = null) => {
      try {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        console.log('🧾 Starting Thermal Receipt print...');
        console.log('  invoiceId:', invoiceId);
        console.log('  templateId:', templateId);
        console.log('  documentType:', documentType);
        console.log('  terminalId:', terminalId);

        // Validation
        if (!invoiceId || !templateId) {
          throw new Error('Invoice ID and Template ID are required');
        }

        // Call API to generate thermal receipt
        console.log('📥 Requesting thermal receipt from server...');
        const response = await apiClient.post('/print/generate-thermal-receipt', {
          invoiceId,
          templateId,
          documentType,
          terminalId,
        });

        const { html, format, language, templateName, css } = response.data.data;

        console.log('✅ Thermal receipt received from server');
        console.log('  Format:', format);
        console.log('  Language:', language);
        console.log('  Template:', templateName);

        // Send to Electron IPC for printing
        if (window.ipcRenderer) {
          console.log('📡 Sending to Electron IPC...');
          window.ipcRenderer.send('print-thermal-receipt', {
            html: html,
            css: css,
            format: format,
            language: language,
            templateName: templateName,
            invoiceId: invoiceId,
            terminalId: terminalId,
          });

          setSuccessMessage(`Printing thermal receipt (${format})...`);
          console.log('✅ Sent to Electron printer');
        } else {
          // Fallback: Open HTML in new window
          console.warn('⚠️ Electron IPC not available, opening in browser');
          const newWindow = window.open('', '_blank');
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Thermal Receipt</title>
                <meta charset="UTF-8">
                <style>${css}</style>
              </head>
              <body>
                ${html}
              </body>
            </html>
          `);
          newWindow.document.close();
          setSuccessMessage('Receipt opened in new window. Use browser print function.');
        }

        setLoading(false);
        return { success: true, html, format, language };

      } catch (err) {
        console.error('❌ Error printing thermal receipt:', err);
        setError(err.message || 'Failed to print thermal receipt');
        setLoading(false);
        throw err;
      }
    },
    []
  );

  /**
   * GET TERMINAL PRINTER CONFIGURATION
   * Retrieves configured printers for the terminal
   */
  const getTerminalPrinterConfig = useCallback(async (terminalId) => {
    try {
      console.log('🖨️ Fetching terminal printer configuration...');

      const response = await apiClient.get(`/print/terminal-config/${terminalId}`);
      const { a4Printer, thermalPrinter } = response.data.data;

      console.log('✅ Terminal config retrieved');
      console.log('  A4 Printer:', a4Printer.printerName || 'Not configured');
      console.log('  Thermal Printer:', thermalPrinter.printerName || 'Not configured');

      return { a4Printer, thermalPrinter };

    } catch (err) {
      console.error('❌ Error fetching terminal config:', err);
      throw err;
    }
  }, []);

  /**
   * GET AVAILABLE TEMPLATES
   * Retrieves available print templates for a document type
   */
  const getAvailableTemplates = useCallback(async (documentType = 'SALES_INVOICE', format = 'A4') => {
    try {
      console.log('📋 Fetching available templates...');

      const response = await apiClient.get('/print/available-templates', {
        params: {
          documentType,
          format,
        },
      });

      console.log(`✅ Found ${response.data.count} templates`);
      return response.data.data;

    } catch (err) {
      console.error('❌ Error fetching templates:', err);
      throw err;
    }
  }, []);

  /**
   * TEST PRINTER CONNECTION
   * Tests if printer is available and responsive
   */
  const testPrinterConnection = useCallback(async (terminalId, printerType = 'a4') => {
    try {
      console.log(`🔌 Testing ${printerType} printer connection...`);

      const response = await apiClient.post('/print/test-printer', {
        terminalId,
        printerType,
      });

      const { printerName, status } = response.data.data;
      console.log(`✅ Printer test passed: ${printerName} (${status})`);

      return response.data.data;

    } catch (err) {
      console.error('❌ Printer connection failed:', err);
      throw err;
    }
  }, []);

  /**
   * PRINT WITH AUTO-DETECTION
   * Automatically selects printer based on invoice type
   */
  const printWithAutoDetection = useCallback(
    async (invoiceId, terminalId, printerType = 'a4') => {
      try {
        // Get terminal printer config
        const config = await getTerminalPrinterConfig(terminalId);

        // Select appropriate printer config
        const printerConfig = printerType === 'a4' ? config.a4Printer : config.thermalPrinter;

        if (!printerConfig.enabled) {
          throw new Error(`${printerType.toUpperCase()} printer is not enabled for this terminal`);
        }

        if (!printerConfig.templateId) {
          throw new Error(`No template configured for ${printerType.toUpperCase()} printer`);
        }

        // Print based on type
        if (printerType === 'a4') {
          return await printA4Invoice(invoiceId, printerConfig.templateId, 'SALES_INVOICE', terminalId);
        } else {
          return await printThermalReceipt(invoiceId, printerConfig.templateId, 'SALES_INVOICE', terminalId);
        }

      } catch (err) {
        console.error('❌ Auto-detection print failed:', err);
        setError(err.message);
        throw err;
      }
    },
    [printA4Invoice, printThermalReceipt, getTerminalPrinterConfig]
  );

  return {
    // Print functions
    printA4Invoice,
    printThermalReceipt,
    printWithAutoDetection,

    // Configuration functions
    getTerminalPrinterConfig,
    getAvailableTemplates,
    testPrinterConnection,

    // State
    loading,
    error,
    successMessage,
    setError,
    setSuccessMessage,
  };
};

export default usePrint;
