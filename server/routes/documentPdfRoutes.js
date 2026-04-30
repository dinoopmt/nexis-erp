import express from 'express';
import Quotation from '../Models/Sales/Quotation.js';
import SalesOrder from '../Models/Sales/SalesOrder.js';
import DeliveryNote from '../Models/Sales/DeliveryNote.js';
import SalesReturn from '../Models/Sales/SalesReturn.js';
import InvoiceTemplate from '../Models/InvoiceTemplate.js';
import Company from '../Models/Company.js';
import TerminalManagement from '../Models/TerminalManagement.js';
import StoreSettings from '../Models/StoreSettings.js';
import PdfGenerationService from '../services/PdfGenerationService.js';

const router = express.Router();

/**
 * Helper: Get store details from terminal
 * Gets terminal from header, fetches store info for document heading
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

    console.log(`✅ Store details loaded for document heading: "${store.storeName}"`);
    
    const result = {
      storeName: store.storeName,
      storeCode: store.storeCode,
      address1: store.address1 || '',
      address2: store.address2 || '',
      phone: store.phone || '',
      email: store.email || '',
      taxNumber: store.taxNumber || '',
      logoUrl: store.logoUrl || '',
    };
    
    console.log(`✅ [getStoreDetails] Returning store: "${result.storeName}"`);
    
    return result;
  } catch (err) {
    console.error('❌ Error fetching store details:', err.message);
    return null;
  }
}

/**
 * Helper: Fetch and render document HTML based on type
 */
async function getDocumentHtml(documentType, documentId, templateId, terminalId, storeDetails, company) {
  try {
    console.log(`\n📄 [${documentType}] Rendering HTML...`);

    let document, template;
    let ModelClass, TemplateType, populateFields;

    // Map document type to model
    switch(documentType) {
      case 'QUOTATION':
        ModelClass = Quotation;
        TemplateType = 'QUOTATION';
        populateFields = 'customerId items.productId';
        break;
      case 'SALES_ORDER':
        ModelClass = SalesOrder;
        TemplateType = 'SALES_ORDER';
        populateFields = 'customerId items.productId';
        break;
      case 'DELIVERY_NOTE':
        ModelClass = DeliveryNote;
        TemplateType = 'DELIVERY_NOTE';
        populateFields = 'customerId items.productId';
        break;
      case 'SALES_RETURN':
        ModelClass = SalesReturn;
        TemplateType = 'SALES_RETURN';
        populateFields = 'customerId items.productId';
        break;
      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }

    // Fetch document (use .lean() to get plain JS objects, avoiding Decimal128)
    document = await ModelClass.findById(documentId).populate(populateFields).lean();
    if (!document) {
      throw new Error(`${documentType} not found`);
    }

    // 🔍 DEBUG: Log raw data from database
    console.log(`🔍 DEBUG - Raw ${documentType} from DB:`);
    console.log(`   Items count: ${document.items?.length}`);
    if (document.items && document.items.length > 0) {
      console.log(`   Item 0:`, {
        itemName: document.items[0].itemName,
        note: document.items[0].note,
        image: document.items[0].image,
        productId: document.items[0].productId?._id,
        product_image: document.items[0].productId?.image,
        product_imagePath: document.items[0].productId?.imagePath,
        product_keys: document.items[0].productId ? Object.keys(document.items[0].productId).slice(0, 10) : 'NO PRODUCT'
      });
    }
    console.log(`   subtotal type: ${typeof document.subtotal}, value: ${document.subtotal}`);
    console.log(`   discountAmount type: ${typeof document.discountAmount}, value: ${document.discountAmount}`);
    console.log(`   vatAmount type: ${typeof document.vatAmount}, value: ${document.vatAmount}`);
    console.log(`   vatAmount raw: `, document.vatAmount);
    console.log(`   vatPercentage: `, document.vatPercentage);
    console.log(`   totalIncludeVat: `, document.totalIncludeVat);
    if (document.items && document.items.length > 0) {
      console.log(`   items[0].unitPrice type: ${typeof document.items[0].unitPrice}, value: ${document.items[0].unitPrice}`);
      console.log(`   items.length: ${document.items.length}`);
    }

    // Fetch template
    if (templateId) {
      console.log(`📋 Fetching template by ID: ${templateId}`);
      template = await InvoiceTemplate.findById(templateId);
      if (!template) {
        console.warn(`⚠️ Template not found with ID: ${templateId}, using default`);
        template = await InvoiceTemplate.findOne({
          templateType: TemplateType,
          isActive: true
        }).sort({ createdAt: -1 });
      } else {
        console.log(`✅ Template found: ${template.templateName || template._id}`);
      }
    } else {
      console.log(`📋 Fetching default template for: ${TemplateType}`);
      template = await InvoiceTemplate.findOne({
        templateType: TemplateType,
        isActive: true
      }).sort({ createdAt: -1 });
    }

    if (!template) {
      throw new Error(`No template found for ${documentType}`);
    }

    // Helper function to safely convert any value to a number
    const toNumber = (value) => {
      // Handle undefined/null
      if (value === undefined || value === null) return 0;
      
      // Already a number
      if (typeof value === 'number') return value;
      
      // String
      if (typeof value === 'string') return parseFloat(value) || 0;
      
      // Object - could be Decimal128
      if (typeof value === 'object') {
        // Decimal128 with $numberDecimal property
        if (value.$numberDecimal) {
          return parseFloat(value.$numberDecimal) || 0;
        }
        // Decimal128 with toNumber method
        if (typeof value.toNumber === 'function') {
          return value.toNumber();
        }
        // BigInt
        if (typeof value === 'bigint') {
          return Number(value);
        }
      }
      
      // Last resort
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Prepare items with product images
    const itemsWithImages = (document.items || []).map((item, index) => {
      const productImage = item.productId?.image || item.productId?.imagePath || item.image || '';
      const itemNote = item.note || '';
      
      console.log(`📋 Item ${index + 1} (${item.itemName}):`, {
        productId: item.productId?._id,
        image: productImage,
        note: itemNote,
        item_note_field: item.note,
        item_fields: item.productId ? Object.keys(item.productId) : 'No product populated'
      });

      // For DELIVERY_NOTE, use deliveredQuantity; for others use quantity
      const qty = documentType === 'DELIVERY_NOTE' 
        ? toNumber(item.deliveredQuantity || item.quantity || item.qty)
        : toNumber(item.quantity || item.qty);

      return {
        slNo: index + 1,
        itemcode: item.itemcode || item.productId?.itemcode || '',
        itemName: item.itemName || item.productId?.name || '',
        description: item.itemName || item.productId?.name || '',
        quantity: qty,
        deliveredQuantity: qty,  // For delivery notes
        unit: item.unit || item.productId?.unit || 'PCS',
        unitPrice: toNumber(item.unitPrice || item.price),
        amount: toNumber(item.total || item.amount),
        total: toNumber(item.total || item.totalAmount || item.amount),
        totalAmount: toNumber(item.totalAmount || item.total || item.amount),
        discountPercentage: toNumber(item.discountPercentage),
        discountAmount: toNumber(item.discountAmount),
        vatPercentage: toNumber(item.vatPercentage),
        productImage: productImage,
        image: productImage,
        note: itemNote,
      };
    });

    console.log(`✅ Final items for template:`, JSON.stringify(itemsWithImages.slice(0, 2), null, 2));

    // Build base data structure
    let documentData = {
      withLogo: template.includeLogo || false,
      store: {
        storeName: storeDetails?.storeName || company?.companyName || 'Store',
        storeCode: storeDetails?.storeCode || '',
        logoUrl: storeDetails?.logoUrl || company?.logoUrl || '',
        address1: storeDetails?.address1 || company?.address1 || '',
        address2: storeDetails?.address2 || company?.address2 || '',
        phone: storeDetails?.phone || company?.phone || '',
        email: storeDetails?.email || company?.email || '',
        taxNumber: storeDetails?.taxNumber || company?.taxNumber || '',
      },
      company: {
        companyName: storeDetails?.storeName || company?.companyName || 'Company',
        address: storeDetails?.address1 || company?.address1 || '',
        address1: storeDetails?.address1 || company?.address1 || '',
        address2: storeDetails?.address2 || company?.address2 || '',
        city: storeDetails?.city || company?.city || '',
        state: storeDetails?.state || company?.state || '',
        country: storeDetails?.country || company?.country || '',
        email: storeDetails?.email || company?.email || '',
        phone: storeDetails?.phone || company?.phone || '',
        taxNumber: storeDetails?.taxNumber || company?.taxNumber || '',
        taxId: storeDetails?.taxNumber || company?.taxId || '',
        logoUrl: storeDetails?.logoUrl || company?.logoUrl || '',
        currency: company?.currency || 'AED',
        decimalPlaces: company?.decimalPlaces || 2,
      }
    };

    // Map to document-type-specific field names
    if (documentType === 'QUOTATION') {
      documentData.quotation = {
        quotationNumber: document.quotationNumber || document.quotationNo || 'N/A',
        date: document.date || document.quotationDate || new Date(),
        expiryDate: document.expiryDate || new Date(),
        customerName: document.customerId?.name || document.customerName || 'N/A',
        customerPhone: document.customerPhone || document.customerId?.phone || '',
        customerAddress: document.customerAddress || document.customerId?.address || '',
        customerTRN: document.customerTRN || document.customerId?.trn || '',
        items: itemsWithImages,
        subtotal: toNumber(document.subtotal),
        discountAmount: toNumber(document.discountAmount),
        discountPercentage: toNumber(document.discountPercentage),
        vatAmount: toNumber(document.vatAmount),
        vatPercentage: toNumber(document.vatPercentage),
        totalIncludeVat: toNumber(document.totalIncludeVat),
        notes: document.notes || '',
        terms: document.terms || '',
      };
      console.log(`\n📋 QUOTATION Template Data:`, JSON.stringify({
        items_count: documentData.quotation.items.length,
        first_item: documentData.quotation.items[0]
      }, null, 2));
    } else if (documentType === 'SALES_ORDER') {
      documentData.order = {
        orderNumber: document.orderNumber || document.orderNo || 'N/A',
        date: document.date || document.orderDate || new Date(),
        requiredDeliveryDate: document.deliveryDate || document.requiredDeliveryDate || new Date(),
        status: document.status || 'Pending',
        customerName: document.customerId?.name || document.customerName || 'N/A',
        customerPhone: document.customerId?.phone || document.customerPhone || '',
        customerAddress: document.customerId?.address || document.customerAddress || '',
        customerEmail: document.customerId?.email || document.customerEmail || '',
        customerTRN: document.customerId?.trn || document.customerTRN || '',
        shippingAddress: document.shippingAddress || null,
        specialInstructions: document.specialInstructions || '',
        paymentTerms: document.paymentTerms || '',
        deliveryMethod: document.deliveryMethod || '',
        leadTime: document.leadTime || '',
        additionalTerms: document.additionalTerms || '',
        authorizedBy: document.authorizedBy || '',
        items: itemsWithImages,
        subtotal: toNumber(document.subtotal),
        discountAmount: toNumber(document.discountAmount),
        discountPercentage: toNumber(document.discountPercentage),
        vatAmount: toNumber(document.vatAmount),
        vatPercentage: toNumber(document.vatPercentage),
        totalIncludeVat: toNumber(document.totalIncludeVat),
        totalAmount: toNumber(document.totalIncludeVat || document.total),
        notes: document.notes || '',
        shippingCharges: toNumber(document.shippingCharges || 0),
        taxAmount: toNumber(document.vatAmount || 0),
        taxPercentage: toNumber(document.vatPercentage || 0),
      };
    } else if (documentType === 'DELIVERY_NOTE') {
      documentData.deliveryNote = {
        deliveryNoteNumber: document.deliveryNoteNumber || document.deliveryNoteNo || 'N/A',
        date: document.date || document.deliveryNoteDate || new Date(),
        customerName: document.customerId?.name || document.customerName || 'N/A',
        customerPhone: document.customerId?.phone || document.customerPhone || '',
        customerAddress: document.customerId?.address || document.customerAddress || '',
        customerTRN: document.customerId?.trn || '',
        totalItems: document.items?.length || 0,
      };
      documentData.items = itemsWithImages;
    } else if (documentType === 'SALES_RETURN') {
      documentData.return = {
        returnNoteNumber: document.returnNumber || document.returnNoteNo || 'N/A',
        date: document.date || document.returnDate || new Date(),
        invoiceNumber: document.invoiceNumber || 'N/A',
        invoiceDate: document.invoiceDate || new Date(),
        returnReason: document.returnReason || '',
        customerName: document.customerId?.name || document.customerName || 'N/A',
        customerPhone: document.customerId?.phone || '',
        customerAddress: document.customerId?.address || '',
        customerTRN: document.customerId?.trn || '',
        items: itemsWithImages,
        subtotal: toNumber(document.subtotal),
        discountAmount: toNumber(document.discountAmount),
        discountPercentage: toNumber(document.discountPercentage),
        totalAfterDiscount: toNumber(document.totalAfterDiscount || document.subtotal - document.discountAmount),
        vatAmount: toNumber(document.vatAmount),
        vatPercentage: toNumber(document.vatPercentage),
        totalIncludeVat: toNumber(document.totalIncludeVat),
        notes: document.notes || '',
        paymentType: document.paymentType || '',
      };
    }

    console.log(`✅ ${documentType} data prepared for rendering`);
    
    // 🔍 DEBUG: Log the actual data types being passed
    if (documentType === 'QUOTATION') {
      console.log(`🔍 DEBUG - QUOTATION data types AFTER toNumber():`);
      console.log(`   vatAmount: ${typeof documentData.quotation.vatAmount} = ${documentData.quotation.vatAmount}`);
      console.log(`   vatPercentage: ${typeof documentData.quotation.vatPercentage} = ${documentData.quotation.vatPercentage}`);
      console.log(`   totalIncludeVat: ${typeof documentData.quotation.totalIncludeVat} = ${documentData.quotation.totalIncludeVat}`);
      console.log(`   ✅ QUOTATION items count: ${documentData.quotation.items.length}`);
      if (documentData.quotation.items.length > 0) {
        console.log(`   items[0]: slNo=${documentData.quotation.items[0].slNo}, name=${documentData.quotation.items[0].itemName}`);
        console.log(`   items[0].discountPercentage: ${documentData.quotation.items[0].discountPercentage}`);
        console.log(`   ✅ items[0].image: "${documentData.quotation.items[0].image}"`);
        console.log(`   ✅ items[0].note: "${documentData.quotation.items[0].note}"`);
      }
    }

    // Use PdfGenerationService to render template with Handlebars
    // Determine base URL for image loading
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    const htmlContent = PdfGenerationService.renderTemplate(
      template.htmlContent,
      template.cssContent || '',
      documentData,
      baseUrl  // Pass baseUrl so relative paths work
    );

    console.log(`✅ ${documentType} HTML rendered successfully`);
    console.log(`   Using baseUrl: ${baseUrl}`);
    return htmlContent;

  } catch (err) {
    console.error(`❌ Error rendering ${documentType} HTML:`, err.message);
    throw err;
  }
}

// ============ QUOTATION ENDPOINTS ============

/**
 * GET /quotations/:quotationId/html
 * Returns HTML content for quotation preview
 */
router.get('/quotations/:quotationId/html', async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== QUOTATION HTML ENDPOINT ==========`);
    console.log(`📥 Quotation ID: ${quotationId}`);
    console.log(`📥 Template ID: ${templateId}`);
    console.log(`📥 Terminal ID: ${terminalId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('QUOTATION', quotationId, templateId, terminalId, storeDetails, company);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('❌ Error fetching quotation HTML:', err.message);
    res.status(404).json({
      success: false,
      message: `Failed to load quotation: ${err.message}`
    });
  }
});

/**
 * POST /quotations/:quotationId/generate-pdf
 * Generates PDF for quotation
 */
router.post('/quotations/:quotationId/generate-pdf', async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== QUOTATION PDF ENDPOINT ==========`);
    console.log(`📥 Quotation ID: ${quotationId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('QUOTATION', quotationId, templateId, terminalId, storeDetails, company);

    const pdfBuffer = await PdfGenerationService.generatePdfFromHtml(html, {
      pageSize: 'A4',
      margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotationId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Error generating quotation PDF:', err.message);
    res.status(500).json({
      success: false,
      message: `Failed to generate PDF: ${err.message}`
    });
  }
});

// ============ SALES ORDER ENDPOINTS ============

/**
 * GET /sales-orders/:orderId/html
 * Returns HTML content for sales order preview
 */
router.get('/sales-orders/:orderId/html', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== SALES ORDER HTML ENDPOINT ==========`);
    console.log(`📥 Order ID: ${orderId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('SALES_ORDER', orderId, templateId, terminalId, storeDetails, company);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('❌ Error fetching sales order HTML:', err.message);
    res.status(404).json({
      success: false,
      message: `Failed to load sales order: ${err.message}`
    });
  }
});

/**
 * POST /sales-orders/:orderId/generate-pdf
 * Generates PDF for sales order
 */
router.post('/sales-orders/:orderId/generate-pdf', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== SALES ORDER PDF ENDPOINT ==========`);
    console.log(`📥 Order ID: ${orderId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('SALES_ORDER', orderId, templateId, terminalId, storeDetails, company);

    const pdfBuffer = await PdfGenerationService.generatePdfFromHtml(html, {
      pageSize: 'A4',
      margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=order-${orderId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Error generating sales order PDF:', err.message);
    res.status(500).json({
      success: false,
      message: `Failed to generate PDF: ${err.message}`
    });
  }
});

// ============ DELIVERY NOTE ENDPOINTS ============

/**
 * GET /delivery-notes/:noteId/html
 * Returns HTML content for delivery note preview
 */
router.get('/delivery-notes/:noteId/html', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== DELIVERY NOTE HTML ENDPOINT ==========`);
    console.log(`📥 Delivery Note ID: ${noteId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('DELIVERY_NOTE', noteId, templateId, terminalId, storeDetails, company);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('❌ Error fetching delivery note HTML:', err.message);
    res.status(404).json({
      success: false,
      message: `Failed to load delivery note: ${err.message}`
    });
  }
});

/**
 * POST /delivery-notes/:noteId/generate-pdf
 * Generates PDF for delivery note
 */
router.post('/delivery-notes/:noteId/generate-pdf', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== DELIVERY NOTE PDF ENDPOINT ==========`);
    console.log(`📥 Delivery Note ID: ${noteId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('DELIVERY_NOTE', noteId, templateId, terminalId, storeDetails, company);

    const pdfBuffer = await PdfGenerationService.generatePdfFromHtml(html, {
      pageSize: 'A4',
      margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=delivery-note-${noteId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Error generating delivery note PDF:', err.message);
    res.status(500).json({
      success: false,
      message: `Failed to generate PDF: ${err.message}`
    });
  }
});

// ============ SALES RETURN ENDPOINTS ============

/**
 * GET /sales-returns/:returnId/html
 * Returns HTML content for sales return preview
 */
router.get('/sales-returns/:returnId/html', async (req, res) => {
  try {
    const { returnId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== SALES RETURN HTML ENDPOINT ==========`);
    console.log(`📥 Sales Return ID: ${returnId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('SALES_RETURN', returnId, templateId, terminalId, storeDetails, company);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('❌ Error fetching sales return HTML:', err.message);
    res.status(404).json({
      success: false,
      message: `Failed to load sales return: ${err.message}`
    });
  }
});

/**
 * POST /sales-returns/:returnId/generate-pdf
 * Generates PDF for sales return
 */
router.post('/sales-returns/:returnId/generate-pdf', async (req, res) => {
  try {
    const { returnId } = req.params;
    const { templateId, terminalId } = req.query;
    
    console.log(`\n========== SALES RETURN PDF ENDPOINT ==========`);
    console.log(`📥 Sales Return ID: ${returnId}`);

    const storeDetails = await getStoreDetails(terminalId);
    const company = await Company.findOne({ id: 1 });

    const html = await getDocumentHtml('SALES_RETURN', returnId, templateId, terminalId, storeDetails, company);

    const pdfBuffer = await PdfGenerationService.generatePdfFromHtml(html, {
      pageSize: 'A4',
      margins: { top: 10, bottom: 10, left: 10, right: 10 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=return-${returnId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ Error generating sales return PDF:', err.message);
    res.status(500).json({
      success: false,
      message: `Failed to generate PDF: ${err.message}`
    });
  }
});

export default router;
