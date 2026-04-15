/**
 * INVOICE PRINTING API - QUICK REFERENCE
 * All endpoints for template management and PDF generation
 */

// ============================================================================
// TEMPLATE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/invoice-templates
 * Fetch all active invoice templates
 * 
 * Response:
 * [
 *   {
 *     _id: "ObjectId",
 *     templateName: "Invoice_EN_with_Logo",
 *     language: "EN",
 *     templateType: "INVOICE",
 *     includeLogo: true,
 *     customDesign: {
 *       headerColor: "#1e40af",
 *       bodyFont: "Arial",
 *       showSerialNumbers: true,
 *       currency: "AED"
 *     },
 *     htmlContent: "..." (Handlebars template),
 *     cssContent: "..." (CSS styling),
 *     createdBy: "ObjectId",
 *     createdAt: "2024-01-15T10:30:00Z",
 *     isActive: true,
 *     isDefault: true
 *   }
 * ]
 */

/**
 * GET /api/invoice-templates/:id
 * Fetch a specific template by ID
 * 
 * Params:
 *   id: Template ObjectId
 * 
 * Response:
 *   { full template object }
 * 
 * Error:
 *   404: Template not found
 */

/**
 * GET /api/invoice-templates/language/:language/type/:type
 * Fetch template by language and type
 * Includes logo option selection
 * 
 * Params:
 *   language: "EN" or "AR"
 *   type: "INVOICE" (or "GRN", "RTV", "DELIVERY_NOTE")
 * 
 * Query:
 *   withLogo: true or false (required if multiple exist)
 * 
 * Example:
 *   GET /api/invoice-templates/language/EN/type/INVOICE?withLogo=true
 * 
 * Response:
 *   { template object }
 * 
 * Error:
 *   404: Template not found for this language/type/logo combination
 */

/**
 * POST /api/invoice-templates
 * Create a new invoice template
 * 
 * Body:
 * {
 *   templateName: string (must be unique),
 *   language: "EN" or "AR",
 *   templateType: "INVOICE",
 *   includeLogo: boolean,
 *   customDesign: {
 *     headerColor: string,
 *     bodyFont: string,
 *     showSerialNumbers: boolean,
 *     showQrCode: boolean,
 *     currency: string,
 *     pageSize: "A4" | "A5" | "LETTER",
 *     margins: { top, bottom, left, right }
 *   },
 *   htmlContent: string (Handlebars template),
 *   cssContent: string (CSS styling)
 * }
 * 
 * Response:
 *   { created template object }
 * 
 * Error:
 *   400: Template name already exists
 *   400: Missing required fields
 */

/**
 * PUT /api/invoice-templates/:id
 * Update an existing template
 * 
 * Params:
 *   id: Template ObjectId
 * 
 * Body:
 * {
 *   customDesign: { ...updated design options },
 *   htmlContent: string (updated Handlebars template),
 *   cssContent: string (updated CSS)
 * }
 * 
 * Response:
 *   { updated template object }
 * 
 * Error:
 *   404: Template not found
 */

/**
 * PUT /api/invoice-templates/:id/set-default
 * Set this template as the default for its language/type combination
 * 
 * Params:
 *   id: Template ObjectId
 * 
 * Response:
 *   { updated template object with isDefault: true }
 * 
 * Side Effect:
 *   All other templates with same language/type have isDefault set to false
 * 
 * Error:
 *   404: Template not found
 */

/**
 * DELETE /api/invoice-templates/:id
 * Soft delete a template (sets isActive to false)
 * 
 * Params:
 *   id: Template ObjectId
 * 
 * Response:
 *   { success: true, message: "Template deleted" }
 * 
 * Error:
 *   404: Template not found
 */

// ============================================================================
// PDF GENERATION ENDPOINTS
// ============================================================================

/**
 * GET /api/invoices/:invoiceId/preview
 * Fetch HTML preview of invoice
 * Used for displaying preview in browser before printing/downloading
 * 
 * Params:
 *   invoiceId: SalesInvoice ObjectId
 * 
 * Query:
 *   language: "EN" or "AR" (default: "EN")
 *   withLogo: true or false (default: true)
 * 
 * Example:
 *   GET /api/invoices/123abc/preview?language=AR&withLogo=true
 * 
 * Response:
 *   Content-Type: text/html; charset=utf-8
 *   HTML string ready for display/rendering
 * 
 * Error:
 *   404: Invoice not found
 *   404: Template not found for language
 *   404: Company settings not found
 *   500: Preview generation failed
 */

/**
 * POST /api/invoices/:invoiceId/generate-pdf
 * Generate PDF file for invoice
 * Returns blob that can be downloaded as file
 * 
 * Params:
 *   invoiceId: SalesInvoice ObjectId
 * 
 * Query:
 *   language: "EN" or "AR" (default: "EN")
 *   withLogo: true or false (default: true)
 * 
 * Example:
 *   POST /api/invoices/123abc/generate-pdf?language=EN&withLogo=false
 * 
 * Response:
 *   Content-Type: application/pdf
 *   Content-Disposition: attachment; filename=Invoice_INV-001.pdf
 *   PDF binary blob
 * 
 * Error:
 *   404: Invoice not found
 *   404: Template not found for language
 *   404: Company settings not found
 *   500: PDF generation failed
 */

// ============================================================================
// HANDLEBARS TEMPLATE VARIABLES & HELPERS
// ============================================================================

/**
 * Template Data Structure Available in HTML Templates:
 * 
 * COMPANY:
 *   {{company.companyName}}
 *   {{company.email}}
 *   {{company.phone}}
 *   {{company.address}}
 *   {{company.city}}
 *   {{company.state}}
 *   {{company.country}}
 *   {{company.taxId}}
 *   {{company.logoUrl}}
 *   {{company.currency}}
 *   {{company.decimalPlaces}}
 * 
 * INVOICE:
 *   {{invoice.invoiceNumber}}
 *   {{invoice.date}}
 *   {{invoice.customerName}}
 *   {{invoice.customerAddress}}
 *   {{invoice.customerPhone}}
 *   {{invoice.customerTRN}}
 *   {{invoice.paymentType}}
 *   {{invoice.subtotal}}
 *   {{invoice.discountAmount}}
 *   {{invoice.discountPercentage}}
 *   {{invoice.totalAfterDiscount}}
 *   {{invoice.vatAmount}}
 *   {{invoice.vatPercentage}}
 *   {{invoice.totalIncludeVat}}
 *   {{invoice.notes}}
 * 
 * ITEMS (Array - use {{#items}} ... {{/items}} for loop):
 *   {{slNo}}
 *   {{itemName}}
 *   {{serialNumbers}} (array of serial numbers)
 *   {{note}}
 *   {{quantity}}
 *   {{unitPrice}}
 *   {{discountPercentage}}
 *   {{total}}
 * 
 * LANGUAGE:
 *   {{language}} - "EN" or "AR"
 */

/**
 * Available Handlebars Helpers:
 * 
 * {{currency value 'AED' 2}}
 *   - Formats number as currency
 *   - Params: value, currency code, decimal places
 *   - Example: {{currency invoice.totalIncludeVat 'AED' 2}} → "AED 1,234.56"
 * 
 * {{date dateString 'DD/MM/YYYY'}}
 *   - Formats date using moment.js format
 *   - Example: {{date invoice.date 'DD/MM/YYYY'}} → "15/01/2024"
 * 
 * {{rtl language}}
 *   - Returns 'rtl' or 'ltr' based on language
 *   - Example: <div style="direction: {{rtl language}}">
 * 
 * {{join arrayField ', '}}
 *   - Joins array elements with separator
 *   - Example: {{join serialNumbers ', '}} → "SN001, SN002, SN003"
 * 
 * {{eq a b}}
 *   - Equality check for conditionals
 *   - Example: {{#eq language 'AR'}} ... {{/eq}}
 */

// ============================================================================
// EXAMPLE USAGE IN REACT
// ============================================================================

/*
// Fetch and preview HTML
const response = await fetch(
  `/api/invoices/${invoiceId}/preview?language=EN&withLogo=true`
);
const htmlContent = await response.text();
document.getElementById('preview').innerHTML = htmlContent;

// Generate and download PDF
const response = await fetch(
  `/api/invoices/${invoiceId}/generate-pdf?language=EN&withLogo=true`,
  { method: 'POST' }
);
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'Invoice_INV-001.pdf';
a.click();
URL.revokeObjectURL(url);

// Get available templates
const response = await fetch('/api/invoice-templates');
const templates = await response.json();

// Get template for specific language/type
const response = await fetch(
  '/api/invoice-templates/language/EN/type/INVOICE?withLogo=true'
);
const template = await response.json();
*/

// ============================================================================
// STATUS CODES
// ============================================================================

/*
200 OK
  - Template fetched successfully
  - Preview generated successfully
  - PDF generated successfully

201 Created
  - Template created successfully

400 Bad Request
  - Missing required fields
  - Invalid data format
  - Template name already exists

404 Not Found
  - Invoice not found
  - Template not found
  - Company settings not found

500 Internal Server Error
  - PDF generation failed
  - Database error
  - Puppeteer/Handlebars error
  - Server error
*/

export const API_REFERENCE = {
  templates: {
    getAll: 'GET /api/invoice-templates',
    getById: 'GET /api/invoice-templates/:id',
    getByLanguageType: 'GET /api/invoice-templates/language/:language/type/:type?withLogo=true',
    create: 'POST /api/invoice-templates',
    update: 'PUT /api/invoice-templates/:id',
    setDefault: 'PUT /api/invoice-templates/:id/set-default',
    delete: 'DELETE /api/invoice-templates/:id'
  },
  pdf: {
    preview: 'GET /api/invoices/:invoiceId/preview?language=EN&withLogo=true',
    generate: 'POST /api/invoices/:invoiceId/generate-pdf?language=EN&withLogo=true'
  }
};
