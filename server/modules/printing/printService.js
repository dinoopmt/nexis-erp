/**
 * Print Service - Core Logic for A4 & Thermal Printing
 * 
 * Handles:
 * 1. Invoice data fetching from various document types (Sales, DeliveryNote, Quotation, etc.)
 * 2. Template loading (A4 standard & Thermal variants)
 * 3. Template rendering with Handlebars
 * 4. PDF generation (A4 via puppeteer)
 * 5. HTML output (Thermal receipts)
 */

import SalesInvoice from '../../Models/Sales/SalesInvoice.js';
import DeliveryNote from '../../Models/Sales/DeliveryNote.js';
import Quotation from '../../Models/Sales/Quotation.js';
import SalesOrder from '../../Models/Sales/SalesOrder.js';
import SalesReturn from '../../Models/Sales/SalesReturn.js';
import InvoiceTemplate from '../../Models/InvoiceTemplate.js';
import TerminalManagement from '../../Models/TerminalManagement.js';
import StoreSettings from '../../Models/StoreSettings.js';
import Company from '../../Models/Company.js';
import PdfGenerationService from '../../services/PdfGenerationService.js';
import Handlebars from 'handlebars';

class PrintService {
  constructor() {
    this.pdfService = PdfGenerationService;
  }

  /**
   * Map document type to model
   */
  getDocumentModel(documentType) {
    const models = {
      'SALES_INVOICE': SalesInvoice,
      'DELIVERY_NOTE': DeliveryNote,
      'QUOTATION': Quotation,
      'SALES_ORDER': SalesOrder,
      'SALES_RETURN': SalesReturn,
    };
    return models[documentType] || SalesInvoice;
  }

  /**
   * STEP 1: Fetch invoice data from database
   * @param {String} invoiceId - Document ID (MongoDB ObjectId)
   * @param {String} documentType - Type of document (SALES_INVOICE, QUOTATION, etc.)
   * @returns {Object} Complete invoice data with line items
   */
  async fetchInvoiceData(invoiceId, documentType = 'SALES_INVOICE') {
    try {
      const Model = this.getDocumentModel(documentType);
      
      console.log(`📄 Fetching ${documentType} data for ID: ${invoiceId}`);
      
      const invoice = await Model.findById(invoiceId)
        .populate('customerId', 'customerName customerTRN customerPhone customerAddress')
        .populate('items.productId', 'itemName itemCode')
        .lean();

      if (!invoice) {
        throw new Error(`${documentType} not found with ID: ${invoiceId}`);
      }

      console.log(`✅ Invoice data fetched successfully`);
      return invoice;
    } catch (error) {
      console.error(`❌ Error fetching invoice data:`, error.message);
      throw error;
    }
  }

  /**
   * STEP 2: Load template from database
   * @param {String} templateId - Template MongoDB ObjectId
   * @returns {Object} Template object with htmlContent, cssContent, customDesign
   */
  async loadTemplate(templateId) {
    try {
      console.log(`📋 Loading template: ${templateId}`);

      const template = await InvoiceTemplate.findById(templateId).lean();

      if (!template) {
        throw new Error(`Template not found with ID: ${templateId}`);
      }

      console.log(`✅ Template loaded: ${template.templateName}`);
      return template;
    } catch (error) {
      console.error(`❌ Error loading template:`, error.message);
      throw error;
    }
  }

  /**
   * STEP 3: Fetch store details for invoice header
   * Store name and address vary by terminal/store
   * @param {String} terminalId - Terminal ID
   * @returns {Object} Store details (name, address, logo, etc.)
   */
  async getStoreDetails(terminalId) {
    try {
      if (!terminalId) {
        console.warn('⚠️ No terminal ID provided, using company defaults');
        return null;
      }

      const terminal = await TerminalManagement.findOne({ terminalId }).lean();
      if (!terminal || !terminal.storeId) {
        console.warn(`⚠️ Terminal or store not found: ${terminalId}`);
        return null;
      }

      const store = await StoreSettings.findById(terminal.storeId)
        .populate('companyId')
        .lean();

      if (!store) {
        console.warn(`⚠️ Store not found: ${terminal.storeId}`);
        return null;
      }

      console.log(`✅ Store details loaded: ${store.storeName}`);
      return store;
    } catch (error) {
      console.error(`❌ Error fetching store details:`, error.message);
      return null;
    }
  }

  /**
   * STEP 4: Fetch company master data
   * Global company settings (name, tax ID, currency, etc.)
   * @param {String} companyId - Company MongoDB ObjectId
   * @returns {Object} Company data
   */
  async getCompanyData(companyId) {
    try {
      console.log(`🏢 Fetching company data: ${companyId}`);

      const company = await Company.findById(companyId).lean();

      if (!company) {
        console.warn(`⚠️ Company not found: ${companyId}`);
        return null;
      }

      console.log(`✅ Company data loaded: ${company.companyName}`);
      return company;
    } catch (error) {
      console.error(`❌ Error fetching company data:`, error.message);
      return null;
    }
  }

  /**
   * STEP 5: Prepare complete context for template rendering
   * Merges invoice, store, company data
   * @param {Object} invoice - Invoice document
   * @param {Object} store - Store details
   * @param {Object} company - Company details
   * @returns {Object} Complete context for Handlebars
   */
  prepareTemplateContext(invoice, store = null, company = null) {
    try {
      console.log(`🔧 Preparing template context`);

      const context = {
        // ========== INVOICE DATA ==========
        invoice: {
          invoiceNumber: invoice.invoiceNumber || 'N/A',
          invoiceId: invoice._id?.toString() || '',
          date: invoice.date ? new Date(invoice.date).toLocaleDateString() : '',
          paymentType: invoice.paymentType || 'N/A',
          paymentTerms: invoice.paymentTerms || '',
          financialYear: invoice.financialYear || '',

          // Financial Data
          subtotal: invoice.subtotal || 0,
          discountPercentage: invoice.discountPercentage || 0,
          discountAmount: invoice.discountAmount || 0,
          taxAmount: invoice.taxAmount || 0,
          vatAmount: invoice.vatAmount || 0,
          vatPercentage: invoice.vatPercentage || 0,
          totalIncludeVat: invoice.totalIncludeVat || 0,
          
          // Items
          items: invoice.items || [],
          totalItems: invoice.totalItems || 0,
          totalItemQty: invoice.totalItemQty || 0,
        },

        // ========== CUSTOMER DATA ==========
        customer: {
          name: invoice.customerName || 'Walk-in Customer',
          phone: invoice.customerPhone || '',
          trn: invoice.customerTRN || '',
          address: invoice.customerAddress || '',
          contact: invoice.customerContact || '',
        },

        // ========== STORE DATA ==========
        store: store ? {
          storeName: store.storeName || 'Store',
          storeAddress: store.storeAddress || '',
          storePhone: store.storePhone || '',
          storeEmail: store.storeEmail || '',
          storeLogo: store.storeLogo || '',
        } : {},

        // ========== COMPANY DATA ==========
        company: company ? {
          companyName: company.companyName || '',
          companyTRN: company.companyTRN || '',
          companyAddress: company.companyAddress || '',
          companyPhone: company.companyPhone || '',
          companyEmail: company.companyEmail || '',
          currency: company.currency || 'AED',
        } : {},

        // ========== ROOT LEVEL (for Handlebars) ==========
        '@root': {
          invoice: {
            invoiceNumber: invoice.invoiceNumber || 'N/A',
            subtotal: invoice.subtotal || 0,
            discountAmount: invoice.discountAmount || 0,
            vatAmount: invoice.vatAmount || 0,
            vatPercentage: invoice.vatPercentage || 0,
            totalIncludeVat: invoice.totalIncludeVat || 0,
            paymentType: invoice.paymentType || 'N/A',
            customerName: invoice.customerName || 'Walk-in Customer',
            items: invoice.items || [],
          },
          store: store ? {
            storeName: store.storeName || 'Store',
            storeAddress: store.storeAddress || '',
          } : {},
        },
      };

      console.log(`✅ Template context prepared`);
      return context;
    } catch (error) {
      console.error(`❌ Error preparing template context:`, error.message);
      throw error;
    }
  }

  /**
   * STEP 6: Render Handlebars template with data
   * @param {String} htmlContent - Template HTML with Handlebars placeholders
   * @param {Object} context - Data context
   * @returns {String} Rendered HTML
   */
  renderTemplate(htmlContent, context) {
    try {
      console.log(`🎨 Rendering template with Handlebars`);

      const template = Handlebars.compile(htmlContent);
      const renderedHtml = template(context);

      console.log(`✅ Template rendered successfully`);
      return renderedHtml;
    } catch (error) {
      console.error(`❌ Error rendering template:`, error.message);
      throw error;
    }
  }

  /**
   * STEP 7: Generate A4 Invoice PDF
   * Uses puppeteer for PDF generation with proper pagination
   * 
   * @param {String} invoiceId - Invoice MongoDB ObjectId
   * @param {String} templateId - Template MongoDB ObjectId
   * @param {String} documentType - Document type (SALES_INVOICE, QUOTATION, etc.)
   * @param {String} terminalId - Terminal ID (for store details)
   * @returns {Buffer} PDF binary buffer
   */
  async generateA4InvoicePDF(invoiceId, templateId, documentType = 'SALES_INVOICE', terminalId) {
    try {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📄 GENERATING A4 INVOICE PDF`);
      console.log(`${'═'.repeat(60)}`);

      // 1. Fetch invoice data
      const invoice = await this.fetchInvoiceData(invoiceId, documentType);

      // 2. Load template
      const template = await this.loadTemplate(templateId);

      // 3. Fetch store and company details
      const store = await this.getStoreDetails(terminalId);
      const company = invoice.companyId 
        ? await this.getCompanyData(invoice.companyId) 
        : null;

      // 4. Prepare context for rendering
      const context = this.prepareTemplateContext(invoice, store, company);

      // 5. Render template
      const htmlContent = this.renderTemplate(template.htmlContent, context);

      // 6. Combine with CSS
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${template.templateName}</title>
            <style>
              ${template.cssContent || ''}
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;

      // 7. Generate PDF with puppeteer
      console.log(`🖨️ Generating PDF via puppeteer...`);
      const pdfBuffer = await this.pdfService.generatePdfFromHtml(fullHtml, {
        pageSize: template.customDesign?.pageSize || 'A4',
        margins: template.customDesign?.margins || { top: 10, bottom: 10, left: 10, right: 10 },
        displayHeaderFooter: false,
      });

      console.log(`✅ PDF generated successfully - ${pdfBuffer.length} bytes`);
      console.log(`${'═'.repeat(60)}\n`);

      return pdfBuffer;
    } catch (error) {
      console.error(`❌ ERROR generating A4 PDF:`, error.message);
      throw error;
    }
  }

  /**
   * STEP 8: Generate Thermal Receipt HTML/PDF
   * Direct HTML output optimized for thermal printers (58mm or 80mm)
   * 
   * @param {String} invoiceId - Invoice MongoDB ObjectId
   * @param {String} templateId - Thermal template MongoDB ObjectId
   * @param {String} documentType - Document type
   * @param {String} terminalId - Terminal ID (for store details)
   * @returns {Object} { html: '...', format: '58mm', language: 'EN' }
   */
  async generateThermalReceipt(invoiceId, templateId, documentType = 'SALES_INVOICE', terminalId) {
    try {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🧾 GENERATING THERMAL RECEIPT`);
      console.log(`${'═'.repeat(60)}`);

      // 1. Fetch invoice data
      const invoice = await this.fetchInvoiceData(invoiceId, documentType);

      // 2. Load thermal template
      const template = await this.loadTemplate(templateId);

      // 3. Fetch store details (for thermal receipt header)
      const store = await this.getStoreDetails(terminalId);
      const company = invoice.companyId 
        ? await this.getCompanyData(invoice.companyId) 
        : null;

      // 4. Prepare context
      const context = this.prepareTemplateContext(invoice, store, company);

      // 5. Render thermal template
      const htmlContent = this.renderTemplate(template.htmlContent, context);

      // 6. Extract thermal format info from template name
      const format = template.templateName?.includes('80mm') ? '80mm' : '58mm';
      const language = template.language || 'EN';

      console.log(`✅ Thermal receipt rendered - Format: ${format}, Language: ${language}`);
      console.log(`${'═'.repeat(60)}\n`);

      return {
        html: htmlContent,
        format: format,
        language: language,
        templateName: template.templateName,
        css: template.cssContent || '',
      };
    } catch (error) {
      console.error(`❌ ERROR generating thermal receipt:`, error.message);
      throw error;
    }
  }

  /**
   * Helper: Get terminal printer configuration
   * Returns both A4 and thermal printer settings
   * @param {String} terminalId - Terminal ID
   * @returns {Object} { a4Printer, thermalPrinter, formatMapping }
   */
  async getTerminalPrinterConfig(terminalId) {
    try {
      console.log(`🖨️ Fetching terminal printer configuration: ${terminalId}`);

      const terminal = await TerminalManagement.findOne({ terminalId })
        .populate('formatMapping.invoice.templateId')
        .populate('formatMapping.thermalInvoice.templateId')
        .lean();

      if (!terminal) {
        throw new Error(`Terminal not found: ${terminalId}`);
      }

      const config = {
        a4Printer: {
          enabled: terminal.hardwareMapping?.invoicePrinter?.enabled || false,
          printerName: terminal.hardwareMapping?.invoicePrinter?.printerName || '',
          timeout: terminal.hardwareMapping?.invoicePrinter?.timeout || 5000,
          templateId: terminal.formatMapping?.invoice?.templateId,
        },
        thermalPrinter: {
          enabled: terminal.hardwareMapping?.thermalPrinter?.enabled || false,
          printerName: terminal.hardwareMapping?.thermalPrinter?.printerName || '',
          timeout: terminal.hardwareMapping?.thermalPrinter?.timeout || 3000,
          templateId: terminal.formatMapping?.thermalInvoice?.templateId,
          format: terminal.formatMapping?.thermalInvoice?.templateId?.templateName?.includes('80mm') ? '80mm' : '58mm',
        },
      };

      console.log(`✅ Terminal config loaded`);
      return config;
    } catch (error) {
      console.error(`❌ Error fetching terminal config:`, error.message);
      throw error;
    }
  }
}

export default new PrintService();
