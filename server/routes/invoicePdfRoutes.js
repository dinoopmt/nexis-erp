import express from 'express';
import SalesInvoice from '../Models/Sales/SalesInvoice.js';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';
import Company from '../Models/Company.js';
import TerminalManagement from '../Models/TerminalManagement.js';
import StoreSettings from '../Models/StoreSettings.js';
import PdfGenerationService from '../services/PdfGenerationService.js';

const router = express.Router();

/**
 * Helper: Get store details from terminal
 * Gets terminal from header, fetches store info for invoice heading
 * ✅ Invoice Heading: Store Name + Store Address (differs per location)
 * ✅ Logo: Store Logo if set
 * ✅ Company name/tax ID/currency: From Company Master (global)
 */
async function getStoreDetails(terminalId) {
  try {
    if (!terminalId) {
      console.warn('⚠️ No terminal ID provided, using company defaults');
      return null;
    }

    // Fetch terminal to get storeId
    const terminal = await TerminalManagement.findOne({ terminalId: terminalId });
    if (!terminal) {
      console.warn(`⚠️ Terminal not found: ${terminalId}`);
      return null;
    }

    if (!terminal.storeId) {
      console.warn(`⚠️ Terminal has no store assigned: ${terminalId}`);
      return null;
    }

    // Fetch store details
    const store = await StoreSettings.findById(terminal.storeId);
    if (!store) {
      console.warn(`⚠️ Store not found: ${terminal.storeId}`);
      return null;
    }

    console.log(`✅ Store details loaded for invoice heading: "${store.storeName}"`);
    return {
      storeName: store.storeName,  // ← For invoice heading (EACH STORE DIFFERENT)
      storeCode: store.storeCode,
      address1: store.address1 || '',  // ← For invoice heading (separate address lines)
      address2: store.address2 || '',  // ← For invoice heading (separate address lines)
      phone: store.phone || '',
      email: store.email || '',
      taxNumber: store.taxNumber || '',
      // ✅ ONLY logo from store (company name, currency, decimal places come from Company Master)
      logoUrl: store.logoUrl || '',
    };
  } catch (err) {
    console.error('❌ Error fetching store details:', err.message);
    return null;
  }
}

// ============ GENERATE INVOICE PDF ============

/**
 * POST /api/invoices/:invoiceId/generate-pdf
 * Query params: templateId (from terminal formatMapping), or legacy: language (EN|AR), withLogo (true|false)
 * Response: PDF file
 */
router.post('/invoices/:invoiceId/generate-pdf', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { templateId, language = 'EN', withLogo = 'true' } = req.query;

    // 1. Fetch invoice
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customerId', 'name phone address trn email')
      .populate('items.productId', 'name itemcode barcode');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // 2. Fetch template (use templateId from terminal if provided)
    let template;
    if (templateId) {
      // Terminal has specified a template ID
      console.log(`📋 Generating PDF - Fetching template by ID: ${templateId}`);
      template = await InvoiceTemplate.findById(templateId);
      if (!template) {
        console.warn(`⚠️ Template not found with ID: ${templateId}, falling back to language/logo`);
        // Fall back to default template selection
        template = await InvoiceTemplate.findOne({
          language: language.toUpperCase(),
          templateType: 'INVOICE',
          includeLogo: withLogo === 'true',
          isActive: true
        });
      } else {
        console.log(`✅ PDF Template found by ID: ${template.templateName || template._id}`);
      }
    } else {
      // Legacy: no terminal template configured, use language/logo parameters
      console.log(`📋 Generating PDF - Fetching template by language: ${language}, withLogo: ${withLogo}`);
      template = await InvoiceTemplate.findOne({
        language: language.toUpperCase(),
        templateType: 'INVOICE',
        includeLogo: withLogo === 'true',
        isActive: true
      });
      if (template) {
        console.log(`✅ PDF Template found: ${template.templateName || template._id}`);
      }
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template not found for ${language}`
      });
    }

    // 3. Fetch company settings (global)
    const company = await Company.findOne({ id: 1 });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    // 4. Fetch store details (store-specific) from terminal
    const terminalId = req.headers['terminal-id'];
    const storeDetails = await getStoreDetails(terminalId);

    if (storeDetails) {
      const fullAddress = `${storeDetails.address1}${storeDetails.address2 ? ', ' + storeDetails.address2 : ''}`.trim();
      console.log(`🏪 Using STORE heading: "${storeDetails.storeName}" at ${fullAddress}`);
    } else {
      console.log(`🏢 No store details found, using COMPANY heading`);
    }

    // 4. Prepare data
    // ✅ Use STORE details only - no company master fallback
    const invoiceData = {
      company: {
        // ✅ Use STORE details only (no company master fallback)
        companyName: storeDetails?.storeName || '',
        address1: storeDetails?.address1 || '',
        address2: storeDetails?.address2 || '',
        email: storeDetails?.email || '',
        phone: storeDetails?.phone || '',
        city: company.city,
        state: company.state,
        country: company.country,
        // ✅ Tax ID from STORE (each store can have different tax ID)
        taxId: storeDetails?.taxNumber || '',
        // ✅ Logo from STORE only
        logoUrl: storeDetails?.logoUrl || '',
        // ✅ Global settings from COMPANY Master
        decimalPlaces: company.decimalPlaces || 2,
        currency: company.currency || 'AED'
      },
      // ✅ Additional store info for templates (NO company master fallback - show blank if not filled)
      store: {
        storeName: storeDetails?.storeName || '',
        storeCode: storeDetails?.storeCode || '',
        address1: storeDetails?.address1 || '',
        address2: storeDetails?.address2 || '',
        phone: storeDetails?.phone || '',
        email: storeDetails?.email || '',
        taxNumber: storeDetails?.taxNumber || '',
        logoUrl: storeDetails?.logoUrl || '',
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        customerPhone: invoice.customerPhone,
        customerAddress: invoice.customerAddress,
        customerTRN: invoice.customerTRN,
        subtotal: invoice.subtotal,
        discountPercentage: invoice.discountPercentage,
        discountAmount: invoice.discountAmount,
        totalAfterDiscount: invoice.totalAfterDiscount,
        vatPercentage: invoice.vatPercentage,
        vatAmount: invoice.vatAmount,
        totalIncludeVat: invoice.totalIncludeVat,
        notes: invoice.notes,
        paymentType: invoice.paymentType
      },
      items: invoice.items.map((item, idx) => ({
        slNo: idx + 1,
        itemName: item.itemName,
        itemCode: item.itemcode,
        serialNumbers: item.serialNumbers || [],
        note: item.note,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        vatPercentage: item.vatPercentage,
        vatAmount: item.vatAmount,
        total: item.total
      })),
      language: language.toUpperCase()
    };

    // 5. Generate PDF
    const pdf = await PdfGenerationService.generateInvoicePdf(
      template,
      invoiceData,
      {
        pdfOptions: {
          displayHeaderFooter: true,
          footerTemplate: `
            <div style="font-size: 10px; width: 100%; text-align: center;">
              <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
          `
        }
      }
    );

    // 6. Send PDF
    res.contentType('application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`
    );
    res.send(pdf);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
});

// ============ PREVIEW INVOICE (HTML) ============

/**
 * GET /api/invoices/:invoiceId/preview
 * Query params: templateId (from terminal formatMapping), or legacy: language (EN|AR), withLogo (true|false)
 * Response: HTML content
 */
router.get('/invoices/:invoiceId/preview', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { templateId, language = 'EN', withLogo = 'true' } = req.query;

    // 1. Fetch invoice
    const invoice = await SalesInvoice.findById(invoiceId)
      .populate('customerId', 'name phone address trn email')
      .populate('items.productId', 'name itemcode barcode');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // 2. Fetch template (use templateId from terminal if provided)
    let template;
    if (templateId) {
      // Terminal has specified a template ID
      console.log(`📋 Preview - Fetching template by ID: ${templateId}`);
      template = await InvoiceTemplate.findById(templateId);
      if (!template) {
        console.warn(`⚠️ Template not found with ID: ${templateId}, falling back to language/logo`);
        // Fall back to default template selection
        template = await InvoiceTemplate.findOne({
          language: language.toUpperCase(),
          templateType: 'INVOICE',
          includeLogo: withLogo === 'true',
          isActive: true
        });
      } else {
        console.log(`✅ Preview Template found by ID: ${template.templateName || template._id}`);
      }
    } else {
      // Legacy: no terminal template configured, use language/logo parameters
      console.log(`📋 Preview - Fetching template by language: ${language}, withLogo: ${withLogo}`);
      template = await InvoiceTemplate.findOne({
        language: language.toUpperCase(),
        templateType: 'INVOICE',
        includeLogo: withLogo === 'true',
        isActive: true
      });
      if (template) {
        console.log(`✅ Preview Template found: ${template.templateName || template._id}`);
      }
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template not found for ${language}`
      });
    }

    // 3. Fetch company settings (global)
    const company = await Company.findOne({ id: 1 });

    // 4. Fetch store details (store-specific) from terminal
    const terminalId = req.headers['terminal-id'];
    const storeDetails = await getStoreDetails(terminalId);

    if (storeDetails) {
      const fullAddress = `${storeDetails.address1}${storeDetails.address2 ? ', ' + storeDetails.address2 : ''}`.trim();
      console.log(`🏪 Preview - Using STORE heading: "${storeDetails.storeName}" at ${fullAddress}`);
    } else {
      console.log(`🏢 Preview - No store details found, using COMPANY heading`);
    }

    // 5. Prepare data
    // ✅ Use STORE details only - no company master fallback
    const invoiceData = {
      company: {
        // ✅ Use STORE details only (no company master fallback)
        companyName: storeDetails?.storeName || '',
        address1: storeDetails?.address1 || '',
        address2: storeDetails?.address2 || '',
        email: storeDetails?.email || '',
        phone: storeDetails?.phone || '',
        city: company.city,
        state: company.state,
        country: company.country,
        // ✅ Tax ID from STORE (each store can have different tax ID)
        taxId: storeDetails?.taxNumber || '',
        // ✅ Logo from STORE only
        logoUrl: storeDetails?.logoUrl || '',
        // ✅ Global settings from COMPANY Master
        decimalPlaces: company.decimalPlaces || 2,
        currency: company.currency || 'AED'
      },
      // ✅ Additional store info for templates (NO company master fallback - show blank if not filled)
      store: {
        storeName: storeDetails?.storeName || '',
        storeCode: storeDetails?.storeCode || '',
        address1: storeDetails?.address1 || '',
        address2: storeDetails?.address2 || '',
        phone: storeDetails?.phone || '',
        email: storeDetails?.email || '',
        taxNumber: storeDetails?.taxNumber || '',
        logoUrl: storeDetails?.logoUrl || '',
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        customerPhone: invoice.customerPhone,
        customerAddress: invoice.customerAddress,
        customerTRN: invoice.customerTRN,
        subtotal: invoice.subtotal,
        discountPercentage: invoice.discountPercentage,
        discountAmount: invoice.discountAmount,
        totalAfterDiscount: invoice.totalAfterDiscount,
        vatPercentage: invoice.vatPercentage,
        vatAmount: invoice.vatAmount,
        totalIncludeVat: invoice.totalIncludeVat,
        notes: invoice.notes,
        paymentType: invoice.paymentType
      },
      items: invoice.items.map((item, idx) => ({
        slNo: idx + 1,
        itemName: item.itemName,
        itemCode: item.itemcode,
        serialNumbers: item.serialNumbers || [],
        note: item.note,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        vatPercentage: item.vatPercentage,
        vatAmount: item.vatAmount,
        total: item.total
      })),
      language: language.toUpperCase()
    };

    // 5. Render HTML
    const htmlContent = PdfGenerationService.renderTemplate(
      template.htmlContent,
      template.cssContent,
      invoiceData
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate preview',
      error: error.message
    });
  }
});

export default router;
