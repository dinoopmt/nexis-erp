import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

class PdfGenerationService {
  constructor() {
    this.browser = null;
  }

  // Initialize browser
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  // Close browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Register Handlebars helpers
  registerHelpers() {
    // Format currency with company's decimal places
    Handlebars.registerHelper('currency', (value, options = {}) => {
      // Handle both positional and hash arguments
      let decimals = 2;
      let showSymbol = true;
      
      // If options is a number, it's the decimals parameter (old style)
      if (typeof options === 'number') {
        decimals = options;
      }
      // If options is an object (Handlebars hash arguments)
      else if (typeof options === 'object' && options.hash) {
        decimals = options.hash.decimals || 2;
        showSymbol = options.hash.symbol !== false;
      }
      
      let numValue = 0;
      
      try {
        // Handle undefined/null
        if (value === undefined || value === null) {
          numValue = 0;
        }
        // Already a number
        else if (typeof value === 'number') {
          numValue = value;
        }
        // String
        else if (typeof value === 'string') {
          numValue = parseFloat(value) || 0;
        }
        // Object - could be Decimal128
        else if (typeof value === 'object') {
          // Decimal128 with $numberDecimal property
          if (value.$numberDecimal) {
            numValue = parseFloat(value.$numberDecimal) || 0;
          }
          // Decimal128 with toNumber method
          else if (typeof value.toNumber === 'function') {
            numValue = value.toNumber();
          }
          // BigInt
          else if (typeof value === 'bigint') {
            numValue = Number(value);
          }
          // Object.toString() as last resort
          else {
            numValue = parseFloat(value.toString()) || 0;
          }
        }
        // Fallback
        else {
          numValue = parseFloat(value) || 0;
        }
      } catch (e) {
        console.warn(`Currency helper error for value: ${value}`, e);
        numValue = 0;
      }
      
      const validDecimals = Math.min(Math.max(decimals, 0), 4);
      const formatted = numValue.toFixed(validDecimals);
      return showSymbol ? formatted : formatted;
    });

    // Format date
    const dateFormatter = (dateString, format = 'DD/MM/YYYY') => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
    };

    Handlebars.registerHelper('date', dateFormatter);
    Handlebars.registerHelper('formatDate', dateFormatter);

    // Add 1 to index for 1-based serial numbering
    Handlebars.registerHelper('slNo', (index) => {
      return (parseInt(index) || 0) + 1;
    });

    // Arabic text direction
    Handlebars.registerHelper('rtl', (language) => {
      return language === 'AR' ? 'rtl' : 'ltr';
    });

    // Join array
    Handlebars.registerHelper('join', (array, separator = ', ') => {
      return array.join(separator);
    });

    // Check equality
    Handlebars.registerHelper('eq', (a, b) => {
      return a === b;
    });
  }

  // Render template with data
  renderTemplate(templateHtml, cssContent, data, baseUrl = '') {
    try {
      this.registerHelpers();

      const template = Handlebars.compile(templateHtml);
      const invoiceHtml = template(data);

      // DEBUG: Check if image and note are rendering
      if (data.quotation && data.quotation.items && data.quotation.items.length > 0) {
        const firstItem = data.quotation.items[0];
        console.log(`\n🔍 TEMPLATE RENDER DEBUG:`);
        console.log(`   Input data.quotation.items[0].image: "${firstItem.image}"`);
        console.log(`   Input data.quotation.items[0].note: "${firstItem.note}"`);
        
        // Check if image/note tags are in rendered HTML
        if (invoiceHtml.includes('item-thumbnail')) {
          console.log(`   ✅ Found item-thumbnail class in HTML`);
        } else {
          console.log(`   ❌ NO item-thumbnail class in HTML - image tag not rendering!`);
        }
        
        if (invoiceHtml.includes('item-note')) {
          console.log(`   ✅ Found item-note class in HTML`);
        } else {
          console.log(`   ❌ NO item-note class in HTML - note div not rendering!`);
        }

        // Extract relevant section of HTML for debugging
        const itemRowStart = invoiceHtml.indexOf('<tr class="item-row">');
        if (itemRowStart !== -1) {
          const itemRowEnd = invoiceHtml.indexOf('</tr>', itemRowStart);
          const itemRowHtml = invoiceHtml.substring(itemRowStart, itemRowEnd + 5);
          console.log(`\n📝 Rendered item row HTML (first 500 chars):`);
          console.log(itemRowHtml.substring(0, 500));
        }
      }

      // Combine CSS + HTML with base URL for image loading
      const baseTag = baseUrl ? `<base href="${baseUrl}">` : '';
      
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="${data.language || 'en'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${baseTag}
          <style>
            ${cssContent}
          </style>
        </head>
        <body>
          ${invoiceHtml}
        </body>
        </html>
      `;

      return fullHtml;
    } catch (error) {
      console.error('Template rendering error:', error);
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  // Generate PDF from HTML
  async generatePdfFromHtml(htmlContent, options = {}) {
    try {
      console.log('🖨️ Starting PDF generation from HTML');
      
      // Minimal CSS injection
      const a4CssInjection = `
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
        </style>
      `;
      
      let enhancedHtml = htmlContent;
      if (htmlContent.includes('<head>')) {
        enhancedHtml = htmlContent.replace('<head>', `<head>${a4CssInjection}`);
      } else if (htmlContent.includes('<body>')) {
        enhancedHtml = htmlContent.replace('<body>', `<head>${a4CssInjection}</head><body>`);
      } else {
        enhancedHtml = `<!DOCTYPE html><html><head>${a4CssInjection}</head><body>${htmlContent}</body></html>`;
      }
      
      const browser = await this.initBrowser();
      console.log('✅ Browser initialized');
      
      const page = await browser.newPage();
      console.log('✅ New page created');

      // Calculate viewport size based on margins
      // A4 = 210mm × 297mm at 96dpi = 794px × 1123px
      // Subtract margins from width for viewport
      const marginTopMm = options.margins?.top || 10;
      const marginRightMm = options.margins?.right || 10;
      const marginBottomMm = options.margins?.bottom || 10;
      const marginLeftMm = options.margins?.left || 10;
      
      // 1mm ≈ 3.78px at 96dpi
      const pxPerMm = 96 / 25.4;
      const viewportWidth = Math.floor(210 * pxPerMm - (marginLeftMm + marginRightMm) * pxPerMm);
      const viewportHeight = Math.floor(297 * pxPerMm - (marginTopMm + marginBottomMm) * pxPerMm);
      
      await page.setViewport({ width: viewportWidth, height: viewportHeight });
      console.log(`✅ Viewport set to ${viewportWidth}×${viewportHeight} (A4 minus margins)`);
      
      // Set page content
      try {
        await page.setContent(enhancedHtml, { waitUntil: 'networkidle0', timeout: 30000 });
        console.log('✅ Page content set');
      } catch (err) {
        console.error('⚠️ Content error:', err.message);
        await page.setContent(enhancedHtml, { waitUntil: 'load' });
      }

      // Generate PDF with margins
      const pdfOptions = {
        format: options.pageSize || 'A4',
        landscape: options.landscape || false,
        margin: {
          top: `${marginTopMm}mm`,
          bottom: `${marginBottomMm}mm`,
          left: `${marginLeftMm}mm`,
          right: `${marginRightMm}mm`
        },
        printBackground: true
      };

      console.log('🖨️ Generating A4 PDF:', { viewport: `${viewportWidth}×${viewportHeight}`, margins: pdfOptions.margin });
      
      const pdf = await page.pdf(pdfOptions);
      console.log('✅ PDF generated:', pdf.length, 'bytes');
      
      await page.close();
      console.log('✅ Page closed');

      return pdf;
    } catch (error) {
      console.error('❌ PDF generation error:', error.message);
      console.error('Stack trace:', error.stack);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // Save PDF to file
  async savePdfToFile(pdfBuffer, filePath) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, pdfBuffer);
      return filePath;
    } catch (error) {
      console.error('PDF save error:', error);
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }

  // Main method: Generate PDF from template and invoice data
  async generateInvoicePdf(template, invoiceData, options = {}) {
    try {
      // Prepare data for template
      const templateData = {
        ...invoiceData,
        language: template.language,
        withLogo: template.includeLogo,
        company: invoiceData.company,
        invoice: invoiceData.invoice,
        items: invoiceData.items || [],
        formatCurrency: (value) => {
          const formatted = parseFloat(value).toFixed(invoiceData.company?.decimalPlaces || 2);
          return `${template.customDesign.currency} ${formatted}`;
        }
      };

      // Render template with data
      const htmlContent = this.renderTemplate(
        template.htmlContent,
        template.cssContent,
        templateData
      );

      // Generate PDF
      const pdf = await this.generatePdfFromHtml(htmlContent, {
        pageSize: template.customDesign.pageSize,
        margins: template.customDesign.margins,
        ...options
      });

      return pdf;
    } catch (error) {
      console.error('Invoice PDF generation error:', error);
      throw error;
    }
  }
}

export default new PdfGenerationService();
