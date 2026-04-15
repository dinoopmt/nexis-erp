import express from 'express';
import SalesInvoice from '../Models/Sales/SalesInvoice.js';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';
import Company from '../Models/Company.js';
import PdfGenerationService from '../services/PdfGenerationService.js';

const router = express.Router();

// ============ GENERATE INVOICE PDF ============

/**
 * POST /api/invoices/:invoiceId/generate-pdf
 * Query params: language (EN|AR), withLogo (true|false)
 * Response: PDF file
 */
router.post('/invoices/:invoiceId/generate-pdf', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { language = 'EN', withLogo = 'true' } = req.query;

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

    // 2. Fetch template
    const template = await InvoiceTemplate.findOne({
      language: language.toUpperCase(),
      templateType: 'INVOICE',
      includeLogo: withLogo === 'true',
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template not found for ${language}`
      });
    }

    // 3. Fetch company settings
    const company = await Company.findOne({ id: 1 });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    // 4. Prepare data
    const invoiceData = {
      company: {
        companyName: company.companyName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        country: company.country,
        taxId: company.taxId,
        logoUrl: company.logoUrl || '',
        decimalPlaces: company.decimalPlaces || 2,
        currency: company.currency || 'AED'
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
 * Query params: language (EN|AR), withLogo (true|false)
 * Response: HTML content
 */
router.get('/invoices/:invoiceId/preview', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { language = 'EN', withLogo = 'true' } = req.query;

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

    // 2. Fetch template
    const template = await InvoiceTemplate.findOne({
      language: language.toUpperCase(),
      templateType: 'INVOICE',
      includeLogo: withLogo === 'true',
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template not found for ${language}`
      });
    }

    // 3. Fetch company settings
    const company = await Company.findOne({ id: 1 });

    // 4. Prepare data
    const invoiceData = {
      company: {
        companyName: company.companyName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        city: company.city,
        state: company.state,
        country: company.country,
        taxId: company.taxId,
        logoUrl: company.logoUrl || '',
        decimalPlaces: company.decimalPlaces || 2,
        currency: company.currency || 'AED'
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
