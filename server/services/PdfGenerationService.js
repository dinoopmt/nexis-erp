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
    // Format currency
    Handlebars.registerHelper('currency', (value, currency = 'AED', decimals = 2) => {
      const formatted = parseFloat(value).toFixed(decimals);
      return `${currency} ${formatted}`;
    });

    // Format date
    Handlebars.registerHelper('date', (dateString, format = 'DD/MM/YYYY') => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
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
  renderTemplate(templateHtml, cssContent, data) {
    try {
      this.registerHelpers();

      const template = Handlebars.compile(templateHtml);
      const invoiceHtml = template(data);

      // Combine CSS + HTML
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="${data.language || 'en'}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Set page content
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate PDF with options
      const pdfOptions = {
        format: options.pageSize || 'A4',
        margin: {
          top: `${options.margins?.top || 10}mm`,
          bottom: `${options.margins?.bottom || 10}mm`,
          left: `${options.margins?.left || 10}mm`,
          right: `${options.margins?.right || 10}mm`
        },
        printBackground: true,
        ...options.pdfOptions
      };

      const pdf = await page.pdf(pdfOptions);
      await page.close();

      return pdf;
    } catch (error) {
      console.error('PDF generation error:', error);
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
