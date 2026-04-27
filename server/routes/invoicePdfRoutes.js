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
    console.log(`\n🔍 [getStoreDetails] Starting...`);
    console.log(`   terminalId param: ${terminalId}`);
    
    if (!terminalId) {
      console.warn('⚠️ No terminal ID provided, using company defaults');
      return null;
    }

    // Fetch terminal to get storeId
    console.log(`   Looking for terminal in DB...`);
    const terminal = await TerminalManagement.findOne({ terminalId: terminalId });
    if (!terminal) {
      console.warn(`⚠️ Terminal not found: ${terminalId}`);
      console.log(`   Query used: { terminalId: "${terminalId}" }`);
      return null;
    }
    console.log(`   ✅ Terminal found: ${terminal.terminalId}`);

    if (!terminal.storeId) {
      console.warn(`⚠️ Terminal has no store assigned: ${terminalId}`);
      console.log(`   Terminal._id: ${terminal._id}`);
      console.log(`   Terminal.storeId: ${terminal.storeId} (is null/undefined)`);
      return null;
    }
    console.log(`   Store ID from terminal: ${terminal.storeId}`);

    // Fetch store details
    console.log(`   Looking for store in DB...`);
    const store = await StoreSettings.findById(terminal.storeId);
    if (!store) {
      console.warn(`⚠️ Store not found: ${terminal.storeId}`);
      console.log(`   Query used: StoreSettings.findById("${terminal.storeId}")`);
      return null;
    }

    console.log(`✅ Store details loaded for invoice heading: "${store.storeName}"`);
    console.log(`   Store._id: ${store._id}`);
    console.log(`   Store.storeName: "${store.storeName}"`);
    console.log(`   Store.email: "${store.email || '(empty)'}"`);
    console.log(`   Store.phone: "${store.phone || '(empty)'}"`);
    console.log(`   Store.address1: "${store.address1 || '(empty)'}"`);
    console.log(`   Store.address2: "${store.address2 || '(empty)'}"`);
    console.log(`   Store.taxNumber: "${store.taxNumber || '(empty)'}"`);
    console.log(`   Store logoUrl exists: ${store.logoUrl ? '✅ YES' : '❌ NO'}`);
    if (store.logoUrl) {
      console.log(`   Logo preview: ${store.logoUrl.substring(0, 60)}...`);
      console.log(`   Logo length: ${store.logoUrl.length} bytes`);
    }
    
    const result = {
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
    
    console.log(`✅ [getStoreDetails] Returning:`);
    console.log(`   - storeName: "${result.storeName}"`);
    console.log(`   - email: "${result.email}"`);
    console.log(`   - phone: "${result.phone}"`);
    console.log(`   - logoUrl: ${result.logoUrl ? `✅ (${result.logoUrl.length} bytes)` : '❌'}`);
    
    return result;
  } catch (err) {
    console.error('❌ Error fetching store details:', err.message);
    console.error('   Stack:', err.stack);
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
    const { templateId, terminalId, language = 'EN', withLogo = 'true' } = req.query;

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
    // ✅ terminalId already destructured from query params above
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
        unit: item.unit || 'Pcs',
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        vatPercentage: item.vatPercentage,
        vatAmount: item.vatAmount,
        total: item.total
      })),
      language: language.toUpperCase(),
      // ✅ Pass withLogo flag for template rendering (logo shows if template has logo + store has logoUrl)
      withLogo: template.includeLogo && storeDetails?.logoUrl ? true : false
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
    const { templateId, terminalId, language = 'EN', withLogo = 'true' } = req.query;

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
    // ✅ terminalId already destructured from query params above
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
        unit: item.unit || 'Pcs',
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        vatPercentage: item.vatPercentage,
        vatAmount: item.vatAmount,
        total: item.total
      })),
      language: language.toUpperCase(),
      // ✅ Pass withLogo flag for template rendering (logo shows if template has logo + store has logoUrl)
      withLogo: template.includeLogo && storeDetails?.logoUrl ? true : false
    };

    // 5. Render HTML with base URL for image loading in iframes
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const htmlContent = PdfGenerationService.renderTemplate(
      template.htmlContent,
      template.cssContent,
      invoiceData,
      baseUrl
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

// ============ INVOICE HTML (ALIAS FOR PREVIEW) ============

/**
 * GET /api/invoices/:invoiceId/html
 * Alias for /preview - returns HTML content for invoice
 * Query params: templateId (from terminal formatMapping), or legacy: language (EN|AR), withLogo (true|false)
 * Query params: print=true (adds A4-specific CSS for silent printing)
 * Response: HTML content
 */
router.get('/invoices/:invoiceId/html', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { templateId, terminalId, language = 'EN', withLogo = 'true', print = 'false' } = req.query;
    
    // ✅ Log that endpoint was hit
    console.log(`\n========== HTML ENDPOINT CALLED ==========`);
    console.log(`📥 Invoice ID: ${invoiceId}`);
    console.log(`📥 Template ID: ${templateId}`);
    console.log(`📥 Terminal ID from query: ${terminalId}`);
    console.log(`📥 Query params: language=${language}, withLogo=${withLogo}, print=${print}`);

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
      console.log(`📋 HTML - Fetching template by ID: ${templateId}`);
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
        console.log(`✅ HTML Template found by ID: ${template.templateName || template._id}`);
      }
    } else {
      // Legacy: no terminal template configured, use language/logo parameters
      console.log(`📋 HTML - Fetching template by language: ${language}, withLogo: ${withLogo}`);
      template = await InvoiceTemplate.findOne({
        language: language.toUpperCase(),
        templateType: 'INVOICE',
        includeLogo: withLogo === 'true',
        isActive: true
      });
      if (template) {
        console.log(`✅ HTML Template found: ${template.templateName || template._id}`);
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
    console.log(`🔍 HTML - Looking for storeDetails for terminal: ${terminalId}`);
    const storeDetails = await getStoreDetails(terminalId);

    if (storeDetails) {
      const fullAddress = `${storeDetails.address1}${storeDetails.address2 ? ', ' + storeDetails.address2 : ''}`.trim();
      console.log(`🏪 HTML - Using STORE heading: "${storeDetails.storeName}" at ${fullAddress}`);
      console.log(`🎨 HTML - Store logo URL present: ${storeDetails.logoUrl ? '✅ YES' : '❌ NO'}`);
      if (storeDetails.logoUrl) {
        console.log(`    Logo starts with: ${storeDetails.logoUrl.substring(0, 50)}...`);
        console.log(`    Logo length: ${storeDetails.logoUrl.length}`);
      }
    } else {
      console.log(`🏢 HTML - No store details found - storeDetails is NULL`);
      console.log(`    Terminal ID: ${terminalId}`);
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
        unit: item.unit || 'Pcs',
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
        discountAmount: item.discountAmount,
        vatPercentage: item.vatPercentage,
        vatAmount: item.vatAmount,
        total: item.total
      })),
      language: language.toUpperCase(),
      // ✅ Pass withLogo flag for template rendering (logo shows if template has logo + store has logoUrl)
      withLogo: template.includeLogo && storeDetails?.logoUrl ? true : false
    };

    // Debug logging
    console.log(`📊 [HTML] Template: ${template.templateName}, includeLogo: ${template.includeLogo}, logoUrl: ${storeDetails?.logoUrl ? '✅' : '❌'}, withLogo: ${invoiceData.withLogo}`);

    // 5. Render HTML with base URL for image loading in iframes
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const htmlContent = PdfGenerationService.renderTemplate(
      template.htmlContent,
      template.cssContent,
      invoiceData,
      baseUrl
    );

    // ✅ If print mode, inject A4-specific CSS for silent printing
    let finalHtml = htmlContent;
    if (print === 'true') {
      console.log('🖨️ HTML - Adding A4 print CSS for silent printing');
      
      // Inject A4 print CSS at the top
      const a4PrintCss = `
        <style>
          /* ===== A4 SILENT PRINT SETTINGS ===== */
          @page {
            size: A4;
            margin: 8mm 10mm;
          }
          
          html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
          
          body {
            margin: 0;
            padding: 0;
            width: 210mm;
            min-height: 297mm;
            background: white;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
          }
          
          .invoice-container {
            width: 100%;
            padding: 12mm 10mm;
            box-sizing: border-box;
            background: white;
            min-height: 297mm;
          }
          
          /* Prevent page breaks inside critical sections */
          .header,
          .logo,
          .company-info,
          .invoice-header, 
          .company-details,
          .invoice-title,
          .bill-to-title,
          .customer-name,
          .customer-details,
          .items-table,
          .totals-section,
          table, 
          tr {
            page-break-inside: avoid;
          }
          
          /* Ensure header and logo are visible in print */
          .header {
            display: block !important;
            visibility: visible !important;
            margin-bottom: 15mm;
          }
          
          .logo {
            display: block !important;
            visibility: visible !important;
            max-width: 120px;
            height: auto;
            margin: 0 auto 10mm;
          }
          
          /* Optimize spacing for A4 */
          .company-info {
            margin-bottom: 15mm;
            padding-bottom: 10mm;
            display: block !important;
            visibility: visible !important;
          }
          
          .invoice-header {
            margin-bottom: 20mm;
            display: flex;
            gap: 15mm;
          }
          
          .invoice-header .left,
          .invoice-header .right {
            flex: 1;
          }
          
          .invoice-details-table {
            margin-bottom: 8mm;
          }
          
          .items-table {
            margin-bottom: 15mm;
          }
          
          .totals-section {
            margin-bottom: 20mm;
          }
          
          /* Print media settings */
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            
            html, body {
              width: 210mm;
              min-height: 297mm;
            }
            
            .invoice-container {
              padding: 12mm 10mm;
              min-height: 297mm;
            }
            
            /* Ensure header and logo are visible */
            .header {
              display: block !important;
              visibility: visible !important;
              margin-bottom: 15mm;
            }
            
            .logo {
              display: block !important;
              visibility: visible !important;
              max-width: 120px;
              height: auto;
              margin: 0 auto 10mm;
            }
            
            .company-info {
              display: block !important;
              visibility: visible !important;
              margin-bottom: 15mm;
            }
            
            a {
              text-decoration: none;
            }
            
            /* Remove any hidden elements */
            .no-print,
            .hidden {
              display: none !important;
            }
            
            /* Ensure all colors and styles are printed exactly */
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-after: avoid;
            }
            
            /* Ensure background colors print */
            .table-header,
            .total-row {
              background-color: #1e40af !important;
              -webkit-print-color-adjust: exact !important;
            }
          }
        </style>
      `;
      
      // Insert CSS before body content
      finalHtml = htmlContent.replace('<body>', `<body>${a4PrintCss}`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);

  } catch (error) {
    console.error('HTML error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate HTML',
      error: error.message
    });
  }
});

export default router;
