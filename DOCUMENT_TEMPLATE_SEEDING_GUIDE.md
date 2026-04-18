# Document Template Seeding Guide

## Quick Start

All document templates are automatically seeded to the database when the server starts.

### Available Templates

| Document Type | Language | With Logo | Without Logo |
|---|---|---|---|
| **Delivery Note** | English | ✅ | ✅ |
| **Quotation** | English | ✅ | ✅ |
| **Sales Order** | English | ✅ | ✅ |
| **Sales Return** | English | ✅ | ✅ |

**Total: 8 templates**

---

## Automatic Seeding

Templates are seeded automatically during server startup in this order:

1. **Invoice Templates** (`seedInvoiceTemplates.js`) - 4 templates
2. **Document Templates** (`seedDocumentTemplates.js`) - 8 templates
3. **Barcode Templates** (`barcodeSeed.js`)

### Server Initialization Output

```
🚀 Starting document format template seeding...
   ✓ Created: DeliveryNote_EN_with_Logo
   ✓ Created: DeliveryNote_EN_without_Logo
   ✓ Created: Quotation_EN_with_Logo
   ✓ Created: Quotation_EN_without_Logo
   ✓ Created: SalesOrder_EN_with_Logo
   ✓ Created: SalesOrder_EN_without_Logo
   ✓ Created: SalesReturn_EN_with_Logo
   ✓ Created: SalesReturn_EN_without_Logo

✅ Document template seeding completed successfully!
   📊 Total templates seeded: 8
   ✨ New created: 8
   🔄 Updated: 0
```

---

## Manual Seeding

### Run All Document Templates

```bash
cd d:\NEXIS-ERP\server
node seedDocumentTemplates.js
```

### Run All Invoice Templates

```bash
cd d:\NEXIS-ERP\server
node seedInvoiceTemplates.js
```

---

## Template Files

### Template Definitions

- **Delivery Notes**: `server/templates/deliveryNoteTemplates.js`
  - `DELIVERY_NOTE_TEMPLATE_EN_WITH_LOGO`
  - `DELIVERY_NOTE_TEMPLATE_EN_WITHOUT_LOGO`

- **Quotations**: `server/templates/quotationTemplates.js`
  - `QUOTATION_TEMPLATE_EN_WITH_LOGO`
  - `QUOTATION_TEMPLATE_EN_WITHOUT_LOGO`

- **Sales Orders**: `server/templates/salesOrderTemplates.js`
  - `SALES_ORDER_TEMPLATE_EN_WITH_LOGO`
  - `SALES_ORDER_TEMPLATE_EN_WITHOUT_LOGO`

- **Sales Returns**: `server/templates/salesReturnTemplates.js`
  - `SALES_RETURN_TEMPLATE_EN_WITH_LOGO`
  - `SALES_RETURN_TEMPLATE_EN_WITHOUT_LOGO`

### Seeding Scripts

- **Document Templates**: `server/seedDocumentTemplates.js`
- **Invoice Templates**: `server/seedInvoiceTemplates.js`

### Database Model

- **InvoiceTemplate**: `server/Models/InvoiceTemplate.js`
  - Stores all document templates (Invoice, Delivery Note, Quotation, Sales Order, Sales Return)
  - Supports multiple languages and variations

---

## Template Structure

Each template contains:

```javascript
{
  // Basic Info
  templateName: string,                    // Unique identifier (e.g., "DeliveryNote_EN_with_Logo")
  language: 'EN' | 'AR',                  // Language code
  templateType: 'INVOICE' | 'DELIVERY_NOTE' | 'QUOTATION' | 'SALES_ORDER' | 'RTV',
  includeLogo: boolean,                   // Whether company logo is shown
  
  // Design Settings
  customDesign: {
    headerColor: '#hexcode',             // Header background color
    bodyFont: 'Arial',                   // Font family
    showSerialNumbers: boolean,          // Show serial numbers in items table
    showQrCode: boolean,                 // Show QR code (future)
    currency: 'AED' | 'د.إ',            // Currency display
    pageSize: 'A4' | 'A5' | '58MM'       // Page size
  },
  
  // Content
  htmlContent: string,                   // Handlebars template for rendering
  cssContent: string,                    // Print-ready CSS styling
  
  // Metadata
  isActive: boolean,                     // Can be used in terminal config
  isDefault: boolean,                    // Set as default for document type
  companyId?: ObjectId,                  // Company-specific template (null = global)
  createdBy?: ObjectId,                  // User who created it
  createdAt: Date,                       // Creation timestamp
  updatedAt: Date                        // Last updated timestamp
}
```

---

## Handlebars Variables Available

### Company Data
```handlebars
{{company.companyName}}
{{company.address}}
{{company.city}}
{{company.state}}
{{company.country}}
{{company.email}}
{{company.phone}}
{{company.taxId}}
{{company.logoUrl}}
```

### Document-Specific Data

**Delivery Note:**
```handlebars
{{deliveryNote.deliveryNoteNumber}}
{{date deliveryNote.date 'DD/MM/YYYY'}}
{{deliveryNote.referenceInvoice}}
{{deliveryNote.customerName}}
{{deliveryNote.totalItems}}
```

**Quotation:**
```handlebars
{{quotation.quotationNumber}}
{{date quotation.validUntil 'DD/MM/YYYY'}}
{{quotation.paymentTerms}}
{{quotation.totalAmount}}
```

**Sales Order:**
```handlebars
{{order.orderNumber}}
{{date order.requiredDeliveryDate 'DD/MM/YYYY'}}
{{order.status}}
{{order.totalAmount}}
```

**Sales Return:**
```handlebars
{{return.returnNumber}}
{{return.returnReason}}
{{return.totalRefund}}
{{return.refundMethod}}
```

### Items Loop
```handlebars
{{#items}}
  {{slNo}}
  {{itemName}}
  {{quantity}}
  {{unitPrice}}
  {{total}}
{{/items}}
```

### Helper Functions
```handlebars
{{currency value 'AED' 2}}        // Format as currency
{{date dateString 'DD/MM/YYYY'}}  // Format date
{{join array ', '}}               // Join array elements
```

---

## Database Collection

**Collection Name**: `invoicetemplates`

### Query Examples

```javascript
// Get all active templates
db.invoicetemplates.find({ isActive: true })

// Get delivery note templates
db.invoicetemplates.find({ templateType: 'DELIVERY_NOTE' })

// Get default quotation template
db.invoicetemplates.findOne({ 
  templateType: 'QUOTATION', 
  isDefault: true 
})

// Get templates by language
db.invoicetemplates.find({ language: 'EN' })
```

---

## Customization

### Adding More Languages

1. Create new template files in `server/templates/`
2. Define new exports (e.g., `DELIVERY_NOTE_TEMPLATE_AR_WITH_LOGO`)
3. Add to `seedDocumentTemplates.js` array
4. Run seeding script

Example for Arabic:
```javascript
// server/templates/deliveryNoteTemplates.js
export const DELIVERY_NOTE_TEMPLATE_AR_WITH_LOGO = {
  templateName: 'DeliveryNote_AR_with_Logo',
  language: 'AR',
  // ... rest of template with RTL support
}
```

### Modifying Existing Templates

1. Update template file in `server/templates/`
2. Re-run seeding script (upsert will update existing)
3. Changes apply immediately to new printouts

---

## Troubleshooting

### Templates Not Appearing in Terminal Config

1. Ensure server has started and seeding completed
2. Check database: `db.invoicetemplates.find()`
3. Verify `isActive: true` is set
4. Refresh browser cache (Ctrl+Shift+R)

### Template Rendering Errors

1. Check browser console for Handlebars parsing errors
2. Verify data object has required fields
3. Ensure CSS doesn't have syntax errors

### Database Connection Issues

- Verify MongoDB is running
- Check connection string in `.env`
- Run: `node seedDocumentTemplates.js` to test seeding

---

## Integration Points

### Terminal Configuration
- Templates selected in: `TerminalFormModal.jsx` → Document Formats tab
- Stored in: `terminal.formatMapping.[documentType].templateId`

### PDF Generation
- Called from: `invoicePdfRoutes.js`
- Service: `PdfGenerationService.js` (Puppeteer + Handlebars)

### API Endpoints
```
GET  /api/invoice-templates           // List all
GET  /api/invoice-templates/:id       // Get one
POST /api/invoice-templates           // Create
PUT  /api/invoice-templates/:id       // Update
DELETE /api/invoice-templates/:id     // Delete
```

---

## Next Steps

1. ✅ Seed templates to database (automatic on server startup)
2. ⏭️ Test template rendering by selecting in Terminal Config
3. ⏭️ Generate sample PDFs from each document type
4. ⏭️ Customize colors, fonts, layout per business needs
5. ⏭️ Add Arabic language variants if needed
