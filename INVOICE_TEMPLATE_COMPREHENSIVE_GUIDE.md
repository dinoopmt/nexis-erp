# Invoice Template System - Comprehensive Guide
## For Creating New Thermal Invoice Templates (Supermarket Receipts)

**Date:** May 6, 2026  
**Purpose:** Complete reference for invoice template definitions, storage, rendering, and seeding

---

## 1. COMPLETE TEMPLATE SCHEMA/MODEL

### File Location
**`d:\NEXIS-ERP\server\Models\InvoiceTemplate.js`**

### Database Model - Full Schema Structure

```javascript
{
  // Template Identification
  templateName: {
    type: String,
    required: true,
    unique: true,
    example: 'Invoice_EN_with_Logo'  // Must be unique across all templates
  },
  
  // Language & Customization
  language: {
    type: String,
    enum: ['EN', 'AR'],  // English or Arabic
    required: true
  },
  
  templateType: {
    type: String,
    enum: ['INVOICE', 'GRN', 'RTV', 'DELIVERY_NOTE', 'QUOTATION', 'SALES_ORDER', 'SALES_RETURN'],
    default: 'INVOICE'
  },
  
  includeLogo: {
    type: Boolean,
    default: true  // Whether to show company logo
  },
  
  // Custom Design Properties
  customDesign: {
    headerColor: {
      type: String,
      default: '#1e40af'  // Blue header (hex color code)
    },
    bodyFont: {
      type: String,
      default: 'Arial'  // Font family for body text
    },
    showSerialNumbers: {
      type: Boolean,
      default: true  // Show serial number column in items table
    },
    showQrCode: {
      type: Boolean,
      default: false  // Include QR code in template
    },
    showBarcode: {
      type: Boolean,
      default: false  // Include barcode in template
    },
    currency: {
      type: String,
      default: 'AED'  // Currency code (AED, USD, EUR, etc.)
    },
    pageSize: {
      type: String,
      enum: ['A4', 'A5', 'LETTER'],
      default: 'A4'  // For thermal: use 'A5' for 58mm width, custom handling for 80mm
    },
    margins: {
      top: { type: Number, default: 10 },      // mm
      bottom: { type: Number, default: 10 },   // mm
      left: { type: Number, default: 10 },     // mm
      right: { type: Number, default: 10 }     // mm
    }
  },
  
  // HTML Template Content (with Handlebars syntax)
  htmlContent: {
    type: String,
    required: true
    // Uses Handlebars templating syntax for dynamic content
    // Example: {{@root.invoice.invoiceNumber}}, {{#items}}...{{/items}}
  },
  
  // Template CSS (optional styling)
  cssContent: {
    type: String,
    default: `
      body { 
        font-family: Arial, sans-serif; 
        margin: 0;
        padding: 20px;
      }
      .header { text-align: center; margin-bottom: 20px; }
      .logo { max-width: 150px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background-color: #f2f2f2; }
    `
  },
  
  // Company & Metadata
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanySettings'
  },
  
  description: {
    type: String,
    default: ''  // Optional description for the template
  },
  
  isActive: {
    type: Boolean,
    default: true  // Soft delete flag
  },
  
  isDefault: {
    type: Boolean,
    default: false  // Set as default for language/type combination
  },
  
  // Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

### Database Indexes
```javascript
// Quick lookups by language, template type, and logo variant
InvoiceTemplateSchema.index({ language: 1, templateType: 1, includeLogo: 1 });

// Find active default templates
InvoiceTemplateSchema.index({ isActive: 1, isDefault: 1 });
```

### Database Collection Name
**Collection:** `invoicetemplates`

---

## 2. TEMPLATE STORAGE & CREATION

### Where Templates Are Stored
**Database:** MongoDB (NEXIS-ERP)  
**Collection:** `invoicetemplates`  
**Instance:** Single row per unique templateName

### Template Creation Methods

#### A. Via Seeding (Development/Initial Setup)
**File:** `d:\NEXIS-ERP\server\seedInvoiceTemplates.js`

```javascript
// Run manually via:
node server/seedInvoiceTemplates.js

// Or called automatically on server startup
```

#### B. Via API Endpoint (Runtime)
**Endpoint:** `POST /api/invoice-templates`

```javascript
// Request body:
{
  templateName: 'Thermal_Receipt_EN',
  language: 'EN',
  templateType: 'INVOICE',
  includeLogo: false,  // Usually false for thermal receipts
  customDesign: {
    headerColor: '#000000',
    bodyFont: 'Courier New',
    showSerialNumbers: false,
    showQrCode: false,
    showBarcode: true,
    currency: 'AED',
    pageSize: 'A5',
    margins: { top: 2, bottom: 2, left: 2, right: 2 }
  },
  htmlContent: '<div>...</div>',  // Handlebars template HTML
  cssContent: 'body { font-size: 11px; }'
}
```

#### C. Via Admin UI
**Component:** `client/src/components/settings/general/InvoiceTemplateForm.jsx`  
**Location:** Settings → Templates → New Template

---

## 3. EXISTING TEMPLATES & EXAMPLES

### Seed Templates Location
**File:** `d:\NEXIS-ERP\server\templates\invoiceTemplates.js`

### Current Seeded Templates (Invoice)
1. **Invoice_EN_with_Logo** (Default EN)
   - Language: EN
   - Logo: Enabled
   - Type: INVOICE
   
2. **Invoice_EN_without_Logo**
   - Language: EN
   - Logo: Disabled
   
3. **Invoice_AR_with_Logo** (Default AR)
   - Language: AR
   - Logo: Enabled
   
4. **Invoice_AR_without_Logo**
   - Language: AR
   - Logo: Disabled

### Other Template Types Available
- **GRN Templates** (server/templates/inventoryTemplates.js)
- **RTV Templates** (server/Models/RtvTemplate.js)
- **Delivery Note Templates** (server/templates/deliveryNoteTemplates.js)
- **Quotation Templates** (server/templates/quotationTemplates.js)
- **Sales Order Templates** (server/templates/salesOrderTemplates.js)
- **Sales Return Templates** (server/templates/salesReturnTemplates.js)

---

## 4. TEMPLATE RENDERING & FORMATTING LOGIC

### Handlebars Templating Engine
**Library:** Handlebars  
**Service:** `d:\NEXIS-ERP\server\services\PdfGenerationService.js`

### Rendering Pipeline (2-Pass Dynamic Pagination)

#### Pass 1: Measurement
```javascript
1. Compile Handlebars template
2. Render template with data to measure height
3. Calculate pagination needed
```

#### Pass 2: Generate Pages
```javascript
1. Split items across pages based on available space
2. Add "Brought Forward" and "Carry Forward" rows
3. Add header/footer to each page
4. Generate final PDF with Puppeteer
```

### Template Rendering Method
```javascript
renderTemplate(templateHtml, cssContent, data, baseUrl = '') {
  const template = Handlebars.compile(templateHtml);
  const invoiceHtml = template(data);
  return invoiceHtml;
}
```

### Available Template Data Variables

#### Company Object
```handlebars
{{@root.store.storeName}}
{{@root.store.address1}}
{{@root.store.address2}}
{{@root.store.logoUrl}}
{{@root.company.email}}
{{@root.company.phone}}
{{@root.company.taxId}}
{{@root.company.currency}}
{{@root.company.decimalPlaces}}
```

#### Invoice Object
```handlebars
{{@root.invoice.invoiceNumber}}
{{date @root.invoice.date 'DD/MM/YYYY'}}
{{@root.invoice.customerName}}
{{@root.invoice.customerEmail}}
{{@root.invoice.customerPhone}}
{{@root.invoice.customerAddress}}
{{@root.invoice.customerTRN}}
{{@root.invoice.subtotal}}
{{@root.invoice.discountAmount}}
{{@root.invoice.discountPercentage}}
{{@root.invoice.totalAfterDiscount}}
{{@root.invoice.vatAmount}}
{{@root.invoice.vatPercentage}}
{{@root.invoice.totalIncludeVat}}
{{@root.invoice.notes}}
{{@root.invoice.paymentType}}
```

#### Items Array (Loop)
```handlebars
{{#items}}
  {{this.slNo}}
  {{itemName}}
  {{itemCode}}
  {{quantity}}
  {{unit}}
  {{unitPrice}}
  {{discountPercentage}}
  {{total}}
  {{#if serialNumbers}}{{join serialNumbers ', '}}{{/if}}
{{/items}}
```

### Handlebars Helpers Available

```javascript
{{date dateValue 'DD/MM/YYYY'}}          // Format date
{{formatNumber value 2}}                  // Format with 2 decimal places
{{#if condition}}...{{/if}}               // Conditional
{{#each array}}...{{/each}}               // Loop
{{join array ', '}}                       // Join array elements
{{#unless condition}}...{{/unless}}       // Negative conditional
{{#with object}}...{{/with}}              // Context change
```

---

## 5. HOW TEMPLATES HANDLE DIFFERENT DOCUMENT TYPES

### Document Type Enum
```javascript
templateType: {
  enum: ['INVOICE', 'GRN', 'RTV', 'DELIVERY_NOTE', 'QUOTATION', 'SALES_ORDER', 'SALES_RETURN']
}
```

### Retrieval by Document Type
**API Route:** `GET /invoice-templates/language/:language/type/:type`

Example:
```
GET /invoice-templates/language/EN/type/INVOICE
GET /invoice-templates/language/EN/type/DELIVERY_NOTE
GET /invoice-templates/language/AR/type/QUOTATION
```

### Template Switching Logic
```javascript
// Client-side selection
const template = await fetch(`/api/invoice-templates/language/EN/type/INVOICE`);

// Database query
InvoiceTemplate.findOne({
  language: 'EN',
  templateType: 'INVOICE',
  includeLogo: true,
  isActive: true
})
```

### Terminal Template Mapping (Supermarket POS Context)
**File:** `d:\NEXIS-ERP\server\Models\TerminalManagement.js`

```javascript
// Terminal stores format mapping for each document type
templateMappings: {
  invoice: {
    templateId: ObjectId  // Maps to specific invoice template
  },
  deliveryNote: {
    templateId: ObjectId  // Maps to delivery note template
  },
  quotation: {
    templateId: ObjectId  // Maps to quotation template
  },
  salesOrder: {
    templateId: ObjectId  // Maps to sales order template
  },
  salesReturn: {
    templateId: ObjectId  // Maps to sales return template (or RTV)
  }
}
```

---

## 6. API ENDPOINTS FOR TEMPLATE MANAGEMENT

### Template CRUD Operations
**Base Route:** `/api/invoice-templates`

```javascript
// Get all active templates
GET /api/invoice-templates

// Response:
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "templateName": "Invoice_EN_with_Logo",
      "language": "EN",
      "templateType": "INVOICE",
      "includeLogo": true,
      "customDesign": { ... },
      "htmlContent": "...",
      "cssContent": "...",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": { "name": "admin" }
    }
  ]
}

// Get specific template by ID
GET /api/invoice-templates/:id

// Get template by language and type
GET /api/invoice-templates/language/EN/type/INVOICE?withLogo=true

// Create new template
POST /api/invoice-templates
{
  "templateName": "Thermal_Receipt_EN",
  "language": "EN",
  "templateType": "INVOICE",
  // ... other fields
}

// Update template
PUT /api/invoice-templates/:id
{ ... }

// Delete template (soft delete)
DELETE /api/invoice-templates/:id

// Set as default
PUT /api/invoice-templates/:id/set-default
```

---

## 7. PDF GENERATION PIPELINE

### PDF Generation Service
**File:** `d:\NEXIS-ERP\server\services\PdfGenerationService.js`

### Main Method
```javascript
async generateInvoicePdf(template, invoiceData, options = {}) {
  // PASS 1: Prepare data and render template for measurement
  const templateData = { ... };
  const tempHtmlContent = this.renderTemplate(
    template.htmlContent,
    template.cssContent,
    templateData
  );
  
  // PASS 2: Generate actual PDF with Puppeteer
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(tempHtmlContent);
  const pdfBuffer = await page.pdf({
    width: pageWidth,
    height: pageHeight,
    margin: template.customDesign.margins
  });
  
  return pdfBuffer;
}
```

### Key Features
- Dynamic pagination (splits items across pages)
- Header/footer repetition on each page
- Responsive table layout
- Currency formatting
- Date formatting
- Support for logos, QR codes, barcodes

---

## 8. CREATING A NEW THERMAL INVOICE TEMPLATE

### For Supermarket Receipts (80mm Thermal Printer)

#### Step 1: Create Template Definition
```javascript
// In server/templates/invoiceTemplates.js or similar

export const THERMAL_RECEIPT_EN = {
  templateName: 'Thermal_Receipt_EN',
  language: 'EN',
  templateType: 'INVOICE',
  includeLogo: false,  // No logo for thermal
  customDesign: {
    headerColor: '#000000',
    bodyFont: 'Courier New',  // Monospace for thermal
    showSerialNumbers: false,
    showQrCode: true,
    showBarcode: true,
    currency: 'AED',
    pageSize: 'A5',  // 58mm equivalent
    margins: {
      top: 2,
      bottom: 2,
      left: 2,
      right: 2
    }
  },
  htmlContent: `
    <div class="thermal-receipt">
      <!-- Centered header (thermal printers need centered content) -->
      <div class="receipt-header">
        <h3>{{@root.store.storeName}}</h3>
        <p>{{@root.company.phone}}</p>
      </div>
      
      <hr style="border: none; border-top: 1px dashed #000; margin: 4px 0;">
      
      <!-- Invoice meta -->
      <div class="receipt-meta">
        <p><strong>Invoice #:</strong> {{@root.invoice.invoiceNumber}}</p>
        <p><strong>Date:</strong> {{date @root.invoice.date 'DD/MM/YY'}}</p>
      </div>
      
      <hr style="border: none; border-top: 1px dashed #000; margin: 4px 0;">
      
      <!-- Items table (compact for thermal) -->
      <table class="receipt-items" style="font-size: 10px; width: 100%;">
        <tbody>
          {{#items}}
          <tr>
            <td>{{itemName}}</td>
            <td style="text-align: right;">{{quantity}} x {{formatNumber unitPrice 2}}</td>
          </tr>
          <tr>
            <td colspan="2" style="text-align: right; border-top: 1px solid #000;">
              {{formatNumber total 2}}
            </td>
          </tr>
          {{/items}}
        </tbody>
      </table>
      
      <hr style="border: none; border-top: 1px solid #000; margin: 4px 0;">
      
      <!-- Totals section -->
      <div class="receipt-totals" style="font-size: 11px;">
        <p><strong>Subtotal:</strong> <span style="float: right;">{{formatNumber @root.invoice.subtotal 2}}</span></p>
        {{#if @root.invoice.discountAmount}}
        <p><strong>Discount:</strong> <span style="float: right;">-{{formatNumber @root.invoice.discountAmount 2}}</span></p>
        {{/if}}
        {{#if @root.invoice.vatAmount}}
        <p><strong>Tax:</strong> <span style="float: right;">{{formatNumber @root.invoice.vatAmount 2}}</span></p>
        {{/if}}
        <p style="border-top: 1px solid #000; margin-top: 4px; padding-top: 4px;">
          <strong>TOTAL:</strong> <span style="float: right;">{{formatNumber @root.invoice.totalIncludeVat 2}}</span>
        </p>
      </div>
      
      <!-- QR Code & Thank you -->
      {{#if @root.invoice.qrCode}}
      <div class="receipt-qr" style="text-align: center; margin: 8px 0;">
        <img src="{{@root.invoice.qrCode}}" alt="QR" style="width: 100px; height: 100px;">
      </div>
      {{/if}}
      
      <div style="text-align: center; margin-top: 8px; font-size: 10px;">
        <p>Thank You!</p>
        <p>{{date @root.invoice.date 'HH:mm:ss'}}</p>
      </div>
    </div>
  `,
  cssContent: `
    body {
      width: 80mm;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      margin: 0;
      padding: 4px;
      text-align: center;
    }
    
    .thermal-receipt {
      width: 100%;
    }
    
    .receipt-header {
      text-align: center;
      margin-bottom: 4px;
    }
    
    .receipt-header h3 {
      margin: 0;
      font-size: 13px;
      font-weight: bold;
    }
    
    .receipt-header p {
      margin: 2px 0;
      font-size: 10px;
    }
    
    .receipt-meta {
      text-align: left;
      font-size: 10px;
      margin: 4px 0;
    }
    
    .receipt-meta p {
      margin: 2px 0;
    }
    
    .receipt-items {
      width: 100%;
      margin: 4px 0;
      border-collapse: collapse;
    }
    
    .receipt-items td {
      padding: 2px 0;
      text-align: left;
    }
    
    .receipt-totals {
      margin: 4px 0;
      text-align: left;
    }
    
    .receipt-totals p {
      margin: 2px 0;
      overflow: hidden;
    }
  `
};
```

#### Step 2: Add to Seeding
```javascript
// In server/seedInvoiceTemplates.js

export async function seedInvoiceTemplates() {
  const templates = [
    // ... existing templates
    {
      ...THERMAL_RECEIPT_EN,
      templateName: 'Thermal_Receipt_EN',
      isActive: true,
      isDefault: false  // Don't make default
    }
  ];
  
  // ... seeding logic
}
```

#### Step 3: Register in Database
```bash
# Run seed
node server/seedInvoiceTemplates.js

# Or POST via API
curl -X POST http://localhost:5000/api/invoice-templates \
  -H "Content-Type: application/json" \
  -d '{...template object...}'
```

#### Step 4: Assign to Terminal
In TerminalFormModal.jsx or via API, map the thermal receipt template to the terminal:
```javascript
templateMappings: {
  invoice: {
    templateId: ObjectId('thermal_receipt_template_id')
  }
}
```

---

## 9. KEY CONSIDERATIONS FOR THERMAL RECEIPTS

### Width Optimization
- **80mm thermal:** Set width to 80mm in CSS
- **58mm thermal:** Set width to 58mm, reduce font sizes
- Use monospace font (Courier New, Courier)
- Avoid large images/logos

### Content Reduction
- Hide serial numbers column
- Compact item descriptions
- Right-align amounts
- Use dashed/solid lines instead of borders

### Print Quality
- Monospace fonts render better on thermal
- Avoid gradients/complex colors
- Use 1-bit (black/white) images only
- Test barcode/QR rendering

### Hardware Configuration
**File:** `d:\NEXIS-ERP\server\Models\TerminalManagement.js`

```javascript
// Terminal mapping includes thermal printer:
hardwareMapping: {
  thermalPrinter: {
    enabled: true,
    printerName: "Zebra TLP2844",  // Or network IP
    timeout: 5000
  }
}
```

---

## 10. TROUBLESHOOTING

### Template Not Found
- Check `isActive: true` flag
- Verify language and templateType match
- Check database: `db.invoicetemplates.find({ templateName: 'your_name' })`

### PDF Generation Timeout
- Reduce item count or complexity
- Increase Puppeteer timeout
- Check system resources

### Handlebars Rendering Error
- Verify variable names match data object
- Use `{{#if variable}}` for optional fields
- Check for missing helpers

### Thermal Printer Not Printing
- Verify printer enabled in terminal settings
- Check printer name/IP in hardwareMapping
- Test with Electron IPC: `window.electronAPI.print(...)`

---

## 11. TEMPLATE MIGRATION & VERSIONING

### Updating Existing Template
```javascript
PUT /api/invoice-templates/:id
{
  htmlContent: '...new HTML...',
  cssContent: '...new CSS...'
}
```

### Creating Variant
```javascript
// Create new template with different name (e.g., _v2)
POST /api/invoice-templates
{
  templateName: 'Thermal_Receipt_EN_v2',
  ...
}
```

### Rollback Strategy
- Keep old templates with `isActive: false`
- Create new template, test, then switch
- Update terminal mapping to new template

---

## 12. COMPLETE FILE STRUCTURE REFERENCE

```
server/
├── Models/
│   ├── InvoiceTemplate.js                    [✓ SCHEMA]
│   └── TerminalManagement.js                 [Thermal printer hardware mapping]
├── routes/
│   ├── invoiceTemplateRoutes.js              [CRUD endpoints]
│   └── invoicePdfRoutes.js                   [PDF preview/download]
├── services/
│   └── PdfGenerationService.js               [Handlebars + Puppeteer rendering]
├── templates/
│   ├── invoiceTemplates.js                   [English & Arabic examples]
│   ├── deliveryNoteTemplates.js
│   ├── quotationTemplates.js
│   ├── salesOrderTemplates.js
│   ├── salesReturnTemplates.js
│   └── inventoryTemplates.js                 [LPO, GRN, RTV unified]
├── seedInvoiceTemplates.js                   [Seed invoice templates]
├── seedInventoryTemplates.js                 [Seed inventory templates]
└── scripts/
    └── updateTemplateFormatting.js           [Template update utilities]

client/
├── src/components/settings/general/
│   ├── TerminalFormModal.jsx                 [Terminal + thermal printer config]
│   └── InvoiceTemplateForm.jsx               [Template editor/creator]
└── src/services/
    └── ClientPdfGeneratorService.js          [Client-side PDF generation]

Database/
├── Collection: invoicetemplates              [Template storage]
└── Collection: terminal_management           [Terminal printer mapping]
```

---

## Summary

**Complete Path to Template Schema:** [server/Models/InvoiceTemplate.js](server/Models/InvoiceTemplate.js)

**Full Schema Structure:** See Section 1 above

**Where Created/Stored:** MongoDB `invoicetemplates` collection

**Template Rendering:** Handlebars + Puppeteer (PdfGenerationService.js)

**Document Type Handling:** `templateType` enum field selects format for different documents

**Existing Examples:** invoiceTemplates.js (English & Arabic with/without logo)

**For Thermal Supermarket:** Create with compact HTML, monospace font, 80mm width, thermal printer driver integration
