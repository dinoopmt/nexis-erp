/**
 * Client-side PDF Generator Service
 * Generates PDFs directly in browser/Electron using html2pdf or canvas-based approach
 * No server dependency - works offline
 */

// ✅ Dynamic import for html2pdf - works in both browser and Node contexts
let html2pdf;

const initHtml2Pdf = async () => {
  if (!html2pdf) {
    try {
      // Try ESM import with proper handling
      const module = await import('html2pdf.js');
      html2pdf = module.default || module;
      console.log('✅ html2pdf library loaded');
    } catch (err) {
      console.warn('⚠️ html2pdf import failed:', err.message);
      // Fallback - try window.html2pdf if available (UMD)
      if (typeof window !== 'undefined' && window.html2pdf) {
        html2pdf = window.html2pdf;
      } else {
        throw new Error('html2pdf library not available');
      }
    }
  }
  return html2pdf;
};

export class ClientPdfGeneratorService {
  /**
   * Generate PDF from HTML element or string
   * @param {HTMLElement|string} content - Element or HTML string
   * @param {object} options - { filename, margin, format, quality }
   * @returns {Promise<Blob>} PDF blob
   */
  static async generatePdfFromElement(content, options = {}) {
    try {
      console.log('📄 [Client] Generating PDF from HTML...');

      await initHtml2Pdf();

      const defaultOptions = {
        margin: options.margin || 10,
        filename: options.filename || `invoice_${Date.now()}.pdf`,
        image: {
          type: 'jpeg',
          quality: options.quality || 0.98
        },
        html2canvas: {
          scale: options.scale || 2,
          useCORS: true,
          allowTaint: true
        },
        jsPDF: {
          orientation: 'portrait',
          unit: 'mm',
          format: options.format || 'a4'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // Create element if string passed
      let element = content;
      if (typeof content === 'string') {
        const div = document.createElement('div');
        div.innerHTML = content;
        element = div;
      }

      // Generate PDF
      const pdf = html2pdf();
      pdf
        .set(defaultOptions)
        .from(element)
        .save();

      console.log('✅ PDF generated successfully');

      // Return as blob for programmatic use
      return new Promise((resolve) => {
        // html2pdf saves to file, but we also need to return blob
        pdf.output('blob').then(blob => {
          resolve(blob);
        });
      });

    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw error;
    }
  }

/**
 * Generate PDF and get blob (for printing/saving)
 * @param {HTMLElement|string} content - Content to convert
 * @param {object} options - PDF options
 * @returns {Promise<Blob>} PDF blob
 */
static async getPdfBlob(content, options = {}) {
  try {
    console.log('📄 [Client] Creating PDF blob...');

    const lib = await initHtml2Pdf(); // ✅ Initialize first
    console.log('📄 [Client] html2pdf library ready:', typeof lib);

    const defaultOptions = {
      margin: options.margin || 10,
      image: {
        type: 'jpeg',
        quality: options.quality || 0.98
      },
      html2canvas: {
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        orientation: 'portrait',
        unit: 'mm',
        format: options.format || 'a4'
      }
    };

    let element = content;
    if (typeof content === 'string') {
      console.log('📄 [Client] Creating DIV element from HTML string...');
      const div = document.createElement('div');
      div.innerHTML = content;
      div.style.padding = '20px';
      element = div;
    }

    console.log('📄 [Client] Starting PDF generation with html2pdf...');
    
    // html2pdf returns a jsPDF instance, not a direct promise
    const pdfInstance = lib()
      .set(defaultOptions)
      .from(element);

    console.log('📄 [Client] PDF instance created, outputting blob...');
    
    const blob = await pdfInstance.output('blob');

    console.log(`✅ PDF blob created: ${(blob.size / 1024).toFixed(2)} KB`);
    console.log('📄 [Client] Blob type:', blob.type);
    return blob;

  } catch (error) {
    console.error('❌ PDF blob error:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    throw error;
  }
}

  /**
   * Generate PDF with invoice template rendering
   * @param {object} invoiceData - Invoice details
   * @param {string} htmlTemplate - Invoice HTML template
   * @param {object} options - PDF options
   * @returns {Promise<Blob>} PDF blob
   */
  static async generateInvoicePdf(invoiceData, htmlTemplate, options = {}) {
    try {
      console.log('📄 Generating invoice PDF (client-side)...');

      // Create clean HTML document
      const cleanHtml = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice - ${invoiceData.invoiceNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', 'Helvetica', sans-serif;
              line-height: 1.6;
              color: #333;
              background: white;
              direction: rtl;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
                background: white;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          ${htmlTemplate}
        </body>
        </html>
      `;

      const blob = await this.getPdfBlob(cleanHtml, options);
      console.log(`✅ Invoice PDF generated: ${invoiceData.invoiceNumber}`);
      return blob;

    } catch (error) {
      console.error('❌ Invoice PDF error:', error);
      throw error;
    }
  }

  /**
   * Send PDF to Electron printer API for silent printing
   * @param {Blob} pdfBlob - PDF to print
   * @param {object} options - { silent, printerName, etc }
   * @returns {Promise<object>} Print result
   */
  static async printPdfInElectron(pdfBlob, options = {}) {
    try {
      if (!window.electronAPI || !window.electronAPI.pdf) {
        throw new Error('Electron API not available');
      }

      console.log('🖨️ Sending PDF to Electron printer...');

      // Convert blob to base64
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binary = String.fromCharCode.apply(null, uint8Array);
      const base64 = btoa(binary);

      // Send to Electron via IPC
      const result = await window.electronAPI.pdf.printPdf(base64, options);
      
      if (result.success) {
        console.log('✅ PDF sent to printer successfully');
      }
      return result;

    } catch (error) {
      console.error('❌ Electron print error:', error);
      throw error;
    }
  }

  /**
   * Save PDF to file using Electron or browser
   * @param {Blob} pdfBlob - PDF to save
   * @param {string} fileName - File name
   * @returns {Promise<object>} Save result
   */
  static async savePdf(pdfBlob, fileName) {
    try {
      const isElectron = window.electronAPI && typeof window.electronAPI.isElectron === 'boolean';

      if (isElectron) {
        // Use Electron file save dialog
        console.log('💾 Using Electron file save...');
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const result = await window.electronAPI.pdf.saveToFile(
          Buffer.from(arrayBuffer),
          fileName
        );
        return result;
      } else {
        // Use browser blob download
        console.log('💾 Using browser download...');
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, message: 'PDF downloaded' };
      }

    } catch (error) {
      console.error('❌ Save PDF error:', error);
      throw error;
    }
  }
}

export default ClientPdfGeneratorService;
