/**
 * INVOICE PRINTING SYSTEM - INTEGRATION GUIDE
 * Complete checklist to integrate the invoice printing system into your NEXIS-ERP
 */

// ============================================================================
// STEP 1: Update server/index.js (or app.js)
// ============================================================================

/*
Add these imports at the top:

import invoiceTemplateRoutes from './routes/invoiceTemplateRoutes.js';
import invoicePdfRoutes from './routes/invoicePdfRoutes.js';
import { seedInvoiceTemplates } from './seedInvoiceTemplates.js';
*/

/*
Add these route registrations after other API routes:

// Invoice Template Management
app.use('/api', invoiceTemplateRoutes);

// Invoice PDF Generation & Preview
app.use('/api', invoicePdfRoutes);
*/

/*
Add seeding on server startup (inside your connection callback or startup function):

// Seed default invoice templates on startup
try {
  await seedInvoiceTemplates();
} catch (error) {
  console.error('Failed to seed invoice templates:', error);
}
*/

// ============================================================================
// STEP 2: Install Required Packages
// ============================================================================

/*
Backend dependencies:
npm install puppeteer handlebars

Frontend dependencies:
npm install react-to-print
*/

// ============================================================================
// STEP 3: Update SalesInvoice Component (client)
// ============================================================================

/*
In client/src/components/sales/SalesInvoice.jsx, add:

// Import at top
import InvoicePrintingComponent from './InvoicePrintingComponent.jsx';

// Add state (inside component)
const [showPrintingModal, setShowPrintingModal] = useState(false);
const [invoiceToView, setInvoiceToView] = useState(null);

// Add button to invoice list (in your render/JSX)
<button 
  onClick={() => {
    setInvoiceToView(invoice);
    setShowPrintingModal(true);
  }}
  className="btn btn-primary"
>
  <Download size={16} /> Print/Download
</button>

// Add modal component at bottom of component
{showPrintingModal && (
  <InvoicePrintingComponent
    invoiceId={invoiceToView?._id}
    onClose={() => setShowPrintingModal(false)}
  />
)}
*/

// ============================================================================
// STEP 4: Database Seeding
// ============================================================================

/*
Option A: Seed on server startup
- Add to your server startup sequence (see STEP 1)
- Templates created automatically when server starts

Option B: Manual seeding
- Run from command line: node server/seedInvoiceTemplates.js
- Useful for development or template updates

Option C: API endpoint
- Add a POST /api/seed/templates endpoint if needed
- Requires admin authentication
*/

// ============================================================================
// STEP 5: Environment Variables (if needed)
// ============================================================================

/*
Add to .env file (backend):

# PDF Generation
PDF_GENERATION_ENABLED=true
PDF_STORAGE_PATH=./generated_pdfs
PUPPETEER_HEADLESS=true
PUPPETEER_SANDBOX=false

# Company Logo
COMPANY_LOGO_URL=http://localhost:3000/uploads/logo.png
*/

// ============================================================================
// STEP 6: API Endpoints Reference
// ============================================================================

/*
TEMPLATE MANAGEMENT:

1. GET /api/invoice-templates
   - Fetch all active templates
   - Query params: none
   - Response: Array of templates

2. GET /api/invoice-templates/:id
   - Fetch specific template
   - Params: template ID
   - Response: Template object

3. GET /api/invoice-templates/language/:language/type/:type
   - Query params: ?withLogo=true
   - Example: /api/invoice-templates/language/EN/type/INVOICE?withLogo=true
   - Response: Template object

4. POST /api/invoice-templates
   - Create new template
   - Body: { templateName, language, templateType, customDesign, htmlContent, cssContent }
   - Response: Created template

5. PUT /api/invoice-templates/:id
   - Update template
   - Body: { customDesign, htmlContent, cssContent }
   - Response: Updated template

6. PUT /api/invoice-templates/:id/set-default
   - Set as default for language/type
   - Response: Updated template

7. DELETE /api/invoice-templates/:id
   - Soft delete template (sets isActive=false)
   - Response: { success: true }

PDF GENERATION:

1. GET /api/invoices/:invoiceId/preview?language=EN&withLogo=true
   - Fetch HTML preview
   - Query params: language (EN|AR), withLogo (true|false)
   - Response: HTML string

2. POST /api/invoices/:invoiceId/generate-pdf?language=EN&withLogo=true
   - Generate PDF file
   - Query params: language (EN|AR), withLogo (true|false)
   - Response: PDF blob with Content-Disposition header
*/

// ============================================================================
// STEP 7: Testing Workflow
// ============================================================================

/*
1. Start server (templates auto-seed)
2. Navigate to SalesInvoice view
3. Click "Print/Download" button on any invoice
4. InvoicePrintingComponent modal opens
5. Test English without logo:
   - Select "English" from dropdown
   - Toggle "Without Logo"
   - Click "Preview" to see HTML
   - Click "Download PDF" to get file
6. Test Arabic with logo:
   - Select "العربية" from dropdown
   - Toggle "With Logo"
   - Click "Print" to open browser print dialog
   - Select printer and print
7. Verify:
   - Logo appears/disappears based on toggle
   - RTL layout for Arabic
   - LTR layout for English
   - No errors in browser console or server logs
   - PDF file downloads with correct filename
*/

// ============================================================================
// STEP 8: Troubleshooting
// ============================================================================

/*
ISSUE: "Cannot find module 'puppeteer'"
SOLUTION: npm install puppeteer --save

ISSUE: Puppeteer "launch" error in production
SOLUTION: Add --no-sandbox --disable-setuid-sandbox flags (already done)

ISSUE: Template not found error
SOLUTION: Check if seedInvoiceTemplates() was called and check database

ISSUE: Arabic text appearing as boxes
SOLUTION: Ensure font supports Arabic (Arial does), check browser language settings

ISSUE: PDF generation timeout
SOLUTION: Increase Puppeteer timeout, check system resources, reduce page size

ISSUE: "Cannot PUT /api/invoice-templates/:id/set-default"
SOLUTION: Check route registration in server, verify route file imported correctly

ISSUE: React "useRef is not defined"
SOLUTION: Ensure React is imported: import { useRef, useState, useEffect } from 'react'

ISSUE: Logo not showing in PDF
SOLUTION: Check logoUrl in CompanySettings, ensure URL is absolute (not relative)
*/

// ============================================================================
// STEP 9: File Structure
// ============================================================================

/*
server/
├── Models/
│   ├── InvoiceTemplate.js          [CREATED] - Template schema
│   ├── SalesInvoice.js
│   └── CompanySettings.js
├── routes/
│   ├── invoiceTemplateRoutes.js    [CREATED] - Template CRUD
│   ├── invoicePdfRoutes.js         [CREATED] - PDF generation
│   └── ...
├── services/
│   ├── PdfGenerationService.js     [CREATED] - Puppeteer orchestration
│   └── ...
├── templates/
│   └── invoiceTemplates.js         [CREATED] - EN/AR templates
├── seedInvoiceTemplates.js         [CREATED] - Seeding function
├── index.js (or app.js)            [EDIT] - Add routes + seeding

client/
├── src/
│   └── components/
│       └── sales/
│           ├── SalesInvoice.jsx    [EDIT] - Add button + modal
│           └── InvoicePrintingComponent.jsx  [CREATED] - UI component
*/

// ============================================================================
// STEP 10: Quick Checklist
// ============================================================================

const INTEGRATION_CHECKLIST = [
  {
    task: '1. Create InvoiceTemplate.js (MongoDB schema)',
    status: '✅ DONE',
    file: 'server/Models/InvoiceTemplate.js'
  },
  {
    task: '2. Create invoiceTemplateRoutes.js (CRUD API)',
    status: '✅ DONE',
    file: 'server/routes/invoiceTemplateRoutes.js'
  },
  {
    task: '3. Create PdfGenerationService.js (Puppeteer)',
    status: '✅ DONE',
    file: 'server/services/PdfGenerationService.js'
  },
  {
    task: '4. Create invoicePdfRoutes.js (PDF endpoints)',
    status: '✅ DONE',
    file: 'server/routes/invoicePdfRoutes.js'
  },
  {
    task: '5. Create InvoicePrintingComponent.jsx (React UI)',
    status: '✅ DONE',
    file: 'client/src/components/sales/InvoicePrintingComponent.jsx'
  },
  {
    task: '6. Create invoice templates (EN/AR)',
    status: '✅ DONE',
    file: 'server/templates/invoiceTemplates.js'
  },
  {
    task: '7. Create seeding script',
    status: '✅ DONE',
    file: 'server/seedInvoiceTemplates.js'
  },
  {
    task: '8. Register routes in server/index.js',
    status: '⏳ TODO',
    file: 'server/index.js'
  },
  {
    task: '9. Install packages: npm install puppeteer handlebars react-to-print',
    status: '⏳ TODO',
    command: 'npm install'
  },
  {
    task: '10. Integrate component in SalesInvoice.jsx',
    status: '⏳ TODO',
    file: 'client/src/components/sales/SalesInvoice.jsx'
  },
  {
    task: '11. Test end-to-end workflow',
    status: '⏳ TODO'
  },
  {
    task: '12. Deploy to production with Puppeteer config',
    status: '⏳ TODO'
  }
];

export { INTEGRATION_CHECKLIST };
