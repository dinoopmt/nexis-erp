/**
 * Printer Service
 * Handles printer detection and print job submission
 * Works with both Electron and system printers
 * 
 * STATUS: PARTIALLY DEPRECATED
 * Current printing flow uses /print-to-terminal endpoints with client-side printing
 * (see server/routes/invoicePdfRoutes.js and documentPdfRoutes.js)
 * 
 * CURRENTLY USED:
 * - getPrinterList() - Used to list available printers
 * 
 * NOT USED (Orphaned - can be removed):
 * - submitPrintJobWithBuffer() - Replaced by client-side printing
 * - applyPrintStyles() - No longer used
 * - getPrinterByName() - Helper for removed functions
 * - validatePrinter() - Helper for removed functions
 * - printPdfToWindowsPrinter() - Replaced by Electron webContents.print()
 * - generatePdfFromHtml() - Replaced by PdfGenerationService
 */

import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const execPromise = promisify(exec);

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
 * Generate PDF from HTML using Puppeteer
 */
async function generatePdfFromHtml(html, orientation = 'portrait') {
  try {
    console.log(`🔄 Starting Puppeteer to generate PDF...`);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    console.log(`📄 Setting HTML content...`);
    await page.setContent(html, { waitUntil: 'networkidle2' });

    const pdfOptions = {
      format: 'A4',
      landscape: orientation === 'landscape',
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      },
      printBackground: true
    };

    console.log(`🖨️ Generating PDF with options:`, pdfOptions);
    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    console.log(`✅ PDF generated successfully: ${pdfBuffer.length} bytes`);
    return pdfBuffer;

  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    throw error;
  }
}

/**
 * Print PDF to Windows printer using system command
 */
async function printPdfToWindowsPrinter(pdfPath, printerName) {
  try {
    console.log(`🖨️ Printing to Windows printer: ${printerName}`);
    console.log(`📄 PDF file: ${pdfPath}`);

    // Use Windows print command
    // SumatraPDF is a reliable command-line PDF printer on Windows
    // Fallback to print.exe (built-in Windows command)
    
    const command = `powershell -Command "& {$printer='${printerName}'; $file='${pdfPath}'; Start-Process -FilePath 'C:\\\\Program Files\\\\SumatraPDF\\\\SumatraPDF.exe' -ArgumentList '-print-to ${printer} -print-to-file -print-to-file-pdf -' -NoNewWindow -Wait}" || powershell -Command "& {$printer='${printerName}'; $file='${pdfPath}'; Start-Process -FilePath 'notepad' -ArgumentList '/p ${pdfPath}' -NoNewWindow -Wait}"`;

    console.log(`🔧 Executing print command...`);
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.warn(`⚠️ Print command stderr:`, stderr);
    }
    if (stdout) {
      console.log(`✅ Print command output:`, stdout);
    }

    console.log(`✅ Print job sent to ${printerName}`);
    return true;

  } catch (error) {
    console.error(`❌ Error printing to ${printerName}:`, error.message);
    throw error;
  }
}

/**
 * Submit print job with pre-generated PDF buffer
 * ✅ REUSES PDF that was already generated server-side
 * Just handles saving to temp and printing
 */
export async function submitPrintJobWithBuffer({
  pdfBuffer,
  printerName,
  documentName = 'document'
}) {
  let tempPdfPath = null;
  
  try {
    console.log('\n========== PRINT JOB (WITH BUFFER) ==========');
    console.log(`🖨️ Printer: ${printerName}`);
    console.log(`📄 PDF size: ${pdfBuffer.length} bytes`);
    console.log(`📄 Document name: ${documentName}`);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty or invalid');
    }

    // Step 1: Save PDF to temporary location
    console.log(`\n[Step 1] Saving PDF to temp file...`);
    const tempDir = os.tmpdir();
    const tempFileName = `${documentName}-${Date.now()}.pdf`;
    tempPdfPath = path.join(tempDir, tempFileName);
    
    await fs.writeFile(tempPdfPath, pdfBuffer);
    console.log(`✅ PDF saved to: ${tempPdfPath}`);
    console.log(`   File size: ${pdfBuffer.length} bytes`);

    // Step 2: Submit to printer
    console.log(`\n[Step 2] Submitting to printer...`);
    
    if (printerName.toLowerCase().includes('pdf')) {
      // For PDF printer, just keep the file location
      console.log(`✅ PDF printer selected - PDF ready at: ${tempPdfPath}`);
    } else if (process.platform === 'win32') {
      // Windows: Use system print command
      console.log(`🔧 Using Windows print command...`);
      await printPdfToWindowsPrinter(tempPdfPath, printerName);
    } else {
      // Linux/Mac: Use lp or lpr
      console.log(`🔧 Using ${process.platform} print command...`);
      const printCmd = process.platform === 'darwin' 
        ? `lp -d "${printerName}" "${tempPdfPath}"`
        : `lp -d ${printerName} ${tempPdfPath}`;
      
      await execPromise(printCmd);
      console.log(`✅ Print job submitted on ${process.platform}`);
    }

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`\n✅ PRINT JOB COMPLETED`);
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Printer: ${printerName}`);
    console.log(`   Document: ${documentName}`);
    console.log(`   PDF size: ${pdfBuffer.length} bytes`);

    return {
      success: true,
      jobId: jobId,
      message: `Print job submitted to ${printerName}`,
      status: 'submitted',
      printer: printerName,
      documentName: documentName,
      pdfSize: pdfBuffer.length,
      tempPath: tempPdfPath,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ PRINT JOB FAILED');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    // Clean up temp file on error
    if (tempPdfPath) {
      try {
        await fs.unlink(tempPdfPath);
        console.log(`🧹 Cleaned up temp file: ${tempPdfPath}`);
      } catch (cleanupErr) {
        console.warn(`⚠️ Failed to clean temp file: ${cleanupErr.message}`);
      }
    }

    throw new Error(`Print job failed: ${error.message}`);
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
