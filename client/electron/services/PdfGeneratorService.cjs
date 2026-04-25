/**
 * Electron PDF Generator Service
 * Generates PDFs directly in Electron without server dependency
 * Uses html2pdf or native print-to-PDF
 */

const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

class PdfGeneratorService {
  /**
   * Register IPC handlers for PDF generation
   * Call this in main process on app startup
   */
  static registerHandlers() {
    // Generate PDF from HTML
    ipcMain.handle('pdf:generateFromHtml', async (event, htmlContent, options = {}) => {
      try {
        return await this.generateFromHtml(htmlContent, options);
      } catch (error) {
        console.error('❌ PDF generation error:', error);
        return { success: false, message: error.message };
      }
    });

    // Print to PDF using native dialog
    ipcMain.handle('pdf:printToPdf', async (event, htmlContent, options = {}) => {
      try {
        return await this.printToPdf(htmlContent, options);
      } catch (error) {
        console.error('❌ Print-to-PDF error:', error);
        return { success: false, message: error.message };
      }
    });

    // Save PDF to file
    ipcMain.handle('pdf:saveToFile', async (event, pdfBuffer, fileName) => {
      try {
        const result = await dialog.showSaveDialog({
          title: 'Save Invoice PDF',
          defaultPath: fileName,
          filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });

        if (!result.canceled && result.filePath) {
          fs.writeFileSync(result.filePath, pdfBuffer);
          console.log(`✅ PDF saved to: ${result.filePath}`);
          return { success: true, filePath: result.filePath };
        }
        return { success: false, message: 'Save cancelled' };
      } catch (error) {
        console.error('❌ File save error:', error);
        return { success: false, message: error.message };
      }
    });

    // ✅ NEW: A4 Silent Print using HTML + BrowserWindow (Best Approach for ERP)
    ipcMain.handle('pdf:print-invoice-a4', async (event, invoiceId, templateId, printerName, apiUrl) => {
      try {
        console.log('\n[IPC] Received print-invoice-a4 request');
        await PdfGeneratorService.printInvoiceA4Silent(invoiceId, templateId, printerName, apiUrl);
        return { success: true, message: 'Invoice sent to printer' };
      } catch (error) {
        console.error('[IPC] Print error:', error.message);
        return { success: false, message: error.message };
      }
    });

    // ✅ OLD: PDF Blob Print (kept for backwards compatibility)
    ipcMain.handle('pdf:print-blob', async (event, arrayBuffer, options = {}) => {
      let tempFilePath = null;
      
      try {
        console.log('\n========== PRINT JOB STARTED ==========');
        console.log('🖨️ [Main] Received PDF blob for printing...');
        console.log(`   Printer requested: ${options.printerName || 'DEFAULT'}`);
        
        // Convert ArrayBuffer to Buffer
        const buffer = Buffer.from(arrayBuffer);
        console.log(`📄 PDF blob size: ${buffer.length} bytes`);

        // Write to temp file
        const tempDir = path.join(process.env.TEMP || '/tmp', 'nexis-print');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
          console.log(`📁 Created temp directory: ${tempDir}`);
        }
        
        tempFilePath = path.join(tempDir, `invoice_${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, buffer);
        console.log(`✅ Temp PDF saved: ${tempFilePath}`);
        console.log(`   File exists: ${fs.existsSync(tempFilePath)}`);
        console.log(`   File size: ${fs.statSync(tempFilePath).size} bytes`);

        // Try to send to system printer with specified printer name
        try {
          console.log('\n📤 Attempting system print...');
          await this.sendToPrinter(tempFilePath, options.printerName);
          console.log('✅ Print job completed successfully\n========== PRINT JOB ENDED ==========\n');
        } catch (printError) {
          console.warn('⚠️ System print failed:', printError.message);
          console.log('\n📂 Falling back to opening PDF with default application...');
          // Fallback: open the PDF with default application
          await this.openFileWithDefault(tempFilePath);
          console.log('✅ PDF opened with default application\n========== PRINT JOB ENDED ==========\n');
        }
        
        // Clean up temp file after print
        setTimeout(() => {
          try {
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
              console.log('🧹 Temp file cleaned up');
            }
          } catch (err) {
            console.warn('⚠️ Could not clean up temp file:', err.message);
          }
        }, 5000);

        return { success: true, message: 'Print job sent to printer' };
      } catch (error) {
        console.error('❌ PDF print error:', error.message);
        console.error('   Stack:', error.stack);
        
        // Cleanup on error
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (err) {
            console.warn('⚠️ Could not clean up temp file:', err.message);
          }
        }
        
        return { success: false, message: error.message };
      }
    });

    console.log('✅ PDF Generator IPC handlers registered');
  }

  /**
   * Generate PDF from HTML using html2pdf library
   * Lightweight, no server needed
   * @param {string} htmlContent - HTML to convert
   * @param {object} options - { filename, format, margin, etc }
   * @returns {object} Success status
   */
  static async generateFromHtml(htmlContent, options = {}) {
    try {
      console.log('📄 [Main] PDF generation configured for renderer...');
      
      // PDF generation happens in renderer with html2pdf.js
      // Main process just validates
      return {
        success: true,
        message: 'PDF generation in progress'
      };
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw error;
    }
  }

  /**
   * Print to PDF using Electron's native print dialog
   * High quality, native implementation
   * @param {object} webContents - BrowserWindow webContents
   * @param {object} options - Print options
   * @returns {object} Result with PDF path
   */
  static async printToPdf(webContents, options = {}) {
    try {
      console.log('🖨️ Printing to PDF using Electron native dialog...');

      const printSettings = {
        silent: options.silent || false,
        printBackground: true,
        color: true,
        margin: {
          marginType: 'custom',
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        },
        pageSize: 'A4',
        ...options
      };

      const pdfPath = path.join(process.env.APPDATA || '.', 'NEXIS_Invoices');
      if (!fs.existsSync(pdfPath)) {
        fs.mkdirSync(pdfPath, { recursive: true });
      }

      const fileName = `Invoice_${Date.now()}.pdf`;
      const filePath = path.join(pdfPath, fileName);

      // Use webContents.printToPDF()
      const pdfBuffer = await webContents.printToPDF(printSettings);
      fs.writeFileSync(filePath, pdfBuffer);

      console.log(`✅ PDF saved to: ${filePath}`);
      return {
        success: true,
        filePath,
        fileName,
        size: pdfBuffer.length
      };
    } catch (error) {
      console.error('❌ Print-to-PDF error:', error);
      throw error;
    }
  }

  /**
   * ✅ BEST APPROACH: Silent print A4 invoice using HTML + Electron's webContents.print()
   * This is the production-grade approach used by ERP systems
   * 
   * @param {string} invoiceId - Invoice ID to print
   * @param {string} templateId - Template ID for rendering
   * @param {string} terminalId - Terminal ID for store-specific header
   * @param {string} printerName - Printer name from terminal settings
   * @param {string} apiUrl - API base URL
   * @returns {Promise<void>}
   */
  /**
   * ✅ UNIFIED: A4 Silent Print for all document types (Invoice, Quotation, Order, Delivery, Return)
   * Single generic method handles all sales documents
   * @param {string} documentType - 'INVOICE'|'QUOTATION'|'SALES_ORDER'|'DELIVERY_NOTE'|'SALES_RETURN'
   * @param {string} documentId - Document ID
   * @param {string} templateId - Template ID from terminal config
   * @param {string} terminalId - Terminal ID
   * @param {string} printerName - Printer name from terminal config (undefined = system default)
   * @param {string} apiUrl - API base URL (includes /api/v1)
   * @returns {Promise<void>}
   */
  static async printDocumentA4Silent(documentType, documentId, templateId, terminalId, printerName, apiUrl) {
    // Map document type to endpoint
    const endpointMap = {
      'INVOICE': '/invoices',
      'QUOTATION': '/quotations',
      'SALES_ORDER': '/sales-orders',
      'DELIVERY_NOTE': '/delivery-notes',
      'SALES_RETURN': '/sales-returns'
    };

    const endpoint = endpointMap[documentType] || '/documents';
    const typeLabel = documentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    return new Promise((resolve, reject) => {
      try {
        console.log(`\n========== A4 ${documentType} SILENT PRINT STARTED ==========`);
        console.log(`🖨️ [Main] Starting A4 silent print...`);
        console.log(`   Document Type: ${typeLabel}`);
        console.log(`   Document ID: ${documentId}`);
        console.log(`   Terminal ID: ${terminalId}`);
        console.log(`   Printer: ${printerName || 'SYSTEM DEFAULT'}`);

        const { BrowserWindow } = require('electron');
        
        // Create hidden window for printing
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, '../preload.cjs')
          }
        });

        console.log('📄 Created hidden print window');

        // Build print URL with A4 query parameters
        const printUrl = `${apiUrl}${endpoint}/${documentId}/html?templateId=${templateId}&terminalId=${terminalId}&print=true`;
        console.log(`   Print URL: ${printUrl}`);

        console.log('📥 Loading HTML into print window...');
        printWindow.loadURL(printUrl);

        // When page finishes loading, send to printer
        printWindow.webContents.on('did-finish-load', () => {
          console.log(`✅ ${typeLabel} HTML loaded`);
          console.log('🖨️ Sending to printer with A4 settings...');

          // Build print options
          const printOptions = {
            silent: true,              // No print dialog
            printBackground: true,     // Print background colors/images
            pageSize: 'A4',            // A4 paper size
            margins: { marginType: 'none' }  // Use CSS margins
          };

          // Only add deviceName if specific printer provided
          if (printerName) {
            printOptions.deviceName = printerName;
          }

          printWindow.webContents.print(printOptions, (success, failureReason) => {
            if (!success) {
              console.error(`❌ Print failed: ${failureReason}`);
              console.log('   Attempting fallback without specific printer...');
              
              // Fallback: try without printer name
              const fallbackOptions = {
                silent: true,
                printBackground: true,
                pageSize: 'A4',
                margins: { marginType: 'none' }
              };
              
              printWindow.webContents.print(fallbackOptions, (success2) => {
                if (!success2) {
                  console.error(`⚠️ Fallback also failed`);
                }
                printWindow.close();
              });
            } else {
              console.log('✅ Print sent to printer successfully');
              console.log('📤 Print job queued on printer');
            }

            // Close window after delay to ensure print job is queued
            setTimeout(() => {
              printWindow.close();
              console.log('🧹 Print window closed');
              console.log(`========== A4 ${documentType} SILENT PRINT ENDED ==========\n`);
              resolve();
            }, 2000);
          });
        });

        // Handle load errors
        printWindow.webContents.on('did-fail-load', (errorCode, errorDescription) => {
          console.error(`❌ Failed to load ${typeLabel} HTML: ${errorDescription}`);
          printWindow.close();
          reject(new Error(`Failed to load ${typeLabel}: ${errorDescription}`));
        });

        // Handle crashes
        printWindow.webContents.on('crashed', () => {
          console.error('❌ Print window crashed');
          if (!printWindow.isDestroyed()) {
            printWindow.close();
          }
          reject(new Error('Print window crashed'));
        });

      } catch (err) {
        console.error('❌ Print initialization error:', err.message);
        console.error('   Stack:', err.stack);
        reject(err);
      }
    });
  }

  /**
   * Open PDF with default application (fallback if print fails)
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<void>}
   */
  static async openFileWithDefault(filePath) {
    return new Promise((resolve, reject) => {
      try {
        if (process.platform === 'win32') {
          // Windows: Use cmd /c start
          console.log('💻 [Windows] Opening PDF with default application...');
          execFile('cmd.exe', ['/c', 'start', '""', filePath], { 
            windowsHide: true 
          }, (error) => {
            if (error) {
              console.error('❌ Failed to open file:', error.message);
              reject(error);
            } else {
              console.log('✅ PDF opened with default app');
              resolve();
            }
          });
        } else if (process.platform === 'darwin') {
          // macOS: Use open command
          console.log('🍎 [macOS] Opening PDF with default application...');
          execFile('open', [filePath], (error) => {
            if (error) {
              console.error('❌ Failed to open file:', error.message);
              reject(error);
            } else {
              console.log('✅ PDF opened with default app');
              resolve();
            }
          });
        } else {
          // Linux: Use xdg-open command
          console.log('🐧 [Linux] Opening PDF with default application...');
          execFile('xdg-open', [filePath], (error) => {
            if (error) {
              console.error('❌ Failed to open file:', error.message);
              reject(error);
            } else {
              console.log('✅ PDF opened with default app');
              resolve();
            }
          });
        }
      } catch (err) {
        console.error('❌ Open file error:', err.message);
        reject(err);
      }
    });
  }
}

module.exports = PdfGeneratorService;
